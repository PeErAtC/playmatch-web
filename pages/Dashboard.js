import React, { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';


import { db } from "../lib/firebaseConfig";
import { collection, getDocs, doc, query, where, getDoc } from 'firebase/firestore';


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

const Dashboard = ({ userId }) => {
  const [loggedInEmail, setLoggedInEmail] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const [currentUserId, setCurrentUserId] = useState(userId || null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ค่าสำหรับ Card หลัก
  const [totalPlayersThisMonth, setTotalPlayersThisMonth] = useState(0);
  const [totalBallsUsedOverall, setTotalBallsUsedOverall] = useState(0); 
  const [totalGamesPlayedOverall, setTotalGamesPlayedOverall] = useState(0); 

  // ข้อมูลสำหรับกราฟ "สถิติผู้เข้าร่วม" (ผู้เล่นต่อเดือน)
  const [visitorChartData, setVisitorChartData] = useState({
    labels: [],
    datasets: [
      {
        label: 'จำนวนผู้เล่น (คน)',
        data: [],
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.4,
        fill: false,
      },
    ],
  });

  // ข้อมูลสำหรับกราฟ "สถิติลูกที่ใช้และเกมที่เล่น (รายวัน)"
  const [ballsAndGamesChartData, setBallsAndGamesChartData] = useState({
    labels: [],
    datasets: [
      {
        label: 'จำนวนลูกที่ใช้ (ลูก)',
        data: [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
        fill: false,
      },
      {
        label: 'จำนวนเกมที่เล่น (เกม)',
        data: [],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4,
        fill: false,
      },
    ],
  });

  // ข้อมูลสำหรับ Doughnut Chart (สัดส่วน)
  const [doughnutChartValues, setDoughnutChartValues] = useState([0, 0, 0]);

  // Fetch loggedInEmail from localStorage and Admin email from Firebase Config
  useEffect(() => {
    if (typeof window !== "undefined") {
      setLoggedInEmail(localStorage.getItem("loggedInEmail") || "");
      const fetchAdminEmail = async () => {
        try {
          const configDocRef = doc(db, "configurations", "appConfig");
          const configSnap = await getDoc(configDocRef); 

          if (configSnap.exists() && configSnap.data().adminEmail) {
            setAdminEmail(configSnap.data().adminEmail);
          } else {
            console.warn(
              "Admin email not found in configurations/appConfig. Defaulting to a fixed admin email."
            );
            setAdminEmail("admin@example.com"); 
          }
        } catch (err) {
          console.error("Error fetching admin email:", err);
          setAdminEmail("admin@example.com"); 
        }
      };
      fetchAdminEmail();
    }
  }, []); 

  // Effect to find currentUserId based on loggedInEmail or use prop userId
  useEffect(() => {
    const findUserId = async () => {
      if (userId) { 
        setCurrentUserId(userId);
        return;
      }
      if (loggedInEmail) {
        try {
          const usersRef = collection(db, "users");
          const userQuery = query(usersRef, where("email", "==", loggedInEmail));
          const userSnap = await getDocs(userQuery);
          let foundUserId = null;
          userSnap.forEach((doc) => {
            foundUserId = doc.id;
          });

          if (foundUserId) {
            setCurrentUserId(foundUserId);
          } else {
            setError("ไม่พบ User ID สำหรับอีเมลนี้ในฐานข้อมูล");
            setLoading(false);
          }
        } catch (err) {
          console.error("Error finding user ID:", err);
          setError("เกิดข้อผิดพลาดในการค้นหา User ID: " + err.message);
          setLoading(false);
        }
      } else {
        setError("กรุณาเข้าสู่ระบบเพื่อดู Dashboard หรือระบุ userId");
        setLoading(false);
      }
    };
    findUserId();
  }, [userId, loggedInEmail]);

  // Main data fetching effect
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUserId) {
        console.log("Waiting for currentUserId to be set...");
        setLoading(true); 
        return;
      }

      setLoading(true);
      setError(null); 
      try {
        const matchesColRef = collection(doc(db, 'users', currentUserId), 'Matches');
        const matchSnapshot = await getDocs(matchesColRef);
        
        console.log("Firebase Query Path: ", `users/${currentUserId}/Matches`);
        console.log("Number of Match Documents fetched:", matchSnapshot.size);

        const matchesList = matchSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Fetched Matches Data:", matchesList);

        // ** Variables for processing data **
        let monthlyUniquePlayers = {}; 
        let dailyBalls = {}; 
        let dailyGames = {}; 

        let calculatedTotalPlayersThisMonth = new Set();
        let calculatedTotalBallsOverall = 0; 
        let calculatedTotalGamesOverall = 0; 

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; 
        const currentYearMonthString = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;

        matchesList.forEach(matchDoc => {
          const matchDateStr = matchDoc.matchDate; 
          let matchDate;
          if (matchDateStr) {
             matchDate = new Date(matchDateStr);
          } else {
             console.warn(`Match document ${matchDoc.id} has no matchDate. Skipping.`);
             return;
          }

          if (isNaN(matchDate.getTime())) { 
            console.warn(`Invalid matchDate format for document ${matchDoc.id}: ${matchDateStr}. Skipping.`);
            return;
          }

          const matchYear = matchDate.getFullYear();
          const matchMonth = matchDate.getMonth() + 1;
          const matchDay = matchDate.getDate();
          const matchYearMonthKey = `${matchYear}-${matchMonth.toString().padStart(2, '0')}`;
          const matchDateKey = `${matchYear}-${matchMonth.toString().padStart(2, '0')}-${matchDay.toString().padStart(2, '0')}`;

          // Filter data for the last 6 months (including current month) for charts
          const diffMonths = (now.getFullYear() - matchDate.getFullYear()) * 12 + (now.getMonth() - matchDate.getMonth());
          const isInLastSixMonths = (diffMonths >= 0 && diffMonths < 6); 

          if (matchDoc.matches && Array.isArray(matchDoc.matches)) {
            matchDoc.matches.forEach(game => {
              // Always count for overall totals (no date filter for these)
              const ballsUsedInGame = parseInt(game.balls || '0', 10);
              if (!isNaN(ballsUsedInGame)) {
                  calculatedTotalBallsOverall += ballsUsedInGame;
              }
              calculatedTotalGamesOverall += 1;

              // Only count for current month and monthly unique players if within the last 6 months
              if (isInLastSixMonths) {
                // Total Players in Current Month
                if (matchYearMonthKey === currentYearMonthString) {
                  if (game.A1) calculatedTotalPlayersThisMonth.add(game.A1);
                  if (game.A2) calculatedTotalPlayersThisMonth.add(game.A2);
                  if (game.B1) calculatedTotalPlayersThisMonth.add(game.B1);
                  if (game.B2) calculatedTotalPlayersThisMonth.add(game.B2);
                }

                // Chart: Unique Players per Month (for last 6 months)
                if (!monthlyUniquePlayers[matchYearMonthKey]) {
                  monthlyUniquePlayers[matchYearMonthKey] = new Set();
                }
                if (game.A1) monthlyUniquePlayers[matchYearMonthKey].add(game.A1);
                if (game.A2) monthlyUniquePlayers[matchYearMonthKey].add(game.A2);
                if (game.B1) monthlyUniquePlayers[matchYearMonthKey].add(game.B1);
                if (game.B2) monthlyUniquePlayers[matchYearMonthKey].add(game.B2);

                // Daily Balls Used & Games Played (for current month's daily chart)
                if (matchYearMonthKey === currentYearMonthString) {
                    dailyBalls[matchDateKey] = (dailyBalls[matchDateKey] || 0) + ballsUsedInGame;
                    dailyGames[matchDateKey] = (dailyGames[matchDateKey] || 0) + 1;
                }
              }
            });
          } else {
              console.warn(`Match document ${matchDoc.id} has no 'matches' array or it's not an array. Skipping game data.`);
          }
        });

        console.log("Processed Monthly Unique Players (for chart):", monthlyUniquePlayers);
        console.log("Calculated Daily Balls Used (for chart):", dailyBalls);
        console.log("Calculated Daily Games Played (for chart):", dailyGames);
        console.log("Calculated Total Players This Month:", calculatedTotalPlayersThisMonth.size);
        console.log("Calculated Total Balls Overall:", calculatedTotalBallsOverall);
        console.log("Calculated Total Games Overall:", calculatedTotalGamesOverall);
        
        // ** Update state for main cards **
        setTotalPlayersThisMonth(calculatedTotalPlayersThisMonth.size);
        setTotalBallsUsedOverall(calculatedTotalBallsOverall); 
        setTotalGamesPlayedOverall(calculatedTotalGamesOverall); 

        // ** Prepare data for "Visitor Statistics" chart (Players per month) **
        const sortedMonthlyKeys = Object.keys(monthlyUniquePlayers).sort();
        const monthlyPlayerCounts = sortedMonthlyKeys.map(monthKey => monthlyUniquePlayers[monthKey].size);
        const monthlyLabels = sortedMonthlyKeys.map(monthKey => {
          const [year, mon] = monthKey.split('-');
          const date = new Date(parseInt(year), parseInt(mon) - 1, 1);
          return date.toLocaleString('th-TH', { month: 'short', year: 'numeric' });
        });

        setVisitorChartData(prev => ({
          ...prev,
          labels: monthlyLabels,
          datasets: [{ ...prev.datasets[0], data: monthlyPlayerCounts }],
        }));

        // ** Prepare data for "Balls and Games Played (Daily)" chart **
        const dailyKeysInCurrentMonth = Object.keys(dailyBalls)
                                            .filter(dateKey => dateKey.startsWith(currentYearMonthString))
                                            .sort();
        const dailyLabels = dailyKeysInCurrentMonth.map(dateKey => {
            const [, , day] = dateKey.split('-');
            return `${parseInt(day)}`;
        });
        const dailyBallsData = dailyKeysInCurrentMonth.map(dateKey => dailyBalls[dateKey]);
        const dailyGamesData = dailyKeysInCurrentMonth.map(dateKey => dailyGames[dateKey]);

        setBallsAndGamesChartData(prev => ({
            ...prev,
            labels: dailyLabels,
            datasets: [
                { ...prev.datasets[0], data: dailyBallsData, label: 'จำนวนลูกที่ใช้ (ลูก)' },
                { ...prev.datasets[1], data: dailyGamesData, label: 'จำนวนเกมที่เล่น (เกม)' }
            ]
        }));

        // ** Prepare data for Doughnut Chart - Use the *calculated* values directly **
        setDoughnutChartValues([
          calculatedTotalPlayersThisMonth.size,
          calculatedTotalBallsOverall,
          calculatedTotalGamesOverall
        ]);

      } catch (err) {
        console.error("Error fetching data from Firebase:", err);
        setError(`เกิดข้อผิดพลาดในการดึงข้อมูล: ${err.message || err.toString()}. โปรดตรวจสอบการเชื่อมต่อ Firebase และโครงสร้างข้อมูล`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUserId]); 

  const doughnutData = {
    labels: ['ผู้เล่น', 'ลูกที่ใช้', 'เกมที่เล่น'],
    datasets: [{
      data: doughnutChartValues,
      backgroundColor: [
        '#66DA2A', // Green
        '#FFAB00', // Orange
        '#007bff', // Blue
      ],
      hoverOffset: 4
    }]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            let realValue;
            if (context.label === 'ผู้เล่น') realValue = totalPlayersThisMonth;
            else if (context.label === 'ลูกที่ใช้') realValue = totalBallsUsedOverall;
            else if (context.label === 'เกมที่เล่น') realValue = totalGamesPlayedOverall;
            
            const totalDisplayed = doughnutChartValues.reduce((a, b) => a + b, 0);
            const percentage = totalDisplayed > 0 ? (context.raw / totalDisplayed * 100).toFixed(1) : 0;
            
            return `${label} ${realValue} (${percentage}%)`;
          }
        }
      }
    }
  };

  if (loading) {
    return <div style={styles.loadingContainer}>กำลังโหลดข้อมูล...</div>;
  }

  if (error) {
    return <div style={styles.errorContainer}>เกิดข้อผิดพลาด: {error}</div>;
  }

  return (
    <div style={styles.dashboardContainer}>
      {/* Header Section */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>สรุปภาพรวมก๊วนแบดมินตัน</h1>
        {/* ประกาศสำคัญ ถูกย้ายไปอยู่ใน infoCardsContainer แล้ว */}
      </div>

      {/* Info Cards Section - ตอนนี้มี 4 Cards */}
      <div style={styles.infoCardsContainer}>
        {/* Card 1: จำนวนผู้เล่นทั้งหมดในเดือนนี้ */}
        <div style={{ ...styles.infoCard, backgroundColor: '#FFF0F0' }}>
          <div style={styles.infoCardIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E57373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-users">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <p style={styles.infoCardValue}>{totalPlayersThisMonth}</p>
          <p style={styles.infoCardLabel}>ผู้เล่นทั้งหมดในเดือนนี้</p>
        </div>

        {/* Card 2: จำนวนลูกแบดมินตันที่ใช้ทั้งหมด */}
        <div style={{ ...styles.infoCard, backgroundColor: '#FFFBE6' }}>
          <div style={styles.infoCardIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-circle">
              <circle cx="12" cy="12" r="10"></circle>
            </svg>
          </div>
          <p style={styles.infoCardValue}>{totalBallsUsedOverall}</p>
          <p style={styles.infoCardLabel}>ลูกแบดมินตันที่ใช้ (รวม)</p>
        </div>

        {/* Card 3: จำนวนเกมที่ลงเล่นทั้งหมด */}
        <div style={{ ...styles.infoCard, backgroundColor: '#E6FFF2' }}>
          <div style={styles.infoCardIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#66BB6A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-play-circle">
              <circle cx="12" cy="12" r="10"></circle>
              <polygon points="10 8 16 12 10 16 10 8"></polygon>
            </svg>
          </div>
          <p style={styles.infoCardValue}>{totalGamesPlayedOverall}</p>
          <p style={styles.infoCardLabel}>เกมที่ลงสนาม (รวม)</p>
        </div>

        {/* Card 4: ประกาศสำคัญ (ย้ายมาที่นี่) */}
        <div style={{ ...styles.upcomingEventCard, backgroundColor: '#007bff', color: 'white' }}>
          <h3 style={styles.upcomingEventTitle}>ประกาศสำคัญ</h3>
          <p style={styles.upcomingEventText}>โปรดติดตามประกาศเร็วๆนี้</p>
          <button style={styles.upcomingEventButton}>ดูรายละเอียด</button>
        </div>
      </div>

      {/* Charts Section */}
      <div style={styles.chartsContainer}>
        {/* Visitor Statistics Chart (จำนวนผู้เล่นต่อเดือน) */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>สถิติผู้เข้าร่วม</h3>
          <div style={styles.chartLegend}>
            <span style={{ color: 'rgb(54, 162, 235)', marginRight: '10px' }}>● จำนวนผู้เล่น (คน)</span>
          </div>
          <div style={styles.lineChartWrapper}>
            <Line data={visitorChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
          </div>
        </div>

        {/* Tasks / Doughnut Chart (สัดส่วนข้อมูลหลัก) */}
        <div style={styles.doughnutCard}>
          <h3 style={styles.chartTitle}>สัดส่วนข้อมูลหลัก</h3>
          <div style={styles.doughnutChartWrapper}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
          <div style={styles.doughnutLegend}>
            <p><span style={{ color: '#66DA2A' }}>●</span> ผู้เล่น: {totalPlayersThisMonth} คน</p>
            <p><span style={{ color: '#FFAB00' }}>●</span> ลูกที่ใช้: {totalBallsUsedOverall} ลูก</p>
            <p><span style={{ color: '#007bff' }}>●</span> เกมที่เล่น: {totalGamesPlayedOverall} เกม</p>
          </div>
        </div>
      </div>

      {/* Additional Charts/Info Section (กราฟลูกที่ใช้และเกมที่เล่นรายวัน) */}
      <div style={styles.additionalChartContainer}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>สถิติลูกที่ใช้และเกมที่เล่น (รายวัน)</h3>
          <div style={styles.chartLegend}>
            <span style={{ color: 'rgb(75, 192, 192)', marginRight: '10px' }}>● จำนวนลูกที่ใช้</span>
            <span style={{ color: 'rgb(255, 99, 132)' }}>● จำนวนเกมที่เล่น</span>
          </div>
          <div style={styles.lineChartWrapper}>
             <Line data={ballsAndGamesChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  dashboardContainer: {
    padding: '20px',
    backgroundColor: '#f4f6f9',
    minHeight: '100vh',
    fontFamily: "'Kanit', sans-serif",
    color: '#333',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '20px',
    color: '#555',
  },
  errorContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '20px',
    color: 'red',
    textAlign: 'center',
    padding: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '15px',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#323943',
    flexShrink: 0,
    borderBottom: '1px solid #ddd',
    paddingBottom: '10px',
    marginBottom: '10px',
    width: '100%',
  },
  
  infoCardsContainer: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    flexWrap: 'wrap', 
    alignItems: 'stretch', 
  },
  infoCard: {
    flex: '1 1 calc(20% - 11.25px)',
    minWidth: '150px',
    padding: '10px',
    borderRadius: '10px',
    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    transition: 'transform 0.2s ease',
  },
  infoCardIcon: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '5px',
  },
  infoCardValue: {
    fontSize: '22px',
    fontWeight: 'bold',
    marginBottom: '2px',
    color: '#323943',
  },
  infoCardLabel: {
    fontSize: '11px',
    color: '#666',
  },
  upcomingEventCard: {
    flex: '1 1 calc(40% - 11.25px)',
    minWidth: '250px',
    padding: '15px',
    borderRadius: '10px',
    boxShadow: '0 3px 10px rgba(0, 123, 255, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  upcomingEventTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '6px',
  },
  upcomingEventText: {
    fontSize: '12px',
    lineHeight: '1.3',
    opacity: '0.9',
    marginBottom: '10px',
  },
  upcomingEventButton: {
    backgroundColor: 'white',
    color: '#007bff',
    padding: '7px 12px',
    borderRadius: '5px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    alignSelf: 'flex-start',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'background-color 0.3s ease, color 0.3s ease',
  },
  chartsContainer: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    alignItems: 'stretch', 
  },
  chartCard: {
    flex: '2', 
    minWidth: '350px',
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '10px',
    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    flexDirection: 'column',
  },
  doughnutCard: {
    flex: '1', 
    minWidth: '250px',
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '10px',
    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#323943',
    borderBottom: '1px solid #eee',
    paddingBottom: '6px',
  },
  chartLegend: {
    fontSize: '11px',
    color: '#555',
    marginBottom: '10px',
  },
  lineChartWrapper: {
    width: '100%',
    height: '220px',
    position: 'relative',
  },
  doughnutChartWrapper: {
    width: '100%',
    maxWidth: '180px',
    height: '180px',
    position: 'relative',
    marginBottom: '12px',
  },
  doughnutLegend: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '11px',
    color: '#555',
    alignSelf: 'flex-start',
  },
  additionalChartContainer: {
    marginBottom: '20px',
  },
  // Removed inviteCard and related styles
};

export default Dashboard;

import React, { useState, useEffect } from "react";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

import { db } from "../lib/firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  query,
  where,
  getDoc,
} from "firebase/firestore";

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

  // ค่าสำหรับ Card หลัก - ตอนนี้จะเก็บค่าที่ถูก Filter แล้ว
  const [filteredTotalPlayers, setFilteredTotalPlayers] = useState(0); // เปลี่ยนชื่อเพื่อให้ชัดเจนว่าถูกกรองแล้ว
  const [filteredTotalBalls, setFilteredTotalBalls] = useState(0); // เปลี่ยนชื่อเพื่อให้ชัดเจนว่าถูกกรองแล้ว
  const [filteredTotalGames, setFilteredTotalGames] = useState(0); // เปลี่ยนชื่อเพื่อให้ชัดเจนว่าถูกกรองแล้ว

  // State สำหรับตัวกรองข้อมูลสรุปหลัก: 'today', 'month', 'year', 'overall'
  const [summaryStatsFilter, setSummaryStatsFilter] = useState("month"); // Default to month
  const [summaryLabelSuffix, setSummaryLabelSuffix] = useState("ในเดือนนี้"); // Label suffix for cards

  // State สำหรับเก็บข้อมูลดิบที่ประมวลผลแล้ว สำหรับทุกช่วงเวลา (เพื่อนำไป Filter ได้)
  const [aggregatedSummaryData, setAggregatedSummaryData] = useState(null);

  // State สำหรับกราฟ "สถิติผู้เข้าร่วม" (ผู้เล่นต่อเดือน)
  const [processedMatchData, setProcessedMatchData] = useState({
    dailyUniquePlayers: {}, // Unique players per day (for line chart)
    monthlyUniquePlayers: {}, // Unique players per month (for line chart)
    yearlyUniquePlayers: {}, // Unique players per year (for line chart)
    dailyBalls: {},
    dailyGames: {},
  });

  // State สำหรับตัวกรองกราฟผู้เข้าร่วม: 'daily', 'monthly', 'yearly'
  const [visitorChartFilter, setVisitorChartFilter] = useState("daily"); // Default to monthly

  // State สำหรับตัวกรองสถิติสรุปหลัก: 'proportions' หรือ 'topPlayers'
  const [mainStatsFilter, setMainStatsFilter] = useState("proportions"); // Default to proportions
  const [topPlayersData, setTopPlayersData] = useState([]); // Stores [{name: 'Player A', games: 10}, ...]

  // ข้อมูลสำหรับกราฟ "สถิติผู้เข้าร่วม" (ผู้เล่นต่อเดือน)
  const [visitorChartData, setVisitorChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "จำนวนผู้เล่น (คน)",
        data: [],
        borderColor: "rgb(54, 162, 235)",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
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
        label: "จำนวนลูกที่ใช้ (ลูก)",
        data: [],
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.4,
        fill: false,
      },
      {
        label: "จำนวนเกมที่เล่น (เกม)",
        data: [],
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
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
          const userQuery = query(
            usersRef,
            where("email", "==", loggedInEmail)
          );
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
        const matchesColRef = collection(
          doc(db, "users", currentUserId),
          "Matches"
        );
        const matchSnapshot = await getDocs(matchesColRef);

        console.log("Firebase Query Path: ", `users/${currentUserId}/Matches`);
        console.log("Number of Match Documents fetched:", matchSnapshot.size);

        const matchesList = matchSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log("Fetched Matches Data:", matchesList);

        // ** Variables for processing data for Charts **
        let dailyUniquePlayersTemp = {}; // For Visitor Line Chart 'daily'
        let monthlyUniquePlayersTemp = {}; // For Visitor Line Chart 'monthly'
        let yearlyUniquePlayersTemp = {}; // For Visitor Line Chart 'yearly'
        let dailyBallsTemp = {}; // For Balls/Games Line Chart
        let dailyGamesTemp = {}; // For Balls/Games Line Chart
        let playerGameCounts = {}; // For Top Players List

        // ** Variables for processing data for Summary Cards (filterable) **
        let playerOccurrencesByDay = {}; // Key: YYYY-MM-DD, Value: count of unique players for that day
        let ballsByDay = {}; // Key: YYYY-MM-DD, Value: total balls for that day
        let gamesByDay = {}; // Key: YYYY-MM-DD, Value: total games for that day

        let playerOccurrencesByMonth = {}; // Key: YYYY-MM, Value: sum of unique players per day for that month
        let ballsByMonth = {}; // Key: YYYY-MM, Value: total balls for that month
        let gamesByMonth = {}; // Key: YYYY-MM, Value: total games for that month

        let playerOccurrencesByYear = {}; // Key: YYYY, Value: sum of unique players per day for that year
        let ballsByYear = {}; // Key: YYYY, Value: total balls for that year
        let gamesByYear = {}; // Key: YYYY, Value: total games for that year

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentYearMonthString = `${currentYear}-${currentMonth
          .toString()
          .padStart(2, "0")}`;

        matchesList.forEach((matchDoc) => {
          const matchDateStr = matchDoc.matchDate;
          let matchDate;
          if (matchDateStr) {
            matchDate = new Date(matchDateStr);
          } else {
            console.warn(
              `Match document ${matchDoc.id} has no matchDate. Skipping.`
            );
            return;
          }

          if (isNaN(matchDate.getTime())) {
            console.warn(
              `Invalid matchDate format for document ${matchDoc.id}: ${matchDateStr}. Skipping.`
            );
            return;
          }

          const matchYear = matchDate.getFullYear();
          const matchMonth = matchDate.getMonth() + 1;
          const matchDay = matchDate.getDate();
          const matchYearMonthKey = `${matchYear}-${matchMonth
            .toString()
            .padStart(2, "0")}`;
          const matchDateKey = `${matchYear}-${matchMonth
            .toString()
            .padStart(2, "0")}-${matchDay.toString().padStart(2, "0")}`;
          const matchYearKey = `${matchYear}`;

          // Filter data for the last 6 months (including current month) for charts
          const diffMonths =
            (now.getFullYear() - matchDate.getFullYear()) * 12 +
            (now.getMonth() - matchDate.getMonth());
          const isInLastSixMonths = diffMonths >= 0 && diffMonths < 6;

          // --- Process data for Summary Cards (filterable) ---
          const uniquePlayersInThisMatchDoc = new Set();
          let currentBallsInMatchDoc = 0;
          let currentGamesInMatchDoc = 0;

          if (matchDoc.matches && Array.isArray(matchDoc.matches)) {
            matchDoc.matches.forEach((game) => {
              // Collect unique players for THIS matchDoc (day)
              if (game.A1) uniquePlayersInThisMatchDoc.add(game.A1);
              if (game.A2) uniquePlayersInThisMatchDoc.add(game.A2);
              if (game.B1) uniquePlayersInThisMatchDoc.add(game.B1);
              if (game.B2) uniquePlayersInThisMatchDoc.add(game.B2);

              // Sum balls and games for THIS matchDoc (day)
              const ballsUsedInGame = parseInt(game.balls || "0", 10);
              if (!isNaN(ballsUsedInGame)) {
                currentBallsInMatchDoc += ballsUsedInGame;
              }
              currentGamesInMatchDoc += 1;

              // Count games for each player (for Top Players)
              if (game.A1)
                playerGameCounts[game.A1] =
                  (playerGameCounts[game.A1] || 0) + 1;
              if (game.A2)
                playerGameCounts[game.A2] =
                  (playerGameCounts[game.A2] || 0) + 1;
              if (game.B1)
                playerGameCounts[game.B1] =
                  (playerGameCounts[game.B1] || 0) + 1;
              if (game.B2)
                playerGameCounts[game.B2] =
                  (playerGameCounts[game.B2] || 0) + 1;
            });
          } else {
            console.warn(
              `Match document ${matchDoc.id} has no 'matches' array or it's not an array. Skipping game data for summary/charts.`
            );
          }

          // Store daily aggregates for summary (unique players per day)
          playerOccurrencesByDay[matchDateKey] = (playerOccurrencesByDay[matchDateKey] || 0) + uniquePlayersInThisMatchDoc.size; // Sum unique players per day (as requested "ครั้งที่มา")
          ballsByDay[matchDateKey] = (ballsByDay[matchDateKey] || 0) + currentBallsInMatchDoc;
          gamesByDay[matchDateKey] = (gamesByDay[matchDateKey] || 0) + currentGamesInMatchDoc;

          // Accumulate monthly aggregates for summary
          if (!playerOccurrencesByMonth[matchYearMonthKey]) {
            playerOccurrencesByMonth[matchYearMonthKey] = 0;
            ballsByMonth[matchYearMonthKey] = 0;
            gamesByMonth[matchYearMonthKey] = 0;
          }
          playerOccurrencesByMonth[matchYearMonthKey] += uniquePlayersInThisMatchDoc.size;
          ballsByMonth[matchYearMonthKey] += currentBallsInMatchDoc;
          gamesByMonth[matchYearMonthKey] += currentGamesInMatchDoc;

          // Accumulate yearly aggregates for summary
          if (!playerOccurrencesByYear[matchYearKey]) {
            playerOccurrencesByYear[matchYearKey] = 0;
            ballsByYear[matchYearKey] = 0;
            gamesByYear[matchYearKey] = 0;
          }
          playerOccurrencesByYear[matchYearKey] += uniquePlayersInThisMatchDoc.size;
          ballsByYear[matchYearKey] += currentBallsInMatchDoc;
          gamesByYear[matchYearKey] += currentGamesInMatchDoc;

          // --- Process data for Charts (distinct unique players for line charts) ---
          if (isInLastSixMonths) {
            // Chart: Unique Players per Month (for last 6 months)
            if (!monthlyUniquePlayersTemp[matchYearMonthKey]) {
              monthlyUniquePlayersTemp[matchYearMonthKey] = new Set();
            }
            if (matchDoc.matches && Array.isArray(matchDoc.matches)) {
                matchDoc.matches.forEach(game => {
                    if (game.A1) monthlyUniquePlayersTemp[matchYearMonthKey].add(game.A1);
                    if (game.A2) monthlyUniquePlayersTemp[matchYearMonthKey].add(game.A2);
                    if (game.B1) monthlyUniquePlayersTemp[matchYearMonthKey].add(game.B1);
                    if (game.B2) monthlyUniquePlayersTemp[matchYearMonthKey].add(game.B2);
                });
            }

            // Chart: Unique Players per Day (for current month's daily chart)
            if (!dailyUniquePlayersTemp[matchDateKey]) {
              dailyUniquePlayersTemp[matchDateKey] = new Set();
            }
            if (matchDoc.matches && Array.isArray(matchDoc.matches)) {
                matchDoc.matches.forEach(game => {
                    if (game.A1) dailyUniquePlayersTemp[matchDateKey].add(game.A1);
                    if (game.A2) dailyUniquePlayersTemp[matchDateKey].add(game.A2);
                    if (game.B1) dailyUniquePlayersTemp[matchDateKey].add(game.B1);
                    if (game.B2) dailyUniquePlayersTemp[matchDateKey].add(game.B2);
                });
            }


            // Chart: Unique Players per Year (for all years)
            if (!yearlyUniquePlayersTemp[matchYearKey]) {
              yearlyUniquePlayersTemp[matchYearKey] = new Set();
            }
            if (matchDoc.matches && Array.isArray(matchDoc.matches)) {
                matchDoc.matches.forEach(game => {
                    if (game.A1) yearlyUniquePlayersTemp[matchYearKey].add(game.A1);
                    if (game.A2) yearlyUniquePlayersTemp[matchYearKey].add(game.A2);
                    if (game.B1) yearlyUniquePlayersTemp[matchYearKey].add(game.B1);
                    if (game.B2) yearlyUniquePlayersTemp[matchYearKey].add(game.B2);
                });
            }


            // Daily Balls Used & Games Played (for current month's daily chart)
            if (matchYearMonthKey === currentYearMonthString) {
              dailyBallsTemp[matchDateKey] =
                (dailyBallsTemp[matchDateKey] || 0) + currentBallsInMatchDoc; // Use currentBallsInMatchDoc from above
              dailyGamesTemp[matchDateKey] =
                (dailyGamesTemp[matchDateKey] || 0) + currentGamesInMatchDoc; // Use currentGamesInMatchDoc from above
            }
          }
        });

        // Store all processed data for later use with filter
        setProcessedMatchData({
          dailyUniquePlayers: dailyUniquePlayersTemp,
          monthlyUniquePlayers: monthlyUniquePlayersTemp,
          yearlyUniquePlayers: yearlyUniquePlayersTemp,
          dailyBalls: dailyBallsTemp,
          dailyGames: dailyGamesTemp,
        });

        // Store aggregated summary data
        setAggregatedSummaryData({
          playerOccurrencesByDay,
          playerOccurrencesByMonth,
          playerOccurrencesByYear,
          ballsByDay,
          ballsByMonth,
          ballsByYear,
          gamesByDay,
          gamesByMonth,
          gamesByYear,
          // Calculate overall totals from yearly aggregations
          calculatedTotalPlayersOverall: Object.values(playerOccurrencesByYear).reduce((sum, count) => sum + count, 0),
          calculatedTotalBallsOverall: Object.values(ballsByYear).reduce((sum, count) => sum + count, 0),
          calculatedTotalGamesOverall: Object.values(gamesByYear).reduce((sum, count) => sum + count, 0),
        });


        // ** Process and set Top Players data **
        const sortedPlayers = Object.entries(playerGameCounts)
          .map(([name, games]) => ({ name, games }))
          .sort((a, b) => b.games - a.games)
          .slice(0, 5); // Get top 5 players
        setTopPlayersData(sortedPlayers);

        // ** Prepare data for "Balls and Games Played (Daily)" chart **
        // This chart remains daily for the current month
        const dailyKeysInCurrentMonth = Object.keys(dailyBallsTemp)
          .filter((dateKey) => dateKey.startsWith(currentYearMonthString))
          .sort();
        const dailyLabels = dailyKeysInCurrentMonth.map((dateKey) => {
          const [, , day] = dateKey.split("-");
          return `${parseInt(day)}`;
        });
        const dailyBallsData = dailyKeysInCurrentMonth.map(
          (dateKey) => dailyBallsTemp[dateKey]
        );
        const dailyGamesData = dailyKeysInCurrentMonth.map(
          (dateKey) => dailyGamesTemp[dateKey]
        );

        setBallsAndGamesChartData((prev) => ({
          ...prev,
          labels: dailyLabels,
          datasets: [
            {
              ...prev.datasets[0],
              data: dailyBallsData,
              label: "จำนวนลูกที่ใช้ (ลูก)",
            },
            {
              ...prev.datasets[1],
              data: dailyGamesData,
              label: "จำนวนเกมที่เล่น (เกม)",
            },
          ],
        }));

      } catch (err) {
        console.error("Error fetching data from Firebase:", err);
        setError(
          `เกิดข้อผิดพลาดในการดึงข้อมูล: ${
            err.message || err.toString()
          }. โปรดตรวจสอบการเชื่อมต่อ Firebase และโครงสร้างข้อมูล`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUserId]);

  // Effect to update Summary Cards and Doughnut Chart when filter or aggregated data changes
  useEffect(() => {
    if (!aggregatedSummaryData) return; // Wait for data to be loaded

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${(today.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
    const thisMonthKey = `${today.getFullYear()}-${(today.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;
    const thisYearKey = `${today.getFullYear()}`;

    let playersValue = 0;
    let ballsValue = 0;
    let gamesValue = 0;
    let newSummaryLabelSuffix = '';

    if (summaryStatsFilter === "today") {
      playersValue = aggregatedSummaryData.playerOccurrencesByDay[todayKey] || 0;
      ballsValue = aggregatedSummaryData.ballsByDay[todayKey] || 0;
      gamesValue = aggregatedSummaryData.gamesByDay[todayKey] || 0;
      newSummaryLabelSuffix = 'ในวันนี้';
    } else if (summaryStatsFilter === "month") {
      playersValue = aggregatedSummaryData.playerOccurrencesByMonth[thisMonthKey] || 0;
      ballsValue = aggregatedSummaryData.ballsByMonth[thisMonthKey] || 0;
      gamesValue = aggregatedSummaryData.gamesByMonth[thisMonthKey] || 0;
      newSummaryLabelSuffix = 'ในเดือนนี้';
    } else if (summaryStatsFilter === "year") {
      playersValue = aggregatedSummaryData.playerOccurrencesByYear[thisYearKey] || 0;
      ballsValue = aggregatedSummaryData.ballsByYear[thisYearKey] || 0;
      gamesValue = aggregatedSummaryData.gamesByYear[thisYearKey] || 0;
      newSummaryLabelSuffix = 'ในปีนี้';
    } else if (summaryStatsFilter === "overall") {
      playersValue = aggregatedSummaryData.calculatedTotalPlayersOverall;
      ballsValue = aggregatedSummaryData.calculatedTotalBallsOverall;
      gamesValue = aggregatedSummaryData.calculatedTotalGamesOverall;
      newSummaryLabelSuffix = 'ทั้งหมด (รวม)';
    }

    setFilteredTotalPlayers(playersValue);
    setFilteredTotalBalls(ballsValue);
    setFilteredTotalGames(gamesValue);
    setSummaryLabelSuffix(newSummaryLabelSuffix);

    // Update doughnut chart values
    setDoughnutChartValues([
      playersValue,
      ballsValue,
      gamesValue,
    ]);
  }, [summaryStatsFilter, aggregatedSummaryData]);

  // Effect to update Visitor Chart when filter or processed data changes
  useEffect(() => {
    const updateVisitorChart = () => {
      let labels = [];
      let data = [];
      const { dailyUniquePlayers, monthlyUniquePlayers, yearlyUniquePlayers } =
        processedMatchData;

      if (visitorChartFilter === "daily") {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentYearMonthString = `${currentYear}-${currentMonth
          .toString()
          .padStart(2, "0")}`;

        const dailyKeysInCurrentMonth = Object.keys(dailyUniquePlayers)
          .filter((dateKey) => dateKey.startsWith(currentYearMonthString))
          .sort();
        labels = dailyKeysInCurrentMonth.map((dateKey) => {
          const [, , day] = dateKey.split("-");
          return `${parseInt(day)}`;
        });
        data = dailyKeysInCurrentMonth.map(
          (dateKey) => dailyUniquePlayers[dateKey].size
        );
      } else if (visitorChartFilter === "monthly") {
        const sortedMonthlyKeys = Object.keys(monthlyUniquePlayers).sort();
        labels = sortedMonthlyKeys.map((monthKey) => {
          const [year, mon] = monthKey.split("-");
          const date = new Date(parseInt(year), parseInt(mon) - 1, 1);
          return date.toLocaleString("th-TH", {
            month: "short",
            year: "numeric",
          });
        });
        data = sortedMonthlyKeys.map(
          (monthKey) => monthlyUniquePlayers[monthKey].size
        );
      } else if (visitorChartFilter === "yearly") {
        const sortedYearlyKeys = Object.keys(yearlyUniquePlayers).sort();
        labels = sortedYearlyKeys.map((yearKey) => `${yearKey}`);
        data = sortedYearlyKeys.map(
          (yearKey) => yearlyUniquePlayers[yearKey].size
        );
      }

      setVisitorChartData((prev) => ({
        ...prev,
        labels: labels,
        datasets: [{ ...prev.datasets[0], data: data }],
      }));
    };

    updateVisitorChart();
  }, [visitorChartFilter, processedMatchData]);

  const doughnutData = {
    labels: ["ผู้เล่น", "ลูกที่ใช้", "เกมที่เล่น"],
    datasets: [
      {
        data: doughnutChartValues,
        backgroundColor: [
          "#66DA2A", // Green
          "#FFAB00", // Orange
          "#007bff", // Blue
        ],
        hoverOffset: 4,
      },
    ],
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
          label: function (context) {
            let label = context.label || "";
            if (label) {
              label += ": ";
            }
            let valueToDisplay;
            if (context.label === "ผู้เล่น") valueToDisplay = filteredTotalPlayers;
            else if (context.label === "ลูกที่ใช้") valueToDisplay = filteredTotalBalls;
            else if (context.label === "เกมที่เล่น") valueToDisplay = filteredTotalGames;

            const totalDisplayed = doughnutChartValues.reduce(
              (a, b) => a + b,
              0
            );
            const percentage =
              totalDisplayed > 0
                ? ((context.raw / totalDisplayed) * 100).toFixed(1)
                : 0;

            // Adjusted label for "ผู้เล่น" to reflect "ครั้ง"
            if (context.label === "ผู้เล่น") {
              return `${label} ${valueToDisplay} ครั้ง (${percentage}%)`;
            }
            return `${label} ${valueToDisplay} (${percentage}%)`;
          },
        },
      },
    },
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
      </div>

      {/* Filter for Summary Cards */}
      <div style={styles.summaryFilterContainer}>
        <span style={styles.summaryFilterLabel}>แสดงข้อมูลสำหรับ:</span>
        <select
          value={summaryStatsFilter}
          onChange={(e) => setSummaryStatsFilter(e.target.value)}
          style={styles.selectFilter}
        >
          <option value="today">วันนี้</option>
          <option value="month">เดือนนี้</option>
          <option value="year">ปีนี้</option>
          <option value="overall">ทั้งหมด (รวม)</option>
        </select>
      </div>

      {/* Info Cards Section */}
      <div style={styles.infoCardsContainer}>
        {/* Card 1: จำนวนผู้เล่น */}
        <div style={{ ...styles.infoCard, backgroundColor: "#FFF0F0" }}>
          <div style={styles.infoCardIcon}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#E57373"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="feather feather-users"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <p style={styles.infoCardValue}>{filteredTotalPlayers}</p>
          <p style={styles.infoCardLabel}>จำนวนครั้งที่มีผู้เล่น {summaryLabelSuffix}</p>
        </div>

        {/* Card 2: จำนวนลูกแบดมินตันที่ใช้ */}
        <div style={{ ...styles.infoCard, backgroundColor: "#FFFBE6" }}>
          <div style={styles.infoCardIcon}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFD700"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="feather feather-circle"
            >
              <circle cx="12" cy="12" r="10"></circle>
            </svg>
          </div>
          <p style={styles.infoCardValue}>{filteredTotalBalls}</p>
          <p style={styles.infoCardLabel}>ลูกแบดมินตันที่ใช้ {summaryLabelSuffix}</p>
        </div>

        {/* Card 3: จำนวนเกมที่ลงเล่น */}
        <div style={{ ...styles.infoCard, backgroundColor: "#E6FFF2" }}>
          <div style={styles.infoCardIcon}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#66BB6A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="feather feather-play-circle"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <polygon points="10 8 16 12 10 16 10 8"></polygon>
            </svg>
          </div>
          <p style={styles.infoCardValue}>{filteredTotalGames}</p>
          <p style={styles.infoCardLabel}>เกมที่ลงสนาม {summaryLabelSuffix}</p>
        </div>

        {/* Card 4: ประกาศสำคัญ */}
        <div
          style={{
            ...styles.upcomingEventCard,
            backgroundColor: "#007bff",
            color: "white",
          }}
        >
          <h3 style={styles.upcomingEventTitle}>ประกาศสำคัญ</h3>
          <p style={styles.upcomingEventText}>โปรดติดตามประกาศเร็วๆนี้</p>
          <button style={styles.upcomingEventButton}>ดูรายละเอียด</button>
        </div>
      </div>

      {/* Charts Section */}
      <div style={styles.chartsContainer}>
        {/* Visitor Statistics Chart (จำนวนผู้เล่นต่อเดือน) */}
        <div style={styles.chartCard}>
          <div style={styles.chartHeaderWithFilter}>
            <h3 style={styles.chartTitle}>สถิติผู้เข้าร่วม</h3>
            <select
              value={visitorChartFilter}
              onChange={(e) => setVisitorChartFilter(e.target.value)}
              style={styles.selectFilter}
            >
              <option value="daily">รายวัน (เดือนปัจจุบัน)</option>
              <option value="monthly">รายเดือน (6 เดือนล่าสุด)</option>
              <option value="yearly">รายปี (ทั้งหมด)</option>
            </select>
          </div>
          <div style={styles.chartLegend}>
            <span style={{ color: "rgb(54, 162, 235)", marginRight: "10px" }}>
              ● จำนวนผู้เล่น (คน)
            </span>
          </div>
          <div style={styles.lineChartWrapper}>
            <Line
              data={visitorChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
              }}
            />
          </div>
        </div>

        {/* Tasks / Doughnut Chart / Top Players (สัดส่วนข้อมูลหลัก/ผู้เล่นยอดนิยม) */}
        <div style={styles.doughnutCard}>
          <div style={styles.chartHeaderWithFilter}>
            <h3 style={styles.chartTitle}>สถิติสรุป</h3>{" "}
            <select
              value={mainStatsFilter}
              onChange={(e) => setMainStatsFilter(e.target.value)}
              style={styles.selectFilter}
            >
              <option value="proportions">สัดส่วนข้อมูลหลัก</option>
              <option value="topPlayers">ผู้เล่นยอดนิยม</option>
            </select>
          </div>

          {mainStatsFilter === "proportions" ? (
            <>
              <div style={styles.doughnutChartWrapper}>
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
              <div style={styles.doughnutLegend}>
                <p>
                  <span style={{ color: "#66DA2A" }}>●</span> ผู้เล่น:{" "}
                  {filteredTotalPlayers} ครั้ง {summaryLabelSuffix}
                </p>
                <p>
                  <span style={{ color: "#FFAB00" }}>●</span> ลูกที่ใช้:{" "}
                  {filteredTotalBalls} ลูก {summaryLabelSuffix}
                </p>
                <p>
                  <span style={{ color: "#007bff" }}>●</span> เกมที่เล่น:{" "}
                  {filteredTotalGames} เกม {summaryLabelSuffix}
                </p>
              </div>
            </>
          ) : (
            <div style={styles.topPlayersListContainer}>
              <h4 style={styles.topPlayersListTitle}>
                ผู้เล่นยอดนิยม (5 อันดับแรก)
              </h4>
              <ul style={styles.topPlayersList}>
                {topPlayersData.length > 0 ? (
                  topPlayersData.map((player, index) => (
                    <li key={index} style={styles.topPlayerListItem}>
                      <span>
                        {index + 1}. {player.name}
                      </span>
                      <span>{player.games} เกม</span>
                    </li>
                  ))
                ) : (
                  <p style={styles.noDataText}>ไม่มีข้อมูลผู้เล่น</p>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Additional Charts/Info Section (กราฟลูกที่ใช้และเกมที่เล่นรายวัน) */}
      <div style={styles.additionalChartContainer}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>
            สถิติลูกที่ใช้และเกมที่เล่น (รายวัน)
          </h3>
          <div style={styles.chartLegend}>
            <span style={{ color: "rgb(75, 192, 192)", marginRight: "10px" }}>
              ● จำนวนลูกที่ใช้
            </span>
            <span style={{ color: "rgb(255, 99, 132)" }}>
              ● จำนวนเกมที่เล่น
            </span>
          </div>
          <div style={styles.lineChartWrapper}>
            <Line
              data={ballsAndGamesChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  dashboardContainer: {
    padding: "20px",
    backgroundColor: "#f4f6f9",
    minHeight: "100vh",
    fontFamily: "'Kanit', sans-serif",
    color: "#333",
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    fontSize: "20px",
    color: "#555",
  },
  errorContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    fontSize: "20px",
    color: "red",
    textAlign: "center",
    padding: "20px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "15px",
  },
  headerTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#323943",
    flexShrink: 0,
    borderBottom: "1px solid #ddd",
    paddingBottom: "10px",
    marginBottom: "10px",
    width: "100%",
  },

  summaryFilterContainer: {
    marginBottom: "15px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  summaryFilterLabel: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#555",
  },
  infoCardsContainer: {
    display: "flex",
    gap: "15px",
    marginBottom: "20px",
    flexWrap: "wrap",
    alignItems: "stretch",
  },
  infoCard: {
    flex: "1 1 calc(20% - 11.25px)",
    minWidth: "150px",
    padding: "10px",
    borderRadius: "10px",
    boxShadow: "0 3px 10px rgba(0, 0, 0, 0.05)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "flex-start",
    transition: "transform 0.2s ease",
  },
  infoCardIcon: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    backgroundColor: "rgba(255,255,255,0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "5px",
  },
  infoCardValue: {
    fontSize: "22px",
    fontWeight: "bold",
    marginBottom: "2px",
    color: "#323943",
  },
  infoCardLabel: {
    fontSize: "11px",
    color: "#666",
  },
  upcomingEventCard: {
    flex: "1 1 calc(40% - 11.25px)",
    minWidth: "250px",
    padding: "15px",
    borderRadius: "10px",
    boxShadow: "0 3px 10px rgba(0, 123, 255, 0.2)",
    backgroundColor: "#007bff",
    color: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  upcomingEventTitle: {
    fontSize: "16px",
    fontWeight: "bold",
    marginBottom: "6px",
  },
  upcomingEventText: {
    fontSize: "12px",
    lineHeight: "1.3",
    opacity: "0.9",
    marginBottom: "10px",
  },
  upcomingEventButton: {
    backgroundColor: "white",
    color: "#007bff",
    padding: "7px 12px",
    borderRadius: "5px",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
    alignSelf: "flex-start",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    transition: "background-color 0.3s ease, color 0.3s ease",
  },
  chartsContainer: {
    display: "flex",
    gap: "20px",
    marginBottom: "20px",
    flexWrap: "wrap",
    alignItems: "stretch",
  },
  chartCard: {
    flex: "2",
    minWidth: "350px",
    backgroundColor: "white",
    padding: "15px",
    borderRadius: "10px",
    boxShadow: "0 3px 10px rgba(0, 0, 0, 0.05)",
    display: "flex",
    flexDirection: "column",
  },
  doughnutCard: {
    flex: "1",
    minWidth: "250px",
    backgroundColor: "white",
    padding: "15px",
    borderRadius: "10px",
    boxShadow: "0 3px 10px rgba(0, 0, 0, 0.05)",
    display: "flex",
    flexDirection: "column",
  },
  chartTitle: {
    fontSize: "16px",
    fontWeight: "600",
    marginBottom: "10px",
    color: "#323943",
    borderBottom: "1px solid #eee",
    paddingBottom: "6px",
  },
  chartHeaderWithFilter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
    borderBottom: "1px solid #eee",
    paddingBottom: "6px",
  },
  selectFilter: {
    padding: "5px 8px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "12px",
    backgroundColor: "white",
    cursor: "pointer",
  },
  chartLegend: {
    fontSize: "11px",
    color: "#555",
    marginBottom: "10px",
  },
  lineChartWrapper: {
    width: "100%",
    height: "220px",
    position: "relative",
  },
  doughnutChartWrapper: {
    width: "100%",
    maxWidth: "180px",
    height: "180px",
    position: "relative",
    marginBottom: "12px",
    alignSelf: "center",
  },
  doughnutLegend: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "11px",
    color: "#555",
    alignSelf: "center",
  },
  additionalChartContainer: {
    marginBottom: "20px",
  },
  // New styles for Top Players List
  topPlayersListContainer: {
    width: "100%",
    padding: "10px 0",
  },
  topPlayersListTitle: {
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "10px",
    color: "#323943",
    textAlign: "center",
  },
  topPlayersList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  topPlayerListItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 5px",
    borderBottom: "1px solid #eee",
    fontSize: "13px",
    color: "#555",
  },
  noDataText: {
    textAlign: "center",
    color: "#888",
    fontSize: "13px",
    marginTop: "15px",
  },
};
export default Dashboard;

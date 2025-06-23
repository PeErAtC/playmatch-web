// pages/Ranking.js
import React, { useState, useEffect, useCallback } from "react";
import { db, auth } from "../lib/firebaseConfig"; // ตรวจสอบเส้นทาง firebaseConfig ของคุณ และเพิ่ม auth
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth"; // เพิ่ม onAuthStateChanged
import Swal from "sweetalert2";
import Head from "next/head";
import { useRouter } from "next/router";
import { FaTrophy } from "react-icons/fa"; // สำหรับ icon (ต้องติดตั้ง react-icons ก่อน)

// ติดตั้ง react-icons: npm install react-icons

const Ranking = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [loggedInUserId, setLoggedInUserId] = useState(null); // เพิ่ม state สำหรับ userId ของผู้ใช้ที่ล็อกอิน

  const router = useRouter();

  // Effect สำหรับตรวจสอบสถานะการล็อกอิน
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // ผู้ใช้ล็อกอินอยู่
        setLoggedInUserId(user.uid);
        console.log("Ranking: User logged in with UID:", user.uid);
        // เมื่อผู้ใช้ล็อกอินแล้ว ให้ตั้งค่า loading เป็น true เพื่อดึงข้อมูล
        setLoading(true); 
      } else {
        // ผู้ใช้ไม่ได้ล็อกอิน
        setLoggedInUserId(null);
        setRankings([]); // เคลียร์ข้อมูล Ranking ถ้าไม่ได้ล็อกอิน
        setAvailableMonths([]); // เคลียร์เดือนที่เลือกได้
        setAvailableYears([]); // เคลียร์ปีที่เลือกได้
        setSelectedMonth(""); // เคลียร์เดือนที่เลือกไว้
        setSelectedYear(""); // เคลียร์ปีที่เลือกไว้
        setLoading(false); // หยุดโหลด
        console.log("Ranking: No user logged in.");
        // แสดงข้อความเตือนหรือ redirect ไปหน้า Login
        Swal.fire({
          icon: "info",
          title: "คุณยังไม่ได้เข้าสู่ระบบ",
          text: "โปรดเข้าสู่ระบบเพื่อดูข้อมูลอันดับผู้เล่น",
          confirmButtonText: "ตกลง",
        }).then(() => {
          // router.push("/login"); // ตัวอย่าง: Redirect ไปหน้า Login หากต้องการ
        });
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // รันแค่ครั้งเดียวตอน component mount

  // ฟังก์ชันสำหรับดึงรายการเดือนและปีที่มีข้อมูล
  const getAvailableMonthsAndYears = useCallback(async () => {
    if (!loggedInUserId) { // ถ้ายังไม่มี userId ก็ไม่ต้องทำอะไร
      // setLoading(false); // ไม่ต้องตั้งค่าตรงนี้ เพราะ useEffect ด้านล่างจะจัดการ
      return;
    }
    setLoading(true); // เริ่มโหลดเมื่อมี userId และกำลังจะดึงข้อมูล
    try {
      console.log("Ranking: Attempting to fetch available months and years from Document IDs for user:", loggedInUserId);

      // สร้าง reference ไปยัง subcollection "Ranking" ภายใต้ user document
      const userRankingCollectionRef = collection(db, "users", loggedInUserId, "Ranking");
      const snapshot = await getDocs(userRankingCollectionRef);

      const uniqueMonths = new Set();
      const uniqueYears = new Set();
      const parsedDocIds = []; // สำหรับ Debug

      snapshot.forEach((doc) => {
        const docId = doc.id; // ดึง Document ID โดยตรง
        // Document ID คาดว่าอยู่ในรูปแบบ MM-YYYY
        const parts = docId.split('-');

        if (parts.length === 2) {
          const month = parts[0];
          const year = parts[1];

          // ตรวจสอบว่าเป็นตัวเลขและมีความยาวที่ถูกต้อง
          if (month.length === 2 && !isNaN(parseInt(month)) &&
              year.length === 4 && !isNaN(parseInt(year))) {
            uniqueMonths.add(month);
            uniqueYears.add(year);
            parsedDocIds.push({ month, year, docId }); // สำหรับ Debug
          } else {
            console.warn(`Ranking: Invalid Document ID format found (not MM-YYYY): "${docId}"`);
          }
        } else {
          console.warn(`Ranking: Invalid Document ID format found (incorrect parts count): "${docId}"`);
        }
      });

      const sortedYears = Array.from(uniqueYears).sort((a, b) => parseInt(b) - parseInt(a)); // เรียงปีจากมากไปน้อย
      const sortedMonths = Array.from(uniqueMonths).sort((a, b) => parseInt(b) - parseInt(a)); // เรียงเดือนจากมากไปน้อย (ถ้าต้องการ 12, 11, ...)

      console.log("Ranking: Available Years (sorted):", sortedYears);
      console.log("Ranking: Available Months (sorted):", sortedMonths);
      console.log("Ranking: Available Document IDs parsed:", parsedDocIds);

      setAvailableYears(sortedYears);
      setAvailableMonths(sortedMonths);

      // กำหนดเดือนและปีเริ่มต้น: เดือนปัจจุบันและปีปัจจุบัน
      const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, "0");
      const currentYear = new Date().getFullYear().toString();

      let initialMonth = "";
      let initialYear = "";

      // ตรวจสอบจาก Document IDs ที่เราพบ
      if (parsedDocIds.length > 0) {
        // หา document ที่ตรงกับเดือนและปีปัจจุบันก่อน
        const currentMonthYearDoc = parsedDocIds.find(item => item.month === currentMonth && item.year === currentYear);
        
        if (currentMonthYearDoc) {
          initialMonth = currentMonth;
          initialYear = currentYear;
        } else {
          // ถ้าไม่มีเดือน/ปีปัจจุบัน ให้เลือกปีล่าสุดและเดือนล่าสุดที่มี
          const latestYear = sortedYears.length > 0 ? sortedYears[0] : "";
          if (latestYear) {
            // กรองหาเดือนที่มีในปีล่าสุดนั้น
            const monthsInLatestYear = parsedDocIds
              .filter(item => item.year === latestYear)
              .map(item => item.month)
              .sort((a, b) => parseInt(b) - parseInt(a)); // เรียงเดือนจากมากไปน้อย
            
            initialYear = latestYear;
            initialMonth = monthsInLatestYear.length > 0 ? monthsInLatestYear[0] : "";
          }
        }
      }

      console.log("Ranking: Initial selection set to: Year=", initialYear, ", Month=", initialMonth);

      setSelectedYear(initialYear);
      setSelectedMonth(initialMonth);

      setLoading(false); // หยุดโหลดหลังจากดึงข้อมูลเสร็จ
    } catch (err) {
      console.error("Ranking: Critical Error fetching available months and years:", err);
      setError("ไม่สามารถโหลดเดือนและปีที่มีข้อมูลได้: " + err.message);
      setLoading(false); // หยุดโหลดเมื่อมีข้อผิดพลาด
    }
  }, [loggedInUserId]); // เพิ่ม loggedInUserId เป็น dependency

  // ฟังก์ชันสำหรับดึงข้อมูล Ranking
  const fetchRankings = useCallback(async () => {
    if (!selectedMonth || !selectedYear || !loggedInUserId) { // เพิ่มเงื่อนไข loggedInUserId
      setRankings([]); // เคลียร์ Ranking ถ้ายังไม่ได้เลือกเดือน/ปี หรือยังไม่มี user
      setLoading(false); // หยุดโหลด
      console.log("Ranking: No month, year, or user selected/logged in, Ranking will be empty.");
      return;
    }

    setLoading(true); // เริ่มโหลดเมื่อกำลังจะดึงข้อมูล Ranking
    setError(null);
    try {
      const monthYearDocId = `${selectedMonth}-${selectedYear}`;
      console.log(`Ranking: Attempting to fetch rankings for Document ID: ${monthYearDocId} under user ${loggedInUserId}`);

      // สร้าง reference ไปยัง Document ของเดือน/ปีที่เลือก ภายใต้ subcollection "Ranking"
      const docRef = doc(db, "users", loggedInUserId, "Ranking", monthYearDocId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("Ranking: Document data fetched:", data);

        // โค้ดที่นี่ปรับให้ตรงกับโครงสร้างใหม่: ผู้เล่นเป็น Field ตรงๆ ใน Document
        const playersData = Object.keys(data)
        .filter(key => key !== "lastUpdatedMonth")
        .map(playerName => ({
          name: playerName,
          level: data[playerName].level || "", 
          score: data[playerName].score || 0,
          wins: data[playerName].wins || 0,
          losses: data[playerName].losses || 0,
          totalGames: data[playerName].totalGames || 0,
          totalBalls: data[playerName].totalBalls || 0,
        }));

        // เรียงลำดับ Ranking
        // ตรวจสอบให้แน่ใจว่า score เป็นตัวเลขก่อนลบกัน
        playersData.sort((a, b) => (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0)); // เรียงตามคะแนนจากมากไปน้อย

        setRankings(playersData);
        console.log("Ranking: Rankings set:", playersData);
      } else {
        console.log(`Ranking: No data found for month/year: ${monthYearDocId}`);
        Swal.fire({
          icon: "info",
          title: "ไม่พบข้อมูล",
          text: `ไม่พบข้อมูล Ranking สำหรับเดือน ${parseInt(selectedMonth)} ปี ${selectedYear}`,
          confirmButtonText: "ตกลง",
        });
        setRankings([]); // เคลียร์ Ranking
      }
      setLoading(false); // หยุดโหลดเมื่อดึงข้อมูลเสร็จ
    } catch (err) {
      console.error("Ranking: Error fetching rankings:", err);
      setError("ไม่สามารถโหลดข้อมูล Ranking ได้: " + err.message);
      setLoading(false); // หยุดโหลดเมื่อมีข้อผิดพลาด
    }
  }, [selectedMonth, selectedYear, loggedInUserId]); // เพิ่ม loggedInUserId เป็น dependency

  // Effect ที่จะรันเมื่อ loggedInUserId พร้อมใช้งาน
  useEffect(() => {
    if (loggedInUserId) {
      getAvailableMonthsAndYears();
    } else {
        // ถ้าผู้ใช้ไม่ได้ล็อกอิน, ให้เคลียร์ข้อมูลและตั้งค่า loading เป็น false
        setRankings([]);
        setAvailableMonths([]);
        setAvailableYears([]);
        setSelectedMonth("");
        setSelectedYear("");
        setLoading(false);
    }
  }, [loggedInUserId, getAvailableMonthsAndYears]); // เพิ่ม loggedInUserId เป็น dependency

  // Effect ที่จะรันเมื่อ selectedMonth, selectedYear หรือ loggedInUserId เปลี่ยนไป
  useEffect(() => {
    if (selectedMonth && selectedYear && loggedInUserId) {
      fetchRankings();
    } else if (loggedInUserId) {
        // ถ้าผู้ใช้ล็อกอินแล้ว แต่ยังไม่มีเดือน/ปีที่เลือก (เช่น โหลดครั้งแรก)
        // หรือเดือน/ปีที่เลือกไม่ถูกต้อง ให้เคลียร์ rankings
        setRankings([]);
        setLoading(false); // หยุดโหลด
    }
  }, [selectedMonth, selectedYear, loggedInUserId, fetchRankings]); // เพิ่ม loggedInUserId เป็น dependency

  // ฟังก์ชันสำหรับเลือกเดือน/ปี
  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
  };

  const getMedal = (rank) => {
    if (rank === 1) return <FaTrophy className="gold-medal medal-icon" />;
    if (rank === 2) return <FaTrophy className="silver-medal medal-icon" />;
    if (rank === 3) return <FaTrophy className="bronze-medal medal-icon" />;
    return null;
  };

  // การแสดงผลเมื่อมีข้อผิดพลาด
  if (error) {
    return (
      <div className="ranking-container">
        <Head>
          <title>Ranking - PBTH</title>
        </Head>
        <h1 className="ranking-title">อันดับผู้เล่น</h1>
        <p className="error-message">Error: {error}</p>
        <div className="back-button-container">
          <button onClick={() => router.back()} className="back-button">
            กลับ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ranking-container">
      <Head>
        <title>Ranking - PBTH</title>
      </Head>
      <h1 className="ranking-title">อันดับผู้เล่น</h1>

      <div className="selectors-container">
        <select value={selectedMonth} onChange={handleMonthChange} className="month-select">
          <option value="">เลือกเดือน</option>
          {availableMonths.map((month) => (
            <option key={month} value={month}>
              เดือน {parseInt(month)}
            </option>
          ))}
        </select>
        <select value={selectedYear} onChange={handleYearChange} className="year-select">
          <option value="">เลือกปี</option>
          {availableYears.map((year) => (
            <option key={year} value={year}>
              ปี {year}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading-spinner"></div>
      ) : rankings.length > 0 ? (
        <div className="ranking-table-container">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>อันดับ</th>
                <th>ผู้เล่น</th>
                <th>ระดับ</th>
                <th>คะแนน</th>
                <th>ชนะ</th>
                <th>รวมเกม</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((player, index) => (
                <tr
                  key={player.name}
                  className={
                    index === 0 ? "gold-row"
                    : index === 1 ? "silver-row"
                    : index === 2 ? "bronze-row"
                    : ""
                  }
                >
                  <td className="rank-number">
                    {index + 1} {getMedal(index + 1)}
                  </td>
                  <td style={{ textAlign: "left", fontWeight: "bold" }}>{player.name}</td>
                  <td>{player.level || "-"}</td>
                  <td className="score-cell">{player.score || 0}</td>
                  <td>{player.wins || 0}</td>
                  <td>{player.totalGames || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-data-message">
          {!loggedInUserId ? (
            "โปรดเข้าสู่ระบบเพื่อดูข้อมูลอันดับ"
          ) : (selectedMonth && selectedYear ? 
            `ไม่พบข้อมูล Ranking สำหรับเดือน ${parseInt(selectedMonth)} ปี ${selectedYear}` :
            "กรุณาเลือกเดือนและปีเพื่อดูข้อมูล Ranking"
          )}
        </p>
      )}

      <div className="back-button-container">
        <button onClick={() => router.back()} className="back-button">
          กลับ
        </button>
      </div>

      <style jsx>{`
        .ranking-container {
          max-width: 750px; /* ลดขนาดตารางโดยรวม */
          margin: 40px auto;
          padding: 30px;
          background-color: #f8f9fa; /* light-gray background */
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
        }

        .ranking-title {
          text-align: center;
          color: #1a202c; /* dark-blue-gray */
          margin-bottom: 30px;
          font-size: 2.5em;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .gold-row {
          background-color: #fffde7; /* สีเหลืองอ่อน */
        }

        .silver-row {
          background-color: #f0f0f0; /* สีเทาอ่อน */
        }

        .bronze-row {
          background-color: #fff3e0; /* สีส้มอ่อน */
        }

        .selectors-container {
          text-align: center;
          margin-bottom: 30px;
          display: flex;
          justify-content: center;
          gap: 15px;
        }

        .month-select,
        .year-select {
          padding: 10px 15px;
          border: 1px solid #ccc;
          border-radius: 8px;
          font-size: 1em;
          cursor: pointer;
          background-color: #fff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          outline: none;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }

        .month-select:hover,
        .year-select:hover {
          border-color: #888;
        }

        .month-select:focus,
        .year-select:focus {
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
        }

        .loading-spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: 50px auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .no-data-message,
        .error-message {
          text-align: center;
          color: #666;
          font-size: 1.1em;
          padding: 20px;
          background-color: #ffe0b2; /* light orange for info */
          border: 1px solid #ffcc80;
          border-radius: 8px;
          margin-top: 20px;
        }

        .ranking-table th,
        .ranking-table td {
          text-align: center;
        }

        .ranking-table td:nth-child(2),
        .ranking-table th:nth-child(2) {
          text-align: left;
          padding-left: 16px;
        }

        .ranking-table-container {
          overflow-x: auto;
          margin-top: 20px;
          border-radius: 8px; /* เพิ่ม border-radius ให้กับ container */
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .ranking-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 600px; /* ปรับขนาด min-width ตามความเหมาะสม */
        }

        .ranking-table thead {
          background-color: #4a5568; /* gray-700 */
          color: #fff;
        }

        .ranking-table th {
          padding: 12px 8px; /* ลด padding */
          text-align: left;
          font-weight: 600;
          font-size: 0.95em; /* ลด font-size */
          border-bottom: 1px solid #64748b; /* gray-600 */
        }

        .ranking-table td {
          padding: 10px 8px; /* ลด padding */
          border-bottom: 1px solid #e5e7eb; /* gray-200 */
          font-size: 0.9em; /* ลด font-size */
        }

        .ranking-table tbody tr:nth-child(even) {
          background-color: #f9fafb; /* gray-50 for even rows */
        }

        .ranking-table tbody tr:nth-child(odd) {
          background-color: #fff; /* white for odd rows */
        }

        .rank-number {
          font-weight: 500;
          color: #1f2937; /* gray-900 */
          text-align: center; /* จัดให้อยู่ตรงกลาง */
          width: 80px; /* กำหนดความกว้าง */
        }

        .score-cell { /* Class ใหม่สำหรับคะแนน */
            font-weight: bold; /* ทำให้คะแนนเด่นขึ้น */
            color: #28a745; /* สีเขียวเข้ม */
            font-size: 1.1em; /* เพิ่มขนาดตัวอักษร */
            text-align: center; /* จัดให้อยู่ตรงกลาง */
            width: 100px; /* กำหนดความกว้าง */
        }

        .ranking-table th:nth-child(3), /* คะแนน */
        .ranking-table td:nth-child(3),
        .ranking-table th:nth-child(4), /* ชนะ */
        .ranking-table td:nth-child(4),
        .ranking-table th:nth-child(5), /* แพ้ */
        .ranking-table td:nth-child(5),
        .ranking-table th:nth-child(6), /* รวมเกม */
        .ranking-table td:nth-child(6),
        .ranking-table th:nth-child(7), /* รวมลูก */
        .ranking-table td:nth-child(7) {
            text-align: center; /* จัดคอลัมน์ตัวเลขให้อยู่ตรงกลาง */
            width: 80px; /* กำหนดความกว้าง */
        }
        
        .ranking-table th:nth-child(2), /* ผู้เล่น */
        .ranking-table td:nth-child(2) {
            width: 150px; /* กำหนดความกว้างสำหรับชื่อผู้เล่น */
        }


        .medal-icon {
          margin-left: 0.5rem;
        }
        .gold-medal { color: #fcd34d; } /* yellow-500 */
        .silver-medal { color: #9ca3af; } /* gray-400 */
        .bronze-medal { color: #d97706; } /* amber-600 */

        .back-button-container {
          margin-top: 2rem;
          text-align: center;
        }

        .back-button {
          padding: 0.625rem 1.5rem;
          background-color: #4b5563; /* gray-600 */
          color: #fff;
          font-weight: 600;
          border-radius: 0.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border: none;
          cursor: pointer;
          transition: background-color 0.3s ease, box-shadow 0.3s ease;
        }

        .back-button:hover {
          background-color: #2d3748; /* gray-800 */
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
};

export default Ranking;

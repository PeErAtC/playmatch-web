// pages/Ranking.js
import React, { useState, useEffect, useCallback } from "react";
import { db, auth } from "../lib/firebaseConfig"; // ตรวจสอบเส้นทางนี้ให้ถูกต้อง
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Swal from "sweetalert2";
import Head from "next/head";
import { useRouter } from "next/router";
import { FaTrophy, FaCalendarAlt, FaCrown } from "react-icons/fa";

const Ranking = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [error, setError] = useState(null);
  // FIX: แก้ไขบรรทัดนี้ให้ถูกต้องโดยใช้ useState(null) เพื่อแก้ TypeError
  const [loggedInUserId, setLoggedInUserId] = useState(null);

  const router = useRouter();

  // --- Authentication State Listener ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLoggedInUserId(user.uid);
        console.log("Ranking: User logged in with UID:", user.uid);
        setLoading(true); // Set loading true when user state changes to logged in
      } else {
        setLoggedInUserId(null);
        // Clear data when user logs out
        setRankings([]);
        setAvailableMonths([]);
        setAvailableYears([]);
        setSelectedMonth("");
        setSelectedYear("");
        setLoading(false);
        console.log("Ranking: No user logged in.");
        Swal.fire({
          icon: "info",
          title: "คุณยังไม่ได้เข้าสู่ระบบ",
          text: "โปรดเข้าสู่ระบบเพื่อดูข้อมูลอันดับผู้เล่น",
          confirmButtonText: "ตกลง",
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Function to fetch available months and years from Firebase ---
  const getAvailableMonthsAndYears = useCallback(async () => {
    if (!loggedInUserId) {
      return;
    }
    setLoading(true); // Start loading before fetching
    setError(null); // Clear previous errors
    try {
      console.log(
        "Ranking: Attempting to fetch available months and years from Document IDs for user:",
        loggedInUserId
      );

      const userRankingCollectionRef = collection(
        db,
        "users",
        loggedInUserId,
        "Ranking"
      );
      const snapshot = await getDocs(userRankingCollectionRef);

      const uniqueMonths = new Set();
      const uniqueYears = new Set();
      const parsedDocIds = [];

      snapshot.forEach((doc) => {
        const docId = doc.id;
        const parts = docId.split("-");

        if (parts.length === 2) {
          const month = parts[0];
          const year = parts[1];

          if (
            month.length === 2 &&
            !isNaN(parseInt(month)) &&
            year.length === 4 &&
            !isNaN(parseInt(year))
          ) {
            uniqueMonths.add(month);
            uniqueYears.add(year);
            parsedDocIds.push({ month, year, docId });
          } else {
            console.warn(
              `Ranking: Invalid Document ID format found (not MM-YYYY): "${docId}"`
            );
          }
        } else {
          console.warn(
            `Ranking: Invalid Document ID format found (incorrect parts count): "${docId}"`
          );
        }
      });

      const sortedYears = Array.from(uniqueYears).sort(
        (a, b) => parseInt(b) - parseInt(a)
      );
      const sortedMonths = Array.from(uniqueMonths).sort(
        (a, b) => parseInt(b) - parseInt(a)
      );

      setAvailableYears(sortedYears);
      setAvailableMonths(sortedMonths);

      const currentMonth = (new Date().getMonth() + 1)
        .toString()
        .padStart(2, "0");
      const currentYear = new Date().getFullYear().toString();

      let initialMonth = "";
      let initialYear = "";

      if (parsedDocIds.length > 0) {
        const currentMonthYearDoc = parsedDocIds.find(
          (item) => item.month === currentMonth && item.year === currentYear
        );

        if (currentMonthYearDoc) {
          initialMonth = currentMonth;
          initialYear = currentYear;
        } else {
          const latestYear = sortedYears.length > 0 ? sortedYears[0] : "";
          if (latestYear) {
            const monthsInLatestYear = parsedDocIds
              .filter((item) => item.year === latestYear)
              .map((item) => item.month)
              .sort((a, b) => parseInt(b) - parseInt(a));

            initialYear = latestYear;
            initialMonth =
              monthsInLatestYear.length > 0 ? monthsInLatestYear[0] : "";
          }
        }
      }

      console.log(
        "Ranking: Initial selection set to: Year=",
        initialYear,
        ", Month=",
        initialMonth
      );

      setSelectedYear(initialYear);
      setSelectedMonth(initialMonth);
    } catch (err) {
      console.error(
        "Ranking: Critical Error fetching available months and years:",
        err
      );
      setError("ไม่สามารถโหลดเดือนและปีที่มีข้อมูลได้: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [loggedInUserId]);

  // --- Function to fetch rankings for the selected month/year ---
  const fetchRankings = useCallback(async () => {
    if (!selectedMonth || !selectedYear || !loggedInUserId) {
      setRankings([]);
      setLoading(false);
      console.log(
        "Ranking: No month, year, or user selected/logged in, Ranking will be empty."
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const monthYearDocId = `${selectedMonth}-${selectedYear}`;
      console.log(
        `Ranking: Attempting to fetch rankings for Document ID: ${monthYearDocId} under user ${loggedInUserId}`
      );

      const docRef = doc(
        db,
        "users",
        loggedInUserId,
        "Ranking",
        monthYearDocId
      );
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("Ranking: Document data fetched:", data);

        const playersData = Object.keys(data)
          .filter((key) => key !== "lastUpdatedMonth")
          .map((playerName) => ({
            name: playerName,
            level: data[playerName].level || "",
            score: data[playerName].score || 0,
            wins: data[playerName].wins || 0,
            totalGames: data[playerName].totalGames || 0,
          }));

        playersData.sort(
          (a, b) => (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0)
        );

        setRankings(playersData);
        console.log("Ranking: Rankings set:", playersData);
      } else {
        console.log(`Ranking: No data found for month/year: ${monthYearDocId}`);
        setRankings([]);
      }
      setLoading(false);
    } catch (err) {
      console.error("Ranking: Error fetching rankings:", err);
      setError("ไม่สามารถโหลดข้อมูล Ranking ได้: " + err.message);
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, loggedInUserId]);

  // --- useEffect to trigger fetching available months/years when user logs in ---
  useEffect(() => {
    if (loggedInUserId) {
      getAvailableMonthsAndYears();
    } else {
      setRankings([]);
      setAvailableMonths([]);
      setAvailableYears([]);
      setSelectedMonth("");
      setSelectedYear("");
    }
  }, [loggedInUserId, getAvailableMonthsAndYears]);

  // --- useEffect to trigger fetching rankings when month/year/user changes ---
  useEffect(() => {
    if (selectedMonth && selectedYear && loggedInUserId) {
      fetchRankings();
    } else if (loggedInUserId && (!selectedMonth || !selectedYear)) {
      setRankings([]);
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, loggedInUserId, fetchRankings]);

  // --- Handlers for dropdown changes ---
  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
  };

  // --- Helper for displaying full month name (Thai) ---
  const getMonthName = (monthNum) => {
    const monthNames = {
      "01": "มกราคม",
      "02": "กุมภาพันธ์",
      "03": "มีนาคม",
      "04": "เมษายน",
      "05": "พฤษภาคม",
      "06": "มิถุนายน",
      "07": "กรกฎาคม",
      "08": "สิงหาคม",
      "09": "กันยายน",
      "10": "ตุลาคม",
      "11": "พฤศจิกายน",
      "12": "ธันวาคม",
    };
    return monthNames[monthNum] || `เดือน ${parseInt(monthNum)}`;
  };

  const top3Rankings = rankings.slice(0, 3);
  const otherRankings = rankings.slice(3);

  return (
    <div className="main-content">
      <Head>
        <title>Ranking - PBTH</title>
      </Head>

      {/* --- Dedicated Background Pattern Div --- */}
      <div className="background-pattern"></div>

      <div className="ranking-container">
        {/* --- Ranking Hero Section & Filters --- */}
        <div className="ranking-hero-section">
          <h1 className="ranking-page-title">
            <FaTrophy className="title-icon" /> อันดับผู้เล่นยอดเยี่ยม
          </h1>
          <p className="ranking-subtitle">
            ประจำเดือน{" "}
            <span className="highlight-text">
              {selectedMonth ? getMonthName(selectedMonth) : "..."}
            </span>{" "}
            ปี{" "}
            <span className="highlight-text">
              {selectedYear ? `พ.ศ. ${parseInt(selectedYear) + 543}` : "..."}
            </span>
          </p>

          <div className="filter-controls">
            <div className="filter-item">
              <label htmlFor="month-select" className="sr-only">
                เลือกเดือน
              </label>
              <FaCalendarAlt className="filter-icon" />
              <select
                id="month-select"
                value={selectedMonth}
                onChange={handleMonthChange}
                className="month-select-new"
                aria-label="Select Ranking Month"
              >
                <option value="">เลือกเดือน</option>
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {getMonthName(month)}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-item">
              <label htmlFor="year-select" className="sr-only">
                เลือกปี
              </label>
              <FaCalendarAlt className="filter-icon" />
              <select
                id="year-select"
                value={selectedYear}
                onChange={handleYearChange}
                className="year-select-new"
                aria-label="Select Ranking Year"
              >
                <option value="">เลือกปี</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    ปี {parseInt(year) + 543}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* --- Conditional Rendering based on Loading/Error/Data --- */}
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>กำลังโหลดข้อมูลอันดับ...</p>
          </div>
        ) : error ? (
          <div className="message-box error-box">
            <p>เกิดข้อผิดพลาด: {error}</p>
          </div>
        ) : rankings.length > 0 ? (
          <>
            {/* --- Top 3 Rankings Section (ADJUSTED DESIGN) --- */}
            <div className="top3-cards-wrapper">
              {top3Rankings.map((player, index) => (
                <div key={player.name} className={`player-card rank-${index + 1}`}>
                  <div className="player-rank-circle">
                    <span className="rank-text">
                        {index + 1}
                        {index === 0 && <FaCrown className="crown-icon" />} {/* มงกุฎสำหรับอันดับ 1 */}
                    </span>
                  </div>
                  <h3 className="player-card-name">{player.name}</h3>
                  <p className="player-card-level">Level: {player.level}</p>
                  <div className="score-detail">
                    <p className="score-label">คะแนน</p>
                    <p className="player-card-score">{player.score || 0}</p>
                  </div>
                  <div className="stats-row">
                    <div className="stat-item">
                      <p className="stat-value">{player.wins || 0}</p>
                      <p className="stat-label">ชนะ</p>
                    </div>
                    <div className="stat-item">
                      <p className="stat-value">{player.totalGames || 0}</p>
                      <p className="stat-label">รวมเกม</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* --- Other Rankings Table --- */}
            {otherRankings.length > 0 && (
              <div className="ranking-table-wrapper">
                <table className="ranking-table">
                  <thead>
                    <tr>
                      <th className="table-header-rank">ลำดับ</th>
                      <th className="table-header-player">ผู้เล่น</th>
                      <th className="table-header-level">Level</th>
                      <th className="table-header-total-games">รวมเกม</th>
                      <th className="table-header-wins">ชนะ</th>
                      <th className="table-header-score">คะแนน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherRankings.map((player, index) => (
                      <tr key={player.name}>
                        <td className="rank-cell">
                          <span className="rank-number-table">
                            {index + 4}
                          </span>
                        </td>
                        <td className="player-name-cell-table">
                          {player.name}
                        </td>
                        <td className="level-cell-table">{player.level || '-'}</td>
                        <td className="total-games-cell-table">
                          {player.totalGames || 0}
                        </td>
                        <td className="wins-cell-table">{player.wins || 0}</td>
                        <td className="score-cell-table">
                          <span className="score-badge">
                            {player.score || 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          // --- No data or not logged in message ---
          <div className="message-box info-box">
            {!loggedInUserId ? (
              <p>โปรดเข้าสู่ระบบเพื่อดูข้อมูลอันดับผู้เล่น</p>
            ) : selectedMonth && selectedYear ? (
              <p>
                ไม่พบข้อมูล Ranking สำหรับเดือน{" "}
                {getMonthName(selectedMonth)} ปี{" "}
                {parseInt(selectedYear) + 543}
              </p>
            ) : (
              <p>กรุณาเลือกเดือนและปีเพื่อดูข้อมูล Ranking</p>
            )}
          </div>
        )}
      </div>

      {/* --- Global Styles for Ranking Page --- */}
      <style jsx>{`
        /* --- General Layout and Reset --- */
        .main-content {
          padding: 10px;
          background-color: #f0f2f5; /* Background color for the page */
          min-height: calc(100vh - 56px);
          display: flex;
          justify-content: center;
          align-items: flex-start;
          box-sizing: border-box;
          font-family: "Kanit", sans-serif;
          color: #333;
          position: relative; /* Essential for containing other positioned elements if needed */
          overflow: hidden; /* Prevent content from overflowing */
        }

        /* --- Dedicated Background Pattern Div --- */
        .background-pattern {
          position: fixed; /* Fix to viewport */
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: 
            url('/images/firework-light.png'), 
            url('/images/trophy-light.png'), 
            url('/images/necklace-light.png');
          background-repeat: no-repeat;
          background-size: 
            200px auto, 
            120px auto, 
            100px auto;
          background-position: 
            20% 10%, 
            80% 50%, 
            50% 85%;
          background-attachment: fixed;
          opacity: 0.04; /* ลดความจางลงอย่างมาก */
          filter: grayscale(100%) brightness(150%); /* ทำให้เป็นขาวดำและสว่างมากเพื่อให้จางสุดๆ */
          transition: background-position 1s ease-in-out;
          animation: background-pan 60s linear infinite alternate;
          z-index: -1; /* สำคัญมาก! ทำให้พื้นหลังอยู่ด้านหลังเนื้อหา */
        }

        /* Keyframes for background panning */
        @keyframes background-pan {
          0% {
            background-position: 20% 10%, 80% 50%, 50% 85%;
          }
          25% {
            background-position: 15% 20%, 85% 40%, 40% 90%;
          }
          50% {
            background-position: 25% 0%, 75% 60%, 60% 80%;
          }
          75% {
            background-position: 30% 15%, 70% 45%, 55% 95%;
          }
          100% {
            background-position: 20% 10%, 80% 50%, 50% 85%;
          }
        }

        /* --- Main Ranking Container --- */
        .ranking-container {
          background-color: transparent; /* ยังคง transparent เพื่อให้เห็นพื้นหลัง */
          border-radius: 0;
          padding: 0;
          max-width: 780px;
          width: 95%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 25px;
          z-index: 1; /* ตรวจสอบให้แน่ใจว่าเนื้อหาอยู่ข้างหน้าพื้นหลัง */
          position: relative; /* สำคัญสำหรับ z-index */
        }

        /* --- Ranking Hero Section & Filters (Minimal as before) --- */
        .ranking-hero-section {
          text-align: center;
          margin-bottom: 0;
          background: none;
          padding: 10px 0;
          border-radius: 0;
          box-shadow: none;
          position: relative;
          overflow: hidden;
        }

        .ranking-page-title {
          font-size: 2em;
          font-weight: 800;
          color: #2c3e50;
          margin-bottom: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
        }

        .ranking-page-title .title-icon {
          font-size: 0.75em;
          color: #ffc107;
          filter: drop-shadow(0 0 4px rgba(255, 193, 7, 0.4));
        }

        .ranking-subtitle {
          font-size: 1em;
          color: #555;
          margin-bottom: 15px;
          font-weight: 400;
        }

        .highlight-text {
          font-weight: 700;
          color: #007bff;
        }

        .filter-controls {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .filter-item {
          display: flex;
          align-items: center;
          background-color: #ffffff;
          border-radius: 20px;
          padding: 7px 15px;
          border: 1px solid #dee2e6;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .filter-item:hover {
          border-color: #0056b3;
          box-shadow: 0 3px 10px rgba(0, 123, 255, 0.1);
          transform: translateY(-1px);
        }

        .filter-icon {
          color: #007bff;
          margin-right: 8px;
          font-size: 1em;
        }

        .month-select-new,
        .year-select-new {
          padding: 3px 0;
          border: none;
          background-color: transparent;
          font-size: 0.9em;
          color: #333;
          outline: none;
          cursor: pointer;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          min-width: 80px;
          text-align: center;
          /* Custom arrow for select */
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23007bff'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3Csvg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          padding-right: 25px;
        }
        /* Hide default arrow in IE/Edge */
        .month-select-new::-ms-expand,
        .year-select-new::-ms-expand {
          display: none;
        }


        /* --- Loading and Messages --- */
        .loading-state,
        .message-box {
          text-align: center;
          padding: 15px;
          border-radius: 10px;
          font-size: 1em;
          font-weight: 500;
          margin: 10px auto;
          max-width: 500px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .loading-state {
          background-color: #e0f7fa;
          color: #007bb6;
          border: 1px solid #80deea;
        }

        .message-box {
          color: #666;
          border: 1px solid #ccc;
          background-color: #fefefe;
        }

        .info-box {
          background-color: #e3f2fd;
          color: #2196f3;
          border-color: #90caf9;
        }

        .error-box {
          background-color: #ffebee;
          color: #ef5350;
          border-color: #ef9a9a;
        }

        .loading-spinner {
          border: 3px solid #e0e0e0;
          border-top: 3px solid #42a5f5;
          width: 25px;
          height: 25px;
          margin: 0 auto 8px auto;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* --- Top 3 Cards Section (ADJUSTED DESIGN) --- */
        .top3-cards-wrapper {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 25px;
          perspective: 1000px;
        }

        .player-card {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
          padding: 20px 15px 15px;
          text-align: center;
          width: 240px;
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: transform 0.4s ease-out, box-shadow 0.4s ease-out, background 0.4s ease-out;
          position: relative;
          overflow: hidden;
          transform-style: preserve-3d;
          animation: card-lift-in 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          opacity: 0;
          border: 1px solid transparent;
        }

        /* Animation for card appearance */
        @keyframes card-lift-in {
          0% {
            opacity: 0;
            transform: translateY(30px) rotateX(-5deg) scale(0.97);
            box-shadow: 0 0 0 rgba(0,0,0,0);
          }
          100% {
            opacity: 1;
            transform: translateY(0) rotateX(0deg) scale(1);
            box-shadow: var(--card-shadow-final);
          }
        }

        /* Delay for each card */
        .player-card.rank-1 { animation-delay: 0.1s; }
        .player-card.rank-2 { animation-delay: 0.2s; }
        .player-card.rank-3 { animation-delay: 0.3s; }

        .player-card::before {
          content: '';
          position: absolute;
          top: -5%;
          left: -5%;
          width: 110%;
          height: 110%;
          background: var(--card-background-gradient);
          clip-path: polygon(0 0, 100% 0, 100% 88%, 0 100%);
          opacity: 0.6;
          z-index: 1;
          transition: clip-path 0.4s ease-out;
        }

        .player-card:hover::before {
          clip-path: polygon(0 0, 100% 0, 100% 92%, 0 100%);
        }

        .player-card::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: var(--card-accent-color);
          z-index: 2;
        }

        .player-card:hover {
          transform: translateY(-4px) scale(1.005);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        /* Specific card colors and properties */
        .player-card.rank-1 {
          --card-background-gradient: linear-gradient(135deg, #ffd700, #ffc107);
          --card-accent-color: #e0a800;
          --card-shadow-final: 0 6px 20px rgba(255, 193, 7, 0.15);
          color: #5a4000;
          border-color: #e0a800;
        }
        .player-card.rank-2 {
          --card-background-gradient: linear-gradient(135deg, #c0c0c0, #a0a0a0);
          --card-accent-color: #8c8c8c;
          --card-shadow-final: 0 6px 20px rgba(192, 192, 192, 0.15);
          color: #3a3a3a;
          border-color: #8c8c8c;
        }
        .player-card.rank-3 {
          --card-background-gradient: linear-gradient(135deg, #cd7f32, #b86b29);
          --card-accent-color: #a35d21;
          --card-shadow-final: 0 6px 20px rgba(205, 127, 50, 0.15);
          color: #6d3f18;
          border-color: #a35d21;
        }

        .player-rank-circle {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 2.5em; /* ขนาดตัวเลขอันดับ */
          font-weight: 900;
          color: #ffffff;
          margin-bottom: 12px;
          margin-top: 3px;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
          z-index: 2;
          position: relative;
          background: var(--card-accent-color);
          animation: rank-circle-pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          transform: scale(0);
        }

        @keyframes rank-circle-pop {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.03); opacity: 1; }
          100% { transform: scale(1); }
        }

        .player-card.rank-1 .player-rank-circle { animation-delay: 0.3s; }
        .player-card.rank-2 .player-rank-circle { animation-delay: 0.4s; }
        .player-card.rank-3 .player-rank-circle { animation-delay: 0.5s; }

        .rank-text {
            position: relative; /* สำคัญ: ทำให้ child elements สามารถใช้ absolute position ได้ */
            display: flex; /* ใช้ flex เพื่อจัดให้ตัวเลขอยู่กึ่งกลาง */
            justify-content: center;
            align-items: center;
            height: 100%; /* ให้ span สูงเต็ม circle */
            width: 100%; /* ให้ span กว้างเต็ม circle */
            z-index: 1; /* ให้ตัวเลขอยู่หน้ามงกุฎ (ถ้ามงกุฎอยู่หลัง) */
            line-height: 1; /* **สำคัญ**: ทำให้เนื้อหาภายในกระชับขึ้น */
        }

        /* Crown Icon Styling */
        .crown-icon {
            position: absolute;
            top: -0.7em; /* **ปรับใหม่**: ลองค่านี้เพื่อให้มงกุฎอยู่เหนือเลข 1 */
            left: 50%;
            transform: translateX(-50%); /* **เอา rotate ออก**: เพื่อให้จัดตำแหน่งตรงกลางได้ง่ายขึ้น */
            color: gold; /* Gold color for the crown */
            font-size: 0.8em; /* **ปรับใหม่**: ขนาดของมงกุฎให้เล็กกว่าเลข 1 อีกนิด */
            filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.3)); /* Shadow for depth */
            z-index: 2; /* ทำให้มงกุฎอยู่เหนือเลข */
            animation: crown-bounce 1s infinite alternate ease-in-out; /* Little bounce animation */
        }

        @keyframes crown-bounce {
            0% { transform: translateX(-50%) translateY(0); }
            50% { transform: translateX(-50%) translateY(-3px); }
            100% { transform: translateX(-50%) translateY(0); }
        }


        .player-card-name {
          font-size: 1.6em;
          font-weight: 700;
          margin-bottom: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
          color: var(--card-text-color, #2c3e50);
          z-index: 2;
        }

        .player-card.rank-1 .player-card-name { color: #8a6d01; }
        .player-card.rank-2 .player-card-name { color: #555; }
        .player-card.rank-3 .player-card-name { color: #8c4c1a; }

        .player-card-level {
          font-size: 0.9em;
          color: #777;
          margin-bottom: 10px;
          z-index: 2;
        }

        .score-detail {
          margin-top: 8px;
          margin-bottom: 12px;
          z-index: 2;
        }

        .score-label {
          font-size: 0.85em;
          color: #888;
          margin-bottom: 2px;
          font-weight: 500;
        }

        .player-card-score {
          font-size: 2em;
          font-weight: 800;
          color: #28a745;
          background: #e6ffed;
          padding: 6px 18px;
          border-radius: 25px;
          min-width: 90px;
          box-shadow: 0 2px 10px rgba(40, 167, 69, 0.15);
          display: inline-block;
          transition: transform 0.3s ease;
        }

        .player-card-score:hover {
            transform: scale(1.02);
        }

        .stats-row {
          display: flex;
          justify-content: space-around;
          width: 100%;
          margin-top: 10px;
          z-index: 2;
        }

        .stat-item {
          flex: 1;
          text-align: center;
          padding: 0 6px;
          border-left: 1px solid rgba(0, 0, 0, 0.05);
        }

        .stat-item:first-child {
          border-left: none;
        }

        .stat-value {
          font-size: 1.1em;
          font-weight: 700;
          color: #34495e;
          margin-bottom: 2px;
        }

        .stat-label {
          font-size: 0.75em;
          color: #777;
        }


        /* --- Other Rankings Table --- */
        .ranking-table-wrapper {
          overflow-x: auto;
          border-radius: 8px;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.06);
          background-color: #ffffff;
          border: 1px solid #e9ecef;
        }

        .ranking-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 600px;
        }

        .ranking-table thead {
          background: linear-gradient(
            to right,
            #6a11cb, /* สีม่วงเข้ม */
            #20e3b2  /* สีเขียวมิ้นต์ */
          );
          color: #ffffff;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }

        .ranking-table th {
          padding: 12px 10px;
          text-align: center;
          font-weight: 600;
          font-size: 0.95em;
          letter-spacing: 0.7px;
          text-transform: uppercase;
          border-bottom: 1px solid rgba(0,0,0,0.1);
        }

        .ranking-table th:first-child {
          border-top-left-radius: 8px;
        }
        .ranking-table th:last-child {
          border-top-right-radius: 8px;
        }

        /* Specific header alignment and width adjustments */
        .table-header-rank {
          width: 60px;
        }
        .table-header-player {
          width: 160px;
        }
        .table-header-level {
          width: 80px;
        }
        .table-header-total-games {
          width: 80px;
        }
        .table-header-wins {
          width: 60px;
        }
        .table-header-score {
          width: 80px;
        }

        .ranking-table td {
          padding: 10px 10px;
          border-bottom: 1px solid #f1f3f5;
          font-size: 0.88em;
          color: #495057;
          text-align: center;
          vertical-align: middle;
          position: relative;
          transition: background-color 0.2s ease;
        }

        /* Add subtle horizontal lines between cells */
        .ranking-table td:not(:last-child)::after {
          content: '';
          position: absolute;
          right: 0;
          top: 15%;
          height: 70%;
          width: 1px;
          background-color: #e0e0e0;
        }

        .ranking-table tbody tr {
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          border-radius: 6px;
          margin-bottom: 5px;
          display: table-row;
        }

        .ranking-table tbody tr:nth-child(odd) {
          background-color: #ffffff;
        }

        .ranking-table tbody tr:nth-child(even) {
          background-color: #f8f9fa;
        }

        .ranking-table tbody tr:hover {
          background-color: #eaf6ff;
          cursor: pointer;
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(0, 123, 255, 0.1);
          transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        }

        /* Table Cell Specific Styles */
        .rank-cell .rank-number-table {
          font-weight: 600;
          color: #34495e;
          background-color: #e9ecef;
          padding: 4px 10px;
          border-radius: 16px;
          display: inline-block;
          min-width: 30px;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        .player-name-cell-table {
          text-align: left !important;
          font-weight: 600;
          color: #2c3e50;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .level-cell-table {
            font-weight: 500;
            color: #555;
        }
        .total-games-cell-table,
        .wins-cell-table {
          color: #6c757d;
          font-weight: 500;
        }
        .score-cell-table {
          text-align: center;
        }
        .score-cell-table .score-badge {
          background: linear-gradient(45deg, #28a745, #218838);
          color: #fff;
          padding: 6px 14px;
          border-radius: 20px;
          min-width: 60px;
          box-shadow: 0 2px 8px rgba(40, 167, 69, 0.2);
          font-size: 0.95em;
          font-weight: 700;
          text-align: center;
          display: inline-block;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .score-cell-table .score-badge:hover {
          transform: translateY(-1px) scale(1.05);
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        }

        /* --- Responsive Adjustments --- */
        @media (max-width: 768px) {
          .main-content {
            padding: 8px;
          }
          .background-pattern {
            background-size: 
              150px auto, 
              100px auto, 
              80px auto;
            background-position: 
              10% 5%, 
              90% 40%, 
              30% 90%;
          }
          .ranking-container {
            gap: 18px;
            max-width: 100%;
          }
          .ranking-page-title {
            font-size: 1.8em;
            gap: 6px;
          }
          .ranking-subtitle {
            font-size: 0.9em;
            margin-bottom: 12px;
          }
          .filter-controls {
            gap: 8px;
          }
          .filter-item {
            padding: 5px 12px;
          }
          .filter-icon {
            font-size: 0.9em;
            margin-right: 6px;
          }
          .month-select-new,
          .year-select-new {
            font-size: 0.9em;
            min-width: 80px;
          }
          .loading-state,
          .message-box {
            font-size: 0.9em;
            padding: 12px;
          }
          .top3-cards-wrapper {
            gap: 12px;
          }
          .player-card {
            width: 100%;
            max-width: 220px;
            padding: 18px 12px 12px;
          }
          .player-rank-circle {
            width: 55px;
            height: 55px;
            font-size: 2.3em;
            margin-top: 3px;
          }
          .player-card-name {
            font-size: 1.5em;
          }
          .player-card-level {
            font-size: 0.85em;
          }
          .score-label {
            font-size: 0.8em;
          }
          .player-card-score {
            font-size: 1.8em;
            padding: 6px 16px;
          }
          .stat-value {
            font-size: 1em;
          }
          .stat-label {
            font-size: 0.7em;
          }
          .ranking-table th,
          .ranking-table td {
            font-size: 0.8em;
            padding: 7px 7px;
          }
          .ranking-table {
            min-width: 500px;
          }
          .score-cell-table .score-badge {
            font-size: 0.8em;
            padding: 4px 10px;
            min-width: 50px;
          }
           .crown-icon {
            font-size: 1em; /* ปรับขนาดมงกุฎสำหรับ Responsive */
            top: -0.7em; /* ปรับตำแหน่งมงกุฎสำหรับ Responsive */
          }
        }

        @media (max-width: 480px) {
          .main-content {
            padding: 5px;
          }
          .background-pattern {
            background-size: 
              120px auto, 
              80px auto, 
              60px auto;
            background-position: 
              5% 15%, 
              95% 60%, 
              20% 75%;
          }
          .ranking-container {
            gap: 12px;
          }
          .ranking-page-title {
            font-size: 1.5em;
            gap: 4px;
          }
          .ranking-page-title .title-icon {
            font-size: 0.65em;
          }
          .ranking-subtitle {
            font-size: 0.85em;
            margin-bottom: 8px;
          }
          .filter-controls {
            flex-direction: column;
            gap: 6px;
          }
          .filter-item {
            width: 100%;
            justify-content: space-between;
            padding: 4px 10px;
          }
          .month-select-new,
          .year-select-new {
            font-size: 0.8em;
            min-width: 70px;
          }
          .loading-state,
          .message-box {
            font-size: 0.85em;
            padding: 8px;
          }
          .top3-cards-wrapper {
            gap: 8px;
          }
          .player-card {
            width: 100%;
            max-width: 200px;
            padding: 15px 10px 10px;
          }
          .player-rank-circle {
            width: 45px;
            height: 45px;
            font-size: 2em;
            margin-top: 2px;
            margin-bottom: 8px;
          }
          .player-card-name {
            font-size: 1.3em;
            margin-bottom: 4px;
          }
          .player-card-level {
            font-size: 0.75em;
            margin-bottom: 6px;
          }
          .score-detail {
            margin-top: 6px;
            margin-bottom: 8px;
          }
          .player-card-score {
            font-size: 1.5em;
            padding: 5px 12px;
          }
          .stat-value {
            font-size: 0.9em;
          }
          .stat-label {
            font-size: 0.65em;
          }
          .ranking-table {
            min-width: 400px;
          }
          .ranking-table th,
          .ranking-table td {
            font-size: 0.7em;
            padding: 5px 5px;
          }
          .rank-cell .rank-number-table {
            padding: 2px 6px;
            min-width: 20px;
          }
          .score-cell-table .score-badge {
            font-size: 0.75em;
            padding: 3px 8px;
            min-width: 45px;
          }
          .crown-icon {
            font-size: 0.8em; /* ปรับขนาดมงกุฎสำหรับ Responsive */
            top: -0.6em; /* ปรับตำแหน่งมงกุฎสำหรับ Responsive */
          }
        }
      `}</style>
    </div>
  );
};

export default Ranking;

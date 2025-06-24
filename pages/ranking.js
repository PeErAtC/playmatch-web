// pages/Ranking.js
import React, { useState, useEffect, useCallback } from "react";
import { db, auth } from "../lib/firebaseConfig";
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
import { FaTrophy, FaCalendarAlt } from "react-icons/fa"; // Removed FaChartBar

const Ranking = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [loggedInUserId, setLoggedInUserId] = useState(null);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLoggedInUserId(user.uid);
        console.log("Ranking: User logged in with UID:", user.uid);
        setLoading(true);
      } else {
        setLoggedInUserId(null);
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

  const getAvailableMonthsAndYears = useCallback(async () => {
    if (!loggedInUserId) {
      return;
    }
    setLoading(true);
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

      console.log("Ranking: Available Years (sorted):", sortedYears);
      console.log("Ranking: Available Months (sorted):", sortedMonths);
      console.log("Ranking: Available Document IDs parsed:", parsedDocIds);

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

      setLoading(false);
    } catch (err) {
      console.error(
        "Ranking: Critical Error fetching available months and years:",
        err
      );
      setError("ไม่สามารถโหลดเดือนและปีที่มีข้อมูลได้: " + err.message);
      setLoading(false);
    }
  }, [loggedInUserId]);

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

        // Sort by score in descending order
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

  useEffect(() => {
    if (loggedInUserId) {
      getAvailableMonthsAndYears();
    } else {
      setRankings([]);
      setAvailableMonths([]);
      setAvailableYears([]);
      setSelectedMonth("");
      setSelectedYear("");
      setLoading(false);
    }
  }, [loggedInUserId, getAvailableMonthsAndYears]);

  useEffect(() => {
    if (selectedMonth && selectedYear && loggedInUserId) {
      fetchRankings();
    } else if (loggedInUserId) {
      setRankings([]);
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, loggedInUserId, fetchRankings]);

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
  };

  // Helper for displaying full month name (Thai)
  const getMonthName = (monthNum) => {
    const monthNames = {
      "01": "มกราคม", "02": "กุมภาพันธ์", "03": "มีนาคม",
      "04": "เมษายน", "05": "พฤษภาคม", "06": "มิถุนายน",
      "07": "กรกฎาคม", "08": "สิงหาคม", "09": "กันยายน",
      "10": "ตุลาคม", "11": "พฤศจิกายน", "12": "ธันวาคม",
    };
    return monthNames[monthNum] || `เดือน ${parseInt(monthNum)}`;
  };

  // Separate top 3 and others
  const top3Rankings = rankings.slice(0, 3);
  const otherRankings = rankings.slice(3);

  return (
    <div className="main-content">
      <Head>
        <title>Ranking - PBTH</title>
      </Head>

      <div className="ranking-container"> {/* Changed class name */}
        <h1 className="ranking-header-title">อันดับผู้เล่น</h1> {/* Removed icons */}

        <div className="selectors-group">
          <div className="selector-item">
            <FaCalendarAlt className="selector-icon" />
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className="month-select"
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
          <div className="selector-item">
            <FaCalendarAlt className="selector-icon" />
            <select
              value={selectedYear}
              onChange={handleYearChange}
              className="year-select"
              aria-label="Select Ranking Year"
            >
              <option value="">เลือกปี</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  ปี {year}
                </option>
              ))}
            </select>
          </div>
        </div>

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
            {/* Top 3 Rankings Section */}
            <div className="top3-cards-wrapper">
              {top3Rankings.map((player, index) => (
                <div key={player.name} className={`player-card rank-${index + 1}`}>
                  <div className="trophy-icon-container">
                    <FaTrophy className={`trophy-icon ${index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze'}`} />
                  </div>
                  <div className="player-rank-circle">
                    {index + 1}
                  </div>
                  <h3 className="player-card-name">{player.name}</h3>
                  <p className="player-card-score-label">คะแนน</p>
                  <p className="player-card-score">{player.score || 0}</p>
                </div>
              ))}
            </div>

            {/* Other Rankings Table */}
            {otherRankings.length > 0 && (
              <div className="ranking-table-wrapper">
                <table className="ranking-table">
                  <thead>
                    <tr>
                      <th className="table-header-rank">ลำดับ</th>
                      <th className="table-header-player">ผู้เล่น</th>
                      <th className="table-header-total-games">รวมเกม</th>
                      <th className="table-header-wins">ชนะ</th>
                      <th className="table-header-score">คะแนน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherRankings.map((player, index) => (
                      <tr key={player.name}>
                        <td className="rank-cell">
                          <span className="rank-number-table">{index + 4}</span>
                        </td>
                        <td className="player-name-cell-table">{player.name}</td>
                        <td className="total-games-cell-table">{player.totalGames || 0}</td>
                        <td className="wins-cell-table">{player.wins || 0}</td>
                        <td className="score-cell-table">
                          <span className="score-badge">{player.score || 0}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="message-box info-box">
            {!loggedInUserId ? (
              <p>โปรดเข้าสู่ระบบเพื่อดูข้อมูลอันดับผู้เล่น</p>
            ) : selectedMonth && selectedYear ? (
              <p>
                ไม่พบข้อมูล Ranking สำหรับเดือน {getMonthName(selectedMonth)} ปี{" "}
                {selectedYear}
              </p>
            ) : (
              <p>กรุณาเลือกเดือนและปีเพื่อดูข้อมูล Ranking</p>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        /* --- General Layout and Reset --- */
        .main-content {
          padding: 30px;
          background-color: #f7f7f7; /* Lighter, modern background */
          min-height: calc(100vh - 56px);
          display: flex;
          justify-content: center;
          align-items: flex-start;
          box-sizing: border-box;
          font-family: "Kanit", sans-serif;
        }

        /* --- Main Ranking Container (No white border/shadow) --- */
        .ranking-container {
          background-color: transparent; /* Make background transparent */
          border-radius: 16px;
          /* box-shadow: none; */ /* Ensure no main box-shadow */
          padding: 0; /* Remove padding from main container, let inner elements handle it */
          max-width: 1000px;
          width: 95%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        /* --- Header --- */
        .ranking-header-title {
          text-align: center;
          color: #2c3e50;
          margin-bottom: 20px; /* Space below title */
          font-size: 3em; /* Larger, more impactful title */
          font-weight: 700;
          letter-spacing: 1.5px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }

        /* --- Selectors --- */
        .selectors-group {
          display: flex;
          justify-content: center;
          gap: 25px;
          margin-bottom: 40px; /* More space before Top 3 cards */
          flex-wrap: wrap;
          padding: 20px; /* Padding for the selector group itself */
          background-color: #ffffff; /* White background for selector box */
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); /* Soft shadow for selector box */
        }

        .selector-item {
          display: flex;
          align-items: center;
          background-color: #f7f9fc; /* Very light blue for selector items */
          border-radius: 10px;
          padding: 8px 15px;
          border: 1px solid #e0e5ea;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.03);
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .selector-item:hover {
            border-color: #a7d9ff;
            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05), 0 0 5px rgba(167, 217, 255, 0.5);
        }

        .selector-icon {
          color: #555;
          margin-right: 10px;
          font-size: 1.2em; /* Slightly larger icon */
        }

        .month-select,
        .year-select {
          padding: 8px 10px;
          border: none;
          background-color: transparent;
          font-size: 1.05em; /* Slightly larger font */
          color: #333;
          outline: none;
          cursor: pointer;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
        }

        .month-select:hover,
        .year-select:hover {
          color: #007bff;
        }

        /* --- Loading and Messages --- */
        .loading-state,
        .message-box {
          text-align: center;
          padding: 30px;
          border-radius: 12px;
          font-size: 1.2em;
          font-weight: 500;
          margin: 20px auto; /* Centered */
          max-width: 600px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        }

        .loading-state {
          background-color: #e0f7fa; /* Light cyan */
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
          border: 5px solid #e0e0e0;
          border-top: 5px solid #42a5f5; /* A vibrant blue */
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 15px auto;
        }

        /* --- Top 3 Cards Section --- */
        .top3-cards-wrapper {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 30px; /* More space between cards */
          margin-bottom: 50px; /* Generous space before the table */
        }

        .player-card {
          background-color: #ffffff;
          border-radius: 20px; /* More rounded */
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1); /* Deeper shadow */
          padding: 35px 25px 25px; /* Adjust padding for trophy space */
          text-align: center;
          width: 260px; /* Slightly smaller fixed width */
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          position: relative;
          overflow: hidden; /* Ensure elements inside stay within bounds */
        }

        .player-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.2);
        }

        /* Specific card background/border colors for flair */
        .player-card.rank-1 {
            background: linear-gradient(135deg, #FFEFBA, #FFD700); /* Gold gradient */
            border: 2px solid #FFD700;
            color: #4B4B4B;
        }
        .player-card.rank-2 {
            background: linear-gradient(135deg, #E0E0E0, #C0C0C0); /* Silver gradient */
            border: 2px solid #C0C0C0;
            color: #4B4B4B;
        }
        .player-card.rank-3 {
            background: linear-gradient(135deg, #FFCC80, #CD7F32); /* Bronze gradient */
            border: 2px solid #CD7F32;
            color: #4B4B4B;
        }

        .player-card.rank-1 .player-card-name, .player-card.rank-1 .player-card-score-label {
            color: #8B4513; /* Darker brown for gold card text */
        }
        .player-card.rank-2 .player-card-name, .player-card.rank-2 .player-card-score-label {
            color: #333;
        }
        .player-card.rank-3 .player-card-name, .player-card.rank-3 .player-card-score-label {
            color: #6C3F1B;
        }


        .trophy-icon-container {
          position: absolute;
          top: -25px; /* Adjust to place trophy above card */
          font-size: 4em; /* Very large trophy */
          line-height: 1;
          z-index: 10;
        }

        .trophy-icon.gold { color: #FFD700; text-shadow: 2px 2px 5px rgba(255, 215, 0, 0.5); }
        .trophy-icon.silver { color: #C0C0C0; text-shadow: 2px 2px 5px rgba(192, 192, 192, 0.5); }
        .trophy-icon.bronze { color: #CD7F32; text-shadow: 2px 2px 5px rgba(205, 127, 50, 0.5); }

        .player-rank-circle {
          width: 80px; /* Size of the circle */
          height: 80px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 3em; /* Size of the number */
          font-weight: 900; /* Very bold */
          color: #ffffff; /* White number */
          margin-bottom: 15px;
          margin-top: 25px; /* Space for the trophy */
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
          text-shadow: 1px 1px 3px rgba(0,0,0,0.3);
          animation: pulse 1.5s infinite ease-in-out; /* Add subtle animation */
        }

        .player-card.rank-1 .player-rank-circle { background-color: #FFD700; /* Gold */ }
        .player-card.rank-2 .player-rank-circle { background-color: #C0C0C0; /* Silver */ }
        .player-card.rank-3 .player-rank-circle { background-color: #CD7F32; /* Bronze */ }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }

        .player-card-name {
          font-size: 1.8em; /* Larger name */
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .player-card-score-label {
            font-size: 0.9em;
            color: #666;
            margin-bottom: 5px;
        }

        .player-card-score {
          font-size: 2em; /* Very large score */
          font-weight: 800;
          color: #28a745; /* Green for score */
          background-color: #e6ffe6;
          padding: 8px 20px;
          border-radius: 30px; /* More rounded pill */
          min-width: 80px;
          box-shadow: 0 3px 8px rgba(40, 167, 69, 0.25);
          margin-top: 10px;
        }

        /* --- Other Rankings Table --- */
        .ranking-table-wrapper {
          overflow-x: auto;
          border-radius: 15px; /* More rounded table */
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
          background-color: #ffffff; /* White background for table wrapper */
        }

        .ranking-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 650px; /* Adjusted minimum width for table */
        }

        .ranking-table thead {
          background: linear-gradient(to right, #34495e, #5d758d); /* Darker, richer gradient */
          color: #ffffff;
        }

        .ranking-table th {
          padding: 18px 15px; /* More generous padding */
          text-align: center;
          font-weight: 600;
          font-size: 1.05em;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          border-bottom: 2px solid #2c3e50;
        }

        .ranking-table th:first-child { border-top-left-radius: 15px; }
        .ranking-table th:last-child { border-top-right-radius: 15px; }

        /* Specific header alignment and width adjustments */
        .table-header-rank { text-align: center; width: 80px; }
        .table-header-player { text-align: left; width: 250px; }
        .table-header-total-games { text-align: center; width: 120px; }
        .table-header-wins { text-align: center; width: 100px; }
        .table-header-score { text-align: center; width: 120px; }

        .ranking-table td {
          padding: 15px 15px; /* Consistent padding */
          border-bottom: 1px solid #e0e6ed; /* Softer border */
          font-size: 1em;
          color: #444;
          text-align: center;
        }

        .ranking-table tbody tr:nth-child(odd) {
          background-color: #fcfcfc;
        }

        .ranking-table tbody tr:nth-child(even) {
          background-color: #f5f9fc; /* Light blue-gray for even rows */
        }

        .ranking-table tbody tr:hover {
          background-color: #eef7ff; /* Lighter blue on hover */
          cursor: pointer;
        }

        /* Table Cell Specific Styles */
        .rank-cell .rank-number-table {
            font-weight: bold;
            color: #555;
            background-color: #e0e6ed; /* Match table background */
            padding: 5px 12px;
            border-radius: 15px; /* More rounded */
            display: inline-block; /* For padding and background */
            min-width: 30px;
        }
        .player-name-cell-table {
            text-align: left !important;
            font-weight: bold;
            color: #333;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .total-games-cell-table,
        .wins-cell-table {
            color: #666;
            font-weight: 500;
        }
        .score-cell-table {
            text-align: center;
        }
        .score-cell-table .score-badge {
            background-color: #4CAF50; /* Slightly different green */
            color: #fff;
            padding: 7px 15px;
            border-radius: 25px;
            min-width: 65px;
            box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
            font-size: 1.05em;
            text-align: center;
            display: inline-block;
        }


        /* --- Responsive Adjustments --- */
        @media (max-width: 768px) {
          .main-content {
            padding: 20px;
          }
          .ranking-container {
            padding: 0; /* Keep main container padding 0 */
            width: 100%;
          }
          .ranking-header-title {
            font-size: 2.2em;
          }
          .selectors-group {
            flex-direction: column;
            gap: 15px;
            padding: 15px;
            margin-bottom: 30px;
          }
          .selector-item {
            width: 100%;
            justify-content: center;
          }
          .top3-cards-wrapper {
            flex-direction: column;
            align-items: center;
            gap: 25px; /* Reduced gap when stacked */
          }
          .player-card {
            width: 90%;
            max-width: 280px;
            padding: 30px 20px 20px;
          }
          .player-rank-circle {
              width: 70px;
              height: 70px;
              font-size: 2.5em;
          }
          .trophy-icon-container {
              font-size: 3.5em;
          }
          .player-card-name {
            font-size: 1.6em;
          }
          .player-card-score {
            font-size: 1.8em;
          }
          .ranking-table th,
          .ranking-table td {
            font-size: 0.85em;
            padding: 10px 8px;
          }
          .ranking-table {
            min-width: 500px;
          }
        }

        @media (max-width: 480px) {
          .ranking-container {
            padding: 0;
          }
          .ranking-header-title {
            font-size: 1.8em;
          }
          .loading-state,
          .message-box {
            font-size: 1em;
            padding: 15px;
          }
          .top3-cards-wrapper {
              gap: 20px;
          }
          .player-card {
              width: 100%;
              max-width: 260px;
              padding: 25px 15px 15px;
          }
          .player-rank-circle {
              width: 60px;
              height: 60px;
              font-size: 2.2em;
          }
          .trophy-icon-container {
              font-size: 3em;
          }
          .player-card-name {
            font-size: 1.4em;
          }
          .player-card-score {
            font-size: 1.6em;
          }
          .ranking-table {
            min-width: 380px;
          }
          .table-header-rank, .rank-cell .rank-number-table { width: 60px; }
          .table-header-player, .player-name-cell-table { width: 180px; }
          .table-header-total-games, .total-games-cell-table { width: 90px; }
          .table-header-wins, .wins-cell-table { width: 80px; }
          .table-header-score, .score-cell-table { width: 90px; }
        }
      `}</style>
    </div>
  );
};

export default Ranking;

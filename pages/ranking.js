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
import { FaTrophy, FaCrown, FaSearch } from "react-icons/fa"; // นำ FaCalendarAlt ออก

const Ranking = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [error, setError] = useState(null);
  const [loggedInUserId, setLoggedInUserId] = useState(null);

  // --- State for Pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(17); 

  // --- State for Search ---
  const [searchTerm, setSearchTerm] = useState("");

  const router = useRouter();

  // --- Authentication State Listener ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLoggedInUserId(user.uid);
        console.log("Ranking: User logged in with UID:", user.uid);
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
          .map((playerName) => {
            const wins = data[playerName].wins || 0;
            const totalGames = data[playerName].totalGames || 0;
            const score = data[playerName].score || 0;

            let draws = 0;
            if (score >= wins * 2) {
              draws = score - wins * 2;
            }

            let losses = Math.max(0, totalGames - wins - draws);

            const winRate =
              totalGames > 0 ? ((wins / totalGames) * 100).toFixed(2) : "0.00";

            return {
              name: playerName,
              level: data[playerName].level || "",
              score: score,
              wins: wins,
              draws: draws,
              losses: losses,
              totalGames: totalGames,
              winRate: parseFloat(winRate),
            };
          });

        playersData.sort(
          (a, b) => (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0)
        );

        setRankings(playersData);
        setCurrentPage(1); // Reset to first page on new data fetch
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

  // --- Filtering rankings based on search term ---
  const filteredRankings = rankings.filter(
    (player) =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const top3Rankings = filteredRankings.slice(0, 3);
  const otherRankings = filteredRankings.slice(3); // Other rankings start after top 3

  // --- Pagination Logic for otherRankings ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOtherRankings = otherRankings.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const totalPages = Math.ceil(otherRankings.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // --- Effect to adjust hero section padding based on table padding ---
  useEffect(() => {
    const adjustHeroSectionPadding = () => {
      const rankingContainer = document.querySelector('.ranking-container');
      const rankingHeroSection = document.querySelector('.ranking-hero-section');
      const rankingTableWrapper = document.querySelector('.ranking-table-wrapper');

      if (rankingContainer && rankingHeroSection && rankingTableWrapper) {
        // Add a class to indicate table exists, useful for CSS targeting if needed
        rankingContainer.classList.add('table-exists');

        // Get computed padding of the table wrapper
        const computedStyle = window.getComputedStyle(rankingTableWrapper);
        const tablePaddingLeft = computedStyle.getPropertyValue('padding-left');
        const tablePaddingRight = computedStyle.getPropertyValue('padding-right');
        const tableBorderLeft = computedStyle.getPropertyValue('border-left-width');
        const tableBorderRight = computedStyle.getPropertyValue('border-right-width');

        // Apply these paddings/borders to the hero section
        rankingHeroSection.style.paddingLeft = `calc(${tablePaddingLeft} + ${tableBorderLeft})`;
        rankingHeroSection.style.paddingRight = `calc(${tablePaddingRight} + ${tableBorderRight})`;

        // You might need to adjust margin-left/right if the table wrapper has margins
        // For simplicity, we assume rankingContainer directly controls max-width and table is inside it.
      } else if (rankingContainer && rankingHeroSection) {
         // If table doesn't exist, reset to a default padding or match container's natural padding
         rankingContainer.classList.remove('table-exists');
         rankingHeroSection.style.paddingLeft = '20px'; // Default padding
         rankingHeroSection.style.paddingRight = '20px'; // Default padding
      }
    };

    // Run on mount and window resize
    adjustHeroSectionPadding();
    window.addEventListener('resize', adjustHeroSectionPadding);
    return () => window.removeEventListener('resize', adjustHeroSectionPadding);
  }, [rankings, selectedMonth, selectedYear]); // Re-run if rankings change (table might appear/disappear)


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
              {/* <FaCalendarAlt className="filter-icon" /> // Removed Icon */}
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
              {/* <FaCalendarAlt className="filter-icon" /> // Removed Icon */}
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
            {/* --- Top 3 Rankings Section --- */}
            <div className="top3-cards-wrapper">
              {top3Rankings.map((player, index) => (
                <div
                  key={player.name}
                  className={`player-card rank-${index + 1}`}
                >
                  <div className="player-rank-circle">
                    <span className="rank-text">
                      {index + 1}
                      {index === 0 && (
                        <FaCrown className="crown-icon" />
                      )}{" "}
                      {/* มงกุฎสำหรับอันดับ 1 */}
                    </span>
                  </div>
                  <h3 className="player-card-name">{player.name}</h3>
                  <p className="player-card-level">Level: {player.level}</p>
                  <div className="score-detail">
                    <p className="player-card-score">{player.score || 0}</p>
                  </div>
                  <div className="stats-row">
                    <div className="stat-item">
                      <p className="stat-value wins-value">
                        {player.wins || 0}
                      </p>
                      <p className="stat-label">ชนะ</p>
                    </div>
                    <div className="stat-item">
                      <p className="stat-value draws-value">
                        {player.draws || 0}
                      </p>
                      <p className="stat-label">เสมอ</p>
                    </div>
                    <div className="stat-item">
                      <p className="stat-value losses-value">
                        {player.losses || 0}
                      </p>
                      <p className="stat-label">แพ้</p>
                    </div>
                    <div className="stat-item">
                      <p className="stat-value">{player.totalGames || 0}</p>
                      <p className="stat-label">รวม</p>
                    </div>
                    <div className="stat-item">
                      <p className="stat-value">
                        {player.winRate || "0.00"}%
                      </p>
                      <p className="stat-label">อัตราชนะ</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* --- Other Rankings Table Controls (Search, Pagination, Total) --- */}
            {otherRankings.length > 0 && (
              <div className="table-controls-wrapper">
                {/* Pagination Controls - Left */}
                {totalPages > 1 && (
                    <div className="pagination">
                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className="pagination-button"
                        aria-label="Previous Page"
                      >
                        ย้อนกลับ
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => paginate(i + 1)}
                          className={`pagination-button ${
                            currentPage === i + 1 ? "active" : ""
                          }`}
                          aria-label={`Page ${i + 1}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className="pagination-button"
                        aria-label="Next Page"
                      >
                        ถัดไป
                      </button>
                    </div>
                  )}

                {/* Search Bar - Center */}
                <div className="search-bar">
                  <FaSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="ค้นหารายชื่อผู้เล่น..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1); // Reset to first page on search
                    }}
                    className="search-input"
                    aria-label="Search Player Name"
                  />
                </div>

                {/* Total Members - Right */}
                <div className="total-members">
                    สมาชิกทั้งหมด:{" "}
                    <span className="total-count">{filteredRankings.length}</span> คน
                </div>
              </div>
            )}

            {/* --- Other Rankings Table --- */}
            {currentOtherRankings.length > 0 ? (
              <div className="ranking-table-wrapper">
                <table className="ranking-table">
                  <thead>
                    <tr>
                      <th className="table-header-rank">ลำดับ</th>
                      <th className="table-header-player">ผู้เล่น</th>
                      <th className="table-header-level">Level</th>
                      <th className="table-header-wins">ชนะ</th>
                      <th className="table-header-draws">เสมอ</th>
                      <th className="table-header-losses">แพ้</th>
                      <th className="table-header-total-games">รวม</th>
                      <th className="table-header-win-rate">อัตราชนะ%</th>
                      <th className="table-header-score">คะแนน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentOtherRankings.map((player, index) => (
                      <tr key={player.name}>
                        <td className="rank-cell">
                          <span className="rank-number-table">
                            {indexOfFirstItem + index + 1 + 3}{" "}
                            {/* Adjust rank for top 3 offset */}
                          </span>
                        </td>
                        <td className="player-name-cell-table">
                          {player.name}
                        </td>
                        <td className="level-cell-table">
                          {player.level || "-"}
                        </td>
                        <td className="wins-cell-table">
                          <span className="wins-badge">
                            {player.wins || 0}
                          </span>
                        </td>
                        <td className="draws-cell-table">
                          <span className="draws-badge">
                            {player.draws || 0}
                          </span>
                        </td>
                        <td className="losses-cell-table">
                          <span className="losses-badge">
                            {player.losses || 0}
                          </span>
                        </td>
                        <td className="total-games-cell-table">
                          {player.totalGames || 0}
                        </td>
                        <td className="win-rate-cell-table">
                          <span className="win-rate-badge">
                            {player.winRate || "0.00"}%
                          </span>
                        </td>
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
            ) : (
              <div className="message-box info-box">
                <p>ไม่พบผู้เล่นที่ตรงกับคำค้นหาของคุณ</p>
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
          padding: 8px;
          background-color: #f0f2f5;
          min-height: calc(100vh - 56px);
          display: flex;
          justify-content: center;
          align-items: flex-start;
          box-sizing: border-box;
          font-family: "Kanit", sans-serif;
          color: #333;
          position: relative;
          overflow: hidden;
          font-size: 0.85em; /* ลดขนาดฟอนต์เริ่มต้นลงอีกนิด */
        }

        /* --- Dedicated Background Pattern Div --- */
        .background-pattern {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: url("/images/firework-light.png"),
            url("/images/trophy-light.png"),
            url("/images/necklace-light.png");
          background-repeat: no-repeat;
          background-size: 200px auto, 120px auto, 100px auto;
          background-position: 20% 10%, 80% 50%, 50% 85%;
          background-attachment: fixed;
          opacity: 0.03;
          filter: grayscale(100%) brightness(180%) blur(0.5px);
          transition: background-position 1s ease-in-out;
          animation: background-pan 60s linear infinite alternate;
          z-index: -1;
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

        /* --- Main Ranking Container (Outer Wrapper) --- */
        .ranking-container {
          background-color: transparent; /* Keep transparent */
          border-radius: 0; /* Keep 0 */
          padding: 0; /* Keep 0 */
          width: 100%; /* Make it fill parent width */
          max-width: 1200px; /* Adjust max-width as needed */
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 1;
          position: relative;
        }

        /* --- Ranking Hero Section & Filters (NEW STYLES - GOLD THEME) --- */
        .ranking-hero-section {
          text-align: center;
          margin-bottom: 15px; /* Increased margin for separation */
          padding: 25px 20px; /* Increased padding - will be overridden by JS */
          border-radius: 12px; /* Nicer rounded corners */
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15); /* More prominent shadow */
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #ff7e5f, #feb47b, #ffda7f);
          color: #5a4000; /* Dark gold text for contrast */
          width: 100%; /* Make it fill parent width */
          box-sizing: border-box; /* Include padding in width */
          /* Initial padding here, will be adjusted by JS based on table padding */
          padding-left: 20px;
          padding-right: 20px;
        }

        .ranking-hero-section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('/images/gold-pattern-light.svg'); /* Subtle gold pattern */
            background-size: cover;
            opacity: 0.15; /* Slightly more visible */
            z-index: -1;
        }

        .ranking-page-title {
          font-size: 2.2em; /* Larger title */
          font-weight: 800;
          color: #5a4000; /* Dark gold text */
          margin-bottom: 8px; /* Adjusted margin */
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px; /* Increased gap */
          text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2); /* Stronger text shadow */
        }

        .ranking-page-title .title-icon {
          font-size: 0.8em; /* Larger icon */
          color: #fff3cd; /* Lighter gold for trophy */
          filter: drop-shadow(0 0 8px rgba(255, 243, 205, 0.8)); /* Stronger glow */
        }

        .ranking-subtitle {
          font-size: 1.1em; /* Larger subtitle */
          color: #75601c; /* Slightly lighter dark gold */
          margin-bottom: 20px; /* Increased margin */
          font-weight: 400;
          text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.15);
        }

        .highlight-text {
          font-weight: 700;
          color: #fffacd; /* Even lighter gold */
        }

        .filter-controls {
          display: flex;
          justify-content: center;
          gap: 12px; /* Increased gap */
          flex-wrap: wrap;
        }

        .filter-item {
          display: flex;
          align-items: center;
          background-color: rgba(255, 255, 255, 0.8); /* Solid white background */
          border-radius: 20px; /* More rounded */
          padding: 8px 15px; /* Increased padding */
          border: 1px solid rgba(255, 255, 255, 0.9); /* Lighter border */
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* Subtle shadow */
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .filter-item:hover {
          background-color: rgba(255, 255, 255, 0.9);
          border-color: rgba(255, 255, 255, 1);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          transform: translateY(-2px);
        }

        /* .filter-icon { REMOVED } */

        .month-select-new,
        .year-select-new {
          padding: 2px 0;
          border: none;
          background-color: transparent;
          font-size: 0.9em; /* Larger font */
          color: #5a4000; /* Dark gold text */
          outline: none;
          cursor: pointer;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          min-width: 100px; /* Increased min-width */
          text-align: center;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%235A4000'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3Csvg%3E"); /* Dark gold arrow */
          background-repeat: no-repeat;
          background-position: right 8px center; /* Adjusted arrow position */
          padding-right: 25px; /* Increased padding */
          font-weight: 600;
        }
        .month-select-new::-ms-expand,
        .year-select-new::-ms-expand {
          display: none;
        }
        .month-select-new option,
        .year-select-new option {
            color: #333; /* Make dropdown options readable */
            background-color: #f8f9fa;
        }


        /* --- Loading and Messages --- */
        .loading-state,
        .message-box {
          text-align: center;
          padding: 8px; /* ลด padding */
          border-radius: 5px; /* ลด border-radius */
          font-size: 0.8em; /* ลดขนาดฟอนต์ */
          font-weight: 500;
          margin: 5px auto; /* ลด margin */
          max-width: 380px; /* ลด max-width */
          box-shadow: 0 1px 5px rgba(0, 0, 0, 0.03); /* ลด shadow */
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
          border: 2px solid #e0e0e0;
          border-top: 2px solid #42a5f5;
          width: 16px; /* ลดขนาด spinner */
          height: 16px; /* ลดขนาด spinner */
          margin: 0 auto 4px auto; /* ลด margin */
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        /* --- Top 3 Cards Section --- */
        .top3-cards-wrapper {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px; /* ลด gap ระหว่าง card */
          margin-bottom: 10px; /* ลด margin */
          perspective: 1000px;
        }

        .player-card {
          background: #ffffff;
          border-radius: 6px; /* ลด border-radius */
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05); /* ลด shadow */
          padding: 8px 8px 6px; /* ลด padding ด้านบน/ล่าง ลงอีก */
          text-align: center;
          width: 180px; /* ลดความกว้างของแต่ละ card อีก */
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: transform 0.4s ease-out, box-shadow 0.4s ease-out,
            background 0.4s ease-out;
          position: relative;
          overflow: hidden;
          transform-style: preserve-3d;
          animation: card-lift-in 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)
            forwards;
          opacity: 0;
          border: 1px solid transparent;
        }

        /* Animation for card appearance */
        @keyframes card-lift-in {
          0% {
            opacity: 0;
            transform: translateY(12px) rotateX(-5deg) scale(0.88); /* ลด scale */
            box-shadow: 0 0 0 rgba(0, 0, 0, 0);
          }
          100% {
            opacity: 1;
            transform: translateY(0) rotateX(0deg) scale(1);
            box-shadow: var(--card-shadow-final);
          }
        }

        /* Delay for each card */
        .player-card.rank-1 {
          animation-delay: 0.1s;
        }
        .player-card.rank-2 {
          animation-delay: 0.2s;
        }
        .player-card.rank-3 {
          animation-delay: 0.3s;
        }

        .player-card::before {
          content: "";
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
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: var(--card-accent-color);
          z-index: 2;
        }

        .player-card:hover {
          transform: translateY(-2px) scale(1.005);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        /* Specific card colors and properties */
        .player-card.rank-1 {
          --card-background-gradient: linear-gradient(135deg, #ffd700, #ffc107);
          --card-accent-color: #e0a800;
          --card-shadow-final: 0 3px 10px rgba(255, 193, 7, 0.12);
          color: #5a4000;
          border-color: #e0a800;
        }
        .player-card.rank-2 {
          --card-background-gradient: linear-gradient(135deg, #c0c0c0, #a0a0a0);
          --card-accent-color: #8c8c8c;
          --card-shadow-final: 0 3px 10px rgba(192, 192, 192, 0.12);
          color: #3a3a3a;
          border-color: #8c8c8c;
        }
        .player-card.rank-3 {
          --card-background-gradient: linear-gradient(135deg, #cd7f32, #b86b29);
          --card-accent-color: #a35d21;
          --card-shadow-final: 0 3px 10px rgba(205, 127, 50, 0.12);
          color: #6d3f18;
          border-color: #a35d21;
        }

        .player-rank-circle {
          width: 35px; /* ลดขนาด */
          height: 35px; /* ลดขนาด */
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 1.4em; /* ลดขนาดตัวเลขอันดับ */
          font-weight: 900;
          color: #ffffff;
          margin-bottom: 6px; /* ลด margin */
          margin-top: 0px; /* ลด margin */
          box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1); /* ลด shadow */
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
          z-index: 2;
          position: relative;
          background: var(--card-accent-color);
          animation: rank-circle-pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)
            forwards;
          transform: scale(0);
        }

        @keyframes rank-circle-pop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          70% {
            transform: scale(1.03);
            opacity: 1;
          }
          100% {
            transform: scale(1);
          }
        }

        .player-card.rank-1 .player-rank-circle {
          animation-delay: 0.3s;
        }
        .player-card.rank-2 .player-rank-circle {
          animation-delay: 0.4s;
        }
        .player-card.rank-3 .player-rank-circle {
          animation-delay: 0.5s;
        }

        .rank-text {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          width: 100%;
          z-index: 1;
          line-height: 1;
        }

        /* Crown Icon Styling */
        .crown-icon {
          position: absolute;
          top: -0.4em; /* ปรับตำแหน่ง */
          left: 50%;
          transform: translateX(-50%);
          color: gold;
          font-size: 0.55em; /* ลดขนาด */
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2)); /* ลด shadow */
          z-index: 2;
          animation: crown-bounce 1s infinite alternate ease-in-out;
        }

        @keyframes crown-bounce {
          0% {
            transform: translateX(-50%) translateY(0);
          }
          50% {
            transform: translateX(-50%) translateY(-1px);
          }
          100% {
            transform: translateX(-50%) translateY(0);
          }
        }

        .player-card-name {
          font-size: 1.2em; /* ลดขนาดฟอนต์ */
          font-weight: 700;
          margin-bottom: 2px; /* ลด margin */
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
          color: var(--card-text-color, #2c3e50);
          z-index: 2;
        }

        .player-card.rank-1 .player-card-name {
          color:rgb(210, 168, 14);
        }
        .player-card.rank-2 .player-card-name {
          color: #555;
        }
        .player-card.rank-3 .player-card-name {
          color: #8c4c1a;
        }

        .player-card-level {
          font-size: 0.7em; /* ลดขนาดฟอนต์ */
          color: #777;
          margin-bottom: 4px; /* ลด margin */
          z-index: 2;
        }

        .score-detail {
          margin-top: 3px; /* ลด margin */
          margin-bottom: 6px; /* ลด margin */
          z-index: 2;
        }

        .player-card-score {
          font-size: 1.4em; /* ลดขนาดฟอนต์ */
          font-weight: 800;
          color: #28a745;
          background: #e6ffed;
          padding: 3px 10px; /* ลด padding */
          border-radius: 16px; /* ลด border-radius */
          min-width: 60px; /* ลด min-width */
          box-shadow: 0 1px 5px rgba(40, 167, 69, 0.08); /* ลด shadow */
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
          margin-top: 5px; /* ลด margin */
          z-index: 2;
        }

        .stat-item {
          flex: 1;
          text-align: center;
          padding: 0 3px; /* ลด padding */
          border-left: 1px solid rgba(0, 0, 0, 0.05);
        }

        .stat-item:first-child {
          border-left: none;
        }

        .stat-value {
          font-size: 0.85em; /* ลดขนาดฟอนต์ */
          font-weight: 700;
          color: #34495e;
          margin-bottom: 0px;
        }

        /* Top 3 Card specific stat value colors */
        .stat-value.wins-value {
          color: #28a745;
        }
        .stat-value.draws-value {
          color: #6c757d;
        }
        .stat-value.losses-value {
          color: #dc3545;
        }

        .stat-label {
          font-size: 0.6em; /* ลดขนาดฟอนต์ */
          color: #777;
        }

        /* --- Other Rankings Table Controls (Search, Pagination, Total) --- */
        .table-controls-wrapper {
            display: flex;
            flex-direction: row; /* ให้จัดเรียงเป็นแถวเสมอ */
            justify-content: space-between; /* กระจายองค์ประกอบ */
            align-items: center;
            gap: 10px; /* ปรับ gap ระหว่าง องค์ประกอบหลัก */
            margin-bottom: 10px;
            padding: 10px;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            border: 1px solid #e9ecef;
            flex-wrap: wrap; /* อนุญาตให้ขึ้นบรรทัดใหม่เมื่อหน้าจอเล็ก */
        }

        .search-bar {
            display: flex;
            align-items: center;
            width: auto; /* ปล่อยให้ปรับความกว้างอัตโนมัติ */
            flex-grow: 1; /* ให้ขยายเท่าที่ทำได้ */
            max-width: 350px; /* จำกัดความกว้างสูงสุดของช่องค้นหา */
            border: 1px solid #ced4da;
            border-radius: 20px;
            padding: 5px 12px;
            background-color: #f8f9fa;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
            transition: all 0.2s ease-in-out;
            margin: 0 auto; /* ทำให้ search bar อยู่ตรงกลาง เมื่อมีพื้นที่พอ*/
        }

        .search-bar:focus-within {
            border-color: #80bdff;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.05), 0 0 0 0.2rem rgba(0,123,255,.25);
            background-color: #fff;
        }

        .search-icon {
            color: #6c757d;
            margin-right: 8px;
            font-size: 0.9em;
        }

        .search-input {
            flex-grow: 1;
            border: none;
            outline: none;
            font-size: 0.85em;
            padding: 2px 0;
            background-color: transparent;
            color: #495057;
        }

        .search-input::placeholder {
            color: #adb5bd;
            font-size: 0.85em;
        }
        
        .pagination {
            display: flex;
            gap: 5px;
            flex-wrap: wrap; /* ให้ปุ่มขึ้นบรรทัดใหม่ได้ */
            justify-content: flex-start; /* จัดให้อยู่ฝั่งซ้าย */
        }

        .total-members {
            font-size: 0.85em;
            color: #555;
            font-weight: 500;
            white-space: nowrap; /* ป้องกันไม่ให้ข้อความขึ้นบรรทัดใหม่ */
            margin-left: auto; /* ดันไปทางขวาสุด */
        }

        .total-members .total-count {
            font-weight: 700;
            color:rgb(11, 11, 11);
            font-size: 1.1em;
        }

        .pagination-button {
            background-color: #cccccc;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.75em;
            font-weight: 600;
            transition: background-color 0.2s ease, transform 0.1s ease;
            white-space: nowrap; /* ป้องกันไม่ให้ข้อความปุ่มขึ้นบรรทัดใหม่ */
        }

        .pagination-button:hover:not(:disabled) {
            background-color: #6c757d;
            transform: translateY(-1px);
        }

        .pagination-button:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
        }

        .pagination-button.active {
            background-color: #6c757d;
            box-shadow: 0 0 0 2px #e6ffed, 0 1px 3px rgba(0,0,0,0.15);
            font-weight: 700;
        }

        /* --- Other Rankings Table --- */
        .ranking-table-wrapper {
          overflow-x: auto;
          border-radius: 8px;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.06);
          background-color: #ffffff;
          border: 1px solid #e9ecef;
          width: 100%;
          padding: 15px; /* Added padding to table wrapper */
          box-sizing: border-box; /* Include padding in width */
        }

        .ranking-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 700px;
        }

        .ranking-table thead {
          background: #323943;
          color: #ffffff;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
        }

        .ranking-table th {
          padding: 8px 6px;
          text-align: center;
          font-weight: 600;
          font-size: 0.85em;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .ranking-table th:first-child {
          border-top-left-radius: 8px;
        }
        .ranking-table th:last-child {
          border-top-right-radius: 8px;
        }

        /* Specific header alignment and width adjustments */
        .table-header-rank {
          width: 45px;
        }
        .table-header-player {
          width: 130px;
        }
        .table-header-level {
          width: 65px;
        }
        .table-header-wins,
        .table-header-draws,
        .table-header-losses,
        .table-header-total-games,
        .table-header-score {
          width: 55px;
        }
        .table-header-win-rate {
          width: 85px;
        }

        .ranking-table td {
          padding: 6px 6px;
          border-bottom: 1px solid #f1f3f5;
          font-size: 0.8em;
          color: #495057;
          text-align: center;
          vertical-align: middle;
          position: relative;
          transition: background-color 0.2s ease;
        }

        /* Add subtle horizontal lines between cells */
        .ranking-table td:not(:last-child)::after {
          content: "";
          position: absolute;
          right: 0;
          top: 15%;
          height: 70%;
          width: 1px;
          background-color: #e0e0e0;
        }

        .ranking-table tbody tr {
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
          border-radius: 6px;
          margin-bottom: 4px;
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
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(0, 123, 255, 0.08);
          transition: background-color 0.2s ease, transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        /* Table Cell Specific Styles */
        .rank-cell .rank-number-table {
          font-weight: 600;
          color: #34495e;
          background-color: #e9ecef;
          padding: 2px 7px;
          border-radius: 12px;
          display: inline-block;
          min-width: 22px;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
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
        .total-games-cell-table {
          color: #6c757d;
          font-weight: 500;
        }

        .wins-cell-table .wins-badge {
          background: linear-gradient(45deg, #28a745, #218838);
          color: #fff;
          padding: 4px 7px;
          border-radius: 16px;
          min-width: 40px;
          box-shadow: 0 1px 5px rgba(40, 167, 69, 0.12);
          font-size: 0.8em;
          font-weight: 700;
          text-align: center;
          display: inline-block;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .wins-cell-table .wins-badge:hover {
          transform: translateY(-1px) scale(1.05);
          box-shadow: 0 2px 8px rgba(40, 167, 69, 0.2);
        }

        .draws-cell-table .draws-badge {
          background: linear-gradient(45deg, #6c757d, #5a6268);
          color: #fff;
          padding: 4px 7px;
          border-radius: 16px;
          min-width: 40px;
          box-shadow: 0 1px 5px rgba(108, 117, 125, 0.12);
          font-size: 0.8em;
          font-weight: 700;
          text-align: center;
          display: inline-block;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .draws-cell-table .draws-badge:hover {
          transform: translateY(-1px) scale(1.05);
          box-shadow: 0 2px 8px rgba(108, 117, 125, 0.2);
        }

        .losses-cell-table .losses-badge {
          background: linear-gradient(45deg, #dc3545, #c82333);
          color: #fff;
          padding: 4px 7px;
          border-radius: 16px;
          min-width: 40px;
          box-shadow: 0 1px 5px rgba(220, 53, 69, 0.12);
          font-size: 0.8em;
          font-weight: 700;
          text-align: center;
          display: inline-block;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .losses-cell-table .losses-badge:hover {
          transform: translateY(-1px) scale(1.05);
          box-shadow: 0 2px 8px rgba(220, 53, 69, 0.2);
        }

        .win-rate-cell-table .win-rate-badge {
          background: linear-gradient(45deg, #17a2b8, #138496);
          color: #fff;
          padding: 4px 7px;
          border-radius: 16px;
          min-width: 50px;
          box-shadow: 0 1px 5px rgba(23, 162, 184, 0.12);
          font-size: 0.8em;
          font-weight: 700;
          text-align: center;
          display: inline-block;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .win-rate-cell-table .win-rate-badge:hover {
          transform: translateY(-1px) scale(1.05);
          box-shadow: 0 2px 8px rgba(23, 162, 184, 0.2);
        }

        .score-cell-table {
          text-align: center;
        }
        .score-cell-table .score-badge {
          background: linear-gradient(45deg, #ffc107, #e0a800);
          color: #fff;
          padding: 4px 9px;
          border-radius: 16px;
          min-width: 50px;
          box-shadow: 0 1px 5px rgba(255, 193, 7, 0.12);
          font-size: 0.85em;
          font-weight: 700;
          text-align: center;
          display: inline-block;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .score-cell-table .score-badge:hover {
          transform: translateY(-1px) scale(1.05);
          box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2);
        }

        /* --- Responsive Adjustments --- */
        @media (max-width: 992px) {
          .player-card {
            width: 170px; /* ปรับลดขนาดการ์ดเพิ่มเติม */
            padding: 8px 7px 6px; /* ลด padding */
          }
          .player-rank-circle {
            width: 35px;
            height: 35px;
            font-size: 1.4em;
          }
          .player-card-name {
            font-size: 1.1em;
          }
          .player-card-level {
            font-size: 0.65em;
            margin-bottom: 3px;
          }
          .player-card-score {
            font-size: 1.3em;
            padding: 2px 8px;
          }
          .score-detail {
            margin-top: 2px;
            margin-bottom: 5px;
          }
          .stat-value {
            font-size: 0.8em;
          }
          .stat-label {
            font-size: 0.55em;
          }
          .stats-row {
            margin-top: 4px;
          }
          .ranking-table {
            min-width: 600px;
          }
          .ranking-table th,
          .ranking-table td {
            font-size: 0.75em;
            padding: 5px 5px;
          }
          .wins-cell-table .wins-badge,
          .draws-cell-table .draws-badge,
          .losses-cell-table .losses-badge,
          .win-rate-cell-table .win-rate-badge,
          .score-cell-table .score-badge {
            font-size: 0.75em;
            padding: 3px 5px;
            min-width: 35px;
          }

          /* Responsive for table controls */
          .table-controls-wrapper {
              flex-wrap: wrap; /* อนุญาตให้ขึ้นบรรทัดใหม่ */
              justify-content: center; /* จัดให้อยู่ตรงกลางเมื่อขึ้นบรรทัดใหม่ */
              gap: 10px; /* ช่องว่างระหว่างแถว */
          }
          .pagination, .search-bar, .total-members {
              width: 100%; /* ให้เต็มความกว้างเมื่อหน้าจอเล็ก */
              max-width: none; /* ยกเลิก max-width */
              justify-content: center; /* จัดเนื้อหาตรงกลาง */
              margin: 0; /* ยกเลิก margin auto */
          }
          .search-bar {
            max-width: 300px; /* จำกัดความกว้างของ search bar ในหน้าจอมือถือ */
          }
          .total-members {
            margin-left: 0; /* ยกเลิก margin auto */
            text-align: center;
          }

          /* New responsive for hero section */
          .ranking-hero-section {
            padding: 20px 15px; /* Adjust padding, JS will fine-tune */
          }
          .ranking-page-title {
            font-size: 1.8em; /* Slightly smaller title */
          }
          .ranking-page-title .title-icon {
            font-size: 0.7em;
          }
          .ranking-subtitle {
            font-size: 1em;
          }
          .filter-controls {
            gap: 10px;
          }
          .filter-item {
            padding: 7px 12px;
            border-radius: 18px;
          }
          .month-select-new,
          .year-select-new {
            font-size: 0.85em;
            min-width: 70px;
            padding-right: 20px;
          }
        }

        @media (max-width: 768px) {
          .main-content {
            padding: 5px;
            font-size: 0.8em;
          }
          .ranking-container {
            gap: 10px;
          }
          .ranking-hero-section {
            padding: 15px 10px; /* Further adjust padding, JS will fine-tune */
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          }
          .ranking-page-title {
            font-size: 1.5em; /* Smaller title */
            gap: 8px;
          }
          .ranking-page-title .title-icon {
            font-size: 0.6em;
          }
          .ranking-subtitle {
            font-size: 0.9em;
            margin-bottom: 15px;
          }
          .filter-controls {
            gap: 8px;
            flex-direction: column; /* Stack filters vertically */
          }
          .filter-item {
            width: 100%; /* Make filter items full width */
            max-width: 250px; /* Limit max width for stacking */
            justify-content: center;
            padding: 6px 10px;
            border-radius: 16px;
          }
          .month-select-new,
          .year-select-new {
            font-size: 0.8em;
            min-width: auto; /* Allow auto width */
            flex-grow: 1; /* Make them grow */
            padding-right: 15px;
          }
          .loading-state,
          .message-box {
            font-size: 0.75em;
          }
          .top3-cards-wrapper {
            gap: 6px;
            flex-direction: column;
            align-items: center;
          }
          .player-card {
            width: 90%;
            max-width: 240px; /* ลด max-width */
            padding: 6px 5px 4px; /* ลด padding */
          }
          .player-rank-circle {
            width: 32px;
            height: 32px;
            font-size: 1.3em;
            margin-bottom: 5px;
          }
          .player-card-name {
            font-size: 1em;
          }
          .player-card-level {
            font-size: 0.6em;
            margin-bottom: 2px;
          }
          .score-detail {
            margin-top: 2px;
            margin-bottom: 4px;
          }
          .player-card-score {
            font-size: 1.2em;
            padding: 2px 7px;
          }
          .stat-value {
            font-size: 0.75em;
          }
          .stat-label {
            font-size: 0.55em;
          }
          .stats-row {
            margin-top: 3px;
          }
          .ranking-table {
            min-width: 480px;
          }
          .ranking-table th,
          .ranking-table td {
            font-size: 0.7em;
            padding: 4px 4px;
          }
          .wins-cell-table .wins-badge,
          .draws-cell-table .draws-badge,
          .losses-cell-table .losses-badge,
          .win-rate-cell-table .win-rate-badge,
          .score-cell-table .score-badge {
            font-size: 0.7em;
            padding: 3px 5px;
            min-width: 35px;
          }
          .rank-cell .rank-number-table {
            padding: 1px 4px;
            min-width: 16px;
            font-size: 0.65em;
          }
          .crown-icon {
            font-size: 0.5em;
            top: -0.3em;
          }
        }

        @media (max-width: 480px) {
          .main-content {
            padding: 3px;
            font-size: 0.75em;
          }
          .ranking-hero-section {
            padding: 12px 8px; /* Further adjust padding, JS will fine-tune */
          }
          .ranking-page-title {
            font-size: 1.1em;
            gap: 6px;
          }
          .ranking-page-title .title-icon {
            font-size: 0.5em;
          }
          .ranking-subtitle {
            font-size: 0.75em;
            margin-bottom: 10px;
          }
          .filter-controls {
            gap: 6px;
          }
          .filter-item {
            padding: 5px 8px;
          }
          .month-select-new,
          .year-select-new {
            font-size: 0.7em;
            padding-right: 12px;
          }
          .player-card {
            width: 95%;
            max-width: 200px; /* ลด max-width */
            padding: 5px 4px 3px; /* ลด padding */
          }
          .player-rank-circle {
            width: 28px;
            height: 28px;
            font-size: 1.1em;
            margin-bottom: 4px;
          }
          .player-card-name {
            font-size: 0.9em;
          }
          .player-card-level {
            font-size: 0.55em;
            margin-bottom: 1px;
          }
          .score-detail {
            margin-top: 1px;
            margin-bottom: 3px;
          }
          .player-card-score {
            font-size: 1.05em;
            padding: 1px 5px;
          }
          .stat-value {
            font-size: 0.7em;
          }
          .stat-label {
            font-size: 0.45em;
          }
          .stats-row {
            margin-top: 2px;
          }
          .ranking-table {
            min-width: 360px;
          }
          .ranking-table th,
          .ranking-table td {
            font-size: 0.6em;
            padding: 3px 3px;
          }
          .wins-cell-table .wins-badge,
          .draws-cell-table .draws-badge,
          .losses-cell-table .losses-badge,
          .win-rate-cell-table .win-rate-badge,
          .score-cell-table .score-badge {
            font-size: 0.6em;
            padding: 1px 3px;
            min-width: 25px;
          }
          .rank-cell .rank-number-table {
            padding: 1px 4px;
            min-width: 16px;
            font-size: 0.65em;
          }
        }
      `}</style>
    </div>
  );
};

export default Ranking;

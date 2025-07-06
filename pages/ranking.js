// pages/Ranking.jsx
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
import { FaTrophy, FaCrown, FaSearch, FaMedal, FaTable } from "react-icons/fa"; // เพิ่ม FaTable
import { BsFillGridFill } from "react-icons/bs"; // เพิ่ม BsFillGridFill

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
  // เปลี่ยน itemsPerPage เป็น displayLimit ที่ปรับเปลี่ยนได้
  const [displayLimit, setDisplayLimit] = useState(10); // เริ่มต้นแสดง 10 อันดับ
  const [currentPage, setCurrentPage] = useState(1);

  // --- State for Search ---
  const [searchTerm, setSearchTerm] = useState("");

  // --- State for Display Mode ('cardsAndTable' or 'fullTable') ---
  const [displayMode, setDisplayMode] = useState("cardsAndTable"); // Default mode

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
            // Calculate draws based on score logic (assuming wins give 2 points, draws 1 point)
            if (score > wins * 2) {
              draws = score - wins * 2;
            } else if (score < wins * 2) {
              // This case suggests score is less than expected from wins, implying a possible data discrepancy
              // For robustness, ensure draws isn't negative
              draws = 0;
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
              winRate: winRate, // ส่งค่าเป็น string ที่มีทศนิยม 2 ตำแหน่ง
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

  // --- useEffect for adding keyframes client-side only ---
  useEffect(() => {
    if (typeof document !== 'undefined') { // Ensure document is defined (client-side)
      const styleSheet = document.styleSheets[0];
      if (styleSheet) {
        try {
          const spinKeyframes = `@keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                  }`;
          const glowRotateKeyframes = `@keyframes glow-rotate {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                  }`;
          if (
            !Array.from(styleSheet.cssRules).some((rule) =>
              rule.cssText.includes("@keyframes spin")
            )
          ) {
            styleSheet.insertRule(spinKeyframes, styleSheet.cssRules.length);
          }
          if (
            !Array.from(styleSheet.cssRules).some((rule) =>
              rule.cssText.includes("@keyframes glow-rotate")
            )
          ) {
            styleSheet.insertRule(glowRotateKeyframes, styleSheet.cssRules.length);
          }
        } catch (e) {
          console.error(
            "Could not insert CSS keyframes. This might happen if running in an environment without document.styleSheets or if rules already exist.",
            e
          );
        }
      }
    }
  }, []); // Empty dependency array means this runs once on mount (client-side)

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
  const filteredRankings = rankings.filter((player) =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // แยกอันดับ 1, 2, 3
  const top3Rankings = filteredRankings.slice(0, 3);
  const otherRankings = filteredRankings.slice(3); // อันดับที่เหลือ

  // --- Pagination Logic for otherRankings (for cardsAndTable mode) ---
  const indexOfLastItem = currentPage * displayLimit; // ใช้ displayLimit
  const indexOfFirstItem = indexOfLastItem - displayLimit; // ใช้ displayLimit
  const currentOtherRankings = otherRankings.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const totalPages = Math.ceil(otherRankings.length / displayLimit); // ใช้ displayLimit

  // --- Pagination Logic for fullTable mode ---
  const indexOfLastItemFullTable = currentPage * displayLimit; // ใช้ displayLimit
  const indexOfFirstItemFullTable = indexOfLastItemFullTable - displayLimit; // ใช้ displayLimit
  const currentFullTableRankings = filteredRankings.slice(
    indexOfFirstItemFullTable,
    indexOfLastItemFullTable
  );
  const totalPagesFullTable = Math.ceil(filteredRankings.length / displayLimit); // ใช้ displayLimit

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const nextPage = () => {
    const totalPagesToUse = displayMode === 'cardsAndTable' ? totalPages : totalPagesFullTable;
    if (currentPage < totalPagesToUse) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Handler for display limit buttons
  const handleDisplayLimitChange = (limit) => {
    setDisplayLimit(limit);
    setCurrentPage(1); // Reset to first page when display limit changes
  };

  return (
    <div style={styles.container}>
      <Head>
        <title>Ranking - PBTH</title>
      </Head>

      {/* --- Ranking Hero Section & Filters --- */}
      <div style={styles.rankingHeroSection}>
        <h1 style={styles.rankingPageTitle}>
          <FaTrophy style={styles.titleIcon} /> อันดับผู้เล่นยอดเยี่ยม
        </h1>
        <p style={styles.rankingSubtitle}>
          ประจำเดือน{" "}
          <span style={styles.highlightText}>
            {selectedMonth ? getMonthName(selectedMonth) : "..."}
          </span>{" "}
          ปี{" "}
          <span style={styles.highlightText}>
            {selectedYear ? `พ.ศ. ${parseInt(selectedYear) + 543}` : "..."}
          </span>
        </p>

        <div style={styles.filterControls}>
          <div style={styles.filterItem}>
            <label htmlFor="month-select" style={{ display: "none" }}>
              เลือกเดือน
            </label>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={handleMonthChange}
              style={styles.selectControl}
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
          <div style={styles.filterItem}>
            <label htmlFor="year-select" style={{ display: "none" }}>
              เลือกปี
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={handleYearChange}
              style={styles.selectControl}
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
          {/* Display Mode Buttons */}
          <div style={styles.displayModeButtons}>
            <button
              onClick={() => {
                setDisplayMode("cardsAndTable");
                setCurrentPage(1); // Reset page on mode change
              }}
              style={{
                ...styles.displayModeButton,
                ...(displayMode === "cardsAndTable"
                  ? styles.displayModeButtonActive
                  : {}),
              }}
              aria-label="Show Top 3 Cards and Remaining Table"
            >
              <BsFillGridFill size={20} />
            </button>
            <button
              onClick={() => {
                setDisplayMode("fullTable");
                setCurrentPage(1); // Reset page on mode change
              }}
              style={{
                ...styles.displayModeButton,
                ...(displayMode === "fullTable"
                  ? styles.displayModeButtonActive
                  : {}),
              }}
              aria-label="Show Full Ranking Table"
            >
              <FaTable size={20} />
            </button>
          </div>
          {/* Display Limit Buttons */}
          <div style={styles.displayLimitButtons}>
            <button
              onClick={() => handleDisplayLimitChange(10)}
              style={{
                ...styles.displayLimitButton,
                ...(displayLimit === 10 ? styles.displayLimitButtonActive : {}),
              }}
            >
              10 อันดับ
            </button>
            <button
              onClick={() => handleDisplayLimitChange(20)}
              style={{
                ...styles.displayLimitButton,
                ...(displayLimit === 20 ? styles.displayLimitButtonActive : {}),
              }}
            >
              20 อันดับ
            </button>
            <button
              onClick={() => handleDisplayLimitChange(30)}
              style={{
                ...styles.displayLimitButton,
                ...(displayLimit === 30 ? styles.displayLimitButtonActive : {}),
              }}
            >
              30 อันดับ
            </button>
          </div>
        </div>
      </div>

      {/* --- Conditional Rendering based on Loading/Error/Data --- */}
      {loading ? (
        <div style={styles.loadingState}>
          <div style={styles.loadingSpinner}></div>
          <p>กำลังโหลดข้อมูลอันดับ...</p>
        </div>
      ) : error ? (
        <div style={styles.messageBoxError}>
          <p>เกิดข้อผิดพลาด: {error}</p>
        </div>
      ) : rankings.length > 0 ? (
        <>
          {displayMode === "cardsAndTable" && (
            <>
              {/* --- Top 3 Rankings Section --- */}
              <div style={styles.top3CardsWrapper}>
                {/* Rank 2 Card */}
                {top3Rankings[1] && (
                  <div
                    key={top3Rankings[1].name}
                    style={{
                      ...styles.playerCardElite,
                      ...styles.silverCard,
                      ...styles.rank2CardElite,
                    }}
                  >
                    <div style={styles.cardGlowEffect}></div>
                    <span style={styles.cardPatternIconElite}>🥈</span>
                    <div style={styles.playerRankIconOnly}>
                      <FaMedal
                        style={{ ...styles.rankIconElite, color: "#A9A9A9" }}
                      />
                    </div>
                    <h3 style={styles.playerCardNameElite}>
                      {top3Rankings[1].name}
                    </h3>
                    <p style={styles.playerCardLevelElite}>
                      ระดับ: {top3Rankings[1].level}
                    </p>
                    <p style={styles.playerCardScoreLargeElite}>
                      {top3Rankings[1].score || 0}
                    </p>
                    {/* --- Player Stats --- */}
                    <div style={styles.playerCardStatsElite}>
                      <p style={styles.statItemElite}>
                        <span>Games</span>{" "}
                        <span>{top3Rankings[1].totalGames}</span>
                      </p>
                      <p style={styles.statItemElite}>
                        <span>Won</span> <span>{top3Rankings[1].wins}</span>
                      </p>
                      <p style={styles.statItemElite}>
                        <span>Lost</span> <span>{top3Rankings[1].losses}</span>
                      </p>
                      <p style={styles.statItemElite}>
                        <span>Tied</span> <span>{top3Rankings[1].draws}</span>
                      </p>
                      <p style={styles.statItemEliteFull}>
                        <span>Win Rate</span>{" "}
                        <span>{top3Rankings[1].winRate}%</span>
                      </p>
                    </div>
                  </div>
                )}
                {/* Rank 1 Card (Center, Largest) */}
                {top3Rankings[0] && (
                  <div
                    key={top3Rankings[0].name}
                    style={{
                      ...styles.playerCardElite,
                      ...styles.goldCard,
                      ...styles.rank1CardElite,
                    }}
                  >
                    <div style={styles.cardGlowEffect}></div>
                    <span style={styles.cardPatternIconElite}>🥇</span>
                    <div style={styles.playerRankIconOnly}>
                      <FaCrown style={styles.crownIconElite} />
                    </div>
                    <h3 style={styles.playerCardNameElite}>
                      {top3Rankings[0].name}
                    </h3>
                    <p style={styles.playerCardLevelElite}>
                      ระดับ: {top3Rankings[0].level}
                    </p>
                    <p style={styles.playerCardScoreLargestElite}>
                      {top3Rankings[0].score || 0}
                    </p>
                    {/* --- Player Stats --- */}
                    <div style={styles.playerCardStatsElite}>
                      <p style={styles.statItemElite}>
                        <span>Games</span>{" "}
                        <span>{top3Rankings[0].totalGames}</span>
                      </p>
                      <p style={styles.statItemElite}>
                        <span>Won</span> <span>{top3Rankings[0].wins}</span>
                      </p>
                      <p style={styles.statItemElite}>
                        <span>Lost</span> <span>{top3Rankings[0].losses}</span>
                      </p>
                      <p style={styles.statItemElite}>
                        <span>Tied</span> <span>{top3Rankings[0].draws}</span>
                      </p>
                      <p style={styles.statItemEliteFull}>
                        <span>Win Rate</span>{" "}
                        <span>{top3Rankings[0].winRate}%</span>
                      </p>
                    </div>
                    <div style={styles.sparkleOverlay}></div>
                  </div>
                )}
                {/* Rank 3 Card */}
                {top3Rankings[2] && (
                  <div
                    key={top3Rankings[2].name}
                    style={{
                      ...styles.playerCardElite,
                      ...styles.bronzeCard,
                      ...styles.rank3CardElite,
                    }}
                  >
                    <div style={styles.cardGlowEffect}></div>
                    <span style={styles.cardPatternIconElite}>🥉</span>
                    <div style={styles.playerRankIconOnly}>
                      <FaMedal
                        style={{ ...styles.rankIconElite, color: "#CD7F32" }}
                      />
                    </div>
                    <h3 style={styles.playerCardNameElite}>
                      {top3Rankings[2].name}
                    </h3>
                    <p style={styles.playerCardLevelElite}>
                      ระดับ: {top3Rankings[2].level}
                    </p>
                    <p style={styles.playerCardScoreLargeElite}>
                      {top3Rankings[2].score || 0}
                    </p>
                    {/* --- Player Stats --- */}
                    <div style={styles.playerCardStatsElite}>
                      <p style={styles.statItemElite}>
                        <span>Games</span>{" "}
                        <span>{top3Rankings[2].totalGames}</span>
                      </p>
                      <p style={styles.statItemElite}>
                        <span>Won</span> <span>{top3Rankings[2].wins}</span>
                      </p>
                      <p style={styles.statItemElite}>
                        <span>Lost</span> <span>{top3Rankings[2].losses}</span>
                      </p>
                      <p style={styles.statItemElite}>
                        <span>Tied</span> <span>{top3Rankings[2].draws}</span>
                      </p>
                      <p style={styles.statItemEliteFull}>
                        <span>Win Rate</span>{" "}
                        <span>{top3Rankings[2].winRate}%</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* --- Other Rankings Table Controls (Search, Pagination, Total) --- */}
              {filteredRankings.length > 0 && (
                <div style={styles.tableControlsWrapper}>
                  {/* Search Bar - Left */}
                  <div style={styles.searchBar}>
                    <FaSearch style={styles.searchIcon} />
                    <input
                      type="text"
                      placeholder="ค้นหารายชื่อผู้เล่น..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      style={styles.searchInput}
                      aria-label="Search Player Name"
                    />
                  </div>
                  {/* Total Members - Center */}
                  <div style={styles.totalMembers}>
                    สมาชิกทั้งหมด:{" "}
                    <span style={styles.totalCount}>
                      {filteredRankings.length}
                    </span>{" "}
                    คน
                  </div>
                  {/* Pagination Controls - Right */}
                  {totalPages > 1 && (
                    <div style={styles.pagination}>
                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        style={styles.paginationButton}
                        aria-label="Previous Page"
                      >
                        {" "}
                        ย้อนกลับ{" "}
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => paginate(i + 1)}
                          style={{
                            ...styles.paginationButton,
                            ...(currentPage === i + 1
                              ? styles.paginationButtonActive
                              : {}),
                          }}
                          aria-label={`Page ${i + 1}`}
                        >
                          {" "}
                          {i + 1}{" "}
                        </button>
                      ))}
                      <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        style={styles.paginationButton}
                        aria-label="Next Page"
                      >
                        {" "}
                        ถัดไป{" "}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* --- Other Rankings Table --- */}
              {currentOtherRankings.length > 0 ? (
                <div style={styles.rankingTableWrapper}>
                  <table style={styles.rankingTable}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader}>Rank</th>
                        <th style={styles.tableHeader}>Name</th>
                        <th style={styles.tableHeader}>Skill Level</th>
                        <th style={styles.tableHeader}>Games Lost</th>
                        <th style={styles.tableHeader}>Games Tied</th>
                        <th style={styles.tableHeader}>Games Won</th>
                        <th style={styles.tableHeader}>Total Score</th>
                        <th style={styles.tableHeader}>Win Rate (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentOtherRankings.map((player, index) => (
                        <tr key={player.name} style={styles.tableRow}>
                          <td style={styles.tableCell}>
                            <span style={styles.tableRankNumber}>
                              {indexOfFirstItem + index + 1 + top3Rankings.length}{" "}
                            </span>
                          </td>
                          <td style={styles.tableCell}>{player.name}</td>
                          <td style={styles.tableCell}>{player.level}</td>
                          <td style={styles.tableCell}>{player.losses}</td>
                          <td style={styles.tableCell}>{player.draws}</td>
                          <td style={styles.tableCell}>{player.wins}</td>
                          <td style={styles.tableCell}>{player.score}</td>
                          <td style={styles.tableCell}>{player.winRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={styles.messageBoxInfo}>
                  <p>ไม่มีผู้เล่นอื่นในอันดับ</p>
                </div>
              )}
            </>
          )}

          {displayMode === "fullTable" && (
            <>
              {/* --- Full Table Rankings Table Controls (Search, Pagination, Total) --- */}
              {filteredRankings.length > 0 && (
                <div style={styles.tableControlsWrapper}>
                  {/* Search Bar - Left */}
                  <div style={styles.searchBar}>
                    <FaSearch style={styles.searchIcon} />
                    <input
                      type="text"
                      placeholder="ค้นหารายชื่อผู้เล่น..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      style={styles.searchInput}
                      aria-label="Search Player Name"
                    />
                  </div>
                  {/* Total Members - Center */}
                  <div style={styles.totalMembers}>
                    สมาชิกทั้งหมด:{" "}
                    <span style={styles.totalCount}>
                      {filteredRankings.length}
                    </span>{" "}
                    คน
                  </div>
                  {/* Pagination Controls - Right */}
                  {totalPagesFullTable > 1 && (
                    <div style={styles.pagination}>
                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        style={styles.paginationButton}
                        aria-label="Previous Page"
                      >
                        {" "}
                        ย้อนกลับ{" "}
                      </button>
                      {Array.from({ length: totalPagesFullTable }, (_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => paginate(i + 1)}
                          style={{
                            ...styles.paginationButton,
                            ...(currentPage === i + 1
                              ? styles.paginationButtonActive
                              : {}),
                          }}
                          aria-label={`Page ${i + 1}`}
                        >
                          {" "}
                          {i + 1}{" "}
                        </button>
                      ))}
                      <button
                        onClick={nextPage}
                        disabled={currentPage === totalPagesFullTable}
                        style={styles.paginationButton}
                        aria-label="Next Page"
                      >
                        {" "}
                        ถัดไป{" "}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* --- Full Ranking Table --- */}
              {currentFullTableRankings.length > 0 ? (
                <div style={styles.rankingTableWrapper}>
                  <table style={styles.rankingTable}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader}>Rank</th>
                        <th style={styles.tableHeader}>Name</th>
                        <th style={styles.tableHeader}>Skill Level</th>
                        <th style={styles.tableHeader}>Games Lost</th>
                        <th style={styles.tableHeader}>Games Tied</th>
                        <th style={styles.tableHeader}>Games Won</th>
                        <th style={styles.tableHeader}>Total Score</th>
                        <th style={styles.tableHeader}>Win Rate (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentFullTableRankings.map((player, index) => {
                        const rank =
                          indexOfFirstItemFullTable + index + 1;
                        const isTop3 = rank <= 3;
                        return (
                          <tr
                            key={player.name}
                            style={
                              isTop3
                                ? { ...styles.tableRow, ...styles.top3TableRow }
                                : styles.tableRow
                            }
                          >
                            <td
                              style={
                                isTop3
                                  ? {
                                      ...styles.tableCell,
                                      ...styles.top3TableCell,
                                    }
                                  : styles.tableCell
                              }
                            >
                              <span
                                style={
                                  isTop3
                                    ? {
                                        ...styles.tableRankNumber,
                                        color:
                                          rank === 1
                                            ? "#ffd700"
                                            : rank === 2
                                            ? "#c0c0c0"
                                            : "#cd7f32",
                                      }
                                    : styles.tableRankNumber
                                }
                              >
                                {rank}
                              </span>
                            </td>
                            <td
                              style={
                                isTop3
                                  ? {
                                      ...styles.tableCell,
                                      ...styles.top3TableCell,
                                    }
                                  : styles.tableCell
                              }
                            >
                              {player.name}
                            </td>
                            <td
                              style={
                                isTop3
                                  ? {
                                      ...styles.tableCell,
                                      ...styles.top3TableCell,
                                    }
                                  : styles.tableCell
                              }
                            >
                              {player.level}
                            </td>
                            <td
                              style={
                                isTop3
                                  ? {
                                      ...styles.tableCell,
                                      ...styles.top3TableCell,
                                    }
                                  : styles.tableCell
                              }
                            >
                              {player.losses}
                            </td>
                            <td
                              style={
                                isTop3
                                  ? {
                                      ...styles.tableCell,
                                      ...styles.top3TableCell,
                                    }
                                  : styles.tableCell
                              }
                            >
                              {player.draws}
                            </td>
                            <td
                              style={
                                isTop3
                                  ? {
                                      ...styles.tableCell,
                                      ...styles.top3TableCell,
                                    }
                                  : styles.tableCell
                              }
                            >
                              {player.wins}
                            </td>
                            <td
                              style={
                                isTop3
                                  ? {
                                      ...styles.tableCell,
                                      ...styles.top3TableCell,
                                    }
                                  : styles.tableCell
                              }
                            >
                              {player.score}
                            </td>
                            <td
                              style={
                                isTop3
                                  ? {
                                      ...styles.tableCell,
                                      ...styles.top3TableCell,
                                    }
                                  : styles.tableCell
                              }
                            >
                              {player.winRate}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={styles.messageBoxInfo}>
                  <p>ไม่มีข้อมูลผู้เล่นในตาราง</p>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div style={styles.messageBoxInfo}>
          <p>ไม่มีข้อมูลการจัดอันดับสำหรับเดือนและปีที่เลือก</p>
        </div>
      )}
    </div>
  );
};

// --- Styles ---
const styles = {
  container: {
    padding: "20px",
    backgroundColor: "#1a1d24",
    color: "#e0e0e0",
    minHeight: "100vh",
    fontFamily: "'Kanit', sans-serif",
  },
  rankingHeroSection: {
    textAlign: "center",
    padding: "15px 20px", // ลด padding บน-ล่าง
    backgroundColor: "#242831",
    borderRadius: "12px",
    marginBottom: "30px",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
    border: "1px solid #333",
    position: "relative",
    overflow: "hidden",
  },
  rankingPageTitle: {
    margin: "0 0 8px 0",
    fontSize: "2rem", // ลดขนาดตัวอักษร
    fontWeight: "600",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    textShadow: "0 0 10px rgba(77, 181, 255, 0.5)",
  },
  titleIcon: {
    color: "#ffd700",
    fontSize: "2.3rem", // ลดขนาดไอคอน
    filter: "drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))",
  },
  rankingSubtitle: {
    margin: "0 0 15px 0", // ลด margin
    fontSize: "1rem", // ลดขนาดตัวอักษร
    color: "#b0b8c4",
  },
  highlightText: {
    color: "#4db5ff",
    fontWeight: "500",
    textShadow: "0 0 5px rgba(77, 181, 255, 0.3)",
  },
  filterControls: {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    flexWrap: "wrap",
  },
  filterItem: {
    display: "flex",
    alignItems: "center",
  },
  selectControl: {
    padding: "10px 15px",
    backgroundColor: "#2c313a",
    color: "#e0e0e0",
    border: "1px solid #444",
    borderRadius: "8px",
    fontSize: "1rem",
    cursor: "pointer",
    minWidth: "200px",
    textAlign: "center",
    transition: "all 0.3s ease",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23b0b8c4' class='bi bi-chevron-down' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
  },
  displayModeButtons: {
    display: "flex",
    gap: "10px",
    marginLeft: "20px", // เพิ่มระยะห่างจาก dropdowns
  },
  displayModeButton: {
    padding: "10px",
    backgroundColor: "#333842",
    color: "#e0e0e0",
    border: "1px solid #555",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.3s ease, transform 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "&:hover": {
      backgroundColor: "#444c5a",
      transform: "translateY(-1px)",
    },
  },
  displayModeButtonActive: {
    backgroundColor: "#4db5ff",
    color: "#1a1d24",
    borderColor: "#4db5ff",
    boxShadow: "0 0 8px rgba(77, 181, 255, 0.4)",
  },
  displayLimitButtons: {
    display: "flex",
    gap: "10px",
    marginLeft: "20px", // เพิ่มระยะห่างจาก display mode buttons
  },
  displayLimitButton: {
    padding: "10px 15px",
    backgroundColor: "#333842",
    color: "#e0e0e0",
    border: "1px solid #555",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.3s ease, transform 0.2s ease",
    fontSize: "0.95rem",
    "&:hover": {
      backgroundColor: "#444c5a",
      transform: "translateY(-1px)",
    },
    "&:disabled": {
      backgroundColor: "#2c313a",
      color: "#666",
      cursor: "not-allowed",
      transform: "none",
    },
  },
  displayLimitButtonActive: {
    backgroundColor: "#4db5ff",
    color: "#1a1d24",
    borderColor: "#4db5ff",
    fontWeight: "bold",
    boxShadow: "0 0 8px rgba(77, 181, 255, 0.4)",
  },
  loadingState: {
    textAlign: "center",
    padding: "50px",
    fontSize: "1.2rem",
    color: "#b0b8c4",
  },
  loadingSpinner: {
    border: "4px solid rgba(255, 255, 255, 0.2)",
    borderTop: "4px solid #4db5ff",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    animation: "spin 1s linear infinite",
    margin: "0 auto 20px auto",
  },
  messageBoxError: {
    textAlign: "center",
    padding: "20px",
    backgroundColor: "#4a2a2a",
    color: "#ffc0c0",
    borderRadius: "8px",
    border: "1px solid #8B0000",
  },
  messageBoxInfo: {
    textAlign: "center",
    padding: "20px",
    backgroundColor: "#2c313a",
    color: "#b0b8c4",
    borderRadius: "8px",
  },
  top3CardsWrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap",
    marginTop: "20px",
  },
  playerCardElite: {
    backgroundColor: "#2c313a",
    borderRadius: "16px",
    padding: "8px 12px", // ลด padding บน-ล่าง
    textAlign: "center",
    color: "#fff",
    border: "2px solid transparent",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    cursor: "pointer",
    "&:hover": {
      transform: "translateY(-5px) scale(1.01)",
      boxShadow: "0 8px 20px rgba(0, 0, 0, 0.4)",
    },
  },
  rank1CardElite: {
    width: "200px",
    height: "auto",
    order: 2,
    transform: "scale(1.02)",
    zIndex: 2,
    borderColor: "#ffd700",
    boxShadow: "0 0 15px rgba(255, 215, 0, 0.4)",
    background: "linear-gradient(145deg, #2c313a, #3a404a)",
  },
  rank2CardElite: {
    width: "180px",
    height: "auto",
    order: 1,
    zIndex: 1,
    borderColor: "#c0c0c0",
    boxShadow: "0 0 12px rgba(192, 192, 192, 0.3)",
    background: "linear-gradient(145deg, #2c313a, #353b42)",
  },
  rank3CardElite: {
    width: "180px",
    height: "auto",
    order: 3,
    zIndex: 1,
    borderColor: "#cd7f32",
    boxShadow: "0 0 12px rgba(205, 127, 50, 0.3)",
    background: "linear-gradient(145deg, #2c313a, #353b42)",
  },
  cardGlowEffect: {
    position: "absolute",
    top: "-50%",
    left: "-50%",
    width: "200%",
    height: "200%",
    background:
      "radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)",
    animation: "glow-rotate 10s linear infinite",
    opacity: 0.2,
  },
  cardPatternIconElite: {
    position: "absolute",
    top: "5px",
    right: "5px",
    fontSize: "1.2rem",
    opacity: "0.4",
    pointerEvents: "none",
  },
  playerRankIconOnly: {
    marginBottom: "5px",
  },
  crownIconElite: {
    fontSize: "1.8rem", // ลดขนาดมงกุฎ
    color: "#ffd700",
    filter: "drop-shadow(0 0 7px rgba(255, 215, 0, 0.6))",
  },
  rankIconElite: {
    fontSize: "1.6rem", // ลดขนาดเหรียญ
    filter: "drop-shadow(0 0 6px rgba(0, 0, 0, 0.4))",
  },
  playerCardNameElite: {
    fontSize: "1rem", // ลดขนาด
    fontWeight: "700",
    margin: "2px 0",
    textShadow: "0 0 3px rgba(0, 0, 0, 0.4)",
  },
  playerCardLevelElite: {
    fontSize: "0.7rem", // ลดขนาด
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    padding: "2px 6px", // ลด padding
    borderRadius: "12px",
    margin: "2px 0 6px 0",
    color: "#e0e0e0",
  },
  playerCardScoreLargestElite: {
    fontSize: "1.7rem", // ลดขนาด
    fontWeight: "bold",
    margin: "0",
    color: "#ffd700",
    textShadow: "0 0 8px rgba(255, 215, 0, 0.6)",
  },
  playerCardScoreLargeElite: {
    fontSize: "1.4rem", // ลดขนาด
    fontWeight: "bold",
    margin: "0",
    color: "#fff",
    textShadow: "0 0 6px rgba(0, 0, 0, 0.5)",
  },
  sparkleOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    background: "url(/sparkle.gif) center center / cover no-repeat",
    opacity: 0.15,
    zIndex: 1,
  },
  playerCardStatsElite: {
    marginTop: "6px", // ลด margin
    width: "90%",
    display: "flex",
    flexDirection: "column",
    gap: "2px", // ลดระยะห่าง
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: "0.75rem", // ลดขนาดตัวอักษร
  },
  statItemElite: {
    display: "flex",
    justifyContent: "space-between",
    margin: 0,
    padding: "2px 6px", // ลด padding
    borderRadius: "6px",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.15)",
  },
  statItemEliteFull: {
    display: "flex",
    justifyContent: "space-between",
    margin: "3px 0 0 0", // ลด margin ด้านบน
    padding: "3px 8px", // ลด padding
    backgroundColor: "#4db5ff",
    color: "#1a1d24",
    fontWeight: "bold",
    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
  },
  tableControlsWrapper: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 0",
    flexWrap: "wrap",
    gap: "15px",
    backgroundColor: "#242831",
    borderRadius: "12px",
    marginBottom: "15px",
    padding: "15px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  },
  searchBar: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#333842",
    borderRadius: "8px",
    padding: "6px 12px",
    flex: "1 1 250px",
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)",
  },
  searchIcon: {
    color: "#8892b0",
    marginRight: "10px",
    fontSize: "1.1rem",
  },
  searchInput: {
    backgroundColor: "transparent",
    border: "none",
    color: "#e0e0e0",
    outline: "none",
    width: "100%",
    fontSize: "0.95rem",
    "&::placeholder": {
      color: "#8892b0",
    },
  },
  totalMembers: {
    color: "#b0b8c4",
    flex: "1 1 auto",
    textAlign: "center",
    fontSize: "1rem",
  },
  totalCount: {
    fontWeight: "bold",
    color: "#4db5ff",
    fontSize: "1.1rem",
  },
  pagination: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "6px",
    flex: "1 1 250px",
  },
  paginationButton: {
    padding: "8px 14px",
    backgroundColor: "#333842",
    color: "#e0e0e0",
    border: "1px solid #555",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background-color 0.3s ease, transform 0.2s ease",
    fontSize: "0.9rem",
    "&:hover": {
      backgroundColor: "#444c5a",
      transform: "translateY(-1px)",
    },
    "&:disabled": {
      backgroundColor: "#2c313a",
      color: "#666",
      cursor: "not-allowed",
      transform: "none",
    },
  },
  paginationButtonActive: {
    backgroundColor: "#4db5ff",
    color: "#1a1d24",
    borderColor: "#4db5ff",
    fontWeight: "bold",
    boxShadow: "0 0 8px rgba(77, 181, 255, 0.4)",
  },
  rankingTableWrapper: {
    overflowX: "auto",
    backgroundColor: "#242831",
    borderRadius: "12px",
    padding: "10px",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.25)",
  },
  rankingTable: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeader: {
    padding: "14px 12px",
    textAlign: "left",
    borderBottom: "2px solid #4db5ff",
    color: "#ffffff",
    textTransform: "uppercase",
    fontSize: "0.9rem",
    fontWeight: "600",
    backgroundColor: "#2c313a",
  },
  tableRow: {
    borderBottom: "1px solid #333",
    transition: "background-color 0.2s ease",
    "&:last-child": {
      borderBottom: "none",
    },
    "&:hover": {
      backgroundColor: "rgba(77, 181, 255, 0.08)",
    },
  },
  top3TableRow: {
    backgroundColor: "rgba(77, 181, 255, 0.15)", // พื้นหลังสีอ่อนๆ
    border: "1px solid #4db5ff", // ขอบสีไฮไลท์
    boxShadow: "0 0 5px rgba(77, 181, 255, 0.2)",
  },
  tableCell: {
    padding: "12px",
    color: "#b0b8c4",
    fontSize: "0.85rem",
  },
  top3TableCell: {
    color: "#ffffff", // ตัวอักษรสีขาว
    fontWeight: "bold",
  },
  tableRankNumber: {
    fontWeight: "bold",
    color: "#e0e0e0",
    fontSize: "1rem",
    textShadow: "0 0 3px rgba(0, 0, 0, 0.2)",
  },
};

// Removed the direct document access outside of useEffect.
// Keyframes are typically defined in a global CSS file or a styled-components library for Next.js.
// If you must inject them this way, ensure it's within a useEffect.
// However, the cleaner solution for Next.js is to define these keyframes in a global CSS file
// (e.g., globals.css) and import it in _app.js.

export default Ranking;

// pages/Ranking.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
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
import * as htmlToImage from "html-to-image"; // --- เพิ่มเข้ามา
import {
  FaTrophy,
  FaCrown,
  FaSearch,
  FaMedal,
  FaTable,
  FaDownload, // --- เพิ่มเข้ามา
} from "react-icons/fa";
import { BsFillGridFill } from "react-icons/bs";

const Ranking = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [error, setError] = useState(null);
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [displayMode, setDisplayMode] = useState("cardsAndTable");

  const printRef = useRef(); // --- เพิ่มเข้ามาสำหรับจับภาพหน้าจอ
  const router = useRouter();

  // --- Helper for displaying full month name (Thai) ---
  const getMonthName = (monthNum) => {
    const monthNames = {
      "01": "มกราคม", "02": "กุมภาพันธ์", "03": "มีนาคม", "04": "เมษายน",
      "05": "พฤษภาคม", "06": "มิถุนายน", "07": "กรกฎาคม", "08": "สิงหาคม",
      "09": "กันยายน", "10": "ตุลาคม", "11": "พฤศจิกายน", "12": "ธันวาคม",
    };
    return monthNames[monthNum] || `เดือน ${parseInt(monthNum)}`;
  };

  // --- Authentication State Listener ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLoggedInUserId(user.uid);
      } else {
        setLoggedInUserId(null);
        setRankings([]);
        setAvailableMonths([]);
        setAvailableYears([]);
        setSelectedMonth("");
        setSelectedYear("");
        setLoading(false);
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
    if (!loggedInUserId) return;
    setLoading(true);
    setError(null);
    try {
      const userRankingCollectionRef = collection(db, "users", loggedInUserId, "Ranking");
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
          if ( month.length === 2 && !isNaN(parseInt(month)) && year.length === 4 && !isNaN(parseInt(year)) ) {
            uniqueMonths.add(month);
            uniqueYears.add(year);
            parsedDocIds.push({ month, year, docId });
          }
        }
      });

      const sortedYears = Array.from(uniqueYears).sort((a, b) => parseInt(b) - parseInt(a));
      const sortedMonths = Array.from(uniqueMonths).sort((a, b) => parseInt(b) - parseInt(a));
      setAvailableYears(sortedYears);
      setAvailableMonths(sortedMonths);

      const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, "0");
      const currentYear = new Date().getFullYear().toString();
      let initialMonth = "";
      let initialYear = "";

      if (parsedDocIds.length > 0) {
        const currentMonthYearDoc = parsedDocIds.find((item) => item.month === currentMonth && item.year === currentYear);
        if (currentMonthYearDoc) {
          initialMonth = currentMonth;
          initialYear = currentYear;
        } else {
          const latestYear = sortedYears.length > 0 ? sortedYears[0] : "";
          if (latestYear) {
            const monthsInLatestYear = parsedDocIds.filter((item) => item.year === latestYear).map((item) => item.month).sort((a, b) => parseInt(b) - parseInt(a));
            initialYear = latestYear;
            initialMonth = monthsInLatestYear.length > 0 ? monthsInLatestYear[0] : "";
          }
        }
      }
      setSelectedYear(initialYear);
      setSelectedMonth(initialMonth);
    } catch (err) {
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
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const monthYearDocId = `${selectedMonth}-${selectedYear}`;
      const docRef = doc(db, "users", loggedInUserId, "Ranking", monthYearDocId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const playersData = Object.keys(data)
          .filter((key) => key !== "lastUpdatedMonth")
          .map((playerName) => {
            const wins = data[playerName].wins || 0;
            const totalGames = data[playerName].totalGames || 0;
            const score = data[playerName].score || 0;
            // IMPORTANT: For better accuracy, it's recommended to store draws and losses directly in Firestore.
            // This calculation is based on an assumption (win=2, draw=1).
            let draws = score > wins * 2 ? score - wins * 2 : 0;
            let losses = Math.max(0, totalGames - wins - draws);
            const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(2) : "0.00";
            return {
              name: playerName,
              level: data[playerName].level || "",
              score: score,
              wins: wins,
              draws: draws,
              losses: losses,
              totalGames: totalGames,
              winRate: winRate,
            };
          });
        playersData.sort((a, b) => (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0));
        setRankings(playersData);
        setCurrentPage(1);
      } else {
        setRankings([]);
      }
      setLoading(false);
    } catch (err) {
      setError("ไม่สามารถโหลดข้อมูล Ranking ได้: " + err.message);
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, loggedInUserId]);

  // --- All other useEffect hooks remain the same ---
  useEffect(() => { if (loggedInUserId) getAvailableMonthsAndYears(); else { setRankings([]); setAvailableMonths([]); setAvailableYears([]); setSelectedMonth(""); setSelectedYear(""); } }, [loggedInUserId, getAvailableMonthsAndYears]);
  useEffect(() => { if (selectedMonth && selectedYear && loggedInUserId) fetchRankings(); else if (loggedInUserId && (!selectedMonth || !selectedYear)) { setRankings([]); setLoading(false); } }, [selectedMonth, selectedYear, loggedInUserId, fetchRankings]);
  useEffect(() => { if (typeof document !== 'undefined') { const styleSheet = document.styleSheets[0]; if (styleSheet) { try { const spinKeyframes = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`; const glowRotateKeyframes = `@keyframes glow-rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`; if (!Array.from(styleSheet.cssRules).some((rule) => rule.cssText.includes("@keyframes spin"))) { styleSheet.insertRule(spinKeyframes, styleSheet.cssRules.length); } if (!Array.from(styleSheet.cssRules).some((rule) => rule.cssText.includes("@keyframes glow-rotate"))) { styleSheet.insertRule(glowRotateKeyframes, styleSheet.cssRules.length); } } catch (e) { console.error("Could not insert CSS keyframes.", e); } } } }, []);

  // --- Handlers ---
  const handleMonthChange = (e) => setSelectedMonth(e.target.value);
  const handleYearChange = (e) => setSelectedYear(e.target.value);
  const handleDisplayLimitChange = (limit) => { setDisplayLimit(limit); setCurrentPage(1); };

  // --- Function to Download Ranking as Image ---
  const handleDownloadImage = useCallback(async () => {
    if (!printRef.current) {
      return;
    }
    try {
      const dataUrl = await htmlToImage.toPng(printRef.current, {
        quality: 1,
        backgroundColor: "#1a1d24",
        // --- ส่วนที่แก้ไข ---
        filter: (node) => {
          // ตรวจสอบว่า node มี classList และมี class ที่เราต้องการกรองออกหรือไม่
          // วิธีนี้ปลอดภัยสำหรับ SVG และ element ประเภทอื่นๆ
          if (node.classList) {
            return !node.classList.contains("download-button-no-capture");
          }
          return true; // ถ้าไม่มี classList ให้เก็บ node นั้นไว้ในภาพ
        },
      });

      // สร้างลิงก์และดาวน์โหลดไฟล์
      const link = document.createElement("a");
      const monthName = selectedMonth ? getMonthName(selectedMonth) : "ranking";
      const year = selectedYear ? parseInt(selectedYear) + 543 : "";
      link.download = `ranking-pbth-${monthName}-${year}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error creating image:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถสร้างรูปภาพได้ โปรดลองอีกครั้ง",
      });
    }
  }, [selectedMonth, selectedYear]);

  // --- Filtering & Pagination Logic (remains the same) ---
  const filteredRankings = rankings.filter((player) => player.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const top3Rankings = filteredRankings.slice(0, 3);
  const otherRankings = filteredRankings.slice(3);
  const indexOfLastItem = currentPage * displayLimit;
  const indexOfFirstItem = indexOfLastItem - displayLimit;
  const currentOtherRankings = otherRankings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(otherRankings.length / displayLimit);
  const indexOfLastItemFullTable = currentPage * displayLimit;
  const indexOfFirstItemFullTable = indexOfLastItemFullTable - displayLimit;
  const currentFullTableRankings = filteredRankings.slice(indexOfFirstItemFullTable, indexOfLastItemFullTable);
  const totalPagesFullTable = Math.ceil(filteredRankings.length / displayLimit);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => { const total = displayMode === 'cardsAndTable' ? totalPages : totalPagesFullTable; if (currentPage < total) setCurrentPage(currentPage + 1); };
  const prevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

  // --- JSX Rendering ---
  return (
    //  --- มอบหมาย ref ให้กับ container หลัก ---
    <div style={styles.container} ref={printRef}>
      <Head>
        <title>Ranking - PBTH</title>
      </Head>

      <div style={styles.rankingHeroSection}>
        <h1 style={styles.rankingPageTitle}>
          <FaTrophy style={styles.titleIcon} /> อันดับผู้เล่นยอดเยี่ยม
        </h1>
        <p style={styles.rankingSubtitle}>
          ประจำเดือน{" "}
          <span style={styles.highlightText}>{selectedMonth ? getMonthName(selectedMonth) : "..."}</span>{" "}
          ปี{" "}
          <span style={styles.highlightText}>{selectedYear ? `พ.ศ. ${parseInt(selectedYear) + 543}` : "..."}</span>
        </p>

        <div style={styles.filterControls}>
          {/* --- Dropdowns and Display Buttons (remain the same) --- */}
          <div style={styles.filterItem}>
            <select id="month-select" value={selectedMonth} onChange={handleMonthChange} style={styles.selectControl}>
              <option value="">เลือกเดือน</option>
              {availableMonths.map((month) => (<option key={month} value={month}>{getMonthName(month)}</option>))}
            </select>
          </div>
          <div style={styles.filterItem}>
            <select id="year-select" value={selectedYear} onChange={handleYearChange} style={styles.selectControl}>
              <option value="">เลือกปี</option>
              {availableYears.map((year) => (<option key={year} value={year}>ปี {parseInt(year) + 543}</option>))}
            </select>
          </div>
          <div style={styles.displayModeButtons}>
            <button onClick={() => { setDisplayMode("cardsAndTable"); setCurrentPage(1); }} style={{ ...styles.displayModeButton, ...(displayMode === "cardsAndTable" ? styles.displayModeButtonActive : {}), }}><BsFillGridFill size={20} /></button>
            <button onClick={() => { setDisplayMode("fullTable"); setCurrentPage(1); }} style={{ ...styles.displayModeButton, ...(displayMode === "fullTable" ? styles.displayModeButtonActive : {}), }}><FaTable size={20} /></button>
          </div>
          <div style={styles.displayLimitButtons}>
            <button onClick={() => handleDisplayLimitChange(10)} style={{ ...styles.displayLimitButton, ...(displayLimit === 10 ? styles.displayLimitButtonActive : {}), }}>10 อันดับ</button>
            <button onClick={() => handleDisplayLimitChange(20)} style={{ ...styles.displayLimitButton, ...(displayLimit === 20 ? styles.displayLimitButtonActive : {}), }}>20 อันดับ</button>
            <button onClick={() => handleDisplayLimitChange(30)} style={{ ...styles.displayLimitButton, ...(displayLimit === 30 ? styles.displayLimitButtonActive : {}), }}>30 อันดับ</button>
          </div>
           {/* --- ปุ่มดาวน์โหลดรูปภาพ --- */}
          <div style={styles.filterItem}>
            <button
              onClick={handleDownloadImage}
              style={styles.downloadButton}
              aria-label="Download Ranking as Image"
              className="download-button-no-capture" // คลาสนี้สำคัญมาก สำหรับการกรอง
            >
              <FaDownload size={18} />
              <span style={{ marginLeft: "8px" }}>บันทึกเป็นรูปภาพ</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- Conditional Rendering for Content (remains the same) --- */}
      {loading ? (
        <div style={styles.loadingState}><div style={styles.loadingSpinner}></div><p>กำลังโหลดข้อมูลอันดับ...</p></div>
      ) : error ? (
        <div style={styles.messageBoxError}><p>เกิดข้อผิดพลาด: {error}</p></div>
      ) : rankings.length > 0 ? (
        <>
          {/* --- All content for cards and tables remains exactly the same --- */}
          {/* The ref on the main container will capture all of this */}
          {displayMode === "cardsAndTable" && (
            <>
              <div style={styles.top3CardsWrapper}>
                {top3Rankings[1] && (<div key={top3Rankings[1].name} style={{...styles.playerCardElite, ...styles.silverCard, ...styles.rank2CardElite}}><div style={styles.cardGlowEffect}></div><span style={styles.cardPatternIconElite}>🥈</span><div style={styles.playerRankIconOnly}><FaMedal style={{ ...styles.rankIconElite, color: "#A9A9A9" }}/></div><h3 style={styles.playerCardNameElite}>{top3Rankings[1].name}</h3><p style={styles.playerCardLevelElite}>ระดับ: {top3Rankings[1].level}</p><p style={styles.playerCardScoreLargeElite}>{top3Rankings[1].score || 0}</p><div style={styles.playerCardStatsElite}><p style={styles.statItemElite}><span>Games</span> <span>{top3Rankings[1].totalGames}</span></p><p style={styles.statItemElite}><span>Won</span> <span>{top3Rankings[1].wins}</span></p><p style={styles.statItemElite}><span>Lost</span> <span>{top3Rankings[1].losses}</span></p><p style={styles.statItemElite}><span>Tied</span> <span>{top3Rankings[1].draws}</span></p><p style={styles.statItemEliteFull}><span>Win Rate</span> <span>{top3Rankings[1].winRate}%</span></p></div></div>)}
                {top3Rankings[0] && (<div key={top3Rankings[0].name} style={{...styles.playerCardElite, ...styles.goldCard, ...styles.rank1CardElite}}><div style={styles.cardGlowEffect}></div><span style={styles.cardPatternIconElite}>🥇</span><div style={styles.playerRankIconOnly}><FaCrown style={styles.crownIconElite}/></div><h3 style={styles.playerCardNameElite}>{top3Rankings[0].name}</h3><p style={styles.playerCardLevelElite}>ระดับ: {top3Rankings[0].level}</p><p style={styles.playerCardScoreLargestElite}>{top3Rankings[0].score || 0}</p><div style={styles.playerCardStatsElite}><p style={styles.statItemElite}><span>Games</span> <span>{top3Rankings[0].totalGames}</span></p><p style={styles.statItemElite}><span>Won</span> <span>{top3Rankings[0].wins}</span></p><p style={styles.statItemElite}><span>Lost</span> <span>{top3Rankings[0].losses}</span></p><p style={styles.statItemElite}><span>Tied</span> <span>{top3Rankings[0].draws}</span></p><p style={styles.statItemEliteFull}><span>Win Rate</span> <span>{top3Rankings[0].winRate}%</span></p></div><div style={styles.sparkleOverlay}></div></div>)}
                {top3Rankings[2] && (<div key={top3Rankings[2].name} style={{...styles.playerCardElite, ...styles.bronzeCard, ...styles.rank3CardElite}}><div style={styles.cardGlowEffect}></div><span style={styles.cardPatternIconElite}>🥉</span><div style={styles.playerRankIconOnly}><FaMedal style={{ ...styles.rankIconElite, color: "#CD7F32" }}/></div><h3 style={styles.playerCardNameElite}>{top3Rankings[2].name}</h3><p style={styles.playerCardLevelElite}>ระดับ: {top3Rankings[2].level}</p><p style={styles.playerCardScoreLargeElite}>{top3Rankings[2].score || 0}</p><div style={styles.playerCardStatsElite}><p style={styles.statItemElite}><span>Games</span> <span>{top3Rankings[2].totalGames}</span></p><p style={styles.statItemElite}><span>Won</span> <span>{top3Rankings[2].wins}</span></p><p style={styles.statItemElite}><span>Lost</span> <span>{top3Rankings[2].losses}</span></p><p style={styles.statItemElite}><span>Tied</span> <span>{top3Rankings[2].draws}</span></p><p style={styles.statItemEliteFull}><span>Win Rate</span> <span>{top3Rankings[2].winRate}%</span></p></div></div>)}
              </div>
              {filteredRankings.length > 0 && (<div style={styles.tableControlsWrapper}><div style={styles.searchBar}><FaSearch style={styles.searchIcon}/><input type="text" placeholder="ค้นหารายชื่อผู้เล่น..." value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} style={styles.searchInput}/></div><div style={styles.totalMembers}>สมาชิกทั้งหมด: <span style={styles.totalCount}>{filteredRankings.length}</span> คน</div>{totalPages > 1 && (<div style={styles.pagination}><button onClick={prevPage} disabled={currentPage === 1} style={styles.paginationButton}>ย้อนกลับ</button>{Array.from({length: totalPages}, (_, i) => (<button key={i+1} onClick={() => paginate(i+1)} style={{...styles.paginationButton, ...(currentPage === i+1 ? styles.paginationButtonActive : {})}}>{i+1}</button>))}<button onClick={nextPage} disabled={currentPage === totalPages} style={styles.paginationButton}>ถัดไป</button></div>)}</div>)}
              {currentOtherRankings.length > 0 ? (<div style={styles.rankingTableWrapper}><table style={styles.rankingTable}><thead><tr><th style={styles.tableHeader}>Rank</th><th style={styles.tableHeader}>Name</th><th style={styles.tableHeader}>Skill Level</th><th style={styles.tableHeader}>Games Lost</th><th style={styles.tableHeader}>Games Tied</th><th style={styles.tableHeader}>Games Won</th><th style={styles.tableHeader}>Total Score</th><th style={styles.tableHeader}>Win Rate (%)</th></tr></thead><tbody>{currentOtherRankings.map((player, index) => (<tr key={player.name} style={styles.tableRow}><td style={styles.tableCell}><span style={styles.tableRankNumber}>{indexOfFirstItem + index + 1 + top3Rankings.length}</span></td><td style={styles.tableCell}>{player.name}</td><td style={styles.tableCell}>{player.level}</td><td style={styles.tableCell}>{player.losses}</td><td style={styles.tableCell}>{player.draws}</td><td style={styles.tableCell}>{player.wins}</td><td style={styles.tableCell}>{player.score}</td><td style={styles.tableCell}>{player.winRate}%</td></tr>))}</tbody></table></div>) : (<div style={styles.messageBoxInfo}><p>ไม่มีผู้เล่นอื่นในอันดับ</p></div>)}
            </>
          )}
          {displayMode === "fullTable" && (
            <>
              {filteredRankings.length > 0 && (<div style={styles.tableControlsWrapper}><div style={styles.searchBar}><FaSearch style={styles.searchIcon}/><input type="text" placeholder="ค้นหารายชื่อผู้เล่น..." value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} style={styles.searchInput}/></div><div style={styles.totalMembers}>สมาชิกทั้งหมด: <span style={styles.totalCount}>{filteredRankings.length}</span> คน</div>{totalPagesFullTable > 1 && (<div style={styles.pagination}><button onClick={prevPage} disabled={currentPage === 1} style={styles.paginationButton}>ย้อนกลับ</button>{Array.from({length: totalPagesFullTable}, (_, i) => (<button key={i+1} onClick={() => paginate(i+1)} style={{...styles.paginationButton, ...(currentPage === i+1 ? styles.paginationButtonActive : {})}}>{i+1}</button>))}<button onClick={nextPage} disabled={currentPage === totalPagesFullTable} style={styles.paginationButton}>ถัดไป</button></div>)}</div>)}
              {currentFullTableRankings.length > 0 ? (<div style={styles.rankingTableWrapper}><table style={styles.rankingTable}><thead><tr><th style={styles.tableHeader}>Rank</th><th style={styles.tableHeader}>Name</th><th style={styles.tableHeader}>Skill Level</th><th style={styles.tableHeader}>Games Lost</th><th style={styles.tableHeader}>Games Tied</th><th style={styles.tableHeader}>Games Won</th><th style={styles.tableHeader}>Total Score</th><th style={styles.tableHeader}>Win Rate (%)</th></tr></thead><tbody>{currentFullTableRankings.map((player, index) => { const rank = indexOfFirstItemFullTable + index + 1; const isTop3 = rank <= 3; return (<tr key={player.name} style={isTop3 ? {...styles.tableRow, ...styles.top3TableRow} : styles.tableRow}><td style={isTop3 ? {...styles.tableCell, ...styles.top3TableCell} : styles.tableCell}><span style={isTop3 ? {...styles.tableRankNumber, color: rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : '#cd7f32'} : styles.tableRankNumber}>{rank}</span></td><td style={isTop3 ? {...styles.tableCell, ...styles.top3TableCell} : styles.tableCell}>{player.name}</td><td style={isTop3 ? {...styles.tableCell, ...styles.top3TableCell} : styles.tableCell}>{player.level}</td><td style={isTop3 ? {...styles.tableCell, ...styles.top3TableCell} : styles.tableCell}>{player.losses}</td><td style={isTop3 ? {...styles.tableCell, ...styles.top3TableCell} : styles.tableCell}>{player.draws}</td><td style={isTop3 ? {...styles.tableCell, ...styles.top3TableCell} : styles.tableCell}>{player.wins}</td><td style={isTop3 ? {...styles.tableCell, ...styles.top3TableCell} : styles.tableCell}>{player.score}</td><td style={isTop3 ? {...styles.tableCell, ...styles.top3TableCell} : styles.tableCell}>{player.winRate}%</td></tr>); })}</tbody></table></div>) : (<div style={styles.messageBoxInfo}><p>ไม่มีข้อมูลผู้เล่นในตาราง</p></div>)}
            </>
          )}
        </>
      ) : (
        <div style={styles.messageBoxInfo}><p>ไม่มีข้อมูลการจัดอันดับสำหรับเดือนและปีที่เลือก</p></div>
      )}
    </div>
  );
};

// --- Styles (เพิ่ม style ของปุ่มดาวน์โหลดเข้ามา) ---
const styles = {
  // ... (all previous styles remain the same)
  container: { padding: "20px", backgroundColor: "#1a1d24", color: "#e0e0e0", minHeight: "100vh", fontFamily: "'Kanit', sans-serif", },
  rankingHeroSection: { textAlign: "center", padding: "15px 20px", backgroundColor: "#242831", borderRadius: "12px", marginBottom: "30px", boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)", border: "1px solid #333", position: "relative", overflow: "hidden", },
  rankingPageTitle: { margin: "0 0 8px 0", fontSize: "2rem", fontWeight: "600", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", textShadow: "0 0 10px rgba(77, 181, 255, 0.5)", },
  titleIcon: { color: "#ffd700", fontSize: "2.3rem", filter: "drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))", },
  rankingSubtitle: { margin: "0 0 15px 0", fontSize: "1rem", color: "#b0b8c4", },
  highlightText: { color: "#4db5ff", fontWeight: "500", textShadow: "0 0 5px rgba(77, 181, 255, 0.3)", },
  filterControls: { display: "flex", justifyContent: "center", alignItems: "center", gap: "15px", flexWrap: "wrap", },
  filterItem: { display: "flex", alignItems: "center", },
  selectControl: { padding: "10px 15px", backgroundColor: "#2c313a", color: "#e0e0e0", border: "1px solid #444", borderRadius: "8px", fontSize: "1rem", cursor: "pointer", minWidth: "200px", textAlign: "center", transition: "all 0.3s ease", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23b0b8c4' class='bi bi-chevron-down' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", },
  displayModeButtons: { display: "flex", gap: "10px", },
  displayModeButton: { padding: "10px", backgroundColor: "#333842", color: "#e0e0e0", border: "1px solid #555", borderRadius: "8px", cursor: "pointer", transition: "background-color 0.3s ease, transform 0.2s ease", display: "flex", alignItems: "center", justifyContent: "center", "&:hover": { backgroundColor: "#444c5a", transform: "translateY(-1px)", }, },
  displayModeButtonActive: { backgroundColor: "#4db5ff", color: "#1a1d24", borderColor: "#4db5ff", boxShadow: "0 0 8px rgba(77, 181, 255, 0.4)", },
  displayLimitButtons: { display: "flex", gap: "10px", },
  displayLimitButton: { padding: "10px 15px", backgroundColor: "#333842", color: "#e0e0e0", border: "1px solid #555", borderRadius: "8px", cursor: "pointer", transition: "background-color 0.3s ease, transform 0.2s ease", fontSize: "0.95rem", "&:hover": { backgroundColor: "#444c5a", transform: "translateY(-1px)", }, "&:disabled": { backgroundColor: "#2c313a", color: "#666", cursor: "not-allowed", transform: "none", }, },
  displayLimitButtonActive: { backgroundColor: "#4db5ff", color: "#1a1d24", borderColor: "#4db5ff", fontWeight: "bold", boxShadow: "0 0 8px rgba(77, 181, 255, 0.4)", },
  // --- Style สำหรับปุ่มดาวน์โหลด ---
  downloadButton: {
    padding: "10px 15px",
    backgroundColor: "#4DB5FF", // สีเขียว
    color: "#e0e0e0",
    border: "1px solid #4DB5FF",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.3s ease, transform 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "500",
    fontSize: "0.95rem",
    "&:hover": {
        backgroundColor: '#239a45',
        transform: 'translateY(-1px)',
    }
  },
  loadingState: { textAlign: "center", padding: "50px", fontSize: "1.2rem", color: "#b0b8c4", },
  loadingSpinner: { border: "4px solid rgba(255, 255, 255, 0.2)", borderTop: "4px solid #4db5ff", borderRadius: "50%", width: "40px", height: "40px", animation: "spin 1s linear infinite", margin: "0 auto 20px auto", },
  messageBoxError: { textAlign: "center", padding: "20px", backgroundColor: "#4a2a2a", color: "#ffc0c0", borderRadius: "8px", border: "1px solid #8B0000", },
  messageBoxInfo: { textAlign: "center", padding: "20px", backgroundColor: "#2c313a", color: "#b0b8c4", borderRadius: "8px", },
  top3CardsWrapper: { display: "flex", justifyContent: "center", alignItems: "flex-end", gap: "10px", marginBottom: "20px", flexWrap: "wrap", marginTop: "20px", },
  playerCardElite: { backgroundColor: "#2c313a", borderRadius: "16px", padding: "8px 12px", textAlign: "center", color: "#fff", border: "2px solid transparent", transition: "transform 0.3s ease, box-shadow 0.3s ease", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", "&:hover": { transform: "translateY(-5px) scale(1.01)", boxShadow: "0 8px 20px rgba(0, 0, 0, 0.4)", }, },
  rank1CardElite: { width: "200px", height: "auto", order: 2, transform: "scale(1.02)", zIndex: 2, borderColor: "#ffd700", boxShadow: "0 0 15px rgba(255, 215, 0, 0.4)", background: "linear-gradient(145deg, #2c313a, #3a404a)", },
  rank2CardElite: { width: "180px", height: "auto", order: 1, zIndex: 1, borderColor: "#c0c0c0", boxShadow: "0 0 12px rgba(192, 192, 192, 0.3)", background: "linear-gradient(145deg, #2c313a, #353b42)", },
  rank3CardElite: { width: "180px", height: "auto", order: 3, zIndex: 1, borderColor: "#cd7f32", boxShadow: "0 0 12px rgba(205, 127, 50, 0.3)", background: "linear-gradient(145deg, #2c313a, #353b42)", },
  cardGlowEffect: { position: "absolute", top: "-50%", left: "-50%", width: "200%", height: "200%", background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)", animation: "glow-rotate 10s linear infinite", opacity: 0.2, },
  cardPatternIconElite: { position: "absolute", top: "5px", right: "5px", fontSize: "1.2rem", opacity: "0.4", pointerEvents: "none", },
  playerRankIconOnly: { marginBottom: "5px", },
  crownIconElite: { fontSize: "1.8rem", color: "#ffd700", filter: "drop-shadow(0 0 7px rgba(255, 215, 0, 0.6))", },
  rankIconElite: { fontSize: "1.6rem", filter: "drop-shadow(0 0 6px rgba(0, 0, 0, 0.4))", },
  playerCardNameElite: { fontSize: "1rem", fontWeight: "700", margin: "2px 0", textShadow: "0 0 3px rgba(0, 0, 0, 0.4)", },
  playerCardLevelElite: { fontSize: "0.7rem", backgroundColor: "rgba(0, 0, 0, 0.4)", padding: "2px 6px", borderRadius: "12px", margin: "2px 0 6px 0", color: "#e0e0e0", },
  playerCardScoreLargestElite: { fontSize: "1.7rem", fontWeight: "bold", margin: "0", color: "#ffd700", textShadow: "0 0 8px rgba(255, 215, 0, 0.6)", },
  playerCardScoreLargeElite: { fontSize: "1.4rem", fontWeight: "bold", margin: "0", color: "#fff", textShadow: "0 0 6px rgba(0, 0, 0, 0.5)", },
  sparkleOverlay: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", background: "url(/sparkle.gif) center center / cover no-repeat", opacity: 0.15, zIndex: 1, },
  playerCardStatsElite: { marginTop: "6px", width: "90%", display: "flex", flexDirection: "column", gap: "2px", color: "rgba(255, 255, 255, 0.9)", fontSize: "0.75rem", },
  statItemElite: { display: "flex", justifyContent: "space-between", margin: 0, padding: "2px 6px", borderRadius: "6px", backgroundColor: "rgba(0, 0, 0, 0.25)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.15)", },
  statItemEliteFull: { display: "flex", justifyContent: "space-between", margin: "3px 0 0 0", padding: "3px 8px", backgroundColor: "#4db5ff", color: "#1a1d24", fontWeight: "bold", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", },
  tableControlsWrapper: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 0", flexWrap: "wrap", gap: "15px", backgroundColor: "#242831", borderRadius: "12px", marginBottom: "15px", padding: "15px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)", },
  searchBar: { display: "flex", alignItems: "center", backgroundColor: "#333842", borderRadius: "8px", padding: "6px 12px", flex: "1 1 250px", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)", },
  searchIcon: { color: "#8892b0", marginRight: "10px", fontSize: "1.1rem", },
  searchInput: { backgroundColor: "transparent", border: "none", color: "#e0e0e0", outline: "none", width: "100%", fontSize: "0.95rem", "&::placeholder": { color: "#8892b0", }, },
  totalMembers: { color: "#b0b8c4", flex: "1 1 auto", textAlign: "center", fontSize: "1rem", },
  totalCount: { fontWeight: "bold", color: "#4db5ff", fontSize: "1.1rem", },
  pagination: { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "6px", flex: "1 1 250px", },
  paginationButton: { padding: "8px 14px", backgroundColor: "#333842", color: "#e0e0e0", border: "1px solid #555", borderRadius: "6px", cursor: "pointer", transition: "background-color 0.3s ease, transform 0.2s ease", fontSize: "0.9rem", "&:hover": { backgroundColor: "#444c5a", transform: "translateY(-1px)", }, "&:disabled": { backgroundColor: "#2c313a", color: "#666", cursor: "not-allowed", transform: "none", }, },
  paginationButtonActive: { backgroundColor: "#4db5ff", color: "#1a1d24", borderColor: "#4db5ff", fontWeight: "bold", boxShadow: "0 0 8px rgba(77, 181, 255, 0.4)", },
  rankingTableWrapper: { overflowX: "auto", backgroundColor: "#242831", borderRadius: "12px", padding: "10px", boxShadow: "0 8px 20px rgba(0, 0, 0, 0.25)", },
  rankingTable: { width: "100%", borderCollapse: "collapse", },
  tableHeader: { padding: "14px 12px", textAlign: "left", borderBottom: "2px solid #4db5ff", color: "#ffffff", textTransform: "uppercase", fontSize: "0.9rem", fontWeight: "600", backgroundColor: "#2c313a", },
  tableRow: { borderBottom: "1px solid #333", transition: "background-color 0.2s ease", "&:last-child": { borderBottom: "none", }, "&:hover": { backgroundColor: "rgba(77, 181, 255, 0.08)", }, },
  top3TableRow: { backgroundColor: "rgba(77, 181, 255, 0.15)", border: "1px solid #4db5ff", boxShadow: "0 0 5px rgba(77, 181, 255, 0.2)", },
  tableCell: { padding: "12px", color: "#b0b8c4", fontSize: "0.85rem", },
  top3TableCell: { color: "#ffffff", fontWeight: "bold", },
  tableRankNumber: { fontWeight: "bold", color: "#e0e0e0", fontSize: "1rem", textShadow: "0 0 3px rgba(0, 0, 0, 0.2)", },
};

export default Ranking;

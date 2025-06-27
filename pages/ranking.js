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
import { FaTrophy, FaCrown, FaSearch, FaMedal } from "react-icons/fa"; // เพิ่ม FaMedal

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

  // แยกอันดับ 1, 2, 3
  const top3Rankings = filteredRankings.slice(0, 3);
  const otherRankings = filteredRankings.slice(3); // อันดับที่เหลือ

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
            <label htmlFor="month-select" style={{ display: 'none' }}>
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
            <label htmlFor="year-select" style={{ display: 'none' }}>
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
          {/* --- Top 3 Rankings Section --- */}
          <div style={styles.top3CardsWrapper}>
            {/* Rank 2 Card */}
            {top3Rankings[1] && (
              <div
                key={top3Rankings[1].name}
                style={{ ...styles.playerCardElite, ...styles.silverCard, ...styles.rank2CardElite }}
              >
                <div style={styles.cardGlowEffect}></div> {/* Glow effect */}
                <span style={styles.cardPatternIconElite}>🥈</span> {/* เปลี่ยนไอคอน */}
                {/* Removed playerRankNumberCircleElite for Rank 2 */}
                <div style={styles.playerRankIconOnly}>
                    <FaMedal style={{ ...styles.rankIconElite, color: '#A9A9A9' }} /> {/* ไอคอนเหรียญ */}
                </div>
                <h3 style={styles.playerCardNameElite}>{top3Rankings[1].name}</h3>
                <p style={styles.playerCardLevelElite}>ระดับ: {top3Rankings[1].level}</p>
                <p style={styles.playerCardScoreLargeElite}>{top3Rankings[1].score || 0}</p>
              </div>
            )}

            {/* Rank 1 Card (Center, Largest) */}
            {top3Rankings[0] && (
              <div
                key={top3Rankings[0].name}
                style={{ ...styles.playerCardElite, ...styles.goldCard, ...styles.rank1CardElite }}
              >
                <div style={styles.cardGlowEffect}></div> {/* Glow effect */}
                <span style={styles.cardPatternIconElite}>🥇</span> {/* เปลี่ยนไอคอน */}
                {/* Removed playerRankNumberCircleElite for Rank 1 */}
                <div style={styles.playerRankIconOnly}>
                    <FaCrown style={styles.crownIconElite} />
                </div>
                <h3 style={styles.playerCardNameElite}>{top3Rankings[0].name}</h3>
                <p style={styles.playerCardLevelElite}>ระดับ: {top3Rankings[0].level}</p>
                <p style={styles.playerCardScoreLargestElite}>{top3Rankings[0].score || 0}</p>
                <div style={styles.sparkleOverlay}></div> {/* เพิ่มประกาย */}
              </div>
            )}

            {/* Rank 3 Card */}
            {top3Rankings[2] && (
              <div
                key={top3Rankings[2].name}
                style={{ ...styles.playerCardElite, ...styles.bronzeCard, ...styles.rank3CardElite }}
              >
                <div style={styles.cardGlowEffect}></div> {/* Glow effect */}
                <span style={styles.cardPatternIconElite}>🥉</span> {/* เปลี่ยนไอคอน */}
                {/* Removed playerRankNumberCircleElite for Rank 3 */}
                <div style={styles.playerRankIconOnly}>
                    <FaMedal style={{ ...styles.rankIconElite, color: '#CD7F32' }} /> {/* ไอคอนเหรียญ */}
                </div>
                <h3 style={styles.playerCardNameElite}>{top3Rankings[2].name}</h3>
                <p style={styles.playerCardLevelElite}>ระดับ: {top3Rankings[2].level}</p>
                <p style={styles.playerCardScoreLargeElite}>{top3Rankings[2].score || 0}</p>
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
                    setCurrentPage(1); // Reset to first page on search
                  }}
                  style={styles.searchInput}
                  aria-label="Search Player Name"
                />
              </div>

              {/* Total Members - Center (Adjusted position) */}
              <div style={styles.totalMembers}>
                สมาชิกทั้งหมด:{" "}
                <span style={styles.totalCount}>{filteredRankings.length}</span>{" "}
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
                    ย้อนกลับ
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => paginate(i + 1)}
                      style={{
                        ...styles.paginationButton,
                        ...(currentPage === i + 1 ? styles.paginationButtonActive : {}),
                      }}
                      aria-label={`Page ${i + 1}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    style={styles.paginationButton}
                    aria-label="Next Page"
                  >
                    ถัดไป
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
                      <td style={styles.tableCell}>{player.level || "-"}</td>
                      <td style={styles.tableCell}>{player.losses || 0}</td>
                      <td style={styles.tableCell}>{player.draws || 0}</td>
                      <td style={styles.tableCell}>{player.wins || 0}</td>
                      <td style={styles.tableCell}>{player.score || 0}</td> {/* Add score column as per image */}
                      <td style={styles.tableCell}>{player.winRate || "0.00"}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.messageBoxInfo}>
              <p>ไม่พบผู้เล่นที่ตรงกับคำค้นหาของคุณในเดือนนี้</p>
            </div>
          )}
        </>
      ) : (
        // --- No data or not logged in message ---
        <div style={styles.messageBoxInfo}>
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
  );
};

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#1C1C28', // Dark background as in the image
    color: '#E0E0E0',
    padding: '30px 20px',
    minHeight: '100vh',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    // backgroundImage: 'url("/path/to/your/background-pattern.png")', // If you have a background pattern
  },
  rankingHeroSection: {
    textAlign: 'center',
    marginBottom: '40px',
    width: '100%',
    maxWidth: '1200px',
  },
  rankingPageTitle: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#F0F0F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  titleIcon: {
    color: '#FFD700', // Gold color for trophy
    fontSize: '2.8rem',
  },
  rankingSubtitle: {
    fontSize: '1.2rem',
    color: '#B0B0B0',
    marginBottom: '20px',
  },
  highlightText: {
    color: '#FFD700', // Gold highlight
    fontWeight: 'bold',
  },
  filterControls: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    marginBottom: '30px',
  },
  filterItem: {
    display: 'flex',
    alignItems: 'center',
  },
  selectControl: {
    padding: '10px 15px',
    borderRadius: '8px',
    border: '1px solid #444',
    backgroundColor: '#2A2A3A',
    color: '#E0E0E0',
    fontSize: '1rem',
    cursor: 'pointer',
    appearance: 'none', // Remove default dropdown arrow
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23E0E0E0'%3E%3Cpath fillRule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clipRule='evenodd'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    backgroundSize: '1.2em',
    transition: 'border-color 0.3s ease, background-color 0.3s ease',
    '&:hover': {
      borderColor: '#666',
      backgroundColor: '#3A3A4A',
    },
    '&:focus': {
      outline: 'none',
      borderColor: '#FFD700',
      boxShadow: '0 0 0 2px rgba(255, 215, 0, 0.3)',
    },
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    color: '#B0B0B0',
  },
  loadingSpinner: {
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTop: '4px solid #FFD700',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    marginBottom: '15px',
  },
  '@keyframes spin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
  messageBoxError: {
    backgroundColor: '#D32F2F',
    color: '#FFFFFF',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
    width: '100%',
    maxWidth: '600px',
    margin: '20px auto',
  },
  messageBoxInfo: {
    backgroundColor: '#2196F3',
    color: '#FFFFFF',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
    width: '100%',
    maxWidth: '600px',
    margin: '20px auto',
  },
  top3CardsWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end', // Align cards at the bottom for podium effect
    gap: '8px', // ลด gap ลงไปอีก
    marginBottom: '40px',
    flexWrap: 'wrap',
    width: '100%',
    maxWidth: '1200px',
  },
  playerCardElite: { // เปลี่ยนชื่อจาก Slim เป็น Elite เพื่อสื่อถึงความพรีเมียม
    borderRadius: '18px', // เพิ่มความโค้งมนเล็กน้อย
    padding: '25px 12px', // เพิ่ม padding แนวตั้ง ลดแนวนอนอีก
    width: 'calc(20% - 8px)', // ลดความกว้างลงอย่างมาก
    minWidth: '160px', // ปรับ min-width ให้รองรับการ์ดที่แคบลง
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(255,255,255,0.15)', // เพิ่มเงา
    transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s ease, filter 0.4s ease',
    cursor: 'pointer',
    zIndex: 1, // กำหนด zIndex พื้นฐาน
    '&:hover': {
      transform: 'translateY(-12px) scale(1.03) rotateZ(1.5deg)', // Hover effect ที่โดดเด่นขึ้น
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), inset 0 0 25px rgba(255,255,255,0.3)',
      filter: 'brightness(1.2)', // เพิ่มความสว่างชัดเจน
    },
    // เพิ่มเอฟเฟกต์แสงวิบวับรอบการ์ด
    '&::before': {
      content: '""',
      position: 'absolute',
      top: '-50%',
      left: '-50%',
      width: '200%',
      height: '200%',
      background: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
      opacity: 0,
      transition: 'opacity 0.4s ease',
      zIndex: 0,
    },
    '&:hover::before': {
      opacity: 1,
      animation: 'cardLightSweep 2s infinite linear',
    }
  },
  '@keyframes cardLightSweep': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
  cardGlowEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 'inherit',
    boxShadow: '0 0 30px rgba(255,215,0,0.5), inset 0 0 15px rgba(255,215,0,0.3)', // Default glow
    opacity: 0,
    transition: 'opacity 0.4s ease',
    zIndex: 0,
  },
  'playerCardElite:hover .cardGlowEffect': {
    opacity: 1,
  },
  cardPatternIconElite: { // ไอคอนตกแต่งด้านบน
    position: 'absolute',
    top: '10px',
    right: '10px',
    fontSize: '35px',
    opacity: '0.25',
    zIndex: 0,
    pointerEvents: 'none',
    textShadow: '0 0 5px rgba(255,255,255,0.5)',
  },
  goldCard: {
    background: 'linear-gradient(160deg, #FFD700 0%, #DAA520 60%, #B8860B 100%)', // Gradient ที่เข้มขึ้น
    color: '#3A2B00', // สีตัวอักษรเข้มขึ้น
    border: '2px solid #FFECB3', // ขอบหนาขึ้น
    boxShadow: '0 12px 30px rgba(255,215,0,0.4), inset 0 0 20px rgba(255,215,0,0.2)', // เงาสีทอง
  },
  silverCard: {
    background: 'linear-gradient(160deg, #C0C0C0 0%, #A9A9A9 60%, #7F8C8D 100%)',
    color: '#303030',
    border: '2px solid #E0E0E0',
    boxShadow: '0 12px 30px rgba(192,192,192,0.4), inset 0 0 20px rgba(192,192,192,0.2)',
  },
  bronzeCard: {
    background: 'linear-gradient(160deg, #CD7F32 0%, #8B4513 60%, #603E19 100%)',
    color: '#402000',
    border: '2px solid #FFCC99',
    boxShadow: '0 12px 30px rgba(205,127,50,0.4), inset 0 0 20px rgba(205,127,50,0.2)',
  },
  // Podium specific sizes (Elite)
  rank1CardElite: {
    width: 'calc(24% - 8px)', // อันดับ 1 กว้างขึ้นเล็กน้อย แต่ยังคง "แคบ"
    height: '320px', // กำหนดความสูงให้ชัดเจน
    transform: 'translateY(-25px)', // ยกสูงขึ้นมาก
    zIndex: 3,
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255,215,0,0.7), inset 0 0 30px rgba(255,215,0,0.4)', // เงาอลังการ
    animation: 'pulseGold 2s infinite ease-in-out', // เพิ่ม animation
    '&:hover': {
        transform: 'translateY(-35px) scale(1.05) rotateZ(0deg)', // Hover effect ที่โดดเด่นขึ้น
    }
  },
  '@keyframes pulseGold': {
    '0%': { transform: 'translateY(-25px) scale(1)', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255,215,0,0.7), inset 0 0 30px rgba(255,215,0,0.4)' },
    '50%': { transform: 'translateY(-28px) scale(1.005)', boxShadow: '0 30px 60px rgba(0, 0, 0, 0.9), 0 0 50px rgba(255,215,0,0.9), inset 0 0 35px rgba(255,215,0,0.5)' },
    '100%': { transform: 'translateY(-25px) scale(1)', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255,215,0,0.7), inset 0 0 30px rgba(255,215,0,0.4)' },
  },
  rank2CardElite: {
    height: '280px', // กำหนดความสูง
    transform: 'translateY(-15px)', // ยกสูงขึ้น
    zIndex: 2,
    '&:hover': {
        transform: 'translateY(-20px) scale(1.03) rotateZ(1.5deg)',
    }
  },
  rank3CardElite: {
    height: '280px', // ปรับความสูงให้เท่ากับอันดับ 2 เพื่อให้ข้อมูลแสดงครบถ้วน
    transform: 'translateY(-5px)', // ยกสูงขึ้นเล็กน้อย
    zIndex: 1,
    '&:hover': {
        transform: 'translateY(-10px) scale(1.03) rotateZ(1.5deg)',
    }
  },
  playerRankIconOnly: { // New style for icon without a large background circle
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '10px',
    position: 'relative',
    // No explicit width/height or background for a large circle
  },
  rankIconElite: { // ไอคอนเหรียญสำหรับอันดับ 2, 3
    fontSize: '3.5rem', // Increased size to be more prominent without circle
    filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.6))',
  },
  crownIconElite: {
    fontSize: '4rem', // ขยายขนาดมงกุฎให้ใหญ่ขึ้นอีก
    color: '#FFD700',
    zIndex: 2,
    filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.7))', // เพิ่มเงา
  },
  playerCardNameElite: {
    fontSize: '1.6rem', // ขยายชื่อ
    fontWeight: 'bold',
    marginBottom: '8px',
    color: 'inherit',
    zIndex: 1,
    textShadow: '1px 1px 2px rgba(0,0,0,0.25)',
  },
  playerCardLevelElite: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // เข้มขึ้นเล็กน้อย
    padding: '8px 15px', // เพิ่ม padding
    borderRadius: '20px',
    fontSize: '1.1rem', // ขยายขนาด
    fontWeight: 'bold',
    color: 'inherit',
    textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.15)',
    marginBottom: '12px',
  },
  playerCardScoreLargeElite: {
    fontSize: '2rem', // ขยายขนาดคะแนน
    fontWeight: 'extrabold',
    color: 'inherit',
    textShadow: '2px 2px 3px rgba(0,0,0,0.35)',
    marginTop: 'auto',
  },
  playerCardScoreLargestElite: {
    fontSize: '3rem', // ขยายขนาดคะแนนอันดับ 1
    fontWeight: 'extrabold',
    color: 'inherit',
    textShadow: '3px 3px 5px rgba(0,0,0,0.5)',
    marginTop: 'auto',
  },
  sparkleOverlay: { // เอฟเฟกต์ประกายสำหรับ Rank 1
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Cdefs%3E%3CradialGradient id=\'grad1\' cx=\'50%\' cy=\'50%\' r=\'50%\'%3E%3Cstop offset=\'0%\' stop-color=\'%23FFFFFF\' stop-opacity=\'1\'/%3E%3Cstop offset=\'100%\' stop-color=\'%23FFFFFF\' stop-opacity=\'0\'/%3E%3C/radialGradient%3E%3C/defs%3E%3Cg opacity=\'0.2\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'10\' fill=\'url(%23grad1)\'/%3E%3Ccircle cx=\'80\' cy=\'20\' r=\'10\' fill=\'url(%23grad1)\'/%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'15\' fill=\'url(%23grad1)\'/%3E%3Ccircle cx=\'20\' cy=\'80\' r=\'10\' fill=\'url(%23grad1)\'/%3E%3Ccircle cx=\'80\' cy=\'80\' r=\'10\' fill=\'url(%23grad1)\'/%3E%3C/g%3E%3C/svg%3E")',
    backgroundSize: '150% 150%',
    backgroundRepeat: 'repeat',
    opacity: 0.15,
    animation: 'sparkleMove 15s infinite linear',
    zIndex: 0,
    pointerEvents: 'none',
  },
  '@keyframes sparkleMove': {
    '0%': { backgroundPosition: '0% 0%' },
    '100%': { backgroundPosition: '100% 100%' },
  },

  tableControlsWrapper: {
    backgroundColor: '#282838',
    borderRadius: '12px',
    padding: '20px 30px',
    marginBottom: '25px',
    width: '100%',
    maxWidth: '1200px',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#3A3A4A',
    borderRadius: '8px',
    padding: '8px 15px',
    flexGrow: 1,
    maxWidth: '350px',
  },
  searchIcon: {
    color: '#A0A0B0',
    marginRight: '10px',
    fontSize: '1.1rem',
  },
  searchInput: {
    background: 'none',
    border: 'none',
    color: '#E0E0E0',
    fontSize: '1rem',
    width: '100%',
    '&:focus': {
      outline: 'none',
    },
    '::placeholder': {
      color: '#A0A0B0',
    },
  },
  totalMembers: {
    fontSize: '1.1rem',
    color: '#B0B0C0',
    whiteSpace: 'nowrap',
  },
  totalCount: {
    fontWeight: 'bold',
    color: '#FFD700',
  },
  pagination: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  paginationButton: {
    background: '#4A4A5A',
    color: '#E0E0E0',
    border: 'none',
    padding: '8px 15px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    transition: 'background-color 0.3s ease',
    '&:hover': {
      backgroundColor: '#5A5A6A',
    },
    '&:disabled': {
      opacity: '0.5',
      cursor: 'not-allowed',
    },
  },
  paginationButtonActive: {
    background: '#FFD700',
    color: '#333',
    fontWeight: 'bold',
    '&:hover': {
      backgroundColor: '#FFC800',
    },
  },
  rankingTableWrapper: {
    backgroundColor: '#282838',
    borderRadius: '12px',
    overflowX: 'auto',
    width: '100%',
    maxWidth: '1200px',
    boxSizing: 'border-box',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
  },
  rankingTable: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0 8px',
    padding: '0 15px',
  },
  tableHeader: {
    backgroundColor: '#3A3A4A',
    padding: '15px 10px',
    textAlign: 'left',
    color: '#A0A0B0',
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    borderBottom: '1px solid #4A4A5A',
    whiteSpace: 'nowrap',
    '&:first-child': {
      borderTopLeftRadius: '8px',
    },
    '&:last-child': {
      borderTopRightRadius: '8px',
    },
  },
  tableRow: {
    backgroundColor: '#2F2F3F',
    transition: 'background-color 0.2s ease',
    '&:hover': {
      backgroundColor: '#3A3A4A',
    },
    marginBottom: '8px',
  },
  tableCell: {
    padding: '12px 10px',
    color: '#E0E0E0',
    fontSize: '0.95rem',
    borderBottom: '1px solid #3A3A4A',
    whiteSpace: 'nowrap',
  },
  tableRankNumber: {
    fontWeight: 'bold',
    color: '#FFD700',
  },

  // Responsive adjustments
  '@media (max-width: 1024px)': {
    playerCardElite: {
      width: 'calc(40% - 8px)', // ปรับความกว้างสำหรับการ์ด 2 ใบต่อแถว
      minWidth: '170px',
      padding: '20px 10px',
    },
    rank1CardElite: {
      width: 'calc(50% - 8px)', // อันดับ 1 กว้างขึ้นเล็กน้อย
      height: '300px',
    },
    rank2CardElite: {
        width: 'calc(40% - 8px)',
        height: '260px',
    },
    rank3CardElite: {
        width: 'calc(40% - 8px)',
        height: '260px', // ปรับความสูงให้เท่ากับอันดับ 2
    },
    top3CardsWrapper: {
        flexDirection: 'column',
        alignItems: 'center',
    },
    rank2CardElite: {
        order: 2,
    },
    rank1CardElite: {
        order: 1,
    },
    rank3CardElite: {
        order: 3,
    },
    playerRankIconOnly: {
        // Adjusted for smaller screens if needed
    },
    crownIconElite: {
      fontSize: '3.5rem', // Adjusted size
    },
    rankIconElite: { // Adjusted size
      fontSize: '3rem',
    },
    playerCardNameElite: {
      fontSize: '1.4rem',
    },
    playerCardLevelElite: {
      fontSize: '1rem',
    },
    playerCardScoreLargeElite: {
      fontSize: '1.8rem',
    },
    playerCardScoreLargestElite: {
      fontSize: '2.5rem',
    },
  },
  '@media (max-width: 768px)': {
    rankingPageTitle: {
      fontSize: '2rem',
    },
    titleIcon: {
      fontSize: '2.2rem',
    },
    rankingSubtitle: {
      fontSize: '1rem',
    },
    filterControls: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    selectControl: {
      width: '100%',
    },
    top3CardsWrapper: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: '15px',
    },
    playerCardElite: {
      width: '90%',
      padding: '18px 10px',
      minWidth: 'unset',
      transform: 'none !important',
      boxShadow: '0 6px 12px rgba(0, 0, 0, 0.3), inset 0 0 8px rgba(255,255,255,0.08)',
      '&:hover': {
        transform: 'scale(1.01) !important',
        boxShadow: '0 10px 20px rgba(0, 0, 0, 0.4), inset 0 0 12px rgba(255,255,255,0.1)',
      },
      animation: 'none',
      '&::before': { display: 'none' }, // ซ่อน light sweep
    },
    rank1CardElite: {
        width: '95%',
        height: '280px',
        marginBottom: '10px',
    },
    rank2CardElite: {
        width: '90%',
        height: '240px',
        marginBottom: '10px',
    },
    rank3CardElite: {
        width: '90%',
        height: '240px', // ปรับความสูงให้เท่ากับอันดับ 2
        marginBottom: '10px',
    },
    playerRankIconOnly: {
        // Adjusted for smaller screens if needed
    },
    crownIconElite: {
      fontSize: '3rem', // Adjusted size
    },
    rankIconElite: { // Adjusted size
      fontSize: '2.5rem',
    },
    playerCardNameElite: {
      fontSize: '1.2rem',
    },
    playerCardLevelElite: {
      fontSize: '0.9rem',
      padding: '6px 10px',
    },
    playerCardScoreLargeElite: {
      fontSize: '1.6rem',
    },
    playerCardScoreLargestElite: {
      fontSize: '2.2rem',
    },
    tableControlsWrapper: {
      flexDirection: 'column',
      alignItems: 'stretch',
      padding: '15px 20px',
    },
    searchBar: {
      maxWidth: '100%',
    },
    pagination: {
      justifyContent: 'center',
    },
    tableHeader: {
      padding: '10px 8px',
      fontSize: '0.8rem',
    },
    tableCell: {
      padding: '10px 8px',
      fontSize: '0.85rem',
    },
  },
  '@media (max-width: 480px)': {
    container: {
      padding: '15px 10px',
    },
    rankingPageTitle: {
      fontSize: '1.6rem',
    },
    titleIcon: {
      fontSize: '1.8rem',
    },
    rankingSubtitle: {
      fontSize: '0.9rem',
    },
    playerCardElite: {
      width: '100%',
      padding: '15px 10px',
    },
    rank1CardElite: {
        width: '100%',
        height: '260px',
    },
    rank2CardElite: {
        width: '100%',
        height: '220px',
    },
    rank3CardElite: {
        width: '100%',
        height: '220px', // ปรับความสูงให้เท่ากับอันดับ 2
    },
    playerRankIconOnly: {
        // Adjusted for smaller screens if needed
    },
    crownIconElite: {
      fontSize: '2.5rem', // Adjusted size
    },
    rankIconElite: { // Adjusted size
      fontSize: '2rem',
    },
    playerCardNameElite: {
      fontSize: '1rem',
    },
    playerCardLevelElite: {
      fontSize: '0.75rem',
      padding: '5px 8px',
    },
    playerCardScoreLargeElite: {
      fontSize: '1.4rem',
    },
    playerCardScoreLargestElite: {
      fontSize: '1.9rem',
    },
    rankingTableWrapper: {
        padding: '0',
    },
    rankingTable: {
        padding: '0 5px',
        borderSpacing: '0 5px',
    },
    tableHeader: {
      fontSize: '0.7rem',
      padding: '6px 4px',
    },
    tableCell: {
      fontSize: '0.72rem',
      padding: '6px 4px',
    },
    paginationButton: {
      padding: '6px 10px',
      fontSize: '0.8rem',
    },
  },
};

export default Ranking;

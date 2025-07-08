// src/pages/History.js (หรือ pages/History.js ขึ้นอยู่กับโครงสร้างโปรเจกต์ของคุณ)
import React, { useState, useEffect, useCallback } from "react";
import { db } from "../lib/firebaseConfig"; // ตรวจสอบพาธให้ถูกต้อง
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit, // <<< เพิ่ม import นี้: สำคัญสำหรับการจำกัดการอ่านจาก Firebase
  startAfter, // <<< เพิ่ม import นี้: สำคัญสำหรับการดึงหน้าถัดไป
  endBefore, // <<< เพิ่ม import นี้: สำคัญสำหรับการดึงหน้าก่อนหน้า
} from "firebase/firestore";
import Swal from "sweetalert2";
import { useRouter } from "next/router";
import debounce from "lodash.debounce";
import { useMemo } from "react";

const History = () => {
  const router = useRouter();
  const [matches, setMatches] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTopic, setSearchTopic] = useState("");
  const [totalMatches, setTotalMatches] = useState(0); // จะแสดงจำนวนรายการในหน้าปัจจุบันเท่านั้น
  const [loggedInEmail, setLoggedInEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [viewedMatches, setViewedMatches] = useState({});

  const [isBrowser, setIsBrowser] = useState(false);

  // --- START: การเปลี่ยนแปลงสำหรับตัวกรองจำนวนข้อมูล ---
  const [itemsPerPage, setItemsPerPage] = useState(25); // <<< State ใหม่สำหรับจัดการจำนวนรายการต่อหน้า
  // --- END: การเปลี่ยนแปลง ---

  // <<< เพิ่ม State ใหม่สำหรับ Server-side Pagination
  const [firstVisible, setFirstVisible] = useState(null); // DocumentSnapshot ของเอกสารแรกในหน้าปัจจุบัน
  const [lastVisible, setLastVisible] = useState(null); // DocumentSnapshot ของเอกสารสุดท้ายในหน้าปัจจุบัน
  const [hasMoreNext, setHasMoreNext] = useState(false); // มีหน้าถัดไปหรือไม่
  const [hasMorePrev, setHasMorePrev] = useState(false); // มีหน้าก่อนหน้าหรือไม่
  // >>>

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsBrowser(true);
      setLoggedInEmail(localStorage.getItem("loggedInEmail") || "");
      // โหลดสถานะ viewedMatches จาก localStorage เมื่อ component โหลด
      try {
        const storedViewedMatches = JSON.parse(localStorage.getItem("viewedMatches") || "{}");
        setViewedMatches(storedViewedMatches);
      } catch (error) {
        console.error("Failed to parse viewedMatches from localStorage", error);
        setViewedMatches({});
      }
    }
  }, []);
// กำหนดว่าแมตช์จะถือว่าเป็น "ใหม่" ภายในกี่ชั่วโมง
  const NEW_MATCH_THRESHOLD_HOURS = 24; // คุณสามารถปรับค่านี้ได้ตามต้องการ

  // ฟังก์ชันตรวจสอบว่าเป็นแมตช์ใหม่หรือไม่
  const isNewMatch = (match) => {
  if (!match.savedAt) return false;

  let savedDate;
  try {
    savedDate = match.savedAt.toDate(); // <-- แปลงจาก Firestore Timestamp
  } catch {
    savedDate = new Date(match.savedAt); // fallback
  }

  const now = new Date();
  const diffHours = Math.abs(now.getTime() - savedDate.getTime()) / (1000 * 60 * 60);
  return diffHours < NEW_MATCH_THRESHOLD_HOURS && !viewedMatches[match.id];
  };

 // <<< ฟังก์ชัน fetchMatches ถูกแก้ไขเพื่อใช้ itemsPerPage จาก state
 const fetchMatches = useCallback(
  async (direction = "current", cursor = null) => {
    if (!loggedInEmail) return;

    setIsLoading(true);
    try {
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", loggedInEmail));
      const userSnap = await getDocs(userQuery);

      let userId = null;
      userSnap.forEach((doc) => {
        userId = doc.id;
      });

      if (!userId) {
        Swal.fire("ข้อผิดพลาด", "ไม่พบข้อมูลผู้ใช้", "error");
        setMatches([]);
        setTotalMatches(0);
        setIsLoading(false);
        return;
      }

      const userMatchesCollectionRef = collection(db, `users/${userId}/Matches`);

      const trimmedSearch = searchTopic.trim();
      let baseQuery = query(userMatchesCollectionRef, orderBy("savedAt", "desc"));

      if (trimmedSearch) {
        baseQuery = query(
          userMatchesCollectionRef,
          where("topic", ">=", trimmedSearch),
          where("topic", "<=", trimmedSearch + "\uf8ff"),
          orderBy("topic"),
          orderBy("savedAt", "desc")
        );
      }

      let q;
      if (direction === "next" && cursor) {
        q = query(baseQuery, startAfter(cursor), limit(itemsPerPage));
      } else if (direction === "prev" && cursor) {
        q = query(
          userMatchesCollectionRef,
          orderBy("savedAt", "asc"),
          ...(trimmedSearch
            ? [where("topic", ">=", trimmedSearch), where("topic", "<=", trimmedSearch + "\uf8ff")]
            : []),
          startAfter(cursor),
          limit(itemsPerPage)
        );
      } else {
        q = query(baseQuery, limit(itemsPerPage));
      }

      const documentSnapshots = await getDocs(q);
      let fetchedMatches = documentSnapshots.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (direction === "prev") {
        fetchedMatches.reverse();
      }

      setMatches(fetchedMatches);
      setTotalMatches(fetchedMatches.length);

      if (fetchedMatches.length > 0) {
        setFirstVisible(documentSnapshots.docs[0]);
        setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
      } else {
        setFirstVisible(null);
        setLastVisible(null);
      }

      // ตรวจสอบหน้าถัดไป
      const nextCheckQuery = query(
        baseQuery,
        startAfter(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null),
        limit(1)
      );
      const nextSnapshot = await getDocs(nextCheckQuery);
      setHasMoreNext(!nextSnapshot.empty);

      // ตรวจสอบหน้าก่อนหน้า
      const prevCheckQuery = query(
        baseQuery,
        endBefore(documentSnapshots.docs[0] || null),
        limit(1)
      );
      const prevSnapshot = await getDocs(prevCheckQuery);
      setHasMorePrev(!prevSnapshot.empty);
    } catch (error) {
      console.error("Error fetching matches:", error);
      Swal.fire("Error", "ไม่สามารถดึงข้อมูลได้: " + error.message, "error");
      setMatches([]);
      setTotalMatches(0);
    } finally {
      setIsLoading(false);
    }
  },
  [loggedInEmail, searchTopic, itemsPerPage] // <<< เพิ่ม itemsPerPage ใน dependency array
);
  // >>> สิ้นสุดการปรับปรุง fetchMatches


    const debouncedSearch = useMemo(() => debounce((value) => {
  setSearchTopic(value); // update state ที่ผูกกับ query
}, 300), []);

const handleSearchChange = (e) => {
  const value = e.target.value;
  setSearchText(value); // แสดงใน input
  debouncedSearch(value.trim());
};


  // <<< ปรับปรุง useEffect ให้เรียก fetchMatches ด้วย Pagination
  useEffect(() => {
    if (isBrowser && loggedInEmail) {
      setCurrentPage(1); // รีเซ็ตหน้าเป็น 1 เสมอเมื่อ loggedInEmail หรือ searchTopic หรือ itemsPerPage เปลี่ยน
      fetchMatches("current", null); // ดึงข้อมูลหน้าแรก
    }
  }, [loggedInEmail, searchTopic, isBrowser, itemsPerPage, fetchMatches]); // <<< เพิ่ม itemsPerPage และ fetchMatches ใน dependencies
  // >>>

  // <<< ฟังก์ชันเปลี่ยนหน้า
  const goToNextPage = () => {
    if (hasMoreNext) {
      setCurrentPage((prevPage) => prevPage + 1);
      fetchMatches("next", lastVisible);
    }
  };

  const goToPrevPage = () => {
    if (hasMorePrev) {
      setCurrentPage((prevPage) => prevPage - 1);
      fetchMatches("prev", firstVisible);
    }
  };
  // >>>

  // ฟังก์ชันอื่นๆ ที่เหลืออยู่
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) {
          return dateString;
      }
      return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
    } catch (e) {
      console.error("Invalid date string:", dateString, e);
      return dateString;
    }
  };

  const showMatchDetailsInNewTab = (matchId) => {
    // บันทึก matchId ลงใน localStorage เมื่อกดดูรายละเอียด
    const updatedViewedMatches = { ...viewedMatches, [matchId]: true };
    localStorage.setItem("viewedMatches", JSON.stringify(updatedViewedMatches));
    setViewedMatches(updatedViewedMatches); // อัปเดต state เพื่อ re-render
    window.open(`/MatchDetails?matchId=${matchId}`, '_blank');
  };

  return (
    <div className="main-content">
      <h2 className="main-title">ประวัติการจัดก๊วน</h2>
      <hr className="title-separator" />

      {/* Row 1 - Search & Total Matches */}
      <div className="search-and-total-row">
        {/* Left: Search Topic */}
        <div className="search-input-container">
          <input
            type="text"
            placeholder="ค้นหาหัวเรื่อง"
            value={searchText}
            onChange={handleSearchChange}
            className="topic-search-input"
          />
        </div>
        {/* Right: Display total matches */}
        <div className="total-matches-display">
          <span>จำนวน: {totalMatches} กิจกรรม</span>
        </div>
      </div>

      {/* --- START: UI ที่ปรับปรุงใหม่ --- */}
      <div className="history-controls-container">
        {/* Left: Pagination */}
        <div className="pagination-controls">
          <button
            onClick={goToPrevPage}
            disabled={!hasMorePrev || isLoading}
            className="pagination-button"
          >
            ย้อนกลับ
          </button>
          <span className="page-info">หน้า {currentPage}</span>
          <button
            onClick={goToNextPage}
            disabled={!hasMoreNext || isLoading}
            className="pagination-button"
          >
            ถัดไป
          </button>
        </div>

        {/* Right: Per Page Selector */}
        <div className="per-page-selector">
            <label htmlFor="items-per-page">แสดง:</label>
            <select
              id="items-per-page"
              className="per-page-select"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                // ไม่จำเป็นต้องเรียก fetchMatches ที่นี่ เพราะ useEffect จะทำงานเองเมื่อ itemsPerPage เปลี่ยน
              }}
            >
              <option value="10">10 รายการ</option>
              <option value="20">20 รายการ</option>
              <option value="30">30 รายการ</option>
              <option value="50">50 รายการ</option>
            </select>
        </div>
      </div>
      {/* --- END: UI ที่ปรับปรุงใหม่ --- */}


      {/* Row 3 - Matches Table */}
      <div className="table-responsive-container">
        <table className="matches-table">
          <thead>
            <tr>
              <th>วันเดือนปีที่จัด</th>
              <th>หัวเรื่อง</th>
              <th>เวลารวมกิจกรรม</th>
              <th>รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="loading-message">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            )}
            {!isLoading && matches.length === 0 && (
              <tr>
                <td colSpan={4} className="no-data-message">
                  {searchTopic ? "ไม่พบหัวเรื่องที่ค้นหา" : "ไม่พบประวัติการจัดก๊วน"}
                </td>

              </tr>
            )}
            {!isLoading && matches.length > 0 && matches.map((match, idx) => (
              <tr key={match.id || idx} className={idx % 2 === 0 ? "even-row" : "odd-row"}>
                <td>{formatDate(match.matchDate)}</td>
                <td>
                  {match.topic}
                  {isNewMatch(match) && ( // แสดง "(ใหม่)" ถ้าเป็นแมตช์ใหม่
                    <span className="new-match-indicator"> (ใหม่)</span>
                  )}
                </td>
                <td>
                  {match.totalTime ? `${Math.floor(match.totalTime / 60).toString().padStart(2, '0')}:${(match.totalTime % 60).toString().padStart(2, '0')} นาที` : 'N/A'}
                </td>
                <td>
                  <button
                    onClick={() => showMatchDetailsInNewTab(match.id)}
                    className="detail-button"
                  >
                    ดูรายละเอียด
                  </button>
                   {/* เพิ่มการแสดงสถานะ Ranking ตรงนี้ */}
                  {match.hasRankingSaved ? (
                    <div className="ranking-status saved">บันทึก Ranking เรียบร้อย</div>
                  ) : (
                    <div className="ranking-status not-saved">ไม่ได้บันทึก Ranking</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CSS-in-JS using <style jsx> */}
      <style jsx>{`
        /* Global Styles for this component */
        .main-content * {
          font-family: 'Kanit', sans-serif;
          box-sizing: border-box;
        }

        .main-content {
          padding: 28px;
          background-color: #f7f7f7;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .main-title {
          font-size: 18px;
          margin-bottom: 10px;
          color: #333;
        }

        .title-separator {
          border: 0;
          border-top: 1px solid #aebdc9;
          margin-bottom: 18px;
        }

        /* Row 1 - Search and Total Matches */
        .search-and-total-row {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 18px;
          margin-top: 20px;
          margin-bottom: 18px;
          background-color: #ffffff;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        }

        .search-input-container {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-grow: 1;
        }

        .topic-search-input {
          font-size: 13px;
          border: 1px solid #ccc;
          border-radius: 6px;
          padding: 7px 14px;
          min-width: 200px;
          background: #fff;
          flex-grow: 1;
        }

        .total-matches-display {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          font-size: 12px;
          color: #333;
          white-space: nowrap;
        }

        /* --- START: CSS สำหรับส่วนควบคุมที่เพิ่มใหม่ --- */
        .history-controls-container {
            display: flex;
            justify-content: space-between; /* <<< หัวใจของการจัดวาง */
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap; 
            gap: 15px;
        }

        .pagination-controls {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 8px;
        }

        .per-page-selector {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .per-page-selector label {
            font-size: 12px;
            color: #555;
            white-space: nowrap;
        }

        .per-page-select {
            font-size: 12px;
            border: 1px solid #ccc;
            border-radius: 6px;
            padding: 6px 12px;
            background: #fff;
            cursor: pointer;
        }
        /* --- END: CSS ใหม่ --- */

        .pagination-button {
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 5px;
          background-color: #f1f1f1;
          cursor: pointer;
          color: black;
          transition: background-color 0.2s, color 0.2s, border-color 0.2s;
          font-size: 12px;
          white-space: nowrap;
        }

        .pagination-button.active {
          background-color: #6c757d;
          color: white;
          border-color: #6c757d;
        }

        .pagination-button:hover:not(:disabled) {
          background-color: #e0e0e0;
        }

        .pagination-button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
          background-color: #f7f7f7;
        }

        .page-info {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-color, #333);
        }

        /* Row 3 - Matches Table */
        .table-responsive-container {
          overflow-x: auto;
          margin-bottom: 16px;
        }

        .new-match-indicator {
          color: red;
          font-weight: bold;
          margin-left: 5px;
          font-size: 0.9em;
        }

        .matches-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          background-color: #fff;
          border-radius: 13px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.07);
          min-width: 700px;
        }

        .matches-table thead tr {
          background-color: #323943;
          color: white;
          font-size: 12px;
          text-align: center;
          height: 40px;
        }
        .matches-table th:first-child { border-top-left-radius: 13px; }
        .matches-table th:last-child { border-top-right-radius: 13px; }


        .matches-table th,
        .matches-table td {
          padding: 11px 9px;
          border-right: 1px solid #e3e3e3;
          border-bottom: 1px solid #e3e3e3;
          text-align: center;
          white-space: nowrap;
        }

        .matches-table th:last-child,
        .matches-table td:last-child {
          border-right: none;
        }
        .matches-table tbody tr:last-child td {
          border-bottom: none;
        }


        .matches-table tbody tr.even-row {
          background: #f9f9f9;
        }
        .matches-table tbody tr.odd-row {
          background: #fff;
        }

        .matches-table tbody tr:hover {
          background-color: #e8f7e8;
        }

        .loading-message,
        .no-data-message {
          padding: 34px 0;
          color: #999;
          text-align: center;
          font-size: 14px;
        }

        .detail-button {
          background-color: #4bf196;
          color: #000;
          padding: 6px 20px;
          border-radius: 5px;
          border: none;
          cursor: pointer;
          font-size: 13px;
          transition: background-color 0.2s;
          white-space: nowrap;
        }

        .detail-button:hover {
          background-color: #37d381;
        }
        .ranking-status {
          font-size: 11px;
          margin-top: 5px;
          text-align: center;
          white-space: nowrap;
        }

        .ranking-status.saved {
          color: #28a745;
        }

        .ranking-status.not-saved {
          color: #dc3545;
        }

        /* Media Queries สำหรับ Responsive Design */
        @media (max-width: 768px) {
          .main-content { padding: 15px; }
          .search-and-total-row {
            grid-template-columns: 1fr;
            gap: 15px;
            padding: 15px;
          }
          .search-input-container {
            flex-direction: column;
            gap: 10px;
            width: 100%;
            align-items: flex-start;
          }
          .topic-search-input {
            min-width: unset;
            width: 100%;
          }
          .total-matches-display { justify-content: flex-start; }
          .matches-table { min-width: 600px; }
        }

        @media (max-width: 480px) {
          .main-content { padding: 10px; }
          .search-and-total-row { padding: 10px; }
          .topic-search-input { font-size: 12px; }
          .total-matches-display {
            justify-content: center;
            font-size: 13px;
          }
          .detail-button {
            padding: 5px 12px;
            font-size: 12px;
          }
          .history-controls-container {
            flex-direction: column; /* บนจอเล็กมาก ให้เรียงบน-ล่าง */
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default History;

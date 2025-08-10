// src/pages/History.js
import React, { useState, useEffect, useCallback } from "react";
import { db } from "../lib/firebaseConfig";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  endBefore,
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
  const [loggedInEmail, setLoggedInEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [viewedMatches, setViewedMatches] = useState({});
  const [isBrowser, setIsBrowser] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [firstVisible, setFirstVisible] = useState(null);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMoreNext, setHasMoreNext] = useState(false);
  const [hasMorePrev, setHasMorePrev] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsBrowser(true);
      setLoggedInEmail(localStorage.getItem("loggedInEmail") || "");
      try {
        const storedViewedMatches = JSON.parse(localStorage.getItem("viewedMatches") || "{}");
        setViewedMatches(storedViewedMatches);
      } catch (error) {
        console.error("Failed to parse viewedMatches from localStorage", error);
        setViewedMatches({});
      }
    }
  }, []);

  const NEW_MATCH_THRESHOLD_HOURS = 24;

  const isNewMatch = (match) => {
    if (!match.savedAt) return false;
    let savedDate;
    try {
      savedDate = match.savedAt.toDate();
    } catch {
      savedDate = new Date(match.savedAt);
    }
    const now = new Date();
    const diffHours = Math.abs(now.getTime() - savedDate.getTime()) / (1000 * 60 * 60);
    return diffHours < NEW_MATCH_THRESHOLD_HOURS && !viewedMatches[match.id];
  };

  const fetchMatches = useCallback(
    async (direction = "current", cursor = null) => {
      if (!loggedInEmail) return;

      setIsLoading(true);
      try {
        const usersRef = collection(db, "users");
        const userQuery = query(usersRef, where("email", "==", loggedInEmail));
        const userSnap = await getDocs(userQuery);
        let userId = null;
        userSnap.forEach((doc) => { userId = doc.id; });
        if (!userId) {
          Swal.fire("ข้อผิดพลาด", "ไม่พบข้อมูลผู้ใช้", "error");
          setMatches([]);
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

        setMatches(fetchedMatches); // อัปเดต state ของ matches

        if (fetchedMatches.length > 0) {
          setFirstVisible(documentSnapshots.docs[0]);
          setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
        } else {
          setFirstVisible(null);
          setLastVisible(null);
        }

        const nextCheckQuery = query(
          baseQuery,
          startAfter(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null),
          limit(1)
        );
        const nextSnapshot = await getDocs(nextCheckQuery);
        setHasMoreNext(!nextSnapshot.empty);

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
      } finally {
        setIsLoading(false);
      }
    },
    [loggedInEmail, searchTopic, itemsPerPage]
  );

  const debouncedSearch = useMemo(() => debounce((value) => {
    setSearchTopic(value);
    setCurrentPage(1);
  }, 300), []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    debouncedSearch(value);
  };

  useEffect(() => {
    if (isBrowser && loggedInEmail) {
      fetchMatches("current", null);
    }
  }, [loggedInEmail, searchTopic, itemsPerPage, fetchMatches, isBrowser]);

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
    const updatedViewedMatches = { ...viewedMatches, [matchId]: true };
    localStorage.setItem("viewedMatches", JSON.stringify(updatedViewedMatches));
    setViewedMatches(updatedViewedMatches);
    window.open(`/MatchDetails?matchId=${matchId}`, '_blank');
  };

  return (
    <div className="main-content">
      <h2 className="main-title">ประวัติการจัดก๊วน</h2>
      <hr className="title-separator" />

      <div className="search-and-total-row">
        <div className="search-input-container">
          <input
            type="text"
            placeholder="ค้นหาหัวเรื่อง"
            value={searchText}
            onChange={handleSearchChange}
            className="topic-search-input"
          />
        </div>

        {/* --- START: นี่คือจุดที่แก้ไข --- */}
        {/* ใช้ matches.length เพื่อแสดงจำนวนรายการบนหน้าจอปัจจุบัน */}
        <div className="total-matches-display">
          <span>จำนวนกิจกรรม {matches.length} รายการ</span>
        </div>
        {/* --- END: นี่คือจุดที่แก้ไข --- */}
      </div>

      <div className="history-controls-container">
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

        <div className="per-page-selector">
            <label htmlFor="items-per-page">แสดง:</label>
            <select
              id="items-per-page"
              className="per-page-select"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value="10">10 รายการ</option>
              <option value="25">25 รายการ</option>
              <option value="50">50 รายการ</option>
              <option value="100">100 รายการ</option>
            </select>
        </div>
      </div>

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
              <tr><td colSpan={4} className="loading-message">กำลังโหลดข้อมูล...</td></tr>
            )}
            {!isLoading && matches.length === 0 && (
              <tr><td colSpan={4} className="no-data-message">{searchTopic ? "ไม่พบหัวเรื่องที่ค้นหา" : "ไม่พบประวัติการจัดก๊วน"}</td></tr>
            )}
            {!isLoading && matches.length > 0 && matches.map((match, idx) => (
              <tr key={match.id || idx} className={idx % 2 === 0 ? "even-row" : "odd-row"}>
                <td>{formatDate(match.matchDate)}</td>
                <td>
                  {match.topic}
                  {isNewMatch(match) && (<span className="new-match-indicator"> (ใหม่)</span>)}
                </td>
                <td>
                  {match.totalTime ? `${Math.floor(match.totalTime / 60).toString().padStart(2, '0')}:${(match.totalTime % 60).toString().padStart(2, '0')} นาที` : 'N/A'}
                </td>
                <td>
                  <button onClick={() => showMatchDetailsInNewTab(match.id)} className="detail-button">
                    ดูรายละเอียด
                  </button>
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

      {/* CSS is unchanged */}
      <style jsx>{`
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
          font-weight: 600;
          color: #333;
          white-space: nowrap;
        }
        .history-controls-container {
            display: flex;
            justify-content: space-between;
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
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default History;

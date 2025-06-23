// src/pages/History.js (หรือ pages/History.js ขึ้นอยู่กับโครงสร้างโปรเจกต์ของคุณ)
import React, { useState, useEffect, useCallback } from "react";
// import Sidebar from "./components/sidebar"; // <--- บรรทัดนี้ถูกลบออกไปแล้ว
// คุณไม่จำเป็นต้อง import Sidebar ในไฟล์หน้าเพจโดยตรงอีกต่อไป

import { db } from "../lib/firebaseConfig"; // ตรวจสอบพาธให้ถูกต้อง
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import Swal from "sweetalert2";
import { useRouter } from "next/router";

// Constants
const ITEMS_PER_PAGE = 20;

const History = () => {
  const router = useRouter();
  const [matches, setMatches] = useState([]);
  const [allFetchedMatches, setAllFetchedMatches] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTopic, setSearchTopic] = useState("");
  const [totalMatches, setTotalMatches] = useState(0);
  const [loggedInEmail, setLoggedInEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsBrowser(true);
      setLoggedInEmail(localStorage.getItem("loggedInEmail") || "");
    }
  }, []);

  const applyFiltersAndSetMatches = useCallback((data, topicFilter) => {
    let filtered = data;
    if (topicFilter) {
      filtered = data.filter(match =>
        (match.topic || "").toLowerCase().includes(topicFilter.toLowerCase())
      );
    }
    setMatches(filtered);
    setTotalMatches(filtered.length);
    setCurrentPage(1);
  }, []);

  const fetchAllMatches = async () => {
    if (!loggedInEmail) {
      setMatches([]);
      setAllFetchedMatches([]);
      setTotalMatches(0);
      return;
    }

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
        setAllFetchedMatches([]);
        setTotalMatches(0);
        setIsLoading(false);
        return;
      }

      const userMatchesCollectionRef = collection(db, `users/${userId}/Matches`);

      const q = query(
        userMatchesCollectionRef,
        orderBy("savedAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const matchData = [];

      querySnapshot.forEach((doc) => {
        matchData.push({ id: doc.id, ...doc.data() });
      });

      setAllFetchedMatches(matchData);
      applyFiltersAndSetMatches(matchData, searchTopic);
    } catch (error) {
      console.error("Error fetching matches: ", error);
      Swal.fire("ข้อผิดพลาด", "ไม่สามารถดึงข้อมูลประวัติได้: " + error.message, "error");
      setMatches([]);
      setAllFetchedMatches([]);
      setTotalMatches(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isBrowser && loggedInEmail) {
      fetchAllMatches();
    }
  }, [isBrowser, loggedInEmail]);

  useEffect(() => {
    applyFiltersAndSetMatches(allFetchedMatches, searchTopic);
  }, [searchTopic, allFetchedMatches, applyFiltersAndSetMatches]);

  const indexOfLast = currentPage * ITEMS_PER_PAGE;
  const indexOfFirst = indexOfLast - ITEMS_PER_PAGE;
  const currentMatchesPaginated = matches.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(totalMatches / ITEMS_PER_PAGE);

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
    window.open(`/MatchDetails?matchId=${matchId}`, '_blank');
  };

  return (
    // ลบ .history-page-container ที่กำหนด grid-template-columns ออก
    // เนื่องจาก _app.js ได้จัดการ layout หลักแล้ว
    <div className="main-content"> {/* เปลี่ยนเป็น div ที่มีแค่ main-content class */}
      <h2 className="main-title">ประวัติการจัดก๊วน</h2>
      <hr className="title-separator" />

      {/* Row 1 - Search & Total Matches */}
      <div className="search-and-total-row">
        {/* Left: Search Topic */}
        <div className="search-input-container">
          <input
            type="text"
            placeholder="ค้นหาหัวเรื่อง"
            value={searchTopic}
            onChange={(e) => setSearchTopic(e.target.value)}
            className="topic-search-input"
          />
        </div>
        {/* Right: Display total matches */}
        <div className="total-matches-display">
          <span>จัดไปทั้งหมด : {totalMatches}</span>
        </div>
      </div>

      {/* Row 2 - Pagination */}
      <div className="pagination-container">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="pagination-button"
        >
          ย้อนกลับ
        </button>
        {Array.from({ length: totalPages }, (_, index) => (
          <button
            key={index + 1}
            onClick={() => setCurrentPage(index + 1)}
            className={`pagination-button ${currentPage === index + 1 ? "active" : ""}`}
          >
            {index + 1}
          </button>
        ))}
        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="pagination-button"
        >
          ถัดไป
        </button>
      </div>

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
            {!isLoading && currentMatchesPaginated.length === 0 && (
              <tr>
                <td colSpan={4} className="no-data-message">
                  {searchTopic ? "ไม่พบหัวเรื่องที่ค้นหา" : "ไม่พบประวัติการจัดก๊วน"}
                </td>
              </tr>
            )}
            {!isLoading && currentMatchesPaginated.length > 0 && currentMatchesPaginated.map((match, idx) => (
              <tr key={match.id || idx} className={idx % 2 === 0 ? "even-row" : "odd-row"}>
                <td>{formatDate(match.matchDate)}</td>
                <td>{match.topic}</td>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CSS-in-JS using <style jsx> */}
      <style jsx>{`
        /* Main Layout - REMOVED .history-page-container */
        /* .history-page-container has been removed here because _app.js now manages the overall layout */

        .main-content {
          padding: 28px;
          background-color: #f7f7f7;
          border-radius: 12px;
          overflow-y: auto;
          /* These styles are now defining the content area *within* the _app.js layout */
        }

        .main-title {
          font-size: 18px;
          margin-bottom: 10px;
        }

        .title-separator {
          border: 0;
          border-top: 1px solid #666;
          margin-bottom: 18px;
        }

        /* Row 1 - Search and Total Matches */
        .search-and-total-row {
          display: grid;
          grid-template-columns: 1fr 1fr; /* Default for larger screens */
          align-items: center;
          gap: 18px;
          margin-top: 20px;
          margin-bottom: 18px;
        }

        .search-input-container {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .topic-search-input {
          font-size: 12px;
          border: 1px solid #ccc;
          border-radius: 6px;
          padding: 7px 14px;
          min-width: 180px;
          background: #fff;
          flex-grow: 1;
        }

        .total-matches-display {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          font-size: 14px;
          color: #333;
        }

        /* Row 2 - Pagination */
        .pagination-container {
          display: flex;
          justify-content: flex-start;
          margin-bottom: 20px;
        }

        .pagination-button {
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 5px;
          background-color: #f1f1f1;
          margin-right: 5px;
          cursor: pointer;
          color: black;
          transition: background-color 0.2s, color 0.2s;
        }

        .pagination-button.active {
          background-color: #6c757d;
          color: white;
        }

        .pagination-button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* Row 3 - Matches Table */
        .table-responsive-container {
          overflow-x: auto;
          margin-bottom: 16px;
          border-radius: 13px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.07);
          background-color: #fff;
        }

        .matches-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .matches-table thead tr {
          background-color: #323943;
          color: white;
          font-size: 12px;
          text-align: center;
          height: 20px;
        }

        .matches-table th,
        .matches-table td {
          padding: 11px 9px;
          border-right: 1px solid #e3e3e3;
          text-align: center;
          white-space: nowrap;
        }

        .matches-table th:last-child,
        .matches-table td:last-child {
          border-right: none;
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
          font-size: 17px;
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
        }

        .detail-button:hover {
          background-color: #37d381;
        }

        /* Media Queries for Responsive Design */
        @media (max-width: 768px) {
          /* Remove grid-template-columns specific to history-page-container here */
          /* as _app.js now handles the main layout with flexbox/grid */
          /* .history-page-container {
            grid-template-columns: 1fr;
          } */

          .main-content {
            padding: 15px; /* Reduce padding on smaller screens */
          }

          .search-and-total-row {
            grid-template-columns: 1fr; /* Stack search and total matches */
            gap: 15px;
          }

          .search-input-container {
            flex-direction: column; /* Stack input fields vertically */
            gap: 10px;
            width: 100%;
          }

          .topic-search-input {
            min-width: unset;
            width: 100%;
          }

          .total-matches-display {
            justify-content: flex-start;
          }

          .matches-table th,
          .matches-table td {
            padding: 8px 5px;
            font-size: 11px;
          }
        }

        @media (max-width: 480px) {
          .main-content {
            padding: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default History;

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

// Constants
const ITEMS_PER_PAGE = 25; // <<< กำหนดให้ดึงมาหน้าละ 25 รายการ

const History = () => {
  const router = useRouter();
  const [matches, setMatches] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTopic, setSearchTopic] = useState("");
  const [totalMatches, setTotalMatches] = useState(0); // จะแสดงจำนวนรายการในหน้าปัจจุบันเท่านั้น
  const [loggedInEmail, setLoggedInEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [isBrowser, setIsBrowser] = useState(false);

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
    }
  }, []);

  // <<< ฟังก์ชัน fetchMatches ถูกแก้ไขใหม่หมด เพื่อทำ Server-side Pagination
  const fetchMatches = useCallback(
    async (direction = "current", cursor = null) => {
      if (!loggedInEmail) return;

      setIsLoading(true);
      try {
        // ขั้นตอนที่ 1: ค้นหา userId จาก email
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

        const userMatchesCollectionRef = collection(db, `users/${userId}/Matches`); // <<< ใช้ "Matches" ตามที่คุณส่งมาล่าสุด

        let baseQuery = query(
          userMatchesCollectionRef,
          orderBy("savedAt", "desc") // <<< ใช้ "savedAt" ตามที่คุณส่งมาล่าสุด
        );

        // เพิ่มเงื่อนไขการค้นหา (where clause) หากมี searchTopic
        if (searchTopic) {
          baseQuery = query(
            baseQuery,
            where("topic", ">=", searchTopic), // <<< ใช้ "topic" ตามที่คุณส่งมาล่าสุด
            where("topic", "<=", searchTopic + "\uf8ff")
          );
        }

        let q;
        if (direction === "next" && cursor) {
          // ดึงหน้าถัดไป: เริ่มต้นหลังจากเอกสารสุดท้ายของหน้าปัจจุบัน
          q = query(baseQuery, startAfter(cursor), limit(ITEMS_PER_PAGE));
        } else if (direction === "prev" && cursor) {
          // ดึงหน้าก่อนหน้า:
          // ต้องเรียงลำดับย้อนกลับเพื่อใช้ startAfter/endBefore
          // แล้วค่อยกลับลำดับผลลัพธ์ทีหลัง
          q = query(
            userMatchesCollectionRef, // ใช้ collectionRef ตรงๆ เพื่อสร้าง query ใหม่
            orderBy("savedAt", "asc"), // เรียงลำดับย้อนกลับ (จากเก่าไปใหม่)
            ...(searchTopic ? [where("topic", ">=", searchTopic), where("topic", "<=", searchTopic + "\uf8ff")] : []),
            startAfter(cursor), // ใช้ firstVisible ของหน้าปัจจุบันเป็น cursor
            limit(ITEMS_PER_PAGE)
          );
        } else {
          // ดึงหน้าปัจจุบัน (หรือโหลดครั้งแรก)
          q = query(baseQuery, limit(ITEMS_PER_PAGE)); // <<< ตรงนี้แหละที่จำกัดการอ่านแค่ 25
        }

        const documentSnapshots = await getDocs(q);
        let fetchedMatches = documentSnapshots.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // ถ้าเป็นการดึงหน้าก่อนหน้า ให้กลับลำดับผลลัพธ์ให้ถูกต้อง
        if (direction === "prev") {
          fetchedMatches.reverse();
        }

        setMatches(fetchedMatches);
        setTotalMatches(fetchedMatches.length); // แสดงจำนวนรายการที่ดึงมาในหน้าปัจจุบัน

        // กำหนด cursor สำหรับหน้าถัดไป/ก่อนหน้า
        if (fetchedMatches.length > 0) {
          setFirstVisible(documentSnapshots.docs[0]);
          setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
        } else {
          setFirstVisible(null);
          setLastVisible(null);
        }

        // --- ตรวจสอบว่ามีหน้าถัดไปหรือหน้าก่อนหน้าหรือไม่ (ต้องมีการอ่านเพิ่มเติม 1 Read สำหรับแต่ละการตรวจสอบ) ---

        // ตรวจสอบหน้าถัดไป
        const nextCheckQuery = query(
          baseQuery, // ใช้ baseQuery เพื่อคงเงื่อนไขการค้นหาเดิม
          startAfter(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null), // เริ่มต้นหลังจากเอกสารสุดท้ายของหน้าปัจจุบัน
          limit(1) // ดึงมา 1 รายการเพื่อตรวจสอบเท่านั้น
        );
        const nextSnapshot = await getDocs(nextCheckQuery);
        setHasMoreNext(!nextSnapshot.empty);

        // ตรวจสอบหน้าก่อนหน้า
        const prevCheckQuery = query(
          baseQuery, // ใช้ baseQuery เพื่อคงเงื่อนไขการค้นหาเดิม
          endBefore(documentSnapshots.docs[0] || null), // สิ้นสุดก่อนเอกสารแรกของหน้าปัจจุบัน
          limit(1) // ดึงมา 1 รายการเพื่อตรวจสอบเท่านั้น
        );
        const prevSnapshot = await getDocs(prevCheckQuery);
        setHasMorePrev(!prevSnapshot.empty);

      } catch (error) {
        console.error("Error fetching matches:", error);
        Swal.fire("Error", "ไม่สามารถดึงข้อมูลประวัติได้: " + error.message, "error");
        setMatches([]);
        setTotalMatches(0);
      } finally {
        setIsLoading(false);
      }
    },
    [loggedInEmail, searchTopic] // Dependencies: เรียก fetchMatches ใหม่เมื่อ loggedInEmail หรือ searchTopic เปลี่ยน
  );
  // >>> สิ้นสุดการปรับปรุง fetchMatches

  // <<< ปรับปรุง useEffect ให้เรียก fetchMatches ด้วย Pagination
  useEffect(() => {
    if (isBrowser && loggedInEmail) {
      setCurrentPage(1); // รีเซ็ตหน้าเป็น 1 เสมอเมื่อ loggedInEmail หรือ searchTopic เปลี่ยน
      fetchMatches("current", null); // ดึงข้อมูลหน้าแรก
    }
  }, [loggedInEmail, searchTopic, isBrowser, fetchMatches]); // เพิ่ม fetchMatches ใน dependencies
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
            value={searchTopic}
            onChange={(e) => setSearchTopic(e.target.value)}
            className="topic-search-input"
          />
        </div>
        {/* Right: Display total matches */}
        <div className="total-matches-display">
          <span>จำนวน: {totalMatches} กิจกรรม</span>
        </div>
      </div>

      {/* Row 2 - Pagination (ปรับปรุงปุ่มให้ใช้งานได้กับ Server-side Pagination) */}
      <div className="pagination-container">
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
        /* Global Styles for this component */
        /* ใช้ font-family ที่คุณต้องการ หากต้องการ Kanit ต้อง import ที่ _document.js หรือ _app.js */
        .main-content * {
          font-family: 'Kanit', sans-serif; /* ตั้งค่าเป็น Kanit หากคุณ import ไว้แล้ว หรือใช้ sans-serif ทั่วไป */
          box-sizing: border-box;
        }

        .main-content {
          padding: 28px;
          background-color: #f7f7f7;
          overflow-y: auto;
          overflow-x: hidden; /* Ensure no horizontal scroll within main-content itself */
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

        /* Row 2 - Pagination */
        .pagination-container {
          display: flex;
          justify-content: flex-start;
          align-items: center; /* <<< ตรงนี้ที่เพิ่ม */
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 5px;
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

        /* Row 3 - Matches Table */
        .table-responsive-container {
          overflow-x: auto;
          margin-bottom: 16px;
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
        /* กำหนด border-radius เฉพาะมุมบนของ head */
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

        /* Media Queries for Responsive Design */
        @media (max-width: 768px) {
          .main-content {
            padding: 15px;
          }

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
          .total-matches-display {
            justify-content: flex-start;
          }

          .matches-table {
            min-width: 600px;
          }
          
          .matches-table thead {
            display: table-header-group;
            position: static;
          }

          .matches-table tr {
            display: table-row;
            margin-bottom: 0;
            border: none;
            border-radius: 0;
            background-color: inherit;
            box-shadow: none;
            padding: 0;
          }

          .matches-table td {
            display: table-cell;
            position: static;
            padding-left: 9px;
            text-align: center;
            align-items: initial;
            justify-content: initial;
            min-height: auto;
            padding-top: 11px;
            padding-bottom: 11px;
            font-size: 12px;
            white-space: nowrap;
          }
          .matches-table td:before {
            content: none;
          }

          .pagination-container {
            justify-content: center;
            gap: 3px;
          }
          .pagination-button {
            padding: 8px 10px;
            font-size: 11px;
          }
        }

        @media (max-width: 480px) {
          .main-content {
            padding: 10px;
          }
          .search-and-total-row {
            padding: 10px;
          }
          .search-input-container {
            align-items: center;
          }
          .topic-search-input {
            padding: 8px 10px;
            font-size: 12px;
          }
          .total-matches-display {
            justify-content: center;
            font-size: 13px;
          }
          .detail-button {
            padding: 5px 12px;
            font-size: 12px;
          }
          .pagination-button {
            padding: 6px 8px;
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default History;

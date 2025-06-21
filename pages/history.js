import React, { useState, useEffect } from "react";
import Sidebar from "./components/sidebar";
import { db } from "../lib/firebaseConfig";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import Swal from "sweetalert2";
import { useRouter } from "next/router"; // Import useRouter

// Constants
const ITEMS_PER_PAGE = 20;

const History = () => {
  const router = useRouter(); // Initialize router
  const [matches, setMatches] = useState([]);
  const [allMatchesForSelectedDate, setAllMatchesForSelectedDate] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchDate, setSearchDate] = useState("");
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

  const fetchMatches = async (dateToSearch) => {
    if (!loggedInEmail) {
      setMatches([]);
      setAllMatchesForSelectedDate([]);
      setTotalMatches(0);
      return;
    }

    if (!dateToSearch) {
      setMatches([]);
      setAllMatchesForSelectedDate([]);
      setTotalMatches(0);
      setIsLoading(false);
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
        setAllMatchesForSelectedDate([]);
        setTotalMatches(0);
        setIsLoading(false);
        return;
      }

      const userMatchesCollectionRef = collection(db, `users/${userId}/Matches`);

      const q = query(
        userMatchesCollectionRef,
        where("matchDate", "==", dateToSearch),
        orderBy("savedAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const matchData = [];

      querySnapshot.forEach((doc) => {
        matchData.push({ id: doc.id, ...doc.data() });
      });

      setAllMatchesForSelectedDate(matchData);
      applyFiltersAndSetMatches(matchData, searchTopic);

    } catch (error) {
      console.error("Error fetching matches: ", error);
      Swal.fire("ข้อผิดพลาด", "ไม่สามารถดึงข้อมูลประวัติได้: " + error.message, "error");
      setMatches([]);
      setAllMatchesForSelectedDate([]);
      setTotalMatches(0);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSetMatches = (data, topicFilter) => {
    let filtered = data;
    if (topicFilter) {
      filtered = data.filter(match =>
        (match.topic || "").toLowerCase().includes(topicFilter.toLowerCase())
      );
    }
    setMatches(filtered);
    setTotalMatches(filtered.length);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (isBrowser && loggedInEmail && searchDate) {
      fetchMatches(searchDate);
    } else if (!searchDate) {
      setMatches([]);
      setAllMatchesForSelectedDate([]);
      setTotalMatches(0);
    }
  }, [isBrowser, loggedInEmail, searchDate]);

  const handleSearch = () => {
    if (searchDate) {
      applyFiltersAndSetMatches(allMatchesForSelectedDate, searchTopic);
    } else {
      Swal.fire("แจ้งเตือน", "กรุณาเลือกวันที่ก่อนทำการค้นหา", "info");
    }
  };

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
    // เปิดหน้า MatchDetails ในแท็บใหม่ โดยส่ง matchId ไปเป็น query parameter
    window.open(`/MatchDetails?matchId=${matchId}`, '_blank');
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        height: "100vh",
      }}
    >
      <Sidebar />
      <main
        className="main-content"
        style={{
          padding: "28px",
          backgroundColor: "#f7f7f7",
          borderRadius: "12px",
          overflowY: "auto",
        }}
      >
        <h2 style={{ fontSize: "18px", marginBottom: "10px" }}>ประวัติการจัดก๊วน</h2>
        <hr />
        {/* Row 1 - Search */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            alignItems: "center",
            gap: "18px",
            marginBottom: "18px",
            marginTop: "20px",
          }}
        >
          {/* Left: Search */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              style={{
                fontSize: "14px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                padding: "7px 14px",
                minWidth: "140px",
                background: "#fff",
              }}
            />
            <input
              type="text"
              placeholder="ค้นหาหัวเรื่อง"
              value={searchTopic}
              onChange={(e) => setSearchTopic(e.target.value)}
              style={{
                fontSize: "14px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                padding: "7px 14px",
                minWidth: "180px",
                background: "#fff",
              }}
            />
            <button
              onClick={handleSearch}
              style={{
                backgroundColor: "#4bf196",
                color: "#fff",
                padding: "10px 20px",
                fontSize: "14px",
                borderRadius: "7px",
                border: "none",
                cursor: "pointer",
              }}
            >
              ค้นหา
            </button>
          </div>
          {/* Right: Display total matches */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              fontSize: "14px",
              color: "#333",
            }}
          >
            <span>จัดไปทั้งหมด: {totalMatches}</span>
          </div>
        </div>

        {/* Row 2 - Pagination */}
        <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "20px" }}>
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{
              padding: "6px 12px",
              border: "1px solid #ddd",
              borderRadius: "5px",
              backgroundColor: "#f1f1f1",
              marginRight: "5px",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
            }}
          >
            ย้อนกลับ
          </button>
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index + 1}
              onClick={() => setCurrentPage(index + 1)}
              style={{
                padding: "6px 12px",
                border: "1px solid #ddd",
                borderRadius: "5px",
                backgroundColor: currentPage === index + 1 ? "#6c757d" : "#f1f1f1",
                marginRight: "5px",
                cursor: "pointer",
                color: currentPage === index + 1 ? "white" : "black",
              }}
            >
              {index + 1}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            style={{
              padding: "6px 12px",
              border: "1px solid #ddd",
              borderRadius: "5px",
              backgroundColor: "#f1f1f1",
              cursor: currentPage === totalPages || totalPages === 0 ? "not-allowed" : "pointer",
            }}
          >
            ถัดไป
          </button>
        </div>

        {/* Row 3 - Matches Table */}
        <div
          style={{
            overflowX: "auto",
            marginBottom: "16px",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              backgroundColor: "#fff",
              borderRadius: "13px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.07)",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#323943",
                  color: "white",
                  fontSize: "12px",
                  textAlign: "center",
                  height: "20px",
                }}
              >
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>วันเดือนปีที่จัด</th>
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>หัวเรื่อง</th>
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>เวลารวมกิจกรรม</th>
                <th style={{ padding: "11px 9px" }}>รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={4} style={{ padding: "34px 0", color: "#999", textAlign: "center", fontSize: "17px" }}>
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              )}
              {!isLoading && currentMatchesPaginated.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: "34px 0", color: "#999", textAlign: "center", fontSize: "17px" }}>
                    {searchDate ? "ไม่พบข้อมูลสำหรับวันที่เลือก" : "กรุณาเลือกวันที่เพื่อค้นหาประวัติ"}
                  </td>
                </tr>
              )}
              {!isLoading && currentMatchesPaginated.length > 0 && currentMatchesPaginated.map((match, idx) => (
                <tr key={match.id || idx}>
                  <td style={{ textAlign: "center", borderRight: "1px solid #e3e3e3" }}>
                    {formatDate(match.matchDate)}
                  </td>
                  <td style={{ textAlign: "center", borderRight: "1px solid #e3e3e3" }}>
                    {match.topic}
                  </td>
                  <td style={{ textAlign: "center", borderRight: "1px solid #e3e3e3" }}>
                    {/* Assuming you have totalTime in your match data */}
                    {match.totalTime ? `${Math.floor(match.totalTime / 60).toString().padStart(2, '0')}:${(match.totalTime % 60).toString().padStart(2, '0')} นาที` : 'N/A'}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      onClick={() => showMatchDetailsInNewTab(match.id)} // เรียกฟังก์ชันใหม่
                      style={{
                        backgroundColor: "#4bf196",
                        color: "#fff",
                        padding: "6px 20px",
                        borderRadius: "5px",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      ดูรายละเอียด
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default History;

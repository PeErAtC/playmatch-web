import React, { useState, useEffect } from "react";
import Sidebar from "./components/sidebar";
import { db } from "../lib/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import Swal from "sweetalert2";

// Constants
const ITEMS_PER_PAGE = 20;

const History = () => {
  const [matches, setMatches] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchDate, setSearchDate] = useState("");
  const [searchTopic, setSearchTopic] = useState("");
  const [totalMatches, setTotalMatches] = useState(0);

  // Ensure window is defined before using it
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    // Check if running in the browser
    if (typeof window !== "undefined") {
      setIsBrowser(true);
    }
  }, []);

  useEffect(() => {
    if (isBrowser) {
      const fetchMatches = async () => {
        try {
          const matchesRef = collection(db, "Matches");
          const q = query(matchesRef);
          const querySnapshot = await getDocs(q);
          const matchData = [];

          querySnapshot.forEach((doc) => {
            matchData.push(doc.data());
          });

          setMatches(matchData);
          setTotalMatches(matchData.length);
        } catch (error) {
          console.error("Error fetching matches: ", error);
        }
      };
      fetchMatches();
    }
  }, [isBrowser]);

  const handleSearch = () => {
    const filteredMatches = matches.filter((match) => {
      const matchDate = match.matchDate || "";
      const matchTopic = match.topic || "";

      // ตรวจสอบว่า date ที่กรอกตรงกับ matchDate หรือไม่
      const dateMatches = searchDate ? matchDate.includes(searchDate) : true;
      
      // ตรวจสอบว่า topic ที่กรอกตรงกับ matchTopic หรือไม่
      const topicMatches = searchTopic
        ? matchTopic.toLowerCase().includes(searchTopic.toLowerCase())
        : true;

      return dateMatches && topicMatches;
    });

    setMatches(filteredMatches);
    setTotalMatches(filteredMatches.length);
    setCurrentPage(1); // Reset to page 1 after search
  };

  const indexOfLast = currentPage * ITEMS_PER_PAGE;
  const indexOfFirst = indexOfLast - ITEMS_PER_PAGE;
  const currentMatches = matches.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(totalMatches / ITEMS_PER_PAGE);

  const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${d.getFullYear()}`;
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
                <th style={{ padding: "11px 9px" }}>รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {currentMatches.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: "34px 0", color: "#999", textAlign: "center", fontSize: "17px" }}>
                    ไม่มีข้อมูล
                  </td>
                </tr>
              )}
              {currentMatches.map((match, idx) => (
                <tr key={match.matchDate}>
                  <td style={{ textAlign: "center", borderRight: "1px solid #e3e3e3" }}>
                    {formatDate(match.matchDate)}
                  </td>
                  <td style={{ textAlign: "center", borderRight: "1px solid #e3e3e3" }}>
                    {match.topic}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      onClick={() => Swal.fire("รายละเอียด", match.details || "ไม่มีรายละเอียด", "info")}
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

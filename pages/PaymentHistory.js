// pages/PaymentHistory.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { db } from "../lib/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  limit,
  orderBy,
  startAfter,
} from "firebase/firestore";
import Swal from "sweetalert2";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";

// Helper function to format date (same as in MatchDetails)
const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) {
      return dateString;
    }
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${d.getFullYear()}`;
  } catch (e) {
    console.error("Invalid date string:", dateString, e);
    return dateString;
  }
};

const PaymentHistory = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [loggedInEmail, setLoggedInEmail] = useState("");
  const [expandedMatchId, setExpandedMatchId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const lastVisibleRef = useRef(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 25;
  const detailTableRefs = useRef({}); // Ref to hold refs for each detail table

  // Define a Toast mixin for subtle notifications
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLoggedInEmail(localStorage.getItem("loggedInEmail") || "");
    }
  }, []);

  const fetchPaymentHistory = useCallback(
    async (loadMore = false, page = 1) => {
      if (!loggedInEmail) {
        setLoading(false);
        setError("Please log in to view payment history.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const usersRef = collection(db, "users");
        const userQuery = query(usersRef, where("email", "==", loggedInEmail));
        const userSnap = await getDocs(userQuery);
        let userId = null;
        userSnap.forEach((doc) => {
          userId = doc.id;
        });

        if (!userId) {
          throw new Error("User data not found. Please log in again.");
        }

        const paymentHistoryRef = collection(
          db,
          `users/${userId}/PaymentHistory`
        );

        let q;
        let startAfterDoc = null;

        if (loadMore && lastVisibleRef.current) {
          startAfterDoc = lastVisibleRef.current;
        } else if (page > 1) {
          // For pagination, re-fetch based on page number
          const prevQuery = query(
            paymentHistoryRef,
            orderBy("matchDate", "desc"),
            limit((page - 1) * recordsPerPage)
          );
          const prevSnapshot = await getDocs(prevQuery);
          if (!prevSnapshot.empty) {
            startAfterDoc = prevSnapshot.docs[prevSnapshot.docs.length - 1];
          }
        }

        if (startAfterDoc) {
          q = query(
            paymentHistoryRef,
            orderBy("matchDate", "desc"),
            startAfter(startAfterDoc),
            limit(recordsPerPage)
          );
        } else {
          q = query(paymentHistoryRef, orderBy("matchDate", "desc"), limit(recordsPerPage));
        }

        const querySnapshot = await getDocs(q);

        const newRecords = [];
        querySnapshot.forEach((doc) => {
          newRecords.push({ id: doc.id, ...doc.data() });
        });

        if (newRecords.length > 0) {
          lastVisibleRef.current = querySnapshot.docs[querySnapshot.docs.length - 1];
          if (loadMore) {
            setPaymentRecords((prevRecords) => [...prevRecords, ...newRecords]);
          } else {
            setPaymentRecords(newRecords);
          }
        } else if (!loadMore && page === 1) {
          setPaymentRecords([]);
        }

        setHasMore(newRecords.length === recordsPerPage);

        if (newRecords.length === 0 && !loadMore && page === 1) {
          Swal.fire("No Records", "ไม่พบประวัติการชำระเงิน", "info");
        }
      } catch (err) {
        console.error("Error fetching payment history:", err);
        setError("ไม่สามารถดึงข้อมูลประวัติการชำระเงินได้: " + err.message);
        Swal.fire(
          "เกิดข้อผิดพลาด",
          "ไม่สามารถดึงข้อมูลประวัติการชำระเงินได้: " + err.message,
          "error"
        );
      } finally {
        setLoading(false);
      }
    },
    [loggedInEmail, recordsPerPage]
  );

  useEffect(() => {
    if (loggedInEmail) {
      lastVisibleRef.current = null;
      setPaymentRecords([]);
      setHasMore(true);
      setCurrentPage(1);
      fetchPaymentHistory(false, 1);
    }
  }, [loggedInEmail, fetchPaymentHistory]);

  const handleNextPage = () => {
    setCurrentPage((prevPage) => prevPage + 1);
    fetchPaymentHistory(true, currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => prevPage - 1);
      lastVisibleRef.current = null;
      setPaymentRecords([]);
      setHasMore(true);
      fetchPaymentHistory(false, currentPage - 1);
    }
  };

  const handleDownloadDetailImage = async (record) => {
    const element = detailTableRefs.current[record.id];
    if (!element) {
        Swal.fire("เกิดข้อผิดพลาด", "ไม่พบตารางสำหรับดาวน์โหลด", "error");
        return;
    }

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
        });
        const fileName = `PaymentDetails_${record.topic.replace(/[^a-z0-9]/gi, '_')}_${formatDate(record.matchDate).replace(/\//g, "-")}.png`;
        saveAs(canvas.toDataURL("image/png"), fileName);
        Toast.fire({ icon: 'success', title: 'ดาวน์โหลดรูปภาพสำเร็จ!' });
    } catch (error) {
        console.error("Error generating image:", error);
        Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถสร้างไฟล์รูปภาพได้", "error");
    }
  };

  // Filter records based on search term
  const filteredRecords = paymentRecords.filter((record) =>
    record.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper function for the expanded details style
  const getExpandedDetailsStyle = (isExpanded) => ({
    maxHeight: isExpanded ? '9999px' : '0',
    opacity: isExpanded ? '1' : '0',
    overflow: 'hidden',
    transition: 'max-height 0.5s ease-in-out, opacity 0.4s ease-in-out',
  });

  return (
    <div
      style={{
        padding: "30px",
        backgroundColor: "#f7f7f7",
        minHeight: "100vh",
        fontFamily: "'Kanit', sans-serif",
      }}
    >
      <h1 style={{ fontSize: "18px", marginBottom: "10px" }}>
        ประวัติการชำระเงิน
      </h1>
      <hr style={{ border: "0", borderTop: "1px solid #e0e0e0", marginBottom: "20px" }} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          backgroundColor: "#fff",
          padding: "15px 20px",
          borderRadius: "8px",
          boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <div style={{ flexGrow: 1, minWidth: "250px" }}>
          <input
            type="text"
            placeholder="ค้นหาตามหัวข้อ Match..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "10px 15px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              fontSize: "12px",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ fontSize: "12px", color: "#222" }}>
          จำนวน Match: {filteredRecords.length}
        </div>
      </div>

      {!loading && filteredRecords.length > 0 && (
        <div
          style={{
            textAlign: "left",
            padding: "10px 0",
            marginBottom: "15px",
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1 || loading}
            style={{
              backgroundColor: "#f8f9fa",
              color: "#495057",
              padding: "6px 12px",
              borderRadius: "5px",
              border: "1px solid #ced4da",
              cursor: "pointer",
              fontSize: "12px",
              opacity: currentPage === 1 || loading ? 0.7 : 1,
              transition: "background-color 0.2s, border-color 0.2s",
            }}
          >
            ย้อนกลับ
          </button>
          <span style={{ fontSize: "12px", fontWeight: "bold" }}>
            หน้า {currentPage}
          </span>
          <button
            onClick={handleNextPage}
            disabled={!hasMore || loading}
            style={{
              backgroundColor: "#f8f9fa",
              color: "#495057",
              padding: "6px 12px",
              borderRadius: "5px",
              border: "1px solid #ced4da",
              cursor: "pointer",
              fontSize: "12px",
              opacity: !hasMore || loading ? 0.7 : 1,
              transition: "background-color 0.2s, border-color 0.2s",
            }}
          >
            ถัดไป
          </button>
        </div>
      )}

      {loading && filteredRecords.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px" }}>
          กำลังโหลดประวัติการชำระเงิน...
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "50px", color: "red" }}>
          {error}
        </div>
      ) : filteredRecords.length === 0 && !loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            backgroundColor: "#fff",
            borderRadius: "8px",
            border: "1px solid #e0e0e0",
            color: "#777",
          }}
        >
          ไม่พบประวัติการชำระเงิน
          {searchTerm && ` สำหรับ "${searchTerm}"`}
        </div>
      ) : (
        <div
          style={{
            overflowX: "auto",
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            backgroundColor: "#fff",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#323943", color: "white" }}>
                <th
                  style={{
                    padding: "12px 10px",
                    borderRight: "1px solid #444",
                    textAlign: "left",
                    width: "100px",
                    fontSize: "12px",
                  }}
                >
                  วันที่ Match
                </th>
                <th
                  style={{
                    padding: "12px 10px",
                    borderRight: "1px solid #444",
                    textAlign: "center",
                    fontSize: "12px",
                  }}
                >
                  หัวข้อ Match
                </th>
                <th
                  style={{
                    padding: "12px 10px",
                    borderRight: "1px solid #444",
                    textAlign: "center",
                    fontSize: "12px",
                  }}
                >
                  ยอดรวม (บาท)
                </th>
                <th
                  style={{
                    padding: "12px 10px",
                    borderRight: "1px solid #444",
                    textAlign: "center",
                    fontSize: "12px",
                  }}
                >
                  สถานะการชำระ
                </th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontSize: "12px" }}>
                  รายละเอียด
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const paidCount = record.membersData.filter(
                  (m) => m.isPaid
                ).length;
                const totalMembers = record.membersData.length;
                const allPaid = paidCount === totalMembers;

                return (
                  <React.Fragment key={record.id}>
                    <tr
                      style={{
                        borderBottom: "1px solid #eee",
                        backgroundColor: allPaid
                          ? "#e6ffe6"
                          : totalMembers > 0 && paidCount < totalMembers
                          ? "#fffde6"
                          : "inherit",
                      }}
                    >
                      <td
                        style={{
                          padding: "10px",
                          borderRight: "1px solid #eee",
                          textAlign: "left",
                          fontSize: "12px",
                        }}
                      >
                        {formatDate(record.matchDate)}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderRight: "1px solid #eee",
                          textAlign: "center",  
                          fontSize: "12px",
                        }}
                      >
                        {record.topic}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderRight: "1px solid #eee",
                          textAlign: "center",
                          fontWeight: "bold",
                          color: "#e63946",
                          fontSize: "12px",
                        }}
                      >
                        {record.totalOverall}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderRight: "1px solid #eee",
                          textAlign: "center",
                          color: allPaid
                            ? "#28a745"
                            : totalMembers > 0 && paidCount < totalMembers
                            ? "#ffc107"
                            : "#dc3545",
                          fontWeight: "bold",
                          fontSize: "12px",
                        }}
                      >
                        {allPaid
                          ? "จ่ายครบแล้ว"
                          : totalMembers > 0
                          ? `${paidCount}/${totalMembers} จ่ายแล้ว`
                          : "ไม่มีสมาชิก"}
                      </td>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <button
                          onClick={() =>
                            setExpandedMatchId(
                              expandedMatchId === record.id ? null : record.id
                            )
                          }
                          style={{
                            backgroundColor: "#4bf196",
                            color: "#000",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "13px",
                          }}
                        >
                          {expandedMatchId === record.id
                            ? "ซ่อนรายละเอียด"
                            : "ดูรายละเอียด"}
                        </button>
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: "#f0f8ff" }}>
                      <td colSpan="5" style={{ padding: "0" }}>
                        <div style={getExpandedDetailsStyle(expandedMatchId === record.id)}>
                          {expandedMatchId === record.id && (
                            <div ref={(el) => (detailTableRefs.current[record.id] = el)} style={{padding: "20px", backgroundColor: "#fff"}}>
                              <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px"}}>
                                <h4 style={{ fontSize: "16px", color: "#333", margin: 0 }}>
                                  รายละเอียดการชำระเงินใน Match นี้:
                                </h4>
                                <button
                                  onClick={() => handleDownloadDetailImage(record)}
                                  title="Download as Image"
                                  style={{
                                    background: '#ffffff', border: '1px solid #ddd', borderRadius: '50%',
                                    width: '36px', height: '36px', cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                  </svg>
                                </button>
                              </div>

                              <div style={{ border: "1px solid #cceeff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 2px 5px rgba(0,0,0,0.1)"}}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                                  <thead>
                                    <tr style={{ backgroundColor: "#e0f2f7" }}>
                                      <th style={{ padding: "10px", borderRight: "1px solid #cceeff", textAlign: "left", color: "#333", fontSize: "13px"}}>
                                        ชื่อผู้เล่น
                                      </th>
                                      <th style={{ padding: "10px", borderRight: "1px solid #cceeff", textAlign: "center", color: "#333", fontSize: "13px"}}>
                                        ยอด (บาท)
                                      </th>
                                      <th style={{ padding: "10px", textAlign: "center", color: "#333", fontSize: "13px"}}>
                                        สถานะ
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {record.membersData
                                      .sort((a, b) => a.isPaid - b.isPaid) // Sorts unpaid (false) before paid (true)
                                      .map((member, idx) => (
                                      <tr
                                        key={idx}
                                        style={{
                                          backgroundColor: member.isPaid
                                            ? "#f7fcf9"
                                            : "#fff8f8",
                                          borderBottom: "1px solid #e0f2f7",
                                        }}
                                      >
                                        <td style={{ padding: "8px 10px", borderRight: "1px solid #e0f2f7", textAlign: "left", fontSize: "13px"}}>
                                          {member.name}
                                        </td>
                                        <td style={{ padding: "8px 10px", borderRight: "1px solid #e0f2f7", textAlign: "center", fontSize: "13px"}}>
                                          {member.total}
                                        </td>
                                        <td style={{ padding: "8px 10px", textAlign: "center", color: member.isPaid ? "#28a745" : "#dc3545", fontWeight: "bold", fontSize: "13px"}}>
                                          {member.isPaid ? "✔ จ่ายแล้ว" : "✕ ยังไม่จ่าย"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;

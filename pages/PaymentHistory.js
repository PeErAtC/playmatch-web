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
  endBefore, // อาจจะไม่ได้ใช้โดยตรง แต่เผื่ออนาคต
} from "firebase/firestore";
import Swal from "sweetalert2";

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

  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(20); // ปรับเป็น 20 ตามที่คุณต้องการ
  const [hasMore, setHasMore] = useState(true);
  const pageLastDocs = useRef({}); // ใช้เก็บ lastVisibleDoc ของแต่ละหน้า { pageNum: lastDoc }
  const pageFirstDocs = useRef({}); // ใช้เก็บ firstVisibleDoc ของแต่ละหน้า { pageNum: firstDoc }
  const currentUserId = useRef(null); // เก็บ userId ไว้

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLoggedInEmail(localStorage.getItem("loggedInEmail") || "");
    }
  }, []);

  const fetchPaymentHistory = useCallback(
    async (pageToLoad) => {
      if (!loggedInEmail) {
        setLoading(false);
        setError("กรุณาเข้าสู่ระบบเพื่อดูประวัติการชำระเงิน");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Fetch userId only once
        if (!currentUserId.current) {
          const usersRef = collection(db, "users");
          const userQuery = query(usersRef, where("email", "==", loggedInEmail));
          const userSnap = await getDocs(userQuery);
          let userId = null;
          userSnap.forEach((doc) => {
            userId = doc.id;
          });

          if (!userId) {
            throw new Error("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
          }
          currentUserId.current = userId;
        }

        const paymentHistoryRef = collection(
          db,
          `users/${currentUserId.current}/PaymentHistory`
        );

        let q;
        let startDocForQuery = null;

        if (pageToLoad > 1 && pageLastDocs.current[pageToLoad - 1]) {
          // ถ้ากำลังจะโหลดหน้าถัดไป และมี lastDoc ของหน้าก่อนหน้าอยู่แล้ว
          startDocForQuery = pageLastDocs.current[pageToLoad - 1];
        } else if (pageToLoad < currentPage && pageFirstDocs.current[pageToLoad]) {
            // ถ้ากำลังจะโหลดหน้าย้อนกลับ และมี firstDoc ของหน้านั้นๆ อยู่แล้ว
            // Note: Firebase does not have endBefore for pagination directly,
            // so we'll re-fetch from start for simplicity or implement more complex logic.
            // For now, if navigating back, we'll re-fetch from the beginning up to the desired page.
            // A more efficient way to go back would involve storing full snapshots for previous pages.
            // For this implementation, we will re-fetch from the start if navigating back
            // to a page that isn't the immediate next one.
            // The existing "startAfter" logic makes it hard to go "backwards" efficiently.
            // Let's refine for actual previous page fetching.
            startDocForQuery = null; // Reset for re-query from start for previous pages
            // If going back, we need to fetch from the beginning until the current page's start.
            // This can be inefficient. A better approach for "back" is a separate query or client-side caching.
            // For strict "only fetch 20 at a time", going back implies re-fetching a previous "chunk".
            const prevPageQuery = query(
              paymentHistoryRef,
              orderBy("matchDate", "desc"),
              limit((pageToLoad - 1) * recordsPerPage) // Fetch up to the start of the desired page
            );
            const prevSnapshot = await getDocs(prevPageQuery);
            if (!prevSnapshot.empty) {
                startDocForQuery = prevSnapshot.docs[prevSnapshot.docs.length - 1];
            }
        }


        if (startDocForQuery) {
          q = query(
            paymentHistoryRef,
            orderBy("matchDate", "desc"),
            startAfter(startDocForQuery),
            limit(recordsPerPage)
          );
        } else {
          // สำหรับหน้าแรก หรือกรณีที่ startDocForQuery เป็น null (เช่น หน้า 1 หรือไปหน้าที่ยังไม่เคยโหลด)
          q = query(paymentHistoryRef, orderBy("matchDate", "desc"), limit(recordsPerPage));
        }

        const querySnapshot = await getDocs(q);

        const newRecords = [];
        querySnapshot.forEach((doc) => {
          newRecords.push({ id: doc.id, ...doc.data() });
        });

        if (newRecords.length > 0) {
          pageLastDocs.current[pageToLoad] = querySnapshot.docs[querySnapshot.docs.length - 1];
          pageFirstDocs.current[pageToLoad] = querySnapshot.docs[0];
          setPaymentRecords(newRecords);
        } else {
          setPaymentRecords([]);
        }

        setHasMore(newRecords.length === recordsPerPage);

        if (newRecords.length === 0 && pageToLoad === 1) {
          Swal.fire("ไม่พบข้อมูล", "ไม่พบประวัติการชำระเงิน", "info");
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
    [loggedInEmail, recordsPerPage, currentPage] // เพิ่ม currentPage ใน dependency array เพื่อให้ fetchPaymentHistory อัปเดตเมื่อ currentPage เปลี่ยน
  );

  useEffect(() => {
    if (loggedInEmail) {
      // Reset pagination state when loggedInEmail changes
      setCurrentPage(1);
      pageLastDocs.current = {};
      pageFirstDocs.current = {};
      setPaymentRecords([]);
      setHasMore(true);
      currentUserId.current = null; // Clear userId to refetch it
      fetchPaymentHistory(1); // Load the first page
    }
  }, [loggedInEmail, fetchPaymentHistory]);

  const handleNextPage = () => {
    if (hasMore && !loading) {
      setCurrentPage((prevPage) => prevPage + 1);
      fetchPaymentHistory(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1 && !loading) {
      setCurrentPage((prevPage) => prevPage + 1); // ตั้งใจให้เพิ่มไป 1 ก่อน เพื่อให้ `fetchPaymentHistory` ใน `pageToLoad` เป็นค่าที่ถูกต้อง
      // จากนั้นจะลดลง 2 เพื่อให้ได้หน้าก่อนหน้า (currPage + 1 - 2 = currPage - 1)
      setCurrentPage((prevPage) => {
        const newPage = prevPage - 1;
        fetchPaymentHistory(newPage); // เรียก fetch สำหรับหน้าใหม่
        return newPage;
      });
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
          จำนวน Match ที่แสดง: {filteredRecords.length}
        </div>
      </div>

      {!loading && (filteredRecords.length > 0 || currentPage > 1) && ( // แสดงปุ่ม pagination ถ้ามีข้อมูลหรือเคยอยู่หน้าอื่นแล้ว
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
              fontSize: "13px",
              opacity: currentPage === 1 || loading ? 0.7 : 1,
              transition: "background-color 0.2s, border-color 0.2s",
            }}
          >
            ย้อนกลับ
          </button>
          <span style={{ fontSize: "14px", fontWeight: "bold" }}>
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
              fontSize: "13px",
              opacity: !hasMore || loading ? 0.7 : 1,
              transition: "background-color 0.2s, border-color 0.2s",
            }}
          >
            ถัดไป
          </button>
        </div>
      )}

      {loading && filteredRecords.length === 0 && currentPage === 1 ? ( // แสดง "กำลังโหลด" เมื่อโหลดหน้าแรกเท่านั้น
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
                            backgroundColor: "#3fc57b",
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
                    {/* Expanded details row */}
                    <tr
                      style={{
                        backgroundColor: "#f0f8ff",
                      }}
                    >
                      <td colSpan="5" style={{ padding: "0" }}>
                        <div style={getExpandedDetailsStyle(expandedMatchId === record.id)}>
                          {expandedMatchId === record.id && (
                            <div style={{padding: "10px 20px 20px 20px"}}>
                              <h4
                                style={{
                                  fontSize: "16px",
                                  marginBottom: "10px",
                                  color: "#333",
                                }}
                              >
                                รายละเอียดการชำระเงินใน Match นี้:
                              </h4>
                              <div
                                style={{
                                  border: "1px solid #cceeff",
                                  borderRadius: "8px",
                                  overflow: "hidden",
                                  boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                                }}
                              >
                                <table
                                  style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    fontSize: "13px",
                                  }}
                                >
                                  <thead>
                                    <tr style={{ backgroundColor: "#e0f2f7" }}>
                                      <th
                                        style={{
                                          padding: "10px",
                                          borderRight: "1px solid #cceeff",
                                          textAlign: "left",
                                          color: "#333",
                                          fontSize: "13px",
                                        }}
                                      >
                                        ชื่อผู้เล่น
                                      </th>
                                      <th
                                        style={{
                                          padding: "10px",
                                          borderRight: "1px solid #cceeff",
                                          textAlign: "center",
                                          color: "#333",
                                          fontSize: "13px",
                                        }}
                                      >
                                        ยอด (บาท)
                                      </th>
                                      <th
                                        style={{
                                          padding: "10px",
                                          textAlign: "center",
                                          color: "#333",
                                          fontSize: "13px",
                                        }}
                                      >
                                        สถานะ
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {record.membersData.map((member, idx) => (
                                      <tr
                                        key={idx}
                                        style={{
                                          backgroundColor: member.isPaid
                                            ? "#f7fcf9"
                                            : "#fff8f8",
                                          borderBottom: "1px solid #e0f2f7",
                                        }}
                                      >
                                        <td
                                          style={{
                                            padding: "8px 10px",
                                            borderRight: "1px solid #e0f2f7",
                                            textAlign: "left",
                                            fontSize: "13px",
                                          }}
                                        >
                                          {member.name}
                                        </td>
                                        <td
                                          style={{
                                            padding: "8px 10px",
                                            borderRight: "1px solid #e0f2f7",
                                            textAlign: "center",
                                            fontSize: "13px",
                                          }}
                                        >
                                          {member.total}
                                        </td>
                                        <td
                                          style={{
                                            padding: "8px 10px",
                                            textAlign: "center",
                                            color: member.isPaid
                                              ? "#28a745"
                                              : "#dc3545",
                                            fontWeight: "bold",
                                            fontSize: "13px",
                                          }}
                                        >
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

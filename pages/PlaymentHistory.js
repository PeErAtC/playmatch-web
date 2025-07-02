// pages/PaymentHistory.jsx
import React, { useState, useEffect } from "react";
import { db } from "../lib/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
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
  const [expandedMatchId, setExpandedMatchId] = useState(null); // State to manage expanded row

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLoggedInEmail(localStorage.getItem("loggedInEmail") || "");
    }
  }, []);

  useEffect(() => {
    const fetchPaymentHistory = async () => {
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
        // Order by matchDate descending to show most recent first
        const q = query(paymentHistoryRef); // You can add orderBy here if needed: orderBy("matchDate", "desc")
        const querySnapshot = await getDocs(q);

        const records = [];
        querySnapshot.forEach((doc) => {
          records.push({ id: doc.id, ...doc.data() });
        });

        // Sort records by matchDate in descending order (most recent first)
        records.sort((a, b) => new Date(b.matchDate) - new Date(a.matchDate));

        setPaymentRecords(records);
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
    };

    if (loggedInEmail) {
      fetchPaymentHistory();
    }
  }, [loggedInEmail]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        กำลังโหลดประวัติการชำระเงิน...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "50px", color: "red" }}>
        {error}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "30px",
        backgroundColor: "#f7f7f7",
        minHeight: "100vh",
        fontFamily: "'Kanit', sans-serif",
      }}
    >
      <h1 style={{ fontSize: "24px", marginBottom: "20px" }}>
        ประวัติการชำระเงิน
      </h1>

      {paymentRecords.length === 0 ? (
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
              fontSize: "14px",
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
                  }}
                >
                  วันที่ Match
                </th>
                <th
                  style={{
                    padding: "12px 10px",
                    borderRight: "1px solid #444",
                    textAlign: "left",
                  }}
                >
                  หัวข้อ Match
                </th>
                <th
                  style={{
                    padding: "12px 10px",
                    borderRight: "1px solid #444",
                    textAlign: "center",
                  }}
                >
                  ยอดรวม (บาท)
                </th>
                <th
                  style={{
                    padding: "12px 10px",
                    borderRight: "1px solid #444",
                    textAlign: "center",
                  }}
                >
                  สถานะการชำระ
                </th>
                <th style={{ padding: "12px 10px", textAlign: "center" }}>
                  รายละเอียด
                </th>
              </tr>
            </thead>
            <tbody>
              {paymentRecords.map((record) => {
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
                        backgroundColor: allPaid ? "#e6ffe6" : "inherit", // Light green if all paid
                      }}
                    >
                      <td
                        style={{
                          padding: "10px",
                          borderRight: "1px solid #eee",
                          textAlign: "left",
                        }}
                      >
                        {formatDate(record.matchDate)}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderRight: "1px solid #eee",
                          textAlign: "left",
                          fontWeight: "bold",
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
                        }}
                      >
                        {record.totalOverall}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderRight: "1px solid #eee",
                          textAlign: "center",
                          color: allPaid ? "#28a745" : "#ffc107",
                          fontWeight: "bold",
                        }}
                      >
                        {allPaid
                          ? "จ่ายครบแล้ว"
                          : `${paidCount}/${totalMembers} จ่ายแล้ว`}
                      </td>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <button
                          onClick={() =>
                            setExpandedMatchId(
                              expandedMatchId === record.id ? null : record.id
                            )
                          }
                          style={{
                            backgroundColor: "#007bff",
                            color: "#fff",
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
                    {expandedMatchId === record.id && (
                      <tr
                        style={{
                          backgroundColor: "#f0f8ff",
                          borderBottom: "2px solid #323943",
                        }}
                      >
                        <td colSpan="5" style={{ padding: "20px" }}>
                          <h4
                            style={{
                              fontSize: "16px",
                              marginBottom: "10px",
                              color: "#333",
                            }}
                          >
                            รายละเอียดการชำระเงินใน Match นี้:
                          </h4>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              fontSize: "13px",
                            }}
                          >
                            <thead>
                              <tr style={{ backgroundColor: "#e0e0e0" }}>
                                <th
                                  style={{
                                    padding: "8px",
                                    border: "1px solid #ccc",
                                    textAlign: "left",
                                  }}
                                >
                                  ชื่อผู้เล่น
                                </th>
                                <th
                                  style={{
                                    padding: "8px",
                                    border: "1px solid #ccc",
                                    textAlign: "center",
                                  }}
                                >
                                  ยอด (บาท)
                                </th>
                                <th
                                  style={{
                                    padding: "8px",
                                    border: "1px solid #ccc",
                                    textAlign: "center",
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
                                      ? "#f9fff9"
                                      : "#fff0f0",
                                  }}
                                >
                                  <td
                                    style={{
                                      padding: "8px",
                                      border: "1px solid #eee",
                                      textAlign: "left",
                                    }}
                                  >
                                    {member.name}
                                  </td>
                                  <td
                                    style={{
                                      padding: "8px",
                                      border: "1px solid #eee",
                                      textAlign: "center",
                                    }}
                                  >
                                    {member.total}
                                  </td>
                                  <td
                                    style={{
                                      padding: "8px",
                                      border: "1px solid #eee",
                                      textAlign: "center",
                                      color: member.isPaid
                                        ? "#28a745"
                                        : "#dc3545",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {member.isPaid ? "จ่ายแล้ว" : "ยังไม่จ่าย"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
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

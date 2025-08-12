// pages/PaymentHistory.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { db } from "../lib/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  startAfter,
} from "firebase/firestore";
import Swal from "sweetalert2";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
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
  const [recordsPerPage, setRecordsPerPage] = useState(25);
  const detailTableRefs = useRef({});

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
        userSnap.forEach((doc) => { userId = doc.id; });

        if (!userId) throw new Error("User data not found. Please log in again.");

        const paymentHistoryRef = collection(db, `users/${userId}/PaymentHistory`);
        let q;
        let startAfterDoc = null;

        if (loadMore && lastVisibleRef.current) {
          startAfterDoc = lastVisibleRef.current;
        } else if (page > 1) {
          const prevQuery = query(paymentHistoryRef, orderBy("matchDate", "desc"), limit((page - 1) * recordsPerPage));
          const prevSnapshot = await getDocs(prevQuery);
          if (!prevSnapshot.empty) {
            startAfterDoc = prevSnapshot.docs[prevSnapshot.docs.length - 1];
          }
        }

        q = startAfterDoc
          ? query(paymentHistoryRef, orderBy("matchDate", "desc"), startAfter(startAfterDoc), limit(recordsPerPage))
          : query(paymentHistoryRef, orderBy("matchDate", "desc"), limit(recordsPerPage));

        const querySnapshot = await getDocs(q);
        const newRecords = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (newRecords.length > 0) {
          lastVisibleRef.current = querySnapshot.docs[querySnapshot.docs.length - 1];
          setPaymentRecords(prev => loadMore ? [...prev, ...newRecords] : newRecords);
        } else if (!loadMore) {
          setPaymentRecords([]);
        }

        setHasMore(newRecords.length === recordsPerPage);

      } catch (err) {
        console.error("Error fetching payment history:", err);
        setError("ไม่สามารถดึงข้อมูลประวัติการชำระเงินได้: " + err.message);
        Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถดึงข้อมูลประวัติการชำระเงินได้: " + err.message, "error");
      } finally {
        setLoading(false);
      }
    }, [loggedInEmail, recordsPerPage]
  );

  useEffect(() => {
    if (loggedInEmail) {
      lastVisibleRef.current = null;
      setPaymentRecords([]);
      setHasMore(true);
      setCurrentPage(1);
      fetchPaymentHistory(false, 1);
    }
  }, [loggedInEmail, recordsPerPage, fetchPaymentHistory]);

  const handleNextPage = () => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1);
      fetchPaymentHistory(true, currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
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
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const fileName = `PaymentDetails_${record.topic.replace(/[^a-z0-9]/gi, '_')}_${formatDate(record.matchDate).replace(/\//g, "-")}.png`;
        saveAs(canvas.toDataURL("image/png"), fileName);
        Toast.fire({ icon: 'success', title: 'ดาวน์โหลดรูปภาพสำเร็จ!' });
    } catch (error) {
        console.error("Error generating image:", error);
        Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถสร้างไฟล์รูปภาพได้", "error");
    }
  };

  const filteredRecords = paymentRecords.filter((record) =>
    record.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getExpandedDetailsStyle = (isExpanded) => ({
    maxHeight: isExpanded ? '9999px' : '0',
    opacity: isExpanded ? '1' : '0',
    overflow: 'hidden',
    transition: 'max-height 0.6s ease-in-out, opacity 0.5s ease-in-out 0.1s',
    padding: '0',
  });

  return (
    <div className="main-content">
      <h1 className="main-title">ประวัติการชำระเงิน</h1>
      <hr className="title-separator" />

      <div className="search-filter-box">
        <div className="search-input-container">
          <input
            type="text"
            placeholder="ค้นหาตามหัวข้อ Match..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="record-count">
          จำนวน Match: {filteredRecords.length}
        </div>
      </div>

      {!loading && paymentRecords.length > 0 && (
        <div className="controls-container">
          <div className="pagination-controls">
            <button onClick={handlePrevPage} disabled={currentPage === 1 || loading} className="pagination-button">
              ย้อนกลับ
            </button>
            <span className="page-info">หน้า {currentPage}</span>
            <button onClick={handleNextPage} disabled={!hasMore || loading} className="pagination-button">
              ถัดไป
            </button>
          </div>
          <div className="per-page-selector">
            <label htmlFor="records-per-page">แสดง:</label>
            <select
              id="records-per-page"
              value={recordsPerPage}
              onChange={(e) => setRecordsPerPage(Number(e.target.value))}
              className="per-page-select"
            >
              <option value={10}>10 รายการ</option>
              <option value={20}>20 รายการ</option>
              <option value={25}>25 รายการ</option>
              <option value={50}>50 รายการ</option>
            </select>
          </div>
        </div>
      )}

      {loading && paymentRecords.length === 0 ? (
        <div className="status-message">กำลังโหลดประวัติการชำระเงิน...</div>
      ) : error ? (
        <div className="status-message error">{error}</div>
      ) : filteredRecords.length === 0 && !loading ? (
        <div className="status-message no-data">
          ไม่พบประวัติการชำระเงิน{searchTerm && ` สำหรับ "${searchTerm}"`}
        </div>
      ) : (
        <div className="table-responsive-container">
          <table className="payment-table">
            <thead>
              <tr>
                <th>วันที่ Match</th>
                <th>หัวข้อ Match</th>
                <th>ยอดรวม (บาท)</th>
                <th>สถานะการชำระ</th>
                <th>รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const paidCount = record.membersData.filter((m) => m.isPaid).length;
                const totalMembers = record.membersData.length;
                const allPaid = totalMembers > 0 && paidCount === totalMembers;
                const somePaid = paidCount > 0 && paidCount < totalMembers;

                const totalPaid = record.membersData.filter(m => m.isPaid).reduce((sum, m) => sum + m.total, 0);
                const totalUnpaid = record.membersData.filter(m => !m.isPaid).reduce((sum, m) => sum + m.total, 0);

                const rowClass = allPaid ? 'paid-all' : somePaid ? 'paid-some' : 'paid-none';

                return (
                  <React.Fragment key={record.id}>
                    <tr className={`main-data-row ${rowClass}`}>
                      <td data-label="วันที่ Match">{formatDate(record.matchDate)}</td>
                      <td data-label="หัวข้อ Match">{record.topic}</td>
                      <td data-label="ยอดรวม (บาท)" className="total-overall">{record.totalOverall}</td>
                      <td data-label="สถานะการชำระ">
                        <span className={`status-badge ${allPaid ? 'status-paid' : somePaid ? 'status-pending' : 'status-unpaid'}`}>
                            {allPaid ? "จ่ายครบแล้ว" : totalMembers > 0 ? `${paidCount}/${totalMembers} จ่ายแล้ว` : "ไม่มีสมาชิก"}
                        </span>
                      </td>
                      <td data-label="รายละเอียด">
                        <button
                          onClick={() => setExpandedMatchId(expandedMatchId === record.id ? null : record.id)}
                          className="detail-button"
                        >
                          {expandedMatchId === record.id ? "ซ่อน" : "ดูรายละเอียด"}
                        </button>
                      </td>
                    </tr>
                    <tr className="details-row">
                      <td colSpan="5">
                        <div style={getExpandedDetailsStyle(expandedMatchId === record.id)}>
                          {expandedMatchId === record.id && (
                            <div ref={(el) => (detailTableRefs.current[record.id] = el)} className="details-content">
                              <div className="details-header">
                                <h4>
                                  รายละเอียดการชำระเงิน
                                  <span>{formatDate(record.matchDate)}</span>
                                </h4>
                                <button onClick={() => handleDownloadDetailImage(record)} title="Download as Image" className="download-btn">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                  </svg>
                                </button>
                              </div>

                              <div className="details-table-container">
                                <table className="details-table">
                                  <thead>
                                    <tr>
                                      <th>ชื่อผู้เล่น</th>
                                      <th>ยอด (บาท)</th>
                                      <th>สถานะ</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {record.membersData
                                      .sort((a, b) => a.isPaid - b.isPaid)
                                      .map((member, idx) => (
                                      <tr key={idx} className={member.isPaid ? 'member-paid' : 'member-unpaid'}>
                                        <td>{member.name}</td>
                                        <td className="amount">{member.total}</td>
                                        <td className={`status ${member.isPaid ? 'paid' : 'unpaid'}`}>
                                          {member.isPaid ? "✔ จ่ายแล้ว" : "✕ ยังไม่จ่าย"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <div className="summary-box">
                                <h5>สรุปยอดรวมของ Match นี้</h5>
                                <div className="summary-grid">
                                  <div>
                                    <span>ยอดที่ชำระแล้ว:</span>
                                    <strong className="summary-paid">{totalPaid} บาท</strong>
                                  </div>
                                  <div>
                                    <span>ยอดค้างชำระ:</span>
                                    <strong className="summary-unpaid">{totalUnpaid} บาท</strong>
                                  </div>
                                  <div>
                                    <span>ยอดรวมทั้งหมด:</span>
                                    <strong className="summary-total">{record.totalOverall} บาท</strong>
                                  </div>
                                </div>
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

      <style jsx>{`
        .main-content {
          padding: 28px;
          background-color: #f7f7f7;
          min-height: 100vh;
          font-family: 'Kanit', sans-serif;
        }
        .main-title {
          font-size: 18px;
          margin-bottom: 10px;
        }
        .title-separator {
          border: 0;
          border-top: 1px solid #e0e0e0;
          margin-bottom: 20px;
        }
        .search-filter-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          background-color: #fff;
          padding: 15px 20px;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
          flex-wrap: wrap;
          gap: 15px;
        }
        .search-input-container {
          flex-grow: 1;
          min-width: 250px;
        }
        .search-input {
          padding: 7px 14px; /* Changed */
          border-radius: 6px; /* Changed */
          border: 1px solid #ccc;
          font-size: 13px; /* Changed */
          width: 100%;
          box-sizing: border-box;
        }
        .record-count {
          font-size: 12px;
          font-weight: 600;
          color: #333;
          white-space: nowrap;
        }

        .controls-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 15px;
        }
        .per-page-selector {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .per-page-selector label {
          font-size: 12px;
          color: #555;
        }
        .per-page-select {
          font-size: 12px;
          border: 1px solid #ccc;
          border-radius: 6px;
          padding: 6px 12px;
          background: #fff;
          cursor: pointer;
        }
        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pagination-button {
          background-color: #f8f9fa;
          color: #495057;
          padding: 6px 12px;
          border-radius: 5px;
          border: 1px solid #ced4da;
          cursor: pointer;
          font-size: 12px;
          transition: background-color 0.2s;
        }
        .pagination-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .pagination-button:hover:not(:disabled) {
          background-color: #e2e6ea;
        }
        .page-info {
          font-size: 12px;
          font-weight: bold;
        }

        .status-message {
          text-align: center;
          padding: 50px;
          font-size: 14px;
        }
        .status-message.error {
          color: red;
        }
        .status-message.no-data {
          background-color: #fff;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          color: #777;
        }

        .table-responsive-container {
          overflow-x: auto;
        }
        .payment-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .payment-table thead {
          background-color: #323943;
          color: white;
        }
        .payment-table th {
          padding: 12px 10px;
          text-align: center;
          font-weight: normal;
          border-right: 1px solid #4a515c;
        }
        .payment-table th:first-child {
          border-top-left-radius: 8px;
        }
        .payment-table th:last-child {
          border-top-right-radius: 8px;
          border-right: none;
        }

        .payment-table > tbody > .main-data-row > td {
          padding: 10px;
          border-bottom: 1px solid #eee;
          text-align: center;
          vertical-align: middle;
          border-right: 1px solid #eee;
        }
        .payment-table > tbody > .main-data-row > td:last-child { border-right: none; }

        .payment-table > tbody > tr.paid-all { background-color: #f0fff0; }
        .payment-table > tbody > tr.paid-some { background-color: #fffde6; }
        .payment-table > tbody > tr.paid-none { background-color: #fffafa; }
        .payment-table > tbody > .main-data-row:hover { background-color: #f5f5f5; }

        .details-row > td { 
          padding: 0; 
          border-bottom: 1px solid #ddd;
        }

        .total-overall {
          font-weight: bold;
          color: #e63946;
        }
        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-weight: bold;
          font-size: 11px;
        }
        .status-paid { background-color: #28a745; color: white; }
        .status-pending { background-color: #ffc107; color: #333; }
        .status-unpaid { background-color: #dc3545; color: white; }

        .detail-button {
          background-color: #4bf196;
          color: #000;
          padding: 6px 12px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-size: 13px;
          transition: background-color 0.2s;
        }
        .detail-button:hover { background-color: #37d381; }

        /* --- Details Section --- */
        .details-content {
          padding: 20px;
          background-color: #fff;
          overflow-x: auto;
        }
        .details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        .details-header h4 {
          font-size: 16px; color: #333; margin: 0; white-space: nowrap;
        }
        .details-header h4 span {
          font-size: 14px; color: #666; margin-left: 8px; font-weight: normal;
        }
        .download-btn {
          background: #ffffff; border: 1px solid #ddd; border-radius: 50%;
          width: 36px; height: 36px; cursor: pointer; display: flex;
          align-items: center; justify-content: center; box-shadow: 0 1px 4px rgba(0,0,0,0.1);
          color: #555; flex-shrink: 0;
        }
        .download-btn:hover { background-color: #f9f9f9; }

        .details-table-container {
          border: 1px solid #cceeff; border-radius: 8px;
          overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        .details-table {
          width: 100%; min-width: 500px; border-collapse: collapse; font-size: 13px;
        }
        .details-table thead tr { background-color: #e0f2f7; }
        .details-table th, .details-table td {
          padding: 10px 8px;
          text-align: center;
          vertical-align: middle;
          border-right: 1px solid #cceeff;
        }
        .details-table th {
          color: #333;
          font-weight: bold;
        }
        .details-table th:last-child, .details-table td:last-child {
          border-right: none;
        }

        .details-table tbody tr { border-bottom: 1px solid #e0f2f7; }
        .details-table tbody tr:last-child { border-bottom: none; }
        .details-table tbody tr.member-paid { background-color: #f7fcf9; }
        .details-table tbody tr.member-unpaid { background-color: #fff8f8; }
        .details-table td.status.paid { color: #28a745; font-weight: bold; }
        .details-table td.status.unpaid { color: #dc3545; font-weight: bold; }

        .summary-box {
          margin-top: 20px; padding: 15px; border-top: 2px solid #007bff;
          background-color: #f8f9fa; border-radius: 8px; min-width: 500px;
        }
        .summary-box h5 {
          font-size: 14px; margin-top: 0; margin-bottom: 15px;
          color: #0056b3; text-align: center;
        }
        .summary-grid {
          display: flex; justify-content: space-around; flex-wrap: wrap;
          gap: 15px; font-size: 13px; text-align: center;
        }
        .summary-grid span { display: block; color: #6c757d; margin-bottom: 5px; }
        .summary-grid strong { font-size: 16px; }
        .summary-paid { color: #28a745; }
        .summary-unpaid { color: #dc3545; }
        .summary-total { color: #007bff; }

        /* --- Responsive Styles for Mobile --- */
        @media (max-width: 768px) {
          .main-content { padding: 15px; }
          .search-filter-box { flex-direction: column; align-items: stretch; }
          .record-count {
            text-align: center;
          }
          .controls-container {
             flex-wrap: nowrap;
             gap: 10px;
          }
          .pagination-controls {
            flex-grow: 1;
          }
          .per-page-selector {
            flex-shrink: 0;
          }

          .table-responsive-container { border: none; background: none; }
          .payment-table { background: none; border-radius: 0; box-shadow: none; }
          .payment-table > thead { display: none; }

          .payment-table > tbody > .main-data-row {
            display: block; width: 100%;
            margin-bottom: 15px; border: 1px solid #ddd;
            border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            padding: 10px; background-color: #fff !important;
          }
          .payment-table > tbody > .main-data-row > td {
            display: block; text-align: right;
            padding-left: 50%; position: relative;
            border: none; border-bottom: 1px solid #f0f0f0;
            padding-top: 12px; padding-bottom: 12px;
            white-space: normal;
          }
          .payment-table > tbody > .main-data-row > td:first-child {
            text-align: right;
          }
          .payment-table > tbody > .main-data-row > td:last-child {
             border-bottom: none;
             border-right: none;
          }
          .payment-table > tbody > .main-data-row > td:before {
            content: attr(data-label);
            position: absolute; left: 10px; width: 45%;
            padding-right: 10px; text-align: left;
            font-weight: bold; color: #333;
          }

          .payment-table > tbody > .details-row { display: table-row; }
          .details-row > td { display: table-cell; }

          .details-content { padding: 10px; }
          .details-header h4 { font-size: 14px; }
          .details-header h4 span { display: block; margin-left: 0; margin-top: 4px; }

          .details-table { min-width: 0; }
          .details-table th, .details-table td {
            font-size: 12px;
            padding: 8px 5px;
            white-space: normal;
          }

          .summary-box { min-width: 0; margin-top: 15px; padding: 10px; }
          .summary-grid { flex-direction: column; gap: 8px; }
          .summary-grid strong { font-size: 14px; }
        }
      `}</style>
    </div>
  );
};

export default PaymentHistory;

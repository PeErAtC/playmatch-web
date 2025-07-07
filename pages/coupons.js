import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { QRCodeCanvas } from 'qrcode.react';
import Swal from 'sweetalert2';

// --- Reusable Coupon Ticket Component (No changes needed here) ---
const CouponTicket = ({ coupon }) => {
    if (!coupon) return null;

    const formatDate = (date) => {
        const d = date?.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const mainText = coupon.reason ? coupon.reason.toUpperCase() : `${coupon.amount} BAHT`;

    // This component's style is self-contained and doesn't need to match the main page UI.
    // Keeping the existing cool ticket design.
    return (
        <div className="ticket-svg-container">
            <svg width="100%" height="100%" viewBox="0 0 500 180">
                <defs>
                    <linearGradient id="ticketGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{stopColor: '#fff200', stopOpacity: 1}} />
                        <stop offset="100%" style={{stopColor: '#f9c509', stopOpacity: 1}} />
                    </linearGradient>
                </defs>
                <path d="M30 0 L470 0 C486 0 500 14 500 30 L500 150 C500 166 486 180 470 180 L30 180 C14 180 0 166 0 150 L0 30 C0 14 14 0 30 0 Z" fill="url(#ticketGradient)" stroke="#3D2075" strokeWidth="0.5"/>
                <circle cx="0" cy="25" r="8" fill="#f8f9fa" />
                <circle cx="0" cy="55" r="8" fill="#f8f9fa" />
                <circle cx="0" cy="85" r="8" fill="#f8f9fa" />
                <circle cx="0" cy="115" r="8" fill="#f8f9fa" />
                <circle cx="0" cy="145" r="8" fill="#f8f9fa" />
                <line x1="160" y1="15" x2="160" y2="165" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeDasharray="5,5" />
                <foreignObject x="25" y="35" width="120" height="110">
                    <div xmlns="http://www.w3.org/1999/xhtml" className="qr-code-wrapper">
                        <QRCodeCanvas value={coupon.code || 'error'} size={110} bgColor="#ffffff" fgColor="#000000" />
                    </div>
                </foreignObject>
                <foreignObject x="175" y="25" width="300" height="130">
                    <div xmlns="http://www.w3.org/1999/xhtml" className="info-wrapper">
                        <div className="info-header">DISCOUNT COUPON</div>
                        <div className="info-main">{mainText}</div>
                        <div className="info-footer">
                            <span>VALID UNTIL: {formatDate(coupon.expiresAt)}</span>
                        </div>
                    </div>
                </foreignObject>
            </svg>
        </div>
    );
};


// --- Main Page Component ---
const CouponsPage = () => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 30);
    return today.toISOString().split('T')[0];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [allCoupons, setAllCoupons] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [viewingCoupon, setViewingCoupon] = useState(null);
  const [userId, setUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormExpanded, setIsFormExpanded] = useState(true);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [newlyCreatedCouponId, setNewlyCreatedCouponId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (newlyCreatedCouponId) {
      const timer = setTimeout(() => setNewlyCreatedCouponId(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [newlyCreatedCouponId]);

  const fetchCoupons = async () => {
    if (!userId) {
        setAllCoupons([]);
        return;
    }
    const couponsRef = collection(db, `users/${userId}/Coupons`);
    const q = query(couponsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const couponsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setAllCoupons(couponsList);
  };

  useEffect(() => {
    fetchCoupons();
  }, [userId]);

  const resetForm = () => {
    setAmount('');
    setReason('');
    const today = new Date();
    today.setDate(today.getDate() + 30);
    setExpiresAt(today.toISOString().split('T')[0]);
    setEditingCoupon(null);
  };

  const handleCreateOrUpdateCoupon = async (e) => {
    e.preventDefault();
    if (!userId) return Swal.fire('ไม่พบผู้ใช้', 'กรุณาล็อกอินก่อนดำเนินการ', 'error');
    if (!amount || !expiresAt) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกมูลค่าส่วนลดและวันหมดอายุ', 'warning');

    setIsLoading(true);
    const expiryDate = new Date(expiresAt);
    expiryDate.setHours(23, 59, 59, 999);
    const finalReason = reason || `${amount} BAHT DISCOUNT`;

    try {
      if (editingCoupon) {
        const couponDocRef = doc(db, `users/${userId}/Coupons`, editingCoupon.id);
        await updateDoc(couponDocRef, {
          amount: Number(amount),
          reason: finalReason,
          expiresAt: expiryDate,
        });
        Swal.fire({ icon: 'success', title: 'แก้ไขคูปองสำเร็จ!', showConfirmButton: false, timer: 1500 });
      } else {
        const newCode = 'PROMO-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        const couponsRef = collection(db, `users/${userId}/Coupons`);
        await addDoc(couponsRef, {
          code: newCode,
          amount: Number(amount),
          reason: finalReason,
          status: 'ACTIVE',
          createdAt: serverTimestamp(),
          expiresAt: expiryDate,
          redeemedBy: null,
          redeemedAt: null,
        });
        setNewlyCreatedCouponId(newCode);
        Swal.fire({ icon: 'success', title: 'สร้างคูปองสำเร็จ!', showConfirmButton: false, timer: 1500 });
      }
      resetForm();
      await fetchCoupons();
      setIsFormExpanded(false);
    } catch (error) {
      console.error("Error saving coupon:", error);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกคูปองได้', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    Swal.fire({
      title: 'คุณแน่ใจหรือไม่?',
      text: "คุณจะไม่สามารถย้อนกลับได้!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        if (!userId) return Swal.fire('ไม่พบผู้ใช้', 'กรุณาล็อกอินก่อนดำเนินการ', 'error');
        try {
          await deleteDoc(doc(db, `users/${userId}/Coupons`, couponId));
          Swal.fire('ลบแล้ว!', 'คูปองของคุณถูกลบเรียบร้อยแล้ว', 'success');
          fetchCoupons();
        } catch (error) {
          console.error("Error deleting coupon:", error);
          Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถลบคูปองได้', 'error');
        }
      }
    });
  };

  const handleRestoreCoupon = async (couponId) => { // ฟังก์ชันสำหรับกู้คืนคูปอง
    Swal.fire({
      title: 'ต้องการกู้คืนคูปองนี้หรือไม่?',
      text: "สถานะคูปองจะถูกเปลี่ยนเป็น 'ใช้งานได้'",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'ใช่, กู้คืน!',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        if (!userId) return Swal.fire('ไม่พบผู้ใช้', 'กรุณาล็อกอินก่อนดำเนินการ', 'error');
        try {
          const couponDocRef = doc(db, `users/${userId}/Coupons`, couponId);
          await updateDoc(couponDocRef, {
            status: 'ACTIVE',
            redeemedBy: null,
            redeemedAt: null, // ล้างข้อมูลการใช้งาน
          });
          Swal.fire('กู้คืนแล้ว!', 'คูปองถูกกู้คืนเรียบร้อยแล้ว', 'success');
          fetchCoupons(); // ดึงข้อมูลคูปองใหม่เพื่ออัปเดต UI
        } catch (error) {
          console.error("Error restoring coupon:", error);
          Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถกู้คืนคูปองได้', 'error');
        }
      }
    });
  };

  const handleEditSelect = (coupon) => {
    if (editingCoupon && editingCoupon.id === coupon.id) {
      // If the same coupon is clicked again, deselect it
      resetForm();
    } else {
      // Otherwise, select this coupon for editing
      setEditingCoupon(coupon);
      setAmount(coupon.amount.toString());
      setReason(coupon.reason || '');
      const expiryDate = coupon.expiresAt?.toDate ? coupon.expiresAt.toDate() : new Date(coupon.expiresAt);
      setExpiresAt(expiryDate.toISOString().split('T')[0]);
      setIsFormExpanded(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getStatusComponent = (coupon) => {
    const now = new Date();
    const expiryDate = coupon.expiresAt?.toDate ? coupon.expiresAt.toDate() : new Date(coupon.expiresAt);
    let status = coupon.status;
    if (status === 'ACTIVE' && expiryDate < now) status = 'EXPIRED';

    const statusClasses = { ACTIVE: 'status-active', USED: 'status-used', EXPIRED: 'status-expired' };
    const statusTexts = { ACTIVE: 'ใช้งานได้', USED: 'ใช้แล้ว', EXPIRED: 'หมดอายุ' };
    return <span className={`status-badge ${statusClasses[status] || ''}`}>{statusTexts[status] || status}</span>;
  };
  
  const getActualStatus = (coupon) => {
    const now = new Date();
    const expiryDate = coupon.expiresAt?.toDate ? coupon.expiresAt.toDate() : new Date(coupon.expiresAt);
    return (coupon.status === 'ACTIVE' && expiryDate >= now) ? 'ACTIVE' : (coupon.status === 'USED' ? 'USED' : 'EXPIRED');
  };

  const openCouponModal = (coupon) => setViewingCoupon(coupon);
  const closeCouponModal = () => setViewingCoupon(null);
  
  // กรองคูปองตามสถานะจริงและแท็บที่เลือก
  const allActiveCoupons = allCoupons.filter(c => getActualStatus(c) === 'ACTIVE');
  const redeemedCoupons = allCoupons.filter(c => getActualStatus(c) === 'USED' || getActualStatus(c) === 'EXPIRED');

  const couponsToDisplay = activeTab === 'all' ? allActiveCoupons : redeemedCoupons;

  const filteredCouponsForDisplay = couponsToDisplay.filter(coupon =>
    coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(coupon.amount).includes(searchQuery) ||
    (coupon.reason && coupon.reason.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    Swal.fire({ icon: 'success', title: 'คัดลอกรหัสแล้ว!', showConfirmButton: false, timer: 1000, toast: true, position: 'top-end' });
  };

  const handleSetAmount = (value) => {
    setAmount(value);
    setReason(`${value} BAHT DISCOUNT`); // Set reason when preset amount is selected
  };

  const handleClearReason = () => { // ฟังก์ชันล้างข้อความบนคูปอง
    setReason('');
  };

  const indexOfLastItem = currentPage * itemsPerPage; //
  const indexOfFirstItem = indexOfLastItem - itemsPerPage; //
  const currentItems = filteredCouponsForDisplay.slice(indexOfFirstItem, indexOfLastItem); //
  const totalPages = Math.ceil(filteredCouponsForDisplay.length / itemsPerPage); //
  const paginate = (pageNumber) => setCurrentPage(pageNumber); //

  return (
    <>
      <div className="page-container">
        <h1>จัดการคูปอง</h1>
        
        <div className="content-card">
            <div className="card-header" onClick={() => setIsFormExpanded(!isFormExpanded)}>
                <span>{editingCoupon ? 'แก้ไขคูปอง' : 'ออกคูปองใหม่'}</span>
                <span className="collapse-icon">{isFormExpanded ? '−' : '+'}</span>
            </div>
            {isFormExpanded && (
                <div className="card-body">
                    <form onSubmit={handleCreateOrUpdateCoupon} className="coupon-form">
                        <div className="form-grid">
                            <div className="form-group">
                                <label>มูลค่าส่วนลด (บาท) *</label>
                                <input type="number" value={amount} onChange={(e) => handleSetAmount(e.target.value)} placeholder="50" required />
                                <div className="preset-amounts">
                                    <button type="button" onClick={() => handleSetAmount('50')}>฿50</button>
                                    <button type="button" onClick={() => handleSetAmount('100')}>฿100</button>
                                    <button type="button" onClick={() => handleSetAmount('200')}>฿200</button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>วันหมดอายุ *</label>
                                <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} required />
                            </div>
                            {/* ไม่ใส่ full-width แล้วเพื่อให้มันจัดเรียงใน grid ได้เลย */}
                            <div className="form-group">
                                <label>ข้อความบนคูปอง (ถ้ามี)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ส่วนลดพิเศษสำหรับลูกค้าใหม่" className="reason-input" />
                                    <button type="button" className="btn-clear-reason" onClick={handleClearReason}>
                                        ✕
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="form-actions">
                             <button type="submit" className="btn btn-submit" disabled={isLoading || !userId}>
                                {isLoading ? 'กำลังบันทึก...' : (editingCoupon ? 'บันทึกการแก้ไข' : 'สร้างคูปอง')}
                            </button>
                            {editingCoupon && (
                                <button type="button" className="btn btn-cancel" onClick={resetForm} disabled={isLoading}>
                                    ยกเลิก
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}
        </div>

        <div className="content-card">
           <div className="table-toolbar">
                <div className="tabs">
                    <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>
                        คูปองที่ใช้งานได้ ({allActiveCoupons.length})
                    </button>
                    <button className={activeTab === 'used' ? 'active' : ''} onClick={() => setActiveTab('used')}>
                        ประวัติ ({redeemedCoupons.length})
                    </button>
                </div>
                <div className="search-container">
                    <input 
                        type="text" 
                        placeholder="ค้นหา..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                    />
                </div>
           </div>

            <div className="table-responsive">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>รหัส</th>
                            <th>มูลค่า</th>
                            <th>ข้อความหลัก</th>
                            <th>สถานะ</th>
                            <th>วันหมดอายุ</th>
                            {activeTab !== 'all' && ( // แสดงเฉพาะเมื่อไม่ใช่แท็บ "คูปองที่ใช้งานได้"
                                <th>เวลาใช้งาน</th>
                            )}
                            <th>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.length > 0 ? currentItems.map(coupon => (
                            <tr key={coupon.id}>
                                <td>
                                    <input 
                                        type="checkbox" 
                                        className="row-checkbox"
                                        checked={editingCoupon?.id === coupon.id}
                                        onChange={() => handleEditSelect(coupon)}
                                    />
                                </td>
                                <td data-label="รหัส">{coupon.code} {newlyCreatedCouponId === coupon.code && <span className="new-tag">ใหม่</span>}</td>
                                <td data-label="มูลค่า">{coupon.amount} บาท</td>
                                <td data-label="ข้อความหลัก">{coupon.reason || '-'}</td>
                                <td data-label="สถานะ">{getStatusComponent(coupon)}</td>
                                <td data-label="วันหมดอายุ">{coupon.expiresAt?.toDate().toLocaleDateString('th-TH')}</td>
                                {activeTab !== 'all' && ( // แสดงเฉพาะเมื่อไม่ใช่แท็บ "คูปองที่ใช้งานได้"
                                    <td data-label="เวลาใช้งาน/หมดอายุ"> {/* แสดงข้อมูลเวลา */}
                                        {getActualStatus(coupon) === 'USED' && coupon.redeemedAt?.toDate ?
                                            `${coupon.redeemedAt.toDate().toLocaleDateString('th-TH')} ${coupon.redeemedAt.toDate().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`
                                            : (getActualStatus(coupon) === 'EXPIRED' ?
                                                `${coupon.expiresAt?.toDate().toLocaleDateString('th-TH')} ${coupon.expiresAt?.toDate().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`
                                                : '-'
                                            )
                                        }
                                    </td>
                                )}
                                <td data-label="จัดการ" className="actions-cell">
                                    <button className="action-btn view-btn" onClick={() => openCouponModal(coupon)}>ดูคูปอง</button>
                                    {getActualStatus(coupon) !== 'ACTIVE' && ( // แสดงปุ่มกู้คืนเฉพาะในแท็บประวัติ (USED/EXPIRED)
                                        <button className="action-btn restore-btn" onClick={() => handleRestoreCoupon(coupon.id)}>กู้คืน</button>
                                    )}
                                    <button className="action-btn delete-btn" onClick={() => handleDeleteCoupon(coupon.id)}>ลบ</button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={activeTab !== 'all' ? "8" : "7"} className="no-data">ไม่พบข้อมูล</td></tr> 
                        )}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && ( // แสดง pagination เมื่อมีมากกว่า 1 หน้า
                <div className="pagination">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i + 1} onClick={() => paginate(i + 1)} className={currentPage === i + 1 ? 'active' : ''}>
                      {i + 1}
                    </button>
                  ))}
                </div>
            )}
        </div>
      </div>

      {viewingCoupon && (
        <div className="modal-backdrop" onClick={closeCouponModal}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close-button" onClick={closeCouponModal}>&times;</button>
                <CouponTicket coupon={viewingCoupon} />
                <div className="modal-actions">
                    <button className="copy-code-button" onClick={() => handleCopyCode(viewingCoupon.code)}>
                        คัดลอกรหัส "{viewingCoupon.code}"
                    </button>
                </div>
            </div>
        </div>
      )}

      <style jsx>{`
        /* --- Global & Page Layout --- */
        .page-container {
          background-color: #f0f2f5;
          padding: 16px; /* Reduced from 24px */
          font-family: 'Kanit', sans-serif;
        }
        h1 {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin-bottom: 20px; /* Adjusted from 24px */
        }
        .content-card {
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
          margin-bottom: 20px; /* Adjusted from 24px */
          overflow: hidden;
        }
        .card-header {
          background-color: #f7f7f7;
          padding: 10px 20px; /* Reduced from 12px 24px */
          border-bottom: 1px solid #e8e8e8;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 500;
        }
        .collapse-icon {
          font-size: 20px;
        }
        .card-body {
          padding: 20px; /* Reduced from 24px */
        }

        /* --- Form Styles --- */
        .form-grid {
          display: grid;
          /* Adjusted grid to allow 3 columns on larger screens, flexible on smaller */
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); /* Adjusted minmax for smaller items */
          gap: 20px; /* Reduced from 24px */
        }
        /* No longer needed: .form-group.full-width { grid-column: 1 / -1; } */
        .form-group label {
          display: block;
          margin-bottom: 6px; /* Adjusted from 8px */
          font-size: 14px;
          color: #555;
          font-weight: 500;
        }
        .form-group input {
          width: 100%; /* Make input fill its grid column */
          padding: 8px 10px; /* Reduced from 10px 12px */
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          font-size: 14px;
          transition: border-color 0.3s;
        }
        .form-group input:focus {
          border-color: #1677ff;
          outline: none;
        }
        /* No specific width for .reason-input needed now as it's handled by grid */
        .preset-amounts {
          margin-top: 6px; /* Adjusted from 8px */
          display: flex;
          gap: 6px; /* Adjusted from 8px */
        }
        .preset-amounts button {
          padding: 5px 10px; /* Adjusted from 6px 12px */
          border: 1px solid #d9d9d9;
          background-color: #fafafa;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .preset-amounts button:hover {
          border-color: #1677ff;
          color: #1677ff;
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px; /* Adjusted from 12px */
          margin-top: 20px; /* Adjusted from 24px */
          padding-top: 20px; /* Adjusted from 24px */
          border-top: 1px solid #f0f0f0;
        }
        .btn {
          padding: 7px 14px; /* Adjusted from 8px 16px */
          border-radius: 4px;
          border: none;
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        .btn-submit {
          background-color: #28a745; /* Green color like the reference */
          color: white;
        }
        .btn-submit:hover {
          background-color: #218838;
        }
        .btn-cancel {
          background-color: #6c757d; /* Grey color */
          color: white;
        }
        .btn-cancel:hover {
          background-color: #5a6268;
        }
        .btn:disabled {
          background-color: #f5f5f5;
          color: #d9d9d9;
          cursor: not-allowed;
        }
        .btn-clear-reason {
            padding: 5px 9px; /* Adjusted padding for icon */
            border: 1px solid #1890ff; /* Blue border */
            background-color: #e6f7ff; /* Light blue background */
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
            color: #1890ff; /* Blue text/icon color */
        }
        .btn-clear-reason:hover {
            background-color: #bae7ff; /* Lighter blue on hover */
            color: #0c84ff;
        }

        /* --- Table Toolbar (Tabs & Search) --- */
        .table-toolbar {
          padding: 14px 20px; /* Reduced from 16px 24px */
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px; /* Adjusted from 16px */
        }
        .tabs {
          display: flex;
          gap: 7px; /* Adjusted from 8px */
        }
        .tabs button {
          padding: 7px 14px; /* Adjusted from 8px 16px */
          border: 1px solid transparent;
          border-bottom: 2px solid transparent;
          background: none;
          cursor: pointer;
          font-size: 14px;
          color: #555;
          transition: all 0.3s;
        }
        .tabs button:hover {
          color: #1677ff;
        }
        .tabs button.active {
          color: #1677ff;
          font-weight: 500;
          border-bottom: 2px solid #1677ff;
        }
        .search-container input {
          padding: 7px 10px; /* Adjusted from 8px 12px */
          border: 1px solid #d9d9d9;
          border-radius: 6px;
          width: 220px; /* Slightly reduced width */
        }

        /* --- Table Styles --- */
        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        .data-table th, .data-table td {
          padding: 14px; /* Reduced from 16px */
          text-align: left;
          font-size: 14px;
        }
        .data-table thead {
          background-color: #262626; /* Dark header like reference */
          color: #fff;
        }
        .data-table thead th {
          font-weight: 500;
        }
        .data-table tbody tr {
          border-bottom: 1px solid #f0f0f0;
          transition: background-color 0.2s;
        }
        .data-table tbody tr:hover {
          background-color: #fafafa;
        }
        .row-checkbox {
            cursor: pointer;
        }
        .status-badge {
          padding: 3px 10px; /* Adjusted from 4px 12px */
          border-radius: 10px; /* Adjusted from 12px */
          font-size: 11px; /* Slightly reduced font size */
          font-weight: 500;
          text-transform: capitalize;
        }
        .status-badge.status-active {
          background-color: #e6f7ff;
          color: #1890ff;
        }
        .status-badge.status-used {
          background-color: #f6f6f6;
          color: #595959;
        }
        .status-badge.status-expired {
          background-color: #fff1f0;
          color: #f5222d;
        }
        .actions-cell {
            display: flex;
            gap: 10px; /* Adjusted from 12px */
        }
        .action-btn {
            background: none;
            border: none;
            cursor: pointer;
            color: #1677ff;
            font-size: 14px;
        }
        .action-btn.delete-btn {
            color: #ff4d4f;
        }
        .action-btn.restore-btn { /* Style for the new restore button */
            color: #28a745; /* Green color */
        }
        .no-data {
            text-align: center;
            padding: 40px; /* Adjusted from 48px */
            color: #888;
        }
        .new-tag {
            background-color: #e6f7ff;
            color: #1890ff;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            margin-left: 4px;
        }
        /* Pagination */
        .pagination {
            padding: 14px 20px; /* Reduced from 16px 24px */
            text-align: right;
        }
        .pagination button {
            margin: 0 3px; /* Adjusted from 4px */
            padding: 5px 10px; /* Adjusted from 6px 12px */
            border: 1px solid #d9d9d9;
            background-color: #fff;
            cursor: pointer;
            border-radius: 4px;
        }
        .pagination button:hover {
            border-color: #1677ff;
            color: #1677ff;
        }
        .pagination button.active {
            background-color: #1677ff;
            border-color: #1677ff;
            color: #fff;
        }
        
        /* Modal Styles */
        .modal-backdrop { 
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background-color: rgba(0,0,0,0.6);
            display: flex; justify-content: center; 
            align-items: center; z-index: 1000; padding: 15px; 
            backdrop-filter: blur(3px);
        }
        .modal-content { 
            position: relative; width: 100%; max-width: 550px;
            background-color: transparent; box-shadow: none;
            z-index: 1001;
            animation: fadeInScale 0.3s ease-out;
        }
        @keyframes fadeInScale {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }
        .modal-close-button { 
            position: absolute; top: -15px; right: -15px;
            background: #fff; border: none;
            border-radius: 50%; width: 36px; height: 36px;
            font-size: 24px; cursor: pointer; color: #333;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 10;
            transition: all 0.2s ease;
        }
        .modal-close-button:hover {
            transform: rotate(90deg);
        }
        .modal-actions {
            text-align: center;
            margin-top: 20px;
        }
        .copy-code-button {
            padding: 10px 20px;
            background-color: #28a745;
            color: white; border: none; border-radius: 6px;
            cursor: pointer; font-size: 16px; font-weight: 500;
            transition: background-color 0.2s ease;
        }
        .copy-code-button:hover {
            background-color: #218838;
        }

        /* --- Ticket Styles (Self-contained) --- */
        .ticket-svg-container { max-width: 500px; margin: 0 auto; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.2)); }
        .qr-code-wrapper { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: white; border-radius: 8px; padding: 5px; }
        .info-wrapper { width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 10px; color: #333; font-weight: bold; text-align: center; }
        .info-header { font-size: 0.8rem; font-weight: 600; letter-spacing: 1px; color: rgba(0,0,0,0.7); }
        .info-main { font-size: 2.5rem; font-weight: 800; line-height: 1.1; padding: 5px; text-transform: uppercase; }
        .info-footer { font-size: 0.8rem; font-weight: 500; color: rgba(0,0,0,0.6); }

      `}</style>
    </>
  );
};

export default CouponsPage;

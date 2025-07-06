import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { QRCodeCanvas } from 'qrcode.react';
import Swal from 'sweetalert2';

// --- Reusable Coupon Ticket Component (Final Text Style) ---
const CouponTicket = ({ coupon }) => {
    if (!coupon) return null;

    const formatDate = (date) => {
        const d = date?.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const mainText = coupon.reason ? coupon.reason.toUpperCase() : `${coupon.amount} BAHT`;

    return (
        <div className="ticket-svg-container">
            <svg width="100%" height="100%" viewBox="0 0 500 180">
                <defs>
                    {/* Changed gradient to a blue/purple tone */}
                    <linearGradient id="ticketGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{stopColor: '#fff200', stopOpacity: 1}} /> {}
                        <stop offset="100%" style={{stopColor: '#f9c509', stopOpacity: 1}} /> {}
                    </linearGradient>
                </defs>
                {/* Updated path for a more modern, slightly rounded shape with a "perforated" left edge effect */}
                <path d="M30 0 L470 0 C486 0 500 14 500 30 L500 150 C500 166 486 180 470 180 L30 180 C14 180 0 166 0 150 L0 30 C0 14 14 0 30 0 Z" fill="url(#ticketGradient)" stroke="#3D2075" strokeWidth="0.5"/>
                
                {/* Mockup perforation effect on the left side */}
                <circle cx="0" cy="25" r="8" fill="#f8f9fa" />
                <circle cx="0" cy="55" r="8" fill="#f8f9fa" />
                <circle cx="0" cy="85" r="8" fill="#f8f9fa" />
                <circle cx="0" cy="115" r="8" fill="#f8f9fa" />
                <circle cx="0" cy="145" r="8" fill="#f8f9fa" />

                {/* Dashed line separator */}
                <line x1="160" y1="15" x2="160" y2="165" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeDasharray="5,5" />
                
                {/* QR Code Section */}
                <foreignObject x="25" y="35" width="120" height="110">
                    <div xmlns="http://www.w3.org/1999/xhtml" className="qr-code-wrapper">
                        <QRCodeCanvas value={coupon.code || 'error'} size={110} bgColor="#ffffff" fgColor="#000000" /> {/* Increased size */}
                    </div>
                </foreignObject>
                
                {/* Coupon Info Section */}
                <foreignObject x="175" y="25" width="300" height="130"> {/* Adjusted position and size */}
                    <div xmlns="http://www.w3.org/1999/xhtml" className="info-wrapper">
                        <div className="info-header">DISCOUNT COUPON</div>
                        <div className="info-main">
                            {mainText}
                        </div>
                        <div className="info-footer">
                            <span>VALID UNTIL: {formatDate(coupon.expiresAt)}</span> {/* Changed text to VALID UNTIL */}
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
  const [generatedCoupon, setGeneratedCoupon] = useState(null);
  const [viewingCoupon, setViewingCoupon] = useState(null);
  const [userId, setUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormExpanded, setIsFormExpanded] = useState(true);
  const [editingCoupon, setEditingCoupon] = useState(null); // New state for editing
  const [newlyCreatedCouponId, setNewlyCreatedCouponId] = useState(null); // State for new coupon tag

  // Pagination states
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

  // Effect for new coupon tag
  useEffect(() => {
    if (newlyCreatedCouponId) {
      const timer = setTimeout(() => {
        setNewlyCreatedCouponId(null);
      }, 10000); // 10 seconds
      return () => clearTimeout(timer);
    }
  }, [newlyCreatedCouponId]);

  const fetchCoupons = async (newCouponCode = null) => {
    if (!userId) {
        setAllCoupons([]);
        return;
    }
    const couponsRef = collection(db, `users/${userId}/Coupons`);
    const q = query(couponsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const couponsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setAllCoupons(couponsList);

    if (newCouponCode) {
        const newCoupon = couponsList.find(c => c.code === newCouponCode);
        if (newCoupon) {
            setGeneratedCoupon(newCoupon);
            openCouponModal(newCoupon);
        }
    }
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
    setIsFormExpanded(false); // <--- Added: Collapse the form when resetting
  };

  const handleCreateOrUpdateCoupon = async (e) => {
    e.preventDefault();
    if (!userId) {
        Swal.fire('ไม่พบผู้ใช้', 'กรุณาล็อกอินก่อนดำเนินการ', 'error');
        return;
    }
    if (!amount || !expiresAt) {
      Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกมูลค่าส่วนลดและวันหมดอายุ', 'warning');
      return;
    }

    setIsLoading(true);
    const expiryDate = new Date(expiresAt);
    expiryDate.setHours(23, 59, 59, 999);
    const finalReason = reason || `${amount} BAHT DISCOUNT`;

    try {
      if (editingCoupon) {
        // Update existing coupon
        const couponDocRef = doc(db, `users/${userId}/Coupons`, editingCoupon.id);
        await updateDoc(couponDocRef, {
          amount: Number(amount),
          reason: finalReason,
          expiresAt: expiryDate,
        });
        Swal.fire({ icon: 'success', title: 'แก้ไขคูปองสำเร็จ!', showConfirmButton: false, timer: 1500 });
      } else {
        // Create new coupon
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
        setNewlyCreatedCouponId(newCode); // Set new coupon ID
        Swal.fire({ icon: 'success', title: 'สร้างคูปองสำเร็จ!', showConfirmButton: false, timer: 1500 });
      }
      
      resetForm();
      await fetchCoupons(); // Re-fetch all coupons to update the table
      // setIsFormExpanded(false); // This is now handled by resetForm()

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
        try {
          if (!userId) {
            Swal.fire('ไม่พบผู้ใช้', 'กรุณาล็อกอินก่อนดำเนินการ', 'error');
            return;
          }
          await deleteDoc(doc(db, `users/${userId}/Coupons`, couponId));
          Swal.fire('ลบแล้ว!', 'คูปองของคุณถูกลบเรียบร้อยแล้ว', 'success');
          fetchCoupons(); // Re-fetch coupons after deletion
        } catch (error) {
          console.error("Error deleting coupon:", error);
          Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถลบคูปองได้', 'error');
        }
      }
    });
  };

  const handleEditSelect = (coupon) => {
    if (editingCoupon?.id === coupon.id) {
        // If the same coupon is clicked, deselect and reset form
        resetForm(); // <--- This will now collapse the form
    } else {
        // Select a new coupon for editing
        setEditingCoupon(coupon);
        setAmount(coupon.amount.toString());
        setReason(coupon.reason || '');
        const expiryDate = coupon.expiresAt?.toDate ? coupon.expiresAt.toDate() : new Date(coupon.expiresAt);
        setExpiresAt(expiryDate.toISOString().split('T')[0]);
        setIsFormExpanded(true); // Expand form when editing
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top
    }
  };


  const getStatusComponent = (coupon) => {
    const now = new Date();
    const expiryDate = coupon.expiresAt?.toDate ? coupon.expiresAt.toDate() : new Date(coupon.expiresAt);
    let status = coupon.status;
    if (status === 'ACTIVE' && expiryDate < now) status = 'EXPIRED';
    const statusClasses = { ACTIVE: 'status-active', REDEEMED: 'status-redeemed', EXPIRED: 'status-expired' };
    const statusTexts = { ACTIVE: 'ใช้งานได้', REDEEMED: 'ใช้แล้ว', EXPIRED: 'หมดอายุ' };
    return <span className={`status ${statusClasses[status] || ''}`}>{statusTexts[status] || status}</span>;
  };

  const openCouponModal = (coupon) => setViewingCoupon(coupon);
  const closeCouponModal = () => setViewingCoupon(null);
  
  const redeemedCoupons = allCoupons.filter(c => c.status === 'REDEEMED');

  // Filter coupons based on search query
  const filteredCoupons = allCoupons.filter(coupon =>
    coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(coupon.amount).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (coupon.reason && coupon.reason.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const filteredRedeemedCoupons = redeemedCoupons.filter(coupon =>
    coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(coupon.amount).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (coupon.redeemedBy && coupon.redeemedBy.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    Swal.fire({
      icon: 'success',
      title: 'คัดลอกรหัสสำเร็จ!',
      showConfirmButton: false,
      timer: 1000,
      toast: true,
      position: 'top-end'
    });
  };

  const handleSetAmount = (value) => {
    setAmount(value);
    if (!reason) {
        setReason(`${value} BAHT DISCOUNT`);
    }
  };

  const toggleFormExpansion = () => {
    setIsFormExpanded(!isFormExpanded);
    if (isFormExpanded && editingCoupon) { // If it's expanded and in edit mode, and user clicks to collapse
        resetForm(); // Reset form and collapse
    } else if (!isFormExpanded && !editingCoupon) { // If collapsed and not editing, just expand
        // Do nothing, just let it expand
    }
  };

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCoupons.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCoupons.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <>
      <div className="page-container">
        <h1 className="page-title">จัดการคูปองส่วนลด</h1>
        <div className="card form-card">
          <h2 className="card-title-expandable" onClick={toggleFormExpansion}>
            {editingCoupon ? 'แก้ไขคูปอง' : 'ออกคูปองใหม่'}
            <span className="expand-icon">{isFormExpanded ? '×' : '+'}</span>
          </h2>
          {isFormExpanded && (
            <form onSubmit={handleCreateOrUpdateCoupon} className="coupon-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="control-label">มูลค่าส่วนลด (บาท)</label>
                  <input type="number" className="control-input" value={amount} onChange={(e) => handleSetAmount(e.target.value)} placeholder="50" required />
                  <div className="preset-amounts">
                      <button type="button" onClick={() => handleSetAmount('50')} className="preset-button">฿50</button>
                      <button type="button" onClick={() => handleSetAmount('100')} className="preset-button">฿100</button>
                      <button type="button" onClick={() => handleSetAmount('200')} className="preset-button">฿200</button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="control-label">วันหมดอายุ</label>
                  <input type="date" className="control-input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="control-label">ข้อความหลักบนคูปอง (ถ้ามี) <span className="info-tooltip" title="ข้อความนี้จะแสดงอยู่บนคูปองแทนมูลค่า หากระบุ">(?)</span></label>
                <input type="text" className="control-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น HALF PRICE, ส่วนลดพิเศษ" />
              </div>
              <div className="button-container">
                <button type="submit" className={`action-button ${editingCoupon ? 'edit-mode' : ''}`} disabled={isLoading || !userId}>
                  {isLoading ? 'กำลังบันทึก...' : (editingCoupon ? 'บันทึกการแก้ไข' : 'สร้างคูปอง')}
                </button>
                {editingCoupon && (
                  <button type="button" className="cancel-button" onClick={resetForm} disabled={isLoading}>
                    ยกเลิก
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        <div className="card table-container-card">
          <div className="tab-nav">
              <button className={`tab-button ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
                  คูปองทั้งหมด ({allCoupons.length})
              </button>
              <button className={`tab-button ${activeTab === 'used' ? 'active' : ''}`} onClick={() => setActiveTab('used')}>
                  ประวัติการใช้งาน ({redeemedCoupons.length})
              </button>
          </div>
          
          <div className="search-bar">
            <input 
              type="text" 
              placeholder="ค้นหารหัส, มูลค่า, หรือข้อความหลัก..." 
              className="control-input search-input" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>

          <div className="table-wrapper">
              {activeTab === 'all' && (
                  <table className="data-table">
                        <thead>
                            <tr>
                                <th></th> {/* Checkbox column header */}
                                <th>รหัส</th>
                                <th>มูลค่า</th>
                                <th>ข้อความหลัก</th>
                                <th>สถานะ</th>
                                <th>วันหมดอายุ</th>
                                <th>การกระทำ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.length > 0 ? currentItems.map(coupon => (
                                <tr key={coupon.id}>
                                    <td data-label="เลือก">
                                        <input 
                                            type="checkbox" 
                                            checked={editingCoupon?.id === coupon.id}
                                            onChange={() => handleEditSelect(coupon)}
                                        />
                                    </td>
                                    <td data-label="รหัส">{coupon.code} {newlyCreatedCouponId === coupon.code && <span className="new-tag">(ใหม่)</span>}</td>
                                    <td data-label="มูลค่า">{coupon.amount} บาท</td>
                                    <td data-label="ข้อความหลัก">{coupon.reason || '-'}</td>
                                    <td data-label="สถานะ">{getStatusComponent(coupon)}</td>
                                    <td data-label="วันหมดอายุ">{coupon.expiresAt?.toDate().toLocaleDateString('th-TH')}</td>
                                    <td data-label="การกระทำ" className="actions-cell">
                                        <button className="view-button" onClick={() => openCouponModal(coupon)}><i className="fas fa-eye"></i> ดูคูปอง</button>
                                        <button className="delete-button" onClick={() => handleDeleteCoupon(coupon.id)}><i className="fas fa-trash-alt"></i> ลบ</button>
                                    </td>
                                </tr>
                            )) : <tr><td colSpan="7" style={{textAlign: 'center', padding: '20px'}}>ไม่พบข้อมูลคูปองที่ตรงกับการค้นหา</td></tr>}
                        </tbody>
                  </table>
              )}
              {activeTab === 'used' && (
                  <table className="data-table">
                        <thead>
                            <tr><th>รหัส</th><th>มูลค่า</th><th>ผู้ใช้งาน</th><th>วันที่ใช้</th></tr>
                        </thead>
                        <tbody>
                            {filteredRedeemedCoupons.length > 0 ? filteredRedeemedCoupons.map(coupon => (
                                <tr key={coupon.id}>
                                    <td data-label="รหัส">{coupon.code}</td>
                                    <td data-label="มูลค่า">{coupon.amount} บาท</td>
                                    <td data-label="ผู้ใช้งาน">{coupon.redeemedBy || '-'}</td>
                                    <td data-label="วันที่ใช้">{coupon.redeemedAt?.toDate().toLocaleDateString('th-TH')}</td>
                                </tr>
                            )) : <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>ไม่พบประวัติการใช้งานคูปองที่ตรงกับการค้นหา</td></tr>}
                        </tbody>
                  </table>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && activeTab === 'all' && (
                <div className="pagination">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => paginate(i + 1)}
                      className={`pagination-button ${currentPage === i + 1 ? 'active' : ''}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>

      {viewingCoupon && (
        <div className="modal-backdrop" onClick={closeCouponModal}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close-button" onClick={closeCouponModal}>&times;</button>
                <CouponTicket coupon={viewingCoupon} />
                <div className="modal-actions">
                    <button className="copy-code-button" onClick={() => handleCopyCode(viewingCoupon.code)}>
                        <i className="fas fa-copy"></i> คัดลอกรหัส "{viewingCoupon.code}"
                    </button>
                </div>
            </div>
        </div>
      )}

      <style jsx>{`
        @import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css");
        
        .page-container {
          padding: 20px;
          background-color: #f8f9fa;
          min-height: 100vh;
          font-family: 'Kanit', sans-serif;
          max-width: 1200px;
          margin: 0 auto;
        }
        .card {
          background-color: #ffffff;
          padding: 25px;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          margin-bottom: 25px;
        }

        /* --- TICKET STYLES --- */
        .ticket-svg-container {
            max-width: 500px;
            margin: 0 auto;
            filter: drop-shadow(0 8px 16px rgba(0,0,0,0.25)); /* Stronger shadow */
            transition: transform 0.3s ease; /* Add transition for hover effect */
        }
        .ticket-svg-container:hover {
            transform: translateY(-5px); /* Lift effect on hover */
        }
        .qr-code-wrapper {
            width: 100%; height: 100%;
            display: flex; align-items: center; justify-content: center;
            background: white;
            border-radius: 10px; /* Slightly more rounded */
            padding: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1); /* Small shadow for QR code */
        }
        .info-wrapper {
            width: 100%; height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            padding: 15px 10px; /* More padding */
            color: #1a1a1a; /* Default color, overridden by inline style for ticket */
            font-weight: bold;
            text-align: center;
        }
        .info-header {
            font-size: 0.9rem; /* Slightly larger */
            font-weight: 700; /* Bolder */
            letter-spacing: 1.5px; /* More spacing */
            color: rgba(0,0,0,0.8); /* Darker */
            margin-bottom: 5px;
        }
        .info-main {
            font-size: 3rem; /* Larger for impact */
            font-weight: 900; /* Extra bold */
            line-height: 1; /* Tighter line height */
            padding: 5px 10px;
            text-transform: uppercase;
            color: #333; /* Darker main text */
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1); /* Subtle text shadow */
        }
        .info-footer {
            font-size: 0.85rem; /* Slightly larger */
            font-weight: 600; /* Bolder */
            color: rgba(0,0,0,0.7); /* Darker */
            margin-top: 5px;
        }

        /* Modal Styles */
        .modal-backdrop { 
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background-color: rgba(0,0,0,0.8); /* Darker, more opaque backdrop */
            display: flex; justify-content: center; 
            align-items: center; z-index: 1000; padding: 15px; 
            backdrop-filter: blur(5px); /* Add blur effect */
        }
        .modal-content { 
            position: relative; width: 100%; max-width: 550px; /* Slightly wider modal */
            background-color: transparent;
            box-shadow: none;
            z-index: 1001;
            animation: fadeInScale 0.3s ease-out; /* Add entry animation */
        }
        @keyframes fadeInScale {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }
        .modal-close-button { 
            position: absolute; top: -20px; right: -20px; /* Adjusted position */
            background: #f8f9fa; /* Lighter background */
            border: none; /* No border */
            border-radius: 50%; width: 40px; height: 40px; /* Larger button */
            font-size: 28px; /* Larger icon */
            cursor: pointer; line-height: 1; color: #495057; /* Darker color */
            box-shadow: 0 4px 10px rgba(0,0,0,0.2); /* Stronger shadow */
            z-index: 10;
            transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
        }
        .modal-close-button:hover {
            background-color: #e9ecef;
            color: #212529;
            transform: rotate(90deg); /* Rotate on hover */
        }
        .modal-actions {
            text-align: center;
            margin-top: 25px; /* More space */
        }
        .copy-code-button {
            padding: 12px 25px; /* More padding */
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 10px; /* More rounded */
            cursor: pointer;
            font-size: 17px; /* Slightly larger font */
            font-weight: 600; /* Bolder font */
            display: inline-flex;
            align-items: center;
            gap: 10px; /* More gap */
            transition: background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
            box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3); /* Green shadow */
        }
        .copy-code-button:hover {
            background-color: #218838;
            transform: translateY(-2px); /* More pronounced lift */
            box-shadow: 0 6px 12px rgba(40, 167, 69, 0.4); /* Stronger green shadow */
        }
        .copy-code-button i {
            margin-right: 5px;
        }


        /* Other styles */
        .page-title { 
            font-size: 28px; font-weight: 700; margin-bottom: 30px; 
            color: #212529; text-align: center; 
        }
        
        .card-title-expandable {
            font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 25px; 
            color: #212529; border-bottom: 1px solid #e9ecef; padding-bottom: 15px;
            display: flex; justify-content: space-between; align-items: center;
            cursor: pointer;
        }

        .expand-icon {
            font-size: 24px;
            font-weight: 400;
            line-height: 1;
            padding: 0 5px;
            transition: transform 0.3s ease;
        }
        .card-title-expandable:hover .expand-icon {
            transform: scale(1.1);
        }

        .coupon-form .form-row { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
        }
        .form-group { margin-bottom: 15px; }
        .control-label { 
            display: block; margin-bottom: 8px; font-size: 14px; 
            color: #495057; font-weight: 600; 
        }
        .info-tooltip {
            cursor: help;
            color: #6c757d;
            font-size: 0.9em;
            margin-left: 5px;
        }
        .control-input { 
            width: 100%; padding: 12px 15px; border: 1px solid #ced4da; 
            border-radius: 8px; font-size: 15px; 
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .control-input:focus {
            border-color: #146cfa; 
            outline: 0;
            box-shadow: 0 0 0 0.2rem rgba(106, 90, 205, .25); 
        }
        .preset-amounts {
            margin-top: 10px;
            display: flex;
            gap: 10px;
        }
        .preset-button {
            padding: 8px 15px;
            border: 1px solid #146cfa; 
            border-radius: 6px;
            background-color: #E6E0F8; 
            color: #146cfa; 
            font-size: 14px;
            cursor: pointer;
            transition: background-color 0.2s ease, color 0.2s ease;
        }
        .preset-button:hover {
            background-color: #146cfa; 
            color: white;
        }

        .button-container {
            display: flex;
            justify-content: flex-end; /* Pushes content to the right */
            align-items: center; /* Vertically align items */
            gap: 15px;
            margin-top: 20px;
        }
        .action-button { 
            width: 100%; 
            max-width: 200px;
            padding: 12px 20px; border: none; border-radius: 8px; 
            color: white; font-weight: 500; cursor: pointer; font-size: 16px; 
            background-color: #146cfa; /* Main button color from sidebar tone */
            transition: background-color 0.2s ease, transform 0.1s ease;
            box-shadow: 0 4px 8px rgba(106, 90, 205, 0.3);
        }
        .action-button.edit-mode {
            background-color: #FFC107; /* Yellow for edit mode */
            box-shadow: 0 4px 8px rgba(255,193,7,0.3);
        }
        .action-button.edit-mode:hover:not(:disabled) {
            background-color: #E0A800; /* Darker yellow on hover */
        }
        .action-button:hover:not(:disabled) {
            background-color: #146cfa;
            transform: translateY(-2px); /* More pronounced lift */
            box-shadow: 0 6px 12px rgba(106, 90, 205, 0.4);
        }
        .action-button:disabled {
            background-color: #D3CDEE; 
            cursor: not-allowed;
            box-shadow: none;
        }

        .cancel-button {
            width: 100%; 
            max-width: 150px;
            padding: 12px 20px; border: none; border-radius: 8px; 
            color: white; font-weight: 500; cursor: pointer; font-size: 16px; 
            background-color: #6c757d; /* Darker grey for cancel */
            transition: background-color 0.2s ease, transform 0.1s ease;
            box-shadow: 0 4px 8px rgba(108,117,125,0.3);
        }
        .cancel-button:hover:not(:disabled) {
            background-color: #495057;
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(108,117,125,0.4);
        }
        .cancel-button:disabled {
            background-color: #dee2e6;
            cursor: not-allowed;
            color: #a0a0a0;
            box-shadow: none;
        }

        .tab-nav { 
            display: flex; border-bottom: none; margin-bottom: 20px; 
        }
        .tab-button { 
            padding: 12px 20px; border: none; background: #f1f3f5; cursor: pointer; 
            font-size: 15px; font-weight: 600; color: #6c757d; 
            border-bottom: 3px solid transparent; margin-right: 10px; 
            border-radius: 8px 8px 0 0;
            transition: color 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
        }
        .tab-button:hover {
            color: #146cfa; 
        }
        .tab-button.active { 
            color: #146cfa; 
            border-bottom-color: #146cfa; 
            background-color: #ffffff; 
        }

        .search-bar {
            margin-bottom: 20px;
        }
        .search-input {
            width: 100%;
            padding: 10px 15px;
            border: 1px solid #ced4da; /* Consistent border color */
            border-radius: 8px;
            font-size: 14px;
        }

        .table-wrapper { overflow-x: auto; }
        .data-table { 
            width: 100%; border-collapse: separate; border-spacing: 0; 
        }
        .data-table th, .data-table td { 
            padding: 12px 15px; text-align: left; font-size: 14px; 
            white-space: nowrap; border-bottom: 1px solid #e9ecef; 
        }
        .data-table th { 
            background-color: #146cfa; 
            color: #fff; font-size: 13px; 
            text-transform: uppercase; letter-spacing: 0.5px;
        }
        .data-table th:first-child { border-top-left-radius: 8px; }
        .data-table th:last-child { border-top-right-radius: 8px; }
        .data-table tbody tr:last-child td {
            border-bottom: none;
        }
        .data-table tbody tr:hover {
            background-color: #f1f3f5; /* Lighter grey on hover */
        }
        .data-table td.actions-cell {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .status { 
            padding: 5px 12px; border-radius: 15px; color: #fff; 
            font-size: 12px; font-weight: 600; text-transform: uppercase; 
        }
        .status-active { background-color: #28a745; } /* Green */
        .status-redeemed { background-color: #dc3545; } /* Red */
        .status-expired { background-color: #6c757d; } /* Grey */
        .view-button { 
            font-size: 13px; padding: 6px 12px; background-color: #146cfa; 
            color: white; border: none; border-radius: 6px; cursor: pointer; 
            display: inline-flex; align-items: center; gap: 5px;
            transition: background-color 0.2s ease;
        }
        .view-button:hover { background-color: #146cfa; }

        .delete-button {
            font-size: 13px; padding: 6px 12px; background-color: #dc3545; /* Red */
            color: white; border: none; border-radius: 6px; cursor: pointer;
            display: inline-flex; align-items: center; gap: 5px;
            transition: background-color 0.2s ease;
        }
        .delete-button:hover {
            background-color: #c82333;
        }

        .new-tag {
            background-color: #146cfa; 
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.75em;
            margin-left: 5px;
            vertical-align: middle;
        }

        /* Pagination styles */
        .pagination {
            display: flex;
            justify-content: center;
            margin-top: 20px;
            gap: 8px;
        }
        .pagination-button {
            padding: 8px 14px;
            border: 1px solid #146cfa; 
            border-radius: 6px;
            background-color: white;
            color: #146cfa; 
            font-size: 14px;
            cursor: pointer;
            transition: background-color 0.2s ease, color 0.2s ease;
        }
        .pagination-button:hover {
            background-color: #E6E0F8; 
        }
        .pagination-button.active {
            background-color: #146cfa; 
            color: white;
            font-weight: bold;
        }

        @media (max-width: 768px) {
            .page-title { font-size: 24px; text-align: left; }
            .card-title-expandable { font-size: 18px; }
            .card { padding: 15px; }

            .data-table thead {
                display: none;
            }
            .data-table, .data-table tbody, .data-table tr, .data-table td {
                display: block;
                width: 100%;
            }
            .data-table tr {
                margin-bottom: 10px;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .data-table td {
                text-align: right;
                padding-left: 50%;
                position: relative;
                border-bottom: 1px solid #f1f3f5;
            }
            .data-table td:last-child {
                border-bottom: none;
            }
            .data-table td::before {
                content: attr(data-label);
                position: absolute;
                left: 10px;
                width: calc(50% - 20px);
                white-space: nowrap;
                text-align: left;
                font-weight: 600;
                color: #495057;
            }

            .data-table td:first-child {
                text-align: left;
            }
            .data-table td:first-child::before {
                content: "";
            }

            .preset-amounts {
                flex-wrap: wrap;
            }

            .button-container {
                flex-direction: column;
                gap: 10px;
                align-items: stretch; /* Stretch buttons to full width in column layout */
            }
            .action-button, .cancel-button {
                max-width: 100%;
            }
            .data-table td.actions-cell {
                flex-direction: column;
                align-items: flex-end;
            }
        }
      `}</style>
    </>
  );
};

export default CouponsPage;

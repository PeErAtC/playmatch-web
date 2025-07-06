import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { QRCodeCanvas } from 'qrcode.react';
import Swal from 'sweetalert2';

// --- Reusable Coupon Ticket Component (Final Text Style) ---
const CouponTicket = ({ coupon }) => {
    if (!coupon) return null;

    const formatDate = (date) => {
        const d = date?.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Use reason as the main text if it exists, otherwise use the amount.
    const mainText = coupon.reason ? coupon.reason.toUpperCase() : `${coupon.amount} BAHT`;

    return (
        <div className="ticket-svg-container">
            <svg width="100%" height="100%" viewBox="0 0 500 180">
                <defs>
                    <linearGradient id="ticketGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{stopColor: '#ffd60a', stopOpacity: 1}} />
                        <stop offset="100%" style={{stopColor: '#ffc107', stopOpacity: 1}} />
                    </linearGradient>
                </defs>
                <path d="M25 0 L475 0 L500 25 L500 155 L475 180 L25 180 L0 155 L0 25 Z" fill="url(#ticketGradient)" stroke="#e8a200" strokeWidth="0.5"/>
                <line x1="160" y1="15" x2="160" y2="165" stroke="rgba(0,0,0,0.2)" strokeWidth="2" strokeDasharray="5,5" />
                <foreignObject x="20" y="35" width="120" height="110">
                    <div xmlns="http://www.w3.org/1999/xhtml" className="qr-code-wrapper">
                        <QRCodeCanvas value={coupon.code || 'error'} size={100} bgColor="#ffffff" fgColor="#000000" />
                    </div>
                </foreignObject>
                <foreignObject x="170" y="15" width="315" height="150">
                    <div xmlns="http://www.w3.org/1999/xhtml" className="info-wrapper">
                        <div className="info-header">DISCOUNT COUPON</div>
                        <div className="info-main">{mainText}</div>
                        <div className="info-footer">
                            <span>EXPIRATION DATE: {formatDate(coupon.expiresAt)}</span>
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
  const [expiresAt, setExpiresAt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [allCoupons, setAllCoupons] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [generatedCoupon, setGeneratedCoupon] = useState(null);
  const [viewingCoupon, setViewingCoupon] = useState(null);
  const [userId, setUserId] = useState(null);

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
        }
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [userId]);

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!userId) {
        Swal.fire('ไม่พบผู้ใช้', 'กรุณาล็อกอินก่อนสร้างคูปอง', 'error');
        return;
    }
    if (!amount || !expiresAt) {
      Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกมูลค่าส่วนลดและวันหมดอายุ', 'warning');
      return;
    }

    setIsLoading(true);
    setGeneratedCoupon(null);
    const newCode = 'PROMO-' + Math.random().toString(36).substr(2, 8).toUpperCase();

    try {
      const couponsRef = collection(db, `users/${userId}/Coupons`);
      const expiryDate = new Date(expiresAt);
      expiryDate.setHours(23, 59, 59, 999);

      await addDoc(couponsRef, {
        code: newCode,
        amount: Number(amount),
        reason: reason || '',
        status: 'ACTIVE',
        createdAt: serverTimestamp(),
        expiresAt: expiryDate,
        redeemedBy: null,
        redeemedAt: null,
      });

      await fetchCoupons(newCode);

      Swal.fire({ icon: 'success', title: 'สร้างคูปองสำเร็จ!', showConfirmButton: false, timer: 1500 });
      setAmount(''); setReason(''); setExpiresAt('');

    } catch (error) {
      console.error("Error creating coupon:", error);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถสร้างคูปองได้', 'error');
    } finally {
      setIsLoading(false);
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

  return (
    <>
      <div className="page-container">
        <h1 className="page-title">จัดการคูปองส่วนลด</h1>
        <div className="card form-card">
          <h2 className="card-title">ออกคูปองใหม่</h2>
          <form onSubmit={handleCreateCoupon} className="coupon-form">
            <div className="form-row">
              <div className="form-group">
                <label className="control-label">มูลค่าส่วนลด (บาท)</label>
                <input type="number" className="control-input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50" required />
              </div>
              <div className="form-group">
                <label className="control-label">วันหมดอายุ</label>
                <input type="date" className="control-input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label className="control-label">ข้อความหลักบนคูปอง (ถ้ามี)</label>
              <input type="text" className="control-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น HALF PRICE, ส่วนลดพิเศษ" />
            </div>
            <button type="submit" className="action-button" disabled={isLoading || !userId}>
              {isLoading ? 'กำลังสร้าง...' : 'สร้างคูปอง'}
            </button>
          </form>
        </div>

        {generatedCoupon && (
          <div className="generated-coupon-container">
            <h2 className="card-title">คูปองที่สร้างล่าสุด</h2>
            <CouponTicket coupon={generatedCoupon} />
          </div>
        )}

        <div className="card table-container-card">
          <div className="tab-nav">
              <button className={`tab-button ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
                  คูปองทั้งหมด ({allCoupons.length})
              </button>
              <button className={`tab-button ${activeTab === 'used' ? 'active' : ''}`} onClick={() => setActiveTab('used')}>
                  ประวัติการใช้งาน ({redeemedCoupons.length})
              </button>
          </div>
          <div className="table-wrapper">
              {activeTab === 'all' && (
                  <table className="data-table">
                        <thead>
                            <tr><th>รหัส</th><th>มูลค่า</th><th>ข้อความหลัก</th><th>สถานะ</th><th>การกระทำ</th></tr>
                        </thead>
                        <tbody>
                            {allCoupons.map(coupon => (<tr key={coupon.id}>
                                <td data-label="รหัส">{coupon.code}</td>
                                <td data-label="มูลค่า">{coupon.amount} บาท</td>
                                <td data-label="ข้อความหลัก">{coupon.reason || '-'}</td>
                                <td data-label="สถานะ">{getStatusComponent(coupon)}</td>
                                <td data-label="การกระทำ">
                                <button className="view-button" onClick={() => openCouponModal(coupon)}>ดูคูปอง</button>
                                </td>
                            </tr>))}
                        </tbody>
                  </table>
              )}
              {activeTab === 'used' && (
                  <table className="data-table">
                        <thead>
                            <tr><th>รหัส</th><th>มูลค่า</th><th>ผู้ใช้งาน</th><th>วันที่ใช้</th></tr>
                        </thead>
                        <tbody>
                            {redeemedCoupons.map(coupon => (<tr key={coupon.id}>
                                <td data-label="รหัส">{coupon.code}</td>
                                <td data-label="มูลค่า">{coupon.amount} บาท</td>
                                <td data-label="ผู้ใช้งาน">{coupon.redeemedBy || '-'}</td>
                                <td data-label="วันที่ใช้">{coupon.redeemedAt?.toDate().toLocaleDateString('th-TH')}</td>
                            </tr>))}
                        </tbody>
                  </table>
              )}
          </div>
        </div>
      </div>

      {viewingCoupon && (
        <div className="modal-backdrop" onClick={closeCouponModal}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close-button" onClick={closeCouponModal}>&times;</button>
                <CouponTicket coupon={viewingCoupon} />
            </div>
        </div>
      )}

      <style jsx>{`
        .page-container {
          padding: 20px;
          background-color: #f0f2f5;
          min-height: 100vh;
          font-family: 'Kanit', sans-serif;
        }
        .card {
          background-color: #ffffff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          margin-bottom: 20px;
        }

        /* --- TICKET STYLES --- */
        .ticket-svg-container {
            max-width: 500px;
            margin: 0 auto;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.15));
        }
        .qr-code-wrapper {
            width: 100%; height: 100%;
            display: flex; align-items: center; justify-content: center;
            background: white;
            border-radius: 8px;
        }
        .info-wrapper {
            width: 100%; height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            padding: 10px 5px;
            color: #1a1a1a;
            font-weight: bold;
            text-align: center;
        }
        .info-header {
            font-size: 0.8rem; /* 12.8px */
            font-weight: 600;
            letter-spacing: 1px;
            color: rgba(0,0,0,0.7);
        }
        .info-main {
            font-size: 2.8rem; /* 44.8px */
            font-weight: 800;
            line-height: 1.1;
            padding: 5px 10px;
            text-transform: uppercase;
        }
        .info-footer {
            font-size: 0.75rem; /* 12px */
            font-weight: 500;
            color: rgba(0,0,0,0.8);
        }

        /* Modal Styles */
        .modal-backdrop { 
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background-color: rgba(0,0,0,0.7); display: flex; justify-content: center; 
            align-items: center; z-index: 1000; padding: 15px; 
        }
        .modal-content { position: relative; width: 100%; max-width: 500px; }
        .modal-close-button { 
            position: absolute; top: -10px; right: -10px; background: white; 
            border: none; border-radius: 50%; width: 30px; height: 30px; 
            font-size: 20px; cursor: pointer; line-height: 1; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 10;
        }

        /* Other styles */
        .page-title, .card-title { color: #343a40; font-weight: 600; }
        .page-title { font-size: 22px; margin-bottom: 20px; }
        .card-title { font-size: 16px; margin-top: 0; margin-bottom: 20px; }
        .coupon-form .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .form-group { margin-bottom: 15px; }
        .control-label { display: block; margin-bottom: 6px; font-size: 13px; color: #495057; font-weight: 500; }
        .control-input { width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px; font-size: 14px; }
        .action-button { width: 100%; padding: 10px; border: none; border-radius: 6px; color: white; font-weight: 500; cursor: pointer; font-size: 14px; background-color: #007bff; }
        .generated-coupon-container { margin-bottom: 20px; }
        .tab-nav { display: flex; border-bottom: 1px solid #dee2e6; margin-bottom: 15px; }
        .tab-button { padding: 8px 16px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 500; color: #6c757d; border-bottom: 2px solid transparent; margin-bottom: -1px; }
        .tab-button.active { color: #007bff; border-bottom-color: #007bff; }
        .table-wrapper { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 10px 12px; text-align: left; font-size: 13px; white-space: nowrap; border-bottom: 1px solid #f1f3f5; }
        .data-table th { background-color: #343a40; color: #fff; font-size: 12px; }
        .status { padding: 4px 10px; border-radius: 10px; color: #fff; font-size: 11px; }
        .status-active { background-color: #28a745; }
        .status-redeemed { background-color: #dc3545; }
        .status-expired { background-color: #6c757d; }
        .view-button { font-size: 12px; padding: 4px 10px; background-color: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer; }
        @media (max-width: 768px) {
            .coupon-form .form-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
};

export default CouponsPage;

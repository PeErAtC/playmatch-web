import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db, auth } from '../lib/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, deleteDoc, updateDoc, limit, startAfter } from 'firebase/firestore';
import Barcode from 'react-barcode';
import Swal from 'sweetalert2';
import Head from 'next/head';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { FiDownload } from "react-icons/fi";

// Helper function to format date
const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('th-TH', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
};

const StyledCouponTicket = React.forwardRef(({ coupon }, ref) => {
    if (!coupon) return null;

    return (
        <div className="coupon-render-wrapper" ref={ref}>
            <div className="coupon-card">
                <div className="coupon-stub">
                    <div className="coupon-barcode">
                        <Barcode
                            value={coupon.code || 'NOCODE'}
                            width={1.5}
                            height={50}
                            displayValue={false}
                            background="#FFFFFF"
                            lineColor="#000000"
                            margin={0}
                        />
                    </div>
                    <div className="coupon-code-text">{coupon.code}</div>
                </div>
                <div className="coupon-main-content">
                    <div className="coupon-title-text">{coupon.name}</div>
                    <div className="coupon-value-box">
                        {coupon.amount || 0} BAHT
                    </div>
                    <div className="coupon-expiry-text">
                        หมดอายุ: {formatDate(coupon.expiresAt)}
                    </div>
                </div>
            </div>
            <style jsx>{`
                .coupon-render-wrapper {
                    width: 100%;
                    max-width: 480px;
                    font-family: 'Inter', 'Kanit', sans-serif;
                    filter: drop-shadow(0 10px 20px rgba(0,0,0,0.2));
                }
                .coupon-card {
                    display: flex;
                    width: 100%;
                    aspect-ratio: 16 / 7.5;
                    position: relative;
                }
                .coupon-card::after { /* Perforated effect */
                    content: '';
                    position: absolute;
                    left: 120px;
                    top: 10px;
                    bottom: 10px;
                    width: 0;
                    border-left: 2px dashed rgba(255,255,255,0.4);
                }
                .coupon-stub {
                    flex: 0 0 120px;
                    background: #fff;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 10px;
                    border-top-left-radius: 12px;
                    border-bottom-left-radius: 12px;
                }
                .coupon-barcode {
                    flex-grow: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                }
                .coupon-code-text {
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 1px;
                    color: #333;
                    margin-top: 5px;
                }

                .coupon-main-content {
                    flex-grow: 1;
                    background: #e53935;
                    color: #fff;
                    padding: 15px 25px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    text-align: center;
                    border-top-right-radius: 12px;
                    border-bottom-right-radius: 12px;
                }
                .coupon-title-text {
                    font-size: 16px;
                    font-weight: 500;
                    margin-bottom: 5px;
                    opacity: 0.9;
                }
                .coupon-value-box {
                    background: #fff;
                    color: #e53935;
                    border-radius: 50px;
                    padding: 8px 15px;
                    margin: 8px auto;
                    font-weight: 800;
                    font-size: 36px;
                    line-height: 1;
                    display: inline-block;
                }
                .coupon-expiry-text {
                    font-size: 12px;
                    font-weight: 500;
                    opacity: 0.8;
                    margin-top: 8px;
                }
            `}</style>
        </div>
    );
});
StyledCouponTicket.displayName = 'StyledCouponTicket';


// Main Page Component
const CouponsPage = () => {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [expiresAt, setExpiresAt] = useState(() => {
        const today = new Date();
        today.setDate(today.getDate() + 30);
        return today.toISOString().split('T')[0];
    });
    const [isLoading, setIsLoading] = useState(false);
    const [coupons, setCoupons] = useState([]);
    const [viewingCoupon, setViewingCoupon] = useState(null);
    const [userId, setUserId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFormExpanded, setIsFormExpanded] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [activeTab, setActiveTab] = useState('active');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [lastVisible, setLastVisible] = useState(null);
    const [pageHistory, setPageHistory] = useState([]);
    const [hasNextPage, setHasNextPage] = useState(true);

    const couponTicketRef = useRef(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                setUserId(null);
                setCoupons([]);
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchCoupons = useCallback(async (direction = 'first') => {
        if (!userId) {
            setCoupons([]);
            return;
        }

        setIsLoading(true);
        const couponsRef = collection(db, `users/${userId}/Coupons`);
        let q;

        const baseQuery = query(couponsRef, orderBy('createdAt', 'desc'));

        if (direction === 'next' && lastVisible) {
            q = query(baseQuery, startAfter(lastVisible), limit(itemsPerPage));
        } else if (direction === 'prev' && pageHistory.length > 0) {
            const prevCursor = pageHistory[pageHistory.length - 1] || null;
            q = query(baseQuery, startAfter(prevCursor), limit(itemsPerPage));
        } else {
            q = query(baseQuery, limit(itemsPerPage));
        }

        try {
            const querySnapshot = await getDocs(q);
            const couponsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (!querySnapshot.empty) {
                const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
                setLastVisible(newLastVisible);

                if (direction === 'next') {
                    setPageHistory(prev => [...prev, lastVisible]);
                    setCurrentPage(prev => prev + 1);
                } else if (direction === 'prev') {
                    setPageHistory(prev => prev.slice(0, -1));
                    setCurrentPage(prev => Math.max(1, prev - 1));
                } else {
                    setCurrentPage(1);
                    setPageHistory([]);
                }
            }

            setCoupons(couponsList);
            setHasNextPage(couponsList.length === itemsPerPage);

        } catch (error) {
            console.error("Error fetching coupons:", error);
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลคูปองได้', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [userId, itemsPerPage, lastVisible, pageHistory]);

    useEffect(() => {
        if (userId) {
            setLastVisible(null);
            fetchCoupons('first');
        }
    }, [userId, itemsPerPage]);

    const resetForm = () => {
        setAmount('');
        setReason('');
        const today = new Date();
        today.setDate(today.getDate() + 30);
        setExpiresAt(today.toISOString().split('T')[0]);
        setEditingCoupon(null);
        setIsFormExpanded(false);
    };

    const handleCreateOrUpdateCoupon = async (e) => {
        e.preventDefault();
        if (!userId) return Swal.fire('ไม่พบผู้ใช้', 'กรุณาล็อกอินก่อนดำเนินการ', 'error');
        if (!amount || !expiresAt) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกมูลค่าส่วนลดและวันหมดอายุ', 'warning');

        setIsLoading(true);
        const expiryDate = new Date(expiresAt);
        expiryDate.setHours(23, 59, 59, 999);

        const couponData = {
            name: reason || `ส่วนลด ${amount} บาท`,
            discount: Number(amount),
            amount: Number(amount),
            expiresAt: expiryDate,
        };

        if (reason) couponData.reason = reason;

        try {
            if (editingCoupon) {
                const couponDocRef = doc(db, `users/${userId}/Coupons`, editingCoupon.id);
                await updateDoc(couponDocRef, couponData);
                Swal.fire({ icon: 'success', title: 'แก้ไขคูปองสำเร็จ!', text: `รหัสคูปอง: ${editingCoupon.code}`, showConfirmButton: false, timer: 2000 });
            } else {
                const newCode = 'PROMO-' + Math.random().toString(36).substr(2, 8).toUpperCase();
                const couponsRef = collection(db, `users/${userId}/Coupons`);
                await addDoc(couponsRef, { ...couponData, code: newCode, status: 'ACTIVE', createdAt: serverTimestamp(), redeemedBy: null, redeemedAt: null, redeemedForMembers: [] });
                Swal.fire({ icon: 'success', title: 'สร้างคูปองสำเร็จ!', text: `รหัสคูปอง: ${newCode}`, showConfirmButton: false, timer: 2500 });
            }
            resetForm();
            await fetchCoupons('first');
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
          text: "คุณจะไม่สามารถย้อนกลับการกระทำนี้ได้!",
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
              fetchCoupons('first');
            } catch (error) {
              console.error("Error deleting coupon:", error);
              Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถลบคูปองได้', 'error');
            }
          }
        });
    };

    const handleDownloadCouponImage = async () => {
        if (!couponTicketRef.current || !viewingCoupon) {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่พบข้อมูลคูปองสำหรับดาวน์โหลด', 'error');
            return;
        }

        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true });

        try {
            const canvas = await html2canvas(couponTicketRef.current, { backgroundColor: null, scale: 3, useCORS: true });
            const fileName = `Coupon_${viewingCoupon.code}.png`;
            saveAs(canvas.toDataURL('image/png'), fileName);
            Toast.fire({ icon: 'success', title: 'ดาวน์โหลดรูปภาพสำเร็จ!' });
        } catch (error) {
            console.error("Error generating image:", error);
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์รูปภาพได้', 'error');
        }
    };

    const handleEditSelect = (coupon) => {
        if (editingCoupon && editingCoupon.id === coupon.id) {
            resetForm();
        } else {
            setEditingCoupon(coupon);
            setAmount(coupon.amount.toString());
            setReason(coupon.name || '');
            const expiryDate = coupon.expiresAt?.toDate ? coupon.expiresAt.toDate() : new Date(coupon.expiresAt);
            setExpiresAt(expiryDate.toISOString().split('T')[0]);
            setIsFormExpanded(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const getActualStatus = (coupon) => {
        if (!coupon || !coupon.expiresAt) return 'UNKNOWN';
        const now = new Date();
        const expiryDate = coupon.expiresAt?.toDate ? coupon.expiresAt.toDate() : new Date(coupon.expiresAt);
        if (coupon.status === 'USED') return 'USED';
        if (expiryDate < now) return 'EXPIRED';
        return 'ACTIVE';
    };

    const getStatusComponent = (status) => {
        const statusClasses = { ACTIVE: 'status-active', USED: 'status-used', EXPIRED: 'status-expired' };
        const statusTexts = { ACTIVE: 'ใช้งานได้', USED: 'ใช้แล้ว', EXPIRED: 'หมดอายุ' };
        return <span className={`status-badge ${statusClasses[status] || ''}`}>{statusTexts[status] || status}</span>;
    };

    const openCouponModal = (coupon) => setViewingCoupon(coupon);
    const closeCouponModal = () => setViewingCoupon(null);

    const couponsOnPage = coupons.filter(coupon =>
        (coupon.name && coupon.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (coupon.code && coupon.code.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    let currentItems;
    if (activeTab === 'active') currentItems = couponsOnPage.filter(c => getActualStatus(c) === 'ACTIVE');
    else if (activeTab === 'used') currentItems = couponsOnPage.filter(c => getActualStatus(c) === 'USED');
    else currentItems = couponsOnPage.filter(c => getActualStatus(c) === 'EXPIRED');

    return (
        <div className="main-content">
            <Head>
                <title>จัดการคูปอง - PlayMatch</title>
            </Head>

            <h2>จัดการคูปองส่วนลด</h2>
            <hr className="title-separator" />

            {/* --- FORM SECTION --- */}
            <div className="form-section">
                <div className="form-header" onClick={() => setIsFormExpanded(!isFormExpanded)}>
                    <h3>{editingCoupon ? 'แก้ไขคูปอง' : 'สร้างคูปองใหม่'}</h3>
                    <button className="toggle-form-button">{isFormExpanded ? '−' : '+'}</button>
                </div>
                <div className={`form-content ${isFormExpanded ? 'expanded' : 'collapsed'}`}>
                    <form onSubmit={handleCreateOrUpdateCoupon} noValidate>
                        <div className="form-grid">
                            <div>
                                <label className="form-label">มูลค่าส่วนลด (บาท) *</label>
                                <input type="number" className="modern-input" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                            </div>
                            <div>
                                <label className="form-label">วันหมดอายุ *</label>
                                <input type="date" className="modern-input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} required />
                            </div>
                            <div className="full-width">
                                <label className="form-label">ชื่อ / เหตุผลในการให้คูปอง</label>
                                <input type="text" className="modern-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ส่วนลดพิเศษสำหรับลูกค้าใหม่"/>
                            </div>
                        </div>
                        <div className="form-actions">
                             <button type="submit" className="submit-btn" disabled={isLoading || !userId}>
                                {isLoading ? 'กำลังบันทึก...' : (editingCoupon ? 'บันทึกการแก้ไข' : 'สร้างคูปอง')}
                            </button>
                            {editingCoupon && (
                                <button type="button" className="cancel-btn" onClick={resetForm} disabled={isLoading}>
                                    ยกเลิก
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            <hr className="divider-line" />

            {/* --- CONTROLS SECTION (LAYOUT UPDATED) --- */}
            <div className="controls-section">
                {/* Row 1: Search Bar */}
                <div className="search-row">
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อ, รหัสคูปอง..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="modern-input search-input"
                    />
                </div>

                {/* Row 2: Pagination Controls with Item Count */}
                <div className="pagination-controls">
                    <div className="pagination-buttons">
                        <button
                            onClick={() => fetchCoupons('prev')}
                            disabled={currentPage === 1 || isLoading}
                            className="pagination-button"
                        >
                            ย้อนกลับ
                        </button>
                        <span>หน้า {currentPage}</span>
                        <button
                            onClick={() => fetchCoupons('next')}
                            disabled={!hasNextPage || isLoading}
                            className="pagination-button"
                        >
                            ถัดไป
                        </button>
                    </div>
                    <div className="pagination-count">
                        <span>จำนวนคูปองในหน้านี้: {currentItems.length}</span>
                    </div>
                </div>

                {/* Row 3: Tabs and Filter */}
                <div className="table-toolbar">
                    <div className="tabs">
                        <button className={activeTab === 'active' ? 'active' : ''} onClick={() => setActiveTab('active')}>
                            ใช้งานได้
                        </button>
                        <button className={activeTab === 'used' ? 'active' : ''} onClick={() => setActiveTab('used')}>
                            ใช้แล้ว
                        </button>
                        <button className={activeTab === 'expired' ? 'active' : ''} onClick={() => setActiveTab('expired')}>
                            หมดอายุ
                        </button>
                    </div>
                    <div className="per-page-selector">
                        <label htmlFor="itemsPerPage">แสดง:</label>
                        <select
                            id="itemsPerPage"
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            className="modern-input"
                        >
                            <option value={10}>10 รายการ</option>
                            <option value={20}>20 รายการ</option>
                            <option value={50}>50 รายการ</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* --- TABLE SECTION --- */}
            <div className="table-responsive-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>เลือก</th>
                            <th>ชื่อคูปอง</th>
                            <th>ส่วนลด</th>
                            <th>รหัส</th>
                            <th>สถานะ</th>
                            {activeTab === 'active' && <th>วันหมดอายุ</th>}
                            {activeTab === 'used' && <th>ใช้โดย / วันที่</th>}
                            {activeTab === 'expired' && <th>วันที่หมดอายุ</th>}
                            <th>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && !currentItems.length ? (
                            <tr><td colSpan="7" className="no-data-message">กำลังโหลด...</td></tr>
                        ) : currentItems.length > 0 ? currentItems.map(coupon => (
                            <tr key={coupon.id} className={editingCoupon?.id === coupon.id ? "selected-row" : ""}>
                                <td data-label="เลือก">
                                    <input
                                        type="checkbox"
                                        checked={editingCoupon?.id === coupon.id}
                                        onChange={() => handleEditSelect(coupon)}
                                    />
                                </td>
                                <td data-label="ชื่อคูปอง">{coupon.name || '-'}</td>
                                <td data-label="ส่วนลด">{coupon.discount || coupon.amount} บาท</td>
                                <td data-label="รหัส">{coupon.code}</td>
                                <td data-label="สถานะ">{getStatusComponent(getActualStatus(coupon))}</td>
                                {activeTab === 'active' && <td data-label="วันหมดอายุ">{formatDate(coupon.expiresAt)}</td>}
                                {activeTab === 'used' && <td data-label="ใช้โดย / วันที่">
                                    <div>
                                        <strong>
                                            {(coupon.redeemedForMembers && coupon.redeemedForMembers.length > 0)
                                                ? coupon.redeemedForMembers.join(', ')
                                                : (coupon.redeemedBy || 'N/A')}
                                        </strong>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#666' }}>
                                        {coupon.redeemedAt?.toDate().toLocaleDateString('th-TH')}
                                    </div>
                                </td>}
                                {activeTab === 'expired' && <td data-label="วันที่หมดอายุ">{formatDate(coupon.expiresAt)}</td>}
                                <td data-label="จัดการ">
                                    <div className="action-buttons">
                                        <button className="action-btn view-btn" onClick={() => openCouponModal(coupon)}>
                                            ดูคูปอง
                                        </button>
                                        <button className="action-btn delete-btn" onClick={() => handleDeleteCoupon(coupon.id)}>
                                            ลบ
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="7" className="no-data-message">ไม่พบข้อมูลคูปอง</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- MODAL --- */}
            {viewingCoupon && (
                <div className="modal-backdrop" onClick={closeCouponModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-button" onClick={closeCouponModal}>&times;</button>
                        <StyledCouponTicket coupon={viewingCoupon} ref={couponTicketRef} />
                        <button className="download-coupon-btn" onClick={handleDownloadCouponImage}>
                            <FiDownload /> ดาวน์โหลดคูปองนี้
                        </button>
                    </div>
                </div>
             )}

            <style jsx>{`
                /* Global, Form, Table, etc. Styles */
                .main-content { padding: 20px; background-color: #f7f7f7; font-family: 'Kanit', sans-serif; }
                h2 { font-size: 18px; margin-bottom: 10px; color: #333; }
                .title-separator { border: 0; border-top: 1px solid #aebdc9; margin-bottom: 25px; }
                .divider-line { margin: 30px 0; border-top: 1px solid #aebdc9; }
                .form-section { background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05); border: 1px solid #e9e9e9; margin-bottom: 20px; }
                .form-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; background-color: #e9e9e9; border-top-left-radius: 8px; border-top-right-radius: 8px; border-bottom: 1px solid #ddd; cursor: pointer; user-select: none; }
                .form-header h3 { margin: 0; font-size: 14px; color: #333; }
                .toggle-form-button { background: none; border: none; font-size: 20px; font-weight: bold; cursor: pointer; color: #555; }
                .form-content { overflow: hidden; transition: max-height 0.5s ease-out, opacity 0.5s ease-out, padding 0.5s ease-out; max-height: 0px; opacity: 0; padding: 0 15px; }
                .form-content.expanded { max-height: 500px; opacity: 1; padding: 20px 15px; }
                .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
                .form-grid .full-width { grid-column: 1 / -1; }
                .form-label { font-size: 12px; color: #333; display: block; margin-bottom: 4px; }
                .modern-input { outline: none; border: 1px solid #ccc; padding: 8px 12px; font-size: 14px; width: 100%; border-radius: 5px; transition: border-color 0.2s, box-shadow 0.2s; }
                .modern-input:focus { border-color: #333; box-shadow: 0 0 0 3px rgba(226, 226, 226, 0.2); }
                .form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #f0f0f0; }
                .submit-btn, .cancel-btn { padding: 8px 20px; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; transition: background-color 0.2s; font-weight: 600; }
                .submit-btn { background-color: #57e497; color: white; }
                .submit-btn:hover { background-color: #3fc57b; }
                .cancel-btn { background-color: #9e9e9e; color: white; }
                .cancel-btn:hover { background-color: #757575; }
                .submit-btn:disabled, .cancel-btn:disabled { opacity: 0.6; cursor: not-allowed; }

                /* --- CSS LAYOUT UPDATED HERE --- */
                .search-row {
                    margin-bottom: 15px;
                }
                .pagination-controls { 
                    display: flex; 
                    justify-content: space-between; /* Pushes button group and count apart */
                    align-items: center; 
                    margin-bottom: 15px;
                    font-size: 12px; 
                    flex-wrap: wrap;
                }
                .pagination-buttons {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .pagination-count {
                    font-weight: 500;
                    color: #555;
                }
                .pagination-button { padding: 8px 12px; border: 1px solid #ddd; border-radius: 5px; background-color: #f0f0f0; cursor: pointer; font-size: 12px; }
                .pagination-button:hover:not(:disabled) { background-color: #e0e0e0; }
                .pagination-button:disabled { opacity: 0.5; cursor: not-allowed; }

                .table-toolbar { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    flex-wrap: wrap;
                    gap: 20px;
                }
                .tabs { 
                    display: flex; 
                    gap: 5px; 
                    background-color: #e0e0e0; 
                    border-radius: 8px; 
                    padding: 4px; 
                    flex-shrink: 0;
                }
                .tabs button { padding: 6px 16px; border: none; background: none; cursor: pointer; font-size: 13px; color: #555; border-radius: 6px; transition: all 0.3s; }
                .tabs button.active { background-color: #ffffff; color: #000; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                .per-page-selector { 
                    display: flex; 
                    align-items: center; 
                    gap: 8px; 
                    font-size: 12px;
                    flex-shrink: 0;
                }
                .per-page-selector .modern-input { width: 110px; padding: 6px 8px; font-size: 12px; }

                /* --- TABLE STYLES --- */
                .table-responsive-container { overflow-x: auto; margin-top: 20px; }
                .data-table { width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
                .data-table th, .data-table td { padding: 12px 15px; border-bottom: 1px solid #f0f0f0; border-right: 1px solid #f0f0f0; text-align: center; font-size: 12px; vertical-align: middle; }
                .data-table th:last-child, .data-table td:last-child { border-right: none; }
                .data-table th { background-color: #323943; color: white; font-weight: 600; }
                .data-table tbody tr.selected-row { background-color: #e8f5e9 !important; }
                .data-table tbody tr:hover { background-color: #f5f5f5; }
                .no-data-message { text-align: center; font-style: italic; color: #888; padding: 30px; }
                .status-badge { padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500; }
                .status-badge.status-active { background-color: #e6f7ff; color: #1890ff; }
                .status-badge.status-used { background-color: #f6f6f6; color: #595959; }
                .status-badge.status-expired { background-color: #fff1f0; color: #f5222d; }

                /* Action Button & Modal Styles */
                .action-buttons { display: flex; gap: 8px; justify-content: center; }
                .action-btn { padding: 6px 12px; border: none; border-radius: 5px; font-size: 12px; cursor: pointer; transition: all 0.2s; font-weight: 600; }
                .view-btn { background-color: #57e497; color: white; }
                .view-btn:hover { background-color: #3fc57b; }
                .delete-btn { background-color: #f44336; color: white; }
                .delete-btn:hover { background-color: #c62828; }
                .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px; backdrop-filter: blur(5px); }
                .modal-content { position: relative; width: 100%; max-width: 500px; background: transparent; box-shadow: none; display: flex; flex-direction: column; align-items: center; gap: 20px;}
                .modal-close-button { position: absolute; top: 0px; right: 0px; background: #fff; border: none; border-radius: 50%; width: 36px; height: 36px; font-size: 24px; cursor: pointer; color: #333; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 10; display: flex; align-items: center; justify-content: center; transform: translate(40%, -40%); }
                .download-coupon-btn { display: inline-flex; align-items: center; gap: 10px; background-color: #fff; color: #333; border: 1px solid #ddd; padding: 10px 20px; font-size: 14px; font-weight: 600; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                .download-coupon-btn:hover { background-color: #f0f0f0; box-shadow: 0 4px 8px rgba(0,0,0,0.15); transform: translateY(-2px); }
                .download-coupon-btn svg { font-size: 16px; }

                /* Responsive Styles */
                @media (max-width: 768px) {
                    .form-grid { grid-template-columns: 1fr; }
                    .table-toolbar { flex-direction: column; align-items: stretch; }
                    .pagination-controls { flex-direction: column; align-items: flex-start; }
                    .data-table thead { display: none; }
                    .data-table, .data-table tbody, .data-table tr, .data-table td { display: block; width: 100%; }
                    .data-table tr { margin-bottom: 15px; border: 1px solid #ddd; border-radius: 5px; }
                    .data-table td { text-align: right; padding-left: 50%; position: relative; border-right: none; border-bottom: 1px solid #eee; }
                    .data-table tr td:last-child { border-bottom: none; }
                    .data-table td::before { content: attr(data-label); position: absolute; left: 15px; width: 45%; padding-right: 10px; white-space: nowrap; text-align: left; font-weight: bold; }
                }
            `}</style>
        </div>
    );
};

export default CouponsPage;

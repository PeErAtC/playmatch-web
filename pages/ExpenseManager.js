import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { db } from '../lib/firebaseConfig';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faEdit, faTrashAlt, faCircle,
  faShoppingBag, faHome, faTools, faMoneyBillWave, faPiggyBank,
  faShop, faTruck, faPlug, faWater, faFileAlt, faDonate,
  faDollarSign, faRedo, // faRedo is used for the Cancel button icon
} from '@fortawesome/free-solid-svg-icons';

const FA_ICONS_MAP = {
  'faPlus': faPlus,
  'faEdit': faEdit,
  'faTrashAlt': faTrashAlt,
  'faCircle': faCircle,
  'faShoppingBag': faShoppingBag,
  'faHome': faHome,
  'faTools': faTools,
  'faMoneyBillWave': faMoneyBillWave,
  'faPiggyBank': faPiggyBank,
  'faShop': faShop,
  'faTruck': faTruck,
  'faPlug': faPlug,
  'faWater': faWater,
  'faFileAlt': faFileAlt,
  'faDonate': faDonate,
  'faDollarSign': faDollarSign,
  'faRedo': faRedo,
};

const ITEM_ICON_COLORS = {
  'faShoppingBag': '#ffc107',
  'faHome': '#28a745',
  'faTools': '#6a6ee6',
  'faMoneyBillWave': '#dc3545',
  'faPiggyBank': '#17a2b8',
  'faFileAlt': '#fd7e14',
  'faDonate': '#20c997',
  'faTruck': '#007bff',

  'รายรับ': '#28a745',
  'รายจ่าย': '#dc3545',
  'เงินทุน': '#6a6ee6',
  'default': '#6c757d',
};

const CATEGORIES = {
  'รายรับ': [
    { name: 'ทั่วไป', icon: 'faCircle' },
    { name: 'ค่าคอร์ต (จากสมาชิก)', icon: 'faMoneyBillWave' },
    { name: 'ค่าลูกแบด (คืนจากสมาชิก)', icon: 'faDonate' },
    { name: 'ค่าสมาชิกรายปี/เดือน', icon: 'faPiggyBank' },
    { name: 'รายรับอื่นๆ', icon: 'faFileAlt' },
  ],
  'รายจ่าย': [
    { name: 'ทั่วไป', icon: 'faCircle' },
    { name: 'ค่าคอร์ต (เช่า)', icon: 'faHome' },
    { name: 'ค่าลูกแบด', icon: 'faShoppingBag' },
    { name: 'ค่าน้ำดื่ม/ของว่าง', icon: 'faShop' },
    { name: 'ค่าโค้ช', icon: 'faTools' },
    { name: 'ค่าอุปกรณ์ส่วนกลาง', icon: 'faTools' },
    { name: 'ค่าเดินทาง (ก๊วน)', icon: 'faTruck' },
  ],
  'เงินทุน': [
    { name: 'ทั่วไป', icon: 'faCircle' },
    { name: 'ฝากธนาคารก๊วน', icon: 'faPiggyBank' },
    { name: 'เงินกู้ (สำหรับก๊วน)', icon: 'faMoneyBillWave' },
    { name: 'เงินจากผู้สนับสนุน', icon: 'faDonate' },
  ],
};

// Helper to format date consistent with coupons.js (Handles Date objects or YYYY-MM-DD strings)
const formatDate = (dateInput) => {
    let d;
    if (dateInput instanceof Date) {
        d = dateInput;
    } else if (dateInput && typeof dateInput.toDate === 'function') { // Firebase Timestamp
        d = dateInput.toDate();
    } else if (typeof dateInput === 'string') {
        const parts = dateInput.split('-');
        if (parts.length === 3) { // YYYY-MM-DD
            d = new Date(dateInput);
        } else {
            const thaiParts = dateInput.split('/');
            if (thaiParts.length === 3) {
                const day = parseInt(thaiParts[0], 10);
                const month = parseInt(thaiParts[1], 10) - 1;
                const year = parseInt(thaiParts[2], 10);
                d = new Date(year < 2000 ? year + 543 : year, month, day); // Adjust for 2-digit year in BE
            } else {
                d = new Date(dateInput);
            }
        }
    } else {
        d = new Date();
    }

    if (isNaN(d.getTime())) {
        return 'Invalid Date';
    }

    // Adjust to Buddhist calendar (BE) if the year is greater than 2500 (approx. 1900 AD + 543)
    const yearAD = d.getFullYear();
    const yearBE = yearAD + 543; // Convert AD to BE
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed

    return `${day}/${month}/${yearBE}`; // Format: DD/MM/BBBB
};

// Updated Financial Entry Ticket Component to match the requested layout
const FinancialEntryTicket = ({ entry, gradientStartColor, gradientEndColor, ticketId, onEdit, onDelete }) => {
    if (!entry) return null;

    // mainText will only be the name of the entry, without the amount
    const mainText = entry.name ? entry.name.toUpperCase() : 'NO NAME';
    const amountValue = parseFloat(entry.amount);
    // THB will be appended directly in the JSX
    const amountText = `฿${amountValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB`;
    const dateText = entry.date ? formatDate(entry.date) : 'N/A';
    const categoryText = entry.category ? entry.category : 'ทั่วไป';

    // Determine the amount color based on entry type (Green for income, Red for expense)
    const dynamicAmountColor = entry.type === 'รายรับ' ? '#28a745' : '#dc3545'; 

    return (
        <div className="ticket-svg-container">
            <svg width="100%" height="100%" viewBox="0 0 500 120">
                <defs>
                    <linearGradient id={ticketId} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style={{ stopColor: gradientStartColor, stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: gradientEndColor, stopOpacity: 1 }} />
                    </linearGradient>
                    <filter id="shadow">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.2" />
                    </filter>
                </defs>
                <path
                    d="M10 0 C 0 0, 0 10, 0 20 L 0 100 C 0 110, 0 120, 10 120 L 490 120 C 500 120, 500 110, 500 100 L 500 20 C 500 10, 500 0, 490 0 Z"
                    fill={`url(#${ticketId})`} filter="url(#shadow)"
                />

                {/* Single foreignObject to contain all content for the new layout */}
                <foreignObject x="15" y="10" width="470" height="100">
                    <div xmlns="http://www.w3.org/1999/xhtml" className="financial-entry-content-wrapper">
                        {/* First line: Name, Amount, Edit/Delete Buttons */}
                        <div className="entry-first-line">
                            <span className="entry-name">{mainText}</span>
                            <div className="entry-amount-actions">
                                <span className="entry-amount-value" style={{ color: dynamicAmountColor }}>{amountText}</span>
                                <div className="entry-action-buttons">
                                    <button className="icon-button edit-button" onClick={(e) => { e.stopPropagation(); onEdit(entry); }}>
                                        <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                    <button className="icon-button delete-button" onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}>
                                        <FontAwesomeIcon icon={faTrashAlt} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* Second line: Category, Date */}
                        <div className="entry-second-line">
                            <span className="entry-category-label">ประเภท: {categoryText}</span>
                            <span className="entry-date-text">วันที่: {dateText}</span>
                        </div>
                    </div>
                </foreignObject>
            </svg>
        </div>
    );
};


const TICKET_COLORS = {
    'รายรับ': {
        gradientStart: '#ffffff', // Light green
        gradientEnd: '#fafffa', // Lighter green
    },
    'รายจ่าย': {
        gradientStart: '#ffffff', // Light orange/peach
        gradientEnd: '#fff4e6', // Lighter orange/peach
    },
    'เงินทุน': {
        gradientStart: '#ffffff', // Light purple
        gradientEnd: '#e6e6ff', // Lighter purple
    },
};


const ExpenseManager = () => {
  const [loggedInEmail, setLoggedInEmail] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newEntry, setNewEntry] = useState({
    name: '',
    amount: '',
    type: 'รายรับ',
    date: new Date().toISOString().substring(0, 10),
    category: CATEGORIES['รายรับ'][0].name,
    categoryIcon: CATEGORIES['รายรับ'][0].icon,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editEntryId, setEditEntryId] = useState(null);
  const [originalNewEntryState, setOriginalNewEntryState] = useState(null);

  useEffect(() => {
    const email = localStorage.getItem('loggedInEmail');
    if (email) setLoggedInEmail(email);
    else {
      setLoading(false);
      setError('โปรดเข้าสู่ระบบเพื่อจัดการรายการทางการเงิน.');
    }
  }, []);

  useEffect(() => {
    const fetchUserId = async () => {
      if (!loggedInEmail) return;

      setLoading(true);
      setError(null);
      try {
        const q = query(collection(db, 'users'), where('email', '==', loggedInEmail));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setCurrentUserId(snapshot.docs[0].id);
        } else {
          setError("ไม่พบผู้ใช้ในระบบ. โปรดลงทะเบียนหรือเข้าสู่ระบบด้วยบัญชีที่ถูกต้อง.");
          setCurrentUserId(null);
        }
      } catch (err) {
        console.error("Error fetching user ID:", err);
        setError("เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้.");
      } finally {
        setLoading(false);
      }
    };
    fetchUserId();
  }, [loggedInEmail]);

  useEffect(() => {
    const loadEntries = async () => {
      if (!currentUserId) {
        setEntries([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const entriesRef = collection(db, `users/${currentUserId}/financial_entries`);
        const snapshot = await getDocs(entriesRef);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate ? doc.data().date.toDate().toISOString().substring(0, 10) : (doc.data().date || ''),
        }));
        setEntries(data);
      } catch (err) {
        console.error("Error loading entries:", err);
        setError("เกิดข้อผิดพลาดในการโหลดรายการทางการเงิน.");
      } finally {
        setLoading(false);
      }
    };
    loadEntries();
  }, [currentUserId]);

  const getFaIcon = useCallback((iconName) => {
    return FA_ICONS_MAP[iconName] || faCircle;
  }, []);

  const getColumnHeaderColor = useCallback((type) => {
    switch (type) {
      case 'รายรับ': return '#313933';
      case 'รายจ่าย': return '#313933';
      case 'เงินทุน': return '#313933';
      default: return '#6c757d';
    }
  }, []);

  const getSeparatorBarColor = useCallback((type) => {
    switch (type) {
      case 'รายรับ': return '#28a745';
      case 'รายจ่าย': return '#ffc107';
      case 'เงินทุน': return '#6a6ee6';
      default: return '#ccc';
    }
  }, []);

  const resetForm = useCallback(() => {
    setNewEntry({
      name: '',
      amount: '',
      type: 'รายรับ',
      date: new Date().toISOString().substring(0, 10),
      category: CATEGORIES['รายรับ'][0].name,
      categoryIcon: CATEGORIES['รายรับ'][0].icon,
    });
    setIsEditing(false);
    setEditEntryId(null);
    setOriginalNewEntryState(null);
  }, []);

  const handleSaveOrAdd = useCallback(async () => {
    if (!newEntry.name || !newEntry.amount || newEntry.amount <= 0 || !currentUserId) {
      Swal.fire({
        title: '⚠️ ข้อมูลไม่ครบ',
        text: 'โปรดกรอกชื่อรายการและจำนวนเงินให้ครบถ้วน',
        icon: 'warning',
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
        background: '#fffaf0',
        customClass: {
          popup: 'swal2-rounded swal2-shadow',
          title: 'swal2-title-kanit',
          content: 'swal2-content-kanit'
        }
      });
      return;
    }

    let parsedDate;
    try {
      // Append T00:00:00 to ensure consistent parsing as UTC midnight
      parsedDate = new Date(newEntry.date + 'T00:00:00');
      if (isNaN(parsedDate.getTime())) {
        // If getTime() returns NaN, the date string was invalid
        throw new Error("Invalid date format or value.");
      }
    } catch (e) {
      console.error("Error parsing date:", e);
      Swal.fire({
        icon: 'error',
        title: '❌ วันที่ไม่ถูกต้อง',
        text: 'โปรดตรวจสอบรูปแบบวันที่ (เช่น YYYY-MM-DD)',
        showConfirmButton: false,
        timer: 2500,
        background: '#fff0f0',
        timerProgressBar: true,
        customClass: {
          popup: 'swal2-rounded swal2-shadow',
          title: 'swal2-title-kanit',
          content: 'swal2-content-kanit'
        }
      });

      return;
    }

    const dataToSave = {
      ...newEntry,
      userId: currentUserId,
      amount: parseFloat(newEntry.amount),
      date: parsedDate, // Use the safely parsed date
    };

    if (isEditing && editEntryId) {
      // Save Changes (Update)
      const docRef = doc(db, `users/${currentUserId}/financial_entries/${editEntryId}`);
      try {
        await updateDoc(docRef, { ...dataToSave, updatedAt: serverTimestamp() });
        // Update the state with the date in string format for consistency
        setEntries(prev => prev.map(e => (e.id === editEntryId ? { ...dataToSave, id: editEntryId, date: dataToSave.date.toISOString().substring(0,10) } : e)));
        Swal.fire({
          icon: 'success',
          title: '✅ แก้ไขเรียบร้อย',
          text: 'ข้อมูลถูกบันทึกสำเร็จแล้ว',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
          background: '#f0fff0',
          customClass: {
            popup: 'swal2-rounded swal2-shadow',
            title: 'swal2-title-kanit',
            content: 'swal2-content-kanit'
          }
        });
      } catch (error) {
        console.error("Error updating document: ", error);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: "เกิดข้อผิดพลาดในการเพิ่ม/แก้ไขรายการ: " + error.message,
          confirmButtonText: 'ตกลง'
        });
      }
    } else {
      // Add New Entry
      const id = uuidv4();
      const docRef = doc(db, `users/${currentUserId}/financial_entries/${id}`);
      try {
        await setDoc(docRef, { ...dataToSave, id, createdAt: serverTimestamp() });
        // Update the state with the date in string format for consistency
        setEntries(prev => [...prev, { ...dataToSave, id, date: dataToSave.date.toISOString().substring(0,10) }]);
          Swal.fire({
            title: '🎉 เพิ่มรายการสำเร็จ!',
            text: 'ข้อมูลถูกบันทึกเรียบร้อยแล้ว',
            icon: 'success',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            background: '#ffffff',
            customClass: {
              popup: 'swal2-rounded swal2-shadow',
              title: 'swal2-title-kanit',
              content: 'swal2-content-kanit'
            },
            showClass: {
              popup: 'animate__animated animate__fadeInDown'
            },
            hideClass: {
              popup: 'animate__animated animate__fadeOutUp'
            }
          });

      } catch (error) {
        console.error("Error adding document: ", error);
        alert("เกิดข้อผิดพลาดในการเพิ่มรายการ: " + error.message);
      }
    }

    // Reset form and editing state
    resetForm();
  }, [newEntry, isEditing, editEntryId, currentUserId, resetForm]);

  const handleEditClick = useCallback((entryToEdit) => {
    setOriginalNewEntryState({ ...newEntry }); // Save current form state before populating with edit data
    setNewEntry({
      name: entryToEdit.name,
      amount: entryToEdit.amount,
      type: entryToEdit.type,
      date: new Date().toISOString().substring(0, 10), // Set to current date on edit, not the old entry's date
      category: entryToEdit.category,
      categoryIcon: entryToEdit.categoryIcon,
    });
    setIsEditing(true);
    setEditEntryId(entryToEdit.id);
  }, [newEntry]);

  const handleCancelEdit = useCallback(() => {
    // Restore the form to its state before editing, or clear it if it was empty
    if (originalNewEntryState) {
        setNewEntry(originalNewEntryState);
    }
    resetForm(); // Always reset to clear editing mode and button state
  }, [originalNewEntryState, resetForm]);

  const totalBalance = useMemo(() => {
    return entries.reduce((sum, entry) => {
      if (entry.type === 'รายรับ' || entry.type === 'เงินทุน') {
        return sum + entry.amount;
      } else if (entry.type === 'รายจ่าย') {
        return sum - entry.amount;
      }
      return sum;
    }, 0);
  }, [entries]);

  const calculateColumnTotal = useCallback((type) => {
    return entries.filter(entry => entry.type === type)
                  .reduce((sum, entry) => sum + entry.amount, 0);
  }, [entries]);

  const groupedEntries = useMemo(() => {
    const groups = {
      'รายรับ': [],
      'รายจ่าย': [],
      'เงินทุน': [],
    };
    entries.forEach(entry => {
      if (groups[entry.type]) {
        groups[entry.type].push(entry);
      }
    });
    // Sort entries by date in descending order (newest first)
    for (const type in groups) {
      groups[type].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return groups;
  }, [entries]);

  return (
    <div className="main-container">
      <div className="top-bar">
        <span className="left-text">บัญชีรายรับ-รายจ่าย ก๊วนแบด</span>
        <span className="right-text">
          ยอดเงินคงเหลือทั้งหมด: 
          <span className="green-amount">
            {totalBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </span>{' '}
          <span className="baht-text">บาท</span>
        </span>
      </div>

      {loading && <div className="loading-message">กำลังโหลดข้อมูล...</div>}
      {error && <div className="error-message">{error}</div>}
      {!loggedInEmail && !loading && !error && (
        <div className="info-message">
          กรุณาเข้าสู่ระบบเพื่อดูและจัดการรายการทางการเงิน (เข้าได้ที่ /login)
        </div>
      )}
      {loggedInEmail && currentUserId && !loading && !error && (
        <>
          <div className="form-bar-container">
            <div className="form-bar">
              <input
                type="text"
                placeholder="ชื่อรายการ (เช่น ค่าคอร์ต, ค่าลูกแบด)"
                className="form-input"
                value={newEntry.name}
                onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })}
              />
              <input
                type="number"
                placeholder="จำนวนเงิน"
                className="form-input"
                value={newEntry.amount}
                onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
              />
              <select
                className="form-select"
                value={newEntry.type}
                onChange={(e) => {
                  const selectedType = e.target.value;
                  const defaultCategory = CATEGORIES[selectedType]?.[0]?.name || 'ทั่วไป';
                  const defaultCategoryIcon = CATEGORIES[selectedType]?.[0]?.icon || 'faCircle';
                  setNewEntry({
                    ...newEntry,
                    type: selectedType,
                    category: defaultCategory,
                    categoryIcon: defaultCategoryIcon,
                  });
                }}
              >
                <option value="รายรับ">รายรับ</option>
                <option value="รายจ่าย">รายจ่าย</option>
                <option value="เงินทุน">เงินทุน</option>
              </select>
              <select
                className="form-select"
                value={newEntry.category}
                onChange={(e) => {
                  const selectedCategoryName = e.target.value;
                  const selectedCategory = CATEGORIES[newEntry.type].find(
                    (cat) => cat.name === selectedCategoryName
                  );
                  setNewEntry({
                    ...newEntry,
                    category: selectedCategoryName,
                    categoryIcon: selectedCategory?.icon || 'faCircle',
                  });
                }}
              >
                {CATEGORIES[newEntry.type]?.map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="form-input"
                value={newEntry.date}
                onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
              />
              {isEditing ? (
                <>
                  <button className="add-entry-button save-edit-button" onClick={handleSaveOrAdd}>
                    <FontAwesomeIcon icon={faEdit} className="icon-tiny" /> บันทึกการแก้ไข
                  </button>
                  <button className="add-entry-button cancel-button" onClick={handleCancelEdit}>
                    <FontAwesomeIcon icon={faRedo} className="icon-tiny" /> ยกเลิก
                  </button>
                </>
              ) : (
                <button className="add-entry-button" onClick={handleSaveOrAdd}>
                  <FontAwesomeIcon icon={faPlus} className="icon-tiny" /> เพิ่มรายการ
                </button>
              )}
            </div>
          </div>
          <div className="financial-analysis-section">
            <div className="charts-section">
              {/* กราฟวงกลม + กราฟวิเคราะห์ */}
            </div>
              <div className="summary-columns-horizontal-wrapper">
                <div className="horizontal-columns-row">
                  {['รายรับ', 'รายจ่าย', 'เงินทุน'].map(type => (
                    <div key={type} className="horizontal-column-box">
                      <div className={`column-card ${type === 'รายรับ' ? 'income-column-background' : type === 'รายจ่าย' ? 'expense-column-background' : 'fund-column-background'}`}>
                        <div className="column-header" style={{ borderBottomColor: getColumnHeaderColor(type) }}>
                          <div className="header-flex">
                            <h3 className="block-title">{type}</h3>
                            <span className="small-text">
                              {calculateColumnTotal(type).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB /{' '}
                              {groupedEntries[type]?.length || 0} รายการ
                            </span>
                          </div>
                        </div>

                        <div className="column-content">
                          {groupedEntries[type] && groupedEntries[type].length > 0 ? (
                            groupedEntries[type].map((entry) => (
                              <FinancialEntryTicket
                                key={entry.id}
                                entry={entry}
                                gradientStartColor={TICKET_COLORS[entry.type]?.gradientStart}
                                gradientEndColor={TICKET_COLORS[entry.type]?.gradientEnd}
                                ticketId={`ticket-${entry.id}`} // Unique ID for gradient
                                onEdit={handleEditClick}
                              onDelete={async (id) => {
                                  const result = await Swal.fire({
                                    title: '❗ ยืนยันการลบ',
                                    text: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?',
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonText: 'ลบเลย',
                                    cancelButtonText: 'ยกเลิก',
                                    confirmButtonColor: '#e74c3c',
                                    cancelButtonColor: '#95a5a6',
                                    background: '#fff',
                                    customClass: {
                                      popup: 'swal2-rounded swal2-shadow',
                                      title: 'swal2-title-kanit',
                                      content: 'swal2-content-kanit'
                                    }
                                  });

                                  if (result.isConfirmed) {
                                    try {
                                      await deleteDoc(doc(db, `users/${currentUserId}/financial_entries`, id));
                                      setEntries(prev => prev.filter(e => e.id !== id));

                                      await Swal.fire({
                                        icon: 'success',
                                        title: '🗑️ ลบสำเร็จ',
                                        text: 'รายการถูกลบเรียบร้อยแล้ว',
                                        showConfirmButton: false,
                                        timer: 2000,
                                        timerProgressBar: true,
                                        background: '#f9f9f9',
                                        customClass: {
                                          popup: 'swal2-rounded swal2-shadow',
                                          title: 'swal2-title-kanit',
                                          content: 'swal2-content-kanit'
                                        }
                                      });
                                    } catch (error) {
                                      console.error("Error removing document: ", error);
                                      Swal.fire({
                                        icon: 'error',
                                        title: 'เกิดข้อผิดพลาด',
                                        text: "ไม่สามารถลบรายการได้: " + error.message,
                                        confirmButtonText: 'ตกลง',
                                      });
                                    }
                                  }
                                }}

                              />
                            ))
                          ) : (
                            <p className="no-entries-message">ไม่มีรายการในหมวดหมู่นี้</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          </div>
        </>
      )}

      {/* Styled JSX for component-scoped styles, with global for the foreignObject content */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap');

        /* Global Styles */
        body {
            background: linear-gradient(135deg, #f0f8ff, #e6f7ff);
            min-height: 100vh;
            margin: 0;
            padding: 0;
            font-family: 'Kanit', sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            display: block; /* เปลี่ยนจาก flex */
        }

        .top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9em;
          color: #333;
          padding: 10px 15px;
          margin-bottom: 10px;
          width: 100%;
          box-sizing: border-box;
        }

        .left-text {
          font-weight: 500;
        }

        .right-text {
          font-weight: 400;
          color: #555;
        }

        .green-amount {
          color: #28a745;
          font-weight: 600;
        }

        .baht-text {
          color: #555;
          font-weight: normal;
        }

        .header-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .financial-analysis-section {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          align-items: flex-start;
          justify-content: space-between;
          width: 100%;
          box-sizing: border-box;
        }

        .charts-section {
          flex: 1;
          min-width: 320px;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .summary-columns-section {
          flex: 1;
          min-width: 320px;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* สำหรับหน้าจอแคบ (มือถือ) ให้เรียงแนวตั้ง */
        @media (max-width: 768px) {
          .financial-analysis-section {
            flex-direction: column;
            align-items: stretch;
          }
        }

        .block-title {
          margin: 0;
        }

        .small-text {
          font-size: 0.75em;
          font-weight: normal;
          color: #666;
        }

        .main-container {
          padding: 20px 10px;
          width: 100%;
          max-width: none;
          height: auto;
          background-color: rgba(255, 255, 255, 0.9);
          border-radius: 0;
          box-shadow: none;
          backdrop-filter: blur(12px);
          border: none;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-sizing: border-box;
        }


        .loading-message, .error-message, .info-message {
            padding: 20px;
            text-align: center;
            font-size: 1.2em;
            color: #555;
            width: 100%;
            border-radius: 15px;
            background-color: rgba(255, 255, 255, 0.7);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
            max-width: 600px;
            margin: 20px auto;
        }
        .error-message { color: #dc3545; }
        .info-message { color: #17a2b8; }

        /* Balance Display Card */
        .balance-display-card {
            background: rgba(255, 255, 255, 0.8);
            border-radius: 20px;
            padding: 25px 30px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            width: 100%;
            max-width: 1200px;
            text-align: center;
            margin-bottom: 10px;
        }

        .balance-title {
            font-size: 1.6em;
            font-weight: 600;
            color: #555;
            margin-bottom: 10px;
        }

        .balance-amount {
            font-size: 2.8em;
            font-weight: 700;
            letter-spacing: -1px;
            margin: 0;
            line-height: 1.2;
        }

        /* Form Bar */
        .form-bar-container {
            background: rgba(255, 255, 255, 0.7);
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.07);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.4);
        }

        .form-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            justify-content: center;
            align-items: center;
        }

        .form-input, .form-select {
            padding: 12px 15px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 1em;
            flex: 1;
            min-width: 180px;
            background-color: #fff;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-input:focus, .form-select:focus {
            border-color: #6a6ee6;
            box-shadow: 0 0 0 3px rgba(106, 110, 230, 0.2);
            outline: none;
        }

        .add-entry-button {
            padding: 12px 25px;
            background-color: #6a6ee6;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1em;
            font-weight: 500;
            transition: background-color 0.2s ease, transform 0.1s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }

        .add-entry-button:hover {
            background-color: #5a5edb;
            transform: translateY(-1px);
        }

        .add-entry-button.save-edit-button {
            background-color: #28a745; /* Green for save */
        }

        .add-entry-button.save-edit-button:hover {
            background-color: #218838;
        }

        .add-entry-button.cancel-button {
            background-color: #f0ad4e; /* Orange for cancel */
        }

        .add-entry-button.cancel-button:hover {
            background-color: #ec971f;
        }

        .add-entry-button .icon-tiny {
            font-size: 1em;
        }

        /* Summary Columns Wrapper (Horizontal Layout) */
        .summary-columns-horizontal-wrapper {
            width: 100%;
            max-width: none;
            margin: 0;
            box-sizing: border-box;
            padding: 0 10px;

        }

        .horizontal-columns-row {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            justify-content: center;
              width: 100%;

        }

        .horizontal-column-box {
            flex: 1 1 100%;
            max-width: 100%;
            max-width: calc(33.333% - 14px);
            box-sizing: border-box;
        }
        @media (min-width: 992px) {
          .horizontal-column-box {
            flex: 1 1 calc(50% - 14px);
            max-width: calc(50% - 14px);
          }
        }

        @media (min-width: 1400px) {
          .horizontal-column-box {
            flex: 1 1 calc(33.333% - 14px);
            max-width: calc(33.333% - 14px);
          }
        }
        @media (min-width: 1200px) {
          .main-container {
            padding: 40px;
          }
        }

        /* Individual Column Cards */
        .column-card {
            background: rgba(255, 255, 255, 0.7);
            border-radius: 20px;
            padding: 20px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.07);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.4);
            display: flex;
            flex-direction: column;
            min-height: 250px;
            overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .column-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.1);
        }

        .income-column-background {
            background: linear-gradient(135deg, #e9fce9, #d0f0d0);
            border: 1px solid rgba(160, 255, 160, 0.3);
        }

        .expense-column-background {
            background: linear-gradient(135deg, #fff4e6, #ffe2c7);
            border: 1px solid rgba(255, 210, 160, 0.3);
        }

        .fund-column-background {
            background: linear-gradient(135deg, #e6e6ff, #d2d2ff);
            border: 1px solid rgba(160, 160, 255, 0.3);
        }

        .column-header {
            text-align: center;
            padding-bottom: 15px;
            margin-bottom: 15px;
            border-bottom: 3px solid;
        }

        .column-header h3 {
            margin: 0;
            font-size: 1.5em;
            color: #333;
            font-weight: 600;
        }

        
        .column-content {
          min-height: 400px;
            gap: 8px;

          max-height: 400px;
          overflow-y: auto;
          padding-right: 10px;
          box-sizing: border-box;
          scrollbar-width: thin;
          scrollbar-color: #ccc transparent;
        }
   
        .column-content::-webkit-scrollbar {
            width: 8px;
        }
        .column-content::-webkit-scrollbar-track {
            background: transparent;
        }
        .column-content::-webkit-scrollbar-thumb {
            background-color: #ccc;
            border-radius: 10px;
            border: 2px solid transparent;
        }
        .column-content::-webkit-scrollbar-thumb:hover {
            background-color: #a0a0a0;
        }

        .no-entries-message {
            text-align: center;
            color: #888;
            font-style: italic;
            padding: 20px 0;
        }

        .entry-container {
            margin-bottom: 15px;
            display: flex;
            flex-direction: column;
            border: 1px solid #e0e0e0; /* This border will be hidden by ticket shadow but useful for debugging */
            width: 100%;
            height: auto; /* หรือกำหนดเป็นค่าที่แน่นอนก็ได้ เช่น: height: 100px; */
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1); /* This can be removed if ticket shadow is enough */
        }

        /* --- Financial Entry Ticket Specific Styles (within foreignObject) --- */
        .ticket-svg-container {
          height: 90px; /* เดิม 120px → ลดลง */
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          border-top: 1px solid #ccc;
          padding-top: 6px; /* ให้มีช่องห่างจากเส้น */
        }

        .financial-entry-content-wrapper {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          word-break: break-word;
          height: 100%;
          padding: 6px 12px; /* เดิมน่าจะ 10px 15px */
        }

        .entry-first-line {
            display: flex;
            justify-content: space-between;
            align-items: center; /* Vertically align items in this line */
            width: 100%;
            margin-bottom: 2px; /* Space below the first line */
        }

        .entry-name {
          display: inline-block;
          font-weight: 600;
          font-size: 1.1em;
          border-bottom: 2px solid #ccc;
          padding-bottom: 2px;
        }

        .entry-amount-actions {
            display: flex;
            align-items: center; /* Vertically align amount and buttons */
            flex-shrink: 0; /* Prevents shrinking */
        }

        .entry-amount-value {
            font-size: 1.2em;
            font-weight: bold;
            white-space: nowrap; /* Keep amount and THB on one line */
            margin-right: 10px; /* Space between amount and buttons */
        }

        .entry-action-buttons {
            display: flex;
            gap: 5px; /* Space between edit and delete buttons */
        }

        .column-content .ticket-svg-container {
          margin-bottom: 0px; /* ระยะห่างระหว่าง ticket */
        }

        .column-content .ticket-svg-container:last-child {
          margin-bottom: 0px; /* ✅ ไม่มีช่องว่างหลังรายการสุดท้าย */
        }

        .entry-second-line {
            display: flex;
            justify-content: space-between;
            align-items: flex-end; /* Align to bottom for date */
            width: 100%;
            font-size: 0.85em;
            color: #666;
            margin-top: auto; /* Push to the bottom */
        }

        .entry-category-label {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex-grow: 1;
        }

        .entry-date-text {
            white-space: nowrap;
            flex-shrink: 0;
            text-align: right;
        }

        /* Enhanced Button Styles */
        .icon-button {
            font-size: 1em; /* Slightly larger icon */
            padding: 6px 8px; /* More padding for larger clickable area */
            border-radius: 6px; /* Slightly more rounded */
            background: transparent; /* Changed to transparent, specific colors set by .edit-button and .delete-button */
            border: 1px solid rgba(0, 0, 0, 0.15); /* Subtle default border */
            cursor: pointer;
            transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.1s ease, box-shadow 0.1s ease; /* Added box-shadow transition */
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 30px; /* Ensure a consistent minimum width */
            min-height: 30px; /* Ensure a consistent minimum height */
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); /* Subtle initial shadow */
        }

        .icon-button:hover {
            /* Background will be handled by specific button hover states */
            border-color: rgba(0, 0, 0, 0.3); /* Stronger hover border */
            transform: translateY(-2px); /* More pronounced lift effect */
            box-shadow: 0 4px 8px rgba(0,0,0,0.2); /* Stronger shadow on hover */
        }

        .icon-button:active {
            transform: translateY(0); /* Press down effect */
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.2); /* Inset shadow for pressed state */
        }

        .icon-button.edit-button {
            background-color: #fd7e14; /* Orange for edit */
            color: white; /* White icon color for contrast */
            border-color: #fd7e14; /* Match border color to background */
        }
        .icon-button.edit-button:hover {
            background-color: #e66700; /* Darker orange on hover */
            color: white; /* Keep white on hover */
            border-color: #e66700;
        }

        .icon-button.delete-button {
            background-color: #dc3545; /* Red for delete */
            color: white; /* White icon color for contrast */
            border-color: #dc3545; /* Match border color to background */
        }
        .icon-button.delete-button:hover {
            background-color: #c82333; /* Darker red on hover */
            color: white; /* Keep white on hover */
            border-color: #c82333;
        }
        /* Media Queries for Responsiveness */
        @media (max-width: 768px) {
            .main-container {
                padding: 15px;
                margin: 2px auto;
            }
            .column-content {
              max-height: 400px;
              padding-right: 10px;
              overflow-y: auto;
              box-sizing: border-box;
              gap: 4px;
            }
            .balance-display-card {
                padding: 20px;
            }

            .balance-title {
                font-size: 1.4em;
            }

            .balance-amount {
                font-size: 2.2em;
            }

            .form-bar {
                flex-direction: column;
                align-items: stretch;
            }
            .ticket-svg-container {
                height: 120px;
            }
            .form-input, .form-select, .add-entry-button {
                min-width: unset;
                width: 100%;
            }

            .horizontal-columns-row {
                flex-direction: column;
                align-items: stretch;
            }

            .horizontal-column-box {
              width: 100%;
              max-width: 100%;
              min-width: unset;
            }
            .column-card {
              padding: 30px;
              min-height: 300px;
            }
            .entry-name,
            .entry-amount-value,
            .entry-category-label,
            .entry-date-text {
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

           .entry-name {
              font-size: clamp(1em, 1.5vw, 1.4em);
            }

            .entry-amount-value {
              font-size: clamp(1.1em, 2vw, 1.6em);
            }

            .entry-second-line {
              font-size: clamp(0.85em, 1vw, 1em);
            }
        }
      `}</style>
    </div>
  );
};

export default ExpenseManager;

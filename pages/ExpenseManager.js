import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { db, auth } from '../lib/firebaseConfig';
import { onAuthStateChanged } from "firebase/auth";
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
  getDoc
} from 'firebase/firestore';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faEdit, faTrashAlt, faCircle,
  faShoppingBag, faHome, faTools, faMoneyBillWave, faPiggyBank,
  faShop, faTruck, faPlug, faWater, faFileAlt, faDonate,
  faDollarSign, faRedo, faFolderPlus,
} from '@fortawesome/free-solid-svg-icons';

const FA_ICONS_MAP = {
  'faPlus': faPlus, 'faEdit': faEdit, 'faTrashAlt': faTrashAlt, 'faCircle': faCircle,
  'faShoppingBag': faShoppingBag, 'faHome': faHome, 'faTools': faTools, 'faMoneyBillWave': faMoneyBillWave,
  'faPiggyBank': faPiggyBank, 'faShop': faShop, 'faTruck': faTruck, 'faPlug': faPlug,
  'faWater': faWater, 'faFileAlt': faFileAlt, 'faDonate': faDonate,
  'faDollarSign': faDollarSign, 'faRedo': faRedo, 'faFolderPlus': faFolderPlus,
};

const CATEGORIES = {
  'รายรับ': [{ name: 'ทั่วไป', icon: 'faCircle' }],
  'รายจ่าย': [{ name: 'ทั่วไป', icon: 'faCircle' }],
  'เงินทุน': [{ name: 'ทั่วไป', icon: 'faCircle' }],
};

const formatDate = (dateInput) => {
    let d;
    if (dateInput instanceof Date) { d = dateInput;
    } else if (dateInput && typeof dateInput.toDate === 'function') { d = dateInput.toDate();
    } else if (typeof dateInput === 'string') {
        const parts = dateInput.split('-');
        if (parts.length === 3) { d = new Date(dateInput);
        } else {
            const thaiParts = dateInput.split('/');
            if (thaiParts.length === 3) {
                const day = parseInt(thaiParts[0], 10);
                const month = parseInt(thaiParts[1], 10) - 1;
                const year = parseInt(thaiParts[2], 10);
                d = new Date(year < 2000 ? year + 543 : year, month, day);
            } else { d = new Date(dateInput); }
        }
    } else { d = new Date(); }
    if (isNaN(d.getTime())) { return 'Invalid Date'; }
    const yearAD = d.getFullYear();
    const yearBE = yearAD + 543;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${yearBE}`;
};

const FinancialEntryTicket = ({ entry, gradientStartColor, gradientEndColor, ticketId, onEdit, onDelete }) => {
    if (!entry) return null;
    const mainText = entry.name ? entry.name.toUpperCase() : 'NO NAME';
    const amountValue = parseFloat(entry.amount);
    const amountText = `฿${amountValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const dateText = entry.date ? formatDate(entry.date) : 'N/A';
    const categoryText = entry.category ? entry.category : 'ทั่วไป';
    const dynamicAmountColor = entry.type === 'รายรับ' ? '#28a745' : entry.type === 'รายจ่าย' ? '#dc3545' : '#007bff';

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
                <foreignObject x="15" y="10" width="470" height="100">
                    <div xmlns="http://www.w3.org/1999/xhtml" className="financial-entry-content-wrapper">
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
    'รายรับ': { gradientStart: '#ffffff', gradientEnd: '#ffffff' },
    'รายจ่าย': { gradientStart: '#ffffff', gradientEnd: '#ffffff' },
    'เงินทุน': { gradientStart: '#ffffff', gradientEnd: '#ffffff' },
};

const ExpenseManager = () => {
  const [loggedInEmail, setLoggedInEmail] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const formContentRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) { setLoggedInUser(user); } else { setLoggedInUser(null); }
    });
    return () => unsubscribe();
  }, []);

  const [filterType, setFilterType] = useState('month');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().substring(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [editCategoryMode, setEditCategoryMode] = useState(false);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [customCategories, setCustomCategories] = useState({ 'รายรับ': [], 'รายจ่าย': [], 'เงินทุน': [] });
  const [isEntryFormVisible, setIsEntryFormVisible] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('รายรับ');
  const [newEntry, setNewEntry] = useState({
    name: '', amount: '', type: 'รายรับ',
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
    else { setLoading(false); setError('โปรดเข้าสู่ระบบเพื่อจัดการรายการทางการเงิน.'); }
  }, []);

  useEffect(() => {
    const fetchUserId = async () => {
      if (!loggedInEmail) return;
      setLoading(true); setError(null);
      try {
        const q = query(collection(db, 'users'), where('email', '==', loggedInEmail));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) { setCurrentUserId(snapshot.docs[0].id); } 
        else { setError("ไม่พบผู้ใช้ในระบบ. โปรดลงทะเบียนหรือเข้าสู่ระบบด้วยบัญชีที่ถูกต้อง."); setCurrentUserId(null); }
      } catch (err) { console.error("Error fetching user ID:", err); setError("เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้."); } 
      finally { setLoading(false); }
    };
    fetchUserId();
  }, [loggedInEmail]);

  useEffect(() => {
    const loadCustomCategories = async () => {
      if (!currentUserId) return;
      try {
        const snapshot = await getDocs(collection(db, `users/${currentUserId}/categories`));
        const cats = { 'รายรับ': [], 'รายจ่าย': [], 'เงินทุน': [] };
        snapshot.forEach(doc => {
          const data = doc.data();
          if (cats[data.type]) { cats[data.type].push(data.name); }
        });
        setCustomCategories(cats);
      } catch (error) { console.error("โหลดหมวดหมู่ล้มเหลว", error); }
    };
    loadCustomCategories();
  }, [currentUserId]);

  useEffect(() => {
    const loadEntries = async () => {
      if (!currentUserId) return;
      setLoading(true); setError(null);
      try {
        const entriesRef = collection(db, `users/${currentUserId}/financial_entries`);
        const snapshot = await getDocs(entriesRef);
        let data = snapshot.docs.map(doc => {
          const docData = doc.data();
          let entryDate;
          if (docData.date && typeof docData.date.toDate === 'function') { entryDate = docData.date.toDate(); } 
          else if (docData.date) { entryDate = new Date(docData.date); } 
          else { entryDate = new Date(); }
          return { id: doc.id, ...docData, date: entryDate };
        });
        if (filterType === 'month') {
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          data = data.filter(entry => entry.date >= startOfMonth && entry.date <= endOfMonth);
        } else if (filterType === 'custom' && startDate && endDate) {
          const start = new Date(startDate); const end = new Date(endDate);
          data = data.filter(entry => entry.date >= start && entry.date <= end);
        }
        setEntries(data);
      } catch (err) { console.error("Error loading entries:", err); setError("เกิดข้อผิดพลาดในการโหลดรายการทางการเงิน."); } 
      finally { setLoading(false); }
    };
    loadEntries();
  }, [currentUserId, filterType, startDate, endDate]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !loggedInUser) return;
    if (customCategories[newCategoryType]?.some(catName => catName.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      Swal.fire({ icon: 'warning', title: 'ชื่อหมวดหมู่นี้มีอยู่แล้ว', timer: 2000, showConfirmButton: false });
      return;
    }
    try {
      const docRef = doc(db, `users/${loggedInUser.uid}/categories/${newCategoryType}-${newCategoryName.trim()}`);
      await setDoc(docRef, { name: newCategoryName.trim(), type: newCategoryType });
      setCustomCategories(prev => ({ ...prev, [newCategoryType]: [...prev[newCategoryType], newCategoryName.trim()] }));
      setNewCategoryName(''); setShowCategoryForm(false);
      Swal.fire({ icon: 'success', title: 'เพิ่มหมวดหมู่เรียบร้อย', timer: 2000, showConfirmButton: false });
    } catch (error) { console.error("เพิ่มหมวดหมู่ล้มเหลว", error); Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error.message }); }
  };

  const resetForm = useCallback(() => {
    setNewEntry({
      name: '', amount: '', type: 'รายรับ',
      date: new Date().toISOString().substring(0, 10),
      category: CATEGORIES['รายรับ'][0].name,
      categoryIcon: CATEGORIES['รายรับ'][0].icon,
    });
    setIsEditing(false); setEditEntryId(null); setOriginalNewEntryState(null);
  }, []);

  const handleSaveOrAdd = useCallback(async () => {
    const userId = loggedInUser?.uid;
    if (!newEntry.name || !newEntry.amount || newEntry.amount <= 0 || !userId) {
      Swal.fire({ title: '⚠️ ข้อมูลไม่ครบ', text: 'โปรดกรอกชื่อรายการและจำนวนเงินให้ครบถ้วน', icon: 'warning', showConfirmButton: false, timer: 2500 });
      return;
    }
    let parsedDate;
    try {
      parsedDate = new Date(newEntry.date + 'T00:00:00');
      if (isNaN(parsedDate.getTime())) throw new Error("Invalid date");
    } catch (e) { Swal.fire({ icon: 'error', title: '❌ วันที่ไม่ถูกต้อง', text: 'โปรดตรวจสอบรูปแบบวันที่ (เช่น YYYY-MM-DD)', showConfirmButton: false, timer: 2500 }); return; }

    const docRef = isEditing && editEntryId ? 
        doc(db, `users/${userId}/financial_entries/${editEntryId}`) : 
        doc(collection(db, `users/${userId}/financial_entries`));

    const dataToSave = {
      name: newEntry.name, amount: parseFloat(newEntry.amount),
      type: newEntry.type, date: parsedDate,
      category: newEntry.category,
      updatedAt: serverTimestamp(),
    };
    if (!isEditing) {
      dataToSave.createdAt = serverTimestamp();
    }

    try {
      await setDoc(docRef, dataToSave, { merge: true });
      Swal.fire({ title: isEditing ? '✅ แก้ไขเรียบร้อย' : '🎉 เพิ่มรายการสำเร็จ!', icon: 'success', showConfirmButton: false, timer: 1500 });

      const newEntryObject = { ...dataToSave, id: docRef.id, date: parsedDate };

      setEntries(prev => {
        if (isEditing) { return prev.map(e => (e.id === editEntryId ? newEntryObject : e)); } 
        else { return [...prev, newEntryObject]; }
      });
    } catch (error) { console.error("Error saving document: ", error); Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: "ไม่สามารถบันทึกข้อมูลได้: " + error.message }); }
    resetForm();
  }, [newEntry, isEditing, editEntryId, loggedInUser, resetForm]);

  const handleEditClick = useCallback((entryToEdit) => {
    setOriginalNewEntryState({ ...newEntry });
    setNewEntry({
      name: entryToEdit.name, amount: entryToEdit.amount, type: entryToEdit.type,
      date: entryToEdit.date instanceof Date ? entryToEdit.date.toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      category: entryToEdit.category, categoryIcon: entryToEdit.categoryIcon,
    });
    setIsEditing(true); setEditEntryId(entryToEdit.id); setIsEntryFormVisible(true);
  }, [newEntry]);

  const handleCancelEdit = useCallback(() => {
    if (originalNewEntryState) { setNewEntry(originalNewEntryState); }
    resetForm(); setIsEntryFormVisible(true);
  }, [originalNewEntryState, resetForm]);

  const totalBalance = useMemo(() => {
    return entries.reduce((sum, entry) => {
      if (entry.type === 'รายรับ' || entry.type === 'เงินทุน') { return sum + entry.amount; } 
      else if (entry.type === 'รายจ่าย') { return sum - entry.amount; }
      return sum;
    }, 0);
  }, [entries]);

  const handleUpdateCategory = async () => {
    if (!loggedInUser || !editingCategoryName || !newCategoryName.trim()) return;
    const userRef = `users/${loggedInUser.uid}/categories`;
    const oldDocRef = doc(db, `${userRef}/${newCategoryType}-${editingCategoryName}`);
    const newDocRef = doc(db, `${userRef}/${newCategoryType}-${newCategoryName.trim()}`);
    try {
      const oldDoc = await getDoc(oldDocRef);
      if (!oldDoc.exists()) throw new Error('หมวดหมู่เดิมไม่พบ');
      const data = oldDoc.data();
      await setDoc(newDocRef, { ...data, name: newCategoryName.trim() });
      await deleteDoc(oldDocRef);
      setCustomCategories(prev => ({ ...prev, [newCategoryType]: prev[newCategoryType].map(name => name === editingCategoryName ? newCategoryName.trim() : name) }));
      Swal.fire({ icon: 'success', title: 'แก้ไขหมวดหมู่สำเร็จ', timer: 2000, showConfirmButton: false });
    } catch (err) { console.error('แก้ไขหมวดหมู่ล้มเหลว', err); Swal.fire({ icon: 'error', title: 'ไม่สามารถแก้ไขหมวดหมู่', text: err.message });
    } finally { setEditCategoryMode(false); setShowCategoryForm(false); setNewCategoryName(''); setEditingCategoryName(''); }
  };

  const calculateColumnTotal = useCallback((type) => {
    return entries.filter(entry => entry.type === type).reduce((sum, entry) => sum + entry.amount, 0);
  }, [entries]);

  const groupedEntries = useMemo(() => {
    const groups = { 'รายรับ': [], 'รายจ่าย': [], 'เงินทุน': [] };
    entries.forEach(entry => { if (groups[entry.type]) { groups[entry.type].push(entry); } });
    for (const type in groups) { groups[type].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); }
    return groups;
  }, [entries]);

  const blockTitle = useMemo(() => {
    if (isEditing) { return 'แก้ไขรายการ'; } 
    else if (showCategoryForm && editCategoryMode) { return 'แก้ไขหมวดหมู่'; } 
    else if (showCategoryForm) { return 'เพิ่มหมวดหมู่ใหม่'; } 
    else { return 'เพิ่มรายการใหม่'; }
  }, [isEditing, showCategoryForm, editCategoryMode]);

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
            <div className="form-toggle-header" onClick={() => setIsEntryFormVisible(!isEntryFormVisible)}>
              <span className="form-block-title">{blockTitle}</span>
              <span className="form-toggle-icon" style={{ transform: isEntryFormVisible ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
            </div>

            <div 
              className="form-content-wrapper" 
              style={{ maxHeight: isEntryFormVisible ? (formContentRef.current ? `${formContentRef.current.scrollHeight}px` : '500px') : '0px' }}
            >
              <div ref={formContentRef} className="form-content-inner">
                <div className="form-bar">
                  {showCategoryForm ? (
                    <>
                      <input type="text" className="form-input" placeholder="ชื่อหมวดหมู่ใหม่" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                      <select className="form-select" value={newCategoryType} onChange={(e) => setNewCategoryType(e.target.value)}>
                        <option value="รายรับ">รายรับ</option>
                        <option value="รายจ่าย">รายจ่าย</option>
                        <option value="เงินทุน">เงินทุน</option>
                      </select>
                    </>
                  ) : (
                    <>
                      <input type="text" placeholder="ชื่อรายการ (เช่น ค่าคอร์ต, ค่าลูกแบด)" className="form-input" value={newEntry.name} onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })} />
                      <input type="number" placeholder="จำนวนเงิน" className="form-input" value={newEntry.amount} onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })} />
                      <select className="form-select" value={newEntry.type} onChange={(e) => {
                        const selectedType = e.target.value;
                        const allCategories = [...(CATEGORIES[selectedType]?.map(c => c.name) || []), ...(customCategories[selectedType] || [])];
                        setNewEntry({ ...newEntry, type: selectedType, category: allCategories[0] || 'ทั่วไป' });
                      }}>
                        <option value="รายรับ">รายรับ</option>
                        <option value="รายจ่าย">รายจ่าย</option>
                        <option value="เงินทุน">เงินทุน</option>
                      </select>
                      <select className="form-select" value={newEntry.category} onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}>
                        {[...(CATEGORIES[newEntry.type]?.map(cat => cat.name) || []), ...(customCategories[newEntry.type] || [])].map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                      <input type="date" className="form-input" value={newEntry.date} onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })} />
                    </>
                  )}
                </div>
                <div className="button-actions-bar">
                  {isEditing ? (
                    <div className="button-group">
                      <button className="action-button save-edit-button" onClick={handleSaveOrAdd}><FontAwesomeIcon icon={faEdit} /> บันทึกการแก้ไข</button>
                      <button className="action-button cancel-button" onClick={handleCancelEdit}><FontAwesomeIcon icon={faRedo} /> ยกเลิก</button>
                    </div>
                  ) : showCategoryForm ? (
                    <div className="button-group">
                      {editCategoryMode ? (
                        <>
                          <button className="action-button save-edit-button" onClick={handleUpdateCategory}><FontAwesomeIcon icon={faEdit} /> บันทึกหมวดหมู่</button>
                          <button className="action-button cancel-button" onClick={() => { setEditCategoryMode(false); setShowCategoryForm(false); setNewCategoryName(''); setEditingCategoryName(''); }}><FontAwesomeIcon icon={faRedo} /> ยกเลิก</button>
                        </>
                      ) : (
                        <>
                          <button className="action-button add-entry" onClick={handleAddCategory}><FontAwesomeIcon icon={faPlus} /> เพิ่มหมวดหมู่</button>
                          <button className="action-button cancel-button" onClick={() => setShowCategoryForm(false)}><FontAwesomeIcon icon={faRedo} /> ยกเลิก</button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="button-group-split">
                      <button className="action-button add-entry" onClick={handleSaveOrAdd}><FontAwesomeIcon icon={faPlus} /> เพิ่มรายการ</button>
                      <div className="category-buttons-split">
                        <button className="action-button add-category-left" onClick={() => { setShowCategoryForm(true); setEditCategoryMode(false); setNewCategoryName(''); setEditingCategoryName(''); setNewCategoryType(newEntry.type); }}><FontAwesomeIcon icon={faFolderPlus} /> เพิ่มหมวดหมู่</button>
                        <button className="action-button add-category-right" onClick={() => {
                          const isCustomAndNotGeneral = customCategories[newEntry.type]?.includes(newEntry.category) && newEntry.category !== 'ทั่วไป';
                          if (isCustomAndNotGeneral) { setEditCategoryMode(true); setNewCategoryName(newEntry.category); setEditingCategoryName(newEntry.category); setNewCategoryType(newEntry.type); setShowCategoryForm(true);
                          } else { Swal.fire({ icon: 'info', title: 'ไม่สามารถแก้ไขหมวดหมู่เริ่มต้น', showConfirmButton: false, timer: 3000 }); }
                        }}><FontAwesomeIcon icon={faEdit} /> แก้ไข</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="financial-analysis-section">
            <div className="filter-bar">
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="month">เดือนนี้</option>
                <option value="all">ทั้งหมด</option>
                <option value="custom">กำหนดวันที่เอง</option>
              </select>
              {filterType === 'custom' && (
                <>
                  <label>เริ่ม:</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  <label>สิ้นสุด:</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </>
              )}
            </div>
            <div className="summary-columns-grid">
                {['รายรับ', 'รายจ่าย', 'เงินทุน'].map(type => (
                  <div key={type} className="column-card">
                      <div className="column-header">
                        <div className="header-flex">
                          <h3 className="block-title">{type}</h3>
                          <span className="small-text">
                            {calculateColumnTotal(type).toLocaleString('th-TH', { minimumFractionDigits: 2 })} THB /{' '}
                            {groupedEntries[type]?.length || 0} รายการ
                          </span>
                        </div>
                      </div>
                      <div className="column-content">
                        {groupedEntries[type]?.length > 0 ? (
                          groupedEntries[type].map((entry) => (
                            <FinancialEntryTicket
                              key={entry.id} entry={entry}
                              gradientStartColor={TICKET_COLORS[entry.type]?.gradientStart}
                              gradientEndColor={TICKET_COLORS[entry.type]?.gradientEnd}
                              ticketId={`ticket-${entry.id}`} onEdit={handleEditClick}
                              onDelete={async (id) => {
                                const result = await Swal.fire({
                                  title: 'ยืนยันการลบ', text: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?',
                                  icon: 'warning', showCancelButton: true, confirmButtonText: 'ลบเลย',
                                  cancelButtonText: 'ยกเลิก', confirmButtonColor: '#dc3545',
                                });
                                if (result.isConfirmed) {
                                  try {
                                    const userId = loggedInUser?.uid;
                                    if (!userId) throw new Error("ไม่พบผู้ใช้");
                                    await deleteDoc(doc(db, `users/${userId}/financial_entries/${id}`));
                                    setEntries(prev => prev.filter(e => e.id !== id));
                                    await Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', showConfirmButton: false, timer: 1500 });
                                  } catch (error) { console.error("Error removing document: ", error); Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error.message }); }
                                }
                              }}
                            />
                          ))
                        ) : (<p className="no-entries-message">ไม่มีรายการในหมวดหมู่นี้</p>)}
                      </div>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700&display=swap');

        body { background: #f0f2f5; font-family: 'Kanit', sans-serif; }

        /* --- CHANGE: Remove max-width and margin:auto to make it full-width --- */
        .main-container { 
          padding: 20px; 
          width: 100%;
          box-sizing: border-box;
        }

        .top-bar { display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; margin-bottom: 20px; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .left-text, .right-text { font-size: 15px; }
        .green-amount { color: #28a745; font-weight: 600; }

        .loading-message, .error-message, .info-message { text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .error-message { color: #dc3545; background: #f8d7da; }

        .form-bar-container { background: #fff; border-radius: 10px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin-bottom: 25px; }
        .form-toggle-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; }
        .form-block-title { font-size: 18px; font-weight: 600; color: #333; }
        .form-toggle-icon { font-size: 28px; font-weight: 300; color: #555; transition: transform 0.3s ease; }
        .form-content-wrapper { overflow: hidden; transition: max-height 0.4s ease-in-out; }
        .form-content-inner { padding-top: 20px; }

        .form-bar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
        .form-input, .form-select { padding: 10px 14px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; flex: 1 1 160px; }

        .button-actions-bar { margin-top: 15px; padding-top: 15px; border-top: 1px solid #f0f0f0; }
        .button-group, .button-group-split { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; }
        .button-group-split { justify-content: space-between; }

        .action-button { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s ease; display: flex; align-items: center; gap: 8px; }
        .action-button.add-entry { background-color: #007bff; color: white; }
        .action-button.add-entry:hover { background-color: #0056b3; }
        .action-button.save-edit-button { background-color: #28a745; color: white; }
        .action-button.save-edit-button:hover { background-color: #218838; }
        .action-button.cancel-button { background-color: #6c757d; color: white; }
        .action-button.cancel-button:hover { background-color: #5a6268; }

        .category-buttons-split { display: flex; }
        .action-button.add-category-left, .action-button.add-category-right { background-color: #555; color: white; flex-grow: 1; justify-content: center; }
        .action-button.add-category-left { border-radius: 6px 0 0 6px; }
        .action-button.add-category-right { border-radius: 0 6px 6px 0; border-left: 1px solid #777; }
        .action-button.add-category-left:hover, .action-button.add-category-right:hover { background-color: #333; }

        .filter-bar { display: flex; flex-wrap: wrap; gap: 15px; align-items: center; margin-bottom: 25px; padding: 15px; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .filter-bar select, .filter-bar input[type="date"], .filter-bar label { font-size: 14px; }

        /* --- CHANGE: Use CSS Grid for the 3-column layout --- */
        .summary-columns-grid { 
          display: grid; 
          grid-template-columns: repeat(3, 1fr); 
          gap: 20px; 
        }

        .column-card { background: #ffffff; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); overflow: hidden; display: flex; flex-direction: column; }
        .column-header { padding: 15px 20px; border-bottom: 1px solid #e9ecef; }
        .block-title { font-size: 18px; margin: 0; font-weight: 600; }
        .small-text { font-size: 13px; color: #6c757d; }
        .column-content { min-height: 400px; max-height: 500px; overflow-y: auto; padding: 10px; }
        .no-entries-message { text-align: center; color: #888; padding: 20px; }

        .ticket-svg-container { height: 100px; width: 100%; }
        .financial-entry-content-wrapper { display: flex; flex-direction: column; justify-content: space-between; height: 100%; padding: 8px 12px; }
        .entry-first-line { display: flex; justify-content: space-between; align-items: center; }
        .entry-name { font-weight: 600; font-size: 15px; }
        .entry-amount-actions { display: flex; align-items: center; gap: 10px; }
        .entry-amount-value { font-size: 16px; font-weight: bold; }
        .entry-action-buttons { display: flex; gap: 6px; }
        .icon-button { font-size: 12px; padding: 6px; border-radius: 50%; width: 28px; height: 28px; border: none; cursor: pointer; transition: all 0.2s; }
        .icon-button.edit-button { background-color: #ffc107; color: #fff; }
        .icon-button.delete-button { background-color: #dc3545; color: #fff; }
        .entry-second-line { display: flex; justify-content: space-between; font-size: 13px; color: #666; }

        /* --- CHANGE: Responsive stacking for columns on smaller screens --- */
        @media (max-width: 992px) {
          .summary-columns-grid { 
            grid-template-columns: 1fr; 
          }
        }

        @media (max-width: 768px) {
          .form-bar { flex-direction: column; align-items: stretch; }
          .button-group, .button-group-split { flex-direction: column; align-items: stretch; }
          .action-button { justify-content: center; }
          .category-buttons-split { flex-direction: row; }
        }
      `}</style>
    </div>
  );
};

export default ExpenseManager;

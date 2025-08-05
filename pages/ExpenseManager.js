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
  getDoc,
  orderBy,
  limit,
  startAfter
} from 'firebase/firestore';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faEdit, faTrashAlt, faCircle,
  faShoppingBag, faHome, faTools, faMoneyBillWave, faPiggyBank,
  faShop, faTruck, faPlug, faWater, faFileAlt, faDonate,
  faDollarSign, faRedo, faFolderPlus, faSearch, faSpinner
} from '@fortawesome/free-solid-svg-icons';

// --- ส่วนของ constants, formatDate, และ FinancialEntryTicket ไม่เปลี่ยนแปลง ---
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


const FinancialEntryTicket = ({ entry, onEdit, onDelete }) => {
    if (!entry) return null;
    const mainText = entry.name ? entry.name.toUpperCase() : 'NO NAME';
    const amountValue = parseFloat(entry.amount);
    const amountText = `฿${amountValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const dateText = entry.date ? formatDate(entry.date) : 'N/A';
    const categoryText = entry.category ? entry.category : 'ทั่วไป';
    const dynamicAmountColor = entry.type === 'รายรับ' ? '#2ecc71' : entry.type === 'รายจ่าย' ? '#e74c3c' : '#3498db';

    return (
        <div className={`financial-entry-card entry-${entry.type === 'รายรับ' ? 'income' : entry.type === 'รายจ่าย' ? 'expense' : 'capital'}`}>
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
    );
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

  const [filterType, setFilterType] = useState('month');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().substring(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [editCategoryMode, setEditCategoryMode] = useState(false);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [customCategories, setCustomCategories] = useState({ 'รายรับ': [], 'รายจ่าย': [], 'เงินทุน': [] });
  const [isEntryFormVisible, setIsEntryFormVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('รายรับ');

  const [newEntry, setNewEntry] = useState({
    name: '',
    amount: '',
    type: 'รายรับ',
    date: new Date().toISOString().substring(0, 10),
    category: '', 
    categoryIcon: 'faCircle',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editEntryId, setEditEntryId] = useState(null);
  const [originalNewEntryState, setOriginalNewEntryState] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const ENTRIES_PER_PAGE = 20;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) { setLoggedInUser(user); } else { setLoggedInUser(null); }
    });
    return () => unsubscribe();
  }, []);

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

  const fetchEntries = useCallback(async (loadMore = false) => {
    if (!currentUserId) return;

    if (loadMore) {
        setIsFetchingMore(true);
    } else {
        setLoading(true);
    }
    setError(null);

    try {
        const entriesRef = collection(db, `users/${currentUserId}/financial_entries`);
        let queryConstraints = [];

        if (filterType === 'month') {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            queryConstraints.push(where('date', '>=', startOfMonth));
            queryConstraints.push(where('date', '<=', endOfMonth));
        } else if (filterType === 'custom' && startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            queryConstraints.push(where('date', '>=', start));
            queryConstraints.push(where('date', '<=', end));
        }

        queryConstraints.push(orderBy('date', 'desc'));
        if (loadMore && lastVisible) {
            queryConstraints.push(startAfter(lastVisible));
        }
        queryConstraints.push(limit(ENTRIES_PER_PAGE));

        const finalQuery = query(entriesRef, ...queryConstraints);
        const snapshot = await getDocs(finalQuery);

        const data = snapshot.docs.map(doc => {
            const docData = doc.data();
            let entryDate = docData.date?.toDate ? docData.date.toDate() : new Date(docData.date);
            return { id: doc.id, ...docData, date: entryDate };
        });

        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        setLastVisible(lastDoc);
        setHasMore(data.length === ENTRIES_PER_PAGE);

        if (loadMore) {
            setEntries(prev => [...prev, ...data]);
        } else {
            setEntries(data);
        }

    } catch (err) {
        console.error("Error loading entries:", err);
        setError("เกิดข้อผิดพลาดในการโหลดรายการทางการเงิน: " + err.message);
    } finally {
        setLoading(false);
        setIsFetchingMore(false);
    }
  }, [currentUserId, filterType, startDate, endDate, lastVisible]);

  useEffect(() => {
    if(currentUserId) {
        setLastVisible(null);
        setHasMore(true);
        fetchEntries(false);
    }
  }, [currentUserId, filterType, startDate, endDate]);

  const handleLoadMore = () => {
    if (!isFetchingMore && hasMore) {
        fetchEntries(true);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !loggedInUser) return;
    if (customCategories[newCategoryType]?.some(catName => catName.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      Swal.fire({ icon: 'warning', title: 'ชื่อซ้ำ', text: 'มีชื่อหมวดหมู่นี้อยู่ในระบบแล้ว' });
      return;
    }
    try {
      const docRef = doc(db, `users/${loggedInUser.uid}/categories/${newCategoryType}-${newCategoryName.trim()}`);
      await setDoc(docRef, { name: newCategoryName.trim(), type: newCategoryType });
      setCustomCategories(prev => ({ ...prev, [newCategoryType]: [...prev[newCategoryType], newCategoryName.trim()] }));
      setNewCategoryName(''); setShowCategoryForm(false);
      Swal.fire({ icon: 'success', title: 'สำเร็จ!', text: 'เพิ่มหมวดหมู่ใหม่เรียบร้อยแล้ว' });
    } catch (error) { 
        console.error("เพิ่มหมวดหมู่ล้มเหลว", error); 
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error.message }); 
    }
  };

  const resetForm = useCallback(() => {
    setNewEntry({
      name: '',
      amount: '',
      type: 'รายรับ',
      date: new Date().toISOString().substring(0, 10),
      category: '',
      categoryIcon: 'faCircle',
    });
    setIsEditing(false); setEditEntryId(null); setOriginalNewEntryState(null);
  }, []);

  const handleSaveOrAdd = useCallback(async () => {
    const userId = loggedInUser?.uid;
    if (!newEntry.name || !newEntry.amount || newEntry.amount <= 0 || !newEntry.category || !userId) {
      Swal.fire({ 
        icon: 'warning', 
        title: 'ข้อมูลไม่ครบ', 
        text: 'โปรดกรอกชื่อรายการ, จำนวนเงิน, และเลือกหมวดหมู่ให้ครบถ้วน' 
      });
      return;
    }
    let parsedDate;
    try {
      parsedDate = new Date(newEntry.date + 'T00:00:00');
      if (isNaN(parsedDate.getTime())) throw new Error("Invalid date");
    } catch (e) { 
        Swal.fire({ icon: 'error', title: 'วันที่ไม่ถูกต้อง', text: 'โปรดตรวจสอบรูปแบบวันที่ (เช่น YYYY-MM-DD)' }); 
        return; 
    }

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
      Swal.fire({ 
        icon: 'success', 
        title: isEditing ? 'แก้ไขสำเร็จ!' : 'เพิ่มรายการสำเร็จ!', 
        text: `รายการ "${dataToSave.name}" ถูกบันทึกแล้ว` 
      });

      resetForm();
      fetchEntries(false); 

    } catch (error) { 
        console.error("Error saving document: ", error); 
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: "ไม่สามารถบันทึกข้อมูลได้: " + error.message }); 
    }
  }, [newEntry, isEditing, editEntryId, loggedInUser, resetForm, fetchEntries]);

  const handleEditClick = useCallback((entryToEdit) => {
    setIsEntryFormVisible(true); 
    setOriginalNewEntryState({ ...newEntry });
    setNewEntry({
      name: entryToEdit.name,
      amount: entryToEdit.amount,
      type: entryToEdit.type,
      date: entryToEdit.date instanceof Date ? entryToEdit.date.toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      category: entryToEdit.category,
      categoryIcon: entryToEdit.categoryIcon,
    });
    setIsEditing(true);
    setEditEntryId(entryToEdit.id);
  }, [newEntry]);

  const handleCancelEdit = useCallback(() => {
    if (originalNewEntryState) { setNewEntry(originalNewEntryState); }
    resetForm();
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
      Swal.fire({ icon: 'success', title: 'สำเร็จ!', text: 'แก้ไขชื่อหมวดหมู่เรียบร้อยแล้ว' });
    } catch (err) { 
        console.error('แก้ไขหมวดหมู่ล้มเหลว', err); 
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
    } finally { 
        setEditCategoryMode(false); 
        setShowCategoryForm(false); 
        setNewCategoryName(''); 
        setEditingCategoryName(''); 
    }
  };

  const calculateColumnTotal = useCallback((type) => {
    return entries.filter(entry => entry.type === type).reduce((sum, entry) => sum + entry.amount, 0);
  }, [entries]);

  const groupedEntries = useMemo(() => {
    let filteredEntries = entries;

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filteredEntries = filteredEntries.filter(entry => entry.name.toLowerCase().includes(lowerCaseSearchTerm));
    }

    const groups = { 'รายรับ': [], 'รายจ่าย': [], 'เงินทุน': [] };
    filteredEntries.forEach(entry => { if (groups[entry.type]) { groups[entry.type].push(entry); } });

    return groups;
  }, [entries, searchTerm]);

  const blockTitle = useMemo(() => {
    if (isEditing) { return 'แก้ไขรายการ'; } 
    else if (showCategoryForm && editCategoryMode) { return 'แก้ไขหมวดหมู่'; } 
    else if (showCategoryForm) { return 'เพิ่มหมวดหมู่ใหม่'; } 
    else { return 'เพิ่มรายการใหม่'; }
  }, [isEditing, showCategoryForm, editCategoryMode]);

  return (
    <div className="main-container">
      {/* START: โค้ดส่วนที่แก้ไข JSX */}
      <h2>บัญชีรายรับ-รายจ่าย</h2>
      <hr className="title-separator" />

      <div className="total-balance-display">
        ยอดเงินคงเหลือทั้งหมด:
        <span className="balance-amount">
          {totalBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="balance-currency">บาท</span>
      </div>
      {/* END: โค้ดส่วนที่แก้ไข JSX */}

      {loading && entries.length === 0 && <div className="loading-message">กำลังโหลดข้อมูล...</div>}
      {error && <div className="error-message">{error}</div>}
      {!loggedInEmail && !loading && !error && (
        <div className="info-message">
          กรุณาเข้าสู่ระบบเพื่อดูและจัดการรายการทางการเงิน (เข้าได้ที่ /login)
        </div>
      )}


      {loggedInEmail && currentUserId && !error && (
        <>
          <div className="form-bar-container">
            <div className="form-toggle-header" onClick={() => setIsEntryFormVisible(!isEntryFormVisible)}>
              <span className="form-block-title">{blockTitle}</span>
              <button className="toggle-form-button">
                {isEntryFormVisible ? "-" : "+"}
              </button>
            </div>

            <div 
              className={`form-content-collapsible ${isEntryFormVisible ? "expanded" : "collapsed"}`}
            >
              <div ref={formContentRef} className="form-content-inner">
                <div className="form-bar">
                  {showCategoryForm ? (
                    <>
                      <div>
                        <label className="form-label">ชื่อหมวดหมู่ใหม่</label>
                        <input type="text" className="form-input" placeholder="เช่น ค่าอาหาร, เงินเดือน" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label">ประเภทของหมวดหมู่</label>
                        <select className="form-select" value={newCategoryType} onChange={(e) => setNewCategoryType(e.target.value)}>
                          <option value="รายรับ">รายรับ</option>
                          <option value="รายจ่าย">รายจ่าย</option>
                          <option value="เงินทุน">เงินทุน</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="form-label">ชื่อรายการ</label>
                        <input type="text" placeholder="เช่น ค่าคอร์ต, ค่าลูกแบด" className="form-input" value={newEntry.name} onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="form-label">จำนวนเงิน</label>
                        <input type="number" placeholder="0.00" className="form-input" value={newEntry.amount} onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })} />
                      </div>
                      <div>
                        <label className="form-label">ประเภท</label>
                        <select className="form-select" value={newEntry.type} onChange={(e) => {
                          setNewEntry({ ...newEntry, type: e.target.value, category: '' });
                        }}>
                          <option value="รายรับ">รายรับ</option>
                          <option value="รายจ่าย">รายจ่าย</option>
                          <option value="เงินทุน">เงินทุน</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label">หมวดหมู่</label>
                        <select className="form-select" value={newEntry.category} onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}>
                          <option value="" disabled>—เลือกหมวดหมู่—</option>
                          {[...(CATEGORIES[newEntry.type]?.map(cat => cat.name) || []), ...(customCategories[newEntry.type] || [])].map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="form-label">วันที่</label>
                        <input type="date" className="form-input" value={newEntry.date} onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })} />
                      </div>
                    </>
                  )}
                </div>
                <div className="button-actions-bar">
                  {isEditing ? (
                    <div className="button-group">
                      <button className="action-button save-edit-button" onClick={handleSaveOrAdd}>บันทึกการแก้ไข</button>
                      <button className="action-button cancel-button" onClick={handleCancelEdit}>ยกเลิก</button>
                    </div>
                  ) : showCategoryForm ? (
                    <div className="button-group">
                      {editCategoryMode ? (
                        <>
                          <button className="action-button save-edit-button" onClick={handleUpdateCategory}>บันทึกหมวดหมู่</button>                          <button className="action-button cancel-button" onClick={() => { setEditCategoryMode(false); setShowCategoryForm(false); setNewCategoryName(''); setEditingCategoryName(''); }}>ยกเลิก</button>
                        </>
                      ) : (
                        <>
                          <button className="action-button add-entry" onClick={handleAddCategory}><FontAwesomeIcon icon={faPlus} /> เพิ่มหมวดหมู่</button>
                          <button className="action-button cancel-button" onClick={() => {setShowCategoryForm(false); setNewCategoryName('');}}>ยกเลิก</button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="button-group-split">
                      <div className="category-buttons-split">
                        <button className="action-button add-category-left" onClick={() => { setShowCategoryForm(true); setEditCategoryMode(false); setNewCategoryName(''); setEditingCategoryName(''); setNewCategoryType(newEntry.type); }}>เพิ่มหมวดหมู่</button>
                        <button className="action-button add-category-right" onClick={() => {
                          const isCustomAndNotGeneral = customCategories[newEntry.type]?.includes(newEntry.category) && newEntry.category !== 'ทั่วไป';
                          if (isCustomAndNotGeneral) { 
                              setEditCategoryMode(true); 
                              setNewCategoryName(newEntry.category); 
                              setEditingCategoryName(newEntry.category); 
                              setNewCategoryType(newEntry.type); 
                              setShowCategoryForm(true);
                          } else { 
                              Swal.fire({ icon: 'info', title: 'ไม่สามารถแก้ไขได้', text: 'คุณสามารถแก้ไขได้เฉพาะหมวดหมู่ที่สร้างเองเท่านั้น' }); 
                          }
                        }}>แก้ไข</button>
                      </div>
                      <button className="action-button add-entry" onClick={handleSaveOrAdd}>เพิ่มรายการ</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="filter-search-row">
              <div className="filter-controls-container">
                  <select 
                      className="filter-dropdown" 
                      value={filterType} 
                      onChange={(e) => setFilterType(e.target.value)}
                  >
                      <option value="month">เดือนนี้</option>
                      <option value="all">ทั้งหมด</option>
                      <option value="custom">กำหนดเอง</option>
                  </select>
                  {filterType === 'custom' && (
                  <div className="custom-date-inputs">
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                      <span>ถึง</span>
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                  )}
              </div>
              <div className="search-input-container">
                  <input type="text" placeholder="ค้นหาชื่อรายการ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  <FontAwesomeIcon icon={faSearch} className="search-icon" />
              </div>
          </div>

          <div className="financial-analysis-section">
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
                              onEdit={handleEditClick}
                              onDelete={async (id) => {
                                const result = await Swal.fire({
                                  title: 'ยืนยันการลบ',
                                  text: "คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?",
                                  icon: 'warning',
                                  showCancelButton: true,
                                  confirmButtonColor: '#d33',
                                  cancelButtonColor: '#6c757d',
                                  confirmButtonText: 'ลบเลย',
                                  cancelButtonText: 'ยกเลิก',
                                });
                                if (result.isConfirmed) {
                                  try {
                                    const userId = loggedInUser?.uid;
                                    if (!userId) throw new Error("ไม่พบผู้ใช้");
                                    await deleteDoc(doc(db, `users/${userId}/financial_entries/${id}`));
                                    setEntries(prev => prev.filter(e => e.id !== id));
                                    Swal.fire({icon: 'success', title: 'ลบสำเร็จ!', text: 'รายการของคุณถูกลบออกแล้ว'});
                                  } catch (error) { 
                                      console.error("Error removing document: ", error); 
                                      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error.message }); 
                                  }
                                }
                              }}
                            />
                          ))
                        ) : (<p className="no-entries-message">ไม่มีรายการในหมวดหมู่นี้</p>)}
                      </div>
                  </div>
                ))}
            </div>

            <div className="load-more-container">
                {isFetchingMore && (
                    <div className="fetching-more-indicator">
                        <FontAwesomeIcon icon={faSpinner} spin /> กำลังโหลด...
                    </div>
                )}
                {!isFetchingMore && hasMore && entries.length > 0 && (
                    <button onClick={handleLoadMore} className="load-more-button">
                        โหลดเพิ่มเติม
                    </button>
                )}
                {!hasMore && entries.length > 0 && (
                    <p className="no-more-entries">-- สิ้นสุดรายการ --</p>
                )}
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700&display=swap');
        body { 
          background: #f7f7f7; 
          font-family: 'Kanit', sans-serif; 
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          color: #333; 
        }
        .main-container { 
          padding: 20px;
          width: 100%;
          box-sizing: border-box;
          background: #f7f7f7; 
        }

        /* START: CSS ที่แก้ไขและเพิ่มใหม่ */
        h2 {
          font-size: 18px;
          margin-bottom: 10px;
          color: #333;
        }
        .title-separator {
          border: 0;
          border-top: 1px solid #aebdc9;
          margin-bottom: 20px;
        }
        .total-balance-display {
          font-size: 16px;
          font-weight: 500;
          color: #333;
          margin-bottom: 20px;
          padding: 15px;
          background-color: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          border: 1px solid #e9e9e9;
          text-align: center;
        }
        .total-balance-display .balance-amount {
          color: #2ecc71;
          font-weight: 600;
          margin: 0 8px;
        }
        .total-balance-display .balance-currency {
          color: #555;
        }
        /* END: CSS ที่แก้ไขและเพิ่มใหม่ */

        .loading-message, .error-message, .info-message { text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .loading-message { background: #e9ecef; color: #495057; }
        .error-message { color: #fff; background: #dc3545; }
        .info-message { color: #6c757d; background: #e9ecef; }
        .form-bar-container { 
          background: #ffffff;
          border-radius: 8px; 
          box-shadow: 0 4px 8px rgba(0,0,0,0.05);
          margin-bottom: 20px;
          border: 1px solid #e9e9e9;
        }
        .form-toggle-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          cursor: pointer; 
          user-select: none;
          padding: 10px 15px;
          background-color: #e9e9e9;
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
          border-bottom: 1px solid #ddd;
        }
        .form-block-title { font-size: 14px; font-weight: 600; color: #333; }
        .toggle-form-button {
          background: none; border: none; font-size: 20px; font-weight: bold;
          cursor: pointer; color: #555; padding: 5px 8px; line-height: 1;
        }
        .form-content-collapsible {
          overflow: hidden;
          transition: max-height 0.5s ease-out, opacity 0.5s ease-out, padding 0.5s ease-out;
          max-height: 0;
          opacity: 0;
          padding: 0 15px;
        }
        .form-content-collapsible.expanded {
          max-height: 1000px;
          opacity: 1;
          padding: 20px 15px;
        }
        .form-content-inner { }
        .form-bar { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px; 
            align-items: end;
        }
        .form-label {
            font-size: 12px;
            color: #333;
            display: block;
            margin-bottom: 4px;
            font-weight: 500;
        }
        .form-input, .form-select { 
          width: 100%;
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 5px; 
          font-size: 12px;
          background: #fff; 
          color: #333;
          outline: none;
          transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        .form-input:focus, .form-select:focus {
          border-color: #333;
          box-shadow: 0 0 0 3px rgba(226, 226, 226, 0.2);
        }
        .form-input::placeholder { color: #888; }

        .form-select {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          padding-right: 30px;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23333333' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 0.5rem center;
          background-size: 16px 12px;
        }

        .form-select option { background-color: #fff; color: #333; }
        .button-actions-bar { margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; }
        .button-group, .button-group-split { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; }
        .button-group-split { justify-content: space-between; }
        .action-button { padding: 8px 18px; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s ease; display: flex; align-items: center; gap: 8px; color: white; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .action-button.add-entry { background-color: #57e497; color: black; }
        .action-button.add-entry:hover { background-color: #3fc57b; }
        .action-button.save-edit-button { background-color: #ff9800; }
        .action-button.save-edit-button:hover { background-color: #ffa500; }
        .action-button.cancel-button { background-color: #6c757d; }
        .action-button.cancel-button:hover { background-color: #5a6268; }
        .category-buttons-split { display: flex; }
        .action-button.add-category-left, .action-button.add-category-right { background-color: #495057; color: white; }
        .action-button.add-category-left { border-radius: 6px 0 0 6px; }
        .action-button.add-category-right { border-radius: 0 6px 6px 0; border-left: 1px solid #6c757d; }
        .action-button.add-category-left:hover, .action-button.add-category-right:hover { background-color: #343a40; }

        .financial-analysis-section {
            background: #fff;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05); 
            border: 1px solid #e9e9e9;
        }
        .filter-search-row { 
            display: flex; 
            flex-wrap: wrap; 
            justify-content: space-between; 
            align-items: center; 
            gap: 15px;
            margin-bottom: 20px;
        }
        .filter-controls-container {
            display: flex;
            align-items: center;
            gap: 15px;
            flex-wrap: wrap;
        }
        .filter-dropdown {
            padding: 6px 10px;
            border: 1px solid #ccc;
            border-radius: 5px;
            font-size: 12px;
            font-family: 'Kanit', sans-serif;
            background-color: #fff;
            cursor: pointer;
            width: 140px;
        }
        .custom-date-inputs { display: flex; align-items: center; gap: 8px; }
        .custom-date-inputs input { padding: 8px 12px; border: 1px solid #ccc; border-radius: 5px; font-size: 12px; background: #fff; color: #333; }
        .custom-date-inputs span {
            font-size: 13px;
            color: #555;
        }
        .search-input-container { position: relative; flex-grow: 1; max-width: 300px; }
        .search-input-container input { width: 100%; padding: 8px 12px 8px 35px; border: 1px solid #ccc; border-radius: 5px; font-size: 12px; box-sizing: border-box; background: #fff; color: #333; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #888; }
        .summary-columns-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .column-card { background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); border: 1px solid #e9e9e9; overflow: hidden; }

        .column-header {
            background-color: #323943;
            color: white;
            border-bottom: 1px solid #323943;
            padding: 12px 15px;
        }
        .block-title { font-size: 16px; font-weight: 600; margin: 0; color: inherit; }
        .header-flex { display: flex; justify-content: space-between; align-items: center; }
        .small-text { font-size: 12px; color: inherit; opacity: 0.9; }
        .column-content { padding: 10px; max-height: 400px; min-height: 200px; overflow-y: auto; }
        .no-entries-message { text-align: center; color: #888; padding: 20px; font-style: italic; font-size: 12px; }
        .financial-entry-card { background: #fdfdfd; border: 1px solid #f0f0f0; border-left: 4px solid; border-radius: 4px; margin-bottom: 10px; padding: 10px 12px; transition: all 0.2s; }
        .financial-entry-card.entry-income { border-left-color: #2ecc71; }
        .financial-entry-card.entry-expense { border-left-color: #e74c3c; }
        .financial-entry-card.entry-capital { border-left-color: #3498db; }
        .financial-entry-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08); }
        .entry-first-line { display: flex; justify-content: space-between; align-items: center; }
        .entry-name { font-weight: 600; font-size: 13px; color: #333; }
        .entry-amount-actions { display: flex; align-items: center; gap: 10px; }
        .entry-amount-value { font-size: 14px; font-weight: bold; }
        .entry-action-buttons { display: flex; gap: 6px; }
        .icon-button { font-size: 11px; padding: 6px; border-radius: 50%; width: 26px; height: 26px; border: none; cursor: pointer; color: #fff; display:flex; justify-content:center; align-items:center; }
        .icon-button.edit-button { background-color: #ffc107; }
        .icon-button.delete-button { background-color: #dc3545; }
        .entry-second-line { margin-top: 5px; display: flex; justify-content: space-between; font-size: 11px; color: #777; }

        .load-more-container {
            display: flex;
            justify-content: center;
            padding: 20px 0;
        }
        .load-more-button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 25px;
            font-size: 14px;
            border-radius: 20px;
            cursor: pointer;
            transition: background-color 0.2s;
            font-family: 'Kanit', sans-serif;
        }
        .load-more-button:hover {
            background-color: #0056b3;
        }
        .fetching-more-indicator, .no-more-entries {
            font-size: 14px;
            color: #6c757d;
            text-align: center;
        }
        .fetching-more-indicator svg {
            margin-right: 8px;
        }

        @media (max-width: 992px) { .summary-columns-grid { grid-template-columns: 1fr; } }
        @media (max-width: 768px) {
          .button-group, .button-group-split { flex-direction: column; align-items: stretch; }
          .action-button { justify-content: center; }
          .category-buttons-split { flex-direction: row; }
          .filter-search-row { flex-direction: column; align-items: stretch; }
          .search-input-container { max-width: none; }
          .form-bar { grid-template-columns: 1fr; }
        }
        @media (max-width: 576px) {
          .main-container, .financial-analysis-section, .form-bar-container { padding: 15px; }
          .total-balance-display { padding: 10px; text-align: left;}
          .entry-first-line { flex-direction: column; align-items: flex-start; gap: 5px; }
          .entry-amount-actions { width: 100%; justify-content: space-between; margin-top: 5px; }
          .entry-second-line { flex-direction: column; align-items: flex-start; gap: 3px; margin-top: 8px; }
          .custom-date-inputs { flex-direction: column; align-items: stretch; width: 100%; margin-left: 0; }
          .form-bar { flex-direction: column; }
        }
      `}</style>
    </div>
  );
};

export default ExpenseManager;

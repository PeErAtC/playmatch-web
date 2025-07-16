import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { db,auth  } from '../lib/firebaseConfig';
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
  startAt,
  endAt,
  getDoc
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import {
  faPlus, faEdit, faTrashAlt, faCircle,
  faShoppingBag, faHome, faTools, faMoneyBillWave, faPiggyBank,
  faShop, faTruck, faPlug, faWater, faFileAlt, faDonate,
  faDollarSign, faRedo, faFolderPlus, // เพิ่ม faFolderPlus ด้วยถ้าใช้
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



const CATEGORIES = {
  'รายรับ': [
    { name: 'ทั่วไป', icon: 'faCircle' },
  ],
  'รายจ่าย': [
    { name: 'ทั่วไป', icon: 'faCircle' },
  ],
  'เงินทุน': [
    { name: 'ทั่วไป', icon: 'faCircle' },
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
    const dynamicAmountColor = entry.type === 'รายรับ' ? '#28a745' : entry.type === 'รายจ่าย' ? '#dc3545' : '#007bff'; // Green for Income, Red for Expense, Blue for Fund
    
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
        gradientEnd: '#ffffff', // Lighter green
    },
    'รายจ่าย': {
        gradientStart: '#ffffff', // Light orange/peach
        gradientEnd: '#ffffff', // Lighter orange/peach
    },
    'เงินทุน': {
        gradientStart: '#ffffff', // Light purple
        gradientEnd: '#ffffff', // Lighter purple
    },
};


const ExpenseManager = () => {
  const [loggedInEmail, setLoggedInEmail] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true); // Initialize as true
  const [error, setError] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

          useEffect(() => {
                      const unsubscribe = onAuthStateChanged(auth, (user) => {
                        if (user) {
                          setLoggedInUser(user);
                        } else {
                          setLoggedInUser(null);
                        }
                    });

            return () => unsubscribe();
          }, []);
  const [filterType, setFilterType] = useState('month'); // 'month' | 'all' | 'custom'
  const [startDate, setStartDate] = useState(() => {
  const d = new Date();
    d.setDate(1); // วันที่ 1 ของเดือนนี้
    return d.toISOString().substring(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().substring(0, 10); // วันนี้
  });
  const [editCategoryMode, setEditCategoryMode] = useState(false);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [customCategories, setCustomCategories] = useState({
    'รายรับ': [],
    'รายจ่าย': [],
    'เงินทุน': []
  });

  const [isEntryFormVisible, setIsEntryFormVisible] = useState(true); // เปิดไว้ตั้งแต่แรก

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('รายรับ');
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
    const loadCustomCategories = async () => {
      if (!currentUserId) return;
      try {
        const snapshot = await getDocs(collection(db, `users/${currentUserId}/categories`));
        const cats = {
          'รายรับ': [],
          'รายจ่าย': [],
          'เงินทุน': [],
        };
        snapshot.forEach(doc => {
          const data = doc.data();
          if (cats[data.type]) {
            cats[data.type].push(data.name);
          }
        });
        setCustomCategories(cats);
      } catch (error) {
        console.error("โหลดหมวดหมู่ล้มเหลว", error);
      }
    };
    loadCustomCategories();
  }, [currentUserId]);

  useEffect(() => {
    const loadEntries = async () => {
      if (!currentUserId) return;

      setLoading(true);
      setError(null);

      try {
        const entriesRef = collection(db, `users/${currentUserId}/financial_entries`);
        const snapshot = await getDocs(entriesRef);

        let data = snapshot.docs.map(doc => {
          const docData = doc.data();
          let entryDate;
          if (docData.date && typeof docData.date.toDate === 'function') {
            // It's a Firestore Timestamp, convert to JS Date
            entryDate = docData.date.toDate();
          } else if (docData.date) {
            // It might be a string date or JS Date object already, try parsing
            entryDate = new Date(docData.date);
          } else {
            // Default or null date, use current date if no date provided
            entryDate = new Date();
          }

          return {
            id: doc.id,
            ...docData,
            date: entryDate, // Store as JS Date object for consistency
          };
        });

        // 🔍 Filter data based on filterType
        if (filterType === 'month') {
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          data = data.filter(entry => {
            const d = entry.date; // entry.date is now guaranteed to be a Date object
            return d >= startOfMonth && d <= endOfMonth;
          });
        } else if (filterType === 'custom' && startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          data = data.filter(entry => {
            const d = entry.date; // entry.date is now guaranteed to be a Date object
            return d >= start && d <= end;
          });
        }

        setEntries(data);
      } catch (err) {
        console.error("Error loading entries:", err);
        setError("เกิดข้อผิดพลาดในการโหลดรายการทางการเงิน.");
      } finally {
        setLoading(false);
      }
    };

    loadEntries();
  }, [currentUserId, filterType, startDate, endDate]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !loggedInUser) return;

    // ตรวจสอบว่าหมวดหมู่ซ้ำหรือไม่
    if (
      customCategories[newCategoryType] &&
      customCategories[newCategoryType].some(
        (catName) => catName.toLowerCase() === newCategoryName.trim().toLowerCase()
      )
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'ชื่อหมวดหมู่นี้มีอยู่แล้ว',
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    try {
      const docRef = doc(db, `users/${loggedInUser.uid}/categories/${newCategoryType}-${newCategoryName.trim()}`);
      await setDoc(docRef, {
        name: newCategoryName.trim(),
        type: newCategoryType,
      });

      setCustomCategories(prev => ({
        ...prev,
        [newCategoryType]: [...prev[newCategoryType], newCategoryName.trim()],
      }));

      setNewCategoryName('');
        setShowCategoryForm(false);
      Swal.fire({
        icon: 'success',
        title: 'เพิ่มหมวดหมู่เรียบร้อย',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("เพิ่มหมวดหมู่ล้มเหลว", error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message,
      });
    }
  };


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
      case 'รายรับ': return '#ffffff';
      case 'รายจ่าย': return '#ffffff';
      case 'เงินทุน': return '#ffffff';
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
  const userId = loggedInUser?.uid;
  // const username = loggedInUser?.displayName || 'unknown-user';

  if (!newEntry.name || !newEntry.amount || newEntry.amount <= 0 || !userId) {
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
    parsedDate = new Date(newEntry.date + 'T00:00:00');
    if (isNaN(parsedDate.getTime())) throw new Error("Invalid date");
  } catch (e) {
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

  const day = String(parsedDate.getDate()).padStart(2, '0');
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const yearBE = parsedDate.getFullYear() + 543;
  const prefix = `${day}-${month}-${yearBE}`;

  const collectionRef = collection(db, `users/${userId}/financial_entries`);

  let docName;

  if (isEditing && editEntryId) {
    docName = editEntryId;
  } else {
    const q = query(
      collectionRef,
      where('__name__', '>=', prefix),
      where('__name__', '<=', prefix + '\uf8ff')
    );
    const querySnapshot = await getDocs(q);
    const count = querySnapshot.size;
    const suffix = String(count + 1).padStart(3, '0');
    docName = `${prefix}-${suffix}`;
  }

  const docRef = doc(db, `users/${userId}/financial_entries/${docName}`);

  const dataToSave = {
    name: newEntry.name,
    amount: parseFloat(newEntry.amount),
    type: newEntry.type,
    date: parsedDate,
    createdAt: serverTimestamp(),
    category: newEntry.category,
    // ลบบรรทัด 'userId: username,' ออก
  };

  try {
    await setDoc(docRef, dataToSave, { merge: true });

    Swal.fire({
      title: isEditing ? '✅ แก้ไขเรียบร้อย' : '🎉 เพิ่มรายการสำเร็จ!',
      text: isEditing ? 'ข้อมูลถูกบันทึกสำเร็จแล้ว' : 'ข้อมูลถูกบันทึกเรียบร้อยแล้ว',
      icon: 'success',
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

    const newEntryObject = {
      ...dataToSave,
      id: docName,
      date: newEntry.date // Store as string for new entry object for consistency with how it's saved in form. The loadEntries will parse it to Date object.
    };

    setEntries(prev => {
      if (isEditing) {
        // If editing, find the entry by ID and update it, ensuring date is JS Date object for filtering
        return prev.map(e => (e.id === editEntryId ? { ...newEntryObject, date: parsedDate } : e));
      } else {
        // If adding, add the new entry, ensuring date is JS Date object for filtering
        return [...prev, { ...newEntryObject, date: parsedDate }];
      }
    });
  } catch (error) {
    console.error("Error saving document: ", error);
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: "ไม่สามารถบันทึกข้อมูลได้: " + error.message,
      confirmButtonText: 'ตกลง'
    });
  }

  resetForm();
}, [newEntry, isEditing, editEntryId, loggedInUser, resetForm]);



  const handleEditClick = useCallback((entryToEdit) => {
    setOriginalNewEntryState({ ...newEntry }); // Save current form state before populating with edit data
    setNewEntry({
      name: entryToEdit.name,
      amount: entryToEdit.amount,
      type: entryToEdit.type,
      // Convert Date object back to YYYY-MM-DD string for the input field
      date: entryToEdit.date instanceof Date ? entryToEdit.date.toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      category: entryToEdit.category,
      categoryIcon: entryToEdit.categoryIcon,
    });
    setIsEditing(true);
    setEditEntryId(entryToEdit.id);
    setIsEntryFormVisible(true); // <--- Add this line to expand the block
  }, [newEntry]);

  const handleCancelEdit = useCallback(() => {
    // Restore the form to its state before editing, or clear it if it was empty
    if (originalNewEntryState) {
        setNewEntry(originalNewEntryState);
    }
    resetForm(); // Always reset to clear editing mode and button state
    setIsEntryFormVisible(false); // <--- Add this line to collapse the block
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

  const handleUpdateCategory = async () => {
    if (!loggedInUser || !editingCategoryName || !newCategoryName.trim()) return;

    const userRef = `users/${loggedInUser.uid}/categories`;
    const oldDocRef = doc(db, `${userRef}/${newCategoryType}-${editingCategoryName}`);
    const newDocRef = doc(db, `${userRef}/${newCategoryType}-${newCategoryName.trim()}`);

    try {
      const oldDoc = await getDoc(oldDocRef);
      if (!oldDoc.exists()) throw new Error('หมวดหมู่เดิมไม่พบ');

      const data = oldDoc.data();

      // ลบตัวเก่า + เพิ่มตัวใหม่
      await setDoc(newDocRef, { ...data, name: newCategoryName.trim() });
      await deleteDoc(oldDocRef);

      setCustomCategories(prev => ({
        ...prev,
        [newCategoryType]: prev[newCategoryType].map(name =>
          name === editingCategoryName ? newCategoryName.trim() : name
        ),
      }));

      Swal.fire({
        icon: 'success',
        title: 'แก้ไขหมวดหมู่สำเร็จ',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error('แก้ไขหมวดหมู่ล้มเหลว', err);
      Swal.fire({
        icon: 'error',
        title: 'ไม่สามารถแก้ไขหมวดหมู่',
        text: err.message,
      });
    } finally {
      setEditCategoryMode(false);
      setShowCategoryForm(false);
      setNewCategoryName('');
      setEditingCategoryName('');
    }
  };


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

  // Determine the block title dynamically
  const blockTitle = useMemo(() => {
    if (isEditing) {
      return 'แก้ไขรายการ';
    } else if (showCategoryForm && editCategoryMode) {
      return 'แก้ไขหมวดหมู่';
    } else {
      return 'เพิ่มรายการ / หมวดหมู่';
    }
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
        <React.Fragment>
          <div className="form-bar-container">
            <div className="form-bar">
  {showCategoryForm ? (
    <>
      {/* 🔁 แบบฟอร์มเพิ่มหมวดหมู่ */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          cursor: 'pointer',
          userSelect: 'none',
          width: '100%', // Ensure it takes full width
        }}
        onClick={() => setIsEntryFormVisible(!isEntryFormVisible)}
      >
        <span style={{ fontSize: '1.1em', fontWeight: '500', color: '#333' }}>{blockTitle}</span>
        <button
          style={{
            border: 'none',
            background: 'transparent',
            fontSize: '20px',
            transform: isEntryFormVisible ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
            cursor: 'pointer',
          }}
          aria-label={isEntryFormVisible ? 'ย่อบล็อก' : 'ขยายบล็อก'}
          type="button"
        >
          ▶
        </button>
      </div>
      <input
        type="text"
        className="form-input"
        placeholder="ชื่อหมวดหมู่ใหม่"
        value={newCategoryName}
        onChange={(e) => setNewCategoryName(e.target.value)}
      />
      <select
        className="form-select"
        value={newCategoryType}
        onChange={(e) => setNewCategoryType(e.target.value)}
      >
        <option value="รายรับ">รายรับ</option>
        <option value="รายจ่าย">รายจ่าย</option>
        <option value="เงินทุน">เงินทุน</option>
      </select>

    </>
  ) : (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          cursor: 'pointer',
          userSelect: 'none',
          width: '100%', // Ensure it takes full width
        }}
        onClick={() => setIsEntryFormVisible(!isEntryFormVisible)}
      >
        <span style={{ fontSize: '1.1em', fontWeight: '500', color: '#333' }}>{blockTitle}</span>
        <button
          style={{
            border: 'none',
            background: 'transparent',
            fontSize: '20px',
            transform: isEntryFormVisible ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
            cursor: 'pointer',
          }}
          aria-label={isEntryFormVisible ? 'ย่อบล็อก' : 'ขยายบล็อก'}
          type="button"
        >
          ▶
        </button>
      </div>

      {isEntryFormVisible && (
        <>
          {/* ✅ แบบฟอร์มเพิ่มรายการ */}
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
              const builtInCategories = CATEGORIES[selectedType]?.map((c) => c.name) || [];
              const userCategories = customCategories[selectedType] || [];
              const allCategories = [...builtInCategories, ...userCategories];
              const defaultCategory = allCategories[0] || 'ทั่วไป';

              setNewEntry({
                ...newEntry,
                type: selectedType,
                category: defaultCategory,
                categoryIcon: 'faCircle',
              });
            }}
          >
            <option value="รายรับ">รายรับ</option>
            <option value="รายจ่าย">รายจ่าย</option>
            <option value="เงินทุน">เงินทุน</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              className="form-select"
              value={newEntry.category}
              onChange={(e) => {
                const selectedCategoryName = e.target.value;
                setNewEntry({
                  ...newEntry,
                  category: selectedCategoryName,
                  categoryIcon: 'faCircle',
                });
              }}
            >
              {[
                ...(Array.isArray(CATEGORIES[newEntry.type]) ? CATEGORIES[newEntry.type].map((cat) => cat.name) : []),
                ...(Array.isArray(customCategories[newEntry.type]) ? customCategories[newEntry.type] : [])
              ].map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <input
            type="date"
            className="form-input"
            value={newEntry.date}
            onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
          />
        </>
      )}
    </>
  )}

  {/* 🔘 ปุ่มขวาสุด (responsive + toggle) */}
  {isEntryFormVisible && (
  <div className="entry-button-group">
    {isEditing ? (
      <>
        <button className="add-entry-button save-edit-button" onClick={handleSaveOrAdd}>
          <FontAwesomeIcon icon={faEdit} className="icon-tiny" /> บันทึกการแก้ไขรายการ
        </button>
        <button className="add-entry-button cancel-button" onClick={handleCancelEdit}>
          <FontAwesomeIcon icon={faRedo} className="icon-tiny" /> ยกเลิก
        </button>
      </>
    ) : showCategoryForm ? (
      editCategoryMode ? (
        <>
          <button className="add-entry-button save-edit-button" onClick={handleUpdateCategory}>
            <FontAwesomeIcon icon={faEdit} className="icon-tiny" /> บันทึกการแก้ไขหมวดหมู่
          </button>
          <button
            className="add-entry-button cancel-button"
            onClick={() => {
              setEditCategoryMode(false);
              setShowCategoryForm(false);
              setNewCategoryName('');
              setEditingCategoryName('');
            }}
          >
            <FontAwesomeIcon icon={faRedo} className="icon-tiny" /> ยกเลิก
          </button>
        </>
      ) : (
        <>
          <button className="add-entry-button" onClick={handleAddCategory}>
            <FontAwesomeIcon icon={faPlus} className="icon-tiny" /> บันทึกหมวดหมู่ใหม่
          </button>
          <button
            className="add-entry-button cancel-button"
            onClick={() => setShowCategoryForm(false)}
          >
            <FontAwesomeIcon icon={faRedo} className="icon-tiny" /> ยกเลิก
          </button>
        </>
      )
    ) : (
      <>
        <button className="add-entry-button add-entry" onClick={handleSaveOrAdd}>
          <FontAwesomeIcon icon={faPlus} className="icon-tiny" /> เพิ่มรายการ
        </button>

        <div className="category-buttons-split">
          <button
            className="add-entry-button add-category-left"
            onClick={() => {
              setShowCategoryForm(true);
              setEditCategoryMode(false);
              setNewCategoryName('');
              setEditingCategoryName('');
              setNewCategoryType(newEntry.type);
            }}
          >
            <FontAwesomeIcon icon={faFolderPlus} className="icon-tiny" /> เพิ่มหมวดหมู่
          </button>
          <button
            className="add-entry-button add-category-right"
            onClick={() => {
              const isCustomAndNotGeneral =
                customCategories[newEntry.type]?.includes(newEntry.category) &&
                newEntry.category !== 'ทั่วไป';
              if (isCustomAndNotGeneral) {
                setEditCategoryMode(true);
                setNewCategoryName(newEntry.category);
                setEditingCategoryName(newEntry.category);
                setNewCategoryType(newEntry.type);
                setShowCategoryForm(true);
              } else {
                Swal.fire({
                  icon: 'info',
                  title: 'ไม่สามารถแก้ไขหมวดหมู่เริ่มต้น',
                  text: 'คุณสามารถแก้ไขได้เฉพาะหมวดหมู่ที่คุณสร้างเองเท่านั้น',
                  showConfirmButton: false,
                  timer: 3000,
                });
              }
            }}
          >
            <FontAwesomeIcon icon={faEdit} className="icon-tiny" /> แก้ไขหมวดหมู่
          </button>
        </div>
      </>
    )}
  </div>
)}

</div>
</div>



          <div className="financial-analysis-section">

            {/* ✅ แถบตัวกรอง */}
            <div className="filter-bar" style={{ marginBottom: '1rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="month">เดือนนี้</option>
                <option value="all">ทั้งหมด</option>
                <option value="custom">กำหนดวันที่เอง</option>
              </select>

              {filterType === 'custom' && (
                <>
                  <label>
                    วันที่เริ่มต้น:
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </label>

                  <label>
                    วันที่สิ้นสุด:
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </label>
                </>
              )}
            </div>


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
                              ticketId={`ticket-${entry.id}`}
                              onEdit={handleEditClick}
                              onDelete={async (id, dateString) => {
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
                                    const userId = loggedInUser?.uid;
                                    if (!userId) throw new Error("ไม่พบผู้ใช้");

                                    const docRef = doc(db, `users/${userId}/financial_entries/${id}`);
                                    await deleteDoc(docRef);

                                    setEntries(prev => prev.filter(e => e.id !== id));

                                    await Swal.fire({
                                      icon: 'success',
                                      title: 'ลบสำเร็จ',
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
                                      confirmButtonText: 'ตกลง'
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
        </React.Fragment>
      )}

      {/* Styled JSX for component-scoped styles, with global for the foreignObject content */}
    <style jsx global>{`
      @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap');

      /* สไตล์โดยรวม */
      body { background: linear-gradient(135deg, #f0f8ff, #e6f7ff); min-height: 100vh; margin: 0; padding: 0; font-family: 'Kanit', sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; display: block; }

      /* สไตล์สำหรับส่วนห่อฟอร์ม */
      .form-section-wrapper { margin-bottom: 1.5rem; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

      /* สไตล์สำหรับแถบด้านบน */
      .top-bar { display: flex; justify-content: space-between; align-items: center; font-size: 0.9em; color: #333; padding: 10px 15px; margin-bottom: 10px; width: 100%; box-sizing: border-box; }

      /* สไตล์สำหรับข้อความด้านซ้าย */
      .left-text { font-weight: 500; }

      /* สไตล์สำหรับข้อความด้านขวา */
      .right-text { font-weight: 400; color: #555; }

      /* สไตล์สำหรับตัวเลือกและอินพุตวันที่ในแถบตัวกรอง */
      .filter-bar select, .filter-bar input[type="date"] { padding: 6px 10px; font-family: 'Kanit', sans-serif; font-size: 14px; border: 1px solid #ccc; border-radius: 6px; }

      /* สไตล์สำหรับแถบตัวกรอง */
      .filter-bar { margin-top: 12px; margin-bottom: 20px; }

      /* สไตล์สำหรับจำนวนเงินสีเขียว */
      .green-amount { color: #28a745; font-weight: 600; }

      /* สไตล์สำหรับข้อความสกุลเงินบาท */
      .baht-text { color: #555; font-weight: normal; }

      /* สไตล์สำหรับส่วนหัวแบบ Flex */
      .header-flex { display: flex; justify-content: space-between; align-items: center; }

      /* สไตล์สำหรับส่วนการวิเคราะห์ทางการเงิน */
      .financial-analysis-section { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; justify-content: space-between; width: 100%; box-sizing: border-box; }

      /* สไตล์สำหรับกลุ่มปุ่มรายการ */
      .entry-button-group { display: flex; flex-wrap: nowrap; gap: 8px; overflow-x: auto; }

      /* สไตล์สำหรับกลุ่มปุ่มรายการ (จัดตำแหน่งเอง) */
      .entry-button-group { margin-left: auto; display: flex; flex-wrap: wrap; gap: 10px; }

      /* สไตล์สำหรับส่วนแผนภูมิ */
      .charts-section { flex: 1; min-width: 320px; max-width: 600px; display: flex; flex-direction: column; gap: 20px; }

      /* สไตล์สำหรับส่วนสรุปคอลัมน์ */
      .summary-columns-section { flex: 1; min-width: 320px; max-width: 600px; display: flex; flex-direction: column; gap: 20px; }

      /* สื่อสิ่งพิมพ์สำหรับหน้าจอแคบ (มือถือ) */
      @media (max-width: 768px) { /* สไตล์สำหรับส่วนการวิเคราะห์ทางการเงินบนมือถือ */ .financial-analysis-section { flex-direction: column; align-items: stretch; } }

      /* สไตล์สำหรับหัวข้อบล็อก */
      .block-title { margin: 0; }

      /* สไตล์สำหรับข้อความขนาดเล็ก */
      .small-text { font-size: 0.75em; font-weight: normal; color: #666; }

      /* สไตล์สำหรับคอนเทนเนอร์หลัก */
      .main-container { padding: 20px 10px; width: 100%; max-width: none; height: auto; background-color: rgba(255, 255, 255, 0.9); border-radius: 0; box-shadow: none; backdrop-filter: blur(12px); border: none; display: flex; flex-direction: column; gap: 20px; box-sizing: border-box; }

      /* สไตล์สำหรับข้อความสถานะ (กำลังโหลด, ข้อผิดพลาด, ข้อมูล) */
      .loading-message, .error-message, .info-message { padding: 20px; text-align: center; font-size: 1.2em; color: #555; width: 100%; border-radius: 15px; background-color: rgba(255, 255, 255, 0.7); box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08); max-width: 600px; margin: 20px auto; }
      /* สไตล์สำหรับข้อความผิดพลาด */
      .error-message { color: #dc3545; }
      /* สไตล์สำหรับข้อความข้อมูล */
      .info-message { color: #17a2b8; }

      /* บัตรแสดงยอดคงเหลือ */
      .balance-display-card { background: rgba(255, 255, 255, 0.8); border-radius: 20px; padding: 25px 30px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.3); width: 100%; max-width: 1200px; text-align: center; margin-bottom: 10px; }

      /* หัวข้อของยอดคงเหลือ */
      .balance-title { font-size: 1.6em; font-weight: 600; color: #555; margin-bottom: 10px; }

      /* จำนวนเงินคงเหลือ */
      .balance-amount { font-size: 2.8em; font-weight: 700; letter-spacing: -1px; margin: 0; line-height: 1.2; }

      /* คอนเทนเนอร์แถบฟอร์ม */
      .form-bar-container { background: rgba(255, 255, 255, 0.7); border-radius: 15px; padding: 20px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.07); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.4); }

      /* แถบฟอร์ม */
      .form-bar { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-start; align-items: center; }

      /* อินพุตและตัวเลือกฟอร์ม */
      .form-input, .form-select { padding: 12px 15px; border: 1px solid #ddd; border-radius: 8px; font-size: 1em; flex: 1; min-width: 180px; background-color: #fff; box-shadow: inset 0 1px 3px rgba(0,0,0,0.05); transition: border-color 0.2s, box-shadow 0.2s; }

      /* อินพุตและตัวเลือกฟอร์มเมื่อโฟกัส */
      .form-input:focus, .form-select:focus { border-color: #6a6ee6; box-shadow: 0 0 0 3px rgba(106, 110, 230, 0.2); outline: none; }

      /* ปุ่มเพิ่มรายการ */
      .add-entry-button { padding: 12px 25px; background-color: #5a5a62; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1em; font-weight: 500; transition: background-color 0.2s ease, transform 0.1s ease; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
      /* ปุ่มเพิ่มรายการเฉพาะ */
      .add-entry { background-color: #3a3d3a; color: white; }

      /* ปุ่มเพิ่มหมวดหมู่ */
      .add-category { background-color: #413a3d3a4549; color: white; }

      /* ไอคอนขนาดเล็ก */
      .icon-tiny { font-size: 14px; }
      /* ปุ่มเพิ่มรายการเมื่อโฮเวอร์ */
      .add-entry-button:hover { background-color: #242323; transform: translateY(-1px); }

      /* ปุ่มบันทึกการแก้ไข */
      .add-entry-button.save-edit-button { background-color: #28a745; }

      /* ปุ่มบันทึกการแก้ไขเมื่อโฮเวอร์ */
      .add-entry-button.save-edit-button:hover { background-color: #218838; }

      /* ปุ่มยกเลิก */
      .add-entry-button.cancel-button { background-color: #f0ad4e; }

      /* ปุ่มยกเลิกเมื่อโฮเวอร์ */
      .add-entry-button.cancel-button:hover { background-color: #ec971f; }

      /* ไอคอนขนาดเล็กในปุ่มเพิ่มรายการ */
      .add-entry-button .icon-tiny { font-size: 1em; }

      /* สไตล์ใหม่สำหรับปุ่มหมวดหมู่ที่แยกกัน */
      .category-buttons-split { display: flex; flex-wrap: wrap; gap: 5px; flex-shrink: 0; }

      /* ปุ่มเพิ่มหมวดหมู่ด้านซ้ายและขวา */
      .add-category-left, .add-category-right { flex: 1 1 auto; min-width: 100px; padding: 12px 15px; justify-content: center; border-radius: 8px; }

      /* ปุ่มเพิ่มหมวดหมู่ด้านซ้าย */
      .add-category-left { background-color: #393b3d; color: white; }
      /* ปุ่มเพิ่มหมวดหมู่ด้านซ้ายเมื่อโฮเวอร์ */
      .add-category-left:hover { background-color: #252424; }

      /* ปุ่มเพิ่มหมวดหมู่ด้านขวา */
      .add-category-right { background-color: #393b3d; color: white; }
      /* ปุ่มเพิ่มหมวดหมู่ด้านขวาเมื่อโฮเวอร์ */
      .add-category-right:hover { background-color: #252424; }

      /* สื่อสิ่งพิมพ์สำหรับหน้าจอเล็กมาก (มือถือแนวตั้ง) */
      @media (max-width: 480px) { /* ปุ่มหมวดหมู่ที่แยกกันบนมือถือ */ .category-buttons-split { flex-direction: column; } }

      /* ตัวห่อคอลัมน์สรุป (แนวนอน) */
      .summary-columns-horizontal-wrapper { width: 100%; max-width: none; margin: 0; box-sizing: border-box; padding: 0 10px; }

      /* แถวคอลัมน์แนวนอน */
      .horizontal-columns-row { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; width: 100%; }

      /* กล่องคอลัมน์แนวนอน */
      .horizontal-column-box { flex: 1 1 100%; max-width: 100%; max-width: calc(33.333% - 14px); box-sizing: border-box; }
      /* กล่องคอลัมน์แนวนอนสำหรับหน้าจอขนาดใหญ่ขึ้น */
      @media (min-width: 992px) { .horizontal-column-box { flex: 1 1 calc(50% - 14px); max-width: calc(50% - 14px); } }

      /* กล่องคอลัมน์แนวนอนสำหรับหน้าจอขนาดใหญ่มาก */
      @media (min-width: 1400px) { .horizontal-column-box { flex: 1 1 calc(33.333% - 14px); max-width: calc(33.333% - 14px); } }
      /* คอนเทนเนอร์หลักสำหรับหน้าจอขนาดใหญ่ */
      @media (min-width: 1200px) { .main-container { padding: 40px; } }

      /* การ์ดคอลัมน์แต่ละรายการ */
      .column-card { background: rgba(255, 255, 255, 0.7); border-radius: 20px; padding: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.07); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.4); display: flex; flex-direction: column; min-height: 250px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }

      /* การ์ดคอลัมน์เมื่อโฮเวอร์ */
      .column-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.1); }

      /* พื้นหลังคอลัมน์รายรับ */
      .income-column-background { background: linear-gradient(135deg, #e0e0e0, #f5f5f5); border: 1px solid rgba(200, 200, 200, 0.5); box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); backdrop-filter: blur(6px); }

      /* พื้นหลังคอลัมน์รายจ่าย */
      .expense-column-background { background: linear-gradient(135deg, #d6d6d6, #e9e9e9); border: 1px solid rgba(180, 180, 180, 0.5); box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); backdrop-filter: blur(6px); }

      /* พื้นหลังคอลัมน์กองทุน */
      .fund-column-background { background: linear-gradient(135deg, #cfcfcf, #e0e0e0); border: 1px solid rgba(160, 160, 160, 0.5); box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); backdrop-filter: blur(6px); }

      /* ส่วนหัวคอลัมน์ */
      .column-header { text-align: center; padding-bottom: 15px; margin-bottom: 15px; border-bottom: 3px solid; }

      /* หัวข้อ h3 ในส่วนหัวคอลัมน์ */
      .column-header h3 { margin: 0; font-size: 1.5em; color: #333; font-weight: 600; }

      /* เนื้อหาคอลัมน์ */
      .column-content { min-height: 400px; gap: 8px; max-height: 400px; overflow-y: auto; padding-right: 10px; box-sizing: border-box; scrollbar-width: thin; scrollbar-color: #ccc transparent; }

      /* แถบเลื่อนของเนื้อหาคอลัมน์ (Webkit) */
      .column-content::-webkit-scrollbar { width: 8px; }
      /* แทร็กแถบเลื่อนของเนื้อหาคอลัมน์ (Webkit) */
      .column-content::-webkit-scrollbar-track { background: transparent; }
      /* ตัวเลื่อนของแถบเลื่อนของเนื้อหาคอลัมน์ (Webkit) */
      .column-content::-webkit-scrollbar-thumb { background-color: #ccc; border-radius: 10px; border: 2px solid transparent; }
      /* ตัวเลื่อนของแถบเลื่อนของเนื้อหาคอลัมน์เมื่อโฮเวอร์ (Webkit) */
      .column-content::-webkit-scrollbar-thumb:hover { background-color: #a0a0a0; }

      /* ข้อความไม่มีรายการ */
      .no-entries-message { text-align: center; color: #888; font-style: italic; padding: 20px 0; }

      /* คอนเทนเนอร์รายการ */
      .entry-container { margin-bottom: 15px; display: flex; flex-direction: column; border: 1px solid #e0e0e0; width: 100%; height: auto; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }

      /* สไตล์เฉพาะตั๋วรายการทางการเงิน (ภายใน foreignObject) */
      .ticket-svg-container { height: 90px; width: 100%; max-width: 100%; box-sizing: border-box; border-top: 1px solid #ccc; padding-top: 6px; }

      /* ตัวห่อเนื้อหารายการทางการเงิน */
      .financial-entry-content-wrapper { display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; word-break: break-word; height: 100%; padding: 6px 12px; }

      /* บรรทัดแรกของรายการ */
      .entry-first-line { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 2px; }

      /* ชื่อรายการ */
      .entry-name { display: inline-block; font-weight: 600; font-size: 1.1em; border-bottom: 2px solid #ccc; padding-bottom: 2px; }

      /* จำนวนเงินและปุ่มดำเนินการของรายการ */
      .entry-amount-actions { display: flex; align-items: center; flex-shrink: 0; }

      /* ค่าจำนวนเงินของรายการ */
      .entry-amount-value { font-size: 1.2em; font-weight: bold; white-space: nowrap; margin-right: 10px; }

      /* กลุ่มปุ่มดำเนินการของรายการ */
      .entry-action-buttons { display: flex; gap: 5px; }

      /* คอนเทนเนอร์ SVG ตั๋วในเนื้อหาคอลัมน์ */
      .column-content .ticket-svg-container { margin-bottom: 0px; }

      /* คอนเทนเนอร์ SVG ตั๋วสุดท้ายในเนื้อหาคอลัมน์ */
      .column-content .ticket-svg-container:last-child { margin-bottom: 0px; }

      /* บรรทัดที่สองของรายการ */
      .entry-second-line { display: flex; justify-content: space-between; align-items: flex-end; width: 100%; font-size: 0.85em; color: #666; margin-top: auto; }

      /* ป้ายกำกับหมวดหมู่รายการ */
      .entry-category-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-grow: 1; }

      /* ข้อความวันที่รายการ */
      .entry-date-text { white-space: nowrap; flex-shrink: 0; text-align: right; }

      /* สไตล์ปุ่มที่ปรับปรุง */
      .icon-button { font-size: 1em; padding: 6px 8px; border-radius: 6px; background: transparent; border: 1px solid rgba(0, 0, 0, 0.15); cursor: pointer; transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.1s ease, box-shadow 0.1s ease; display: flex; align-items: center; justify-content: center; min-width: 30px; min-height: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

      /* ปุ่มไอคอนเมื่อโฮเวอร์ */
      .icon-button:hover { border-color: rgba(0, 0, 0, 0.3); transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }

      /* ปุ่มไอคอนเมื่อคลิก */
      .icon-button:active { transform: translateY(0); box-shadow: inset 0 1px 3px rgba(0,0,0,0.2); }

      /* ปุ่มแก้ไข */
      .icon-button.edit-button { background-color: #fd7e14; color: white; border-color: #fd7e14; }
      /* ปุ่มแก้ไขเมื่อโฮเวอร์ */
      .icon-button.edit-button:hover { background-color: #e66700; color: white; border-color: #e66700; }

      /* ปุ่มลบ */
      .icon-button.delete-button { background-color: #dc3545; color: white; border-color: #dc3545; }
      /* ปุ่มลบเมื่อโฮเวอร์ */
      .icon-button.delete-button:hover { background-color: #c82333; color: white; border-color: #c82333; }

      /* Media Queries สำหรับการตอบสนอง (Responsive) */
      @media (max-width: 768px) {
        /* คอนเทนเนอร์หลักบนมือถือ */
        .main-container { padding: 15px; margin: 2px auto; }
        /* เนื้อหาคอลัมน์บนมือถือ */
        .column-content { max-height: 400px; padding-right: 10px; overflow-y: auto; box-sizing: border-box; gap: 4px; }
        /* การ์ดแสดงยอดคงเหลือบนมือถือ */
        .balance-display-card { padding: 20px; }
        /* หัวข้อของยอดคงเหลือบนมือถือ */
        .balance-title { font-size: 1.4em; }
        /* จำนวนเงินคงเหลือบนมือถือ */
        .balance-amount { font-size: 2.2em; }
        /* แถบฟอร์มบนมือถือ */
        .form-bar { flex-direction: column; align-items: stretch; }
        /* คอนเทนเนอร์ SVG ตั๋วบนมือถือ */
        .ticket-svg-container { height: 120px; }
        /* อินพุต, ตัวเลือก, ปุ่มเพิ่มรายการบนมือถือ */
        .form-input, .form-select, .add-entry-button { min-width: unset; width: 100%; }
        /* แถวคอลัมน์แนวนอนบนมือถือ */
        .horizontal-columns-row { flex-direction: column; align-items: stretch; }
        /* กล่องคอลัมน์แนวนอนบนมือถือ */
        .horizontal-column-box { width: 100%; max-width: 100%; min-width: unset; }
        /* การ์ดคอลัมน์บนมือถือ */
        .column-card { padding: 30px; min-height: 300px; }
        /* การตัดข้อความสำหรับชื่อ, จำนวน, หมวดหมู่, วันที่บนมือถือ */
        .entry-name, .entry-amount-value, .entry-category-label, .entry-date-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        /* ขนาดตัวอักษรของชื่อรายการบนมือถือ */
        .entry-name { font-size: clamp(1em, 1.5vw, 1.4em); }
        /* ขนาดตัวอักษรของจำนวนเงินรายการบนมือถือ */
        .entry-amount-value { font-size: clamp(1.1em, 2vw, 1.6em); }
        /* ขนาดตัวอักษรของบรรทัดที่สองของรายการบนมือถือ */
        .entry-second-line { font-size: clamp(0.85em, 1vw, 1em); }
      }
      @media (max-width: 480px) {
        /* กลุ่มปุ่มรายการบนหน้าจอเล็กมาก */
        .entry-button-group { flex-direction: row; flex-wrap: wrap; justify-content: space-between; width: 100%; }
        /* ปุ่มเพิ่มรายการ, ปุ่มเพิ่มหมวดหมู่ซ้าย-ขวา บนหน้าจอเล็กมาก */
        .add-entry-button.add-entry, .category-buttons-split .add-category-left, .category-buttons-split .add-category-right { flex: 1 1 calc(33% - 10px); min-width: unset; }
        /* ปุ่มเพิ่มรายการเฉพาะบนหน้าจอเล็กมาก */
        .add-entry-button.add-entry { flex: 1 1 calc(33% - 10px); }
        /* ปุ่มบันทึก/ยกเลิกการแก้ไขบนหน้าจอเล็กมาก */
        .entry-button-group .save-edit-button, .entry-button-group .cancel-button { flex: 1 1 calc(50% - 5px); min-width: unset; }
        /* ปุ่มหมวดหมู่ที่แยกกันบนหน้าจอเล็กมาก */
        .category-buttons-split { flex-direction: row; width: 100%; }
      }
    `}</style>
    </div>
  );
};

export default ExpenseManager;

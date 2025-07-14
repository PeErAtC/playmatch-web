// home.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Swal from "sweetalert2";
import { db, storage } from "../lib/firebaseConfig";
import {
  collection, getDocs, setDoc, doc, updateDoc, deleteDoc,
  query, where, writeBatch, limit, orderBy, startAfter, endBefore, getCountFromServer
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as XLSX from "xlsx";
import { ChevronUp, ChevronDown, ArrowUpDown, Camera, Loader } from 'lucide-react';
import Head from 'next/head';
import imageCompression from 'browser-image-compression';

// Modal Component
const Modal = ({ show, onClose, onGenerateTemplate, onFileUpload, isLimitReached, limitMessage }) => {
  if (!show) {
    return null;
  }
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close-button" onClick={onClose}>
          &times;
        </button>
        <h3>จัดการไฟล์ Excel สมาชิก</h3>
        <p>
          คุณสามารถดาวน์โหลดไฟล์ Excel แม่แบบเพื่อเพิ่มข้อมูลสมาชิก
          หรืออัปโหลดไฟล์ที่มีอยู่
        </p>
        <div className="modal-actions">
          <button
            className="modal-download-template-button"
            onClick={onGenerateTemplate}
          >
            ดาวน์โหลดไฟล์ Excel แม่แบบ
          </button>
          <hr className="modal-separator" />
          {isLimitReached && <p className="limit-warning-modal">{limitMessage}</p>}
          <label htmlFor="excel-upload" className={`modal-upload-label ${isLimitReached ? 'disabled' : ''}`}>
            เลือกไฟล์ Excel เพื่ออัปโหลด:
            <input
              id="excel-upload"
              type="file"
              onChange={onFileUpload}
              accept=".xlsx, .xls"
              className="modal-file-input"
              disabled={isLimitReached}
            />
          </label>
        </div>
      </div>
      <style jsx>{`
        /* Modal CSS */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background: #fff;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
          width: 90%;
          max-width: 500px;
          position: relative;
          text-align: center;
        }

        .modal-close-button {
          position: absolute;
          top: 15px;
          right: 15px;
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #888;
          transition: color 0.2s ease-in-out;
        }

        .modal-close-button:hover {
          color: #333;
        }

        .modal-content h3 {
          margin-top: 0;
          margin-bottom: 15px;
          color: #333;
          font-size: 22px;
        }

        .modal-content p {
          margin-bottom: 25px;
          color: #555;
          font-size: 15px;
        }

        .limit-warning-modal {
          color: #dc3545;
          font-weight: bold;
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 15px;
        }

        .modal-upload-label.disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .modal-actions {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .modal-download-template-button {
          background-color: #4bf196;
          color: black;
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          font-size: 15px;
          cursor: pointer;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          transition: background-color 0.2s ease-in-out;
        }

        .modal-download-template-button:hover {
          background-color: #3fc57b;
        }

        .modal-separator {
          border: 0;
          border-top: 1px solid #eee;
          margin: 15px 0;
        }

        .modal-upload-label {
          display: block;
          font-size: 15px;
          color: #555;
          margin-bottom: 10px;
          cursor: pointer;
        }

        .modal-file-input {
          display: block;
          margin: 10px auto 0;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          width: calc(100% - 20px);
          font-size: 14px;
        }

        @media (max-width: 600px) {
          .modal-content {
            padding: 20px;
            margin: 20px;
          }

          .modal-close-button {
            font-size: 24px;
            top: 10px;
            right: 10px;
          }

          .modal-content h3 {
            font-size: 20px;
          }

          .modal-content p,
          .modal-upload-label {
            font-size: 14px;
          }

          .modal-download-template-button {
            padding: 10px 20px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};

// Image Preview Modal Component
const ImagePreviewModal = ({ show, imageUrl, onClose }) => {
  if (!show) {
    return null;
  }
  const handleOverlayClick = (e) => {
    if (e.target.id === 'image-modal-overlay') {
      onClose();
    }
  };
  return (
    <div id="image-modal-overlay" className="image-modal-overlay" onClick={handleOverlayClick}>
      <div className="image-modal-content">
        <img src={imageUrl} alt="Member Preview" className="image-modal-image" />
        <button className="image-modal-close-button" onClick={onClose}>
          &times;
        </button>
      </div>
      <style jsx>{`
        .image-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.75);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
          cursor: pointer;
        }
        .image-modal-content {
          position: relative;
          cursor: default;
          width: 400px;
          height: 400px;
        }
        .image-modal-image {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid white;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .image-modal-close-button {
          position: absolute;
          top: -10px;
          right: -10px;
          background: white;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #333;
          border-radius: 50%;
          width: 35px;
          height: 35px;
          line-height: 35px;
          text-align: center;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        @media (max-width: 600px) {
          .image-modal-content {
            width: 80vw;
            height: 80vw;
          }
        }
      `}</style>
    </div>
  );
};

const Home = () => {
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [lineId, setLineId] = useState("");
  const [handed, setHanded] = useState("Right");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState(new Date().toISOString().split('T')[0]);
  const [experience, setExperience] = useState("");
  const [status, setStatus] = useState("ไม่มา");
  const [members, setMembers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [membersPerPage, setMembersPerPage] = useState(30);
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [isResettingStatus, setIsResettingStatus] = useState(false);

  const [userPackage, setUserPackage] = useState(null);
  const [totalMemberCount, setTotalMemberCount] = useState(0);

  const [lastVisible, setLastVisible] = useState(null);
  const [firstVisible, setFirstVisible] = useState(null);
  const [hasMoreNext, setHasMoreNext] = useState(false);
  const [hasMorePrev, setHasMorePrev] = useState(false);
  const [totalCame, setTotalCame] = useState(0);
  const [totalNotCame, setTotalNotCame] = useState(0);

  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [selectedRegion, setSelectedRegion] = useState('northeast');

  const memberFileInputRef = useRef(null);
  const [uploadTargetMemberId, setUploadTargetMemberId] = useState(null);
  const [isMemberUploading, setIsMemberUploading] = useState(null);

  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');

  const [showMemberImagesColumn, setShowMemberImagesColumn] = useState(true);

  const packageLimits = useMemo(() => ({
    Basic: 60,
    Pro: 200,
    Premium: Infinity
  }), []);

  const currentLimit = userPackage ? packageLimits[userPackage] : 0;
  const isLimitReached = userPackage !== 'premium' && totalMemberCount >= currentLimit;
  const limitMessage = `คุณมีสมาชิก ${totalMemberCount}/${currentLimit} คน (เต็มจำนวน) สำหรับแพ็คเกจ ${userPackage}`;

  useEffect(() => {
    const updateVisibility = () => {
      const savedSetting = localStorage.getItem('showMemberImages');
      setShowMemberImagesColumn(savedSetting !== null ? JSON.parse(savedSetting) : true);
    };

    updateVisibility();
    window.addEventListener('storage', updateVisibility);

    return () => {
      window.removeEventListener('storage', updateVisibility);
    };
  }, []);

  const levelOrder = useMemo(() => {
    const northeastOrder = [
      "มือหน้าบ้าน", "มือหน้าบ้าน1", "มือหน้าบ้าน2", "มือหน้าบ้าน3","BG", "S-", "S", "N-", "N", "P-", "P","C"
    ];
    const centralOrder = [
      "Rookie", "BG-", "BG", "N-", "N", "S", "S+", "P-", "P", "P+", "C",
    ];
    return selectedRegion === 'northeast' ? northeastOrder : centralOrder;
  }, [selectedRegion]);


  const calculateAge = (isoBirthDate) => {
    if (!isoBirthDate) return null;
    const today = new Date();
    const birthDateObj = new Date(isoBirthDate);

    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age;
  };

  const excelDateToISODate = (excelDateNumber) => {
    if (typeof excelDateNumber !== "number") return null;
    const date = new Date((excelDateNumber - (25569 + 1)) * 86400 * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const generateExcelTemplate = () => {
    const headers = [
      "name", "level", "lineId", "handed", "phone", "birthDate", "experience", "status",
    ];

    const templateData = [
      { name: "ตัวอย่าง ชื่อ-นามสกุล", level: "S", lineId: "example_line_id", handed: "Right", phone: "0812345678", birthDate: "1990-05-15", experience: "2 ปี", status: "มา" },
      { name: "ตัวอย่าง คนที่สอง", level: "P-", lineId: "second_example", handed: "Left", phone: "0998765432", birthDate: "1985-11-20", experience: "5 ปี", status: "ไม่มา" },
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.sheet_add_json(ws, templateData, { skipHeader: true, origin: -1, header: headers });

    const columnWidths = [ { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 10 } ];
    ws["!cols"] = columnWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "สมาชิก");
    const fileName = "members_template.xlsx";
    XLSX.writeFile(wb, fileName);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: null });

        try {
          if (isLimitReached) {
            Swal.fire('เพิ่มสมาชิกไม่สำเร็จ', limitMessage, 'error');
            return;
          }

          let membersToProcess = jsonData;
          const availableSlots = currentLimit - totalMemberCount;

          if (userPackage !== 'premium' && jsonData.length > availableSlots) {
            const confirmation = await Swal.fire({
              title: 'จำนวนสมาชิกเกินโควต้า',
              html: `แพ็คเกจ <b>${userPackage}</b> ของคุณสามารถเพิ่มสมาชิกได้อีก <b>${availableSlots}</b> คนเท่านั้น (จาก ${jsonData.length} คนในไฟล์)<br/><br/>คุณต้องการเพิ่มสมาชิก ${availableSlots} คนแรกหรือไม่?`,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'ใช่, เพิ่มเลย',
              cancelButtonText: 'ยกเลิก'
            });

            if (!confirmation.isConfirmed) {
              return;
            }
            membersToProcess = jsonData.slice(0, availableSlots);
          }

          if (membersToProcess.length === 0) {
            Swal.fire( "ไฟล์ Excel ว่างเปล่า", "ไม่พบข้อมูลในไฟล์ที่คุณอัปโหลด", "warning" );
            return;
          }

          if (!currentUserId) {
            Swal.fire("ข้อผิดพลาด", "ไม่พบ ID ผู้ใช้ในระบบ", "error");
            return;
          }

          let validationErrors = [];
          let successCount = 0;
          const batch = writeBatch(db);

          for (let i = 0; i < membersToProcess.length; i++) {
            const member = membersToProcess[i];
            const rowIndex = i + 2;

            if (!member) {
              validationErrors.push(`แถวที่ ${rowIndex}: ไม่มีข้อมูล`);
              continue;
            }

            const nameTrimmed = (member.name || "").toString().trim();
            const levelTrimmed = (member.level || "").toString().trim();
            const lineIdTrimmed = (member.lineId || "").toString().trim();
            const handedTrimmed = (member.handed || "Right").toString().trim();
            const phoneTrimmed = (member.phone || "").toString().trim();
            let birthDateValue = new Date().toISOString().split('T')[0];

            if (member.birthDate) {
              if (typeof member.birthDate === "number") {
                birthDateValue = excelDateToISODate(member.birthDate);
              } else if (typeof member.birthDate === "string") {
                const parsedDate = new Date(member.birthDate);
                if (!isNaN(parsedDate.getTime())) {
                  birthDateValue = member.birthDate;
                }
              }
            }

            const experienceTrimmed = (member.experience || "").toString().trim();
            const statusTrimmed = (member.status || "ไม่มา").toString().trim();

            const newUser = {
              name: nameTrimmed, level: levelTrimmed, lineId: lineIdTrimmed, handed: handedTrimmed,
              phone: phoneTrimmed, birthDate: birthDateValue, experience: experienceTrimmed,
              status: statusTrimmed, createBy: loggedInUsername,
            };

            let rowErrors = [];
            if (!newUser.name) rowErrors.push("ชื่อ");
            if (!newUser.level) rowErrors.push("ระดับ");

            if (rowErrors.length > 0) {
              validationErrors.push( `แถวที่ ${rowIndex}: ข้อมูลไม่ครบถ้วนในช่อง: ${rowErrors.join( ", " )}` );
              continue;
            }

            const newMemberRef = doc(collection(db, `users/${currentUserId}/Members`));
            const memberId = newMemberRef.id;

            batch.set(newMemberRef, { ...newUser, memberId, createdAt: new Date() });
            successCount++;
          }

          if (successCount > 0) {
            await batch.commit();
            Swal.fire( "สำเร็จ!", `เพิ่มข้อมูลสมาชิกจาก Excel สำเร็จ ${successCount} คน!`, "success" );
            setShowModal(false);
            setCurrentPage(1);
            fetchMembers('current', null);
            fetchTotalMemberCount();
          }

          if (validationErrors.length > 0) {
            Swal.fire( "มีข้อผิดพลาดบางอย่าง", "พบข้อผิดพลาดในการนำเข้าข้อมูลบางส่วน:\n" + validationErrors.join("\n"), "warning" );
          } else if (successCount === 0) {
            Swal.fire( "ไม่พบข้อมูลที่ถูกต้อง", "ไม่มีข้อมูลสมาชิกที่สามารถเพิ่มได้จากไฟล์ Excel", "warning" );
          }
        } catch (error) {
          console.error("Error uploading Excel file:", error);
          Swal.fire( "เกิดข้อผิดพลาดในการอัปโหลดไฟล์ Excel", error.message, "error" );
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Swal.fire( "กรุณาอัปโหลดไฟล์ Excel เท่านั้น", "ไฟล์ที่รองรับคือ .xlsx และ .xls", "warning" );
    }
  };

  const fetchUserData = async () => {
    const email = localStorage.getItem("loggedInEmail");
    if (email) {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docSnapshot = querySnapshot.docs[0];
          const userData = docSnapshot.data();
          setLoggedInUsername(userData.username);
          setCurrentUserId(docSnapshot.id);
          setUserPackage(userData.packageType || 'basic');
        } else {
          console.warn("User data not found for email:", email);
          setUserPackage('basic');
        }
      } catch (error) {
        console.error("Error fetching user data: ", error);
        setUserPackage('basic');
      }
    }
  };

  const fetchTotalMemberCount = useCallback(async () => {
    if (!currentUserId) return;
    try {
        const membersRef = collection(db, `users/${currentUserId}/Members`);
        const q = query(membersRef);
        const snapshot = await getCountFromServer(q);
        setTotalMemberCount(snapshot.data().count);
    } catch (error) {
        console.error("Error fetching total member count:", error);
    }
  }, [currentUserId]);


  const fetchMembers = useCallback(async (direction = 'current', cursor = null) => {
    if (!currentUserId) {
        setMembers([]);
        setFirstVisible(null); setLastVisible(null); setHasMoreNext(false); setHasMorePrev(false);
        return;
    }

    try {
        const membersRef = collection(db, `users/${currentUserId}/Members`);
        let baseQuery = membersRef;

        let appliedOrderByKey = sortConfig.key || 'createdAt';
        let appliedOrderByDirection = sortConfig.direction === 'descending' ? 'desc' : 'asc';

        if (search) {
            baseQuery = query( baseQuery, where('name', '>=', search), where('name', '<=', search + '\uf8ff') );
            appliedOrderByKey = 'name';
            appliedOrderByDirection = sortConfig.direction === 'descending' ? 'desc' : 'asc';
        }

        let q;
        if (direction === 'next' && cursor) {
            q = query(baseQuery, orderBy(appliedOrderByKey, appliedOrderByDirection), startAfter(cursor), limit(membersPerPage));
        } else if (direction === 'prev' && cursor) {
            q = query(baseQuery, orderBy(appliedOrderByKey, appliedOrderByDirection === 'asc' ? 'desc' : 'asc'), startAfter(cursor), limit(membersPerPage));
        } else {
            q = query(baseQuery, orderBy(appliedOrderByKey, appliedOrderByDirection), limit(membersPerPage));
        }

        const documentSnapshots = await getDocs(q);
        let fetchedMembers = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (direction === 'prev') {
            fetchedMembers = fetchedMembers.reverse();
        }

        if (sortConfig.key === 'level') {
            fetchedMembers.sort((a, b) => {
                const aIndex = levelOrder.indexOf(a.level);
                const bIndex = levelOrder.indexOf(b.level);
                if (sortConfig.direction === 'ascending') {
                    return (aIndex === -1 ? Infinity : aIndex) - (bIndex === -1 ? Infinity : bIndex);
                } else {
                    return (bIndex === -1 ? Infinity : bIndex) - (aIndex === -1 ? Infinity : aIndex);
                }
            });
        } else if (sortConfig.key === 'birthDate') {
            fetchedMembers.sort((a, b) => {
                const ageA = calculateAge(a.birthDate);
                const ageB = calculateAge(b.birthDate);
                if (sortConfig.direction === 'ascending') {
                    return (ageA === null ? Infinity : ageA) - (ageB === null ? Infinity : ageB);
                } else {
                    return (ageB === null ? Infinity : ageB) - (ageA === null ? Infinity : ageA);
                }
            });
        }

        setMembers(fetchedMembers);

        const came = fetchedMembers.filter((m) => m.status === "มา").length;
        const notCame = fetchedMembers.filter((m) => m.status === "ไม่มา").length;
        setTotalCame(came);
        setTotalNotCame(notCame);

        if (fetchedMembers.length > 0) {
            setFirstVisible(documentSnapshots.docs[0]);
            setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);

            const nextDocsQuery = query( baseQuery, orderBy(appliedOrderByKey, appliedOrderByDirection), startAfter(documentSnapshots.docs[documentSnapshots.docs.length - 1]), limit(1) );
            const nextDocsSnapshot = await getDocs(nextDocsQuery);
            setHasMoreNext(!nextDocsSnapshot.empty);

            const prevDocsQuery = query( baseQuery, orderBy(appliedOrderByKey, appliedOrderByDirection === 'asc' ? 'desc' : 'asc'), startAfter(documentSnapshots.docs[0]), limit(1) );
            const prevDocsSnapshot = await getDocs(prevDocsQuery);
            setHasMorePrev(!prevDocsSnapshot.empty);

        } else {
            setFirstVisible(null); setLastVisible(null); setHasMoreNext(false); setHasMorePrev(false);
        }

    } catch (error) {
        console.error("Error fetching paginated members:", error);
        Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถดึงข้อมูลสมาชิกได้: " + error.message, "error");
        setMembers([]); setFirstVisible(null); setLastVisible(null); setHasMoreNext(false); setHasMorePrev(false);
    }
  }, [currentUserId, membersPerPage, sortConfig, levelOrder, search]);

useEffect(() => {
    fetchUserData();
}, []);

useEffect(() => {
    if (currentUserId) {
        setCurrentPage(1);
        fetchMembers('current', null);
        fetchTotalMemberCount();
    }
}, [currentUserId, fetchMembers, sortConfig, search, selectedRegion, fetchTotalMemberCount]);

  const handleSelectUser = (user) => {
    if (selectedUser && selectedUser.memberId === user.memberId) {
      setSelectedUser(null);
      clearForm();
      setIsEditing(false);
    } else {
      setSelectedUser(user);
      setName(user.name);
      setLevel(user.level);
      setLineId(user.lineId || "");
      setHanded(user.handed || "Right");
      setPhone(user.phone || "");
      setBirthDate(user.birthDate || new Date().toISOString().split('T')[0]);
      setExperience(user.experience || "");
      setStatus(user.status || "ไม่มา");
      setIsEditing(true);
      setIsFormExpanded(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !level) {
      Swal.fire("กรุณากรอกข้อมูล 'ชื่อ' และ 'ระดับ' ให้ครบถ้วน", "", "warning");
      return;
    }

    if (!isEditing && isLimitReached) {
        Swal.fire({
            icon: 'error',
            title: 'เพิ่มสมาชิกไม่สำเร็จ',
            text: limitMessage + ' หากต้องการเพิ่มสมาชิกมากกว่านี้ กรุณาอัปเกรดแพ็คเกจ',
        });
        return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthDate)) {
      Swal.fire("รูปแบบวันเดือนปีเกิดไม่ถูกต้อง", "กรุณาเลือกวันเดือนปีเกิดในรูปแบบ YYYY-MM-DD (เช่น 1990-01-01)", "warning");
      return;
    }
    const parsedDate = new Date(birthDate);
    if (isNaN(parsedDate.getTime())) {
      Swal.fire("วันเดือนปีเกิดไม่ถูกต้อง", "กรุณาเลือกวันเดือนปีเกิดที่ถูกต้อง", "warning");
      return;
    }

    const newUser = {
      name, level, lineId: lineId || "", handed: handed || "Right", phone: phone || "",
      birthDate: birthDate || new Date().toISOString().split('T')[0],
      experience: experience || "", status: status || "ไม่มา", createBy: loggedInUsername,
    };

    try {
      if (!currentUserId) {
        Swal.fire("ข้อผิดพลาด", "ไม่พบ ID ผู้ใช้ในระบบ", "error");
        return;
      }

      if (isEditing && selectedUser) {
        const memberRef = doc(db, `users/${currentUserId}/Members/${selectedUser.memberId}`);
        await updateDoc(memberRef, { ...newUser, updatedAt: new Date() });
        Swal.fire("สำเร็จ!", "แก้ไขข้อมูลสมาชิกสำเร็จ!", "success");
      } else {
        const newMemberRef = doc(collection(db, `users/${currentUserId}/Members`));
        const memberId = newMemberRef.id;

        await setDoc(newMemberRef, { ...newUser, memberId, createdAt: new Date() });
        Swal.fire("สำเร็จ!", "เพิ่มสมาชิกสำเร็จ!", "success");
      }

      clearForm();
      setCurrentPage(1);
      fetchMembers('current', null);
      fetchTotalMemberCount();
    } catch (error) {
      Swal.fire("เกิดข้อผิดพลาด", error.message, "error");
    }
  };

  const handleDelete = async () => {
    if (selectedUser) {
      const result = await Swal.fire({
        title: `ลบสมาชิก ${selectedUser.name}?`, text: "คุณต้องการลบสมาชิกนี้จริงหรือไม่?",
        icon: "warning", showCancelButton: true, confirmButtonText: "ลบ", cancelButtonText: "ยกเลิก",
      });

      if (!result.isConfirmed) return;

      try {
        if (!currentUserId) {
          Swal.fire("ข้อผิดพลาด", "ไม่พบ ID ผู้ใช้ในระบบ", "error");
          return;
        }

        const memberRef = doc(db, `users/${currentUserId}/Members/${selectedUser.memberId}`);
        await deleteDoc(memberRef);
        Swal.fire("ลบสำเร็จ!", "", "success");

        clearForm();
        setCurrentPage(1);
        fetchMembers('current', null);
        fetchTotalMemberCount();
      } catch (error) {
        Swal.fire("เกิดข้อผิดพลาดในการลบ", error.message, "error");
      }
    }
  };

  const toggleStatus = async (user) => {
    const newStatus = user.status === "มา" || !user.status ? "ไม่มา" : "มา";
    try {
      if (!currentUserId) {
        Swal.fire("ข้อผิดพลาด", "ไม่พบ ID ผู้ใช้ในระบบ", "error");
        return;
      }

      const memberRef = doc(db, `users/${currentUserId}/Members/${user.memberId}`);
      await updateDoc(memberRef, { status: newStatus });

      setMembers(prevMembers =>
        prevMembers.map(member =>
          member.memberId === user.memberId ? { ...member, status: newStatus } : member
        )
      );
    } catch (error) {
      Swal.fire("เกิดข้อผิดพลาดในการอัปเดตสถานะ", error.message, "error");
    }
  };

  const handleResetAllStatus = async () => {
    const result = await Swal.fire({
      title: "รีเซ็ตสถานะทั้งหมด?", text: "คุณต้องการรีเซ็ตสถานะของสมาชิกทุกคนให้เป็น 'ไม่มา' ใช่หรือไม่?",
      icon: "warning", showCancelButton: true, confirmButtonText: "รีเซ็ต",
      cancelButtonText: "ยกเลิก", confirmButtonColor: "#d33",
    });

    if (!result.isConfirmed) return;

    setIsResettingStatus(true);
    try {
      if (!currentUserId) {
        Swal.fire("ข้อผิดพลาด", "ไม่พบ ID ผู้ใช้ในระบบ", "error");
        setIsResettingStatus(false);
        return;
      }

      const batch = writeBatch(db);
      const membersRef = collection(db, `users/${currentUserId}/Members`);
      const membersSnapshot = await getDocs(membersRef);

      membersSnapshot.docs.forEach((memberDoc) => {
        const memberRef = doc(db, `users/${currentUserId}/Members`, memberDoc.id);
        batch.update(memberRef, { status: "ไม่มา" });
      });

      await batch.commit();
      Swal.fire("สำเร็จ!", "รีเซ็ตสถานะสมาชิกทั้งหมดเป็น 'ไม่มา' สำเร็จ!", "success");
      fetchMembers('current', null);
    } catch (error) {
      console.error("Error resetting all statuses:", error);
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถรีเซ็ตสถานะได้: " + error.message, "error");
    } finally {
      setIsResettingStatus(false);
    }
  };

  const clearForm = () => {
    setName(""); setLevel(""); setLineId(""); setHanded("Right"); setPhone("");
    setBirthDate(new Date().toISOString().split('T')[0]); setStatus("ไม่มา");
    setExperience(""); setSelectedUser(null); setIsEditing(false);
  };

  const toggleFormExpansion = () => setIsFormExpanded((prev) => !prev);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? <ChevronUp size={16} className="sort-icon" /> : <ChevronDown size={16} className="sort-icon" />;
    }
    return <ArrowUpDown size={16} className="sort-icon" />;
  };

  const goToNextPage = () => {
    if (hasMoreNext) {
        setCurrentPage(prev => prev + 1);
        fetchMembers('next', lastVisible);
    }
  };

  const goToPrevPage = () => {
    if (hasMorePrev) {
        setCurrentPage(prev => prev - 1);
        fetchMembers('prev', firstVisible);
    }
  };

  const handleAvatarClick = (user) => {
    if (user.profileImageUrl) {
      setModalImageUrl(user.profileImageUrl);
      setShowImageModal(true);
    } else {
      setUploadTargetMemberId(user.memberId);
      if (memberFileInputRef.current) {
        memberFileInputRef.current.click();
      }
    }
  };

  const handleUploadTrigger = (event, user) => {
    event.stopPropagation();
    setUploadTargetMemberId(user.memberId);
    if (memberFileInputRef.current) {
      memberFileInputRef.current.click();
    }
  };

  const handleMemberImageUpload = async (event) => {
    const imageFile = event.target.files[0];
    if (!imageFile || !uploadTargetMemberId || !currentUserId) return;

    const options = { maxSizeMB: 1, maxWidthOrHeight: 800, useWebWorker: true };

    try {
      setIsMemberUploading(uploadTargetMemberId);
      const compressedFile = await imageCompression(imageFile, options);
      const storagePath = `member_profiles/${currentUserId}/${uploadTargetMemberId}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, compressedFile);
      const downloadURL = await getDownloadURL(storageRef);
      const memberDocRef = doc(db, `users/${currentUserId}/Members/${uploadTargetMemberId}`);
      await updateDoc(memberDocRef, { profileImageUrl: downloadURL });

      setMembers(prevMembers =>
        prevMembers.map(member =>
          member.memberId === uploadTargetMemberId ? { ...member, profileImageUrl: downloadURL } : member
        )
      );
    } catch (error) {
      console.error("Error uploading member image:", error);
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถอัปโหลดรูปภาพได้", "error");
    } finally {
      setIsMemberUploading(null);
      if (memberFileInputRef.current) memberFileInputRef.current.value = "";
      setUploadTargetMemberId(null);
    }
  };

  return (
    <div className="overall-layout">
    <Head>
      <title>หน้าหลัก PlayMatch - จัดการสมาชิกก๊วนแบดมินตัน</title>
      <meta name="description" content="จัดการข้อมูลสมาชิกก๊วนแบดมินตันของคุณได้อย่างง่ายดาย เพิ่ม, แก้ไข, ลบ, ค้นหา, จัดเรียง และนำเข้า/ส่งออกข้อมูลสมาชิกด้วย PlayMatch." />
    </Head>
      <main className="main-content">
        <h2>สมาชิก</h2>
        <hr className="title-separator" />

        <ImagePreviewModal
          show={showImageModal}
          imageUrl={modalImageUrl}
          onClose={() => setShowImageModal(false)}
        />

        <input
            type="file"
            ref={memberFileInputRef}
            onChange={handleMemberImageUpload}
            style={{ display: "none" }}
            accept="image/png, image/jpeg, image/gif"
        />

        <div className="action-buttons-top">
          <button
            onClick={() => setShowModal(true)}
            className="generate-excel-button"
          >
            จัดการไฟล์ Excel
          </button>
          <button
            onClick={handleResetAllStatus}
            disabled={isResettingStatus}
            className="reset-status-button"
          >
            {isResettingStatus ? (
                <> <span className="spinner"></span> กำลังรีเซ็ต... </>
            ) : ( "รีเซ็ตสถานะทั้งหมด" )}
          </button>
        </div>


        <Modal
          show={showModal}
          onClose={() => setShowModal(false)}
          onGenerateTemplate={generateExcelTemplate}
          onFileUpload={handleFileUpload}
          isLimitReached={isLimitReached}
          limitMessage={limitMessage}
        />

        <div className="member-form-section">
          <div className="form-header-with-toggle" onClick={toggleFormExpansion}>
            <h3 className="form-section-title">
                กรอกข้อมูลสมาชิก 
            </h3>
            <button
              className="toggle-form-button"
              aria-expanded={isFormExpanded}
            >
              {isFormExpanded ? "-" : "+"}
            </button>
          </div>

          <div className={`form-content-collapsible ${isFormExpanded ? "expanded" : "collapsed"}`}>
            {isLimitReached && <p className="limit-warning-form">{limitMessage}</p>}
            <p className="form-required-note">ช่องที่มีเครื่องหมาย <span className="required-asterisk">*</span> จำเป็นต้องกรอก</p>
            <form onSubmit={handleSubmit} className="form-box" noValidate>
              <div className="form-grid-container">
                <div>
                  <label className="form-label">ชื่อ<span className="required-asterisk">*</span></label>
                  <input className="modern-input" type="text" placeholder="ชื่อ" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Line</label>
                  <input className="modern-input" type="text" placeholder="Line" value={lineId} onChange={(e) => setLineId(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">เบอร์โทร</label>
                  <input className="modern-input" type="text" placeholder="เบอร์โทร" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength="10" />
                </div>
                <div>
                  <label className="form-label">วันเดือนปีเกิด</label>{" "}
                  <input className="modern-input" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">ระดับ<span className="required-asterisk">*</span></label>
                  <select className="modern-input" value={level} onChange={(e) => setLevel(e.target.value)}>
                    <option value="">เลือกระดับ</option>
                    {levelOrder.map(lvl => ( <option key={lvl} value={lvl}>{lvl}</option> ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">ประสบการณ์</label>
                  <select className="modern-input" value={experience} onChange={(e) => setExperience(e.target.value)}>
                    <option value="">ประสบการณ์</option>
                    <option value="น้อยกว่า 1 ปี">น้อยกว่า 1 ปี</option>
                    {[...Array(10)].map((_, i) => ( <option key={i + 1} value={`${i + 1} ปี`}>{i + 1} ปี</option> ))}
                    <option value=">10 ปี">มากกว่า 10 ปี</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">เลือกมือที่ถนัด</label>
                  <select className="modern-input" value={handed} onChange={(e) => setHanded(e.target.value)}>
                    <option value="Right">ขวา</option>
                    <option value="Left">ซ้าย</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">สถานะ</label>
                  <select className="modern-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="มา">มา</option>
                    <option value="ไม่มา">ไม่มา</option>
                  </select>
                </div>
              </div>

              <div className="form-buttons-container">
                <button type="submit" className={`submit-btn ${isEditing ? "edit" : ""}`} disabled={!isEditing && isLimitReached}>
                  {isEditing ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้"}
                </button>
                <button type="button" onClick={handleDelete} disabled={!selectedUser} className="delete-btn">
                  ลบ
                </button>
              </div>
            </form>
          </div>
        </div>

        <hr className="divider-line" />

        <div className="region-selection-container">
          <label className="form-label">ลำดับระดับมือ:</label>
          <select className="modern-input" value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
            <option value="northeast">ภาคอีสาน</option>
            <option value="central">ภาคกลาง</option>
          </select>
        </div>

        <div className="search-box">
          <input type="text" className="modern-input search-input" placeholder="ค้นหาผู้ใช้" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="table-controls-container">
            <div className="left-controls-wrapper">
                <div className="status-summary">
                    <span style={{ color: "#4caf50" }}>มาแล้ว: {totalCame} คน</span>
                    <span style={{ color: "#f44336" }}>ยังไม่มา: {totalNotCame} คน</span>
                </div>
                <div className="pagination-controls">
                    <button onClick={goToPrevPage} className="pagination-button" disabled={!hasMorePrev}> ย้อนกลับ </button>
                    <span className="current-page-display">หน้า {currentPage}</span>
                    <button onClick={goToNextPage} className="pagination-button" disabled={!hasMoreNext}> ถัดไป </button>
                </div>
            </div>
            <div className="right-controls-wrapper">
                <div className="total-members-on-page-display"> จำนวนสมาชิกในหน้านี้: {members.length} </div>
                <div className="per-page-selector">
                    <label htmlFor="members-per-page">แสดง:</label>
                    <select id="members-per-page" className="modern-input" value={membersPerPage}
                        onChange={(e) => {
                            const newSize = Number(e.target.value);
                            setMembersPerPage(newSize);
                            setCurrentPage(1);
                        }}
                    >
                        <option value="10">10 รายชื่อ</option>
                        <option value="20">20 รายชื่อ</option>
                        <option value="30">30 รายชื่อ</option>
                        <option value="50">50 รายชื่อ</option>
                    </select>
                </div>
            </div>
        </div>

        <div className="table-responsive-container">
          <table className="user-table">
            <thead>
              <tr>
                <th>เลือก</th>
                {showMemberImagesColumn && (<th className="avatar-column-header">รูป</th>)}
                <th>ชื่อ</th>
                <th onClick={() => requestSort('level')} className="sortable-header"> ระดับ {getSortIcon('level')} </th>
                <th>Line</th>
                <th>มือ</th>
                <th>เบอร์โทร</th>
                <th onClick={() => requestSort('birthDate')} className="sortable-header"> อายุ {getSortIcon('birthDate')} </th>
                <th>ประสบการณ์</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 && !search && (
                <tr>
                  <td colSpan={showMemberImagesColumn ? "10" : "9"} className="no-data-message">
                    ไม่พบข้อมูลสมาชิก กรุณาเพิ่มสมาชิกใหม่
                  </td>
                </tr>
              )}
              {members.length === 0 && search && (
                <tr>
                  <td colSpan={showMemberImagesColumn ? "10" : "9"} className="no-data-message">
                    ไม่พบข้อมูลสมาชิกที่ค้นหา
                  </td>
                </tr>
              )}
              {members.map((user) => (
                <tr key={user.memberId} className={ selectedUser?.memberId === user.memberId ? "selected-row" : "" }>
                  <td data-label="เลือก">
                    <input type="checkbox" checked={selectedUser?.memberId === user.memberId} onChange={() => handleSelectUser(user)} />
                  </td>
                  {showMemberImagesColumn && (
                    <td data-label="รูป">
                      <div className="member-avatar-cell" onClick={() => handleAvatarClick(user)}>
                        {isMemberUploading === user.memberId ? (
                          <Loader size={24} className="avatar-spinner" />
                        ) : user.profileImageUrl ? (
                          <>
                            <img src={user.profileImageUrl} alt={user.name} className="member-avatar-image" />
                            <div className="edit-avatar-overlay" onClick={(e) => handleUploadTrigger(e, user)}>
                              <Camera size={14} />
                            </div>
                          </>
                        ) : (
                          <Camera size={20} className="avatar-placeholder-icon" />
                        )}
                      </div>
                    </td>
                  )}
                  <td data-label="ชื่อ">{user.name}</td>
                  <td data-label="ระดับ">{user.level}</td>
                  <td data-label="Line">{user.lineId}</td>
                  <td data-label="มือ">{user.handed}</td>
                  <td data-label="เบอร์โทร">{user.phone}</td>
                  <td data-label="อายุ">{calculateAge(user.birthDate)}</td>
                  <td data-label="ประสบการณ์">{user.experience}</td>
                  <td data-label="สถานะ">
                    <button onClick={() => toggleStatus(user)} className={`status-button ${ user.status === "มา" ? "status-มา" : "status-ไม่มา" }`}>
                      {user.status || "ไม่ระบุ"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <style jsx>{`
        /* Reset box-sizing for all elements */
        * {
          box-sizing: border-box;
          font-family: 'Kanit', sans-serif;
        }

        /* Base Layout */
        .overall-layout {
          display: block;
          width: 100%;
          min-height: 100vh;
        }

        /* Main Content Area */
        .main-content {
          flex-grow: 1;
          padding: 20px;
          padding-bottom: 50px;
          margin-left: 0;
          width: auto;
          max-width: 100%;
          background-color: var(--background-color, #f7f7f7);
        }

        .main-content h2 {
          font-size: 18px;
          margin-bottom: 10px;
          color: var(--text-color, #333);
        }

        .main-content .title-separator {
          border: 0;
          border-top: 1px solid var(--border-color, #aebdc9);
          margin-bottom: 18px;
        }

        .limit-warning-form {
          font-size: 14px;
          text-align: center;
          color: #856404;
          background-color: #fff3cd;
          border: 1px solid #ffeeba;
          padding: 12px;
          border-radius: 5px;
          margin-bottom: 20px;
        }

        /* Top Action Buttons Container */
        .action-buttons-top {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }

        .generate-excel-button {
          background-color: #57e497;
          color: black;
          padding: 10px 20px;
          border-radius: 6px;
          border: none;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: background-color 0.3s ease-in-out;
        }
        .generate-excel-button:hover {
          background-color: #3fc57b;
        }

        .reset-status-button {
            background-color: #f44336;
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            border: none;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: background-color 0.3s ease-in-out;
        }
        .reset-status-button:hover:not(:disabled) {
            background-color: #da190b;
        }
        .reset-status-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        @keyframes spinner {
          to { transform: rotate(360deg); }
        }
        .spinner {
          display: inline-block;
          width: 1em;
          height: 1em;
          vertical-align: middle;
          border: 0.15em solid currentColor;
          border-right-color: transparent;
          border-radius: 50%;
          animation: spinner 0.75s linear infinite;
        }


        .member-form-section {
          background-color: var(--card-background, #ffffff);
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
          margin-bottom: 20px;
          border: 1px solid var(--border-color, #e9e9e9);
        }

        .form-header-with-toggle {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          background-color: var(--header-background, #e9e9e9);
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
          border-bottom: 1px solid var(--border-color, #ddd);
          cursor: pointer;
          user-select: none;
          transition: background-color 0.2s ease-in-out;
        }

        .form-header-with-toggle:hover {
          background-color: var(--border-color, #dcdcdc);
        }

        .form-section-title {
          margin: 0;
          font-size: 14px;
          color: var(--text-color, #333);
        }

        .toggle-form-button {
          background: none;
          border: none;
          font-size: 20px;
          font-weight: bold;
          cursor: pointer;
          color: var(--text-color, #555);
          padding: 5px 8px;
          line-height: 1;
          transition: color 0.2s ease-in-out;
        }

        .toggle-form-button:hover {
          color: var(--text-color, #000);
        }

        .form-content-collapsible {
          overflow: hidden;
          transition: max-height 0.5s ease-out, opacity 0.5s ease-out, padding 0.5s ease-out;
          max-height: 1200px;
          opacity: 1;
          padding: 20px 15px;
        }

        .form-content-collapsible.collapsed {
          max-height: 0;
          opacity: 0;
          padding-top: 0;
          padding-bottom: 0;
        }

        .form-required-note {
          font-size: 12px;
          color: #666;
          margin-bottom: 15px;
          text-align: left;
        }

        .required-asterisk {
          color: red;
          margin-left: 5px;
          font-weight: bold;
        }

        .form-label {
          font-size: 12px;
          color: var(--text-color, #333);
          display: block;
          margin-bottom: 4px;
        }

        .modern-input {
          outline: none;
          border: 1px solid var(--input-border, #ccc);
          padding: 8px;
          font-size: 12px;
          color: var(--text-color, #333);
          width: 100%;
          border-radius: 5px;
          transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
          background-color: var(--input-background, #fff);
        }

        .modern-input:focus {
          border-color: var(--text-color, #333);
          box-shadow: 0 0 0 3px rgba(226, 226, 226, 0.2);
        }

        .form-grid-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }

        .form-buttons-container {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .submit-btn,
        .delete-btn {
          padding: 8px 20px;
          border-radius: 6px;
          border: none;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease-in-out;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          width: auto;
          min-width: 100px;
        }

        .submit-btn {
          background-color: var(--toggle-on-background, #57e497);
          color: black;
        }
        .submit-btn.edit {
          background-color: #ff9800;
        }
        .submit-btn:hover {
          background-color: var(--toggle-on-background-hover, #3fc57b);
        }
        .submit-btn.edit:hover {
          background-color: #ffa500;
        }

        .submit-btn:disabled {
          background-color: #ccc;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .delete-btn {
          background-color: #9e9e9e;
          color: white;
        }
        .delete-btn:hover {
          background-color: #757575;
        }
        .delete-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .divider-line {
          margin: 20px 0;
          border-top: 1px solid var(--border-color, #aebdc9);
        }

        .region-selection-container {
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .region-selection-container .form-label {
            margin-bottom: 0;
            flex-shrink: 0;
        }
        .region-selection-container .modern-input {
            max-width: 200px;
        }

        .search-box {
          margin-bottom: 20px;
        }
        .search-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--input-border, #ddd);
          border-radius: 5px;
          font-size: 12px;
          outline: none;
          background-color: var(--input-background, #fff);
          color: var(--text-color, #333);
        }
        .search-input:focus {
          border-color: var(--text-color, #333);
          box-shadow: 0 0 0 3px rgba(231, 231, 231, 0.2);
        }

        .table-controls-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 15px 20px;
        }

        .left-controls-wrapper,
        .right-controls-wrapper {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .left-controls-wrapper {
            align-items: flex-start;
        }

        .right-controls-wrapper {
            align-items: flex-end;
            text-align: right;
        }

        .status-summary {
            display: flex;
            gap: 20px;
            font-size: 12px;
            color: var(--text-color, #555);
        }

        .total-members-on-page-display {
            font-size: 12px;
            color: var(--text-color, #555);
        }

        .per-page-selector {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .per-page-selector label {
            font-size: 12px;
            color: var(--text-color, #555);
            white-space: nowrap;
        }

        .per-page-selector .modern-input {
            width: auto;
            min-width: 120px;
        }

        .pagination-controls {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 8px;
        }

        .pagination-button {
          padding: 8px 12px;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 5px;
          background-color: var(--input-background, #f0f0f0);
          cursor: pointer;
          font-size: 12px;
          transition: background-color 0.2s, border-color 0.2s;
          color: var(--text-color, #333);
        }

        .pagination-button:hover {
          background-color: var(--border-color, #e0e0e0);
        }

        .pagination-button.active {
          background-color: #6c757d;
          color: white;
          border-color: #6c757d;
        }

        .pagination-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background-color: var(--background-color, #f7f7f7);
        }

        .current-page-display {
            padding: 0 10px;
            font-size: 12px;
            color: var(--text-color, #555);
        }

        .user-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
          background-color: var(--card-background, #ffffff);
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 8px;
          overflow: hidden;
        }

        .user-table th,
        .user-table td {
          padding: 10px 12px;
          border-bottom: 1px solid var(--border-color, #f0f0f0);
          border-right: 1px solid var(--border-color, #f0f0f0);
          text-align: center;
          font-size: 12px;
          color: var(--text-color, #333);
        }

        .user-table th:last-child,
        .user-table td:last-child {
          border-right: none;
        }

        .user-table th {
          background-color: var(--header-background, #323943);
          color: var(--header-text, white);
          font-weight: 600;
          text-transform: none;
        }

        .sortable-header {
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            white-space: nowrap;
        }
        .sortable-header .sort-icon {
            color: #ccc;
            transition: color 0.2s;
        }
        .sortable-header:hover .sort-icon {
            color: white;
        }

        .user-table tbody tr:last-child td {
          border-bottom: none;
        }

        .user-table tbody tr:nth-child(odd) {
          background-color: var(--card-background, #ffffff);
        }
        .user-table tbody tr:nth-child(even) {
          background-color: var(--background-color-even-row, #fdfdfd);
        }

        .user-table tbody tr.selected-row {
          background-color: #e0ffe0;
        }

        .user-table tbody tr:hover:not(.selected-row) {
          background-color: var(--border-color, #f5f5f5);
        }

        .user-table td[data-label="เลือก"] {
          text-align: center;
        }

        .table-responsive-container {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 10px;
        }

        .status-button {
          padding: 5px 8px;
          border-radius: 5px;
          border: none;
          cursor: pointer;
          font-size: 11px;
          font-weight: 500;
          transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out;
          min-width: 60px;
          text-align: center;
          color: white;
        }
        .status-มา { background-color: #57e497; color: white; }
        .status-มา:hover { background-color: #3fc57b; }
        .status-ไม่มา { background-color: #f44336; color: white; }
        .status-ไม่มา:hover { background-color: #da190b; }
        .no-data-message {
          text-align: center;
          font-style: italic;
          color: var(--text-color, #888);
          padding: 20px;
          font-size: 12px;
        }
        .avatar-column-header { width: 100px; }
        .member-avatar-cell {
            display: flex; justify-content: center; align-items: center;
            width: 50px; height: 50px; border-radius: 50%;
            background-color: #f0f0f0; margin: 0 auto;
            cursor: pointer; border: 1px solid #ddd;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            position: relative;
        }
        .member-avatar-cell:hover {
            transform: scale(1.1);
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .member-avatar-image {
            width: 100%; height: 100%; object-fit: cover; border-radius: 50%;
        }
        .avatar-placeholder-icon { color: #888; }
        .edit-avatar-overlay {
            position: absolute; bottom: 0px; left: 35px;
            background-color: rgba(40, 40, 40, 0.7);
            color: white; border-radius: 50%;
            width: 20px; height: 20px;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; border: 2px solid white;
            transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
            opacity: 0; transform: scale(0.8); z-index: 1;
        }
        .member-avatar-cell:hover .edit-avatar-overlay { opacity: 1; transform: scale(1); }
        @keyframes spinner-anim { to { transform: rotate(360deg); } }
        .avatar-spinner { animation: spinner-anim 1s linear infinite; }

        @media (max-width: 768px) {
          .form-grid-container {
            grid-template-columns: repeat(2, 1fr);
          }

          .user-table {
            min-width: unset;
          }
          .user-table, .user-table thead, .user-table tbody, .user-table th, .user-table td, .user-table tr {
            display: block;
          }

          .user-table thead tr {
            position: absolute;
            top: -9999px;
            left: -9999px;
          }

          .user-table tr {
            margin-bottom: 10px;
            border: 1px solid var(--border-color, #ddd);
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }

          .user-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            border-bottom: 1px solid var(--border-color, #f0f0f0);
            position: relative;
            text-align: right;
          }
          .user-table td:before {
            content: attr(data-label);
            font-weight: bold;
            text-align: left;
            color: var(--text-color, #555);
            font-size: 12px;
            padding-right: 15px;
            white-space: nowrap;
          }
          .user-table td[data-label="รูป"] .member-avatar-cell {
              margin: 0;
          }
          .user-table td:last-child {
            border-bottom: none;
          }
          .user-table td[data-label="สถานะ"] {
              flex-grow: 0;
          }
          .user-table td[data-label="สถานะ"] .status-button {
              margin-left: auto;
          }

          .form-buttons-container {
            justify-content: center;
          }

          .table-controls-container {
              flex-direction: column;
              align-items: center;
              gap: 20px;
          }
          .left-controls-wrapper,
          .right-controls-wrapper {
              width: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 10px;
          }
          .pagination-controls,
          .status-summary,
          .per-page-selector {
              display: flex;
              justify-content: center;
              flex-wrap: wrap;
              gap: 15px;
          }
          .total-members-on-page-display {
              text-align: center;
          }
        }

        @media (max-width: 600px) {
          .main-content {
            padding: 15px;
          }

          .form-grid-container {
            grid-template-columns: 1fr;
          }

          .submit-btn,
          .delete-btn {
            width: 100%;
            min-width: unset;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;

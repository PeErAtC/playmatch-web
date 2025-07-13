// Home.js
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Swal from "sweetalert2";
// --- 1. แก้ไข Imports ---
import { db, storage } from "../lib/firebaseConfig"; // เพิ่ม storage
import {
  collection, getDocs, setDoc, doc, updateDoc, deleteDoc,
  query, where, writeBatch, limit, orderBy, startAfter, endBefore
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // เพิ่ม imports ของ storage
import * as XLSX from "xlsx";
import { ChevronUp, ChevronDown, ArrowUpDown, Camera, Loader } from 'lucide-react'; // เพิ่มไอคอน
import Head from 'next/head';
import imageCompression from 'browser-image-compression'; // เพิ่ม import สำหรับบีบอัดรูป

// Modal Component - Integrated within Home.js
const Modal = ({ show, onClose, onGenerateTemplate, onFileUpload }) => {
  if (!show) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close-button" onClick={onClose}>
          &times; {/* Cross icon */}
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
          <label htmlFor="excel-upload" className="modal-upload-label">
            เลือกไฟล์ Excel เพื่ออัปโหลด:
            <input
              id="excel-upload"
              type="file"
              onChange={onFileUpload}
              accept=".xlsx, .xls"
              className="modal-file-input"
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

        .modal-actions {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        /* Adjust download button size */
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
// End Modal Component

// --- ✨ NEW ✨ Image Preview Modal Component ---
const ImagePreviewModal = ({ show, imageUrl, onClose }) => {
  if (!show) {
    return null;
  }

  // Closes the modal if the overlay (background) is clicked
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
          z-index: 2000; /* Ensure it's on top of everything */
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
          border-radius: 50%; /* Make the image container circular */
          object-fit: cover; /* Ensure the image covers the circle without distortion */
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
// End Image Preview Modal

const Home = () => {
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [lineId, setLineId] = useState(""); // Optional
  const [handed, setHanded] = useState("Right"); // Default to Right
  const [phone, setPhone] = useState(""); // Optional
  const [birthDate, setBirthDate] = useState(new Date().toISOString().split('T')[0]); // Default to current date
  const [experience, setExperience] = useState(""); // Optional
  const [status, setStatus] = useState("ไม่มา"); // Default to ไม่มา
  const [members, setMembers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null); // Added State to store userId
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [membersPerPage, setMembersPerPage] = useState(30); // <<< *** UPDATED ***
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [isResettingStatus, setIsResettingStatus] = useState(false); // New state for reset status button

  // States for server-side pagination cursors
  const [lastVisible, setLastVisible] = useState(null);
  const [firstVisible, setFirstVisible] = useState(null);
  const [hasMoreNext, setHasMoreNext] = useState(false);
  const [hasMorePrev, setHasMorePrev] = useState(false);
  const [totalCame, setTotalCame] = useState(0);
  const [totalNotCame, setTotalNotCame] = useState(0);


  // State for sorting
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  // State for region selection
  const [selectedRegion, setSelectedRegion] = useState('northeast'); // 'northeast' or 'central'

  const memberFileInputRef = useRef(null); // Ref สำหรับ input file ที่ซ่อนไว้
  const [uploadTargetMemberId, setUploadTargetMemberId] = useState(null); // ID ของสมาชิกที่กำลังจะอัปโหลดรูป
  const [isMemberUploading, setIsMemberUploading] = useState(null); // เก็บ ID สมาชิกที่กำลังอัปโหลดเพื่อแสดง spinner

  // --- ✨ NEW ✨ State for Image Preview Modal ---
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');

  // Custom order for levels based on selected region
  const levelOrder = useMemo(() => {
    const northeastOrder = [
      "มือหน้าบ้าน", "มือหน้าบ้าน1", "มือหน้าบ้าน2", "มือหน้าบ้าน3","BG", "S-", "S", "N-", "N", "P-", "P","C"
    ];
    const centralOrder = [
      "Rookie", "BG-", "BG", "N-", "N", "S", "S+", "P-", "P", "P+", "C",
    ];
    return selectedRegion === 'northeast' ? northeastOrder : centralOrder;
  }, [selectedRegion]);


  // Helper function to calculate age from birth date (YYYY-MM-DD format)
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

  // Helper function to convert Excel date number to ISO string (YYYY-MM-DD)
  // Excel stores dates as numbers (days since 1900-01-01)
  const excelDateToISODate = (excelDateNumber) => {
    if (typeof excelDateNumber !== "number") return null;
    // Excel's epoch starts from 1900-01-01 (day 1). JavaScript's is 1970-01-01.
    // Need to adjust for 1900-02-29 bug in Excel (Excel thinks 1900 was a leap year)
    const date = new Date((excelDateNumber - (25569 + 1)) * 86400 * 1000); // 25569 is days between 1900-01-01 and 1970-01-01, plus 1 day for Excel's 1-based indexing and the 1900 leap year bug
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Function to generate Excel template file with example data
  const generateExcelTemplate = () => {
    // 1. Define column headers
    const headers = [
      "name",
      "level",
      "lineId",
      "handed",
      "phone",
      "birthDate", // Changed to birthDate
      "experience",
      "status",
    ];

    // 2. Define example data that matches headers
    const templateData = [
      {
        name: "ตัวอย่าง ชื่อ-นามสกุล",
        level: "S",
        lineId: "example_line_id",
        handed: "Right",
        phone: "0812345678",
        birthDate: "1990-05-15", // Example birth date (YYYY-MM-DD)
        experience: "2 ปี",
        status: "มา",
      },
      {
        name: "ตัวอย่าง คนที่สอง",
        level: "P-",
        lineId: "second_example",
        handed: "Left",
        phone: "0998765432",
        birthDate: "1985-11-20", // Example birth date (YYYY-MM-DD)
        experience: "5 ปี",
        status: "ไม่มา",
      },
    ];

    // 3. Create a Worksheet starting with the Header
    const ws = XLSX.utils.aoa_to_sheet([headers]);

    // 4. Add example data after the Header
    XLSX.utils.sheet_add_json(ws, templateData, {
      skipHeader: true,
      origin: -1,
      header: headers,
    });

    // 5. Adjust column width (Optional: for better readability)
    const columnWidths = [
      { wch: 20 },
      { wch: 10 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
      { wch: 18 }, // Increase width for birthDate (YYYY-MM-DD)
      { wch: 15 },
      { wch: 10 },
    ];
    ws["!cols"] = columnWidths;

    // 6. Create Workbook and write file
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "สมาชิก");
    const fileName = "members_template.xlsx";
    XLSX.writeFile(wb, fileName);
  };

  // Function to upload Excel file
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, {
          raw: false,
          defval: null,
        }); // Use raw: false for formatted dates

        try {
          if (jsonData.length === 0) {
            Swal.fire(
              "ไฟล์ Excel ว่างเปล่า",
              "ไม่พบข้อมูลในไฟล์ที่คุณอัปโหลด",
              "warning"
            );
            return;
          }

          if (!currentUserId) {
            Swal.fire("ข้อผิดพลาด", "ไม่พบ ID ผู้ใช้ในระบบ", "error");
            return;
          }

          let validationErrors = [];
          let successCount = 0;

          const batch = writeBatch(db); // Initialize batch

          for (let i = 0; i < jsonData.length; i++) {
            const member = jsonData[i];
            const rowIndex = i + 2;

            if (!member) {
              validationErrors.push(`แถวที่ ${rowIndex}: ไม่มีข้อมูล`);
              continue;
            }

            const nameTrimmed = (member.name || "").toString().trim();
            const levelTrimmed = (member.level || "").toString().trim();
            // Optional fields, use empty string if null
            const lineIdTrimmed = (member.lineId || "").toString().trim();
            const handedTrimmed = (member.handed || "Right").toString().trim(); // Default to Right
            const phoneTrimmed = (member.phone || "").toString().trim();
            let birthDateValue = new Date().toISOString().split('T')[0]; // Default to current date if not provided in Excel

            // Handle birthDate from Excel
            if (member.birthDate) {
              // If it's a number, it's likely an Excel date serial number
              if (typeof member.birthDate === "number") {
                birthDateValue = excelDateToISODate(member.birthDate);
              } else if (typeof member.birthDate === "string") {
                // If it's a string, try to parse it as YYYY-MM-DD
                const parsedDate = new Date(member.birthDate);
                if (!isNaN(parsedDate.getTime())) {
                  birthDateValue = member.birthDate; // Assume YYYY-MM-DD or parsable
                }
              }
            }

            const experienceTrimmed = (member.experience || "")
              .toString()
              .trim();
            const statusTrimmed = (member.status || "ไม่มา").toString().trim(); // Default to ไม่มา

            const newUser = {
              name: nameTrimmed,
              level: levelTrimmed,
              lineId: lineIdTrimmed,
              handed: handedTrimmed,
              phone: phoneTrimmed,
              birthDate: birthDateValue, // Store birthDate
              experience: experienceTrimmed,
              status: statusTrimmed,
              createBy: loggedInUsername,
            };

            let rowErrors = [];
            if (!newUser.name) rowErrors.push("ชื่อ");
            if (!newUser.level) rowErrors.push("ระดับ");
            // Removed validation for optional fields: lineId, handed, phone, birthDate, experience, status

            if (rowErrors.length > 0) {
              validationErrors.push(
                `แถวที่ ${rowIndex}: ข้อมูลไม่ครบถ้วนในช่อง: ${rowErrors.join(
                  ", "
                )}`
              );
              continue;
            }

            // Use Firestore's auto-generated ID for new documents to avoid extra reads
            const newMemberRef = doc(collection(db, `users/${currentUserId}/Members`));
            const memberId = newMemberRef.id; // Get the auto-generated ID

            // Add the operation to the batch
            batch.set(newMemberRef, {
                ...newUser,
                memberId, // Store the auto-generated ID
                createdAt: new Date(),
            });
            successCount++;
          }

          // Commit the batch operation outside the loop
          if (successCount > 0) {
            await batch.commit(); // Commit all pending writes
            Swal.fire(
              "สำเร็จ!",
              `เพิ่มข้อมูลสมาชิกจาก Excel สำเร็จ ${successCount} คน!`,
              "success"
            );
            setShowModal(false);
            setCurrentPage(1); // Reset to first page after bulk upload
            fetchMembers('current', null); // Re-fetch members to update the UI
          }

          if (validationErrors.length > 0) {
            Swal.fire(
              "มีข้อผิดพลาดบางอย่าง",
              "พบข้อผิดพลาดในการนำเข้าข้อมูลบางส่วน:\n" +
                validationErrors.join("\n"),
              "warning"
            );
          } else if (successCount === 0) {
            Swal.fire(
              "ไม่พบข้อมูลที่ถูกต้อง",
              "ไม่มีข้อมูลสมาชิกที่สามารถเพิ่มได้จากไฟล์ Excel",
              "warning"
            );
          }
        } catch (error) {
          console.error("Error uploading Excel file:", error);
          Swal.fire(
            "เกิดข้อผิดพลาดในการอัปโหลดไฟล์ Excel",
            error.message,
            "error"
          );
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Swal.fire(
        "กรุณาอัปโหลดไฟล์ Excel เท่านั้น",
        "ไฟล์ที่รองรับคือ .xlsx และ .xls",
        "warning"
      );
    }
  };

  // Fetch Username and UserId when Component mounts
  const fetchUserData = async () => {
    const email = localStorage.getItem("loggedInEmail");
    if (email) {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docSnapshot = querySnapshot.docs[0];
          setLoggedInUsername(docSnapshot.data().username);
          setCurrentUserId(docSnapshot.id); // Store userId in State
        } else {
          console.warn("User data not found for email:", email);
        }
      } catch (error) {
        console.error("Error fetching user data: ", error);
      }
    }
  };

  // Centralized fetch function for paginated and sorted data
  const fetchMembers = useCallback(async (direction = 'current', cursor = null) => {
    if (!currentUserId) {
        setMembers([]);
        setFirstVisible(null);
        setLastVisible(null);
        setHasMoreNext(false);
        setHasMorePrev(false);
        return;
    }

    try {
        const membersRef = collection(db, `users/${currentUserId}/Members`);
        let baseQuery = membersRef;

        let appliedOrderByKey = sortConfig.key || 'createdAt'; // Default sort key for pagination
        let appliedOrderByDirection = sortConfig.direction === 'descending' ? 'desc' : 'asc';

        // Apply search filter if present (Firestore prefix search)
        if (search) {
            baseQuery = query(
                baseQuery,
                where('name', '>=', search),
                where('name', '<=', search + '\uf8ff') // \uf8ff is a high-value Unicode character
            );
            // When searching, sort by 'name' to make prefix search effective.
            // If the user then clicks another sort header, it will re-fetch based on that sort.
            appliedOrderByKey = 'name';
            appliedOrderByDirection = sortConfig.direction === 'descending' ? 'desc' : 'asc';
        }

        let q;
        if (direction === 'next' && cursor) {
            q = query(baseQuery, orderBy(appliedOrderByKey, appliedOrderByDirection), startAfter(cursor), limit(membersPerPage));
        } else if (direction === 'prev' && cursor) {
            // To go back, we order by the opposite direction, then startAfter the current first document
            // and then reverse the results after fetching.
            q = query(baseQuery, orderBy(appliedOrderByKey, appliedOrderByDirection === 'asc' ? 'desc' : 'asc'), startAfter(cursor), limit(membersPerPage));
        } else { // 'current' or initial load, or when sort/search changes
            q = query(baseQuery, orderBy(appliedOrderByKey, appliedOrderByDirection), limit(membersPerPage));
        }

        const documentSnapshots = await getDocs(q);
        let fetchedMembers = documentSnapshots.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // If going backwards, reverse the fetched results to maintain correct order
        if (direction === 'prev') {
            fetchedMembers = fetchedMembers.reverse();
        }

        // Client-side sorting for 'level' and 'birthDate' if they are the primary sort key
        // This is necessary because Firestore cannot directly sort by custom string order (e.g., C, P-, P)
        // or calculated values like age. We fetch the paginated batch and then sort it in memory.
        if (sortConfig.key === 'level') {
            fetchedMembers.sort((a, b) => {
                const aIndex = levelOrder.indexOf(a.level);
                const bIndex = levelOrder.indexOf(b.level);
                // Handle cases where level might not be in levelOrder
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
                // Handle null ages
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

            // Check if there are more documents after the last one
            const nextDocsQuery = query(
                baseQuery, // Use baseQuery to include search filters
                orderBy(appliedOrderByKey, appliedOrderByDirection),
                startAfter(documentSnapshots.docs[documentSnapshots.docs.length - 1]),
                limit(1) // Just fetch one to check existence
            );
            const nextDocsSnapshot = await getDocs(nextDocsQuery);
            setHasMoreNext(!nextDocsSnapshot.empty);

            // Check if there are documents before the first one
            const prevDocsQuery = query(
                baseQuery, // Use baseQuery to include search filters
                orderBy(appliedOrderByKey, appliedOrderByDirection === 'asc' ? 'desc' : 'asc'), // Reverse order for checking previous
                startAfter(documentSnapshots.docs[0]), // Start after the current first document
                limit(1) // Just fetch one to check existence
            );
            const prevDocsSnapshot = await getDocs(prevDocsQuery);
            setHasMorePrev(!prevDocsSnapshot.empty);

        } else {
            setFirstVisible(null);
            setLastVisible(null);
            setHasMoreNext(false);
            setHasMorePrev(false);
        }

    } catch (error) {
        console.error("Error fetching paginated members:", error);
        Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถดึงข้อมูลสมาชิกได้: " + error.message, "error");
        setMembers([]);
        setFirstVisible(null);
        setLastVisible(null);
        setHasMoreNext(false);
        setHasMorePrev(false);
    }
  }, [currentUserId, membersPerPage, sortConfig, levelOrder, search]); // <<< *** UPDATED ***

useEffect(() => {
    fetchUserData(); // Fetch username and userId on first component load
}, []);

// Call fetchMembers when currentUserId, sortConfig, search, or selectedRegion changes
useEffect(() => {
    if (currentUserId) {
        // When currentUserId, sortConfig, search, or selectedRegion changes, reset pagination and fetch first page
        setCurrentPage(1); // Always go to page 1 for new sort/search/region
        fetchMembers('current', null);
    }
}, [currentUserId, fetchMembers, sortConfig, search, selectedRegion]); // Add selectedRegion here

  const handleSelectUser = (user) => {
    if (selectedUser && selectedUser.memberId === user.memberId) {
      setSelectedUser(null);
      clearForm();
      setIsEditing(false);
    } else {
      setSelectedUser(user);
      setName(user.name);
      setLevel(user.level);
      setLineId(user.lineId || ""); // Ensure lineId is string for optional field
      setHanded(user.handed || "Right"); // Default to Right if null/undefined
      setPhone(user.phone || ""); // Ensure phone is string for optional field
      setBirthDate(user.birthDate || new Date().toISOString().split('T')[0]); // Default to current date if null
      setExperience(user.experience || ""); // Ensure experience is string for optional field
      setStatus(user.status || "ไม่มา"); // Default to ไม่มา if null/undefined
      setIsEditing(true);
      setIsFormExpanded(true); // Expand form when selecting a user
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Only 'name' and 'level' are required now
    if (
      !name ||
      !level
    ) {
      Swal.fire("กรุณากรอกข้อมูล 'ชื่อ' และ 'ระดับ' ให้ครบถ้วน", "", "warning");
      return;
    }

    // Validate birthDate format (YYYY-MM-DD) only if a value exists (it will always exist now due to default)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthDate)) {
      Swal.fire(
        "รูปแบบวันเดือนปีเกิดไม่ถูกต้อง",
        "กรุณาเลือกวันเดือนปีเกิดในรูปแบบ YYYY-MM-DD (เช่น 1990-01-01)",
        "warning"
      );
      return;
    }
    const parsedDate = new Date(birthDate);
    if (isNaN(parsedDate.getTime())) {
      Swal.fire(
        "วันเดือนปีเกิดไม่ถูกต้อง",
        "กรุณาเลือกวันเดือนปีเกิดที่ถูกต้อง",
        "warning"
      );
      return;
    }

    const newUser = {
      name,
      level,
      lineId: lineId || "", // Save as empty string if not provided
      handed: handed || "Right", // Save with default if user clears it somehow
      phone: phone || "", // Save as empty string if not provided
      birthDate: birthDate || new Date().toISOString().split('T')[0], // Use default if for some reason it's cleared
      experience: experience || "", // Save as empty string if not provided
      status: status || "ไม่มา", // Use default if user clears it somehow
      createBy: loggedInUsername,
    };

    try {
      if (!currentUserId) {
        Swal.fire("ข้อผิดพลาด", "ไม่พบ ID ผู้ใช้ในระบบ", "error");
        return;
      }

      if (isEditing && selectedUser) {
        const memberRef = doc(
          db,
          `users/${currentUserId}/Members/${selectedUser.memberId}`
        );
        await updateDoc(memberRef, { ...newUser, updatedAt: new Date() });
        Swal.fire("สำเร็จ!", "แก้ไขข้อมูลสมาชิกสำเร็จ!", "success");
      } else {
        // Use Firestore's auto-generated ID for new documents
        const newMemberRef = doc(collection(db, `users/${currentUserId}/Members`));
        const memberId = newMemberRef.id;

        await setDoc(newMemberRef, {
          ...newUser,
          memberId, // Store the auto-generated ID
          createdAt: new Date(),
        });
        Swal.fire("สำเร็จ!", "เพิ่มสมาชิกสำเร็จ!", "success");
      }

      clearForm();
      setCurrentPage(1); // Reset to first page after add/edit
      fetchMembers('current', null); // Re-fetch the first page of members
    } catch (error) {
      Swal.fire("เกิดข้อผิดพลาด", error.message, "error");
    }
  };

  const handleDelete = async () => {
    if (selectedUser) {
      const result = await Swal.fire({
        title: `ลบสมาชิก ${selectedUser.name}?`,
        text: "คุณต้องการลบสมาชิกนี้จริงหรือไม่?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "ลบ",
        cancelButtonText: "ยกเลิก",
      });

      if (!result.isConfirmed) return;

      try {
        if (!currentUserId) {
          Swal.fire("ข้อผิดพลาด", "ไม่พบ ID ผู้ใช้ในระบบ", "error");
          return;
        }

        const memberRef = doc(
          db,
          `users/${currentUserId}/Members/${selectedUser.memberId}`
        );
        await deleteDoc(memberRef);
        Swal.fire("ลบสำเร็จ!", "", "success");

        clearForm();
        setCurrentPage(1); // Reset to first page after delete
        fetchMembers('current', null); // Re-fetch the first page of members
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

      const memberRef = doc(
        db,
        `users/${currentUserId}/Members/${user.memberId}`
      );
      await updateDoc(memberRef, { status: newStatus });

      // อัปเดต State 'members' โดยตรงเพื่อสะท้อนการเปลี่ยนแปลงสถานะ
      setMembers(prevMembers =>
        prevMembers.map(member =>
          member.memberId === user.memberId
            ? { ...member, status: newStatus } // อัปเดตสถานะของสมาชิกคนนี้
            : member // สมาชิกคนอื่นยังคงเดิม
        )
      );

      // ไม่จำเป็นต้องเรียก fetchMembers อีกครั้ง
      // เพราะเราได้อัปเดตข้อมูลใน UI โดยตรงแล้ว
    } catch (error) {
      Swal.fire("เกิดข้อผิดพลาดในการอัปเดตสถานะ", error.message, "error");
    }
  };

  // Function to reset all member statuses to "ไม่มา"
  const handleResetAllStatus = async () => {
    const result = await Swal.fire({
      title: "รีเซ็ตสถานะทั้งหมด?",
      text: "คุณต้องการรีเซ็ตสถานะของสมาชิกทุกคนให้เป็น 'ไม่มา' ใช่หรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "รีเซ็ต",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d33", // Red color for danger action
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
      // To reset all status, we still need to read all members to update them.
      // For very large collections, this operation would be costly in terms of reads and writes.
      // A Cloud Function triggered by a manual event would be more scalable for this.
      // For now, we'll fetch all members and update in a batch.
      // If this operation is frequent with huge datasets, consider a Cloud Function.
      const membersSnapshot = await getDocs(membersRef); 

      membersSnapshot.docs.forEach((memberDoc) => {
        const memberRef = doc(db, `users/${currentUserId}/Members`, memberDoc.id);
        batch.update(memberRef, { status: "ไม่มา" });
      });

      await batch.commit(); // Commit all updates in a single batch
      Swal.fire("สำเร็จ!", "รีเซ็ตสถานะสมาชิกทั้งหมดเป็น 'ไม่มา' สำเร็จ!", "success");
      fetchMembers('current', null); // Re-fetch first page to update UI
    } catch (error) {
      console.error("Error resetting all statuses:", error);
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถรีเซ็ตสถานะได้: " + error.message, "error");
    } finally {
      setIsResettingStatus(false);
    }
  };

  const clearForm = () => {
    setName("");
    setLevel("");
    setLineId("");
    setHanded("Right"); // Set default
    setPhone("");
    setBirthDate(new Date().toISOString().split('T')[0]); // Set default
    setStatus("ไม่มา"); // Set default
    setExperience("");
    setSelectedUser(null);
    setIsEditing(false);
  };

  // Function to toggle form expansion
  const toggleFormExpansion = () => {
    setIsFormExpanded((prev) => !prev);
  };

  // Function to handle sorting requests
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page on sort change
  };

  // Function to get sorting icon
  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      // If this column is currently sorted
      if (sortConfig.direction === 'ascending') {
        return <ChevronUp size={16} className="sort-icon" />;
      } else {
        return <ChevronDown size={16} className="sort-icon" />;
      }
    }
    // If this column is not currently sorted, show the combined icon
    return <ArrowUpDown size={16} className="sort-icon" />;
  };

  // Pagination handlers for next/previous buttons
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

  // --- ✨ FIXED & RE-IMPLEMENTED ✨ ---
  // Function to handle clicking the avatar: shows modal or triggers upload if no image.
  const handleAvatarClick = (user) => {
    if (user.profileImageUrl) {
      // If image exists, show the preview modal.
      setModalImageUrl(user.profileImageUrl);
      setShowImageModal(true);
    } else {
      // If no image, clicking the main area triggers an upload.
      setUploadTargetMemberId(user.memberId);
      if (memberFileInputRef.current) {
        memberFileInputRef.current.click();
      }
    }
  };

  // Function to trigger image upload, typically from an overlay button.
  const handleUploadTrigger = (event, user) => {
    event.stopPropagation(); // Prevents the modal from opening when clicking the upload icon.
    setUploadTargetMemberId(user.memberId);
    if (memberFileInputRef.current) {
      memberFileInputRef.current.click();
    }
  };

  // This function runs when a user selects an image file
  const handleMemberImageUpload = async (event) => {
    const imageFile = event.target.files[0];
    if (!imageFile || !uploadTargetMemberId || !currentUserId) {
      return;
    }

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 800,
      useWebWorker: true,
    };

    try {
      setIsMemberUploading(uploadTargetMemberId); // Show spinner on the member's row

      const compressedFile = await imageCompression(imageFile, options);

      // Create a storage path for the member's image, organized by admin (currentUserId) and memberId
      const storagePath = `member_profiles/${currentUserId}/${uploadTargetMemberId}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, compressedFile);
      const downloadURL = await getDownloadURL(storageRef);

      // Update the image URL in the member's Firestore document
      const memberDocRef = doc(db, `users/${currentUserId}/Members/${uploadTargetMemberId}`);
      await updateDoc(memberDocRef, {
        profileImageUrl: downloadURL,
      });

      // Update the 'members' state directly to show the new image immediately without a full reload
      setMembers(prevMembers =>
        prevMembers.map(member =>
          member.memberId === uploadTargetMemberId
            ? { ...member, profileImageUrl: downloadURL }
            : member
        )
      );

    } catch (error) {
      console.error("Error uploading member image:", error);
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถอัปโหลดรูปภาพได้", "error");
    } finally {
      setIsMemberUploading(null); // Stop showing the spinner
      // Reset the file input so the same file can be chosen again if needed
      if (memberFileInputRef.current) {
        memberFileInputRef.current.value = "";
      }
      setUploadTargetMemberId(null); // Clear the upload target
    }
  };


  return (
    <div className="overall-layout">
    <Head>
      <title>หน้าหลัก PlayMatch - จัดการสมาชิกก๊วนแบดมินตัน</title> {/* เพิ่ม Title ที่นี่ */}
      <meta name="description" content="จัดการข้อมูลสมาชิกก๊วนแบดมินตันของคุณได้อย่างง่ายดาย เพิ่ม, แก้ไข, ลบ, ค้นหา, จัดเรียง และนำเข้า/ส่งออกข้อมูลสมาชิกด้วย PlayMatch." /> {/* เพิ่ม Description ที่นี่ */}
    </Head>
      <main className="main-content">
        <h2>สมาชิก</h2>
        <hr className="title-separator" /> {/* Changed hr to use common class for consistency */}

        {/* --- ✨ NEW ✨ Add the Image Preview Modal here --- */}
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

        <div className="action-buttons-top"> {/* New container for action buttons */}
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
                <>
                    <span className="spinner"></span> กำลังรีเซ็ต...
                </>
            ) : (
                "รีเซ็ตสถานะทั้งหมด"
            )}
          </button>
        </div>


        <Modal
          show={showModal}
          onClose={() => setShowModal(false)}
          onGenerateTemplate={generateExcelTemplate}
          onFileUpload={handleFileUpload}
        />

        {/* Container for the Form Section (Header + Collapsible Content) */}
        <div className="member-form-section">
          <div className="form-header-with-toggle" onClick={toggleFormExpansion}> {/* Added onClick to header */}
            <h3 className="form-section-title">กรอกข้อมูลสมาชิก</h3>
            <button
              className="toggle-form-button"
              aria-expanded={isFormExpanded}
            >
              {isFormExpanded ? "-" : "+"}
            </button>
          </div>

          <div
            className={`form-content-collapsible ${
              isFormExpanded ? "expanded" : "collapsed"
            }`}
          >
            {/* Note for required fields */}
            <p className="form-required-note">ช่องที่มีเครื่องหมาย <span className="required-asterisk">*</span> จำเป็นต้องกรอก</p>

            <form onSubmit={handleSubmit} className="form-box" noValidate>
              <div className="form-grid-container">
                <div>
                  <label className="form-label">ชื่อ<span className="required-asterisk">*</span></label>
                  <input
                    className="modern-input"
                    type="text"
                    placeholder="ชื่อ"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Line</label>
                  <input
                    className="modern-input"
                    type="text"
                    placeholder="Line"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">เบอร์โทร</label>
                  <input
                    className="modern-input"
                    type="text"
                    placeholder="เบอร์โทร"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength="10"
                  />
                </div>
                <div>
                  <label className="form-label">วันเดือนปีเกิด</label>{" "}
                  <input
                    className="modern-input"
                    type="date" // Use type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">ระดับ<span className="required-asterisk">*</span></label>
                  <select
                    className="modern-input"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                  >
                    <option value="">เลือกระดับ</option>
                    {levelOrder.map(lvl => ( // Use levelOrder to populate options
                        <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">ประสบการณ์</label>
                  <select
                    className="modern-input"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                  >
                    <option value="">ประสบการณ์</option>
                    <option value="น้อยกว่า 1 ปี">น้อยกว่า 1 ปี</option>
                    {[...Array(10)].map((_, i) => (
                      <option key={i + 1} value={`${i + 1} ปี`}>
                        {i + 1} ปี
                      </option>
                    ))}
                    <option value=">10 ปี">มากกว่า 10 ปี</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">เลือกมือที่ถนัด</label>
                  <select
                    className="modern-input"
                    value={handed}
                    onChange={(e) => setHanded(e.target.value)}
                  >
                    {/* Default value is "Right" now */}
                    <option value="Right">ขวา</option>
                    <option value="Left">ซ้าย</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">สถานะ</label>
                  <select
                    className="modern-input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {/* Default value is "ไม่มา" now */}
                    <option value="มา">มา</option>
                    <option value="ไม่มา">ไม่มา</option>
                  </select>
                </div>
              </div>

              <div className="form-buttons-container">
                <button
                  type="submit"
                  className={`submit-btn ${isEditing ? "edit" : ""}`}
                >
                  {isEditing ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้"}
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!selectedUser}
                  className="delete-btn"
                >
                  ลบ
                </button>
              </div>
            </form>
          </div>
        </div>

        <hr className="divider-line" />

        {/* Region Selection */}
        <div className="region-selection-container">
          <label className="form-label">ลำดับระดับมือ:</label>
          <select
            className="modern-input"
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
          >
            <option value="northeast">ภาคอีสาน</option>
            <option value="central">ภาคกลาง</option>
          </select>
        </div>

        <div className="search-box">
          <input
            type="text"
            className="modern-input search-input"
            placeholder="ค้นหาผู้ใช้"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="total-members-display" style={{ textAlign: "right" }}>
          <div style={{ marginBottom: "6px" }}>
            จำนวนสมาชิกในหน้านี้: {members.length}
          </div>
          <div style={{ display: "inline-flex", gap: "20px" }}>
            <span style={{ color: "#4caf50" }}>มาแล้ว: {totalCame} คน</span>
            <span style={{ color: "#f44336" }}>ยังไม่มา: {totalNotCame} คน</span>
          </div>
        </div>

        {/* <<< *** MODIFIED UI: Swapped pagination and per-page controls *** >>> */}
        <div className="table-controls-container">
          <div className="pagination-controls">
            <button
              onClick={goToPrevPage}
              className="pagination-button"
              disabled={!hasMorePrev}
            >
              ย้อนกลับ
            </button>
            <span className="current-page-display">หน้า {currentPage}</span>
            <button
              onClick={goToNextPage}
              className="pagination-button"
              disabled={!hasMoreNext}
            >
              ถัดไป
            </button>
          </div>
          <div className="per-page-selector">
            <label htmlFor="members-per-page">แสดง:</label>
            <select
              id="members-per-page"
              className="modern-input"
              value={membersPerPage}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                setMembersPerPage(newSize);
                setCurrentPage(1); // กลับไปหน้า 1 เสมอเมื่อเปลี่ยนจำนวนแสดงผล
              }}
            >
              <option value="10">10 รายชื่อ</option>
              <option value="20">20 รายชื่อ</option>
              <option value="30">30 รายชื่อ</option>
              <option value="50">50 รายชื่อ</option>
            </select>
          </div>
        </div>


        <div className="table-responsive-container">
          <table className="user-table">
            <thead>
              <tr>
                <th>เลือก</th>
                <th className="avatar-column-header">รูป</th>
                <th>ชื่อ</th>
                <th onClick={() => requestSort('level')} className="sortable-header"> {/* Clickable header for sorting */}
                    ระดับ {getSortIcon('level')}
                </th>
                <th>Line</th>
                <th>มือ</th>
                <th>เบอร์โทร</th>
                <th onClick={() => requestSort('birthDate')} className="sortable-header">
                  อายุ {getSortIcon('birthDate')}
                </th>
                <th>ประสบการณ์</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 && !search && (
                <tr>
                  <td colSpan="10" className="no-data-message">
                    ไม่พบข้อมูลสมาชิก กรุณาเพิ่มสมาชิกใหม่
                  </td>
                </tr>
              )}
              {members.length === 0 && search && (
                <tr>
                  <td colSpan="10" className="no-data-message">
                    ไม่พบข้อมูลสมาชิกที่ค้นหา
                  </td>
                </tr>
              )}
              {members.map((user) => (
                <tr
                  key={user.memberId}
                  className={
                    selectedUser?.memberId === user.memberId
                      ? "selected-row"
                      : ""
                  }
                >
                  <td data-label="เลือก">
                    <input
                      type="checkbox"
                      checked={selectedUser?.memberId === user.memberId}
                      onChange={() => handleSelectUser(user)}
                    />
                  </td>
                  <td data-label="รูป">
                    {/* --- ✨ FIXED & RE-IMPLEMENTED as per user request --- */}
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
                  <td data-label="ชื่อ">{user.name}</td>
                  <td data-label="ระดับ">{user.level}</td>
                  <td data-label="Line">{user.lineId}</td>
                  <td data-label="มือ">{user.handed}</td>
                  <td data-label="เบอร์โทร">{user.phone}</td>
                  <td data-label="อายุ">{calculateAge(user.birthDate)}</td>
                  <td data-label="ประสบการณ์">{user.experience}</td>
                  <td data-label="สถานะ">
                    <button
                      onClick={() => toggleStatus(user)}
                      className={`status-button ${
                        user.status === "มา" ? "status-มา" : "status-ไม่มา"
                      }`}
                    >
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
          font-family: 'Kanit', sans-serif; /* Apply Kanit font globally within this component */
        }

        /* Base Layout */
        .overall-layout {
          display: block;
          width: 100%; /* Ensure it spans the full width */
          min-height: 100vh; /* Ensure it takes full viewport height */
        }

        /* Main Content Area */
        .main-content {
          flex-grow: 1; /* This is the key: makes it fill remaining space */
          padding: 20px; /* Adjust as needed */
          padding-bottom: 50px;
          margin-left: 0; /* Ensure no leftover margin from where sidebar used to be */
          width: auto; /* Reset any fixed width */
          max-width: 100%; /* Ensure it doesn't exceed 100% of parent */
          background-color: var(--background-color, #f7f7f7); /* Use theme variable */
        }

        .main-content h2 {
          font-size: 18px;
          margin-bottom: 10px;
          color: var(--text-color, #333); /* Use theme variable */
        }

        .main-content .title-separator { /* Use the common class */
          border: 0;
          border-top: 1px solid var(--border-color, #aebdc9); /* Use theme variable */
          margin-bottom: 18px;
        }

        /* Top Action Buttons Container */
        .action-buttons-top {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap; /* Allow buttons to wrap on smaller screens */
        }

        /* Excel Button Container (repurposed from .excel-button-container) */
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

        /* Reset Status Button */
        .reset-status-button {
            background-color: #f44336; /* Red color for warning/danger */
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

        /* Spinner for loading buttons */
        @keyframes spinner {
          to {
            transform: rotate(360deg);
          }
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


        /* Container for the Form Section (Header + Collapsible Content) */
        .member-form-section {
          background-color: var(--card-background, #ffffff); /* Use theme variable */
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
          margin-bottom: 20px;
          border: 1px solid var(--border-color, #e9e9e9); /* Use theme variable */
        }

        /* Header for the collapsible form */
        .form-header-with-toggle {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          background-color: var(--header-background, #e9e9e9); /* Use theme variable */
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
          border-bottom: 1px solid var(--border-color, #ddd); /* Use theme variable */
          cursor: pointer;
          user-select: none;
          transition: background-color 0.2s ease-in-out;
        }

        .form-header-with-toggle:hover {
          background-color: var(--border-color, #dcdcdc); /* Use theme variable */
        }

        .form-section-title {
          margin: 0;
          font-size: 14px;
          color: var(--text-color, #333); /* Use theme variable */
        }

        .toggle-form-button {
          background: none;
          border: none;
          font-size: 20px;
          font-weight: bold;
          cursor: pointer;
          color: var(--text-color, #555); /* Use theme variable */
          padding: 5px 8px;
          line-height: 1;
          transition: color 0.2s ease-in-out;
        }

        .toggle-form-button:hover {
          color: var(--text-color, #000); /* Use theme variable */
        }

        /* Collapsible content for the form */
        .form-content-collapsible {
          overflow: hidden;
          transition: max-height 0.5s ease-out, opacity 0.5s ease-out,
            padding 0.5s ease-out;
          max-height: 500px; /* Adjust if your form is taller! */
          opacity: 1;
          padding: 20px 15px;
        }

        .form-content-collapsible.collapsed {
          max-height: 0;
          opacity: 0;
          padding-top: 0;
          padding-bottom: 0;
        }

        /* Note for required fields */
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


        /* Original Form Styles (from image_f08aa0.png) */
        .form-label {
          font-size: 12px; /* Adjusted font size */
          color: var(--text-color, #333); /* Use theme variable */
          display: block;
          margin-bottom: 4px;
        }

        .modern-input {
          outline: none;
          border: 1px solid var(--input-border, #ccc); /* Use theme variable */
          padding: 8px;
          font-size: 12px; /* Adjusted font size */
          color: var(--text-color, #333); /* Use theme variable */
          width: 100%;
          border-radius: 5px;
          transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
          background-color: var(--input-background, #fff); /* Use theme variable */
        }

        .modern-input:focus {
          border-color: var(--text-color, #333); /* Use theme variable */
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
          font-size: 12px; /* Adjusted font size */
          cursor: pointer;
          transition: all 0.3s ease-in-out;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          width: auto;
          min-width: 100px;
        }

        .submit-btn {
          background-color: var(--toggle-on-background, #57e497); /* Use theme variable */
          color: black;
        }
        .submit-btn.edit {
          background-color: #ff9800;
        }
        .submit-btn:hover {
          background-color: var(--toggle-on-background-hover, #3fc57b); /* Use theme variable (or define specific hover) */
        }
        .submit-btn.edit:hover {
          background-color: #ffa500;
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
          border-top: 1px solid var(--border-color, #aebdc9); /* Use theme variable */
        }

        /* Region Selection Container */
        .region-selection-container {
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .region-selection-container .form-label {
            margin-bottom: 0; /* Override default label margin */
            flex-shrink: 0; /* Prevent label from shrinking */
        }
        .region-selection-container .modern-input {
            max-width: 200px; /* Limit width of the select box */
        }

        /* Search box style */
        .search-box {
          margin-bottom: 20px;
        }
        .search-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--input-border, #ddd); /* Use theme variable */
          border-radius: 5px;
          font-size: 12px; /* Adjusted font size */
          outline: none;
          background-color: var(--input-background, #fff); /* Use theme variable */
          color: var(--text-color, #333); /* Use theme variable */
        }
        .search-input:focus {
          border-color: var(--text-color, #333); /* Use theme variable */
          box-shadow: 0 0 0 3px rgba(231, 231, 231, 0.2);
        }

        /* Total Members Display */
        .total-members-display {
          text-align: right;
          margin-bottom: 15px;
          font-size: 12px; /* Adjusted font size */
          color: var(--text-color, #555); /* Use theme variable */
        }

        /* <<< *** NEW CSS *** >>> */
        .table-controls-container {
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
            color: var(--text-color, #555);
            white-space: nowrap;
        }

        .per-page-selector .modern-input {
            width: auto; 
            min-width: 120px;
        }

        /* Pagination Controls */
        .pagination-controls {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 8px;
        }

        .pagination-button {
          padding: 8px 12px;
          border: 1px solid var(--border-color, #ddd); /* Use theme variable */
          border-radius: 5px;
          background-color: var(--input-background, #f0f0f0); /* Use theme variable */
          cursor: pointer;
          font-size: 12px; /* Adjusted font size */
          transition: background-color 0.2s, border-color 0.2s;
          color: var(--text-color, #333); /* Use theme variable */
        }

        .pagination-button:hover {
          background-color: var(--border-color, #e0e0e0); /* Use theme variable */
        }

        .pagination-button.active {
          background-color: #6c757d;
          color: white; /* Changed to white for better contrast */
          border-color: #6c757d;
        }

        .pagination-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background-color: var(--background-color, #f7f7f7); /* Use theme variable */
        }

        .current-page-display {
            padding: 0 10px;
            font-size: 12px;
            color: var(--text-color, #555);
        }

        /* Table Styles */
        .user-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px; /* Keep minimum width for desktop view */
          background-color: var(--card-background, #ffffff); /* Use theme variable */
          border: 1px solid var(--border-color, #e0e0e0); /* Use theme variable */
          border-radius: 8px;
          overflow: hidden;
        }

        .user-table th,
        .user-table td {
          padding: 10px 12px; /* Slightly reduced padding */
          border-bottom: 1px solid var(--border-color, #f0f0f0); /* Use theme variable */
          border-right: 1px solid var(--border-color, #f0f0f0); /* Use theme variable */
          text-align: center; /* ALIGN TEXT TO CENTER */
          font-size: 12px; /* Adjusted font size */
          color: var(--text-color, #333); /* Use theme variable */
        }

        /* Remove right border for the last column in header and body */
        .user-table th:last-child,
        .user-table td:last-child {
          border-right: none;
        }

        .user-table th {
          background-color: var(--header-background, #323943); /* Use theme variable */
          color: var(--header-text, white); /* Use theme variable */
          font-weight: 600;
          text-transform: none;
        }

        /* Sortable Header Styles */
        .sortable-header {
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center; /* Center content */
            gap: 5px; /* Space between text and icon */
            white-space: nowrap; /* Prevent text and icon from wrapping */
        }
        .sortable-header .sort-icon {
            color: #ccc; /* Default icon color */
            transition: color 0.2s;
        }
        .sortable-header:hover .sort-icon {
            color: white; /* Highlight on hover */
        }

        /* Remove bottom border for the last row */
        .user-table tbody tr:last-child td {
          border-bottom: none;
        }

        /* Row Highlighting and Stripes */
        .user-table tbody tr:nth-child(odd) {
          background-color: var(--card-background, #ffffff); /* Use theme variable */
        }
        .user-table tbody tr:nth-child(even) {
          background-color: var(--background-color-even-row, #fdfdfd); /* Can define new for even rows */
        }

        /* Selected row background */
        .user-table tbody tr.selected-row {
          background-color: #e0ffe0;
        }

        /* Hover effect */
        .user-table tbody tr:hover:not(.selected-row) {
          background-color: var(--border-color, #f5f5f5); /* Use theme variable */
        }

        /* Checkbox Column */
        .user-table td[data-label="เลือก"] {
          text-align: center;
        }

        /* Add this to your <style jsx> block */
        .table-responsive-container {
          overflow-x: auto; /* Adds horizontal scroll if content overflows */
          -webkit-overflow-scrolling: touch; /* Improves scrolling on iOS */
          padding-bottom: 10px; /* Gives some space for the scrollbar */
        }

        /* Status Button */
        .status-button {
          padding: 5px 8px; /* Adjusted padding */
          border-radius: 5px;
          border: none;
          cursor: pointer;
          font-size: 11px; /* Slightly smaller for button text */
          font-weight: 500;
          transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out;
          min-width: 60px; /* Adjusted min-width */
          text-align: center;
          color: white;
        }

        .status-มา {
          background-color: #57e497;
          color: white;
        }

        .status-มา:hover {
          background-color: #3fc57b;
        }

        .status-ไม่มา {
          background-color: #f44336;
          color: white;
        }

        .status-ไม่มา:hover {
          background-color: #da190b;
        }

        .no-data-message {
          text-align: center;
          font-style: italic;
          color: var(--text-color, #888); /* Use theme variable */
          padding: 20px;
          font-size: 12px; /* Adjusted font size */
        }

        .avatar-column-header {
            width: 100px; /* กำหนดความกว้างคอลัมน์รูปภาพ */
        }

        .member-avatar-cell {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background-color: #f0f0f0;
            margin: 0 auto;
            cursor: pointer;
            /* overflow: hidden; --- REMOVED this line to fix clipping issue --- */
            border: 1px solid #ddd;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            position: relative; 
        }

        .member-avatar-cell:hover {
            transform: scale(1.1);
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .member-avatar-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%; /* Ensure image itself is circular */
        }

        .avatar-placeholder-icon {
            color: #888;
        }

        /* --- ✨ UPDATED CSS for Edit Overlay ✨ --- */
        .edit-avatar-overlay {
            position: absolute;
            bottom: 0px;  /* ADJUSTED position */
            left: 35px;   /* ADJUSTED position */
            background-color: rgba(40, 40, 40, 0.7);
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border: 2px solid white;
            transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
            opacity: 0; /* Hide by default */
            transform: scale(0.8);
            z-index: 1; /* Ensure it's on top */
        }

        .member-avatar-cell:hover .edit-avatar-overlay {
            opacity: 1; /* Show on hover */
            transform: scale(1);
        }
        /* -------------------------------------- */

        @keyframes spinner-anim {
          to { transform: rotate(360deg); }
        }
        .avatar-spinner {
            animation: spinner-anim 1s linear infinite;
        }


        /* Responsive Table */
        @media (max-width: 768px) {
          .form-grid-container {
            grid-template-columns: repeat(2, 1fr);
          }

          .user-table {
            min-width: unset; /* Remove min-width on mobile */
          }
          .user-table,
          .user-table thead,
          .user-table tbody,
          .user-table th,
          .user-table td,
          .user-table tr {
            display: block;
          }

          .user-table thead tr {
            position: absolute;
            top: -9999px;
            left: -9999px;
          }

          .user-table tr {
            margin-bottom: 10px;
            border: 1px solid var(--border-color, #ddd); /* Use theme variable */
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }

          .user-table td {
            border: none;
            position: relative;
            padding-left: 55%; /* Increased padding-left to make space for data-label */
            text-align: right;
            border-bottom: 1px solid var(--border-color, #f0f0f0); /* Use theme variable */
          }
          .user-table td[data-label="รูป"] {
            padding-left: 55%;
          }
          .user-table td[data-label="รูป"]:before {
            content: "รูป";
            position: absolute;
            left: 15px;
            width: 40%;
            font-weight: bold;
            text-align: left;
          }
          .user-table td[data-label="รูป"] .member-avatar-cell {
              margin: 0; /* ไม่ต้องจัดกลางใน mobile */
              margin-left: auto; /* จัดชิดขวา */
          }
          /* Specific adjustments for 'ระดับ' and 'อายุ' columns */
          .user-table td[data-label="ระดับ"]:before,
          .user-table td[data-label="อายุ"]:before {
            width: 45%; /* Give more space for these labels */
          }

          .user-table td:last-child {
            /* Fix for the last td in a row */
            border-bottom: none;
          }

          .user-table td:before {
            position: absolute;
            left: 15px;
            width: 40%; /* Adjusted width for the data-label */
            padding-right: 10px;
            white-space: nowrap;
            content: attr(data-label);
            font-weight: bold;
            text-align: left; /* Ensure data-label text is left-aligned */
            color: var(--text-color, #555); /* Use theme variable */
            font-size: 12px; /* Adjusted font size */
          }

          /* Ensure sorting icons are visible and aligned on mobile */
          .user-table th.sortable-header {
              display: flex;
              justify-content: flex-start; /* Align text to start */
              align-items: center;
              padding-left: 15px; /* Match td:before left padding */
          }

          .form-buttons-container {
            justify-content: center;
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

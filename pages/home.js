// Home.js
import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/sidebar";
import Swal from "sweetalert2";
import { db } from "../lib/firebaseConfig";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import * as XLSX from "xlsx";

// เริ่มต้น Modal Component ที่ถูกรวมเข้ามา
const Modal = ({ show, onClose, onGenerateTemplate, onFileUpload }) => {
  if (!show) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close-button" onClick={onClose}>
          &times; {/* ไอคอนกากบาท */}
        </button>
        <h3>จัดการไฟล์ Excel สมาชิก</h3>
        <p>คุณสามารถดาวน์โหลดไฟล์ Excel แม่แบบเพื่อเพิ่มข้อมูลสมาชิก หรืออัปโหลดไฟล์ที่มีอยู่</p>
        <div className="modal-actions">
          <button className="modal-download-template-button" onClick={onGenerateTemplate}>
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

        /* ปรับขนาดปุ่มดาวน์โหลด */
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
// สิ้นสุด Modal Component

const Home = () => {
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [lineId, setLineId] = useState("");
  const [handed, setHanded] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState(""); // เปลี่ยนจาก birthYear เป็น birthDate
  const [experience, setExperience] = useState("");
  const [status, setStatus] = useState("");
  const [members, setMembers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null); // เพิ่ม State สำหรับเก็บ userId
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [membersPerPage] = useState(20);
  const [isFormExpanded, setIsFormExpanded] = useState(false);

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
    if (typeof excelDateNumber !== 'number') return null;
    // Excel's epoch starts from 1900-01-01 (day 1). JavaScript's is 1970-01-01.
    // Need to adjust for 1900-02-29 bug in Excel (Excel thinks 1900 was a leap year)
    const date = new Date((excelDateNumber - (25569 + 1)) * 86400 * 1000); // 25569 is days between 1900-01-01 and 1970-01-01, plus 1 day for Excel's 1-based indexing and the 1900 leap year bug
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };


  // ฟังก์ชันสำหรับสร้างไฟล์ Excel ต้นฉบับ พร้อมตัวอย่างข้อมูล
  const generateExcelTemplate = () => {
    // 1. กำหนด Header ของคอลัมน์
    const headers = [
      "name",
      "level",
      "lineId",
      "handed",
      "phone",
      "birthDate", // เปลี่ยนเป็น birthDate
      "experience",
      "status",
    ];

    // 2. กำหนดข้อมูลตัวอย่างให้ถูกต้องตาม Header
    const templateData = [
      {
        name: "ตัวอย่าง ชื่อ-นามสกุล",
        level: "S",
        lineId: "example_line_id",
        handed: "Right",
        phone: "0812345678",
        birthDate: "1990-05-15", // ตัวอย่างวันเกิด (ค.ศ. YYYY-MM-DD)
        experience: "2 ปี",
        status: "มา",
      },
      {
        name: "ตัวอย่าง คนที่สอง",
        level: "P-",
        lineId: "second_example",
        handed: "Left",
        phone: "0998765432",
        birthDate: "1985-11-20", // ตัวอย่างวันเกิด (ค.ศ. YYYY-MM-DD)
        experience: "5 ปี",
        status: "ไม่มา",
      },
    ];

    // 3. สร้าง Worksheet โดยเริ่มต้นจาก Header
    const ws = XLSX.utils.aoa_to_sheet([headers]);

    // 4. เพิ่มข้อมูลตัวอย่างต่อท้ายจาก Header
    XLSX.utils.sheet_add_json(ws, templateData, {
      skipHeader: true,
      origin: -1,
      header: headers,
    });

    // 5. ปรับความกว้างคอลัมน์ (Optional: เพื่อให้อ่านง่ายขึ้น)
    const columnWidths = [
      { wch: 20 },
      { wch: 10 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
      { wch: 18 }, // เพิ่มความกว้างสำหรับ birthDate (YYYY-MM-DD)
      { wch: 15 },
      { wch: 10 },
    ];
    ws["!cols"] = columnWidths;

    // 6. สร้าง Workbook และเขียนไฟล์
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "สมาชิก");
    const fileName = "members_template.xlsx";
    XLSX.writeFile(wb, fileName);
  };

  // ฟังก์ชันสำหรับอัปโหลดไฟล์ Excel
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: null }); // Use raw: false for formatted dates

        try {
          if (jsonData.length === 0) {
            Swal.fire("ไฟล์ Excel ว่างเปล่า", "ไม่พบข้อมูลในไฟล์ที่คุณอัปโหลด", "warning");
            return;
          }

          if (!currentUserId) { // ใช้ currentUserId ที่เก็บไว้
            Swal.fire("ข้อผิดพลาด", "ไม่พบ ID ผู้ใช้ในระบบ", "error");
            return;
          }

          let validationErrors = [];
          let successCount = 0;

          const existingMembers = await fetchMembersData();

          for (let i = 0; i < jsonData.length; i++) {
            const member = jsonData[i];
            const rowIndex = i + 2;

            if (!member) {
              validationErrors.push(`แถวที่ ${rowIndex}: ไม่มีข้อมูล`);
              continue;
            }

            const nameTrimmed = (member.name || '').toString().trim();
            const levelTrimmed = (member.level || '').toString().trim();
            const lineIdTrimmed = (member.lineId || '').toString().trim();
            const handedTrimmed = (member.handed || '').toString().trim();
            const phoneTrimmed = (member.phone || '').toString().trim();
            let birthDateValue = null;

            // Handle birthDate from Excel
            if (member.birthDate) {
                // If it's a number, it's likely an Excel date serial number
                if (typeof member.birthDate === 'number') {
                    birthDateValue = excelDateToISODate(member.birthDate);
                } else if (typeof member.birthDate === 'string') {
                    // If it's a string, try to parse it as YYYY-MM-DD
                    const parsedDate = new Date(member.birthDate);
                    if (!isNaN(parsedDate.getTime())) {
                        birthDateValue = member.birthDate; // Assume YYYY-MM-DD or parsable
                    }
                }
            }


            const experienceTrimmed = (member.experience || '').toString().trim();
            const statusTrimmed = (member.status || '').toString().trim();

            const newUser = {
              name: nameTrimmed,
              level: levelTrimmed,
              lineId: lineIdTrimmed,
              handed: handedTrimmed,
              phone: phoneTrimmed,
              birthDate: birthDateValue, // เก็บ birthDate
              experience: experienceTrimmed,
              status: statusTrimmed,
              createBy: loggedInUsername,
            };

            let rowErrors = [];
            if (!newUser.name) rowErrors.push("ชื่อ");
            if (!newUser.level) rowErrors.push("ระดับ");
            if (!newUser.lineId) rowErrors.push("Line ID");
            if (!newUser.handed) rowErrors.push("ถนัด");
            if (!newUser.phone) rowErrors.push("เบอร์โทร");
            if (!newUser.birthDate) rowErrors.push("วันเดือนปีเกิด"); // ตรวจสอบ birthDate
            if (!newUser.experience) rowErrors.push("ประสบการณ์");
            if (!newUser.status) rowErrors.push("สถานะ");

            if (rowErrors.length > 0) {
              validationErrors.push(`แถวที่ ${rowIndex}: ข้อมูลไม่ครบถ้วนในช่อง: ${rowErrors.join(", ")}`);
              continue;
            }

            try {
              const memberId = generateMemberId(existingMembers);
              const memberRef = doc(db, `users/${currentUserId}/Members/${memberId}`); // ใช้ currentUserId
              await setDoc(memberRef, { ...newUser, memberId, createdAt: new Date() });
              successCount++;
            } catch (addError) {
              validationErrors.push(`แถวที่ ${rowIndex}: ไม่สามารถเพิ่มข้อมูลได้ - ${addError.message}`);
            }
          }

          if (successCount > 0) {
            Swal.fire("สำเร็จ!", `เพิ่มข้อมูลสมาชิกจาก Excel สำเร็จ ${successCount} คน!`, "success");
            setShowModal(false);
            fetchMembers();
          }

          if (validationErrors.length > 0) {
            Swal.fire(
              "มีข้อผิดพลาดบางอย่าง",
              "พบข้อผิดพลาดในการนำเข้าข้อมูลบางส่วน:\n" + validationErrors.join("\n"),
              "warning"
            );
          } else if (successCount === 0) {
            Swal.fire("ไม่พบข้อมูลที่ถูกต้อง", "ไม่มีข้อมูลสมาชิกที่สามารถเพิ่มได้จากไฟล์ Excel", "warning");
          }
        } catch (error) {
          console.error("Error uploading Excel file:", error);
          Swal.fire("เกิดข้อผิดพลาดในการอัปโหลดไฟล์ Excel", error.message, "error");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Swal.fire("กรุณาอัปโหลดไฟล์ Excel เท่านั้น", "ไฟล์ที่รองรับคือ .xlsx และ .xls", "warning");
    }
  };

  // ดึง Username และ UserId เมื่อ Component โหลด
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
          setCurrentUserId(docSnapshot.id); // เก็บ userId ไว้ใน State
        } else {
          console.warn("User data not found for email:", email);
        }
      } catch (error) {
        console.error("Error fetching user data: ", error);
      }
    }
  };

  const fetchMembersData = async () => {
    try {
      if (!currentUserId) { // ตรวจสอบ userId ก่อนดึงข้อมูลสมาชิก
        return [];
      }
      const membersRef = collection(db, `users/${currentUserId}/Members`);
      const membersSnapshot = await getDocs(membersRef);
      const membersData = membersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // เรียงลำดับตาม memberId_XXX
      membersData.sort((a, b) => {
        const idA = a.memberId && a.memberId.startsWith('member_') ? parseInt(a.memberId.split('_')[1], 10) : Infinity;
        const idB = b.memberId && b.memberId.startsWith('member_') ? parseInt(b.memberId.split('_')[1], 10) : Infinity;
        return idA - idB;
      });

      return membersData;
    } catch (error) {
      console.error("Error fetching members data:", error);
      return [];
    }
  };

  // ใช้ useCallback เพื่อให้ fetchMembers ไม่เปลี่ยนในทุก re-render
  const fetchMembers = useCallback(async () => {
    const data = await fetchMembersData();
    setMembers(data);
  }, [currentUserId]); // currentUserId เป็น dependency

  useEffect(() => {
    fetchUserData(); // ดึง username และ userId เมื่อ component โหลดครั้งแรก
  }, []); // เรียกเพียงครั้งเดียวเมื่อ component mount

  // เรียก fetchMembers เมื่อ currentUserId พร้อมใช้งาน
  useEffect(() => {
    if (currentUserId) {
      fetchMembers();
    }
  }, [currentUserId, fetchMembers]);

  const generateMemberId = (currentMembers) => {
    const maxIdNum = currentMembers.reduce((max, member) => {
      if (member.memberId && member.memberId.startsWith('member_')) {
        const num = parseInt(member.memberId.split('_')[1], 10);
        return isNaN(num) ? max : Math.max(max, num);
      }
      return max;
    }, 0);
    const newId = maxIdNum + 1;
    return `member_${String(newId).padStart(3, "0")}`;
  };

  const handleSelectUser = (user) => {
    if (selectedUser && selectedUser.memberId === user.memberId) {
      setSelectedUser(null);
      clearForm();
      setIsEditing(false);
    } else {
      setSelectedUser(user);
      setName(user.name);
      setLevel(user.level);
      setLineId(user.lineId);
      setHanded(user.handed);
      setPhone(user.phone);
      setBirthDate(user.birthDate || ""); // กำหนดค่า birthDate จาก user
      setExperience(user.experience);
      setStatus(user.status);
      setIsEditing(true);
      setIsFormExpanded(true); // Expand form when selecting a user
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !name ||
      !level ||
      !lineId ||
      !handed ||
      !phone ||
      !birthDate || // ตรวจสอบ birthDate
      !experience ||
      !status
    ) {
      Swal.fire("กรุณากรอกข้อมูลให้ครบทุกช่อง", "", "warning");
      return;
    }

    // Validate birthDate format (YYYY-MM-DD)
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
      name,
      level,
      lineId,
      handed,
      phone,
      birthDate, // เก็บ birthDate เป็น String YYYY-MM-DD
      experience,
      status,
      createBy: loggedInUsername,
    };

    try {
      if (!currentUserId) { // ใช้ currentUserId ที่เก็บไว้
        Swal.fire("ข้อผิดพลาด", "ไม่พบ ID ผู้ใช้ในระบบ", "error");
        return;
      }

      let memberId;
      if (isEditing && selectedUser) {
        memberId = selectedUser.memberId;
        const memberRef = doc(
          db,
          `users/${currentUserId}/Members/${selectedUser.memberId}`
        );
        await updateDoc(memberRef, { ...newUser, updatedAt: new Date() });
        Swal.fire("สำเร็จ!", "แก้ไขข้อมูลสมาชิกสำเร็จ!", "success");
      } else {
        const currentMembersData = await fetchMembersData();
        memberId = generateMemberId(currentMembersData);
        const memberRef = doc(db, `users/${currentUserId}/Members/${memberId}`);
        await setDoc(memberRef, {
          ...newUser,
          memberId,
          createdAt: new Date(),
        });
        Swal.fire("สำเร็จ!", "เพิ่มสมาชิกสำเร็จ!", "success");
      }

      clearForm();
      fetchMembers();
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
        if (!currentUserId) { // ใช้ currentUserId ที่เก็บไว้
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
        fetchMembers();
      } catch (error) {
        Swal.fire("เกิดข้อผิดพลาดในการลบ", error.message, "error");
      }
    }
  };

  const toggleStatus = async (user) => {
    const newStatus = user.status === "มา" || !user.status ? "ไม่มา" : "มา";
    try {
      if (!currentUserId) { // ใช้ currentUserId ที่เก็บไว้
        Swal.fire("ข้อผิดพลาด", "ไม่พบ ID ผู้ใช้ในระบบ", "error");
        return;
      }

      const memberRef = doc(db, `users/${currentUserId}/Members/${user.memberId}`);
      await updateDoc(memberRef, { status: newStatus });
      fetchMembers();
    } catch (error) {
      Swal.fire("เกิดข้อผิดพลาดในการอัปเดตสถานะ", error.message, "error");
    }
  };

  const clearForm = () => {
    setName("");
    setLevel("");
    setLineId("");
    setHanded("");
    setPhone("");
    setBirthDate(""); // เคลียร์ birthDate
    setExperience("");
    setStatus("ไม่มา");
    setSelectedUser(null);
    setIsEditing(false);
  };

  // Function to toggle form expansion
  const toggleFormExpansion = () => {
    setIsFormExpanded(prev => !prev);
  };

  const filteredMembers = members.filter((user) =>
    user.name?.toLowerCase().includes(search.toLowerCase())
  );

  const indexOfLastMember = currentPage * membersPerPage;
  const indexOfFirstMember = indexOfLastMember - membersPerPage;
  const currentMembers = filteredMembers.slice(
    indexOfFirstMember,
    indexOfLastMember
  );
  const totalPages = Math.ceil(filteredMembers.length / membersPerPage);

  return (
    <div className="overall-layout">
      <Sidebar />
      <main className="main-content">
        <h2>สมาชิก</h2>
        <hr />

        <div className="excel-button-container">
          <button
            onClick={() => setShowModal(true)}
            className="generate-excel-button"
          >
            จัดการไฟล์ Excel
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
            <div className="form-header-with-toggle">
                <h3 className="form-section-title">กรอกข้อมูลสมาชิก</h3>
                <button
                    onClick={toggleFormExpansion}
                    className="toggle-form-button"
                    aria-expanded={isFormExpanded}
                >
                    {isFormExpanded ? "-" : "+"}
                </button>
            </div>

            <div className={`form-content-collapsible ${isFormExpanded ? 'expanded' : 'collapsed'}`}>
                <form
                  onSubmit={handleSubmit}
                  className="form-box"
                  noValidate
                >
                  <div className="form-grid-container">
                    <div>
                      <label className="form-label">ชื่อ</label>
                      <input
                        className="modern-input"
                        type="text"
                        placeholder="ชื่อ"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Line ID</label>
                      <input
                        className="modern-input"
                        type="text"
                        placeholder="Line ID"
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
                      <label className="form-label">วันเดือนปีเกิด</label> {/* เปลี่ยน Label */}
                      <input
                        className="modern-input"
                        type="date" // **ใช้ type="date"**
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">ระดับ</label>
                      <select
                        className="modern-input"
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                      >
                        <option value="">เลือกระดับ</option>
                        <option value="มือหน้าบ้าน">มือหน้าบ้าน</option>
                        <option value="มือหน้าบ้าน1">มือหน้าบ้าน1</option>
                        <option value="มือหน้าบ้าน2">มือหน้าบ้าน2</option>
                        <option value="มือหน้าบ้าน3">มือหน้าบ้าน3</option>
                        <option value="S-">S-</option>
                        <option value="S">S</option>
                        <option value="N-">N-</option>
                        <option value="N">N</option>
                        <option value="P-">P-</option>
                        <option value="P">P</option>
                        <option value="C">C</option>
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
                        <option value="">ถนัดมือ</option>
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
                        <option value="">โปรดเลือกสถานะ</option>
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

        <div className="search-box">
          <input
            type="text"
            className="modern-input search-input"
            placeholder="ค้นหาผู้ใช้"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="total-members-display">
          <span>
            จำนวนสมาชิก: {filteredMembers.length}
          </span>
        </div>

        <div className="pagination-controls">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            className="pagination-button"
            disabled={currentPage === 1}
          >
            ย้อนกลับ
          </button>
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index + 1}
              onClick={() => setCurrentPage(index + 1)}
              className={`pagination-button ${currentPage === index + 1 ? "active" : ""}`}
            >
              {index + 1}
            </button>
          ))}
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            className="pagination-button"
            disabled={currentPage === totalPages || totalPages === 0}
          >
            ถัดไป
          </button>
        </div>

        <div className="table-responsive-container">
          <table className="user-table">
            <thead>
              <tr>
                <th>เลือก</th>
                <th>ชื่อ</th>
                <th>ระดับ</th>
                <th>Line ID</th>
                <th>มือ</th>
                <th>เบอร์โทร</th>
                <th>อายุ</th> {/* ยังคงแสดงเป็นอายุ */}
                <th>ประสบการณ์</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {currentMembers.length === 0 && !search && (
                <tr>
                  <td colSpan="9" className="no-data-message">ไม่พบข้อมูลสมาชิก กรุณาเพิ่มสมาชิกใหม่</td>
                </tr>
              )}
              {currentMembers.length === 0 && search && (
                <tr>
                  <td colSpan="9" className="no-data-message">ไม่พบข้อมูลสมาชิกที่ค้นหา</td>
                </tr>
              )}
              {currentMembers.map((user) => (
                <tr
                  key={user.memberId}
                  className={selectedUser?.memberId === user.memberId ? "selected-row" : ""}
                >
                  <td data-label="เลือก">
                    <input
                      type="checkbox"
                      checked={selectedUser?.memberId === user.memberId}
                      onChange={() => handleSelectUser(user)}
                    />
                  </td>
                  <td data-label="ชื่อ">{user.name}</td>
                  <td data-label="ระดับ">{user.level}</td>
                  <td data-label="Line ID">{user.lineId}</td>
                  <td data-label="มือ">{user.handed}</td>
                  <td data-label="เบอร์โทร">{user.phone}</td>
                  <td data-label="อายุ">{calculateAge(user.birthDate)}</td> {/* คำนวณอายุจาก birthDate เพื่อแสดง */}
                  <td data-label="ประสบการณ์">{user.experience}</td>
                  <td data-label="สถานะ">
                    <button
                      onClick={() => toggleStatus(user)}
                      className={`status-button ${user.status === "มา" ? "status-มา" : "status-ไม่มา"}`}
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
        }

        /* Base Layout */
        .overall-layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          height: 100vh;
        }

        /* Main Content Area */
        .main-content {
          padding: 28px;
          background-color: #f7f7f7;
          border-radius: 12px;
          overflow-y: auto;
        }

        .main-content h2 {
          font-size: 18px;
          margin-bottom: 10px;
        }

        .main-content hr {
          border: 0;
          border-top: 1px solid #666;
          margin-bottom: 18px;
        }

        /* Excel Button Container */
        .excel-button-container {
            margin-bottom: 20px;
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

        /* Container for the Form Section (Header + Collapsible Content) */
        .member-form-section {
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
            margin-bottom: 20px;
            border: 1px solid #e9e9e9;
        }

        /* Header for the collapsible form */
        .form-header-with-toggle {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            background-color: #e9e9e9;
            border-top-left-radius: 8px;
            border-top-right-radius: 8px;
            border-bottom: 1px solid #ddd;
            cursor: pointer;
            user-select: none;
            transition: background-color 0.2s ease-in-out;
        }

        .form-header-with-toggle:hover {
            background-color: #dcdcdc;
        }

        .form-section-title {
            margin: 0;
            font-size: 14px;
            color: #333;
        }

        .toggle-form-button {
            background: none;
            border: none;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            color: #555;
            padding: 5px 8px;
            line-height: 1;
            transition: color 0.2s ease-in-out;
        }

        .toggle-form-button:hover {
            color: #000;
        }

        /* Collapsible content for the form */
        .form-content-collapsible {
            overflow: hidden;
            transition: max-height 0.5s ease-out, opacity 0.5s ease-out, padding 0.5s ease-out;
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

        /* Original Form Styles (from image_f08aa0.png) */
        .form-label {
          font-size: 12px; /* Adjusted font size */
          color: #333;
          display: block;
          margin-bottom: 4px;
        }

        .modern-input {
          outline: none;
          border: 1px solid #ccc;
          padding: 8px;
          font-size: 12px; /* Adjusted font size */
          color: #333;
          width: 100%;
          border-radius: 5px;
          transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }

        .modern-input:focus {
          border-color: #333;
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
          background-color: #57e497;
          color: black;
        }
        .submit-btn.edit {
          background-color: #ff9800;
        }
        .submit-btn:hover {
          background-color: #3fc57b;
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
          border-top: 1px solid #ddd;
        }

        /* Search box style (from image_f09ca6.png) */
        .search-box {
            margin-bottom: 20px;
        }
        .search-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 12px; /* Adjusted font size */
            outline: none;
        }
        .search-input:focus {
            border-color: #333;
            box-shadow: 0 0 0 3px rgba(231, 231, 231, 0.2);
        }

        /* Total Members Display (from image_f09ca6.png) */
        .total-members-display {
            text-align: right;
            margin-bottom: 15px;
            font-size: 12px; /* Adjusted font size */
            color: #555;
        }

        /* Pagination Controls (from image_f09ca6.png and image_f09567.png) */
        .pagination-controls {
            display: flex;
            justify-content: flex-start;
            align-items: center;
            gap: 8px;
            margin-bottom: 20px;
        }

        .pagination-button {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #f0f0f0;
            cursor: pointer;
            font-size: 12px; /* Adjusted font size */
            transition: background-color 0.2s, border-color 0.2s;
            color: #333;
        }

        .pagination-button:hover {
            background-color: #e0e0e0;
        }

        .pagination-button.active {
            background-color: #6c757d;
            color: black;
            border-color: #6c757d;
        }

        .pagination-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background-color: #f7f7f7;
        }

        /* Table Styles */
        .user-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 700px;
            background-color: #ffffff;
            border: 1px solid #e0e0e0; /* Added outer border */
            border-radius: 8px;
            overflow: hidden;
        }

        .user-table th,
        .user-table td {
            padding: 10px 12px; /* Slightly reduced padding */
            border-bottom: 1px solid #f0f0f0;
            border-right: 1px solid #f0f0f0; /* Added right border for vertical lines */
            text-align: center; /* ALIGN TEXT TO CENTER */
            font-size: 12px; /* Adjusted font size */
            color: #333;
        }

        /* Remove right border for the last column in header and body */
        .user-table th:last-child,
        .user-table td:last-child {
            border-right: none;
        }

        .user-table th {
            background-color: #323943; /* Specific header background color */
            color: white; /* Header text color */
            font-weight: 600;
            text-transform: none;
        }

        /* Remove bottom border for the last row */
        .user-table tbody tr:last-child td {
            border-bottom: none;
        }

        /* Row Highlighting and Stripes */
        .user-table tbody tr:nth-child(odd) {
            background-color: #ffffff;
        }
        .user-table tbody tr:nth-child(even) {
            background-color: #fdfdfd;
        }

        /* Selected row background */
        .user-table tbody tr.selected-row {
            background-color: #e0ffe0;
        }

        /* Hover effect */
        .user-table tbody tr:hover:not(.selected-row) {
            background-color: #f5f5f5;
        }

        /* Checkbox Column */
        .user-table td[data-label="เลือก"] {
            text-align: center;
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
            background-color: #4CAF50;
            color: white;
        }

        .status-มา:hover {
            background-color: #45a049;
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
            color: #888;
            padding: 20px;
            font-size: 12px; /* Adjusted font size */
        }

        /* Responsive Table */
        @media (max-width: 768px) {
            .form-grid-container {
                grid-template-columns: repeat(2, 1fr);
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
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }

            .user-table td {
                border: none;
                position: relative;
                padding-left: 50%;
                text-align: right;
            }

            .user-table td:before {
                position: absolute;
                left: 15px;
                width: 45%;
                padding-right: 10px;
                white-space: nowrap;
                content: attr(data-label);
                font-weight: bold;
                text-align: left;
                color: #555;
                font-size: 12px; /* Adjusted font size */
            }

            .form-buttons-container {
                justify-content: center;
            }
        }

        @media (max-width: 600px) {
            .overall-layout {
                grid-template-columns: 1fr;
            }

            .main-content {
                padding: 15px;
            }

            .form-grid-container {
                grid-template-columns: 1fr;
            }

            .submit-btn, .delete-btn {
                width: 100%;
                min-width: unset;
            }
        }
      `}</style>
    </div>
  );
};

export default Home;

// src/pages/Birthday.js (หรือ pages/Birthday.js ขึ้นอยู่กับโครงสร้างโปรเจกต์ของคุณ)
import React, { useState, useEffect, useCallback } from "react";
// import Sidebar from "./components/sidebar"; // <--- บรรทัดนี้ถูกลบออกไปแล้ว
// คุณไม่จำเป็นต้อง import Sidebar ในไฟล์หน้าเพจโดยตรงอีกต่อไป

import Swal from "sweetalert2";
import { db } from "../lib/firebaseConfig"; // ตรวจสอบพาธให้ถูกต้อง
import { collection, getDocs, query, where } from "firebase/firestore";

const Birthday = () => {
  const [birthdayMembers, setBirthdayMembers] = useState([]);
  const [loggedInUsername, setLoggedInUsername] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentMonthName, setCurrentMonthName] = useState("");
  const currentYear = new Date().getFullYear();
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to generate a random hex color
  const getRandomColor = () => {
    const hue = Math.floor(Math.random() * 360); // 0-359
    const saturation = Math.floor(Math.random() * (70 - 40) + 40); // 40-70% saturation
    const lightness = Math.floor(Math.random() * (60 - 30) + 30); // 30-60% lightness (avoids very light/dark)
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // Helper function to generate a random hex color for the cake icon (lighter/more vibrant)
  const getAvatarRandomColor = () => {
    const hue = Math.floor(Math.random() * 360); // 0-359
    const saturation = Math.floor(Math.random() * (100 - 70) + 70); // 70-100% saturation
    const lightness = Math.floor(Math.random() * (85 - 60) + 60); // 60-85% lightness (lighter but vibrant)
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // Helper function to calculate age from birth date (YYYY-MM-DD format)
  const calculateAge = (isoBirthDate) => {
    if (!isoBirthDate || typeof isoBirthDate !== 'string') {
      console.warn("Invalid birthDate format for age calculation:", isoBirthDate);
      return "N/A";
    }
    const today = new Date();
    const birthYear = parseInt(isoBirthDate.substring(0, 4), 10);
    const birthMonth = parseInt(isoBirthDate.substring(5, 7), 10) - 1;
    const birthDay = parseInt(isoBirthDate.substring(8, 10), 10);

    const birthDateObj = new Date(birthYear, birthMonth, birthDay);

    if (isNaN(birthDateObj.getTime())) {
        console.warn("Failed to parse birthDate for age calculation:", isoBirthDate);
        return "N/A";
    }

    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age;
  };

  // Function to get month name (current month in Thai)
  const getMonthName = (monthIndex) => {
    const months = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    return months[monthIndex];
  };

  // Fetch logged-in user data (username and userId)
  const fetchUserData = async () => {
    const email = localStorage.getItem("loggedInEmail");
    if (email) {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docSnapshot = querySnapshot.docs ? querySnapshot.docs.at(0) : null;
          if (docSnapshot) {
            setLoggedInUsername(docSnapshot.data().username);
            setCurrentUserId(docSnapshot.id);
          } else {
            Swal.fire("ข้อผิดพลาด", "ไม่พบข้อมูลผู้ใช้ในระบบ", "error");
          }
        } else {
          Swal.fire("ข้อผิดพลาด", "ไม่พบข้อมูลผู้ใช้ในระบบ", "error");
        }
      } catch (error) {
        console.error("Error fetching user data: ", error);
        Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถดึงข้อมูลผู้ใช้ได้", "error");
      }
    } else {
      Swal.fire("กรุณาเข้าสู่ระบบ", "ไม่พบข้อมูลผู้ใช้", "warning");
    }
  };

  // Fetch birthday members for the current month
  const fetchBirthdayMembers = useCallback(async () => {
    if (!currentUserId) {
      setBirthdayMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const membersRef = collection(db, `users/${currentUserId}/Members`);
      const allMembersSnapshot = await getDocs(membersRef);
      const allMembersData = allMembersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const today = new Date();
      const currentMonth = today.getMonth();
      setCurrentMonthName(getMonthName(currentMonth));

      const filtered = allMembersData.filter(member => {
        if (member.birthDate && typeof member.birthDate === 'string') {
          const birthDateObj = new Date(member.birthDate);
          if (isNaN(birthDateObj.getTime())) {
              return false;
          }
          const monthFromFirestore = birthDateObj.getMonth();
          return monthFromFirestore === currentMonth;
        }
        return false;
      });

      filtered.sort((a, b) => {
        const dayA = a.birthDate ? parseInt(a.birthDate.split('-')?.[2], 10) : 0;
        const dayB = b.birthDate ? parseInt(b.birthDate.split('-')?.[2], 10) : 0;
        return dayA - dayB;
      });

      setBirthdayMembers(filtered);
    } catch (error) {
      console.error("Error fetching birthday members:", error);
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถดึงข้อมูลวันเกิดสมาชิกได้", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchBirthdayMembers();
    }
  }, [currentUserId, fetchBirthdayMembers]);

  return (
    <div className="overall-layout">
      {/* <Sidebar /> <-- บรรทัดนี้ถูกลบออกไปแล้ว เพราะ Sidebar ถูก Render ใน _app.js แทน */}
      <main className="main-content">
        <h2 className="page-title">วันเกิดสมาชิกประจำเดือน : {currentMonthName}</h2>
        <hr className="title-separator" />

        <div className="birthday-summary-card">
          <div className="summary-icon">🎉</div>
          <div className="summary-details">
            <h3>สุขสันต์วันเกิดสมาชิกในเดือน<br />
              <span className="current-month-highlight">{currentMonthName}</span> {currentYear}
            </h3>
            <p className="total-birthdays">
              มีสมาชิกเกิดในเดือนนี้ทั้งหมด :{" "}
              <strong>{birthdayMembers.length}</strong> คน
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="status-message loading-status">
            <div className="spinner"></div>
            กำลังโหลดข้อมูลวันเกิด...
          </div>
        ) : (
          <>
            {birthdayMembers.length === 0 ? (
              <div className="status-message no-data-status">
                😔 ไม่พบสมาชิกที่เกิดในเดือน{currentMonthName}นี้
              </div>
            ) : (
              <div className="birthday-grid">
                {birthdayMembers.map((member) => (
                  <div
                    key={member.id}
                    className="birthday-member-card-glam"
                    style={{ background: getRandomColor() }}
                  >
                    <div className="card-glam-header">
                      <div
                        className="card-glam-avatar"
                        style={{ background: getAvatarRandomColor() }}
                      >
                        <span className="glam-emoji">🎂</span>
                      </div>
                      <h3 className="member-name-glam">{member.name}</h3>
                    </div>

                    <div className="card-glam-details">
                      <div className="detail-row-glam">
                        <span className="detail-label-glam">วันเกิด:</span>
                        <span className="detail-value-glam date-highlight-glam">
                          {member.birthDate ? new Date(member.birthDate).toLocaleDateString('th-TH', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                          }) : "ไม่ระบุ"}
                        </span>
                      </div>
                      <div className="detail-row-glam">
                        <span className="detail-label-glam">อายุ:</span>
                        <span className="detail-value-glam age-highlight-glam">{calculateAge(member.birthDate)} ปี</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* --- Updated CSS Styles for Birthday.js --- */}
      {/* CSS ยังคงอยู่ที่เดิม แต่คุณอาจต้องปรับโครงสร้าง overall-layout หากต้องการให้ main-content กินพื้นที่เต็มหน้า */}
      <style jsx>{`
        /* --- Base & Layout --- */
        .overall-layout {
          display: grid;
          /* เดิม: grid-template-columns: 240px 1fr;
             ตอนนี้: _app.js จัดการ Sidebar แล้ว, คุณอาจต้องการให้ main-content
             กินพื้นที่ 100% หรือปรับตาม Layout หลักที่คุณกำหนดใน _app.js
             สำหรับตอนนี้ เราจะลบการกำหนด grid-template-columns ที่นี่
             เพื่อให้มันเข้ากับ layout ที่ _app.js จัดการให้
          */
          /* grid-template-columns: 240px 1fr; <--- บรรทัดนี้ควรถูกจัดการที่ layout หลัก (เช่น _app.js) */
          height: 100vh;
        }

        .main-content {
          padding: 28px;
          background-color: #e8f0f7;
          border-radius: 12px;
          overflow-y: auto;
          font-family: 'Kanit', sans-serif;
          /* หากไม่มี grid-template-columns ใน overall-layout แล้ว
             main-content อาจจะกว้าง 100% หากไม่ได้ถูกกำหนดใน layout หลัก */
        }

        .page-title {
          color:rgb(0, 0, 0);
          font-size: 18px;
          margin-bottom: 20px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .title-separator {
          border: none;
          border-top: 2px solid #d4e0e8;
          margin-bottom: 40px;
        }

        /* --- Birthday Summary Card (EVEN SMALLER DESIGN) --- */
        .birthday-summary-card {
          background: linear-gradient(135deg, #ff7e5f, #feb47b, #ffda7f);
          color: #fff;
          padding: 18px 15px;
          border-radius: 12px;
          margin-bottom: 25px;
          text-align: center;
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.2) inset;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: relative;
          overflow: hidden;
        }

        .birthday-summary-card::before {
          content: '🎉';
          position: absolute;
          top: 5px;
          left: 10px;
          font-size: 45px;
          opacity: 0.1;
          transform: rotate(-20deg);
          pointer-events: none;
        }

        .birthday-summary-card::after {
          content: '🎂';
          position: absolute;
          bottom: 5px;
          right: 10px;
          font-size: 35px;
          opacity: 0.1;
          transform: rotate(15deg);
          pointer-events: none;
        }

        .summary-icon {
          display: none;
        }

        .summary-details h3 {
          margin: 0 0 3px 0;
          font-size: 16px;
          font-weight: 700;
          line-height: 1.2;
          text-shadow: 0.5px 0.5px 2px rgba(0, 0, 0, 0.2);
        }

        .current-month-highlight {
          font-weight: 900;
          font-size: 1.1em;
          color: #ffeb3b;
          text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);
          display: block;
          margin-top: 2px;
        }

        .total-birthdays {
          font-size: 13px;
          margin-top: 8px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
          display: flex;
          align-items: baseline;
          gap: 5px;
        }

        .total-birthdays strong {
          font-size: 22px;
          font-weight: 900;
          color: #da190b;
          text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.4);
          line-height: 1;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.06);
            opacity: 0.9;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        /* --- NEW BIRTHDAY MEMBER CARD DESIGN (Version Glamorous & Compact) --- */
        .birthday-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
          padding-top: 0px;
        }

        .birthday-member-card-glam {
          border-radius: 20px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1),
                        0 0 0 1px rgba(255, 255, 255, 0.5) inset;
          overflow: hidden;
          transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding-bottom: 20px;
        }

        .birthday-member-card-glam:hover {
          transform: translateY(-8px) scale(1.01);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2),
                        0 0 0 2px rgba(255, 255, 255, 0.7) inset;
        }

        .card-glam-header {
          width: 100%;
          background: linear-gradient(145deg, rgba(255, 221, 193, 0.5), rgba(255, 192, 203, 0.5));
          padding: 40px 15px 60px 15px;
          border-bottom-left-radius: 35% 25px;
          border-bottom-right-radius: 35% 25px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-bottom: 25px;
        }

        .card-glam-avatar {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 50px;
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2),
                        0 0 0 4px rgba(255, 255, 255, 0.8);
          position: absolute;
          bottom: -45px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
        }

        .glam-emoji {
            animation: bounceIn 1.5s ease-out;
            animation-iteration-count: 1;
        }

        @keyframes bounceIn {
            0% { transform: scale(0.3); opacity: 0; }
            50% { transform: scale(1.05); opacity: 1; }
            70% { transform: scale(0.9); }
            100% { transform: scale(1); }
        }

        .member-name-glam {
          color: #fff;
          font-size: 22px;
          font-weight: 800;
          margin-top: -15px;
          position: relative;
          z-index: 11;
          text-shadow: 1px 1px 3px rgba(0,0,0,0.3);
        }

        .card-glam-details {
          width: 100%;
          padding: 10px 20px;
          padding-top: 35px;
        }

        .detail-row-glam {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px dashed #f5f5f5;
        }
        .detail-row-glam:last-child {
          border-bottom: none;
        }

        .detail-label-glam {
          font-weight: 600;
          color:rgb(13, 37, 61);
          font-size: 13px;
          margin-bottom: 3px;
          margin-right: 0;
        }

        .detail-value-glam {
          color: #333;
          font-size: 14px;
          text-align: center;
          flex-grow: 1;
          word-break: break-word;
        }

        .age-highlight-glam {
          font-weight: 700;
          color:rgb(247, 39, 16);
          font-size: 1.1em;
          letter-spacing: 0.2px;
        }

        .date-highlight-glam {
          font-weight: 600;
          color:rgb(18, 31, 24);
        }

        /* --- Status Messages --- */
        .status-message {
          text-align: center;
          padding: 40px;
          font-size: 20px;
          color: #6c757d;
          background-color: #eef2f5;
          border-radius: 10px;
          margin-top: 40px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
        }

        .loading-status {
          color: #007bff;
        }

        .no-data-status {
          color: #6c757d;
        }

        .spinner {
          border: 5px solid #f3f3f3;
          border-top: 5px solid #007bff;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* --- Responsive Adjustments --- */
        @media (min-width: 1600px) {
            .birthday-grid {
                grid-template-columns: repeat(4, 1fr);
            }
        }

        @media (max-width: 1400px) {
            .birthday-grid {
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 18px;
            }
            .page-title {
                font-size: 26px;
            }
        }

        @media (max-width: 1200px) {
            .birthday-grid {
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 15px;
            }
            .member-name-glam {
                font-size: 20px;
            }
            .card-glam-avatar {
                width: 80px;
                height: 80px;
                font-size: 45px;
                bottom: -40px;
            }
            .card-glam-header {
                padding-bottom: 50px;
            }
            .card-glam-details {
                padding-top: 50px;
            }
        }

        @media (max-width: 1024px) {
          .main-content {
            padding: 20px;
          }
          .page-title {
            font-size: 24px;
          }
          .birthday-grid {
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 15px;
          }
        }

        @media (max-width: 768px) {
          .overall-layout {
            /* ลบบรรทัดนี้ออกไปเพราะ _app.js จะจัดการ layout หลัก */
            /* grid-template-columns: 1fr; */
          }
          .main-content {
            padding: 0px;
          }
          .page-title {
            font-size: 22px;
            text-align: center;
            justify-content: center;
          }
          .title-separator {
            margin-bottom: 30px;
          }
          .birthday-summary-card {
            padding: 15px 12px;
            border-radius: 10px;
          }
          .birthday-summary-card::before {
            font-size: 35px;
            top: 5px;
            left: 8px;
          }
          .birthday-summary-card::after {
            font-size: 28px;
            bottom: 5px;
            right: 8px;
          }
          .summary-details h3 {
            font-size: 14px;
          }
          .current-month-highlight {
            font-size: 1em;
          }
          .total-birthdays {
            font-size: 12px;
            gap: 4px;
          }
          .total-birthdays strong {
            font-size: 18px;
          }
          .birthday-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .birthday-member-card-glam {
            padding-bottom: 15px;
          }
          .card-glam-header {
            padding: 30px 15px 50px 15px;
          }
          .card-glam-avatar {
            width: 80px;
            height: 80px;
            font-size: 45px;
            bottom: -40px;
          }
          .member-name-glam {
            font-size: 20px;
          }
          .card-glam-details {
            padding-top: 40px;
          }
        }

        @media (max-width: 480px) {
          .birthday-summary-card {
            padding: 10px 8px;
            margin-bottom: 20px;
          }
          .birthday-summary-card::before {
            font-size: 30px;
          }
          .birthday-summary-card::after {
            font-size: 24px;
          }
          .summary-details h3 {
            font-size: 12px;
          }
          .current-month-highlight {
            font-size: 0.9em;
          }
          .total-birthdays {
            font-size: 10px;
          }
          .total-birthdays strong {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default Birthday;

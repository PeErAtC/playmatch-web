// src/pages/Birthday.js
import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/sidebar"; // ตรวจสอบพาธให้ถูกต้อง

import Swal from "sweetalert2";
import { db } from "../lib/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";

const Birthday = () => {
  const [birthdayMembers, setBirthdayMembers] = useState([]);
  const [loggedInUsername, setLoggedInUsername] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentMonthName, setCurrentMonthName] = useState("");
  // FIX: แก้ไขการประกาศ currentYear ไม่ให้ใช้ destructuring กับค่าที่ไม่ใช่ iterable
  const currentYear = new Date().getFullYear(); 
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to calculate age from birth date (YYYY-MM-DD format)
  const calculateAge = (isoBirthDate) => {
    if (!isoBirthDate) return "N/A";
    const today = new Date();
    const birthDateObj = new Date(isoBirthDate);

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
          const docSnapshot = querySnapshot.docs[0];
          setLoggedInUsername(docSnapshot.data().username);
          setCurrentUserId(docSnapshot.id);
        } else {
          console.warn("User data not found for email:", email);
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
      const currentMonth = today.getMonth(); // 0-11
      setCurrentMonthName(getMonthName(currentMonth));

      const filtered = allMembersData.filter(member => {
        if (member.birthDate) {
          // Assuming birthDate is in 'YYYY-MM-DD' string format
          const [year, month, day] = member.birthDate.split('-').map(Number);
          // Month from Firestore (1-12) vs JavaScript month (0-11)
          return month - 1 === currentMonth;
        }
        return false;
      });

      // Sort by day of birth
      filtered.sort((a, b) => {
        const dayA = a.birthDate ? parseInt(a.birthDate.split('-')[2], 10) : 0;
        const dayB = b.birthDate ? parseInt(b.birthDate.split('-')[2], 10) : 0;
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
      <Sidebar />
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
                  <div key={member.id} className="birthday-member-card-glam">
                    <div className="card-glam-header">
                      <div className="card-glam-avatar">
                        <span className="glam-emoji">🎂</span>
                      </div>
                      <h3 className="member-name-glam">{member.name}</h3>
                      {member.memberId && <span className="member-id-glam">ID: {member.memberId}</span>}
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
                      <div className="detail-row-glam">
                        <span className="detail-label-glam">Line ID:</span>
                        <span className="detail-value-glam">{member.lineId || "-"}</span>
                      </div>
                      <div className="detail-row-glam">
                        <span className="detail-label-glam">เบอร์โทร:</span>
                        <span className="detail-value-glam">{member.phone || "-"}</span>
                      </div>
                      <div className="detail-row-glam">
                        <span className="detail-label-glam">ระดับ:</span>
                        <span className="detail-value-glam">{member.level || "-"}</span>
                      </div>
                      <div className="detail-row-glam">
                        <span className="detail-label-glam">ประสบการณ์:</span>
                        <span className="detail-value-glam">{member.experience || "-"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* --- CSS Styles for Birthday.js (Version 3 - Glamorous & Balanced) --- */}
      <style jsx>{`
        /* --- Base & Layout --- */
        .overall-layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          height: 100vh;
        }

        .main-content {
          padding: 28px;
          background-color: #e8f0f7; /* Soft light blue background */
          border-radius: 12px;
          overflow-y: auto;
          font-family: 'Kanit', sans-serif;
        }

        .page-title {
          color: #1a2a47; /* Deep blue-gray */
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

        /* --- Birthday Summary Card (Keep current style as it's good) --- */
        .birthday-summary-card {
          background: linear-gradient(135deg, #ffd700, #ff8c00); /* Gold to Orange gradient */
          color: #fff;
          padding: 30px;
          border-radius: 12px;
          margin-bottom: 40px;
          text-align: center;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 25px;
        }

        .summary-icon {
          font-size: 60px;
          line-height: 1;
          text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
        }

        .summary-details h3 {
          margin: 0 0 10px 0;
          font-size: 18px;
          font-weight: 600;
          line-height: 1.3;
        }

        .current-month-highlight {
          font-weight: 800;
          font-size: 1.2em;
          color: #ffffff;
          text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);
        }

        .total-birthdays {
          font-size: 18px;
          margin-top: 5px;
        }

        .total-birthdays strong {
          font-size: 24px;
          font-weight: 700;
          color: #da190b;
        }

        /* --- NEW BIRTHDAY MEMBER CARD DESIGN (Version Glamorous) --- */
        .birthday-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); /* ปรับให้ใหญ่ขึ้นเล็กน้อยเพื่อแสดงความสวยงาม */
          gap: 30px; /* เพิ่มระยะห่าง */
          padding-top: 15px;
        }

        .birthday-member-card-glam {
          background-color: #ffffff;
          border-radius: 25px; /* ขอบโค้งมนพิเศษ */
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.1), /* เงาหลัก */
                      0 0 0 2px rgba(255, 255, 255, 0.5) inset; /* ขอบแสงด้านใน */
          overflow: hidden;
          transition: transform 0.4s ease-in-out, box-shadow 0.4s ease-in-out;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding-bottom: 25px; /* เพิ่ม padding ด้านล่าง */
        }

        .birthday-member-card-glam:hover {
          transform: translateY(-10px) scale(1.02); /* เลื่อนขึ้นและขยายเล็กน้อย */
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25), /* เงาที่ลึกขึ้น */
                      0 0 0 3px rgba(255, 255, 255, 0.7) inset; /* ขอบแสงที่ชัดขึ้น */
        }

        .card-glam-header {
          width: 100%;
          /* Gradient สีทอง-ชมพู หรูหรา */
          background: linear-gradient(145deg, #FFDDC1, #FFC0CB); /* Peach to Pink */
          padding: 50px 20px 70px 20px; /* เว้นที่ด้านล่างสำหรับ avatar */
          border-bottom-left-radius: 40% 30px; /* โค้งมนพิเศษ */
          border-bottom-right-radius: 40% 30px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-bottom: 30px; /* ระยะห่างจากส่วนข้อมูล */
        }

        .card-glam-avatar {
          width: 110px; /* ขนาดใหญ่ขึ้น */
          height: 110px;
          /* Gradient สีฟ้า-ม่วง สดใส */
          background: linear-gradient(45deg, #87CEEB, #9370DB); /* SkyBlue to MediumPurple */
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 60px; /* Emoji ใหญ่ขึ้น */
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25), /* เงาที่ชัดเจน */
                      0 0 0 5px rgba(255, 255, 255, 0.8); /* ขอบขาวหนา */
          position: absolute;
          bottom: -55px; /* ขยับลงมาครึ่งหนึ่งของ avatar */
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
        }

        .glam-emoji {
            animation: bounceIn 1.5s ease-out; /* แอนิเมชั่นเด้งเข้ามา */
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
          font-size: 26px; /* ชื่อใหญ่และเด่น */
          font-weight: 800; /* เข้มมาก */
          margin-top: -20px; /* ขยับขึ้นให้ดูชิด avatar */
          position: relative;
          z-index: 11;
          text-shadow: 2px 2px 5px rgba(0,0,0,0.3); /* เงาชื่อ */
        }

        .member-id-glam {
          color: #e0f0f7; /* สีอ่อนลง */
          font-size: 15px;
          margin-top: 8px;
          position: relative;
          z-index: 11;
          background-color: rgba(0, 0, 0, 0.1); /* พื้นหลังโปร่งใสเล็กน้อย */
          padding: 4px 12px;
          border-radius: 20px; /* ขอบมน */
        }

        .card-glam-details {
          width: 100%;
          padding: 10px 25px; /* เพิ่ม padding ด้านข้าง */
          padding-top: 80px; /* เว้นที่ให้ avatar ที่อยู่ด้านล่าง header */
        }

        .detail-row-glam {
          display: flex;
          justify-content: space-between;
          align-items: center; /* จัดให้ตรงกลางแนวตั้ง */
          padding: 10px 0;
          border-bottom: 1px solid #f0f0f0; /* เส้นแบ่งบางๆ */
        }
        .detail-row-glam:last-child {
          border-bottom: none;
        }

        .detail-label-glam {
          font-weight: 600;
          color: #4a6a8a; /* สีน้ำเงินเข้ม */
          font-size: 14px;
          flex-shrink: 0;
          margin-right: 15px; /* ระยะห่างเพิ่มขึ้น */
        }

        .detail-value-glam {
          color: #333;
          font-size: 16px;
          text-align: right;
          flex-grow: 1;
        }

        .age-highlight-glam {
          font-weight: 700;
          color: #e74c3c; /* สีแดงสดใส */
          font-size: 1.2em;
          letter-spacing: 0.5px; /* เพิ่มระยะห่างตัวอักษรเล็กน้อย */
        }

        .date-highlight-glam {
          font-weight: 600;
          color: #2ecc71; /* สีเขียว */
        }

        /* --- Status Messages (Keep current style) --- */
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
        @media (max-width: 1400px) {
            .birthday-grid {
                grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                gap: 25px;
            }
        }

        @media (max-width: 1200px) {
            .birthday-grid {
                grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                gap: 20px;
            }
            .member-name-glam {
                font-size: 24px;
            }
            .card-glam-avatar {
                width: 100px;
                height: 100px;
                font-size: 55px;
                bottom: -50px;
            }
            .card-glam-header {
                padding-bottom: 60px;
            }
            .card-glam-details {
                padding-top: 70px;
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
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); /* 3 คอลัมน์สำหรับแท็บเล็ต */
            gap: 20px;
          }
        }

        @media (max-width: 768px) {
          .overall-layout {
            grid-template-columns: 1fr;
          }
          .main-content {
            padding: 15px;
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
            flex-direction: column;
            gap: 15px;
            padding: 20px;
          }
          .summary-details h3 {
            font-size: 16px;
          }
          .current-month-highlight {
            font-size: 1.1em;
          }
          .total-birthdays {
            font-size: 16px;
          }
          .total-birthdays strong {
            font-size: 20px;
          }
          .birthday-grid {
            grid-template-columns: 1fr; /* 1 คอลัมน์บนมือถือ */
            gap: 25px;
          }
          .birthday-member-card-glam {
            padding-bottom: 15px;
          }
          .card-glam-header {
            padding: 40px 15px 60px 15px;
          }
          .card-glam-avatar {
            width: 90px;
            height: 90px;
            font-size: 50px;
            bottom: -45px;
          }
          .member-name-glam {
            font-size: 22px;
          }
          .member-id-glam {
            font-size: 14px;
          }
          .card-glam-details {
            padding-top: 60px;
            padding: 0 15px;
          }
          .detail-row-glam {
            padding: 8px 0;
          }
          .detail-label-glam {
            font-size: 13px;
          }
          .detail-value-glam {
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
};

export default Birthday;

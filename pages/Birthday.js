import React, { useState, useEffect, useCallback } from "react";
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

  const today = new Date();
  const currentMonthIndex = today.getMonth(); // 0-11
  const currentDay = today.getDate(); // วันที่ปัจจุบัน

  // Helper function to get month name (current month in Thai)
  const getMonthName = (monthIndex) => {
    const months = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    return months[monthIndex];
  };

  // Helper function to calculate age from birth date (YYYY-MM-DD format)
  const calculateAge = (isoBirthDate) => {
    if (!isoBirthDate || typeof isoBirthDate !== 'string') {
      return "N/A";
    }
    const today = new Date();
    const birthYear = parseInt(isoBirthDate.substring(0, 4), 10);
    const birthMonth = parseInt(isoBirthDate.substring(5, 7), 10) - 1;
    const birthDay = parseInt(isoBirthDate.substring(8, 10), 10);

    const birthDateObj = new Date(birthYear, birthMonth, birthDay);

    if (isNaN(birthDateObj.getTime())) {
        return "N/A";
    }

    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age;
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

      setCurrentMonthName(getMonthName(currentMonthIndex));

      const filtered = allMembersData.filter(member => {
        if (member.birthDate && typeof member.birthDate === 'string') {
          const birthDateObj = new Date(member.birthDate);
          if (isNaN(birthDateObj.getTime())) {
              return false;
          }
          const monthFromFirestore = birthDateObj.getMonth();
          return monthFromFirestore === currentMonthIndex;
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
  }, [currentUserId, currentMonthIndex]); 

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchBirthdayMembers();
    }
  }, [currentUserId, fetchBirthdayMembers]);

  // --- Calendar Logic ---
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay(); 

  const totalDays = getDaysInMonth(currentYear, currentMonthIndex);
  const firstDayOfWeek = getFirstDayOfMonth(currentYear, currentMonthIndex); 

  // Get birth dates for highlighting in calendar
  const birthdayDatesInMonth = birthdayMembers.map(member =>
    member.birthDate ? new Date(member.birthDate).getDate() : null
  ).filter(day => day !== null);

  const renderCalendarDays = () => {
    const days = [];
    // Fill in leading empty cells (for days from previous month)
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-prev-${i}`} className="calendar-day empty"></div>);
    }

    // Fill in days of the current month
    for (let day = 1; day <= totalDays; day++) {
      const isToday = day === currentDay && currentMonthIndex === new Date().getMonth() && currentYear === new Date().getFullYear();
      const isBirthday = birthdayDatesInMonth.includes(day); // <-- ตรวจสอบวันเกิด
      let className = "calendar-day";
      if (isToday) className += " today";
      if (isBirthday) className += " birthday-highlight"; // <-- เพิ่ม class สำหรับไฮไลท์

      days.push(
        <div key={`day-${day}`} className={className}>
          {day}
        </div>
      );
    }

    // Fill in trailing empty cells (for days from next month) - optional, for full weeks
    // Calculation for remaining cells to ensure a 6-row calendar grid
    const totalCellsRendered = days.length;
    const remainingCells = 42 - totalCellsRendered; // 7 days * 6 rows = 42 cells
    for (let i = 0; i < remainingCells; i++) {
        days.push(<div key={`empty-next-${i}`} className="calendar-day empty"></div>);
    }

    return days;
  };

  return (
    <div className="overall-layout">
      <main className="main-content">
        {/* ปรับการจัดวาง page-title-text ให้อยู่ฝั่งซ้าย */}
        <h2 className="page-title-text-left">
          วันเกิดสมาชิกประจำเดือน: {currentMonthName}
        </h2>
        <hr className="title-separator" />

        <div className="top-section-grid">
          {/* Top-Left: Summary Card */}
          <div className="birthday-summary-section">
            <div className="summary-card">
              <span className="summary-icon">🎉</span>
              <div className="summary-text">
                <h3>
                  สมาชิกเกิดในเดือน{" "}
                  <span className="highlight-month">{currentMonthName}</span> {currentYear}
                </h3>
                <p className="total-count">{birthdayMembers.length} คน</p>
              </div>
            </div>
          </div>

          {/* Top-Right: Calendar Widget */}
          <div className="calendar-widget-container">
            <div className="calendar-header">
              <h3>{currentMonthName} {currentYear}</h3>
            </div>
            <div className="calendar-weekdays">
              <span>อา</span>
              <span>จ</span>
              <span>อ</span>
              <span>พ</span>
              <span>พฤ</span>
              <span>ศ</span>
              <span>ส</span>
            </div>
            <div className="calendar-days-grid">
              {renderCalendarDays()}
            </div>
          </div>
        </div>

        {/* Bottom Section: Birthday Members Table */}
        <div className="bottom-section-table">
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
                <div className="birthday-table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>ลำดับ</th>
                        <th>ชื่อสมาชิก</th>
                        <th>วันเกิด</th>
                        <th>อายุ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {birthdayMembers.map((member, index) => {
                        const birthDayOfMonth = member.birthDate ? new Date(member.birthDate).getDate() : null;
                        const isMemberBirthdayToday = 
                          birthDayOfMonth === currentDay && 
                          currentMonthIndex === new Date(member.birthDate).getMonth();

                        return (
                          <tr 
                            key={member.id} 
                            className={`member-row ${isMemberBirthdayToday ? 'today-birthday-row' : ''}`}
                          >
                            <td>{index + 1}</td>
                            <td className="member-name-cell">{member.name}</td>
                            <td>
                              {member.birthDate ? new Date(member.birthDate).toLocaleDateString('th-TH', {
                                  day: 'numeric',
                                  month: 'long',
                                }) : "ไม่ระบุ"}
                            </td>
                            <td>{calculateAge(member.birthDate)} ปี</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <style jsx>{`
        /* --- Base & Layout --- */
        .overall-layout {
          height: 100%;
          width: 100%;
        }

        .main-content {
          padding: 20px;
          background-color: #f7f9fc;
          border-radius: 12px;
          overflow-y: auto;
          font-family: 'Kanit', sans-serif;
          color: #333;
          font-size: 14px; /* กำหนด font-size พื้นฐาน */
        }

        /* Page Title ที่อยู่ฝั่งซ้าย */
        .page-title-text-left { 
          color: #2c3e50;
          font-size: 18px; /* ขนาดหัวข้อใหญ่สุดตามที่ระบุ */
          margin-bottom: 15px; 
          font-weight: 700;
          display: flex; 
          align-items: center;
          justify-content: flex-start; /* จัดให้อยู่ฝั่งซ้าย */
          text-align: left; 
          border-bottom: 2px solid #e0e6ed;
          padding-bottom: 12px;
        }

        .title-separator {
          display: none;
        }

        /* --- Top Section Grid (Summary Card + Calendar) --- */
        .top-section-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 20px;
          margin-bottom: 20px;
        }

        /* --- Birthday Summary Section --- */
        .birthday-summary-section {
          display: flex;
          justify-content: center;
        }

        .summary-card {
          background: linear-gradient(135deg, #74ebd5, #9face6);
          color: #fff;
          padding: 15px 20px;
          border-radius: 12px;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 220px;
          max-width: 100%;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        .summary-card::before {
          content: '';
          position: absolute;
          top: -15px;
          right: -15px;
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          transform: rotate(45deg);
        }

        .summary-card::after {
          content: '';
          position: absolute;
          bottom: -15px;
          left: -15px;
          width: 45px;
          height: 45px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          transform: rotate(-30deg);
        }

        .summary-icon {
          font-size: 30px; /* ขนาด icon */
          line-height: 1;
          z-index: 1;
        }

        .summary-text h3 {
          margin: 0;
          font-size: 14px; /* ปรับขนาดเป็น 14px */
          font-weight: 600;
          line-height: 1.3;
          text-shadow: 0.5px 0.5px 2px rgba(0, 0, 0, 0.1);
        }

        .highlight-month {
          font-weight: 800;
          color: #ffee58;
          text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.2);
        }

        .total-count {
          font-size: 24px; /* ปรับขนาดตัวเลขจำนวน */
          font-weight: 900;
          margin-top: 3px;
          color: #fff;
          text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
          animation: popIn 0.8s ease-out;
        }

        /* --- Calendar Widget --- */
        .calendar-widget-container {
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1); 
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            border: 1px solid #e0e6ed; 
        }

        .calendar-header {
            width: 100%;
            text-align: center;
            margin-bottom: 20px; 
            padding-bottom: 10px;
            border-bottom: 2px solid #a8dadc; 
        }

        .calendar-header h3 {
            font-size: 18px; /* ปรับขนาดเป็น 18px */
            color: #1d3557; 
            margin: 0;
            font-weight: 600;
        }

        .calendar-weekdays {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            width: 100%;
            text-align: center;
            font-weight: 700;
            color: #457b9d; 
            margin-bottom: 10px;
            padding-bottom: 5px;
        }

        .calendar-weekdays span {
            padding: 5px 0;
            font-size: 14px; /* ปรับขนาดเป็น 14px */
        }

        .calendar-days-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 8px; 
            width: 100%;
        }

        .calendar-day {
            display: flex;
            align-items: center;
            justify-content: center;
            aspect-ratio: 1 / 1;
            font-size: 14px; /* ปรับขนาดเป็น 14px */
            font-weight: 500;
            color: #333;
            border-radius: 50%; 
            transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
            cursor: default; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.05); 
        }

        .calendar-day:hover:not(.empty):not(.today):not(.birthday-highlight) {
            background-color: #f1faee; 
            transform: translateY(-1px);
        }

        .calendar-day.empty {
            background-color: #f8f9fa; 
            color: #adb5bd; 
            box-shadow: none;
        }

        .calendar-day.today {
            background-color: #457b9d; 
            color: #fff;
            font-weight: 700;
            box-shadow: 0 4px 10px rgba(69, 123, 157, 0.4); 
            border: 2px solid #a8dadc; 
            transform: scale(1.05); 
        }

        .calendar-day.birthday-highlight {
            background-color: #ffb3b3; /* สีชมพูอ่อนสำหรับวันเกิด */
            color: #a82a2a; /* สีแดงเข้ม */
            font-weight: 700;
            position: relative;
            box-shadow: 0 4px 10px rgba(255, 179, 179, 0.5); /* เงาเน้นวันเกิด */
            border: 2px solid #ff7b7b; /* กรอบสีชมพูเข้ม */
        }

        .calendar-day.birthday-highlight::after {
            content: '🎂';
            position: absolute;
            bottom: 2px;
            right: 2px;
            font-size: 9px; /* ขนาดไอคอนเค้ก */
            line-height: 1;
            opacity: 0.9;
        }
        
        /* Combine today and birthday highlight */
        .calendar-day.today.birthday-highlight {
            background-color: #e63946; /* สีแดงเข้มสำหรับวันนี้ที่เป็นวันเกิด */
            color: #fff;
            border: 2px solid #f1faee; /* กรอบสีขาว */
            box-shadow: 0 6px 15px rgba(230, 57, 70, 0.6); /* เงาเน้นพิเศษ */
        }

        /* --- Bottom Section (Birthday Table) --- */
        .bottom-section-table {
          width: 100%;
        }

        .birthday-table-container {
          background-color: #fff;
          border-radius: 12px;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12); 
          overflow-x: auto;
          padding: 15px; 
          min-height: 250px;
          border: 1px solid #e0e6ed; 
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 500px;
        }

        th, td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #e0e6ed;
        }

        th {
          background-color: #eaf6ff;
          color: #2c3e50;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 14px; /* ขนาดหัวตาราง 18px */
          position: sticky; 
          top: 0;
          z-index: 10;
        }

        tbody tr:nth-child(even) { 
          background-color: #f9fcff;
        }

        tbody tr:last-child td {
          border-bottom: none;
        }

        .member-row {
          transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        }

        .member-row:hover {
          background-color: #eaf2f7; 
          transform: translateY(-2px); 
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); 
        }

        .member-name-cell {
          font-weight: 600;
          color: #34495e;
        }

        td {
          color: #555;
          font-size: 12px; /* ขนาดข้อมูลในตาราง 14px */
        }

        .today-birthday-row {
            background-color: #ffe0b2; 
            font-weight: 600;
            color: #d35400;
            border-left: 5px solid #ff9800; 
            animation: pulse-border 1.5s infinite alternate; 
        }

        .today-birthday-row .member-name-cell {
            color: #e65100; 
        }

        @keyframes pulse-border {
            0% { border-color: #ff9800; }
            100% { border-color: #ffa726; }
        }

        /* --- Status Messages --- */
        .status-message {
          text-align: center;
          padding: 30px;
          font-size: 14px; /* ปรับขนาดเป็น 14px */
          color: #6c757d;
          background-color: #ebf2f7;
          border-radius: 10px;
          margin-top: 30px;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .spinner {
          border: 4px solid #e0e0e0;
          border-top: 4px solid #007bff;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* --- Responsive Adjustments --- */
        @media (max-width: 1200px) {
            .top-section-grid {
                grid-template-columns: 1fr; 
            }
            .summary-card,
            .calendar-widget-container {
                max-width: 450px; 
                margin: 0 auto; 
            }
        }

        @media (max-width: 1024px) {
          .main-content {
            padding: 15px;
            font-size: 13px;
          }
          .page-title-text-left { 
            font-size: 16px; 
            padding-bottom: 10px;
          }
          .summary-card {
            padding: 12px 15px;
          }
          .summary-icon {
            font-size: 26px; /* ลดขนาด icon */
          }
          .summary-text h3 {
            font-size: 13px; /* ลดขนาดเป็น 13px */
          }
          .total-count {
            font-size: 22px; /* ลดขนาดตัวเลขจำนวน */
          }
          .calendar-header h3 {
            font-size: 16px; /* ลดขนาดเป็น 16px */
          }
          .calendar-weekdays span {
            font-size: 12px; /* ลดขนาดเป็น 12px */
          }
          .calendar-day {
            font-size: 13px; /* ลดขนาดเป็น 13px */
          }
          .calendar-day.birthday-highlight::after {
            font-size: 8px; /* ลดขนาด icon เค้ก */
          }
          th, td {
            padding: 10px 12px;
            font-size: 13px;
          }
          th {
              font-size: 16px; 
          }
          .status-message {
            font-size: 13px; /* ลดขนาดเป็น 13px */
          }
        }

        @media (max-width: 768px) {
          .main-content {
            padding: 10px;
            font-size: 12px;
          }
          .page-title-text-left { 
            font-size: 14px; 
            padding-bottom: 8px;
          }
          .summary-card {
            padding: 10px 12px;
            gap: 8px;
          }
          .summary-icon {
            font-size: 22px;
          }
          .summary-text h3 {
            font-size: 12px;
          }
          .total-count {
            font-size: 18px;
          }
          .calendar-widget-container {
            padding: 10px;
          }
          .calendar-header h3 {
            font-size: 14px;
          }
          .calendar-weekdays span {
            font-size: 10px;
          }
          .calendar-day {
            font-size: 11px;
            border-radius: 50%; 
          }
          .calendar-day.birthday-highlight::after {
            font-size: 6px;
          }
          th, td {
            padding: 8px 10px;
            font-size: 12px;
          }
          th {
              font-size: 14px;
          }
          .status-message {
            font-size: 12px;
          }
          .spinner {
            width: 25px;
            height: 25px;
          }
        }

        @media (max-width: 480px) {
          .main-content {
            padding: 8px;
          }
          .page-title-text-left { 
            font-size: 12px; 
          }
          .summary-card {
            padding: 8px 10px;
          }
          .summary-icon {
            font-size: 20px;
          }
          .summary-text h3 {
            font-size: 11px;
          }
          .total-count {
            font-size: 16px;
          }
          .calendar-header h3 {
            font-size: 12px;
          }
          .calendar-weekdays span {
            font-size: 9px;
          }
          .calendar-day {
            font-size: 10px;
          }
          th, td {
            font-size: 10px;
          }
          th {
              font-size: 11px;
          }
          table {
            min-width: 320px; /* ลด min-width ลงอีกสำหรับหน้าจอที่เล็กมากๆ */
          }
        }
      `}</style>
    </div>
  );
};

export default Birthday;

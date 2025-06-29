import React, { useState, useEffect, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import { db } from "../lib/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";

// Array ของสีที่จะใช้สุ่มสำหรับจุดสีใน Pop-up
const birthdayColors = [
  "#FFC3A0", // Peach
  "#FF6B6B", // Red-Orange
  "#FFE66D", // Yellow
  "#8DCCAD", // Green
  "#A2D2FF", // Light Blue
  "#C0B2E5", // Lavender
  "#FFABAB", // Pink
  "#CCEEFF", // Lighter Blue
];

// Helper function เพื่อสุ่มสี
const getRandomBirthdayColor = () => {
  const randomIndex = Math.floor(Math.random() * birthdayColors.length);
  return birthdayColors[randomIndex];
};

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

  // useRef สำหรับ Client-side cache เพื่อป้องกันการดึงข้อมูล Firebase ซ้ำซ้อน
  const cachedBirthdayData = useRef({});

  // Helper function to get month name (current month in Thai)
  const getMonthName = (monthIndex) => {
    const months = [
      "มกราคม",
      "กุมภาพันธ์",
      "มีนาคม",
      "เมษายน",
      "พฤษภาคม",
      "มิถุนายน",
      "กรกฎาคม",
      "สิงหาคม",
      "กันยายน",
      "ตุลาคม",
      "พฤศจิกายน",
      "ธันวาคม",
    ];
    return months[monthIndex];
  };

  // Helper function to get day name (Thai)
  const getDayName = (dayIndex, full = false) => {
    const fullNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
    const shortNames = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
    return full ? fullNames[dayIndex] : shortNames[dayIndex];
  };

  // Helper function to calculate age from birth date (YYYY-MM-DD format)
  const calculateAge = (isoBirthDate) => {
    if (!isoBirthDate || typeof isoBirthDate !== "string") {
      return "N/A";
    }
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
          Swal.fire("ข้อผิดพลาด", "ไม่พบข้อมูลผู้ใช้ในระบบ", "warning");
        }
      } catch (error) {
        console.error("Error fetching user data: ", error);
        Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถดึงข้อมูลผู้ใช้ได้", "error");
      }
    } else {
      Swal.fire("กรุณาเข้าสู่ระบบ", "ไม่พบข้อมูลผู้ใช้", "warning");
    }
  };

  // Fetch birthday members for the current month with caching logic
  const fetchBirthdayMembers = useCallback(async () => {
    if (!currentUserId) {
      setBirthdayMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setCurrentMonthName(getMonthName(currentMonthIndex)); // Set month name before fetching

    const cacheKey = `${currentYear}-${currentMonthIndex}`; // เช่น "2025-5" สำหรับเดือนมิถุนายน

    // ตรวจสอบว่ามีข้อมูลใน cache สำหรับเดือน/ปีนี้แล้วหรือไม่
    if (cachedBirthdayData.current[cacheKey]) {
      console.log(`Using cached birthday data for ${cacheKey}`);
      setBirthdayMembers(cachedBirthdayData.current[cacheKey]);
      setIsLoading(false);
      return; // ถ้ามีข้อมูลใน cache ให้ออกจากการทำงานทันที
    }

    // ถ้าไม่มีใน cache ให้ดึงข้อมูลจาก Firebase
    try {
      const membersRef = collection(db, `users/${currentUserId}/Members`);
      const allMembersSnapshot = await getDocs(membersRef);
      const allMembersData = allMembersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // เพิ่มสีแบบสุ่มเมื่อดึงข้อมูลวันเกิด (สำหรับ Pop-up)
        color: getRandomBirthdayColor(),
      }));

      const filtered = allMembersData.filter((member) => {
        if (member.birthDate && typeof member.birthDate === "string") {
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
        const dayA = a.birthDate ? parseInt(a.birthDate.split("-")?.[2], 10) : 0;
        const dayB = b.birthDate ? parseInt(b.birthDate.split("-")?.[2], 10) : 0;
        return dayA - dayB;
      });

      // เก็บข้อมูลที่ดึงและกรองแล้วลงใน cache
      cachedBirthdayData.current[cacheKey] = filtered;
      setBirthdayMembers(filtered);
    } catch (error) {
      console.error("Error fetching birthday members:", error);
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถดึงข้อมูลวันเกิดสมาชิกได้", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, currentMonthIndex, currentYear]); // currentYear ถูกเพิ่มเข้ามาใน dependencies สำหรับ cacheKey

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

  // Get members for each day
  const getMembersForDay = (day) => {
    return birthdayMembers.filter((member) => {
      if (member.birthDate && typeof member.birthDate === "string") {
        return new Date(member.birthDate).getDate() === day;
      }
      return false;
    });
  };

  const handleDayClick = (day) => {
    const membersOnThisDay = getMembersForDay(day);
    if (membersOnThisDay.length > 0) {
      // Build the HTML for the list of members
      const membersHtml = membersOnThisDay
        .map(
          (member) => `
        <li style="font-size: 1em; margin-bottom: 5px; color: #555; display: flex; align-items: center;">
          <span style="display:inline-block; min-width: 10px; height: 10px; border-radius: 50%; background-color: ${
            member.color || "#457b9d"
          }; margin-right: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></span>
          <b>${member.name}</b> (${calculateAge(member.birthDate)} ปี)
        </li>
      `
        )
        .join("");

      Swal.fire({
        title: `🎉 วันที่ ${day} ${currentMonthName} ${currentYear} 🎉`,
        html: `
            <p style="font-size: 1.1em; color: #333; margin-bottom: 10px;">มีสมาชิกวันเกิด:</p>
            <ul style="list-style-type: none; padding: 0; margin: 0; text-align: left;">
              ${membersHtml}
            </ul>
          `,
        icon: "success",
        showCloseButton: true,
        closeButtonHtml: "&times;",
        confirmButtonText: "ปิด",
        showConfirmButton: false,
        customClass: {
          popup: "birthday-swal2-popup",
          title: "birthday-swal2-title",
          htmlContainer: "birthday-swal2-html-container",
          closeButton: "birthday-swal2-close-button",
        },
        showClass: {
          popup: "animate__animated animate__fadeInDown",
        },
        hideClass: {
          popup: "animate__animated animate__fadeOutUp",
        },
      });
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    // Fill in leading empty cells (for days from previous month)
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-prev-${i}`} className="calendar-day empty"></div>);
    }

    // Fill in days of the current month
    for (let day = 1; day <= totalDays; day++) {
      const isToday =
        day === currentDay &&
        currentMonthIndex === new Date().getMonth() &&
        currentYear === new Date().getFullYear();

      const membersOnThisDay = getMembersForDay(day);
      const hasBirthday = membersOnThisDay.length > 0;

      let className = "calendar-day";
      if (isToday) className += " today";
      if (hasBirthday) className += " has-birthday";

      days.push(
        <div
          key={`day-${day}`}
          className={className}
          onClick={() => hasBirthday && handleDayClick(day)}
          style={{ cursor: hasBirthday ? "pointer" : "default" }}
        >
          {day}
          {/* Reverted to Gift Box Emoji */}
          {hasBirthday && (
            <span className="birthday-gift-icon">
              🎁
            </span>
          )}
        </div>
      );
    }

    // Fill in trailing empty cells (for days from next month) - optional, for full weeks
    const totalCellsRendered = days.length;
    const remainingCells = 42 - totalCellsRendered;
    for (let i = 0; i < remainingCells; i++) {
      days.push(<div key={`empty-next-${i}`} className="calendar-day empty"></div>);
    }

    return days;
  };

  return (
    <div className="overall-layout">
      <main className="main-content">
        <h2 className="page-title-text-left">
          วันเกิดสมาชิกประจำเดือน: {currentMonthName}
        </h2>
        <hr className="title-separator" />

        <div className="top-section-grid">
          <div className="birthday-summary-section">
            <div className="summary-card">
              <span className="summary-icon">🎉</span>
              <div className="summary-text">
                <h3>
                  สมาชิกเกิดในเดือน{" "}
                  <span className="highlight-month">{currentMonthName}</span>{" "}
                  {currentYear}
                </h3>
                <p className="total-count">{birthdayMembers.length} คน</p>
                {/* New greeting message */}
                <p className="greeting-message">
                  {birthdayMembers.length > 0
                    ? "ขอให้มีความสุข สุขภาพแข็งแรง เฮงๆ รวยๆ กันถ้วนหน้า!"
                    : "เดือนนี้ยังไม่มีสมาชิกวันเกิด... หวังว่าจะมีข่าวดีเร็วๆ นี้!"}
                </p>
              </div>
              {/* Decorative floating balloons */}
              <span className="balloon-decoration balloon-1">🎈</span>
              <span className="balloon-decoration balloon-2">🎈</span>
              <span className="balloon-decoration balloon-3">🎈</span>
            </div>
          </div>

          <div className="calendar-widget-container">
            <div className="calendar-header">
              <h3>
                {currentMonthName} {currentYear}
              </h3>
            </div>
            <div className="calendar-weekdays">
              {/* ใช้ getDayName เพื่อแสดงชื่อวัน */}
              {Array.from({ length: 7 }).map((_, i) => (
                <span key={`weekday-${i}`}>{getDayName(i)}</span>
              ))}
            </div>
            <div className="calendar-days-grid">{renderCalendarDays()}</div>
          </div>
        </div>

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
                        const birthDayOfMonth = member.birthDate
                          ? new Date(member.birthDate).getDate()
                          : null;
                        const isMemberBirthdayToday =
                          birthDayOfMonth === currentDay &&
                          currentMonthIndex ===
                            new Date(member.birthDate).getMonth();

                        return (
                          <tr
                            key={member.id}
                            className={`member-row ${
                              isMemberBirthdayToday ? "today-birthday-row" : ""
                            }`}
                          >
                            <td>{index + 1}</td>
                            <td className="member-name-cell">{member.name}</td>
                            <td>
                              {member.birthDate
                                ? new Date(member.birthDate).toLocaleDateString(
                                    "th-TH",
                                    {
                                      day: "numeric",
                                      month: "long",
                                    }
                                  )
                                : "ไม่ระบุ"}
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
          box-sizing: border-box;
        }

        .main-content {
          padding: 20px;
          background-color: #f7f9fc;
          border-radius: 12px;
          overflow-y: auto;
          font-family: "Kanit", sans-serif;
          color: #333;
          font-size: 14px;
          box-sizing: border-box;
        }

        /* Page Title ที่อยู่ฝั่งซ้าย */
        .page-title-text-left {
          color: #2c3e50;
          font-size: 18px;
          margin-bottom: 15px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: flex-start;
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
          width: 100%;
          position: relative;
          overflow: hidden;
          min-height: 100px;
        }

        .summary-card::before {
          content: "";
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
          content: "";
          position: absolute;
          bottom: -15px;
          left: -15px;
          width: 45px;
          height: 45px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          transform: rotate(-30deg);
        }

        /* สไตล์ลูกโป่งตกแต่ง */
        .balloon-decoration {
          position: absolute;
          font-size: 28px;
          opacity: 0.7;
          z-index: 0;
          filter: blur(0.5px);
          animation: floatUp 10s infinite ease-in-out alternate;
        }

        .balloon-1 {
          top: 10%;
          left: 5%;
          animation-delay: 0s;
        }

        .balloon-2 {
          bottom: 20%;
          right: 15%;
          font-size: 24px;
          animation-delay: 3s;
        }

        .balloon-3 {
          top: 30%;
          right: 5%;
          font-size: 30px;
          animation-delay: 6s;
        }

        /* Keyframes สำหรับ Animation ลอยขึ้นลง */
        @keyframes floatUp {
          0% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.7;
          }
          50% {
            transform: translateY(-10px) rotate(5deg);
            opacity: 0.8;
          }
          100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.7;
          }
        }

        .summary-icon {
          font-size: 30px;
          line-height: 1;
          z-index: 1;
        }

        .summary-text h3 {
          margin: 0;
          font-size: 14px;
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
          font-size: 24px;
          font-weight: 900;
          margin-top: 3px;
          color: #fff;
          text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
          animation: popIn 0.8s ease-out;
        }

        /* สไตล์สำหรับคำอวยพรใหม่ */
        .greeting-message {
          font-size: 11px;
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.9);
          text-shadow: 0.5px 0.5px 2px rgba(0, 0, 0, 0.15);
          line-height: 1.4;
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
          width: 100%;
        }

        .calendar-header {
          width: 100%;
          text-align: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #a8dadc;
        }

        .calendar-header h3 {
          font-size: 18px;
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
          font-size: 14px;
        }

        .calendar-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          width: 100%;
        }

        .calendar-day {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          aspect-ratio: 1 / 1;
          font-size: 14px;
          font-weight: 500;
          color: #333;
          border-radius: 50%;
          transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
          cursor: default;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          position: relative;
          padding-top: 5px;
        }

        .calendar-day.empty {
          background-color: #f8f9fa;
          color: #adb5bd;
          box-shadow: none;
        }

        /* สไตล์สำหรับวันที่ปัจจุบัน */
        .calendar-day.today {
          background-color: #457b9d;
          color: #fff;
          font-weight: 700;
          box-shadow: 0 4px 10px rgba(69, 123, 157, 0.4);
          border: 2px solid #a8dadc;
          transform: scale(1.05);
        }

        /* Style สำหรับวันที่มีวันเกิด (แทน birthday-highlight) */
        .calendar-day.has-birthday {
          background-color: #fff0f5;
          border: 1px solid #ffccd5;
          color: #e63946;
          font-weight: 600;
        }

        /* สไตล์สำหรับไอคอนของขวัญ (Emoji) */
        .birthday-gift-icon {
          position: absolute;
          bottom: 5px;
          font-size: 18px; /* ควบคุมขนาดของ emoji */
          line-height: 1;
          left: 50%;
          transform: translateX(-50%);
          z-index: 2;
          pointer-events: none; /* เพื่อให้ยังคลิกที่วันได้ */
          animation: bounceIn 0.8s ease-out forwards;
        }

        /* Keyframes สำหรับ Animation */
        @keyframes bounceIn {
          0% {
            transform: translateX(-50%) scale(0.3);
            opacity: 0;
          }
          50% {
            transform: translateX(-50%) scale(1.1);
            opacity: 1;
          }
          70% {
            transform: translateX(-50%) scale(0.9);
          }
          100% {
            transform: translateX(-50%) scale(1);
            opacity: 1;
          }
        }

        /* เมื่อวันปัจจุบันมีวันเกิด */
        .calendar-day.today.has-birthday {
          background-color: #e63946;
          color: #fff;
          border: 2px solid #f1faee;
          box-shadow: 0 6px 15px rgba(230, 57, 70, 0.6);
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

        th,
        td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #e0e6ed;
        }

        th {
          background-color: #eaf6ff;
          color: #2c3e50;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 13px;
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
          transition: background-color 0.2s ease, transform 0.2s ease,
            box-shadow 0.2s ease;
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
          font-size: 12px;
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
          0% {
            border-color: #ff9800;
          }
          100% {
            border-color: #ffa726;
          }
        }

        /* --- Status Messages --- */
        .status-message {
          text-align: center;
          padding: 30px;
          font-size: 14px;
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
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        /* --- Responsive Adjustments --- */
        @media (max-width: 1200px) {
          .top-section-grid {
            grid-template-columns: 1fr;
          }
          .birthday-summary-section {
            justify-content: stretch;
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
            min-height: 90px;
          }
          .summary-icon {
            font-size: 26px;
          }
          .summary-text h3 {
            font-size: 13px;
          }
          .total-count {
            font-size: 22px;
          }
          .greeting-message {
            font-size: 10px;
          }
          .calendar-header h3 {
            font-size: 16px;
          }
          .calendar-weekdays span {
            font-size: 12px;
          }
          .calendar-day {
            font-size: 13px;
          }
          .balloon-decoration {
            font-size: 24px;
          }
          th,
          td {
            padding: 10px 12px;
            font-size: 13px;
          }
          th {
            font-size: 16px;
          }
          .status-message {
            font-size: 13px;
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
            min-height: 80px;
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
          .greeting-message {
            font-size: 9px;
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
          .birthday-gift-icon {
            font-size: 14px;
            bottom: 3px;
          }
          .balloon-decoration {
            font-size: 20px;
          }
          th,
          td {
            font-size: 12px;
            padding: 8px 10px;
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
          table {
            min-width: 400px;
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
            min-height: 70px;
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
          .greeting-message {
            font-size: 8px;
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
          th,
          td {
            font-size: 10px;
            padding: 6px 8px;
          }
          th {
            font-size: 11px;
          }
          table {
            min-width: 320px;
          }
        }

        /* SweetAlert2 Custom Styles for Birthday Theme */
        .birthday-swal2-popup {
          font-family: 'Kanit', sans-serif !important;
          border-radius: 15px !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2) !important;
          background: linear-gradient(135deg, #a7f3d0, #f0fdf4) !important;
          color: #374151 !important;
          padding: 20px !important;
        }

        .birthday-swal2-title {
          font-size: 1.6em !important;
          font-weight: 700 !important;
          color: #10b981 !important;
          border-bottom: 2px dashed #86efac;
          padding-bottom: 15px;
          margin-bottom: 20px !important;
        }

        .birthday-swal2-html-container {
          font-size: 1.1em !important;
          color: #4b5563 !important;
          text-align: left !important;
          line-height: 1.6;
        }

        .birthday-swal2-close-button {
          color: #999 !important;
          background: none !important;
          border: none !important;
          border-radius: 50% !important;
          width: 28px !important;
          height: 28px !important;
          line-height: 28px !important;
          font-size: 2em !important;
          font-weight: normal !important;
          text-shadow: none !important;
          opacity: 0.6 !important;
          position: absolute !important;
          top: 8px !important;
          right: 8px !important;
          cursor: pointer !important;
          box-shadow: none !important;
          transition: opacity 0.2s ease, color 0.2s ease !important;
        }

        .birthday-swal2-close-button:hover {
          color: #333 !important;
          opacity: 1 !important;
        }

        .swal2-actions {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default Birthday;

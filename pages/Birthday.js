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
  const currentYear = new Date().getFullYear();
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to generate a random hex color
  // This version avoids very light colors that might clash with white text
  const getRandomColor = () => {
    // Generate a random dark color to ensure contrast with white text
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
    // Use substring to parse date parts safely in case of invalid date string format
    const birthYear = parseInt(isoBirthDate.substring(0, 4), 10);
    const birthMonth = parseInt(isoBirthDate.substring(5, 7), 10) - 1; // Month is 0-indexed in JS
    const birthDay = parseInt(isoBirthDate.substring(8, 10), 10);

    const birthDateObj = new Date(birthYear, birthMonth, birthDay);

    // Basic validation for parsed date
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
    // This function expects a 0-indexed month (0 for Jan, 11 for Dec)
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
            console.log("User Data Fetched: Username =", docSnapshot.data().username, "ID =", docSnapshot.id); // For debugging
          } else {
            console.warn("User document is null or undefined.");
            Swal.fire("ข้อผิดพลาด", "ไม่พบข้อมูลผู้ใช้ในระบบ", "error");
          }
        } else {
          console.warn("User data not found for email:", email);
          Swal.fire("ข้อผิดพลาด", "ไม่พบข้อมูลผู้ใช้ในระบบ", "error");
          // Optionally, redirect to login or show more prominent message
        }
      } catch (error) {
        console.error("Error fetching user data: ", error);
        Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถดึงข้อมูลผู้ใช้ได้", "error");
      }
    } else {
      console.warn("No logged-in email found in localStorage."); // For debugging
      Swal.fire("กรุณาเข้าสู่ระบบ", "ไม่พบข้อมูลผู้ใช้", "warning");
      // Optionally, redirect to login
    }
  };

  // Fetch birthday members for the current month
  const fetchBirthdayMembers = useCallback(async () => {
    if (!currentUserId) {
      console.log("Current User ID is null, skipping fetching birthday members."); // For debugging
      setBirthdayMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const membersRef = collection(db, `users/${currentUserId}/Members`);
      console.log(`Attempting to fetch members from: users/${currentUserId}/Members`); // For debugging
      const allMembersSnapshot = await getDocs(membersRef);
      const allMembersData = allMembersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log("All members fetched (raw data):", allMembersData); // For debugging

      const today = new Date();
      const currentMonth = today.getMonth(); // 0-11 (e.g., June is 5)
      setCurrentMonthName(getMonthName(currentMonth));

      const filtered = allMembersData.filter(member => {
        // Ensure birthDate exists and is a string
        if (member.birthDate && typeof member.birthDate === 'string') {
          // Robust date parsing using Date object
          const birthDateObj = new Date(member.birthDate);
          if (isNaN(birthDateObj.getTime())) {
              console.warn(`Failed to parse birthDate for member ${member.name}: ${member.birthDate}. Skipping.`);
              return false; // Filter out invalid dates
          }
          const monthFromFirestore = birthDateObj.getMonth(); // Date object's getMonth() is 0-indexed
          const isBirthdayMonth = monthFromFirestore === currentMonth;
          console.log(`Member: ${member.name}, BirthDate: ${member.birthDate}, Parsed Month: ${monthFromFirestore}, Current JS Month: ${currentMonth}, Is Match: ${isBirthdayMonth}`); // Detailed debugging
          return isBirthdayMonth;
        } else {
          console.warn(`Member ${member.name} has no birthDate or invalid type:`, member.birthDate);
        }
        return false; // Filter out members with invalid or missing birthDate
      });

      // Sort by day of birth
      filtered.sort((a, b) => {
        const dayA = a.birthDate ? parseInt(a.birthDate.split('-')?.[2], 10) : 0;
        const dayB = b.birthDate ? parseInt(b.birthDate.split('-')?.[2], 10) : 0;
        return dayA - dayB;
      });

      setBirthdayMembers(filtered);
      console.log("Filtered Birthday Members for current month:", filtered); // Final filtered data for debugging
    } catch (error) {
      console.error("Error fetching birthday members:", error);
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถดึงข้อมูลวันเกิดสมาชิกได้", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchUserData();
  }, []); // Run once on component mount to get user ID

  useEffect(() => {
    if (currentUserId) {
      fetchBirthdayMembers();
    }
  }, [currentUserId, fetchBirthdayMembers]); // Re-run when currentUserId changes

  return (
    <div className="overall-layout">
      <Sidebar />
      <main className="main-content">
        <h2 className="page-title">วันเกิดสมาชิกประจำเดือน : {currentMonthName}</h2>
        <hr className="title-separator" />

        {/* --- NEW BIRTHDAY SUMMARY CARD JSX --- */}
        <div className="birthday-summary-card">
          {/* summary-icon จะถูกซ่อนด้วย CSS และใช้ pseudo-elements แทน */}
          <div className="summary-icon">🎉</div> {/* ยังคงมีไว้แต่ CSS จะซ่อน */}
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
        {/* --- END NEW BIRTHDAY SUMMARY CARD JSX --- */}

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
                    style={{ background: getRandomColor() }} // Apply random background color
                  >
                    <div className="card-glam-header">
                      <div
                        className="card-glam-avatar"
                        style={{ background: getAvatarRandomColor() }} // Apply random avatar background color
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
          color:rgb(0, 0, 0); /* Deep blue-gray */
          font-size: 18px; /* ปรับขนาดตัวอักษรใหญ่ขึ้น */
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
          background: linear-gradient(135deg, #ff7e5f, #feb47b, #ffda7f); /* ส้ม-พีช-เหลืองทอง */
          color: #fff;
          padding: 18px 15px; /* ลด padding ลงอีก */
          border-radius: 12px; /* ลดความโค้งมนอีก */
          margin-bottom: 25px; /* ลด margin-bottom */
          text-align: center;
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.2) inset; /* ลดเงาให้บางลง */
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px; /* ลดระยะห่างระหว่างองค์ประกอบ */
          position: relative;
          overflow: hidden;
        }

        /* ลดขนาดองค์ประกอบกราฟิก/พื้นหลังลงอีก */
        .birthday-summary-card::before {
          content: '🎉';
          position: absolute;
          top: 5px; /* ปรับตำแหน่ง */
          left: 10px; /* ปรับตำแหน่ง */
          font-size: 45px; /* ลดขนาด icon ลงอีก */
          opacity: 0.1; /* ทำให้โปร่งแสงขึ้นอีก */
          transform: rotate(-20deg);
          pointer-events: none;
        }

        .birthday-summary-card::after {
          content: '🎂';
          position: absolute;
          bottom: 5px; /* ปรับตำแหน่ง */
          right: 10px; /* ปรับตำแหน่ง */
          font-size: 35px; /* ลดขนาด icon ลงอีก */
          opacity: 0.1; /* ทำให้โปร่งแสงขึ้นอีก */
          transform: rotate(15deg);
          pointer-events: none;
        }

        .summary-icon {
          display: none; /* ยังคงซ่อนไอคอนเดิม */
        }

        .summary-details h3 {
          margin: 0 0 3px 0; /* ลด margin-bottom */
          font-size: 16px; /* ลดขนาดฟอนต์ */
          font-weight: 700;
          line-height: 1.2;
          text-shadow: 0.5px 0.5px 2px rgba(0, 0, 0, 0.2); /* ลดเงาข้อความ */
        }

        .current-month-highlight {
          font-weight: 900;
          font-size: 1.1em; /* ลดขนาดใหญ่ขึ้นอีก */
          color: #ffeb3b;
          text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3); /* ลดเงาข้อความ */
          display: block;
          margin-top: 2px; /* ลดระยะห่าง */
        }

        .total-birthdays {
          font-size: 13px; /* ลดขนาดฟอนต์ */
          margin-top: 8px; /* ลด margin-top */
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
          display: flex;
          align-items: baseline;
          gap: 5px; /* ลดระยะห่าง */
        }

        .total-birthdays strong {
          font-size: 22px; /* ลดขนาดตัวเลขให้เล็กลงมาก */
          font-weight: 900;
          color: #da190b;
          text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.4); /* ลดเงาข้อความ */
          line-height: 1;
          animation: pulse 1.5s infinite;
        }

        /* Keyframes สำหรับ animation ของตัวเลขจำนวนสมาชิก (ยังคงเดิม) */
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.06); /* ลดการขยายตัวให้น้อยลงอีก */
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
          /* Default: 3 columns, adjust minmax for smaller cards */
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px; /* Adjust gap between cards */
          padding-top: 0px;
        }

        .birthday-member-card-glam {
          /* BACKGROUND REMOVED TO ALLOW INLINE STYLE */
          border-radius: 20px; /* Reduced border-radius */
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1), /* Slightly reduced shadow */
                        0 0 0 1px rgba(255, 255, 255, 0.5) inset;
          overflow: hidden;
          transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center; /* Center align text content */
          padding-bottom: 20px; /* Reduced bottom padding */
        }

        .birthday-member-card-glam:hover {
          transform: translateY(-8px) scale(1.01); /* Reduced lift and scale on hover */
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2),
                        0 0 0 2px rgba(255, 255, 255, 0.7) inset;
        }

        .card-glam-header {
          width: 100%;
          background: linear-gradient(145deg, rgba(255, 221, 193, 0.5), rgba(255, 192, 203, 0.5)); /* Slightly transparent overlay for background color to show */
          padding: 40px 15px 60px 15px; /* Reduced padding */
          border-bottom-left-radius: 35% 25px; /* Adjusted curves */
          border-bottom-right-radius: 35% 25px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-bottom: 25px; /* Reduced margin */
        }

        .card-glam-avatar {
          width: 90px; /* Reduced avatar size */
          height: 90px;
          /* BACKGROUND REMOVED TO ALLOW INLINE STYLE */
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 50px; /* Reduced Emoji size */
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2), /* Reduced shadow */
                        0 0 0 4px rgba(255, 255, 255, 0.8);
          position: absolute;
          bottom: -45px; /* Adjusted position */
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
          color: #fff; /* Keep text color white for better contrast with random backgrounds */
          font-size: 22px; /* Reduced name font size */
          font-weight: 800;
          margin-top: -15px; /* Adjusted margin */
          position: relative;
          z-index: 11;
          text-shadow: 1px 1px 3px rgba(0,0,0,0.3);
        }

        .card-glam-details {
          width: 100%;
          padding: 10px 20px; /* Reduced side padding */
          padding-top: 35px; /* Reduced top padding here */
        }

        .detail-row-glam {
          display: flex;
          flex-direction: column; /* Changed to column for centering */
          align-items: center; /* Center horizontally */
          padding: 8px 0; /* Reduced padding */
          border-bottom: 1px dashed #f5f5f5; /* Dashed border for softer look */
        }
        .detail-row-glam:last-child {
          border-bottom: none;
        }

        .detail-label-glam {
          font-weight: 600;
          color:rgb(13, 37, 61);
          font-size: 13px; /* Reduced label font size */
          margin-bottom: 3px; /* Added spacing between label and value */
          margin-right: 0; /* Removed previous margin-right */
        }

        .detail-value-glam {
          color: #333;
          font-size: 14px; /* Reduced value font size */
          text-align: center; /* Center align value */
          flex-grow: 1;
          word-break: break-word; /* Prevent overflow for long text */
        }

        .age-highlight-glam {
          font-weight: 700;
          color:rgb(247, 39, 16);
          font-size: 1.1em; /* Slightly reduced size */
          letter-spacing: 0.2px;
        }

        .date-highlight-glam {
          font-weight: 600;
          color:rgb(18, 31, 24);
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
        @media (min-width: 1600px) { /* 4 columns for very large screens */
            .birthday-grid {
                grid-template-columns: repeat(4, 1fr);
            }
        }

        @media (max-width: 1400px) { /* Adjust for typical large desktop screens (often fits 3-4 columns) */
            .birthday-grid {
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 18px;
            }
            .page-title {
                font-size: 26px;
            }
        }

        @media (max-width: 1200px) { /* Adjust for laptops and larger tablets (often fits 3 columns) */
            .birthday-grid {
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); /* Keep trying for 3-4, but allows fewer */
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

        @media (max-width: 1024px) { /* Tablets (portrait) */
          .main-content {
            padding: 20px;
          }
          .page-title {
            font-size: 24px;
          }
          .birthday-grid {
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); /* Can still fit 3, or 2 large */
            gap: 15px;
          }
        }

        @media (max-width: 768px) { /* Mobile & Small Tablets */
          .overall-layout {
            grid-template-columns: 1fr; /* Sidebar collapses or becomes responsive */
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
          /* Responsive adjustments for new summary card */
          .birthday-summary-card {
            padding: 15px 12px; /* ลด padding อีก */
            border-radius: 10px; /* ลดความโค้งมนอีก */
          }
          .birthday-summary-card::before {
            font-size: 35px; /* ลดขนาด icon */
            top: 5px;
            left: 8px;
          }
          .birthday-summary-card::after {
            font-size: 28px; /* ลดขนาด icon */
            bottom: 5px;
            right: 8px;
          }
          .summary-details h3 {
            font-size: 14px; /* ลดขนาดฟอนต์ */
          }
          .current-month-highlight {
            font-size: 1em; /* ลดขนาด */
          }
          .total-birthdays {
            font-size: 12px; /* ลดขนาดฟอนต์ */
            gap: 4px;
          }
          .total-birthdays strong {
            font-size: 18px; /* ลดขนาดตัวเลข */
          }
          /* End responsive adjustments for new summary card */

          .birthday-grid {
            grid-template-columns: 1fr; /* Single column on mobile */
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
            padding-top: 40px; /* Adjusted for mobile view */
          }
        }

        @media (max-width: 480px) {
          .birthday-summary-card {
            padding: 10px 8px; /* ลด padding ลงไปอีก */
            margin-bottom: 20px;
          }
          .birthday-summary-card::before {
            font-size: 30px; /* ลดขนาด icon */
          }
          .birthday-summary-card::after {
            font-size: 24px; /* ลดขนาด icon */
          }
          .summary-details h3 {
            font-size: 12px; /* ลดขนาดฟอนต์ */
          }
          .current-month-highlight {
            font-size: 0.9em; /* ลดขนาด */
          }
          .total-birthdays {
            font-size: 10px; /* ลดขนาดฟอนต์ */
          }
          .total-birthdays strong {
            font-size: 16px; /* ลดขนาดตัวเลข */
          }
        }
      `}</style>
    </div>
  );
};

export default Birthday;

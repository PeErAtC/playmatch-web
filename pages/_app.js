// pages/_app.js
import React from 'react';
import Sidebar from './components/sidebar'; // ตรวจสอบพาธให้ถูกต้อง
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebaseConfig'; // ตรวจสอบพาธให้ถูกต้อง
import { Menu } from 'lucide-react'; // Import the Menu icon (hamburger)

function MyApp({ Component, pageProps }) {
  const [birthDayCount, setBirthDayCount] = useState(0);
  const [userIdForSidebar, setUserIdForSidebar] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // เริ่มต้นให้ sidebar ปิดอยู่บนมือถือ

  // Function to toggle sidebar visibility
  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  // Function to fetch user ID (can be reused)
  useEffect(() => {
    const fetchUserId = async () => {
      const email = localStorage.getItem("loggedInEmail");
      if (email) {
        try {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            setUserIdForSidebar(querySnapshot.docs[0].id);
          }
        } catch (error) {
          console.error("Error fetching user ID for sidebar:", error);
        }
      }
    };
    fetchUserId();
  }, []);

  // Function to fetch birthday count for sidebar
  useEffect(() => {
    const fetchSidebarBirthdayCount = async () => {
      if (!userIdForSidebar) {
        setBirthDayCount(0); // Reset if no user
        return;
      }
      try {
        const membersRef = collection(db, `users/${userIdForSidebar}/Members`);
        const allMembersSnapshot = await getDocs(membersRef);
        const today = new Date();
        const currentMonth = today.getMonth();

        const count = allMembersSnapshot.docs.filter(doc => {
          const member = doc.data();
          if (member.birthDate && typeof member.birthDate === 'string') {
            const birthDateObj = new Date(member.birthDate);
            return !isNaN(birthDateObj.getTime()) && birthDateObj.getMonth() === currentMonth;
          }
          return false;
        }).length;
        setBirthDayCount(count);
      } catch (error) {
        console.error("Error fetching sidebar birthday count:", error);
      }
    };

    if (userIdForSidebar) {
      fetchSidebarBirthdayCount();
    }
  }, [userIdForSidebar]); // Re-fetch when userIdForSidebar changes

  // ตั้งค่า isSidebarOpen เป็น true หากอยู่บน Desktop (หน้าจอกว้างกว่า 768px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsSidebarOpen(true); // เปิด sidebar บน desktop
      } else {
        setIsSidebarOpen(false); // ปิด sidebar บน mobile
      }
    };

    // ตั้งค่า initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  return (
    <div className="app-layout">
      {/* ส่ง isSidebarOpen และ toggleSidebar ไปให้ Sidebar */}
      <Sidebar birthDayCount={birthDayCount} isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <main className="app-main-content">
        {/* Hamburger button for mobile */}
        <button className="sidebar-toggle-button" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
        <Component {...pageProps} />
      </main>

      <style jsx global>{`
        html, body, #__next {
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden; /* ป้องกัน scrollbar ซ้อนกัน */
        }

        .app-layout {
          display: flex; /* ใช้ flexbox เพื่อวาง Sidebar และเนื้อหาข้างกัน */
          height: 100vh; /* ทำให้ container สูงเต็มหน้าจอ */
          width: 100vw; /* ทำให้ container กว้างเต็มหน้าจอ */
          overflow: hidden; /* ป้องกัน scrollbar รวม */
        }

        .app-main-content {
          flex-grow: 1; /* ทำให้เนื้อหาหลักกินพื้นที่ที่เหลือทั้งหมด */
          overflow-y: auto; /* เปิดใช้งาน scrollbar เฉพาะส่วนเนื้อหาหลัก */
          background-color: #e8f0f7; /* สีพื้นหลังของเนื้อหาหลัก */
          position: relative; /* สำหรับตำแหน่งของ toggle button */
        }

        /* Sidebar toggle button (mobile only) */
        .sidebar-toggle-button {
          position: fixed; /* ใช้ fixed เพื่อให้อยู่ด้านบนเสมอ */
          top: 15px;
          left: 15px;
          background: #007bff;
          color: white;
          border: none;
          padding: 10px;
          border-radius: 5px;
          cursor: pointer;
          z-index: 10; /* ให้ปุ่มอยู่เหนือเนื้อหา */
          display: none; /* ซ่อนไว้บน desktop */
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }

        .sidebar-toggle-button:hover {
            background: #0056b3;
        }

        /* Media query for mobile screens */
        @media (max-width: 768px) {
          .app-layout {
            /* ไม่ต้องเปลี่ยน display เป็น block ครับ ให้คง flex ไว้ */
            /* แต่ main-content จะต้องกินพื้นที่เต็ม */
          }

          .sidebar-toggle-button {
            display: block; /* แสดงปุ่ม toggle บนมือถือ */
          }

          .app-main-content {
            margin-left: 0; /* ตรวจสอบให้แน่ใจว่าไม่มี margin ซ้ายค้างอยู่ */
            width: 100%; /* เนื้อหาหลักกินพื้นที่เต็ม */
          }
        }

        /* --- Global styles to reset default browser margins/paddings --- */
        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
}

export default MyApp;

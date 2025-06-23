// pages/_app.js
import React from 'react';
import Sidebar from './components/sidebar'; // ตรวจสอบพาธให้ถูกต้อง
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebaseConfig'; // ตรวจสอบพาธให้ถูกต้อง

function MyApp({ Component, pageProps }) {
  const [birthDayCount, setBirthDayCount] = useState(0);
  const [userIdForSidebar, setUserIdForSidebar] = useState(null);

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

  return (
    // เพิ่ม div wrapper และใช้ CSS Grid/Flexbox เพื่อจัด Layout
    <div className="app-layout">
      <Sidebar birthDayCount={birthDayCount} />
      <main className="app-main-content"> {/* ห่อ Component ด้วย <main> */}
        <Component {...pageProps} />
      </main>

      {/* เพิ่ม CSS-in-JS สำหรับ Layout หลัก */}
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
          /* หากคุณมี padding ใน main-content ของ Birthday.js อยู่แล้ว
             อาจจะต้องปรับที่นี่ หรือใน Birthday.js ให้เหมาะสม */
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

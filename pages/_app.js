// pages/_app.js
import React from "react";
import Sidebar from "./components/sidebar";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebaseConfig";
import { Menu } from "lucide-react";
import { useRouter } from "next/router";
import Head from "next/head";

function MyApp({ Component, pageProps }) {
  const [birthDayCount, setBirthDayCount] = useState(0);
  const [userIdForSidebar, setUserIdForSidebar] = useState(null);
  const [packageType, setPackageType] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true); // เพิ่ม state สำหรับการโหลดข้อมูลเริ่มต้น

  const router = useRouter();
  const { pathname } = router;

  const noSidebarPaths = [
    "/",
    "/login",
    "/MatchDetails",
    "/packages",
    "/about",
    "/services",
    "/loginDemo",
  ];

  const showSidebar = !noSidebarPaths.includes(pathname);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  // Function to fetch user ID and package type
  useEffect(() => {
    const checkUserAndFetchPackageType = async () => {
      setLoadingInitialData(true); // ตั้งค่า loading เป็น true ทุกครั้งที่เริ่มดึงข้อมูล
      const email = localStorage.getItem("loggedInEmail");
      if (email) {
        try {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            setUserIdForSidebar(querySnapshot.docs[0].id);
            // ให้ packageType มีค่าเป็น "Basic" ถ้า userData.packageType เป็น undefined/null
            setPackageType(userData.packageType || "Basic");
          } else {
            // Email มีอยู่ใน localStorage แต่ไม่พบผู้ใช้ใน DB, ถือว่าเป็น Basic
            setPackageType("Basic");
          }
        } catch (error) {
          console.error("Error fetching user data for sidebar:", error);
          setPackageType("Basic"); // กรณีเกิดข้อผิดพลาด, ตั้งค่าเป็น Basic
        }
      } else {
        // ไม่มี email ใน localStorage, ถือว่าเป็น Basic หรือยังไม่ได้ Login
        setPackageType("Basic");
      }
      setLoadingInitialData(false); // ตั้งค่า loading เป็น false เมื่อกระบวนการดึงข้อมูลเสร็จสิ้น
    };

    checkUserAndFetchPackageType();
  }, []); // ให้รันครั้งเดียวเมื่อ component mount

  useEffect(() => {
    const fetchSidebarBirthdayCount = async () => {
      if (!userIdForSidebar) {
        setBirthDayCount(0);
        return;
      }
      try {
        const membersRef = collection(db, `users/${userIdForSidebar}/Members`);
        const allMembersSnapshot = await getDocs(membersRef);
        const today = new Date();
        const currentMonth = today.getMonth();

        const count = allMembersSnapshot.docs.filter((doc) => {
          const member = doc.data();
          if (member.birthDate && typeof member.birthDate === "string") {
            const birthDateObj = new Date(member.birthDate);
            return (
              !isNaN(birthDateObj.getTime()) &&
              birthDateObj.getMonth() === currentMonth
            );
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
  }, [userIdForSidebar]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        if (showSidebar) {
          setIsSidebarOpen(true);
        }
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [showSidebar]);

  // แสดง loading หรือ fallback UI ถ้าข้อมูลยังโหลดไม่เสร็จ
  if (loadingInitialData) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#e8f0f7",
          color: "#333",
          fontSize: "1.2rem",
        }}
      >
        Loading application...
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Head>
        <title>Playmatch</title>
        <link
          rel="icon"
          href="/images/Logo.png"
          type="image/png"
          sizes="32x32"
        />
        <link
          rel="icon"
          href="/images/Logo.png"
          type="image/png"
          sizes="16x16"
        />
        <link
          rel="icon"
          href="/images/Logo.png"
          type="image/png"
          sizes="48x48"
        />
        <link rel="apple-touch-icon" href="/images/Logo.png" sizes="180x180" />
        <link rel="shortcut icon" href="/images/Logo.png" type="image/png" />
      </Head>

      {showSidebar && (
        <Sidebar
          birthDayCount={birthDayCount}
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          packageType={packageType}
        />
      )}

      <main className={`app-main-content ${!showSidebar ? "full-width" : ""}`}>
        {showSidebar && (
          <button className="sidebar-toggle-button" onClick={toggleSidebar}>
            <Menu size={24} />
          </button>
        )}
        <Component {...pageProps} />
      </main>

      <style jsx global>{`
        html,
        body,
        #__next {
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }

        .app-layout {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
        }

        .app-main-content {
          flex-grow: 1;
          overflow-y: auto;
          background-color: #e8f0f7;
          position: relative;
        }

        .app-main-content.full-width {
          margin-left: 0 !important;
          width: 100% !important;
        }

        .sidebar-toggle-button {
          position: fixed;
          top: 15px;
          left: 15px;
          background: #007bff;
          color: white;
          border: none;
          padding: 10px;
          border-radius: 5px;
          cursor: pointer;
          z-index: 10;
          display: none;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }

        .sidebar-toggle-button:hover {
          background: #0056b3;
        }

        @media (max-width: 768px) {
          .sidebar-toggle-button {
            display: block;
          }
          .app-main-content {
            padding-top: 70px;
            padding-left: 15px;
            padding-right: 15px;
            padding-bottom: 15px;
          }
        }

        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
}

export default MyApp;

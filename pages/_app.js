// pages/_app.js
import React from "react";
import Sidebar from "./components/sidebar";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebaseConfig";
import { Menu } from "lucide-react";
import { useRouter } from "next/router";
import Head from "next/head";

// --- Import สำหรับ Lottie Animations (Option 3 - นี่คือตัว "ลูกเล่น" ที่คุณต้องการ) ---
import Lottie from "lottie-react";
// **นี่คือการ import ไฟล์ Lottie Animation ของคุณ**
import loadingAnimation from "./lottie/Animation - 1751286565693.json"; //


// --- Import สำหรับ Option 2: react-spinners (คอมเมนต์ไว้ ถ้าคุณจะใช้ Lottie) ---
// import { ClipLoader } from "react-spinners";


function MyApp({ Component, pageProps }) {
  const [birthDayCount, setBirthDayCount] = useState(0);
  const [userIdForSidebar, setUserIdForSidebar] = useState(null);
  const [packageType, setPackageType] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true); //

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

  const showSidebar = !noSidebarPaths.includes(pathname); //

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  // Function to fetch user ID and package type
  useEffect(() => {
    const checkUserAndFetchPackageType = async () => {
      setLoadingInitialData(true); //
      const email = localStorage.getItem("loggedInEmail");
      if (email) {
        try {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            setUserIdForSidebar(querySnapshot.docs[0].id);
            setPackageType(userData.packageType || "Basic"); //
          } else {
            setPackageType("Basic"); //
          }
        } catch (error) {
          console.error("Error fetching user data for sidebar:", error);
          setPackageType("Basic"); //
        }
      } else {
        setPackageType("Basic"); //
      }
      setLoadingInitialData(false); //
    };

    checkUserAndFetchPackageType();
  }, []); //

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
  }, [userIdForSidebar]); //

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        if (showSidebar) {
          setIsSidebarOpen(false);
        }
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [showSidebar]); //

  // แสดง loading หรือ fallback UI ถ้าข้อมูลยังโหลดไม่เสร็จ
  if (loadingInitialData) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#e8f0f7", // สีพื้นหลังที่ดูสบายตา
          flexDirection: "column", // จัดเรียงให้อนิเมชันและข้อความอยู่แนวตั้ง
        }}
      >
        {/*
          *** คุณกำลังใช้ Option 3: Lottie Animations ซึ่งเป็นอนิเมชันที่มีลูกเล่น ***
          *** ถ้าต้องการเปลี่ยนไปใช้แบบอื่น ให้ลบโค้ดส่วนนี้ออกแล้ว uncomment Option อื่นแทน ***
        */}
        <Lottie
          animationData={loadingAnimation} // ไฟล์ Lottie ของคุณ
          loop={true} // เล่นซ้ำ
          autoplay={true} // เริ่มเล่นอัตโนมัติ
          style={{ width: 220, height: 220 }} // ปรับขนาดอนิเมชันตามต้องการ
        />
        <p style={{ marginTop: '20px', color: '#333', fontSize: '1.4rem', fontWeight: 'bold' }}>
          กำลังโหลด... เตรียมพบกับ Playmatch!
        </p>


        {/* --- Option 1: CSS Spinner แบบกำหนดเอง (คอมเมนต์ไว้) --- */}
        {/*
        <div className="custom-spinner"></div>
        <p className="loading-text" style={{ marginTop: '20px', color: '#333', fontSize: '1.4rem', fontWeight: 'bold' }}>
          กำลังโหลดแอปพลิเคชัน...
        </p>
        */}

        {/* --- Option 2: react-spinners (คอมเมนต์ไว้) --- */}
        {/*
        <ClipLoader
          color={"#007bff"}
          loading={loadingInitialData}
          size={70}
          aria-label="Loading Spinner"
          data-testid="loader"
        />
        <p style={{ marginTop: '20px', color: '#333', fontSize: '1.4rem', fontWeight: 'bold' }}>
          กำลังเตรียมข้อมูลให้คุณ...
        </p>
        */}
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
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600;700;800&display=swap');

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

        /* --- CSS สำหรับ Custom Spinner (Option 1) --- */
        .custom-spinner {
          border: 5px solid rgba(255, 255, 255, 0.3);
          border-top: 5px solid #007bff;
          border-radius: 50%;
          width: 60px;
          height: 60px;
          animation: spin 1s linear infinite;
          box-shadow: 0 0 10px rgba(0, 123, 255, 0.5);
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* เอฟเฟกต์จางเข้า-ออก สำหรับข้อความ Option 1 */
        .loading-text {
            animation: fadeInOut 1.5s ease-in-out infinite alternate;
        }

        @keyframes fadeInOut {
            0% { opacity: 0.5; }
            100% { opacity: 1; }
        }

        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
}

export default MyApp;

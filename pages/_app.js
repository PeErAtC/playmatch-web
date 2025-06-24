// pages/_app.js
import React from "react";
import Sidebar from "./components/sidebar";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebaseConfig";
import { Menu } from "lucide-react";
import { useRouter } from "next/router"; // Import useRouter

function MyApp({ Component, pageProps }) {
  const [birthDayCount, setBirthDayCount] = useState(0);
  const [userIdForSidebar, setUserIdForSidebar] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const router = useRouter(); // Initialize useRouter
  const { pathname } = router; // Get the current pathname

  // Define paths where the sidebar should NOT be displayed
  const noSidebarPaths = ["/", "/login", "/MatchDetails"]; // '/' is for index.js

  // Check if the current path is in the noSidebarPaths array
  const showSidebar = !noSidebarPaths.includes(pathname);

  // Function to toggle sidebar visibility
  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
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
  }, [userIdForSidebar]); // Re-fetch when userIdForSidebar changes

  // Set isSidebarOpen to true if on Desktop (screen wider than 768px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        // If sidebar is supposed to be shown, open it on desktop
        if (showSidebar) {
          setIsSidebarOpen(true);
        }
      } else {
        setIsSidebarOpen(false); // Close sidebar on mobile
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [showSidebar]); // Re-run when showSidebar changes

  return (
    <div className="app-layout">
      {/* Conditionally render the Sidebar */}
      {showSidebar && (
        <Sidebar
          birthDayCount={birthDayCount}
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
        />
      )}

      <main className={`app-main-content ${!showSidebar ? 'full-width' : ''}`}>
        {/* Conditionally render Hamburger button for mobile only when sidebar is shown */}
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

        /* New style for full-width content when sidebar is not present */
        .app-main-content.full-width {
            margin-left: 0 !important; /* Ensure no left margin */
            width: 100% !important; /* Take full width */
        }

        /* Sidebar toggle button (mobile only) */
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
          display: none; /* Hidden on desktop by default */
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }

        .sidebar-toggle-button:hover {
          background: #0056b3;
        }

        /* Media query for mobile screens */
        @media (max-width: 768px) {
          .sidebar-toggle-button {
            display: block; /* Show toggle button on mobile */
          }
        }

        /* Global styles to reset default browser margins/paddings */
        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
}

export default MyApp;

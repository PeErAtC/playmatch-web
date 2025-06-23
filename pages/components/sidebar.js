import { useState, useEffect } from "react";
import {
  Users,
  Sword,
  History,
  Trophy,
  ChevronDown,
  ChevronUp,
  User2,
  Gift, // Import the Gift icon for BirthDay
  X, // Import the X icon for closing
} from "lucide-react";

const menuList = [
  {
    label: "Members",
    path: "/home",
    icon: <Users size={20} strokeWidth={1.7} />,
  },
  {
    label: "Match",
    path: "/match",
    icon: <Sword size={20} strokeWidth={1.7} />,
  },
  {
    label: "History",
    path: "/history",
    icon: <History size={20} strokeWidth={1.7} />,
  },
  {
    label: "Ranking",
    path: "/ranking",
    icon: <Trophy size={20} strokeWidth={1.7} />,
  },
  {
    label: "BirthDay", // New menu item
    path: "/Birthday", // New path for BirthDay
    icon: <Gift size={20} strokeWidth={1.7} />, // New icon for BirthDay
  },
];

// Sidebar Component - Now accepts birthDayCount, isSidebarOpen, and toggleSidebar prop
export default function Sidebar({ birthDayCount = 0, isSidebarOpen, toggleSidebar }) { // Added toggleSidebar
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState("");
  const [groupName, setGroupName] = useState("");
  const [activePath, setActivePath] = useState("");

  useEffect(() => {
    setActivePath(window.location.pathname);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const username = localStorage.getItem("loggedInUsername");
      const group = localStorage.getItem("groupName");
      if (username) setLoggedInUsername(username);
      if (group) setGroupName(group);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("loggedInEmail");
    localStorage.removeItem("loggedInUsername");
    localStorage.removeItem("groupName");
    window.location.href = "/login";
  };

  return (
    <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}> {/* Add 'open'/'closed' classes */}
      {/* Close button for mobile sidebar - conditionally render this on mobile too */}
      <button className="sidebar-close-button" onClick={toggleSidebar}>
          <X size={24} />
      </button>

      {/* Logo & GroupName */}
      <div className="sidebar-logo">
        <div className="logo-icon">B</div>
        <span className="logo-text">{groupName || "PlayMatch"}</span>
      </div>
      <hr className="sidebar-divider" />

      {/* Menu */}
      <nav className="sidebar-menu">
        {menuList.map((item) => (
          <a
            key={item.path}
            href={item.path}
            className={`sidebar-menu-item ${
              activePath === item.path ? "active" : ""
            }`}
          >
            <span className="menu-icon">{item.icon}</span>
            <span className="menu-label">{item.label}</span>
            {item.label === "BirthDay" && birthDayCount > 0 && ( // Conditionally render badge for BirthDay
              <span className="birthday-badge">{birthDayCount}</span>
            )}
          </a>
        ))}
      </nav>

      {/* User Bottom */}
      <div className="sidebar-user">
        <div
          className="user-info"
          onClick={() => setIsDropdownOpen((p) => !p)}
          tabIndex={0}
        >
          <div className="user-avatar">
            <User2 size={21} />
          </div>
          <span className="user-name">{loggedInUsername || "Demo"}</span>
          {isDropdownOpen ? (
            <ChevronUp size={18} className="user-chevron" />
          ) : (
            <ChevronDown size={18} className="user-chevron" />
          )}
        </div>
        {isDropdownOpen && (
          <div className="user-dropdown-menu">
            <button
              className="dropdown-item"
              onClick={() => alert("Settings ยังไม่เปิดใช้งาน")}
            >
              Settings
            </button>
            <button className="dropdown-item" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </div>

      {/* CSS-in-JS */}
      <style jsx>{`
        .sidebar {
          width: 240px;
          height: 100vh;
          background: #212529;
          color: #fff;
          display: flex;
          flex-direction: column;
          position: relative; /* สำคัญ: เพื่อให้ position: fixed บนมือถือไม่หลุด context */
          box-shadow: 1px 0 12px rgba(20, 28, 37, 0.04);
          z-index: 100;
          transition: transform 0.3s ease-in-out; /* เพิ่ม transition */

          /* Default desktop state - always open and visible */
          transform: translateX(0%);
        }

        /* Mobile sidebar hidden/open states */
        @media (max-width: 768px) {
          .sidebar {
            position: fixed; /* ทำให้มันลอยอยู่เหนือ content */
            top: 0;
            left: 0;
            height: 100vh; /* ให้เต็มความสูงของ viewport */
            z-index: 200; /* สูงกว่า toggle button และ content */
            /* จะควบคุมการแสดงผลด้วย class 'open'/'closed' แทน */
          }
          .sidebar.closed {
            transform: translateX(-100%); /* ซ่อนไปทางซ้าย */
            /* display: none;  อย่าใช้ display: none ร่วมกับ transition */
          }
          .sidebar.open {
            transform: translateX(0%); /* แสดงออกมา */
          }
        }


        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 32px 22px 17px 22px;
        }
        .logo-icon {
          width: 38px;
          height: 38px;
          background: #0d6efd;
          border-radius: 10px;
          color: #fff;
          font-weight: 700;
          font-size: 1.45rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-text {
          font-size: 1.25rem;
          font-weight: bold;
          color: #fff;
          letter-spacing: 0.01em;
        }
        .sidebar-divider {
          border: none;
          border-top: 1px solid #353945;
          margin: 0 22px 13px 22px;
        }
        .sidebar-menu {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 6px 0;
          flex-grow: 1; /* Allow menu to take available space */
        }
        .sidebar-menu-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 8px 16px;
          margin: 2px 16px;
          font-size: 1rem;
          color: #d1d7e0;
          text-decoration: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.18s, color 0.18s;
          font-weight: 500;
          position: relative; /* Essential for positioning the badge */
        }
        .sidebar-menu-item .menu-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sidebar-menu-item.active,
        .sidebar-menu-item:hover {
          background: #146cfa;
          color: #fff;
        }
        .sidebar-menu-item.active .menu-icon,
        .sidebar-menu-item:hover .menu-icon {
          color: #fff;
        }
        .sidebar-menu-item:active {
          background: #19447b;
        }
        .sidebar-menu-item .menu-label {
          letter-spacing: 0.01em;
          flex-grow: 1; /* Allow label to take available space */
        }

        /* --- NEW: Birthday Badge Styles --- */
        .birthday-badge {
          background-color: #dc3545; /* Red color for notification */
          color: white;
          font-size: 0.75rem; /* Smaller font size */
          font-weight: 600;
          padding: 3px 7px; /* Padding for oval/circle shape */
          border-radius: 12px; /* Makes it pill-shaped for 1-2 digits */
          min-width: 20px; /* Minimum width to ensure it's visible */
          text-align: center;
          position: absolute; /* Position relative to .sidebar-menu-item */
          right: 15px; /* Adjust as needed to align within the margin */
          top: 50%;
          transform: translateY(-50%);
          line-height: 1; /* Ensure text is vertically centered */
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        /* --- END Birthday Badge Styles --- */

        .sidebar-user {
          margin-top: auto; /* Pushes user block to the bottom */
          padding: 22px 16px 24px 22px;
          position: relative;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          color: #f1f1f1;
          padding: 8px 8px 8px 10px;
          border-radius: 7px;
          transition: background 0.2s, color 0.2s;
        }
        .user-info:hover {
          background: #146cfa;
          color: #fff;
        }
        .user-avatar {
          width: 32px;
          height: 32px;
          background: #353945;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .user-name {
          flex: 1;
          font-size: 1rem;
        }
        .user-chevron {
          color: #b5b5b5;
        }
        .user-dropdown-menu {
          position: absolute;
          left: 25px;
          bottom: 60px;
          min-width: 155px;
          background: #232836;
          border-radius: 8px;
          box-shadow: 0 8px 22px rgba(20, 30, 50, 0.1);
          display: flex;
          flex-direction: column;
          z-index: 1000;
          border: 1px solid #2e3242;
          overflow: hidden;
        }
        .dropdown-item {
          width: 100%;
          background: none;
          border: none;
          color: #e5e6ee;
          text-align: left;
          font-size: 1rem;
          font-weight: 500;
          padding: 12px 18px;
          cursor: pointer;
          transition: background 0.18s, color 0.18s;
        }
        .dropdown-item:hover {
          background: #146cfa;
          color: #fff;
        }

        /* Sidebar close button for mobile */
        .sidebar-close-button {
            position: absolute;
            top: 15px;
            right: 15px;
            background: none;
            border: none;
            color: #ccc;
            cursor: pointer;
            z-index: 110; /* Higher than sidebar content */
            display: none; /* ซ่อนไว้บน desktop */
        }
        .sidebar-close-button:hover {
            color: white;
        }

        @media (max-width: 768px) {
            .sidebar-close-button {
                display: block; /* แสดงปุ่ม close บน mobile */
            }
          .sidebar {
            width: 240px; /* กำหนดความกว้างของ sidebar เมื่อเปิดบนมือถือ */
          }
          /* ไม่มี padding/margin ใน mobile media query แล้วครับ ใช้ค่า default ที่กำหนดไว้บนสุด */
        }
      `}</style>
    </aside>
  );
}

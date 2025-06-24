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
  X, // Import the X icon for closing (for mobile)
  LayoutDashboard, // Import the new icon for Dashboard
  Settings, // Import the Settings icon
  LogOut, // Import the LogOut icon for Logout
} from "lucide-react";
import Swal from "sweetalert2"; // Ensure Swal is imported

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
    label: "BirthDay",
    path: "/Birthday",
    icon: <Gift size={20} strokeWidth={1.7} />,
  },
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: <LayoutDashboard size={20} strokeWidth={1.7} />,
  },
  {
    label: "Settings", // New menu item for Settings
    path: "/settings", // Path to the new settings page
    icon: <Settings size={20} strokeWidth={1.7} />, // Icon for Settings
  },
];

export default function Sidebar({
  birthDayCount = 0,
  isSidebarOpen, // This prop now controls desktop collapse/expand and mobile open/close
  toggleSidebar, // This function toggles the isSidebarOpen state
}) {
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
    window.location.href = "/login"; // Redirect to login page
  };

  // Close dropdown if clicked outside (only relevant when dropdown is open)
  useEffect(() => {
    const handleOutsideClick = (event) => {
      // Check if click is outside the user info and dropdown menu
      if (isDropdownOpen && !event.target.closest(".sidebar-user")) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isDropdownOpen]);

  return (
    <aside className={`sidebar ${isSidebarOpen ? "open" : "collapsed"}`}>
      {" "}
      {/* Changed 'closed' to 'collapsed' for clarity on desktop */}
      {/* Close button for mobile sidebar (only visible on mobile) */}
      <button className="sidebar-mobile-close-button" onClick={toggleSidebar}>
        <X size={24} />
      </button>
      {/* Logo & GroupName - Now clickable to toggle sidebar */}
      <div className="sidebar-logo" onClick={toggleSidebar}>
        {" "}
        {/* Added onClick here */}
        <div className="logo-icon">B</div>
        {isSidebarOpen && (
          <span className="logo-text">{groupName || "PlayMatch"}</span>
        )}
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
            {isSidebarOpen && <span className="menu-label">{item.label}</span>}
            {item.label === "BirthDay" &&
              birthDayCount > 0 &&
              isSidebarOpen && ( // Conditionally render badge and only when sidebar is open
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
          {isSidebarOpen && (
            <span className="user-name">{loggedInUsername || "Demo"}</span>
          )}
          {isSidebarOpen &&
            (isDropdownOpen ? (
              <ChevronUp size={18} className="user-chevron" />
            ) : (
              <ChevronDown size={18} className="user-chevron" />
            ))}
        </div>
        {isDropdownOpen &&
          isSidebarOpen && ( // Only show dropdown if sidebar is open too
            <div className="user-dropdown-menu">
              <button
                className="dropdown-item"
                onClick={() => {
                  Swal.fire({
                    title: "ยังไม่เปิดใช้งาน",
                    text: "ฟังก์ชัน Settings ยังไม่พร้อมใช้งาน",
                    icon: "info",
                    confirmButtonText: "รับทราบ",
                  });
                  setIsDropdownOpen(false); // Close dropdown after clicking
                }}
              >
                Settings
              </button>
              <button className="dropdown-item" onClick={handleLogout}>
                <LogOut size={18} strokeWidth={1.7} className="dropdown-icon" />{" "}
                {/* เพิ่มไอคอน LogOut */}
                Logout
              </button>
            </div>
          )}
      </div>
      {/* Removed Toggle Button for Desktop - now logo is clickable */}
      {/* <button className="sidebar-toggle-button" onClick={toggleSidebar}>
        {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button> */}
      {/* CSS-in-JS */}
      <style jsx>{`
        /* Global font */
        * {
          font-family: "Kanit", sans-serif;
          box-sizing: border-box;
        }

        .sidebar {
          height: 100vh;
          background: #212529;
          color: #fff;
          display: flex;
          flex-direction: column;
          position: relative;
          box-shadow: 1px 0 12px rgba(20, 28, 37, 0.04);
          z-index: 100;
          transition: width 0.3s ease-in-out;
        }

        /* Desktop state: Open */
        .sidebar.open {
          width: 240px;
        }

        /* Desktop state: Collapsed */
        .sidebar.collapsed {
          width: 70px;
        }

        /* Mobile specific styles */
        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            z-index: 200;
            width: 240px;
            transform: translateX(-100%);
            transition: transform 0.3s ease-in-out;
          }
          .sidebar.open {
            transform: translateX(0%);
          }
          .sidebar.collapsed {
            transform: translateX(-100%);
            width: 240px;
          }

          .sidebar-mobile-close-button {
            display: block !important;
          }

          .sidebar-logo .logo-text,
          .sidebar-menu-item .menu-label,
          .sidebar-user .user-name {
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
          }
          .sidebar-user .user-chevron {
            display: block !important;
          }
          .birthday-badge {
            display: flex !important;
          }

          .sidebar-logo {
            cursor: pointer;
          }
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 32px 22px 17px 22px;
          overflow: hidden;
          cursor: pointer;
          user-select: none;
        }
        .sidebar.collapsed .sidebar-logo {
          padding-left: 17px;
          padding-right: 17px;
          justify-content: center;
        }
        .sidebar-logo:hover {
          background-color: #2a2e33;
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
          flex-shrink: 0;
        }
        .logo-text {
          font-size: 1.25rem;
          font-weight: bold;
          color: #fff;
          letter-spacing: 0.01em;
          white-space: nowrap;
          opacity: 1;
          transition: opacity 0.3s ease-in-out;
        }
        .sidebar.collapsed .logo-text {
          opacity: 0;
          width: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .sidebar-divider {
          border: none;
          border-top: 1px solid #353945;
          margin: 0 22px 13px 22px;
        }
        .sidebar.collapsed .sidebar-divider {
          margin: 0 17px 13px 17px;
        }

        .sidebar-menu {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 6px 0;
          flex-grow: 1;
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
          position: relative;
        }
        .sidebar.collapsed .sidebar-menu-item {
          justify-content: center;
          padding: 8px 0;
          margin: 2px 5px;
        }

        .sidebar-menu-item .menu-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
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
          white-space: nowrap;
          opacity: 1;
          transition: opacity 0.3s ease-in-out;
        }
        .sidebar.collapsed .menu-label {
          opacity: 0;
          width: 0;
          overflow: hidden;
          pointer-events: none;
        }

        /* Birthday Badge Styles */
        .birthday-badge {
          background-color: #dc3545;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 3px 7px;
          border-radius: 12px;
          min-width: 20px;
          text-align: center;
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          line-height: 1;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          transition: opacity 0.3s ease-in-out;
        }
        .sidebar.collapsed .birthday-badge {
          opacity: 0;
          pointer-events: none;
        }

        .sidebar-user {
          margin-top: auto;
          padding: 22px 16px 24px 22px;
          position: relative;
          overflow: hidden;
        }
        .sidebar.collapsed .sidebar-user {
          padding-left: 17px;
          padding-right: 17px;
          justify-content: center;
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
        .sidebar.collapsed .user-info {
          justify-content: center;
          padding: 8px 0;
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
          flex-shrink: 0;
        }
        .user-name {
          flex: 1;
          font-size: 1rem;
          white-space: nowrap;
          opacity: 1;
          transition: opacity 0.3s ease-in-out;
        }
        .sidebar.collapsed .user-name {
          opacity: 0;
          width: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .user-chevron {
          color: #b5b5b5;
          opacity: 1;
          transition: opacity 0.3s ease-in-out;
        }
        .sidebar.collapsed .user-chevron {
          opacity: 0;
          pointer-events: none;
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
        .sidebar.collapsed .user-dropdown-menu {
          display: none !important;
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
          display: flex; /* เพิ่ม display flex เพื่อจัดเรียงไอคอนกับข้อความ */
          align-items: center; /* จัดให้อยู่กึ่งกลางในแนวตั้ง */
          gap: 10px; /* เพิ่มระยะห่างระหว่างไอคอนกับข้อความ */
        }
        .dropdown-item:hover {
          background: #146cfa;
          color: #fff;
        }

        /* Mobile specific close button (hidden on desktop) */
        .sidebar-mobile-close-button {
          position: absolute;
          top: 15px;
          right: 15px;
          background: none;
          border: none;
          color: #ccc;
          cursor: pointer;
          z-index: 110;
          display: none;
        }
        .sidebar-mobile-close-button:hover {
          color: white;
        }
      `}</style>
    </aside>
  );
}

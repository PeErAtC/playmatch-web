import { useState, useEffect } from "react";
import {
  Users,
  Sword,
  History,
  Trophy,
  ChevronDown,
  ChevronUp,
  User2,
  Gift,
  X,
  LayoutDashboard,
  Settings,
  LogOut,
  Lock, // Import the Lock icon
  CreditCard
} from "lucide-react";
import Swal from "sweetalert2"; // ยังคง import ไว้เผื่อใช้งาน

// ไม่ต้องแก้ menuList ตรงนี้ ให้ไปกรองตอน render แทน
const allMenuList = [
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
    access: ["Pro", "Premium"], // เพิ่ม property 'access'
  },
  {
    label: "BirthDay",
    path: "/Birthday",
    icon: <Gift size={20} strokeWidth={1.7} />,
    access: ["Pro", "Premium"], // เพิ่ม property 'access'
  },
  {
    label: "Dashboard",
    path: "/Dashboard",
    icon: <LayoutDashboard size={20} strokeWidth={1.7} />,
  },
  {
    label: "PlaymentHistory",
    path: "/PlaymentHistory",
    icon: <CreditCard  size={20} strokeWidth={1.7} />,
  },
];

export default function Sidebar({
  birthDayCount = 0,
  isSidebarOpen,
  toggleSidebar,
  packageType, // รับ packageType เข้ามา
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
    window.location.href = "/login";
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      // ตรวจสอบว่าคลิกอยู่นอก user-info และ dropdown-menu
      if (
        isDropdownOpen &&
        !event.target.closest(".user-info") && // ต้องไม่คลิกที่ user-info
        !event.target.closest(".user-dropdown-menu")
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isDropdownOpen]);

  // *** ลบส่วน filter นี้ออกไป เพราะเราต้องการแสดงทุกเมนูและใช้ logic การ disabled แทน ***
  // const filteredMenuList = allMenuList.filter((item) => {
  //   if (packageType === "Basic") {
  //     return item.label !== "Ranking" && item.label !== "BirthDay";
  //   }
  //   return true;
  // });

  return (
    <aside className={`sidebar ${isSidebarOpen ? "open" : "collapsed"}`}>
      <button className="sidebar-mobile-close-button" onClick={toggleSidebar}>
        <X size={24} />
      </button>
      <div className="sidebar-logo" onClick={toggleSidebar}>
        {/* เปลี่ยนจาก div.logo-icon เป็น img แทรกเข้ามา */}
        <img
          src="/images/Logo-iconnew.png"
          alt="Company Logo"
          className="logo-image"
        />
        {isSidebarOpen && (
          <span className="logo-text">{groupName || "PlayMatch"}</span>
        )}
      </div>
      <hr className="sidebar-divider" />
      <nav className="sidebar-menu">
        {allMenuList.map((item) => {
          // ตรวจสอบว่าเมนูควรจะถูก disabled หรือไม่
          const isDisabled = item.access && !item.access.includes(packageType);
          return (
            <a
              key={item.path}
              href={isDisabled ? "#" : item.path} // ถ้า disabled ให้ลิงก์ไปที่ '#'
              className={`sidebar-menu-item ${
                activePath === item.path ? "active" : ""
              } ${isDisabled ? "disabled" : ""}`} // เพิ่ม class 'disabled'
              onClick={(e) => {
                if (isDisabled) {
                  e.preventDefault(); // ป้องกันการเปลี่ยนหน้า
                }
              }}
            >
              <span className="menu-icon">{item.icon}</span>
              {isSidebarOpen && (
                <span className="menu-label">{item.label}</span>
              )}
              {item.label === "BirthDay" &&
                birthDayCount > 0 &&
                isSidebarOpen &&
                !isDisabled && ( // แสดง badge เมื่อไม่ disabled
                  <span className="birthday-badge">{birthDayCount}</span>
                )}
              {isDisabled && isSidebarOpen && (
                <Lock size={16} className="lock-icon" /> // แสดงไอคอนล็อค
              )}
            </a>
          );
        })}
      </nav>

      {/* ย้าย sidebar-user ออกมาด้านนอกของโครงสร้างก่อนหน้า sidebar-menu แต่ยังคงอยู่ใน aside */}
      <div className="sidebar-user-wrapper">
        {" "}
        {/* เพิ่ม wrapper เพื่อจัดตำแหน่ง dropdown ได้ง่ายขึ้น */}
        <div
          className="user-info"
          onClick={() => setIsDropdownOpen((p) => !p)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setIsDropdownOpen((p) => !p);
            }
          }}
          tabIndex={0}
          role="button"
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
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
        {isDropdownOpen && isSidebarOpen && (
          <div className="user-dropdown-menu">
            {" "}
            {/* Drodown อยู่ใน wrapper เดียวกับ user-info */}
            <button
              className="dropdown-item"
              onClick={() => {
                window.location.href = "/settings";
                setIsDropdownOpen(false);
              }}
            >
              <Settings size={18} strokeWidth={1.7} className="dropdown-icon" />{" "}
              Settings
            </button>
            <button className="dropdown-item" onClick={handleLogout}>
              <LogOut size={18} strokeWidth={1.7} className="dropdown-icon" />{" "}
              Logout
            </button>
          </div>
        )}
      </div>

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
          position: relative; /* สำคัญ: ต้องมี position เพื่อให้ z-index ทำงานกับ child elements */
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
          .sidebar-user-wrapper .user-name {
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
          }
          .sidebar-user-wrapper .user-chevron {
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

        /* CSS สำหรับรูปภาพโลโก้ */
        .logo-image {
          width: 38px; /* กำหนดขนาดตามที่ต้องการ */
          height: 38px; /* กำหนดขนาดตามที่ต้องการ */
          border-radius: 10px; /* หากต้องการให้มีมุมโค้งมนเหมือนเดิม */
          object-fit: contain; /* ปรับขนาดรูปภาพให้พอดีโดยไม่ยืด */
          flex-shrink: 0; /* ป้องกันไม่ให้รูปภาพหดตัวเมื่อพื้นที่น้อย */
          background: #fff; /* สีพื้นหลังเหมือนเดิม อาจปรับตามโลโก้จริง */
          padding: 5px; /* เพิ่ม padding เพื่อให้รูปภาพไม่ชิดขอบวงกลมเกินไป */
        }

        .sidebar-logo .logo-text {
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
        .sidebar-menu-item:hover:not(.disabled) {
          background: #146cfa;
          color: #fff;
        }
        .sidebar-menu-item.active .menu-icon,
        .sidebar-menu-item:hover:not(.disabled) .menu-icon {
          color: #fff;
        }
        .sidebar-menu-item:active:not(.disabled) {
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

        /* Disabled menu item styles */
        .sidebar-menu-item.disabled {
          color: #6c757d; /* สีเทาสำหรับ disabled */
          cursor: not-allowed;
          pointer-events: none; /* ป้องกันการคลิก */
          background-color: transparent; /* ลบ background เมื่อ disabled */
        }
        .sidebar-menu-item.disabled .menu-icon {
          color: #6c757d; /* สีไอคอนเป็นสีเทา */
        }
        .sidebar-menu-item.disabled:hover {
          background: transparent; /* ป้องกัน hover effect */
          color: #6c757d;
        }

        /* Lock icon style */
        .lock-icon {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #6c757d; /* สีของไอคอนล็อค */
          transition: opacity 0.3s ease-in-out;
        }
        .sidebar.collapsed .lock-icon {
          opacity: 0;
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

        /* New wrapper for user info and dropdown */
        .sidebar-user-wrapper {
          margin-top: auto; /* Push to bottom */
          padding: 22px 16px 24px 22px; /* same padding as before */
          position: relative; /* ทำให้ child dropdown อ้างอิงตำแหน่งได้ */
          z-index: 101; /* ให้สูงกว่า menuList (ถ้า menuList มี z-index) */
        }
        .sidebar.collapsed .sidebar-user-wrapper {
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
          left: 70px;
          bottom: calc(100% + 10px);
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
          display: flex;
          align-items: center;
          gap: 10px;
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

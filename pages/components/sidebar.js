// sidebar.jsx

import { useState, useEffect } from "react";
import {
  Users,
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
  Lock,
  Wallet,
  Swords,
} from "lucide-react";

// --- 1. เพิ่มการ import สำหรับ Firestore ---
import { db } from "../../lib/firebaseConfig";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";


const allMenuList = [
  //... โครงสร้างเมนูของคุณ (เหมือนเดิม)
  {
    label: "Members",
    path: "/home",
    icon: <Users size={20} strokeWidth={1.7} />,
  },
  {
    label: "Match",
    path: "/match",
    icon: <Swords size={20} strokeWidth={1.7} />,
  },
  {
    label: "Category",
    icon: <History size={20} strokeWidth={1.7} />,
    subMenu: [
      {
        label: "History",
        path: "/history",
      },
      {
        label: "Payment",
        path: "/PaymentHistory",
      },
    ],
  },
  {
    label: "Ranking",
    path: "/ranking",
    icon: <Trophy size={20} strokeWidth={1.7} />,
    access: ["Pro", "Premium"],
  },
  {
    label: "BirthDay",
    path: "/Birthday",
    icon: <Gift size={20} strokeWidth={1.7} />,
    access: ["Pro", "Premium"],
  },
  {
    label: "Dashboard",
    path: "/Dashboard",
    icon: <LayoutDashboard size={20} strokeWidth={1.7} />,
  },
];

export default function Sidebar({
  birthDayCount = 0,
  isSidebarOpen,
  toggleSidebar,
  packageType,
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState("");
  const [groupName, setGroupName] = useState("");
  const [activePath, setActivePath] = useState("");
  const [showBirthdayBadge, setShowBirthdayBadge] = useState(true);
  const [openSubMenu, setOpenSubMenu] = useState(null);

  // --- 2. เพิ่ม State สำหรับเก็บ URL รูปโปรไฟล์ ---
  const [profileImageUrl, setProfileImageUrl] = useState(null);


  const handleSubMenuToggle = (label) => {
    setOpenSubMenu(openSubMenu === label ? null : label);
  };


  useEffect(() => {
    const currentPath = window.location.pathname;
    setActivePath(currentPath);
    for (const item of allMenuList) {
      if (item.subMenu && item.subMenu.find(sub => sub.path === currentPath)) {
        setOpenSubMenu(item.label);
        break;
      }
    }
  }, []);

  // --- 3. แก้ไข useEffect นี้เพื่อดึงข้อมูล User และรูปภาพแบบ Real-time ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const username = localStorage.getItem("loggedInUsername");
      const group = localStorage.getItem("groupName");
      const email = localStorage.getItem("loggedInEmail"); // ดึง email มาเพื่อใช้ค้นหา

      if (username) setLoggedInUsername(username);
      if (group) setGroupName(group);

      const savedBirthdayNotifications = localStorage.getItem("birthdayNotifications");
      if (savedBirthdayNotifications !== null) {
        setShowBirthdayBadge(JSON.parse(savedBirthdayNotifications));
      }

      // ถ้ามี email ใน localStorage ให้เริ่มดึงข้อมูลจาก Firestore
      if (email) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));

        // ใช้ onSnapshot เพื่อสร้าง Real-time listener
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          if (!querySnapshot.empty) {
            // เรามั่นใจว่ามี user เดียว เพราะ email ไม่ซ้ำกัน
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            // อัปเดต State ด้วย URL รูปภาพจาก Firestore
            setProfileImageUrl(userData.profileImageUrl || null);
          }
        });

        // Cleanup function: ยกเลิก listener เมื่อ component ถูก unmount
        return () => unsubscribe();
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("loggedInEmail");
    localStorage.removeItem("loggedInUsername");
    localStorage.removeItem("groupName");
    // เราอาจต้องลบ profileImageUrl ออกไปด้วยเพื่อความสะอาด
    localStorage.removeItem("profileImageUrl");
    window.location.href = "/login";
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        isDropdownOpen &&
        !event.target.closest(".user-info") &&
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

  return (
    <aside className={`sidebar ${isSidebarOpen ? "open" : "collapsed"}`}>
      <button className="sidebar-mobile-close-button" onClick={toggleSidebar}>
        <X size={24} />
      </button>
      <div className="sidebar-logo" onClick={toggleSidebar}>
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
          const isDisabled = item.access && !item.access.includes(packageType);
          if (item.subMenu) {
            const isSubMenuOpen = openSubMenu === item.label;
            return (
              <div key={item.label} className="menu-with-submenu">
                <div
                  className={`sidebar-menu-item submenu-toggle ${isDisabled ? "disabled" : ""}`}
                  onClick={() => !isDisabled && handleSubMenuToggle(item.label)}
                >
                  <span className="menu-icon">{item.icon}</span>
                  {isSidebarOpen && (
                    <span className="menu-label">{item.label}</span>
                  )}
                  {isSidebarOpen && (
                    isSubMenuOpen ? <ChevronUp size={16} className="submenu-chevron" /> : <ChevronDown size={16} className="submenu-chevron" />
                  )}
                </div>
                <div className={`submenu-container ${isSubMenuOpen && isSidebarOpen ? 'open' : ''}`}>
                  {item.subMenu.map((subItem) => (
                    <a
                      key={subItem.path}
                      href={isDisabled ? "#" : subItem.path}
                      className={`submenu-item ${activePath === subItem.path ? "active" : ""}`}
                    >
                      {subItem.label}
                    </a>
                  ))}
                </div>
              </div>
            );
          }
          return (
            <a
              key={item.path}
              href={isDisabled ? "#" : item.path}
              className={`sidebar-menu-item ${
                activePath === item.path ? "active" : ""
              } ${isDisabled ? "disabled" : ""}`}
              onClick={(e) => {
                if (isDisabled) {
                  e.preventDefault();
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
                !isDisabled &&
                showBirthdayBadge && (
                  <span className="birthday-badge">{birthDayCount}</span>
                )}
              {isDisabled && isSidebarOpen && (
                <Lock size={16} className="lock-icon" />
              )}
            </a>
          );
        })}
      </nav>

      <div className="sidebar-user-wrapper">
        <div
          className="user-info"
          onClick={() => setIsDropdownOpen((p) => !p)}
        >
          {/* --- 4. แก้ไขส่วนแสดงผล Avatar --- */}
          <div className="user-avatar">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt="User Avatar" className="user-avatar-image"/>
            ) : (
              <User2 size={21} />
            )}
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
            <button
              className="dropdown-item"
              onClick={() => {
                window.location.href = "/settings";
              }}
            >
              <Settings size={18} strokeWidth={1.7} /> Settings
            </button>
            <button className="dropdown-item" onClick={handleLogout}>
              <LogOut size={18} strokeWidth={1.7} /> Logout
            </button>
          </div>
        )}
      </div>

      {/* --- 5. เพิ่ม CSS สำหรับรูปภาพ Avatar --- */}
      <style jsx>{`
        * {
          font-family: "Kanit", sans-serif;
          box-sizing: border-box;
        }

        .user-avatar-image {
            width: 100%;
            height: 100%;
            object-fit: cover; /* ทำให้รูปภาพเต็มวงกลมและไม่เสียสัดส่วน */
        }

        /* CSS ส่วนที่เหลือเหมือนเดิมทั้งหมด */

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

        .sidebar.open {
          width: 240px;
        }

        .sidebar.collapsed {
          width: 70px;
        }

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

        .logo-image {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          object-fit: contain;
          flex-shrink: 0;
          background: #fff;
          padding: 5px;
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
          flex-grow: 1;
        }
        .sidebar.collapsed .menu-label, .sidebar.collapsed .submenu-chevron {
          opacity: 0;
          width: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .sidebar-menu-item.disabled {
          color: #6c757d;
          cursor: not-allowed;
          pointer-events: none;
          background-color: transparent;
        }
        .sidebar-menu-item.disabled .menu-icon {
          color: #6c757d;
        }
        .sidebar-menu-item.disabled:hover {
          background: transparent;
          color: #6c757d;
        }

        .lock-icon {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #6c757d;
          transition: opacity 0.3s ease-in-out;
        }
        .sidebar.collapsed .lock-icon {
          opacity: 0;
          pointer-events: none;
        }

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
        .submenu-toggle {
        }
        .submenu-chevron {
          margin-left: auto;
          transition: transform 0.2s ease-in-out;
        }
        .submenu-container {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out, opacity 0.2s ease-out, padding 0.3s ease-out;
          padding-left: 28px; 
          position: relative;
        }
        .submenu-container.open {
          max-height: 200px;
          opacity: 1;
        }
        .submenu-container::before {
          content: '';
          position: absolute;
          left: 36px;
          top: 8px;
          bottom: 8px;
          width: 2px;
          background-color: #495057;
          opacity: 0.5;
        }
        .submenu-item {
          display: block;
          position: relative;
          color: #adb5bd;
          text-decoration: none;
          padding: 8px 16px 8px 24px;
          font-size: 0.9rem;
          transition: color 0.18s;
        }
        .submenu-item::before {
          content: '';
          position: absolute;
          left: -6px;
          top: 50%;
          transform: translateY(-50%);
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #495057;
          border: 2px solid #212529;
          transition: background-color 0.18s;
        }
        .submenu-item:hover, .submenu-item.active {
          color: #fff;
        }
        .submenu-item:hover::before, .submenu-item.active::before {
          background-color: #146cfa;
        }

        .sidebar-user-wrapper {
          margin-top: auto;
          padding: 22px 16px 24px 22px;
          position: relative;
          z-index: 101;
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
          left: 15px; /* ปรับให้ชิดซ้ายมากขึ้น */
          right: 15px; /* เพิ่ม right เพื่อให้ความกว้างยืดหยุ่น */
          bottom: 85px; /* <-- เปลี่ยนเป็นค่าคงที่ */
          min-width: auto; /* ปรับ min-width */
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

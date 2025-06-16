import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Sidebar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState('');
  const [groupName, setGroupName] = useState('');

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  // เมื่อหน้าโหลด จะเช็คว่า ผู้ใช้ล็อกอินหรือไม่
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const username = localStorage.getItem('loggedInUsername');
      const group = localStorage.getItem('groupName'); // รับข้อมูล groupName จาก localStorage
      if (username) {
        setLoggedInUsername(username);
        setGroupName(group); // ตั้งค่า groupName ถ้ามี
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('loggedInEmail');
    localStorage.removeItem('loggedInUsername');
    localStorage.removeItem('groupName'); // ลบข้อมูล groupName ด้วย
    window.location.href = '/login'; // นำทางไปที่หน้า login
  };

  return (
    <div className="sidebar">
      {/* Logo Section */}
      <div className="logo">
        <Link href="/">
          <img src="/images/Logo.png" alt="Logo" width={70} height={100} />
        </Link>
        <span>{groupName || 'PlayMatch'}</span> {/* แสดง groupName ถ้ามี */}
      </div>

      {/* Divider Line */}
      <div className="divider"></div>

      {/* Menu Section */}
      <div className="menu">
        <Link href="/home" className="menu-item">
          <img src="/images/Home-icon.png" alt="Home" width={24} height={24} />
          <span>Home</span>
        </Link>
        <Link href="/match" className="menu-item">
          <img src="/images/Match-icon.png" alt="match" width={24} height={24} />
          <span>Match</span>
        </Link>
        <Link href="/history" className="menu-item">
          <img src="/images/history-icon.png" alt="history" width={24} height={24} />
          <span>Orders</span>
        </Link>
        <Link href="/ranking" className="menu-item">
          <img src="/images/ranking-icon.png" alt="ranking" width={24} height={24} />
          <span>Products</span>
        </Link>
      </div>

      {/* User Section */}
      <div className="user-section">
        <div className="user-dropdown" onClick={toggleDropdown}>
          <span>{loggedInUsername || 'Demo'}</span>
          <div className="dropdown-icon">▼</div>
        </div>
        {isDropdownOpen && (
          <div className="dropdown-menu">
            <div className="dropdown-item">Group: {groupName || 'No Group'}</div>
            <Link href="/settings" className="dropdown-item">
              Settings
            </Link>
            <button onClick={handleLogout} className="dropdown-item">
              Logout
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .sidebar {
          width: 250px;
          height: 100vh;
          background-color: #282c34;
          color: #fff;
          display: flex;
          flex-direction: column;
          padding-top: 20px;
          padding-left: 20px;
          padding-right: 20px;
          box-sizing: border-box;
          border-right: 2px solid #444;
          font-family: 'Arial', sans-serif;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 30px;
          font-size: 1.8rem;
          font-weight: bold;
          color: #42a5f5;
        }

        .logo img {
          width: 50px;
          height: 50px;
        }

        .logo span {
          color: #ffffff;
          font-size: 1.8rem;
        }

        .divider {
          height: 2px;
          background-color: #444;
          margin-bottom: 20px;
        }

        .menu {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .menu-item {
          display: flex;
          align-items: center;
          color: #f8f9f9;
          text-decoration: none;
          font-size: 1.2rem;
          gap: 12px;
          padding: 12px 18px;
          border-radius: 8px;
          transition: background-color 0.3s, color 0.3s, transform 0.3s;
          border-bottom: 2px solid #444; /* ขีดล่างเมนู */
          position: relative;
          transition: box-shadow 0.3s ease-in-out, transform 0.2s ease;
        }

        .menu-item:hover {
          background-color: #42a5f5;
          color: #010102;
          transform: scale(1.05); /* ขยายขนาด */
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* เพิ่มเงา */
        }

        .menu-item img {
          transition: transform 0.3s ease;
        }

        .menu-item:hover img {
          transform: scale(1.2); /* ขยายไอคอนเมนู */
        }

        .user-section {
          margin-top: auto;
          border-top: 2px solid #444;
          padding-top: 20px;
          text-align: center;
        }

        .user-dropdown {
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          font-size: 1.2rem;
          color: #ffffff;
          font-weight: 600;
          transition: color 0.3s;
        }

        .user-dropdown:hover {
          color: #3c83ff;
        }

        .dropdown-menu {
          background-color: #2a3047;
          border-radius: 6px;
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 12px 0;
          position: absolute;
          bottom: 20px;
          width: 220px;
          color: #eff1ffff;
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2); /* เพิ่มเงา */
        }

        .dropdown-item {
          text-decoration: none;
          color: #fff;
          padding: 12px 18px;
          transition: background-color 0.3s;
          font-size: 1.1rem;
          background-color: #282c34;
          text-align: left;
        }

        .dropdown-item:hover {
          background-color: #ffffff;
          color: #282c34;
        }

        .dropdown-icon {
          font-size: 1.2rem;
          color: #dadada;
        }

        /* Responsive Styles for smaller screens */
        @media (max-width: 768px) {
          .sidebar {
            width: 200px;
            padding-left: 15px;
            padding-right: 15px;
          }

          .logo span {
            font-size: 1.5rem;
          }

          .menu-item {
            font-size: 1rem;
            padding: 10px 14px;
          }

          .user-dropdown {
            font-size: 1rem;
          }

          .dropdown-menu {
            width: 180px;
          }
        }

        @media (max-width: 480px) {
          .sidebar {
            width: 100%;
            padding-left: 10px;
            padding-right: 10px;
          }

          .logo {
            font-size: 1.5rem;
          }

          .menu-item {
            font-size: 1rem;
            padding: 10px 12px;
          }

          .user-dropdown {
            font-size: 1rem;
          }

          .dropdown-menu {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

import { FaHome, FaUsers, FaCog } from 'react-icons/fa';

const Sidebar = () => {
  return (
    <>
      <aside className="sidebar collapsed">
        <div className="logo">
          <img src="/images/Logo.png" alt="Logo" width={55} height={65} />
        </div>

        <nav className="menu">
          <ul>
            <li className="menu-item">
              <FaHome className="icon" />
              <span className="tooltip">Home</span>
            </li>
            <li className="menu-item">
              <FaUsers className="icon" />
              <span className="tooltip">Users</span>
            </li>
            <li className="menu-item">
              <FaCog className="icon" />
              <span className="tooltip">Settings</span>
            </li>
            <li className="menu-item">
              <FaCog className="icon" />
              <span className="tooltip">Other</span>
            </li>
          </ul>
        </nav>
      </aside>

      <style jsx>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: 60px;
          background: #2c3e50;
          color: white;
          display: flex;
          flex-direction: column;
          padding: 20px;
          transition: width 0.3s ease;
          user-select: none;
          overflow: hidden;
        }

        .logo {
          margin-bottom: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 65px;
          cursor: pointer;
        }

        .menu {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
        }

        .menu ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 20px; /* เพิ่มระยะห่างระหว่างไอคอน */
          padding: 12px 8px;
          cursor: pointer;
          border-radius: 6px;
          transition: background 0.2s;
          position: relative;
        }

        .menu-item:hover {
          background: #34495e;
        }

        .menu-item .icon {
          font-size: 28px; /* ปรับขนาดไอคอนให้ใหญ่ขึ้น */
        }

        .menu span {
          white-space: nowrap;
        }

        /* ซ่อนข้อความในขณะ Sidebar collapsed */
        .sidebar.collapsed .menu span {
          display: none;
        }

        .sidebar.collapsed .menu-item {
          justify-content: center;
        }

        /* Tooltip ที่แสดงเมื่อเอาเมาส์ชี้ */
        .tooltip {
          display: none;
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: 10px;
          padding: 5px 10px;
          background-color: #333;
          color: #fff;
          border-radius: 4px;
          font-size: 0.9rem;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .menu-item:hover .tooltip {
          display: block;
          opacity: 1;
        }
      `}</style>
    </>
  );
};

export default Sidebar;

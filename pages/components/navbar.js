import { useState } from 'react';
import { useRouter } from 'next/router';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGetStartedClick = () => {
    router.push('/login');
  };

  return (
    <>
      <nav className="navbar">
        <div
          className="navbar-logo"
          onClick={scrollToTop}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === 'Enter') scrollToTop();
          }}
        >
          <img src="/images/Logo.png" alt="PlayMatch Logo" />
          <span>PlayMatch</span>
        </div>

        <div className={`navbar-menu ${menuOpen ? 'open' : ''}`}>
          <ul>
            <li>
              <a href="#">หน้าหลัก</a>
            </li>
            <li>
              <a href="#">เกี่ยวกับ</a>
            </li>
            <li>
              <a href="#">บริการ</a>
            </li>
            <li>
              <a href="#">แพ็กเกจ</a>
            </li>
            <li>
              <a href="#">ติดต่อเรา</a>
            </li>
          </ul>
        </div>

        <button className="get-started" onClick={handleGetStartedClick}>
          Get Started
        </button>

        <button
          className={`hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      <style jsx>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;

          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px 100px;
          background-color: #fff;
          box-shadow: 0 2px 4px rgb(0 0 0 / 0.1);
          font-family: Arial, sans-serif;
        }

        .navbar-logo {
          display: flex;
          align-items: center;
          font-weight: 700;
          font-size: 1.8rem;
          color: #2c3e50;
          margin-right: 20px;
          user-select: none;
        }

        .navbar-logo img {
          height: 65px;
          width: 55px;
          object-fit: contain;
          margin-right: 8px;
        }

        .navbar-menu {
          display: flex;
          max-width: 70vw;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
        }

        .navbar-menu::-webkit-scrollbar {
          height: 6px;
        }
        .navbar-menu::-webkit-scrollbar-track {
          background: transparent;
        }
        .navbar-menu::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }

        .navbar-menu ul {
          list-style: none;
          display: flex;
          align-items: center;
          gap: 25px;
          margin: 0;
          padding: 0;
          flex-wrap: wrap;
        }

        .navbar-menu ul li {
          position: relative;
          white-space: nowrap;
        }

        .navbar-menu ul li a {
          text-decoration: none;
          color: #34495e;
          font-weight: 500;
          font-size: 1rem;
          cursor: pointer;
          transition: color 0.3s;
        }

        .navbar-menu ul li a:hover,
        .navbar-menu ul li a.active {
          color: #4fa3f7;
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          background-color: white;
          box-shadow: 0 3px 8px rgb(0 0 0 / 0.15);
          padding: 10px 0;
          border-radius: 5px;
          min-width: 160px;
          z-index: 1000;
          display: none;
        }

        .dropdown:hover .dropdown-menu,
        .dropdown-menu:hover {
          display: block;
        }

        .dropdown-menu li {
          padding: 8px 20px;
        }

        .dropdown-menu li a {
          color: #34495e;
          font-weight: 400;
          font-size: 0.95rem;
        }

        .dropdown-menu li a:hover {
          background-color: #f0f4f8;
          color: #4fa3f7;
          display: block;
        }

        .get-started {
          background-color: #4fa3f7;
          color: white;
          border: none;
          padding: 10px 25px;
          font-size: 1rem;
          border-radius: 25px;
          cursor: pointer;
          transition: background-color 0.3s;
          font-weight: 600;
          white-space: nowrap;
          margin-left: 20px;
        }

        .get-started:hover {
          background-color: #3b8ddb;
        }

        /* Hamburger menu */
        .hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          margin-left: 20px;
          z-index: 20;
        }

        .hamburger span {
          display: block;
          width: 25px;
          height: 3px;
          background-color: #34495e;
          border-radius: 2px;
          transition: all 0.3s ease;
        }

        .hamburger.open span:nth-child(1) {
          transform: translateY(8px) rotate(45deg);
        }

        .hamburger.open span:nth-child(2) {
          opacity: 0;
        }

        .hamburger.open span:nth-child(3) {
          transform: translateY(-8px) rotate(-45deg);
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .navbar {
            padding: 15px 50px;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .navbar-menu ul {
            gap: 12px;
            font-size: 0.9rem;
            flex-wrap: nowrap;
            overflow-x: auto;
          }
          .navbar-menu {
            max-width: 80vw;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .navbar-menu::-webkit-scrollbar {
            height: 6px;
          }
          .navbar-menu::-webkit-scrollbar-thumb {
            background-color: rgba(0, 0, 0, 0.2);
            border-radius: 3px;
          }
        }

        @media (max-width: 768px) {
          .navbar {
            padding: 15px 20px;
          }

          .navbar-menu {
            position: fixed;
            top: 65px;
            right: 0;
            height: calc(100vh - 65px);
            width: 200px;
            background-color: white;
            flex-direction: column;
            padding: 20px;
            box-shadow: -2px 0 8px rgba(0,0,0,0.1);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            overflow-y: auto;
            max-height: calc(100vh - 65px);
            max-width: 100vw;
          }

          .navbar-menu.open {
            transform: translateX(0);
          }

          .navbar-menu ul {
            flex-direction: column;
            gap: 15px;
          }

          .dropdown-menu {
            position: relative;
            top: 0;
            box-shadow: none;
            background-color: transparent;
            padding: 0;
            min-width: auto;
            display: none !important;
          }

          .dropdown > a::after {
            content: ' ▼';
            font-size: 0.7rem;
          }

          .get-started {
            display: none;
          }

          .hamburger {
            display: flex;
          }

          .navbar-logo {
            margin-right: 8px;
          }

          .get-started {
            margin-left: 10px;
          }
        }
      `}</style>
    </>
  );
};

export default Navbar;

import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link"; // Import Link component

const LINE_OA_URL = "https://page.line.me/136rjkgt"; // Define Line OA URL

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGetStartedClick = () => {
    router.push("/login");
  };

  // New function for Contact button to open Line OA
  const handleContactClick = (e) => {
    e.preventDefault(); // Prevent default Link behavior
    window.open(LINE_OA_URL, "_blank"); // Open in a new tab
    setMenuOpen(false); // Close menu if it's open (for mobile)
  };

  return (
    <>
      <nav className="navbar">
        {/* Logo */}
        <div
          className="navbar-logo"
          onClick={scrollToTop}
          style={{ cursor: "pointer" }}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === "Enter") scrollToTop();
          }}
        >
          <img src="/images/Logo-iconnew.png" alt="PlayMatch Logo" />
          <span>PlayMatch</span>
        </div>

        {/* Main menu */}
        <div className={`navbar-menu ${menuOpen ? "open" : ""}`}>
          <ul>
            <li>
              <Link href="/" legacyBehavior>
                <a className={router.pathname === "/" ? "active" : ""}>
                  หน้าหลัก
                </a>
              </Link>
            </li>
            <li>
              {/* เปลี่ยน "เกี่ยวกับ" เป็น "ทดลองใช้งาน" และลิงก์ไปที่ /login พร้อมเพิ่มคลาสสำหรับสี */}
              <Link href="/loginDemo" legacyBehavior>
                <a
                  className={`${
                    router.pathname === "/loginDemo" ? "active" : ""
                  } try-it-out-link`}
                >
                  ทดลองใช้งาน
                </a>
              </Link>
            </li>
            <li>
              <Link href="/packages" legacyBehavior>
                <a className={router.pathname === "/packages" ? "active" : ""}>
                  แพ็กเกจ
                </a>
              </Link>
            </li>
            <li>
              {/* **เพิ่ม onClick handler สำหรับ "ติดต่อเรา" ที่นี่** */}
              <Link href="/contact" legacyBehavior>
                <a
                  className={router.pathname === "/contact" ? "active" : ""}
                  onClick={handleContactClick} // Call the new handler
                >
                  ติดต่อเรา
                </a>
              </Link>
            </li>
          </ul>
        </div>

        {/* Get Started Button */}
        <button className="get-started" onClick={handleGetStartedClick}>
          Get Started
        </button>

        {/* Hamburger */}
        <button
          className={`hamburger ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {/* สไตล์ CSS ทั้งหมดเหมือนเดิม ไม่มีอะไรเปลี่ยนแปลงในส่วนนี้ */}
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
          padding: 14px 60px 14px 36px;
          background: #212529;
          box-shadow: 0 2px 10px 0 rgba(18, 34, 54, 0.08);
          font-family: Arial, sans-serif;
          min-height: 75px;
        }

        .navbar-logo {
          display: flex;
          align-items: center;
          font-weight: 800;
          font-size: 1.65rem;
          color: #fff;
          margin-right: 20px;
          user-select: none;
          letter-spacing: 0.01em;
        }
        .navbar-logo img {
          height: 54px;
          width: 54px;
          object-fit: contain;
          margin-right: 10px;
          border-radius: 9px;
          box-shadow: 0 2px 9px rgba(30, 120, 230, 0.13);
          background: #fff;
        }
        .navbar-logo span {
          font-size: 1.18rem;
          color: #fff;
          font-weight: 700;
        }

        .navbar-menu {
          display: flex;
        }
        .navbar-menu ul {
          list-style: none;
          display: flex;
          align-items: center;
          gap: 32px;
          margin: 0;
          padding: 0;
        }
        .navbar-menu ul li {
          position: relative;
          white-space: nowrap;
        }
        .navbar-menu ul li a {
          text-decoration: none;
          color: #eaf2fb;
          font-weight: 500;
          font-size: 1.08rem;
          cursor: pointer;
          padding: 5px 8px;
          border-radius: 5px;
          transition: color 0.22s, background 0.18s;
        }
        .navbar-menu ul li a:hover,
        .navbar-menu ul li a.active {
          color: #4fa3f7;
          background: rgba(77, 164, 247, 0.11);
        }

        /* NEW: Style for "ทดลองใช้งาน" button */
        .navbar-menu ul li a.try-it-out-link {
          color: #ffd700; /* Golden yellow */
          font-weight: 700; /* Make it bolder */
        }

        .navbar-menu ul li a.try-it-out-link:hover,
        .navbar-menu ul li a.try-it-out-link.active {
          color: #daa520; /* Darker golden yellow on hover/active */
          background: rgba(255, 215, 0, 0.1); /* Slight yellow background on hover */
        }

        .get-started {
          background: linear-gradient(90deg, #146cfa 60%, #4fa3f7 100%);
          color: #fff;
          border: none;
          padding: 9px 32px;
          font-size: 1.08rem;
          border-radius: 30px;
          cursor: pointer;
          font-weight: 700;
          margin-left: 26px;
          box-shadow: 0 4px 14px rgba(30, 108, 230, 0.07);
          letter-spacing: 0.01em;
          transition: background 0.18s, box-shadow 0.18s;
        }
        .get-started:hover {
          background: linear-gradient(90deg, #125ac7 60%, #2094e0 100%);
          box-shadow: 0 6px 19px rgba(30, 108, 230, 0.11);
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
          margin-left: 22px;
          z-index: 1100;
        }
        .hamburger span {
          display: block;
          width: 28px;
          height: 3px;
          background: #fff;
          border-radius: 2px;
          transition: all 0.28s cubic-bezier(0.65, 0, 0.35, 1);
        }
        .hamburger.open span:nth-child(1) {
          transform: translateY(9px) rotate(45deg);
        }
        .hamburger.open span:nth-child(2) {
          opacity: 0;
        }
        .hamburger.open span:nth-child(3) {
          transform: translateY(-9px) rotate(-45deg);
        }

        /* Responsive */
        @media (max-width: 1100px) {
          .navbar {
            padding: 13px 20px 13px 10px;
          }
          .get-started {
            padding: 9px 18px;
            font-size: 1rem;
            margin-left: 13px;
          }
          .navbar-logo img {
            height: 48px;
            width: 48px;
            margin-right: 6px;
          }
          .navbar-logo span {
            font-size: 1.05rem;
          }
        }

        @media (max-width: 880px) {
          .navbar-menu ul {
            gap: 16px;
          }
          .navbar-logo span {
            font-size: 1.05rem;
          }
        }

        @media (max-width: 768px) {
          .navbar {
            padding: 10px 14px 10px 6px;
            min-height: 65px;
          }
          .navbar-menu {
            position: fixed;
            top: 62px;
            right: 0;
            height: calc(100vh - 62px);
            width: 200px;
            background: #232836;
            flex-direction: column;
            padding: 26px 0 0 0;
            box-shadow: -2px 0 13px rgba(0, 0, 0, 0.13);
            transform: translateX(100%);
            transition: transform 0.28s cubic-bezier(0.65, 0, 0.35, 1);
            overflow-y: auto;
            max-height: calc(100vh - 62px);
            max-width: 100vw;
            z-index: 1200;
          }
          .navbar-menu.open {
            transform: translateX(0);
          }
          .navbar-menu ul {
            flex-direction: column;
            gap: 17px;
            align-items: flex-start;
            padding-left: 18px;
          }
          .navbar-menu ul li a {
            font-size: 1.06rem;
            color: #f0f5ff;
            padding: 8px 3px;
            border-radius: 5px;
          }
          .navbar-menu ul li a:hover,
          .navbar-menu ul li a.active {
            color: #4fa3f7;
            background: rgba(77, 164, 247, 0.13);
          }
          /* Ensure try-it-out-link also applies on mobile */
          .navbar-menu ul li a.try-it-out-link {
            color: #ffd700; /* Golden yellow */
          }
          .navbar-menu ul li a.try-it-out-link:hover,
          .navbar-menu ul li a.try-it-out-link.active {
            color: #daa520; /* Darker golden yellow on hover/active */
            background: rgba(255, 215, 0, 0.1); /* Slight yellow background on hover */
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
        }

        @media (max-width: 420px) {
          .navbar {
            min-height: 52px;
          }
          .navbar-logo img {
            height: 35px;
            width: 28px;
            object-fit: contain;
            margin-right: 3px;
          }
          .navbar-logo span {
            font-size: 0.97rem;
          }
        }
      `}</style>
    </>
  );
};

export default Navbar;

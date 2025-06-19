import Navbar from "./components/navbar";
import { useRouter } from "next/router";

export default function Home({ darkMode, toggleDarkMode }) {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push("/login");
  };

  return (
    <>
      <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <main className={darkMode ? "main dark" : "main"}>
        <section className="hero">
          <div className="hero-text">
            <h1 className="title">
              Play<span className="highlight">Match</span>
            </h1>
            <p className="subtitle">
              มาร่วมจัดก๊วนแบดมินตันกับเราง่าย ๆ สนุก และได้เพื่อนใหม่!
            </p>
            <div className="buttons">
              <button className="get-started" onClick={handleGetStarted}>
                เริ่มต้นใช้งาน
              </button>
              <button className="watch-video" aria-label="Watch Video">
                <div className="play-circle">
                  <span>▶</span>
                </div>
                วิดีโอแนะนำ
              </button>
            </div>
          </div>
          <div className="hero-image">
            <img src="/images/PlayMatch.png" alt="PlayMatch Illustration" />
          </div>
        </section>
      </main>

      <footer className="footer">
        <nav className="footer-nav" aria-label="Footer navigation">
          <a href="#">บ้าน</a>
          <a href="#">ติดต่อ</a>
          <a href="#">ช่วย</a>
          <a href="#">บริจาค</a>
          <a href="#">กฎหมายและนโยบาย</a>
          <a href="#">บริษัท</a>
          <a href="#">สถานะระบบ</a>
        </nav>
        <div className="footer-copy">
          <p>
            ลิขสิทธิ์ © 2025{" "}
            <a
              href="https://www.w3.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              World Wide Web Consortium
            </a>{" "}
            กฎหมายรับผิดชอบ{" "}
            <a
              href="https://www.w3.org/Consortium/Legal/ipr-notice#copyright"
              target="_blank"
              rel="noopener noreferrer"
            >
              เครื่องหมายการค้า
            </a>{" "}
            และ{" "}
            <a
              href="https://www.w3.org/Consortium/Legal/ipr-notice"
              target="_blank"
              rel="noopener noreferrer"
            >
              ใบอนุญาตอนุญาตแบบยินยอมของ W3C®
            </a>{" "}
            มีผลใช้บังคับ
          </p>
        </div>
      </footer>

      <style jsx global>{`
        html,
        body,
        #__next {
          padding: 0;
          margin: 0;
          width: 100%;
          min-height: 100vh;
          box-sizing: border-box;
          overflow-x: hidden;
          background: #1a2236;
        }
      `}</style>
      <style jsx>{`
        .main {
          min-height: calc(100vh - 90px);
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: stretch;
          background: linear-gradient(120deg, #1a2236 60%, #212529 100%);
          color: #f2f4fa;
          padding: 0;
          transition: background 0.3s;
        }
        .main.dark {
          background: linear-gradient(120deg, #171e2b 60%, #11161f 100%);
          color: #e7eaf6;
        }
        .hero {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 4vw;
          width: 100vw;
          margin: 0;
          padding: 60px 6vw 40px 6vw;
          box-sizing: border-box;
        }
        .hero-text {
          flex: 1.1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
        }
        .title {
          font-size: clamp(2.1rem, 4vw, 3.8rem);
          font-weight: 800;
          color: #fff;
          margin-bottom: 14px;
          letter-spacing: 0.01em;
          line-height: 1.08;
        }
        .highlight {
          color: #4fa3f7;
          font-size: inherit;
        }
        .subtitle {
          font-size: clamp(1rem, 2vw, 1.4rem);
          margin-bottom: 28px;
          color: #e4e7f1;
          font-weight: 400;
          max-width: 520px;
          line-height: 1.35;
        }
        .buttons {
          display: flex;
          gap: 16px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .get-started {
          background: linear-gradient(90deg, #146cfa 70%, #4fa3f7 100%);
          color: #fff;
          border: none;
          padding: 12px 42px;
          font-size: clamp(1rem, 2vw, 1.35rem);
          border-radius: 44px;
          cursor: pointer;
          font-weight: 700;
          box-shadow: 0 4px 16px rgba(25, 76, 196, 0.12);
          transition: background 0.2s, box-shadow 0.2s, font-size 0.2s;
        }
        .get-started:hover {
          background: linear-gradient(90deg, #114da8 60%, #0ea6e9 100%);
          box-shadow: 0 6px 20px rgba(20, 108, 250, 0.16);
        }
        .watch-video {
          display: flex;
          align-items: center;
          gap: 10px;
          background: none;
          border: 2px solid #4fa3f7;
          font-size: clamp(1rem, 2vw, 1.22rem);
          color: #4fa3f7;
          cursor: pointer;
          font-weight: 600;
          padding: 12px 32px 12px 14px;
          border-radius: 44px;
          transition: background 0.2s, color 0.2s, border 0.2s, font-size 0.2s;
        }
        .watch-video:hover {
          background: #4fa3f7;
          color: #fff;
          border-color: #146cfa;
        }
        .play-circle {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #fff;
          color: #4fa3f7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.29rem;
          border: 2px solid #4fa3f7;
          flex-shrink: 0;
          transition: background 0.2s, color 0.2s, border 0.2s;
        }
        .watch-video:hover .play-circle {
          background: #146cfa;
          color: #fff;
          border-color: #fff;
        }
        .hero-image {
          flex: 1;
          min-width: 160px;
          max-width: 600px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(46, 92, 224, 0.08);
          border-radius: 22px;
          box-shadow: 0 8px 44px rgba(20, 108, 250, 0.08);
          padding: 20px 10px 12px 10px;
          margin-left: 10px;
          transition: all 0.2s;
        }
        .hero-image img {
          width: 100%;
          max-width: 480px;
          min-width: 120px;
          height: auto;
          border-radius: 14px;
          object-fit: contain;
          transition: all 0.2s;
        }

        /* Responsive: Tablet */
        @media (max-width: 900px) {
          .hero {
            flex-direction: column-reverse;
            gap: 18px;
            padding-top: 22px;
            padding-bottom: 16px;
          }
          .hero-text {
            align-items: center;
            text-align: center;
          }
          .hero-image {
            margin-left: 0;
            margin-bottom: 8px;
            max-width: 290px;
            padding: 6px 0;
          }
          .hero-image img {
            max-width: 220px;
          }
        }
        /* Responsive: Mobile - ซ่อนรูป */
        @media (max-width: 600px) {
          .hero {
            flex-direction: column;
            gap: 8px;
            padding: 6vw 0 2vw 0;
            width: 100vw;
            max-width: 100vw;
          }
          .hero-image {
            display: none !important;
          }
          .hero-text {
            align-items: center;
            text-align: center;
            width: 100vw;
          }
          .title,
          .highlight {
            font-size: 1.15rem;
            line-height: 1.12;
          }
          .highlight {
            font-size: 1.17rem;
          }
          .subtitle {
            font-size: 0.93rem;
            margin-bottom: 12px;
            line-height: 1.23;
            padding-left: 0;
            padding-right: 0;
            max-width: 96vw;
          }
          .buttons {
            flex-direction: column;
            gap: 8px;
            width: 100%;
            align-items: stretch;
            margin-bottom: 8px;
          }
          .get-started,
          .watch-video {
            width: 100%;
            font-size: 0.97rem;
            min-width: 0;
            padding: 10px 0;
          }
        }
        /* Footer styles (เหมือนเดิม) */
        .footer {
          width: 100%;
          background: #232836;
          border-top: 1px solid #2a3047;
          color: #d6e0f5;
          font-size: 1rem;
          padding: 22px 0 11px 0;
          box-sizing: border-box;
          overflow-x: hidden;
        }
        .footer-nav {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 13px;
          margin-bottom: 14px;
          font-weight: 500;
        }
        .footer-nav a {
          color: #fff;
          text-decoration: none;
          opacity: 0.86;
          transition: color 0.2s, opacity 0.2s;
          font-size: 1.01rem;
        }
        .footer-nav a:hover,
        .footer-nav a:focus {
          color: #4fa3f7;
          opacity: 1;
          outline: none;
        }
        .footer-copy {
          text-align: center;
          color: #bac7e1;
          font-size: 0.91rem;
          max-width: 960px;
          margin: 0 auto;
          line-height: 1.5;
          word-break: break-word;
        }
        .footer-copy a {
          color: #4fa3f7;
          text-decoration: underline;
        }
        .footer-copy a:hover,
        .footer-copy a:focus {
          color: #fff;
          outline: none;
        }
        @media (max-width: 600px) {
          .footer {
            font-size: 0.88rem;
            padding: 9px 0 6px 0;
          }
          .footer-nav {
            gap: 7px;
          }
          .footer-copy {
            font-size: 0.77rem;
          }
        }
        @media (max-width: 430px) {
          .footer-nav a {
            font-size: 0.91rem;
          }
          .footer-copy {
            font-size: 0.73rem;
          }
        }
      `}</style>
    </>
  );
}

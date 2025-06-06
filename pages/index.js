import Navbar from './components/navbar';
import { useRouter } from 'next/router';

export default function Home({ darkMode, toggleDarkMode }) {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/login'); // ไปหน้า login
  };

  return (
    <>
      <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <main className={darkMode ? 'main dark' : 'main'}>
        <h1 className="title">
          Welcome to <span className="highlight">PlayMatch</span>
        </h1>
        <p className="subtitle">
          มาร่วมจัดก๊วนแบดมินตันกับเราง่าย ๆ สนุก และได้เพื่อนใหม่!
        </p>
        <div className="buttons">
          <button className="get-started" onClick={handleGetStarted}>Get Started</button>
          <button className="watch-video" aria-label="Watch Video">
            <div className="play-circle"><span>▶</span></div>
            Watch Video
          </button>
        </div>

        <img
          src="/images/PlayMatch.png"
          alt="PlayMatch Illustration"
          className="main-image"
        />

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
          <a href="#" aria-label="Mastodon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C7.5 2 4 6 4 11.1c0 4.4 3.3 7.9 7.5 7.9 4.2 0 7.5-3.5 7.5-7.9C19 6 15.5 2 12 2zM11 17h-1v-4h1v4zm1 0h-1v-1h1v1z"/></svg></a>
          <a href="#" aria-label="GitHub"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .5C5.7.5.5 5.7.5 12.1c0 5.2 3.4 9.6 8.1 11.2.6.1.8-.2.8-.5v-1.9c-3.3.7-4-1.6-4-1.6-.5-1.2-1.2-1.5-1.2-1.5-1-.7.1-.7.1-.7 1 .1 1.6 1 1.6 1 .9 1.5 2.4 1 3 .8.1-.7.4-1 .7-1.3-2.6-.3-5.3-1.3-5.3-5.9 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3 0 0 1-.3 3.3 1.2.9-.3 1.9-.5 2.9-.5s2 .2 2.9.5c2.3-1.5 3.3-1.2 3.3-1.2.6 1.5.2 2.7.1 3 .7.8 1.2 1.8 1.2 3.1 0 4.6-2.7 5.6-5.3 5.9.4.3.7.9.7 1.8v2.7c0 .3.2.6.8.5 4.7-1.6 8.1-6 8.1-11.2C23.5 5.7 18.3.5 12 .5z"/></svg></a>
        </nav>
        <div className="footer-copy">
          <p>
            ลิขสิทธิ์ © 2025{' '}
            <a href="https://www.w3.org/" target="_blank" rel="noopener noreferrer">
              World Wide Web Consortium
            </a>{' '}
            กฎหมายรับผิดชอบ{' '}
            <a href="https://www.w3.org/Consortium/Legal/ipr-notice#copyright" target="_blank" rel="noopener noreferrer">
              เครื่องหมายการค้า
            </a>{' '}
            และ{' '}
            <a href="https://www.w3.org/Consortium/Legal/ipr-notice" target="_blank" rel="noopener noreferrer">
              ใบอนุญาตอนุญาตแบบยินยอมของ W3C®
            </a>{' '}
            มีผลใช้บังคับ
          </p>
        </div>
      </footer>

      <style jsx>{`
        .main {
          min-height: calc(100vh - 80px);
          padding-top: 120px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
          padding-left: 20px;
          padding-right: 20px;
          text-align: center;
          background-color: #f2f4f6;
          color: #333;
          transition: background-color 0.3s, color 0.3s;
        }

        .main.dark {
          background-color: #121212;
          background-image: none;
          color: #eee;
        }

        .title {
          font-size: 3.5rem;
          font-weight: 700;
          margin-bottom: 20px;
          color: #222222;
        }

        .highlight {
          color: #4fa3f7;
        }

        .subtitle {
          font-size: 1.5rem;
          margin-bottom: 40px;
          color: #444444;
          max-width: 600px;
        }

        .buttons {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          justify-content: center;
          margin-bottom: 40px;
        }

        .get-started {
          background-color: #4fa3f7;
          color: white;
          border: none;
          padding: 8px 40px;
          font-size: 1.1rem;
          border-radius: 50px;
          cursor: pointer;
          font-weight: 600;
          transition: background-color 0.3s;
        }

        .get-started:hover {
          background-color: #3b8ddb;
        }

        .watch-video {
          display: flex;
          align-items: center;
          gap: 10px;
          background: none;
          border: none;
          font-size: 1.1rem;
          color: #333;
          cursor: pointer;
          font-weight: 600;
          padding: 14px 20px 14px 0;
        }

        .play-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: white;
          color: #4fa3f7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.6rem;
          user-select: none;
          border: 2px solid #4fa3f7;
          flex-shrink: 0;
          line-height: 1;
        }

        .play-circle > span {
          display: inline-block;
          transform: translateX(2.5px);
          font-size: 1.2rem;
        }

        .watch-video:hover .play-circle {
          background-color: #4fa3f7;
          color: white;
          border-color: #4fa3f7;
        }

        .main-image {
          width: 100%;
          max-width: 600px;
          height: auto;
          margin-bottom: 40px;
          user-select: none;
        }

        footer.footer {
          width: 100%;
          background-color: #fff;
          border-top: 1px solid #ddd;
          padding: 30px 20px;
          box-sizing: border-box;
          font-family: Arial, sans-serif;
          color: #333;
          font-size: 0.9rem;
          user-select: none;
        }

        nav.footer-nav {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 25px;
          margin-bottom: 20px;
          font-weight: 600;
        }

        nav.footer-nav a {
          color: #000;
          text-decoration: underline;
          cursor: pointer;
          transition: color 0.3s;
        }

        nav.footer-nav a:hover,
        nav.footer-nav a:focus {
          color: #4fa3f7;
          outline: none;
        }

        .footer-copy {
          text-align: center;
          font-size: 0.85rem;
          color: #666;
          max-width: 960px;
          margin: 0 auto;
          line-height: 1.5;
        }

        .footer-copy a {
          color: #4fa3f7;
          text-decoration: underline;
        }

        .footer-copy a:hover,
        .footer-copy a:focus {
          color: #2a66c9;
          outline: none;
        }

        @media (max-width: 600px) {
          nav.footer-nav {
            gap: 15px;
          }

          .footer-copy {
            padding: 0 10px;
          }
        }
      `}</style>
    </>
  );
}

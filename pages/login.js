// pages/login.js
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db, serverTimestamp } from "../lib/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Head from 'next/head';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists() && userSnap.data().expiryDate) {
        const userData = userSnap.data();
        const expiryDate = userData.expiryDate.toDate();
        const now = new Date();

        if (now > expiryDate) {
          await auth.signOut();
          setMsg({ 
            type: "error", 
            text: "บัญชีของคุณหมดอายุการใช้งานแล้ว กรุณาติดต่อ PlayMatch Support เพื่อต่ออายุ" 
          });
          setLoading(false);
          return;
        }

        localStorage.setItem("loggedInUsername", userData.username);
        localStorage.setItem("groupName", userData.groupName);
      }

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      await updateDoc(userRef, {
        lastLogin: serverTimestamp(),
      });

      setMsg({ type: "success", text: "✅ เข้าสู่ระบบสำเร็จ" });
      localStorage.setItem("loggedInEmail", user.email);

      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        window.location.href = "/home";
      }, 1000);

    } catch (error) {
      let errorMessage = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "คุณพยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง";
      }
      setMsg({ type: "error", text: errorMessage });
      setLoading(false); 
    }
  };

  return (
    <main className="login-main">
      <Head>
        <title>เข้าสู่ระบบ PlayMatch - จัดการและติดตามการแข่งขันกีฬา</title>
        <meta
          name="description"
          content="เข้าสู่ระบบ PlayMatch แพลตฟอร์มจัดการก๊วนแบดมินตันและกีฬาอื่นๆ เพื่อการบริหารสมาชิก สร้างแมตช์ และติดตามผลได้อย่างง่ายดาย."
        />
      </Head>

      <div className="login-bg-overlay" />
      <div className="login-form-wrapper">
        <div className="login-logo">
          <Image
            src="/images/Logo-iconnew.png"
            alt="โลโก้ PlayMatch"
            width={74}
            height={86}
            priority
            style={{
              objectFit: "contain",
              filter: "drop-shadow(0 8px 24px #2976d6cc)",
            }}
          />
        </div>
        <h1 className="login-title">เข้าสู่ระบบ</h1>
        <form className="login-form" onSubmit={handleSubmit} autoComplete="on">
          <input
            type="email"
            placeholder="Email"
            required
            name="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            required
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="remember-me">
            <input 
              type="checkbox" 
              id="rememberMe" 
              name="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="rememberMe">Remember me</label>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "Sign in"}
          </button>
        </form>

        {msg && (
          <p
            className={msg.type === "success" ? "login-success" : "login-error"}
          >
            {msg.text}
          </p>
        )}

        {isLoading && <p className="login-loading">Loading...</p>}

        <div className="login-contact">
          <a
            href="https://page.line.me/136rjkgt"
            target="_blank"
            rel="noopener noreferrer"
            className="contact-icon"
            aria-label="Line"
          >
            <span>
              <img src="/images/Line-icon.png" alt="ไอคอน Line" />
            </span>
          </a>
          <a
            href="mailto:playmatch.web@gmail.com"
            className="contact-icon"
            aria-label="Email"
          >
            <span>
              <img src="/images/Email-icon.png" alt="ไอคอน Email" />
            </span>
          </a>
        </div>

        <div className="login-copyright">
          © 2025–2026 PlayMatch version 1.5.2
        </div>
      </div>

      <style jsx global>{`
        html,
        body,
        #__next {
          min-height: 100vh;
          background: linear-gradient(120deg, #1a2236 60%, #212529 100%);
          margin: 0;
          padding: 0;
          font-family: "Poppins", "Noto Sans Thai", Arial, sans-serif;
          box-sizing: border-box;
        }
      `}</style>

      <style jsx>{`
        .login-main {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 0;
        }
        .login-bg-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
          background: linear-gradient(120deg, #232d47d2 70%, #1a2236ee 100%);
          z-index: 0;
          pointer-events: none;
        }
        .login-form-wrapper {
          position: relative;
          z-index: 2;
          background: rgba(255, 255, 255, 0.11);
          box-shadow: 0 10px 40px 2px rgba(27, 54, 89, 0.23);
          border-radius: 1.6rem;
          padding: 44px 44px 26px 44px;
          width: 100%;
          max-width: 440px;
          display: flex;
          flex-direction: column;
          align-items: center;
          backdrop-filter: blur(12px) saturate(1.1);
          border: 1.2px solid #4fa3f743;
        }
        .login-logo {
          margin-bottom: 22px;
        }
        .login-title {
          font-size: 2rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 0.03em;
          margin-bottom: 26px;
          text-align: center;
          text-shadow: 0 2px 18px #1e375d55;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 17px;
          width: 100%;
        }
        .login-form input[type="email"],
        .login-form input[type="password"] {
          background: #f2f5faee;
          color: #223147;
          padding: 13px 18px;
          border: 1.5px solid #c7d9ff;
          border-radius: 12px;
          font-size: 1.09rem;
          transition: border 0.22s;
          font-family: inherit;
          outline: none;
        }
        .login-form input[type="email"]:focus,
        .login-form input[type="password"]:focus {
          border: 1.8px solid #4fa3f7;
          background: #fff;
        }
        .remember-me {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #3a5ca8;
          font-size: 0.98rem;
          margin-bottom: 4px;
          user-select: none;
        }
        .remember-me input[type="checkbox"] {
          accent-color: #4fa3f7;
          width: 16px;
          height: 16px;
        }
        .login-form button[type="submit"] {
          background: linear-gradient(90deg, #146cfa 70%, #4fa3f7 100%);
          color: #fff;
          font-weight: 700;
          font-size: 1.09rem;
          padding: 13px 0;
          border-radius: 44px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 18px #2976d629;
          transition: background 0.2s, transform 0.1s, box-shadow 0.18s;
          margin-top: 2px;
        }
        .login-form button[type="submit"]:hover {
          background: linear-gradient(90deg, #104b9e 60%, #18c9f4 100%);
          box-shadow: 0 7px 24px #2c9cfd48;
          transform: translateY(-2px) scale(1.035);
        }

        .login-success,
        .login-error {
          border-radius: 9px;
          padding: 13px 12px;
          margin: 17px 0 0 0;
          width: 100%;
          font-size: 1.02rem;
          font-weight: 500;
          text-align: center;
        }
        .login-success {
          background: #d4f2ed;
          color: #167764;
          border: 1.1px solid #98e9d4;
        }
        .login-error {
          background: #ffe1e2;
          color: #c92a43;
          border: 1.1px solid #f8a3b1;
        }
        .login-loading {
          color: #2196f3;
          font-weight: 600;
          font-size: 1.05rem;
          margin: 13px 0 0 0;
          text-align: center;
        }

        .login-contact {
          display: flex;
          gap: 22px;
          justify-content: center;
          margin: 30px 0 12px 0;
        }
        .contact-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 46px;
          height: 46px;
          background: #eaf6fdde;
          border-radius: 50%;
          transition: box-shadow 0.19s, transform 0.13s;
          box-shadow: 0 2px 7px #2976d62a;
        }
        .contact-icon:hover {
          background: #4fa3f7;
          box-shadow: 0 2px 18px #4fa3f770;
          transform: scale(1.07);
        }
        .contact-icon img {
          width: 29px;
          height: 29px;
          object-fit: contain;
        }

        .login-copyright {
          text-align: center;
          color: #a9b5cc;
          font-size: 0.93rem;
          margin-top: 24px;
          letter-spacing: 0.03em;
        }

        /* Responsive: Tablet */
        @media (max-width: 700px) {
          .login-form-wrapper {
            padding: 32px 16vw 16px 16vw;
            max-width: 92vw;
            border-radius: 1.2rem;
          }
          .login-title {
            font-size: 1.45rem;
          }
          .login-form input,
          .login-form button {
            font-size: 1rem;
          }
        }
        /* Responsive: Mobile */
        @media (max-width: 520px) {
          .login-form-wrapper {
            padding: 22px 7vw 12px 7vw;
            border-radius: 0.8rem;
            min-width: unset;
          }
          .login-title {
            font-size: 1.05rem;
          }
          .login-logo img {
            width: 55px !important;
            height: 65px !important;
          }
          .login-contact {
            gap: 13px;
            margin-top: 18px;
          }
          .contact-icon {
            width: 38px;
            height: 38px;
          }
          .contact-icon img {
            width: 21px;
            height: 21px;
          }
        }
      `}</style>
    </main>
  );
}

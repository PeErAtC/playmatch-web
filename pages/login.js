// pages/login.js
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db, serverTimestamp } from "../lib/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Head from 'next/head';
import toast, { Toaster } from 'react-hot-toast';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
          toast.error("บัญชีของคุณหมดอายุการใช้งานแล้ว กรุณาติดต่อ PlayMatch Support เพื่อต่ออายุ");
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
      
      toast.success("เข้าสู่ระบบสำเร็จ!");
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
      toast.error(errorMessage);
      setLoading(false); 
    }
  };

  return (
    <main className="login-main">
      <Head>
        <title>เข้าสู่ระบบ - PlayMatch</title>
        {/* --- บอก Search Engines ไม่ให้เก็บข้อมูลหน้านี้ --- */}
        <meta name="robots" content="noindex, nofollow" />

        <meta
          name="description"
          content="เข้าสู่ระบบ PlayMatch เพื่อบริหารจัดการก๊วนแบดมินตันของคุณ"
        />
        <link rel="canonical" href="https://playmatch.pro/login" />
      </Head>

      <Toaster position="top-center" reverseOrder={false} />

      <div className="login-bg-overlay" />
      
      <div className="login-form-wrapper">
        <div className="login-logo">
          <Image
            src="/images/Logo-iconnew.png"
            alt="โลโก้ PlayMatch"
            width={100}
            height={105}
            priority
            style={{
              objectFit: "contain",
              filter: "drop-shadow(0 8px 24px #2976d6cc)",
            }}
          />
        </div>
        {/* เพิ่มโค้ดส่วนนี้ */}
        <h1 className="main-title-login">PlayMatch</h1>
        {/* สิ้นสุดการเพิ่มโค้ด */}
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
          <div className="password-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              required
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <div className="remember-me">
            <div>
              <input 
                type="checkbox" 
                id="rememberMe" 
                name="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="rememberMe">Remember me</label>
            </div>
            <a href="/signup" className="signup-link">สมัครใช้งานฟรี</a>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "Sign in"}
          </button>
        </form>

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
          © 2025–2026 PlayMatch version 1.5.8
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
          
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        body::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <style jsx>{`
        .login-main {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 0;
          overflow-y: hidden;
          padding: 20px;
          box-sizing: border-box;
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
  background: rgba(255, 255, 255, 0.08); /* ปรับพื้นหลังให้โปร่งแสงและดูนุ่มนวลขึ้น */
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45); /* เพิ่มเงาที่เข้มขึ้นและดูมีมิติ */
  border-radius: 1.6rem;
  padding: 44px 44px 26px 44px;
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  align-items: center;
  backdrop-filter: blur(15px) saturate(1.2); /* เพิ่มความเบลอและ saturation ให้ดูมีชีวิตชีวา */
  border: 1.2px solid rgba(79, 163, 247, 0.2); /* ปรับสีขอบให้โปร่งใสขึ้นเล็กน้อย */
  height: fit-content;
}
        .login-logo {
          margin-bottom: -15px;
        }
        .main-title-login { /* เพิ่ม CSS สำหรับชื่อ PlayMatch */
          font-size: 2.5rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          margin-bottom: 2px;
          text-align: center;
          background: linear-gradient(135deg, #ffffff, #ffffff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 8px rgba(7, 0, 111, 0.7), 0 0 16px rgba(170, 255, 255, 0.4);
        }
        .login-title {
  font-size: 1.25rem;
  font-weight: 500; /* ลดความหนาของตัวอักษรลงเล็กน้อย */
  color: #b0c4de; /* เปลี่ยนสีให้ดูนุ่มนวลขึ้น */
  letter-spacing: 0.08em; /* เพิ่มระยะห่างระหว่างตัวอักษร */
  margin-bottom: 28px;
  text-align: center;
  text-shadow: none; /* ลบเงาข้อความออกเพื่อให้ดูสะอาดตา */
}
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 17px;
          width: 100%;
        }
        .login-form input[type="email"],
        .login-form input[type="password"],
        .login-form input[type="text"] {
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
        .login-form input[type="password"]:focus,
        .login-form input[type="text"]:focus {
          border: 1.8px solid #4fa3f7;
          background: #fff;
        }
        .password-input-wrapper {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
        }
        .password-input-wrapper input {
          width: 100%;
          box-sizing: border-box;
        }
        .toggle-password {
          position: absolute;
          right: 18px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease-in-out;
        }
        .toggle-password:hover {
          transform: scale(1.1);
        }
        .toggle-password svg {
          font-size: 20px;
          color: #3a5ca8;
          opacity: 0.7;
          transition: color 0.2s;
        }
        .toggle-password:hover svg {
          color: #2976d6;
        }
        .remember-me {
          display: flex; /* ทำให้องค์ประกอบภายในอยู่บรรทัดเดียวกัน */
          align-items: center;
          justify-content: space-between; /* จัดองค์ประกอบให้ชิดซ้ายและขวา */
          width: 100%;
          color: #c7d9ff;
          font-size: 0.98rem;
          margin-bottom: 4px;
          user-select: none;
          font-weight: 500;
        }
        .remember-me input[type="checkbox"] {
          accent-color: #4fa3f7;
          width: 16px;
          height: 16px;
          margin-right: 5px; /* เพิ่มระยะห่างระหว่าง checkbox กับข้อความ */
        }

        /* สไตล์สำหรับลิงก์ "สมัครใช้งานฟรี" */
        .signup-link {
          color: #9cd6ff;
          font-size: 0.93rem;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s ease-in-out;
        }
        .signup-link:hover {
          color: #4fa3f7;
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
          transition: 
            background 0.2s ease-in-out, 
            transform 0.1s ease-in-out, 
            box-shadow 0.18s ease-in-out;
          margin-top: 2px;
          outline: none;
        }
        .login-form button[type="submit"]:hover {
          background: linear-gradient(90deg, #104b9e 60%, #18c9f4 100%);
          transform: translateY(-2px) scale(1.035);
          box-shadow: 0 7px 24px #2c9cfd48;
        }
        .login-form button[type="submit"]:active {
          transform: translateY(1px) scale(0.99);
          box-shadow: 0 2px 8px #2976d629;
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
        .login-form-wrapper::before {
          content: "";
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border-radius: 1.8rem;
          background: linear-gradient(
            165deg,
            #0059ff,
            #200cff,
            #010334,
            #020a24,
            #000000
          );
          background-size: 300% 300%;
          animation: glowing-border 6s linear infinite;
          z-index: -1;
          filter: blur(8px);
          opacity: 0.9;
        }
        @keyframes glowing-border {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .login-form-wrapper::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 2rem;
          pointer-events: none;
          z-index: -2;
          background:
            radial-gradient(circle at 12% 18%, rgba(255, 255, 255, 0.9) 2px, transparent 2.5px),
            radial-gradient(circle at 88% 70%, rgba(255, 255, 255, 0.95) 2.2px, transparent 2.7px),
            radial-gradient(circle at 45% 92%, rgba(255, 255, 255, 0.85) 1.8px, transparent 2.3px),
            radial-gradient(circle at 60% 8%, rgba(255, 255, 255, 0.9) 1.9px, transparent 2.4px),
            radial-gradient(circle at 5% 60%, rgba(255, 255, 255, 0.8) 1.7px, transparent 2.2px),
            radial-gradient(circle at 75% 15%, rgba(255, 255, 255, 0.92) 2.1px, transparent 2.6px),
            radial-gradient(circle at 20% 85%, rgba(255, 255, 255, 0.88) 1.9px, transparent 2.4px),
            radial-gradient(circle at 25% 75%, rgba(255, 255, 255, 0.7) 1.5px, transparent 2px),
            radial-gradient(circle at 75% 25%, rgba(255, 255, 255, 0.75) 1.6px, transparent 2.1px),
            radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.65) 1.4px, transparent 1.9px),
            radial-gradient(circle at 70% 40%, rgba(255, 255, 255, 0.7) 1.3px, transparent 1.8px),
            radial-gradient(circle at 10% 40%, rgba(255, 255, 255, 0.6) 1.1px, transparent 1.6px),
            radial-gradient(circle at 95% 45%, rgba(255, 255, 255, 0.7) 1.5px, transparent 2px),
            radial-gradient(circle at 50% 55%, rgba(255, 255, 255, 0.8) 1.7px, transparent 2.2px),
            radial-gradient(circle at 30% 65%, rgba(255, 255, 255, 0.72) 1.6px, transparent 2.1px),
            radial-gradient(circle at 80% 5%, rgba(255, 255, 255, 0.68) 1.4px, transparent 1.9px),
            radial-gradient(circle at 2% 80%, rgba(255, 255, 255, 0.4) 0.8px, transparent 1.3px),
            radial-gradient(circle at 98% 20%, rgba(255, 255, 255, 0.45) 0.9px, transparent 1.4px),
            radial-gradient(circle at 20% 5%, rgba(255, 255, 255, 0.5) 1px, transparent 1.5px),
            radial-gradient(circle at 80% 95%, rgba(255, 255, 255, 0.55) 1.1px, transparent 1.6px),
            radial-gradient(circle at 15% 30%, rgba(255, 255, 255, 0.4) 0.7px, transparent 1.2px),
            radial-gradient(circle at 85% 60%, rgba(255, 255, 255, 0.5) 1px, transparent 1.5px),
            radial-gradient(circle at 30% 10%, rgba(255, 255, 255, 0.4) 0.8px, transparent 1.3px),
            radial-gradient(circle at 70% 85%, rgba(255, 255, 255, 0.45) 0.9px, transparent 1.4px),
            radial-gradient(circle at 40% 5%, rgba(255, 255, 255, 0.5) 1px, transparent 1.5px),
            radial-gradient(circle at 60% 90%, rgba(255, 255, 255, 0.55) 1.1px, transparent 1.6px),
            radial-gradient(circle at 5% 5%, rgba(255, 255, 255, 0.6) 1.2px, transparent 1.7px),
            radial-gradient(circle at 95% 95%, rgba(255, 255, 255, 0.65) 1.3px, transparent 1.8px),
            radial-gradient(circle at 3% 35%, rgba(255, 255, 255, 0.3) 0.7px, transparent 1.2px),
            radial-gradient(circle at 97% 65%, rgba(255, 255, 255, 0.35) 0.8px, transparent 1.3px),
            radial-gradient(circle at 18% 48%, rgba(255, 255, 255, 0.42) 0.9px, transparent 1.4px),
            radial-gradient(circle at 82% 52%, rgba(255, 255, 255, 0.48) 1px, transparent 1.5px),
            radial-gradient(circle at 4% 10%, rgba(255, 255, 255, 0.3) 0.7px, transparent 1.2px),
            radial-gradient(circle at 96% 90%, rgba(255, 255, 255, 0.35) 0.8px, transparent 1.3px),
            radial-gradient(circle at 22% 2%, rgba(255, 255, 255, 0.4) 0.9px, transparent 1.4px),
            radial-gradient(circle at 78% 98%, rgba(255, 255, 255, 0.45) 1px, transparent 1.5px),
            radial-gradient(circle at 1% 50%, rgba(255, 255, 255, 0.3) 0.7px, transparent 1.2px),
            radial-gradient(circle at 99% 50%, rgba(255, 255, 255, 0.35) 0.8px, transparent 1.3px),
            radial-gradient(circle at 40% 12%, rgba(255, 255, 255, 0.42) 0.9px, transparent 1.4px),
            radial-gradient(circle at 60% 88%, rgba(255, 255, 255, 0.48) 1px, transparent 1.5px),
            radial-gradient(circle at 10% 90%, rgba(255, 255, 255, 0.3) 0.7px, transparent 1.2px),
            radial-gradient(circle at 90% 10%, rgba(255, 255, 255, 0.35) 0.8px, transparent 1.3px),
            radial-gradient(circle at 5% 25%, rgba(255, 255, 255, 0.4) 0.9px, transparent 1.4px),
            radial-gradient(circle at 95% 75%, rgba(255, 255, 255, 0.45) 1px, transparent 1.5px),
            radial-gradient(circle at 25% 15%, rgba(255, 255, 255, 0.3) 0.7px, transparent 1.2px),
            radial-gradient(circle at 75% 85%, rgba(255, 255, 255, 0.35) 0.8px, transparent 1.3px),
            radial-gradient(circle at 35% 3%, rgba(255, 255, 255, 0.42) 0.9px, transparent 1.4px),
            radial-gradient(circle at 65% 97%, rgba(255, 255, 255, 0.48) 1px, transparent 1.5px),
            radial-gradient(circle at 8% 40%, rgba(255, 255, 255, 0.3) 0.7px, transparent 1.2px),
            radial-gradient(circle at 92% 60%, rgba(255, 255, 255, 0.35) 0.8px, transparent 1.3px),
            radial-gradient(circle at 14% 70%, rgba(255, 255, 255, 0.4) 0.9px, transparent 1.4px),
            radial-gradient(circle at 86% 30%, rgba(255, 255, 255, 0.45) 1px, transparent 1.5px),
            radial-gradient(circle at 45% 20%, rgba(255, 255, 255, 0.3) 0.7px, transparent 1.2px),
            radial-gradient(circle at 55% 80%, rgba(255, 255, 255, 0.35) 0.8px, transparent 1.3px),
            radial-gradient(circle at 38% 70%, rgba(255, 255, 255, 0.42) 0.9px, transparent 1.4px),
            radial-gradient(circle at 62% 30%, rgba(255, 255, 255, 0.48) 1px, transparent 1.5px),
            radial-gradient(circle at 28% 92%, rgba(255, 255, 255, 0.3) 0.7px, transparent 1.2px),
            radial-gradient(circle at 72% 8%, rgba(255, 255, 255, 0.35) 0.8px, transparent 1.3px),
            radial-gradient(circle at 10% 55%, rgba(255, 255, 255, 0.4) 0.9px, transparent 1.4px),
            radial-gradient(circle at 90% 45%, rgba(255, 255, 255, 0.45) 1px, transparent 1.5px),
            radial-gradient(circle at 20% 60%, rgba(255, 255, 255, 0.3) 0.7px, transparent 1.2px),
            radial-gradient(circle at 80% 40%, rgba(255, 255, 255, 0.35) 0.8px, transparent 1.3px),
            radial-gradient(circle at 50% 1%, rgba(255, 255, 255, 0.42) 0.9px, transparent 1.4px),
            radial-gradient(circle at 50% 99%, rgba(255, 255, 255, 0.48) 1px, transparent 1.5px),
            radial-gradient(circle at 30% 45%, rgba(255, 255, 255, 0.3) 0.7px, transparent 1.2px),
            radial-gradient(circle at 70% 55%, rgba(255, 255, 255, 0.35) 0.8px, transparent 1.3px),
            radial-gradient(circle at 48% 28%, rgba(255, 255, 255, 0.4) 0.9px, transparent 1.4px),
            radial-gradient(circle at 52% 72%, rgba(255, 255, 255, 0.45) 1px, transparent 1.5px),
            radial-gradient(circle at 5% 75%, rgba(255, 255, 255, 0.3) 0.7px, transparent 1.2px),
            radial-gradient(circle at 95% 25%, rgba(255, 255, 255, 0.35) 0.8px, transparent 1.3px);

          background-size: 800px 800px;
          animation: twinkle 5s infinite ease-in-out alternate;
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          25% { opacity: 0.5; transform: scale(1.61); }
          50% { opacity: 1; transform: scale(0.99); }
          75% { opacity: 0.6; transform: scale(1.62); }
        }

        .login-copyright {
          text-align: center;
          color: #a9b5cc;
          font-size: 0.93rem;
          margin-top: 24px;
          letter-spacing: 0.03em;
        }

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

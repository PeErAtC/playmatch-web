// pages/signup.jsx
import { useState, useEffect } from "react"; // 👈 1. Import useEffect
import Image from "next/image";
import Link from 'next/link';
import { useRouter } from "next/router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, serverTimestamp } from "../lib/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import Head from 'next/head';
import toast, { Toaster } from 'react-hot-toast';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [groupName, setGroupName] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(""); // 👈 2. เพิ่ม State สำหรับจัดการ Error

  // 👇 3. เพิ่ม useEffect เพื่อตรวจสอบรหัสผ่านแบบ Real-time
  useEffect(() => {
    if (confirmPassword && password !== confirmPassword) {
      setPasswordError("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
    } else {
      setPasswordError("");
    }
  }, [password, confirmPassword]);


  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- ส่วนการตรวจสอบข้อมูล ---
    if (!email || !password || !confirmPassword || !username || !groupName || !phone) {
      toast.error("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    if (email !== email.toLowerCase()) {
      toast.error("อีเมลต้องเป็นตัวพิมพ์เล็กเท่านั้น");
      return;
    }
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
        toast.error("กรุณากรอกเบอร์โทรศัพท์ 10 หลักให้ถูกต้อง");
        return;
    }
    // 👇 4. การตรวจสอบรหัสผ่านในส่วนนี้ยังคงไว้เพื่อความปลอดภัย แต่ลบ toast ออก
    if (password !== confirmPassword) {
      // ไม่จำเป็นต้องมี toast เพราะผู้ใช้เห็น error message แบบ real-time แล้ว
      return;
    }
    if (groupName.length > 13) {
      toast.error("ชื่อก๊วนต้องมีความยาวไม่เกิน 13 ตัวอักษร");
      return;
    }
    // --- สิ้นสุดส่วนการตรวจสอบ ---

    setLoading(true);

    try {
      // ... (ส่วนที่เหลือของโค้ดเหมือนเดิม) ...
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 15);

      const userData = {
        username: username,
        groupName: groupName,
        phone: phone,
        email: newUser.email,
        CreateDate: serverTimestamp(),
        expiryDate: expiryDate,
        lastLogin: serverTimestamp(),
        role: "Admin",
        packageType: "Basic",
      };

      await setDoc(doc(db, "users", newUser.uid), userData);

      toast.success("สมัครสมาชิกสำเร็จ! กำลังนำคุณไปยังหน้าเข้าสู่ระบบ");

      setTimeout(() => {
        router.push("/login");
      }, 2000);

    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        toast.error("อีเมลนี้ถูกใช้งานแล้วในระบบ");
      } else if (error.code === 'auth/weak-password') {
        toast.error("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      } else {
        toast.error("เกิดข้อผิดพลาดในการสมัครสมาชิก: " + error.message);
      }
      setLoading(false);
    }
  };

  return (
    <main className="login-main">
      <Head>
        <title>สมัครสมาชิก PlayMatch - เริ่มต้นใช้งาน</title>
        <meta
          name="description"
          content="สมัครสมาชิก PlayMatch เพื่อเริ่มจัดการก๊วนแบดมินตันและกีฬาอื่นๆ ของคุณได้ทันที."
        />
      </Head>

      <Toaster position="top-center" reverseOrder={false} />
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
        <h1 className="login-title">สมัครสมาชิก</h1>
        <form className="login-form" onSubmit={handleSubmit} autoComplete="off">
           {/* ... Input fields for username, groupName, phone, email ... */}
           <input
            type="text"
            placeholder="Username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="text"
            placeholder="ชื่อก๊วน"
            required
            maxLength="13"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <input
            type="tel"
            placeholder="เบอร์โทรศัพท์"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength="10"
          />
          <input
            type="email"
            placeholder="Email (ตัวพิมพ์เล็กเท่านั้น)"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="password-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
             <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <div className="password-input-wrapper">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
             <button type="button" className="toggle-password" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          {/* 👇 5. แสดง error message ที่นี่ */}
          {passwordError && <p className="error-text">{passwordError}</p>}

          <button type="submit" disabled={loading || passwordError}>
            {loading ? "กำลังสมัคร..." : "Sign Up"}
          </button>
        </form>

        <div className="login-sub-action">
          มีบัญชีอยู่แล้ว? <Link href="/login">เข้าสู่ระบบที่นี่</Link>
        </div>
        <div className="login-copyright">
          © 2025–2026 PlayMatch version 1.5.4
        </div>
      </div>

      <style jsx global>{`
        /* ... Global styles remain the same ... */
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
        /* ... Other component styles remain the same ... */
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
          height: fit-content;
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
        .login-form input {
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
        .login-form input:focus {
          border: 1.8px solid #4fa3f7;
          background: #fff;
        }
        .password-input-wrapper {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          /* This is new to handle error message below */
          flex-wrap: wrap; 
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
          box-shadow: 0 7px 24px #2c9cfd48;
          transform: translateY(-2px) scale(1.035);
        }
        .login-form button[type="submit"]:active {
          transform: translateY(1px) scale(0.99);
          box-shadow: 0 2px 8px #2976d629;
        }
        /* Style for disabled button */
        .login-form button[type="submit"]:disabled {
            background: #8b96a8;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        .login-sub-action {
          color: #a9b5cc;
          margin-top: 20px;
          font-size: 0.95rem;
        }
        .login-sub-action a {
          color: #4fa3f7;
          text-decoration: none;
          font-weight: 600;
        }
        .login-sub-action a:hover {
          text-decoration: underline;
        }
        .login-copyright {
          text-align: center;
          color: #a9b5cc;
          font-size: 0.93rem;
          margin-top: 24px;
          letter-spacing: 0.03em;
        }

        /* 👇 6. เพิ่ม Style สำหรับข้อความ Error */
        .error-text {
          color: #ff9a9a;
          font-size: 0.9rem;
          width: 100%;
          text-align: left;
          margin-top: -10px; /* ทำให้ข้อความขยับขึ้นไปใกล้ input */
          margin-bottom: -5px; /* ลดช่องว่างด้านล่าง */
          padding-left: 5px;
        }

        .login-form-wrapper::before, .login-form-wrapper::after {
            content: "";
            position: absolute;
            z-index: -1;
        }
        .login-form-wrapper::before {
            top: -4px; left: -4px; right: -4px; bottom: -4px;
            border-radius: 1.8rem;
            background: linear-gradient(165deg, #0059ff, #200cff, #010334, #020a24, #000000);
            background-size: 300% 300%;
            animation: glowing-border 6s linear infinite;
            filter: blur(8px);
            opacity: 0.9;
        }
        @keyframes glowing-border {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
      `}</style>
    </main>
  );
}

// pages/signup.jsx
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from 'next/link';
import { useRouter } from "next/router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, serverTimestamp } from "../lib/firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
import Head from 'next/head';
import toast, { Toaster } from 'react-hot-toast';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import Swal from 'sweetalert2';

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
  const [passwordError, setPasswordError] = useState("");
  const [adminContact, setAdminContact] = useState(null);

  useEffect(() => {
    const fetchAdminContact = async () => {
      try {
        const configDocRef = doc(db, "configurations", "appConfig");
        const configSnap = await getDoc(configDocRef);
        if (configSnap.exists() && configSnap.data().adminLineId) {
          setAdminContact({
            adminLineId: configSnap.data().adminLineId,
            adminLineUrl: configSnap.data().adminLineUrl || "#",
          });
        } else {
          setAdminContact({ adminLineId: "admin_contact", adminLineUrl: "#" });
          console.warn("Admin contact info not found in configurations/appConfig.");
        }
      } catch (error) {
        console.error("Error fetching admin contact:", error);
      }
    };
    fetchAdminContact();
  }, []);

  useEffect(() => {
    if (adminContact) {
      Swal.fire({
        title: 'แจ้งเพื่อทราบ',
        html: `
          <div class="swal-custom-content">
            <p style="margin-bottom: 0.5rem;">
              การสมัครสมาชิกหน้านี้จะได้รับแพ็กเกจ <strong>Free</strong><br>
              (ใช้งานฟรี 1 ปี) ซึ่งมีข้อจำกัดบางประการ:
            </p>
            <ul class="swal-custom-list">
              <li>จำกัดสมาชิกสูงสุด 12 คน</li>
              <li>บางเมนูการใช้งานจะถูกล็อค</li>
            </ul>
            <p class="swal-custom-contact-info">
              หากต้องการเพิ่มสมาชิกมากกว่า 12 คน<br>
              สามารถติดต่อผู้ดูแลเพื่อสมัครแพ็กเกจ <strong>Basic หรือ Pro</strong><br>
              (ทดลองใช้ฟรีก่อน 30 วันไม่มีค่าใช้จ่าย)
            </p>
          </div>
        `,
        showConfirmButton: true,
        confirmButtonText: 'ติดต่อแอดมินผ่าน LINE',
        showCloseButton: true,
        customClass: {
          popup: 'swal-custom-popup',
          title: 'swal-custom-title',
          htmlContainer: 'swal-custom-html-container',
          confirmButton: 'swal-custom-confirm-button',
          closeButton: 'swal-custom-close-button',
        },
        didOpen: (popup) => {
            const titleElement = popup.querySelector('.swal-custom-title');
            if(titleElement){
                const iconHTML = `
                <div class="swal-custom-icon-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="m12 8-.01.01"/></svg>
                </div>`;
                titleElement.insertAdjacentHTML('beforebegin', iconHTML);
            }
        },
        preConfirm: () => {
          const myLineUrl = 'https://line.me/R/ti/p/@136rjkgt?from=page&searchId=136rjkgt';
          window.open(myLineUrl, '_blank');
          return false;
        }
      });
    }
  }, [adminContact]);


  useEffect(() => {
    // 1. ตรวจสอบความยาวของรหัสผ่านก่อน (เมื่อผู้ใช้เริ่มพิมพ์)
    if (password && password.length < 7) {
      setPasswordError("รหัสผ่านต้องมีอย่างน้อย 7 ตัวอักษร");
    }
    // 2. ถ้าความยาวยาวพอแล้ว ให้ตรวจสอบว่ารหัสตรงกันหรือไม่
    else if (confirmPassword && password !== confirmPassword) {
      setPasswordError("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
    }
    // 3. ถ้าทุกอย่างถูกต้อง ให้ลบข้อความ error ออก
    else {
      setPasswordError("");
    }
  }, [password, confirmPassword]);


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword || !username || !groupName || !phone) {
      toast.error("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
        toast.error("กรุณากรอกเบอร์โทรศัพท์ 10 หลักให้ถูกต้อง");
        return;
    }
    if (passwordError) { // ตรวจสอบว่ามี error จาก useEffect หรือไม่
        return;
    }
    if (groupName.length > 13) {
      toast.error("ชื่อก๊วนต้องมีความยาวไม่เกิน 13 ตัวอักษร");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      const userData = {
        username: username,
        groupName: groupName,
        phone: phone,
        email: newUser.email,
        CreateDate: serverTimestamp(),
        expiryDate: expiryDate,
        lastLogin: serverTimestamp(),
        role: "Admin",
        packageType: "Free",
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
        toast.error("รหัสผ่านสั้นเกินไป กรุณาตั้งรหัสผ่านอย่างน้อย 7 ตัวอักษร");
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
            onChange={(e) => setEmail(e.target.value.toLowerCase())}
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

          {passwordError && <p className="error-text">{passwordError}</p>}

          <button type="submit" disabled={loading || passwordError}>
            {loading ? "กำลังสมัคร..." : "Sign Up"}
          </button>
        </form>

        <div className="login-sub-action">
          มีบัญชีอยู่แล้ว? <a href="/login">เข้าสู่ระบบที่นี่</a>
        </div>
        <div className="login-copyright">
          © 2025–2026 PlayMatch version 1.6.4
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

        .swal-custom-popup {
            border-radius: 1.25rem !important;
            padding: 1.5rem 1.5rem 2rem 1.5rem !important;
            width: 90% !important;
            max-width: 480px !important;
        }

        .swal-custom-icon-wrapper {
            margin: 0 auto 1.25rem;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background-color: #e0f2f1;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #00796b;
        }

        .swal-custom-title {
            font-size: 1.75rem !important;
            font-weight: 600 !important;
            color: #263238 !important;
            margin-bottom: 0.5rem !important;
        }

        .swal-custom-html-container {
            margin: 0 !important;
            font-size: 1rem !important;
            color: #546e7a !important;
        }

        .swal-custom-content {
            text-align: center;
        }

        .swal-custom-content p {
            margin: 0 0 1rem 0;
            line-height: 1.6;
        }

        .swal-custom-list {
            list-style-type: none;
            padding-left: 0;
            margin: 0 auto 1.5rem;
            display: inline-block;
            text-align: left;
        }

        .swal-custom-list li {
            position: relative;
            padding-left: 25px;
            margin-bottom: 0.5rem;
        }

        .swal-custom-list li::before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #00796b;
            font-weight: bold;
        }

        .swal-custom-contact-info {
            font-size: 0.95rem;
            color: #37474f;
            background-color: #f1f8e9;
            padding: 0.75rem;
            border-radius: 8px;
            border-left: 4px solid #7cb342;
        }

        .swal-custom-confirm-button {
            background-color: transparent !important;
            color: #00796b !important;
            border: 2px solid #00796b !important;
            border-radius: 50px !important;
            padding: 0.75rem 2rem !important;
            font-size: 1rem !important;
            font-weight: 600 !important;
            transition: all 0.2s ease-in-out !important;
            box-shadow: none !important;
        }

        .swal-custom-confirm-button:hover {
            background-color: #00796b !important;
            color: white !important;
            transform: translateY(-2px);
        }

        .swal-custom-close-button {
            color: #90a4ae !important;
            font-size: 2rem !important;
            transition: color 0.2s ease-in-out !important;
        }

        .swal-custom-close-button:hover {
            color: #263238 !important;
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
        .error-text {
          color: #ff9a9a;
          font-size: 0.9rem;
          width: 100%;
          text-align: left;
          margin-top: -10px;
          margin-bottom: -5px;
          padding-left: 5px;
        }

        /* --- START: โค้ดเอฟเฟค Glowing Border และ Twinkling Stars --- */
        .login-form-wrapper::before {
            content: "";
            position: absolute;
            z-index: -1;
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

        .login-form-wrapper::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 1.6rem;
          pointer-events: none;
          z-index: 3;
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
          animation: twinkle 4s infinite ease-in-out;
          opacity: 0;
        }

        @keyframes twinkle {
          0% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        /* --- END: โค้ดเอฟเฟค --- */
      `}</style>
    </main>
  );
}

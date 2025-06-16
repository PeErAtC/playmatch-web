import { useState } from 'react';
import Image from 'next/image'; // นำเข้า Image จาก next/image
import { useRouter } from 'next/router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebaseConfig'; // ตรวจสอบ path ให้ถูกต้อง
import { doc, getDoc } from 'firebase/firestore';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // state ใหม่สำหรับแสดงโหลด

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // ดึงข้อมูลจาก Firebase
      const userRef = doc(db, 'users', user.uid); // ใช้ user.uid ในการดึงข้อมูล
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const username = userData.username;
        const groupName = userData.groupName;
        
        // เก็บข้อมูลใน localStorage
        localStorage.setItem('loggedInUsername', username);
        localStorage.setItem('groupName', groupName);
      }

      setMsg({ type: 'success', text: '✅ เข้าสู่ระบบสำเร็จ' });

      // เก็บ email ของผู้ใช้ใน localStorage
      localStorage.setItem('loggedInEmail', user.email);

      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        router.push('/home'); // เปลี่ยนไปหน้า home
      }, 1000); // หน่วงเวลา 1 วินาที
    } catch (error) {
      setMsg({ type: 'error', text: error.message || 'Login failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="main">
      <div>
        <Image src="/images/Logo.png" alt="PlayMatch Logo" width={70} height={100} priority />
        <h1>Please sign in</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email address"
            required
            autoFocus
            name="email"
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
            <input type="checkbox" id="rememberMe" name="rememberMe" />
            <label htmlFor="rememberMe">Remember me</label>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {msg && (
          <p className={msg.type === 'success' ? 'success-msg' : 'error-msg'}>
            {msg.text}
          </p>
        )}

        {/* เพิ่มข้อความ Loading ถ้า isLoading เป็น true */}
        {isLoading && <p className="loading-msg">Loading...</p>}

        <p className="footer-text">© 2024–2025</p>
      </div>

      <style jsx>{`
        .main {
          min-height: 100vh;
          padding-top: 80px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
          padding-left: 20px;
          padding-right: 20px;
          text-align: center;
          background-color: #f8f9fa;
          color: #333;
          transition: background-color 0.3s, color 0.3s;
        }

        h1 {
          margin-top: 16px;
          margin-bottom: 24px;
          font-weight: 400;
        }

        form {
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 320px;
        }

        input[type='email'],
        input[type='password'] {
          height: 44px;
          margin-bottom: 12px;
          padding: 10px 12px;
          font-size: 1rem;
          border: 1px solid #ccc;
          border-radius: 4px;
        }

        .remember-me {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
          font-size: 0.9rem;
          color: #555;
        }

        .remember-me input[type='checkbox'] {
          margin-right: 8px;
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        button[type='submit'] {
          background-color: #0d6efd;
          color: white;
          border: none;
          padding: 12px;
          font-size: 1.1rem;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        button[type='submit']:hover {
          background-color: #0b5ed7;
        }

        .footer-text {
          margin-top: 30px;
          font-size: 0.9rem;
          color: #777;
        }

        .success-msg {
          background-color: #d1e7dd;
          color: #0f5132;
          border: 1px solid #badbcc;
          padding: 10px 14px;
          border-radius: 6px;
          margin-top: 16px;
          font-size: 0.95rem;
        }

        .error-msg {
          background-color: #f8d7da;
          color: #842029;
          border: 1px solid #f5c2c7;
          padding: 10px 14px;
          border-radius: 6px;
          margin-top: 16px;
          font-size: 0.95rem;
        }

        .loading-msg {
          font-size: 1rem;
          color: #0d6efd;
          margin-top: 20px;
          font-weight: 600;
        }

        @media (min-width: 768px) and (max-width: 1366px) {
          .main {
            padding-top: 60px;
          }
        }

        @media (max-width: 480px) {
          .main {
            padding-top: 40px;
          }

          form {
            max-width: 100%;
          }
        }
      `}</style>
    </main>
  );
}

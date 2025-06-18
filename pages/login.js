import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const username = userData.username;
        const groupName = userData.groupName;

        localStorage.setItem("loggedInUsername", username);
        localStorage.setItem("groupName", groupName);
      }

      setMsg({ type: "success", text: "✅ เข้าสู่ระบบสำเร็จ" });
      localStorage.setItem("loggedInEmail", user.email);

      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        router.push("/home");
      }, 1000);
    } catch (error) {
      setMsg({ type: "error", text: error.message || "Login failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="main">
      <div className="form-container">
        <Image
          src="/images/Logo.png"
          alt="PlayMatch Logo"
          width={80}
          height={100}
          priority
        />
        <h1>Login to your Account</h1>
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
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {msg && (
          <p className={msg.type === "success" ? "success-msg" : "error-msg"}>
            {msg.text}
          </p>
        )}

        {isLoading && <p className="loading-msg">Loading...</p>}

        <p className="footer-text">© 2024–2025</p>

        {/* Icons for Line and Email */}
        <div className="contact-icons">
          <a
            href="https://page.line.me/136rjkgt"
            target="_blank"
            rel="noopener noreferrer"
            className="contact-icon"
          >
            <img
              src="/images/line.png"
              alt="Line Icon"
              className="line-icon"
            />
          </a>

          <a
            href="mailto:playmatch.web@gmail.com"
            className="contact-icon"
          >
            <img
              src="/images/Email.png"
              alt="Email Icon"
              className="email-icon"
            />
          </a>
        </div>
      </div>

      <style jsx>{`
        .main {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background-color: #f3f4f6;
          padding: 0 20px;
          font-family: 'Poppins', sans-serif;
        }

        .form-container {
          background-color: #ffffff;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          padding: 40px 30px;
          width: 100%;
          max-width: 400px;
          text-align: center;
        }

        h1 {
          font-size: 1.8rem;
          color: #333;
          margin-bottom: 20px;
          font-weight: 600;
        }

        form {
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        input[type="email"],
        input[type="password"] {
          height: 48px;
          margin-bottom: 16px;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #ddd;
          font-size: 1rem;
          font-family: 'Poppins', sans-serif;
        }

        .remember-me {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
          font-size: 0.9rem;
          color: #555;
        }

        .remember-me input {
          margin-right: 8px;
          width: 18px;
          height: 18px;
        }

        button[type="submit"] {
          background-color: #0d6efd;
          color: white;
          border: none;
          padding: 12px;
          font-size: 1.1rem;
          font-family: 'Poppins', sans-serif;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        button[type="submit"]:hover {
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

        .contact-icons {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-top: 20px;
        }

        .contact-icon {
          display: inline-block;
        }

        .line-icon, .email-icon {
          width: 40px;
          height: 40px;
          cursor: pointer;
        }

        @media (max-width: 480px) {
          .form-container {
            padding: 30px 20px;
          }

          h1 {
            font-size: 1.5rem;
          }

          input[type="email"],
          input[type="password"] {
            font-size: 0.95rem;
          }
        }
      `}</style>
    </main>
  );
}

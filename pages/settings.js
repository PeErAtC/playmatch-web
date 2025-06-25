import React, { useState, useEffect, useMemo } from "react";
import { Moon, Sun, Bell, BellOff, Languages } from "lucide-react";
import { FaRegUserCircle } from "react-icons/fa"; 

import { db } from "../lib/firebaseConfig";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

export default function SettingsPage() {
  const isBrowser = typeof window !== "undefined";

  const [language, setLanguage] = useState("thai");
  const [theme, setTheme] = useState("light");
  const [birthdayNotifications, setBirthdayNotifications] = useState(true);

  // State สำหรับข้อมูลโปรไฟล์
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loggedInEmail, setLoggedInEmail] = useState("");

  const getText = (key) => {
    const texts = {
      thai: {
        settingsTitle: "การตั้งค่า",
        generalSettings: "การตั้งค่าทั่วไป",
        personalInfo: "ข้อมูลส่วนตัว",
        languageLabel: "ภาษา",
        themeLabel: "ธีม",
        lightMode: "โหมดสว่าง",
        darkMode: "โหมดมืด",
        notificationsLabel: "การแจ้งเตือนวันเกิด",
        notificationsOn: "เปิด",
        notificationsOff: "ปิด",
        emailLabel: "อีเมล",
        groupNameLabel: "ชื่อก๊วน",
        roleLabel: "บทบาท",
        usernameLabel: "ชื่อผู้ใช้งาน",
        accountStatusLabel: "สถานะบัญชี",
        loading: "กำลังโหลดข้อมูล...",
        error: "เกิดข้อผิดพลาด:",
        noData: "ไม่มีข้อมูล",
        expiresIn: "กำลังจะหมดอายุในอีก",
        days: "วัน",
        expired: "หมดอายุแล้ว",
        expiresToday: "หมดอายุวันนี้", 
      },
      english: {
        settingsTitle: "Settings",
        generalSettings: "General Settings",
        personalInfo: "Personal Information",
        languageLabel: "Language",
        themeLabel: "Theme",
        lightMode: "Light Mode",
        darkMode: "Dark Mode",
        notificationsLabel: "Birthday Notifications",
        notificationsOn: "On",
        notificationsOff: "Off",
        emailLabel: "Email",
        groupNameLabel: "Group Name",
        roleLabel: "Role",
        usernameLabel: "Username",
        accountStatusLabel: "Account Status",
        loading: "Loading data...",
        error: "Error:",
        noData: "No data",
        expiresIn: "Expires in",
        days: "days",
        expired: "Expired",
        expiresToday: "Expires today",
      },
    };
    return texts[language][key];
  };

  useEffect(() => {
    if (isBrowser) {
      const email = localStorage.getItem("loggedInEmail");
      if (email) {
        setLoggedInEmail(email);
      } else {
        setProfileError(getText("noData"));
        setLoadingProfile(false);
      }
    }
  }, [isBrowser, language]);

  useEffect(() => {
    const fetchUserId = async () => {
      if (!loggedInEmail) return;

      try {
        setLoadingProfile(true);
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", loggedInEmail));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          querySnapshot.forEach(doc => {
            setCurrentUserId(doc.id);
            return; 
          });
        } else {
          setProfileError(getText("noData"));
          setLoadingProfile(false);
        }
      } catch (err) {
        console.error("Error fetching user ID:", err);
        setProfileError(getText("error") + " " + err.message);
        setLoadingProfile(false);
      }
    };

    fetchUserId();
  }, [loggedInEmail, language]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUserId) {
        return;
      }
      setLoadingProfile(true);
      setProfileError(null);
      try {
        const userDocRef = doc(db, "users", currentUserId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUserProfile({
            email: userData.email || "N/A",
            groupName: userData.groupName || "N/A",
            role: userData.role || "N/A",
            username: userData.username || "N/A",
            createDate: userData.CreateDate || null, 
            accountDurationDays: userData.AccountDurationDays !== undefined ? Number(userData.AccountDurationDays) : 30, // ดึงค่าและแปลงเป็น number, default 30
          });
        } else {
          setProfileError(getText("noData"));
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setProfileError(getText("error") + " " + err.message);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [currentUserId, language]);

  const accountExpiryInfo = useMemo(() => {
    if (!userProfile || !userProfile.createDate || userProfile.accountDurationDays === undefined) {
      return { status: "not_available", message: getText("noData") };
    }

    let createDate;
    // ตรวจสอบว่าเป็น Firebase Timestamp object หรือไม่
    if (typeof userProfile.createDate.toDate === 'function') {
        createDate = userProfile.createDate.toDate(); // แปลง Timestamp เป็น Date object
    } else {
        // Fallback หรือแจ้งเตือนถ้า CreateDate ไม่ใช่ Timestamp
        console.warn("CreateDate is not a Firebase Timestamp. Falling back to string parsing if possible.");
        if (typeof userProfile.createDate === 'string') {
            const parts = userProfile.createDate.split('/');
            // Date constructor ใช้ MM/DD/YYYY หรือ YYYY-MM-DD
            if (parts.length === 3) {
                createDate = new Date(`${parts[1]}/${parts[0]}/${parts[2]}`);
            } else {
                console.error("Invalid CreateDate string format:", userProfile.createDate);
                return { status: "error", message: getText("error") + " Invalid CreateDate format" };
            }
        } else {
            console.error("Unknown CreateDate type:", typeof userProfile.createDate);
            return { status: "error", message: getText("error") + " Unknown CreateDate type" };
        }
    }

    // ตรวจสอบว่า Date object ถูกต้องหรือไม่ (เช่น กรณี string format ผิด)
    if (isNaN(createDate.getTime())) {
        console.error("Invalid Date object after parsing CreateDate:", userProfile.createDate);
        return { status: "error", message: getText("error") + " Invalid date" };
    }
    
    // กำหนดวันหมดอายุ โดยบวกจำนวนวันที่กำหนดไว้ (AccountDurationDays)
    const expiryDate = new Date(createDate);
    expiryDate.setDate(createDate.getDate() + userProfile.accountDurationDays); 

    const now = new Date();
    
    // ตั้งค่าเวลาของ now และ expiryDate ให้เป็น 00:00:00 เพื่อคำนวณวันที่อย่างเดียว
    now.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);

    const diffTime = expiryDate.getTime() - now.getTime();
    // ใช้ Math.ceil เพื่อให้ 0.x วันกลายเป็น 1 วัน
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays > 0) {
      return {
        status: "active",
        message: `${getText("expiresIn")} ${diffDays} ${getText("days")}`,
        isExpiringSoon: diffDays <= 7 
      };
    } else if (diffDays === 0) { // วันนี้เป็นวันหมดอายุ
      return {
        status: "expires_today",
        message: getText("expiresToday"),
        isExpiringSoon: true
      };
    } else { // diffDays ติดลบ คือหมดอายุแล้ว
      return {
        status: "expired",
        message: getText("expired"),
        isExpiringSoon: false 
      };
    }
  }, [userProfile, language, getText]);

  // Effects สำหรับ localStorage (เหมือนเดิม)
  useEffect(() => {
    if (isBrowser) {
      const savedLanguage = localStorage.getItem("appLanguage");
      const savedTheme = localStorage.getItem("appTheme");
      const savedBirthdayNotifications = localStorage.getItem(
        "birthdayNotifications"
      );

      if (savedLanguage) setLanguage(savedLanguage);
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);
      }
      if (savedBirthdayNotifications !== null) {
        setBirthdayNotifications(JSON.parse(savedBirthdayNotifications));
      }
    }
  }, [isBrowser]);

  useEffect(() => {
    if (isBrowser) {
      localStorage.setItem("appLanguage", language);
    }
  }, [language, isBrowser]);

  useEffect(() => {
    if (isBrowser) {
      localStorage.setItem("appTheme", theme);
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme, isBrowser]);

  useEffect(() => {
    if (isBrowser) {
      localStorage.setItem(
        "birthdayNotifications",
        JSON.stringify(birthdayNotifications)
      );
    }
  }, [birthdayNotifications, isBrowser]);

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const toggleBirthdayNotifications = () => {
    setBirthdayNotifications((prev) => !prev);
  };

  return (
    <div className="overall-layout">
      <main className="main-content">
        <h2>{getText("settingsTitle")}</h2>
        <hr className="title-separator" />

        {/* ส่วนข้อมูลส่วนตัว */}
        <div className="settings-section personal-info-section">
          <h3>{getText("personalInfo")}</h3>
          {loadingProfile ? (
            <p>{getText("loading")}</p>
          ) : profileError ? (
            <p className="error-message">{getText("error")} {profileError}</p>
          ) : userProfile ? (
            <div className="profile-details-grid">
              <div className="profile-avatar-wrapper">
                {/* ใช้ FaRegUserCircle แทน */}
                <FaRegUserCircle size={80} color="var(--text-color, #666)" />
              </div>
              <div className="profile-text-info">
                <div className="info-item">
                  <span className="info-label">{getText("usernameLabel")}:</span>
                  <span className="info-value">{userProfile.username}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{getText("emailLabel")}:</span>
                  <span className="info-value">{userProfile.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{getText("groupNameLabel")}:</span>
                  <span className="info-value">{userProfile.groupName}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{getText("roleLabel")}:</span>
                  <span className="info-value">{userProfile.role}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{getText("accountStatusLabel")}:</span>
                  <span className={`info-value ${accountExpiryInfo.status === 'expired' ? 'status-expired' : accountExpiryInfo.isExpiringSoon ? 'status-expiring-soon' : ''}`}>
                    {accountExpiryInfo.message}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p>{getText("noData")}</p>
          )}
        </div>
        
        {/* ส่วนการตั้งค่าทั่วไป (เหมือนเดิม) */}
        <div className="settings-section">
          <h3>{getText("generalSettings")}</h3>
          <div className="setting-item">
            <div className="setting-label">
              <Languages size={20} />
              <span>{getText("languageLabel")}</span>
            </div>
            <select
              value={language}
              onChange={handleLanguageChange}
              className="setting-control"
            >
              <option value="thai">ไทย</option>
              <option value="english">English</option>
            </select>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              {theme === "light" ? <Sun size={20} /> : <Moon size={20} />}
              <span>{getText("themeLabel")}</span>
            </div>
            <div
              className="setting-control toggle-switch"
              onClick={toggleTheme}
            >
              <div className={`switch-track ${theme}`}>
                <div className="switch-thumb"></div>
              </div>
              <span className="toggle-label">
                {theme === "light" ? getText("lightMode") : getText("darkMode")}
              </span>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              {birthdayNotifications ? (
                <Bell size={20} />
              ) : (
                <BellOff size={20} />
              )}
              <span>{getText("notificationsLabel")}</span>
            </div>
            <div
              className="setting-control toggle-switch"
              onClick={toggleBirthdayNotifications}
            >
              <div
                className={`switch-track ${
                  birthdayNotifications ? "on" : "off"
                }`}
              >
                <div className="switch-thumb"></div>
              </div>
              <span className="toggle-label">
                {birthdayNotifications
                  ? getText("notificationsOn")
                  : getText("notificationsOff")}
              </span>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        /* Global theme variables */
        :root {
          --background-color-light: #f7f7f7;
          --text-color-light: #333;
          --card-background-light: #ffffff;
          --border-color-light: #e0e0e0;
          --header-background-light: #323943;
          --header-text-light: white;
          --input-background-light: #fff;
          --input-border-light: #ccc;
          --toggle-on-background-light: #4bf196;
          --toggle-off-background-light: #ccc;
          --status-expiring-soon-light: #ffc107; /* Amber for warning */
          --status-expired-light: #dc3545; /* Red for expired */
        }

        [data-theme="dark"] {
          --background-color: #2c2c2c;
          --text-color: #f1f1f1;
          --card-background: #3a3a3a;
          --border-color: #555;
          --header-background: #2a2a2a;
          --header-text: #eee;
          --input-background: #444;
          --input-border: #666;
          --toggle-on-background: #007bff; /* Dark mode blue for on */
          --toggle-off-background: #555;
          --status-expiring-soon: #ffc107; /* Amber for warning */
          --status-expired: #dc3545; /* Red for expired */
        }

        body {
          background-color: var(
            --background-color,
            var(--background-color-light)
          );
          color: var(--text-color, var(--text-color-light));
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        .main-content {
          background-color: var(
            --background-color,
            var(--background-color-light)
          ); /* Ensure main content respects theme */
          padding: 28px;
          overflow-y: auto;
        }
        .main-content h2 {
          font-size: 18px; /* Changed from 24px */
          color: var(--text-color, var(--text-color-light));
          margin-bottom: 10px; /* Adjusted margin for new font size */
        }
        .main-content h3 {
          color: var(--text-color, var(--text-color-light));
        }
        .title-separator {
          border: 0;
          border-top: 1px solid #aebdc9;
          margin-bottom: 18px;
        }

        /* --- END Global theme variables --- */

        /* General Layout */
        .overall-layout {
          display: block;
          width: 100%;
          min-height: 100vh;
        }

        .settings-section {
          background-color: var(--card-background, #ffffff);
          border-radius: 12px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
          padding: 20px;
          margin-top: 20px;
        }

        .settings-section h3 {
          font-size: 16px;
          margin-top: 0;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border-color, #e0e0e0);
          color: var(--text-color, #333);
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid var(--border-color, #f0f0f0);
        }

        .setting-item:last-child {
          border-bottom: none;
        }

        .setting-label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          color: var(--text-color, #333);
          font-weight: 500;
        }

        .setting-control {
          flex-shrink: 0;
          min-width: 120px;
          text-align: right;
        }

        .setting-control select {
          padding: 8px 12px;
          border: 1px solid var(--input-border, #ccc);
          border-radius: 6px;
          background-color: var(--input-background, #fff);
          color: var(--text-color, #333);
          font-size: 14px;
          cursor: pointer;
          outline: none;
        }

        /* Toggle Switch Styles */
        .toggle-switch {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          user-select: none;
        }

        .switch-track {
          width: 45px;
          height: 24px;
          border-radius: 12px;
          position: relative;
          transition: background-color 0.3s;
        }

        .switch-track.light,
        .switch-track.off {
          background-color: var(--toggle-off-background, #ccc);
        }

        .switch-track.dark,
        .switch-track.on {
          background-color: var(--toggle-on-background, #4bf196);
        }

        .switch-thumb {
          width: 20px;
          height: 20px;
          background-color: var(--toggle-thumb, #fff);
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform 0.3s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .switch-track.dark .switch-thumb,
        .switch-track.on .switch-thumb {
          transform: translateX(21px);
        }

        .toggle-label {
          font-size: 14px;
          color: var(--text-color, #555);
          font-weight: 400;
        }

        /* Personal Info Section Styles */
        .personal-info-section {
          padding: 20px;
        }

        .profile-details-grid {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }

        .profile-avatar-wrapper {
          flex-shrink: 0;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          overflow: hidden;
          background-color: var(--card-background-light);
          display: flex;
          justify-content: center;
          align-items: center;
          border: 1px solid var(--border-color, #ccc);
          color: var(--text-color, #666); 
        }

        .profile-text-info {
          flex-grow: 1;
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 8px 15px;
          align-items: baseline;
        }

        .info-item {
          display: contents;
        }
        
        .info-label {
          font-weight: 500;
          color: var(--text-color, #555);
          text-align: right;
        }

        .info-value {
          color: var(--text-color, #333);
          font-weight: 400;
          text-align: left;
        }

        /* Style for expiry status */
        .info-value.status-expiring-soon {
          color: var(--status-expiring-soon, var(--status-expiring-soon-light));
          font-weight: bold;
        }
        .info-value.status-expired {
          color: var(--status-expired, var(--status-expired-light));
          font-weight: bold;
        }

        .error-message {
          color: red;
          font-weight: bold;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .profile-details-grid {
            flex-direction: column;
            align-items: center;
          }
          .profile-text-info {
            grid-template-columns: 1fr;
            text-align: center;
          }
          .info-label, .info-value {
            text-align: center;
          }
        }

        @media (max-width: 600px) {
          .main-content {
            padding: 15px;
          }
          .settings-section {
            padding: 15px;
          }
          .setting-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .setting-label {
            width: 100%;
          }
          .setting-control {
            width: 100%;
            text-align: left;
          }
          .setting-control select {
            width: 100%;
          }
          .toggle-switch {
            width: 100%;
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

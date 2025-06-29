import React, { useState, useEffect, useMemo, useCallback } from "react"; // Added useCallback
import { Moon, Sun, Bell, BellOff, Languages, Mail, Users, Briefcase, User, Calendar, Clock, Volume2, VolumeX, RefreshCcw } from "lucide-react"; // Added Calendar, Clock, Volume2, VolumeX, RefreshCcw for new options
import { FaRegUserCircle } from "react-icons/fa";

import { db } from "../lib/firebaseConfig"; // Assuming firebaseConfig is correctly set up
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

export default function SettingsPage() {
  const isBrowser = typeof window !== "undefined";

  const [language, setLanguage] = useState("thai");
  const [theme, setTheme] = useState("light");
  const [birthdayNotifications, setBirthdayNotifications] = useState(true);
  const [inAppSounds, setInAppSounds] = useState(true); // New state for in-app sounds
  const [showSaveMessage, setShowSaveMessage] = useState(false); // State for save message

  // State สำหรับข้อมูลโปรไฟล์
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loggedInEmail, setLoggedInEmail] = useState("");

  const getText = useCallback((key) => { // Wrapped with useCallback
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
        accountCreatedLabel: "สร้างบัญชีเมื่อ",
        inAppSoundsLabel: "เสียงในแอป", // New text
        soundsOn: "เปิด", // New text
        soundsOff: "ปิด", // New text
        settingsSaved: "บันทึกการตั้งค่าแล้ว!", // New text
        resetSettings: "รีเซ็ตการตั้งค่า", // New text
        resetConfirm: "คุณแน่ใจหรือไม่ที่จะรีเซ็ตการตั้งค่าทั้งหมด?", // New text
      },
      english: {
        settingsTitle: "Settings",
        generalSettings: "General Information", // Changed to Information as in prior user output.
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
        accountCreatedLabel: "Account Created",
        inAppSoundsLabel: "In-App Sounds", // New text
        soundsOn: "On", // New text
        soundsOff: "Off", // New text
        settingsSaved: "Settings saved!", // New text
        resetSettings: "Reset Settings", // New text
        resetConfirm: "Are you sure you want to reset all settings?", // New text
      },
    };
    return texts[language][key];
  }, [language]); // Dependency array for useCallback

  // Effect to load initial settings from localStorage on component mount
  useEffect(() => {
    if (isBrowser) {
      const savedLanguage = localStorage.getItem("appLanguage");
      const savedTheme = localStorage.getItem("appTheme");
      const savedBirthdayNotifications = localStorage.getItem("birthdayNotifications");
      const savedInAppSounds = localStorage.getItem("inAppSounds"); // Load new setting

      if (savedLanguage) setLanguage(savedLanguage);
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);
      }
      if (savedBirthdayNotifications !== null) {
        setBirthdayNotifications(JSON.parse(savedBirthdayNotifications));
      }
      if (savedInAppSounds !== null) { // Set new state
        setInAppSounds(JSON.parse(savedInAppSounds));
      }

      // Initial loggedInEmail fetch
      const email = localStorage.getItem("loggedInEmail");
      if (email) {
        setLoggedInEmail(email);
      } else {
        setProfileError(getText("noData"));
        setLoadingProfile(false);
      }
    }
  }, [isBrowser, getText]); // Added getText to dependency array for initial getText call

  // Effects to save settings to localStorage whenever they change
  useEffect(() => {
    if (isBrowser) {
      localStorage.setItem("appLanguage", language);
      setShowSaveMessage(true);
      const timer = setTimeout(() => setShowSaveMessage(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [language, isBrowser]);

  useEffect(() => {
    if (isBrowser) {
      localStorage.setItem("appTheme", theme);
      document.documentElement.setAttribute("data-theme", theme);
      setShowSaveMessage(true);
      const timer = setTimeout(() => setShowSaveMessage(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [theme, isBrowser]);

  useEffect(() => {
    if (isBrowser) {
      localStorage.setItem("birthdayNotifications", JSON.stringify(birthdayNotifications));
      setShowSaveMessage(true);
      const timer = setTimeout(() => setShowSaveMessage(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [birthdayNotifications, isBrowser]);

  useEffect(() => { // New effect for inAppSounds
    if (isBrowser) {
      localStorage.setItem("inAppSounds", JSON.stringify(inAppSounds));
      setShowSaveMessage(true);
      const timer = setTimeout(() => setShowSaveMessage(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [inAppSounds, isBrowser]);


  // Firebase fetching effects (remain mostly the same)
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
  }, [loggedInEmail, getText]); // Removed language as dependency since getText is memoized and accounts for it

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
            accountDurationDays: userData.AccountDurationDays !== undefined ? Number(userData.AccountDurationDays) : 30,
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
  }, [currentUserId, getText]); // Removed language as dependency since getText is memoized and accounts for it


  const accountExpiryInfo = useMemo(() => {
    if (!userProfile || !userProfile.createDate || userProfile.accountDurationDays === undefined) {
      return { status: "not_available", message: getText("noData") };
    }

    let createDate;
    if (typeof userProfile.createDate.toDate === 'function') {
      createDate = userProfile.createDate.toDate();
    } else {
      console.warn("CreateDate is not a Firebase Timestamp. Falling back to string parsing if possible.");
      if (typeof userProfile.createDate === 'string') {
        const parts = userProfile.createDate.split('/');
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

    if (isNaN(createDate.getTime())) {
      console.error("Invalid Date object after parsing CreateDate:", userProfile.createDate);
      return { status: "error", message: getText("error") + " Invalid date" };
    }

    const expiryDate = new Date(createDate);
    expiryDate.setDate(createDate.getDate() + userProfile.accountDurationDays);

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);

    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return {
        status: "active",
        message: `${getText("expiresIn")} ${diffDays} ${getText("days")}`,
        isExpiringSoon: diffDays <= 7
      };
    } else if (diffDays === 0) {
      return {
        status: "expires_today",
        message: getText("expiresToday"),
        isExpiringSoon: true
      };
    } else {
      return {
        status: "expired",
        message: getText("expired"),
        isExpiringSoon: false
      };
    }
  }, [userProfile, getText]); // Removed language as dependency since getText is memoized and accounts for it


  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const toggleBirthdayNotifications = () => {
    setBirthdayNotifications((prev) => !prev);
  };

  const toggleInAppSounds = () => { // New handler for in-app sounds
    setInAppSounds((prev) => !prev);
  };

  const handleResetSettings = () => {
    if (window.confirm(getText("resetConfirm"))) {
      setLanguage("thai");
      setTheme("light");
      setBirthdayNotifications(true);
      setInAppSounds(true); // Reset new setting
      // Clear localStorage for these settings as well
      if (isBrowser) {
        localStorage.removeItem("appLanguage");
        localStorage.removeItem("appTheme");
        localStorage.removeItem("birthdayNotifications");
        localStorage.removeItem("inAppSounds");
        document.documentElement.setAttribute("data-theme", "light"); // Ensure theme is visually reset
      }
      setShowSaveMessage(true); // Show confirmation message
      const timer = setTimeout(() => setShowSaveMessage(false), 2000);
      return () => clearTimeout(timer);
    }
  };


  // Helper to format date for display
  const formatDate = (date) => {
    if (!date) return getText("noData");
    let d;
    if (typeof date.toDate === 'function') {
      d = date.toDate();
    } else if (date instanceof Date) {
      d = date;
    } else {
      try {
        d = new Date(date);
        if (isNaN(d.getTime())) {
          return getText("noData");
        }
      } catch (e) {
        return getText("noData");
      }
    }
    return d.toLocaleDateString(language === 'thai' ? 'th-TH' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
            <div className="profile-card">
              <div className="profile-header">
                <div className="profile-avatar-wrapper">
                  <FaRegUserCircle size={80} color="var(--accent-color, #007bff)" />
                </div>
                <div className="profile-name-role">
                  <h4>{userProfile.username}</h4>
                  <p className="profile-role">{userProfile.role}</p>
                </div>
              </div>
              <div className="profile-details-list">
                <div className="info-item">
                  <Mail size={18} className="info-icon" />
                  <span className="info-label">{getText("emailLabel")}:</span>
                  <span className="info-value">{userProfile.email}</span>
                </div>
                <div className="info-item">
                  <Users size={18} className="info-icon" />
                  <span className="info-label">{getText("groupNameLabel")}:</span>
                  <span className="info-value">{userProfile.groupName}</span>
                </div>
                <div className="info-item">
                  <Calendar size={18} className="info-icon" />
                  <span className="info-label">{getText("accountCreatedLabel")}:</span>
                  <span className="info-value">{formatDate(userProfile.createDate)}</span>
                </div>
                <div className="info-item">
                  <Clock size={18} className="info-icon" />
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

        {/* ส่วนการตั้งค่าทั่วไป */}
        <div className="settings-section">
          <h3>{getText("generalSettings")}</h3>

          {showSaveMessage && (
            <p className="save-message">{getText("settingsSaved")}</p>
          )}

          <div className="setting-item">
            <div className="setting-label">
              <Languages size={20} className="setting-icon" />
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
              {theme === "light" ? <Sun size={20} className="setting-icon" /> : <Moon size={20} className="setting-icon" />}
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
                <Bell size={20} className="setting-icon" />
              ) : (
                <BellOff size={20} className="setting-icon" />
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

          {/* New In-App Sounds setting */}
          <div className="setting-item">
            <div className="setting-label">
              {inAppSounds ? (
                <Volume2 size={20} className="setting-icon" />
              ) : (
                <VolumeX size={20} className="setting-icon" />
              )}
              <span>{getText("inAppSoundsLabel")}</span>
            </div>
            <div
              className="setting-control toggle-switch"
              onClick={toggleInAppSounds}
            >
              <div
                className={`switch-track ${
                  inAppSounds ? "on" : "off"
                }`}
              >
                <div className="switch-thumb"></div>
              </div>
              <span className="toggle-label">
                {inAppSounds
                  ? getText("soundsOn")
                  : getText("soundsOff")}
              </span>
            </div>
          </div>

          {/* New Reset Settings button */}
          <div className="setting-item reset-button-container">
            <button onClick={handleResetSettings} className="reset-button">
              <RefreshCcw size={18} className="button-icon" />
              {getText("resetSettings")}
            </button>
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
          --accent-color-light: #007bff; /* Primary accent color */
          --icon-color-light: #6c757d; /* Default icon color */
          --reset-button-bg-light: #f44336; /* Red for reset */
          --reset-button-text-light: white;
          --save-message-bg-light: #d4edda; /* Greenish for success */
          --save-message-text-light: #155724;
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
          --accent-color: #007bff; /* Primary accent color */
          --icon-color: #bbbbbb; /* Default icon color */
          --reset-button-bg: #c62828; /* Darker red for reset */
          --reset-button-text: white;
          --save-message-bg: #28a745; /* Darker green for success */
          --save-message-text: #fff;
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
          font-size: 18px;
          color: var(--text-color, var(--text-color-light));
          margin-bottom: 10px;
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

        .setting-item:last-of-type:not(.reset-button-container) { /* Exclude reset button container from last border */
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

        .setting-icon { /* Added this for consistent icon coloring in general settings */
            color: var(--icon-color, var(--icon-color-light));
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

        .profile-card {
          background-color: var(--card-background, #ffffff);
          border-radius: 10px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid var(--border-color, #e0e0e0);
        }

        .profile-avatar-wrapper {
          flex-shrink: 0;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          overflow: hidden;
          background-color: var(--card-background);
          display: flex;
          justify-content: center;
          align-items: center;
          border: 2px solid var(--accent-color, #007bff);
          color: var(--accent-color, #007bff);
        }

        .profile-name-role {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .profile-name-role h4 {
          margin: 0;
          font-size: 1.5em;
          color: var(--text-color, #333);
        }

        .profile-role {
          margin: 5px 0 0;
          font-size: 0.95em;
          color: var(--text-color, #666);
          background-color: var(--border-color, #f0f0f0);
          padding: 4px 10px;
          border-radius: 5px;
        }

        .profile-details-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
        }

        .info-icon {
            color: var(--icon-color, var(--icon-color-light));
        }

        .info-label {
          font-weight: 500;
          color: var(--text-color, #555);
          min-width: 120px;
        }

        .info-value {
          color: var(--text-color, #333);
          font-weight: 400;
          flex-grow: 1;
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

        .save-message {
            background-color: var(--save-message-bg, var(--save-message-bg-light));
            color: var(--save-message-text, var(--save-message-text-light));
            padding: 10px 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
            font-weight: 500;
            animation: fadeOut 2s forwards; /* Animation for fading out */
            animation-delay: 1s; /* Delay before fading starts */
        }

        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; display: none; }
        }

        /* Reset Settings Button */
        .reset-button-container {
            border-top: 1px solid var(--border-color, #f0f0f0); /* Add top border if desired */
            padding-top: 15px;
            justify-content: center; /* Center the button */
        }

        .reset-button {
            background-color: var(--reset-button-bg, var(--reset-button-bg-light));
            color: var(--reset-button-text, var(--reset-button-text-light));
            border: none;
            border-radius: 8px;
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: background-color 0.3s ease;
        }

        .reset-button:hover {
            opacity: 0.9;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .profile-card {
            align-items: center; /* Center content on smaller screens */
          }
          .profile-header {
            flex-direction: column;
            text-align: center;
            border-bottom: none; /* Remove border for cleaner stack */
            padding-bottom: 0;
          }
          .profile-name-role {
            align-items: center;
          }
          .profile-details-list {
            width: 100%; /* Take full width */
            margin-top: 15px; /* Add space after header */
          }
          .info-item {
            flex-direction: column; /* Stack label/value on small screens */
            align-items: flex-start;
            gap: 5px;
          }
          .info-label, .info-value {
            width: 100%; /* Make label and value take full width */
            text-align: left; /* Align text to left */
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
          .reset-button {
            width: 100%; /* Full width for button on small screens */
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

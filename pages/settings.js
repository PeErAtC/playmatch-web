// pages/settings.js
import React, { useState, useEffect } from "react";
// แก้ไขจาก Language เป็น Languages
import { Moon, Sun, Bell, BellOff, Languages } from "lucide-react";

export default function SettingsPage() {
  const isBrowser = typeof window !== "undefined";

  // State for settings
  const [language, setLanguage] = useState("thai"); // Default to Thai
  const [theme, setTheme] = useState("light"); // Default to light
  const [birthdayNotifications, setBirthdayNotifications] = useState(true); // Default to true

  // Load settings from localStorage on component mount
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
        document.documentElement.setAttribute("data-theme", savedTheme); // Apply theme to html element
      }
      if (savedBirthdayNotifications !== null) {
        setBirthdayNotifications(JSON.parse(savedBirthdayNotifications));
      }
    }
  }, [isBrowser]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (isBrowser) {
      localStorage.setItem("appLanguage", language);
    }
  }, [language, isBrowser]);

  useEffect(() => {
    if (isBrowser) {
      localStorage.setItem("appTheme", theme);
      document.documentElement.setAttribute("data-theme", theme); // Apply theme to html element
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
    // In a real app, you would load language specific texts here
  };

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const toggleBirthdayNotifications = () => {
    setBirthdayNotifications((prev) => !prev);
  };

  // Helper function to get text based on current language
  const getText = (key) => {
    const texts = {
      thai: {
        settingsTitle: "การตั้งค่า",
        generalSettings: "การตั้งค่าทั่วไป",
        languageLabel: "ภาษา",
        themeLabel: "ธีม",
        lightMode: "โหมดสว่าง",
        darkMode: "โหมดมืด",
        notificationsLabel: "การแจ้งเตือนวันเกิด",
        notificationsOn: "เปิด",
        notificationsOff: "ปิด",
      },
      english: {
        settingsTitle: "Settings",
        generalSettings: "General Settings",
        languageLabel: "Language",
        themeLabel: "Theme",
        lightMode: "Light Mode",
        darkMode: "Dark Mode",
        notificationsLabel: "Birthday Notifications",
        notificationsOn: "On",
        notificationsOff: "Off",
      },
    };
    return texts[language][key];
  };

  return (
    <div className="overall-layout">
      <main className="main-content">
        <h2>{getText("settingsTitle")}</h2>
        <hr className="title-separator" />

        <div className="settings-section">
          <h3>{getText("generalSettings")}</h3>
          <div className="setting-item">
            <div className="setting-label">
              <Languages size={20} /> {/* แก้ไขจาก Language เป็น Languages */}
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
          --toggle-thumb-light: #fff;
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
          --toggle-thumb: #fff;
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
        }
        .main-content h2,
        .main-content h3 {
          color: var(--text-color, var(--text-color-light));
        }
        .title-separator {
          border-color: var(--border-color, var(--border-color-light));
        }

        /* --- END Global theme variables --- */

        /* General Layout */
        .overall-layout {
          display: block;
          width: 100%;
          min-height: 100vh;
        }

        .main-content {
          padding: 28px;
          background-color: var(--background-color, #f7f7f7);
          border-radius: 12px;
          overflow-y: auto;
        }

        .title-separator {
          border: 0;
          border-top: 1px solid #aebdc9;
          margin-bottom: 18px;
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
          flex-shrink: 0; /* Prevent controls from shrinking */
          min-width: 120px; /* Adjust as needed */
          text-align: right; /* Align content to the right */
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
          transform: translateX(21px); /* Move to the right */
        }

        .toggle-label {
          font-size: 14px;
          color: var(--text-color, #555);
          font-weight: 400;
        }

        /* Responsive */
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
            text-align: left; /* Align controls to the left on mobile */
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

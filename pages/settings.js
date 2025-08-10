// settings.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Bell, BellOff, Mail, Users, Briefcase, Calendar, Clock, Volume2, VolumeX, RefreshCcw, ListChecks, ListX, Camera, Loader, Image, ImageOff, Save, UploadCloud } from "lucide-react";
import { FaRegUserCircle } from "react-icons/fa";

import { db, storage } from "../lib/firebaseConfig";
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from 'browser-image-compression';

const texts = {
  settingsTitle: "การตั้งค่า",
  generalSettings: "การตั้งค่าทั่วไป",
  personalInfo: "ข้อมูลส่วนตัว",
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
  expiresIn: "หมดอายุในอีก",
  days: "วัน",
  expired: "หมดอายุแล้ว",
  expiresToday: "หมดอายุวันนี้",
  accountCreatedLabel: "สร้างบัญชีเมื่อ",
  expiryDateLabel: "วันหมดอายุบัญชี",
  inAppSoundsLabel: "เสียงในแอป",
  soundsOn: "เปิด",
  soundsOff: "ปิด",
  settingsSaved: "บันทึกการตั้งค่าแล้ว!",
  resetSettings: "รีเซ็ตการตั้งค่า",
  packageLabel: "แพ็คเกจ",
  resetConfirm: "คุณแน่ใจหรือไม่ที่จะรีเซ็ตการตั้งค่าทั้งหมด?",
  trackResultsLabel: "แสดงผลการแข่งขัน",
  trackResultsOn: "แสดง",
  trackResultsOff: "ซ่อน",
  showMemberImagesLabel: "แสดงรูปภาพสมาชิก",
  showMemberImagesOn: "แสดง",
  showMemberImagesOff: "ซ่อน",
  paymentInfoTitle: "ข้อมูลการชำระเงิน",
  accountNameLabel: "ชื่อบัญชี",
  accountNumberLabel: "เลขที่บัญชี",
  qrCodeLabel: "QR Code รับเงิน",
  addQrCode: "เพิ่ม/แก้ไข QR Code",
  savePaymentInfo: "บันทึกข้อมูล",
  paymentInfoSaved: "บันทึกข้อมูลการชำระเงินแล้ว!",
  uploadingQrCode: "กำลังอัปโหลด...",
};
const getText = (key) => texts[key];

export default function SettingsPage() {
  const isBrowser = typeof window !== "undefined";

  const [birthdayNotifications, setBirthdayNotifications] = useState(true);
  const [inAppSounds, setInAppSounds] = useState(true);
  const [trackMatchResults, setTrackMatchResults] = useState(true);
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [showMemberImages, setShowMemberImages] = useState(true);

  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loggedInEmail, setLoggedInEmail] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [paymentInfo, setPaymentInfo] = useState({ accountName: '', accountNumber: '', qrCodeUrl: null });
  const [originalPaymentInfo, setOriginalPaymentInfo] = useState({ accountName: '', accountNumber: '', qrCodeUrl: null });
  const [loadingPaymentInfo, setLoadingPaymentInfo] = useState(true);
  const [paymentInfoError, setPaymentInfoError] = useState(null);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [showPaymentSaveMessage, setShowPaymentSaveMessage] = useState(false);
  const qrCodeInputRef = useRef(null);


  useEffect(() => {
    if (isBrowser) {
      const savedBirthdayNotifications = localStorage.getItem("birthdayNotifications");
      const savedInAppSounds = localStorage.getItem("inAppSounds");
      const savedTrackMatchResults = localStorage.getItem("trackMatchResults");
      const savedShowMemberImages = localStorage.getItem("showMemberImages");

      if (savedBirthdayNotifications !== null) setBirthdayNotifications(JSON.parse(savedBirthdayNotifications));
      if (savedInAppSounds !== null) setInAppSounds(JSON.parse(savedInAppSounds));
      if (savedTrackMatchResults !== null) setTrackMatchResults(JSON.parse(savedTrackMatchResults));
      if (savedShowMemberImages !== null) setShowMemberImages(JSON.parse(savedShowMemberImages));

      const email = localStorage.getItem("loggedInEmail");
      if (email) {
        setLoggedInEmail(email);
      } else {
        setProfileError(getText("noData"));
        setLoadingProfile(false);
      }
    }
  }, [isBrowser]);

  useEffect(() => {
    if (isBrowser) {
      localStorage.setItem("birthdayNotifications", JSON.stringify(birthdayNotifications));
      setShowSaveMessage(true);
      const timer = setTimeout(() => setShowSaveMessage(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [birthdayNotifications, isBrowser]);

  useEffect(() => {
    if (isBrowser) {
      localStorage.setItem("inAppSounds", JSON.stringify(inAppSounds));
      setShowSaveMessage(true);
      const timer = setTimeout(() => setShowSaveMessage(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [inAppSounds, isBrowser]);

  useEffect(() => {
    if (isBrowser) {
      localStorage.setItem("trackMatchResults", JSON.stringify(trackMatchResults));
      setShowSaveMessage(true);
      const timer = setTimeout(() => setShowSaveMessage(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [trackMatchResults, isBrowser]);

  useEffect(() => {
    if (isBrowser) {
      localStorage.setItem("showMemberImages", JSON.stringify(showMemberImages));
      setShowSaveMessage(true);
      const timer = setTimeout(() => setShowSaveMessage(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showMemberImages, isBrowser]);

  useEffect(() => {
    const fetchUserId = async () => {
      if (!loggedInEmail) return;
      try {
        setLoadingProfile(true);
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", loggedInEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          setCurrentUserId(userDoc.id);
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
  }, [loggedInEmail]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUserId) return;
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
            packageType: userData.packageType || "N/A",
            profileImageUrl: userData.profileImageUrl || null,
            createDate: userData.CreateDate || null,
            expiryDate: userData.expiryDate || null,
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

    const fetchPaymentInfo = async () => {
        if (!currentUserId) return;
        setLoadingPaymentInfo(true);
        setPaymentInfoError(null);
        try {
            const paymentDocRef = doc(db, "paymentInfo", currentUserId);
            const paymentDocSnap = await getDoc(paymentDocRef);
            if (paymentDocSnap.exists()) {
                const data = paymentDocSnap.data();
                setPaymentInfo(data);
                setOriginalPaymentInfo(data);
            } else {
                const initialData = { accountName: '', accountNumber: '', qrCodeUrl: null };
                setPaymentInfo(initialData);
                setOriginalPaymentInfo(initialData);
            }
        } catch (err) {
            console.error("Error fetching payment info:", err);
            setPaymentInfoError(getText("error") + " " + err.message);
        } finally {
            setLoadingPaymentInfo(false);
        }
    };

    fetchUserProfile();
    fetchPaymentInfo();
  }, [currentUserId]);

  const handleImageUpload = async (event) => {
    const imageFile = event.target.files[0];
    if (!imageFile || !currentUserId) return;

    const options = { maxSizeMB: 1, maxWidthOrHeight: 800, useWebWorker: true };

    try {
      setIsUploading(true);
      const compressedFile = await imageCompression(imageFile, options);
      const storageRef = ref(storage, `profile_images/${currentUserId}`);
      await uploadBytes(storageRef, compressedFile);
      const downloadURL = await getDownloadURL(storageRef);
      const userDocRef = doc(db, "users", currentUserId);
      await updateDoc(userDocRef, { profileImageUrl: downloadURL });
      setUserProfile(prevProfile => ({ ...prevProfile, profileImageUrl: downloadURL }));
    } catch (error) {
      console.error("Error processing or uploading image: ", error);
      alert("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleQrCodeUpload = async (event) => {
    const imageFile = event.target.files[0];
    if (!imageFile || !currentUserId) return;

    const options = { maxSizeMB: 1, maxWidthOrHeight: 800, useWebWorker: true };

    try {
      setIsUploadingQr(true);
      const compressedFile = await imageCompression(imageFile, options);
      const storageRef = ref(storage, `payment_qrcodes/${currentUserId}`);
      await uploadBytes(storageRef, compressedFile);
      const downloadURL = await getDownloadURL(storageRef);

      setPaymentInfo(prev => ({ ...prev, qrCodeUrl: downloadURL }));

    } catch (error) {
        console.error("Error uploading QR code: ", error);
        alert("เกิดข้อผิดพลาดในการอัปโหลด QR Code");
    } finally {
        setIsUploadingQr(false);
        if (qrCodeInputRef.current) {
            qrCodeInputRef.current.value = "";
        }
    }
  };

  const handleSavePaymentInfo = async () => {
    if (!currentUserId) return;
    try {
        const paymentDocRef = doc(db, "paymentInfo", currentUserId);
        await setDoc(paymentDocRef, paymentInfo, { merge: true });
        setOriginalPaymentInfo(paymentInfo);
        setShowPaymentSaveMessage(true);
        setTimeout(() => setShowPaymentSaveMessage(false), 2000);
    } catch (error) {
        console.error("Error saving payment info:", error);
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + error.message);
    }
  };

  const handlePaymentInfoChange = (e) => {
    const { name, value } = e.target;
    setPaymentInfo(prev => ({ ...prev, [name]: value }));
  };

  const isPaymentInfoChanged = useMemo(() => {
    return JSON.stringify(paymentInfo) !== JSON.stringify(originalPaymentInfo);
  }, [paymentInfo, originalPaymentInfo]);


  const accountExpiryInfo = useMemo(() => {
    if (!userProfile || !userProfile.expiryDate) {
      return { status: "not_available", message: "ไม่มีข้อมูล" };
    }

    const expiryDate = userProfile.expiryDate.toDate();
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
      return { status: "expires_today", message: getText("expiresToday"), isExpiringSoon: true };
    } else {
      return { status: "expired", message: getText("expired"), isExpiringSoon: false };
    }
  }, [userProfile]);

  const toggleBirthdayNotifications = () => setBirthdayNotifications((prev) => !prev);
  const toggleInAppSounds = () => setInAppSounds((prev) => !prev);
  const toggleTrackMatchResults = () => setTrackMatchResults((prev) => !prev);
  const toggleShowMemberImages = () => setShowMemberImages((prev) => !prev);


  const handleResetSettings = () => {
    if (window.confirm(getText("resetConfirm"))) {
      setBirthdayNotifications(true);
      setInAppSounds(true);
      setTrackMatchResults(true);
      setShowMemberImages(true);

      if (isBrowser) {
        localStorage.removeItem("birthdayNotifications");
        localStorage.removeItem("inAppSounds");
        localStorage.removeItem("trackMatchResults");
        localStorage.removeItem("showMemberImages");
      }
      setShowSaveMessage(true);
      const timer = setTimeout(() => setShowSaveMessage(false), 2000);
      return () => clearTimeout(timer);
    }
  };

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
        if (isNaN(d.getTime())) return getText("noData");
      } catch (e) {
        return getText("noData");
      }
    }
    return d.toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  // --- START: นี่คือจุดที่แก้ไข (1/2) ---
  const getPackageTypeClassName = (type) => {
    if (!type) return "package-type";
    switch (type.toLowerCase()) {
      case "free": return "package-type free"; // <<< เพิ่ม case สำหรับ 'free'
      case "basic": return "package-type basic";
      case "pro": return "package-type pro";
      case "premium": return "package-type premium";
      default: return "package-type";
    }
  };
  // --- END: นี่คือจุดที่แก้ไข (1/2) ---

  return (
    <div className="overall-layout">
      <main className="main-content">
        <h2>{getText("settingsTitle")}</h2>
        <hr className="title-separator" />

        <div className="settings-section personal-info-section">
          <h3>{getText("personalInfo")}</h3>
          <div className="personal-info-grid">
            {loadingProfile ? (
              <p>{getText("loading")}</p>
            ) : profileError ? (
              <p className="error-message">{getText("error")} {profileError}</p>
            ) : userProfile ? (
              <div className="profile-card">
                <div className="profile-header">
                  <div className="profile-avatar-wrapper" onClick={() => !isUploading && fileInputRef.current.click()}>
                    {isUploading ? (
                      <div className="upload-loader"><Loader size={32} /></div>
                    ) : userProfile.profileImageUrl ? (
                      <img src={userProfile.profileImageUrl} alt="Profile" className="profile-image" />
                    ) : (
                      <FaRegUserCircle size={100} color="var(--accent-color, #007bff)" />
                    )}
                    {!isUploading && (
                      <div className="upload-overlay"><Camera size={24} color="white" /></div>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} style={{ display: "none" }} accept="image/png, image/jpeg, image/gif" />
                  <div className="profile-name-role">
                    <h4>{userProfile.username}</h4>
                    <p className="profile-role">{userProfile.role}</p>
                  </div>
                </div>
                <div className="profile-details-list">
                  <div className="info-item"><Mail size={18} className="info-icon" /><span className="info-label">{getText("emailLabel")}:</span><span className="info-value">{userProfile.email}</span></div>
                  <div className="info-item"><Users size={18} className="info-icon" /><span className="info-label">{getText("groupNameLabel")}:</span><span className="info-value">{userProfile.groupName}</span></div>
                  <div className="info-item"><Briefcase size={18} className="info-icon" /><span className="info-label">{getText("packageLabel")}:</span><span className={`info-value ${getPackageTypeClassName(userProfile.packageType)}`}>{userProfile.packageType || 'N/A'}</span></div>
                  <div className="info-item"><Calendar size={18} className="info-icon" /><span className="info-label">{getText("accountCreatedLabel")}:</span><span className="info-value">{formatDate(userProfile.createDate)}</span></div>
                  <div className="info-item"><Calendar size={18} className="info-icon" /><span className="info-label">{getText("expiryDateLabel")}:</span><span className="info-value">{formatDate(userProfile.expiryDate)}</span></div>
                  <div className="info-item"><Clock size={18} className="info-icon" /><span className="info-label">{getText("accountStatusLabel")}:</span><span className={`info-value ${accountExpiryInfo.status === 'expired' ? 'status-expired' : accountExpiryInfo.isExpiringSoon ? 'status-expiring-soon' : ''}`}>{accountExpiryInfo.message}</span></div>
                </div>
              </div>
            ) : (
              <p>{getText("noData")}</p>
            )}

            <div className="payment-info-card">
              <h4 className="payment-info-title">{getText("paymentInfoTitle")}</h4>
              {loadingPaymentInfo ? (
                <p>{getText("loading")}</p>
              ) : paymentInfoError ? (
                <p className="error-message">{paymentInfoError}</p>
              ) : (
                <>
                  <div className="payment-input-group">
                    <label htmlFor="accountName">{getText("accountNameLabel")}</label>
                    <input type="text" id="accountName" name="accountName" value={paymentInfo.accountName} onChange={handlePaymentInfoChange} placeholder="เช่น นายพร้อมเพย์ ใจดี" />
                  </div>
                  <div className="payment-input-group">
                    <label htmlFor="accountNumber">{getText("accountNumberLabel")}</label>
                    <input type="text" id="accountNumber" name="accountNumber" value={paymentInfo.accountNumber} onChange={handlePaymentInfoChange} placeholder="เช่น 123-456-7890"/>
                  </div>

                  <div className="payment-input-group">
                    <label>{getText("qrCodeLabel")}</label>
                    <div className="qr-code-uploader" onClick={() => !isUploadingQr && qrCodeInputRef.current.click()}>
                        {isUploadingQr ? (
                           <div className="upload-loader"><Loader size={32} /><span>{getText("uploadingQrCode")}</span></div>
                        ) : paymentInfo.qrCodeUrl ? (
                           <img src={paymentInfo.qrCodeUrl} alt="QR Code" className="qr-code-image" />
                        ) : (
                           <div className="qr-placeholder">
                             <UploadCloud size={40} />
                             <span>{getText("addQrCode")}</span>
                           </div>
                        )}
                    </div>
                    <input type="file" ref={qrCodeInputRef} onChange={handleQrCodeUpload} style={{ display: "none" }} accept="image/png, image/jpeg, image/gif"/>
                  </div>

                  {showPaymentSaveMessage && <p className="save-message">{getText("paymentInfoSaved")}</p>}

                  <button 
                    onClick={handleSavePaymentInfo} 
                    className="save-payment-button"
                    disabled={!isPaymentInfoChanged || isUploadingQr}
                  >
                    <Save size={18} className="button-icon" />
                    {getText("savePaymentInfo")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>{getText("generalSettings")}</h3>
          {showSaveMessage && (
            <p className="save-message">{getText("settingsSaved")}</p>
          )}

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
              <div className={`switch-track ${birthdayNotifications ? "on" : "off"}`}>
                <div className="switch-thumb"></div>
              </div>
              <span className="toggle-label">
                {birthdayNotifications ? getText("notificationsOn") : getText("notificationsOff")}
              </span>
            </div>
          </div>

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
              <div className={`switch-track ${inAppSounds ? "on" : "off"}`}>
                <div className="switch-thumb"></div>
              </div>
              <span className="toggle-label">
                {inAppSounds ? getText("soundsOn") : getText("soundsOff")}
              </span>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              {trackMatchResults ? (
                <ListChecks size={20} className="setting-icon" />
              ) : (
                <ListX size={20} className="setting-icon" />
              )}
              <span>{getText("trackResultsLabel")}</span>
            </div>
            <div
              className="setting-control toggle-switch"
              onClick={toggleTrackMatchResults}
            >
              <div className={`switch-track ${trackMatchResults ? "on" : "off"}`}>
                <div className="switch-thumb"></div>
              </div>
              <span className="toggle-label">
                {trackMatchResults ? getText("trackResultsOn") : getText("trackResultsOff")}
              </span>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              {showMemberImages ? (
                <Image size={20} className="setting-icon" />
              ) : (
                <ImageOff size={20} className="setting-icon" />
              )}
              <span>{getText("showMemberImagesLabel")}</span>
            </div>
            <div
              className="setting-control toggle-switch"
              onClick={toggleShowMemberImages}
            >
              <div className={`switch-track ${showMemberImages ? "on" : "off"}`}>
                <div className="switch-thumb"></div>
              </div>
              <span className="toggle-label">
                {showMemberImages ? getText("showMemberImagesOn") : getText("showMemberImagesOff")}
              </span>
            </div>
          </div>

          <div className="setting-item reset-button-container">
            <button onClick={handleResetSettings} className="reset-button">
              <RefreshCcw size={18} className="button-icon" />
              {getText("resetSettings")}
            </button>
          </div>
        </div>
      </main>

      <style jsx global>{`
        :root {
          --background-color-light: #f7f9fc;
          --text-color-light: #333;
          --card-background-light: #ffffff;
          --border-color-light: #e0e0e0;
          --toggle-on-background-light: #4bf196;
          --toggle-off-background-light: #ccc;
          --status-expiring-soon-light: #ffc107;
          --status-expired-light: #dc3545;
          --accent-color-light: #007bff;
          --icon-color-light: #6c757d;
          --reset-button-bg-light: #f44336;
          --reset-button-text-light: white;
          --save-message-bg-light: #d4edda;
          --save-message-text-light: #155724;
        }

        body {
          background-color: var(--background-color-light);
          color: var(--text-color-light);
        }

        .main-content {
          background-color: var(--background-color-light);
          padding: 28px;
          overflow-y: auto;
        }
        .main-content h2 {
          font-size: 18px;
          color: var(--text-color-light);
          margin-bottom: 10px;
        }
        .main-content h3 {
          color: var(--text-color-light);
        }
        .title-separator {
          border: 0;
          border-top: 1px solid #aebdc9;
          margin-bottom: 18px;
        }

        .overall-layout {
          display: block;
          width: 100%;
          min-height: 100vh;
        }

        .settings-section {
          background-color: var(--card-background-light);
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          padding: 24px;
          margin-top: 20px;
        }

        .settings-section h3 {
          font-size: 16px;
          margin-top: 0;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border-color-light);
          color: var(--text-color-light);
        }

        .personal-info-grid {
            display: grid;
            grid-template-columns: 1.1fr 1fr;
            gap: 24px;
            align-items: start;
        }

        .profile-card, .payment-info-card {
          border: 1px solid #e9e9e9;
          border-radius: 12px;
          padding: 24px;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .payment-info-card {
            gap: 16px;
        }

        .payment-info-title {
            font-size: 16px;
            margin: 0 0 10px 0;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--border-color-light);
            font-weight: 600;
            color: var(--text-color-light);
        }

        .payment-input-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .payment-input-group label {
            font-weight: 500;
            font-size: 14px;
            color: #555;
        }
        .payment-input-group input[type="text"] {
            padding: 10px 12px;
            border: 1px solid #ccc;
            border-radius: 6px;
            font-size: 15px;
            transition: border-color 0.3s, box-shadow 0.3s;
        }
        .payment-input-group input[type="text"]:focus {
            outline: none;
            border-color: var(--accent-color-light);
            box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.2);
        }

        .qr-code-uploader {
            border: 2px dashed #d0d0d0;
            border-radius: 8px;
            padding: 10px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 150px;
            cursor: pointer;
            transition: border-color 0.3s, background-color 0.3s;
        }
        .qr-code-uploader:hover {
            border-color: var(--accent-color-light);
            background-color: #f7f9fc;
        }
        .qr-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            color: #888;
        }
        .qr-code-image {
            max-width: 100%;
            max-height: 200px;
            object-fit: contain;
        }

        .save-payment-button {
            background-color: var(--accent-color-light);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 20px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: background-color 0.3s ease, transform 0.2s ease;
            margin-top: auto;
        }
        .save-payment-button:hover:not(:disabled) {
            opacity: 0.85;
            transform: translateY(-1px);
        }
        .save-payment-button:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .setting-item:last-of-type:not(.reset-button-container) {
          border-bottom: none;
        }
        .setting-label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          color: var(--text-color-light);
          font-weight: 500;
        }
        .setting-icon { color: var(--icon-color-light); }
        .setting-control { flex-shrink: 0; min-width: 120px; text-align: right; }
        .toggle-switch { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; }
        .switch-track { width: 45px; height: 24px; border-radius: 12px; position: relative; transition: background-color 0.3s; }
        .switch-track.off { background-color: var(--toggle-off-background-light); }
        .switch-track.on { background-color: var(--toggle-on-background-light); }
        .switch-thumb { width: 20px; height: 20px; background-color: #fff; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: transform 0.3s; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2); }
        .switch-track.on .switch-thumb { transform: translateX(21px); }
        .toggle-label { font-size: 14px; color: #555; font-weight: 400; }

        .profile-header { display: flex; align-items: center; gap: 20px; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0; }
        .profile-avatar-wrapper { position: relative; flex-shrink: 0; width: 100px; height: 100px; border-radius: 50%; overflow: hidden; background-color: #e9ecef; display: flex; justify-content: center; align-items: center; border: 3px solid var(--accent-color-light); color: var(--accent-color-light); cursor: pointer; }
        .profile-image { width: 100%; height: 100%; object-fit: cover; }
        .upload-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.4); display: flex; justify-content: center; align-items: center; opacity: 0; transition: opacity 0.3s ease; }
        .profile-avatar-wrapper:hover .upload-overlay { opacity: 1; }
        .upload-loader { display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; flex-direction: column; gap: 8px; }
        .upload-loader .lucide-loader { animation: spin 2s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .profile-name-role { display: flex; flex-direction: column; align-items: flex-start; }
        .profile-name-role h4 { margin: 0; font-size: 1.6em; color: #333; }
        .profile-role { margin: 5px 0 0; font-size: 0.95em; color: #666; background-color: #f0f0f0; padding: 4px 10px; border-radius: 5px; }
        .profile-details-list { display: flex; flex-direction: column; gap: 14px; margin-top: 20px; }
        .info-item { display: flex; align-items: center; gap: 10px; font-size: 15px; }
        .info-icon { color: var(--icon-color-light); }
        .info-label { font-weight: 500; color: #555; min-width: 120px; }
        .info-value { color: #333; font-weight: 400; flex-grow: 1; }
        .info-value.package-type { font-weight: 600; padding: 3px 8px; border-radius: 5px; display: inline-block; line-height: 1.2; flex-grow: 0; width: fit-content; white-space: nowrap; color: #fff; }

        /* --- START: นี่คือจุดที่แก้ไข (2/2) --- */
        .info-value.package-type.free { background-color: #C0C0C0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5); }
        /* --- END: นี่คือจุดที่แก้ไข (2/2) --- */

        .info-value.package-type.basic { background-color: #388E3C; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5); }
        .info-value.package-type.pro { background-color: #0056b3; box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3); text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5); }
        .info-value.package-type.premium { background-color: #6A0DAD; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4); text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5); }
        .info-value.status-expiring-soon { color: var(--status-expiring-soon-light); font-weight: bold; }
        .info-value.status-expired { color: var(--status-expired-light); font-weight: bold; }
        .error-message { color: red; font-weight: bold; }
        .save-message { background-color: var(--save-message-bg-light); color: var(--save-message-text-light); padding: 10px 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-weight: 500; animation: fadeOut 2s forwards; animation-delay: 1s; }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; display: none; } }
        .reset-button-container { border-top: 1px solid #f0f0f0; padding-top: 15px; justify-content: center; }
        .reset-button { background-color: var(--reset-button-bg-light); color: var(--reset-button-text-light); border: none; border-radius: 8px; padding: 10px 20px; font-size: 16px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background-color 0.3s ease; }
        .reset-button:hover { opacity: 0.9; }

        @media (max-width: 992px) {
            .personal-info-grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 768px) {
          .profile-card { align-items: center; }
          .profile-header { flex-direction: column; text-align: center; border-bottom: none; padding-bottom: 0; }
          .profile-name-role { align-items: center; }
          .profile-details-list { width: 100%; margin-top: 15px; }
          .info-item { flex-direction: column; align-items: flex-start; gap: 5px; }
          .info-label, .info-value { width: 100%; text-align: left; }
        }

        @media (max-width: 600px) {
          .main-content { padding: 15px; }
          .settings-section { padding: 15px; }
          .setting-item { flex-direction: column; align-items: flex-start; gap: 8px; }
          .setting-label { width: 100%; }
          .setting-control { width: 100%; text-align: left; }
          .toggle-switch { width: 100%; justify-content: flex-start; }
          .reset-button { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}

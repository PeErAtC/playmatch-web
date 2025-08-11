import React, { useState, useEffect, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import Confetti from "react-confetti";
import CountUp from "react-countup";
import { db } from "../lib/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";

// Object สำหรับเก็บธีมสี 12 ราศี
const zodiacThemes = {
  Default:    { primary: '#1d3557', secondary: '#457b9d', accent: '#a8dadc', background: '#f1faee', highlight: '#e63946' },
  Aries:      { primary: '#D90429', secondary: '#EF233C', accent: '#EDF2F4', background: '#fcebeb', highlight: '#FF9B54' },
  Taurus:     { primary: '#2d6a4f', secondary: '#40916c', accent: '#b7e4c7', background: '#f3faf5', highlight: '#ffb703' },
  Gemini:     { primary: '#FFC300', secondary: '#FFD60A', accent: '#003566', background: '#fffbeb', highlight: '#003566' },
  Cancer:     { primary: '#ADC1E2', secondary: '#CAD6E9', accent: '#EBEFF5', background: '#f5f7fa', highlight: '#6096BA' },
  Leo:        { primary: '#FF7B00', secondary: '#FF8800', accent: '#FFD000', background: '#fff8e1', highlight: '#E5383B' },
  Virgo:      { primary: '#582F0E', secondary: '#7F4F24', accent: '#936639', background: '#fdf8f4', highlight: '#A68A64' },
  Libra:      { primary: '#FF70A6', secondary: '#FF97B5', accent: '#FFD6E0', background: '#fff5f7', highlight: '#70D6FF' },
  Scorpio:    { primary: '#000000', secondary: '#14213D', accent: '#FCA311', background: '#f2f2f2', highlight: '#E5383B' },
  Sagittarius:{ primary: '#6A057F', secondary: '#9602B4', accent: '#B448CF', background: '#f9f2fb', highlight: '#F7B801' },
  Capricorn:  { primary: '#343A40', secondary: '#495057', accent: '#6C757D', background: '#f8f9fa', highlight: '#ADB5BD' },
  Aquarius:   { primary: '#00A6FB', secondary: '#0582CA', accent: '#006494', background: '#f0f9ff', highlight: '#219EBC' },
  Pisces:     { primary: '#3A86FF', secondary: '#8338EC', accent: '#C77DFF', background: '#f6f2ff', highlight: '#FF006E' },
};

// ชุดคำอวยพรแบบสุ่ม
const birthdayWishes = [
  "ขอให้ทุกวันเป็นวันที่ดี มีความสุขตลอดปี!",
  "สุขสันต์วันเกิด! ขอให้เฮงๆ รวยๆ สุขภาพแข็งแรง",
  "Happy Birthday! ขอให้ปีนี้เป็นปีที่ยอดเยี่ยมของคุณ",
  "ขอให้มีแต่รอยยิ้มและเสียงหัวเราะในวันพิเศษนี้นะ",
  "สุขสันต์วันเกิด ขอให้สมหวังในทุกสิ่งที่ปรารถนา",
];

const getDominantZodiacForMonth = (month) => {
    const zodiacs = ["Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn"];
    return zodiacs[month] || "Default";
};

const getZodiacSign = (isoBirthDate) => {
  if (!isoBirthDate) return "";
  const d = new Date(isoBirthDate);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "เมษ (Aries) ♈️";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "พฤษภ (Taurus) ♉️";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "เมถุน (Gemini) ♊️";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "กรกฎ (Cancer) ♋️";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "สิงห์ (Leo) ♌️";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "กันย์ (Virgo) ♍️";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "ตุลย์ (Libra) ♎️";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "พิจิก (Scorpio) ♏️";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "ธนู (Sagittarius) ♐️";
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "มังกร (Capricorn) ♑️";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "กุมภ์ (Aquarius) ♒️";
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return "มีน (Pisces) ♓️";
  return "";
};

const Birthday = () => {
  const [birthdayMembers, setBirthdayMembers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewedDate, setViewedDate] = useState(new Date());
  const [showConfetti, setShowConfetti] = useState(false);
  const [randomWish, setRandomWish] = useState("");

  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();

  const currentMonthIndex = viewedDate.getMonth();
  const currentYear = viewedDate.getFullYear();
  const currentMonthName = getMonthName(currentMonthIndex);

  const dominantZodiac = getDominantZodiacForMonth(currentMonthIndex);
  const theme = zodiacThemes[dominantZodiac] || zodiacThemes.Default;

  useEffect(() => {
    if (!isLoading) {
      if (birthdayMembers.length > 0) {
        const randomIndex = Math.floor(Math.random() * birthdayWishes.length);
        setRandomWish(birthdayWishes[randomIndex]);
      } else {
        setRandomWish("เดือนนี้ยังไม่มีสมาชิกวันเกิด... หวังว่าจะมีข่าวดีเร็วๆ นี้!");
      }
    }
  }, [birthdayMembers, isLoading]);

  useEffect(() => {
    if (birthdayMembers.length > 0) {
      const isBirthdayToday = birthdayMembers.some(member => {
        const birthDate = new Date(member.birthDate);
        return birthDate.getDate() === todayDate && birthDate.getMonth() === todayMonth;
      });

      if (isBirthdayToday && viewedDate.getMonth() === todayMonth && viewedDate.getFullYear() === today.getFullYear()) {
        setShowConfetti(true);
        const timer = setTimeout(() => setShowConfetti(false), 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [birthdayMembers, viewedDate, todayDate, todayMonth, today]);

  const cachedBirthdayData = useRef({});
  const handleMonthChange = (offset) => { setViewedDate(d => { const n = new Date(d); n.setDate(1); n.setMonth(n.getMonth() + offset); return n; }); };
  const goToToday = () => { setViewedDate(new Date()); };
  function getMonthName(monthIndex) { const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]; return months[monthIndex]; };
  const getDayName = (dayIndex) => { const shortNames = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]; return shortNames[dayIndex]; };
  const calculateAge = (iso) => { if(!iso) return "N/A"; const bd = new Date(iso); let age = today.getFullYear()-bd.getFullYear(); const m=today.getMonth()-bd.getMonth(); if(m<0||(m===0&&today.getDate()<bd.getDate())) age--; return age; };

  useEffect(() => { const e=localStorage.getItem("loggedInEmail"); if(e) {getDocs(query(collection(db, "users"), where("email", "==", e))).then(snap => { if(!snap.empty) { const user = snap.docs[0]; setCurrentUserId(user.id); } });} }, []);

  const fetchBirthdayMembers = useCallback(async () => { if (!currentUserId) return; setIsLoading(true); const m = viewedDate.getMonth(), y = viewedDate.getFullYear(), key = `${y}-${m}`; if(cachedBirthdayData.current[key]) { setBirthdayMembers(cachedBirthdayData.current[key]); setIsLoading(false); return; } try { const snap = await getDocs(collection(db, `users/${currentUserId}/Members`)); const all = snap.docs.map(doc => ({id:doc.id,...doc.data()})); const f = all.filter(mem => { if(mem.birthDate) { const d = new Date(mem.birthDate); return !isNaN(d.getTime()) && d.getMonth() === m; } return false; }); f.sort((a,b) => new Date(a.birthDate).getDate() - new Date(b.birthDate).getDate()); cachedBirthdayData.current[key] = f; setBirthdayMembers(f); } catch (err) { console.error(err); } finally { setIsLoading(false); } }, [currentUserId, viewedDate]);

  useEffect(() => { if(currentUserId) fetchBirthdayMembers(); }, [currentUserId, fetchBirthdayMembers]);

  const getDaysInMonth = (y,m) => new Date(y,m+1,0).getDate();
  const getFirstDayOfMonth = (y,m) => new Date(y,m,1).getDay();
  const totalDays = getDaysInMonth(currentYear, currentMonthIndex);
  const firstDayOfWeek = getFirstDayOfMonth(currentYear, currentMonthIndex);

  const getMembersForDay = (day) => {
    return birthdayMembers.filter(member => {
        if (!member.birthDate || typeof member.birthDate !== 'string') return false;
        const birthDayFromString = parseInt(member.birthDate.substring(8, 10), 10);
        return birthDayFromString === day;
    });
  };

  const handleDayClick = (day) => {
    const membersOnThisDay = getMembersForDay(day);
    if (membersOnThisDay.length > 0) {
      const membersHtml = membersOnThisDay.map(member => `
          <li class="swal-birthday-list-item">
            <div class="swal-member-info">
              <span class="swal-member-name">${member.name}</span>
              <span class="swal-member-details">อายุ ${calculateAge(member.birthDate)} ปี • ${getZodiacSign(member.birthDate)}</span>
            </div>
          </li>
        `).join("");

      Swal.fire({
        title: `วันเกิดในวันที่ ${day} ${currentMonthName}`,
        html: `<ul class="swal-birthday-list">${membersHtml}</ul>`,
        showConfirmButton: false,
        showCloseButton: true,
        customClass: {
          popup: 'swal-custom-popup',
          title: 'swal-custom-title',
          htmlContainer: 'swal-custom-html-container',
          closeButton: 'swal-custom-close-button',
        },
        didOpen: (popup) => {
            const titleElement = popup.querySelector('.swal-custom-title');
            if(titleElement){
                const iconHTML = `
                <div class="swal-custom-icon-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-gift"><polyline points="20 12 20 22 4 22 4 12"/><rect width="20" height="5" x="2" y="7"/><line x1="12" x2="12" y1="22" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
                </div>`;
                titleElement.insertAdjacentHTML('beforebegin', iconHTML);
            }
        },
      });
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-prev-${i}`} className="calendar-day empty"></div>);
    }
    for (let day = 1; day <= totalDays; day++) {
      const isCurrentDay = day === todayDate && currentMonthIndex === todayMonth && currentYear === today.getFullYear();
      const hasBirthday = getMembersForDay(day).length > 0;
      let className = "calendar-day";
      if (isCurrentDay) className += " today";
      if (hasBirthday) className += " has-birthday";
      days.push(
        <div key={`day-${day}`} className={className} onClick={() => hasBirthday && handleDayClick(day)}
          style={{ cursor: hasBirthday ? "pointer" : "default" }}>
          {day}
          {hasBirthday && <span className="birthday-gift-icon">🎁</span>}
        </div>
      );
    }
    const totalCells = firstDayOfWeek + totalDays;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 0; i < remaining; i++) {
        days.push(<div key={`empty-next-${i}`} className="calendar-day empty"></div>);
    }
    return days;
  };

  return (
    <div className="overall-layout" style={{ '--theme-primary': theme.primary, '--theme-secondary': theme.secondary, '--theme-accent': theme.accent, '--theme-background': theme.background, '--theme-highlight': theme.highlight, }}>
      {showConfetti && <Confetti recycle={false} numberOfPieces={400} />}

      <main className="main-content">
        <h2 className="page-title-text-left">
          วันเกิดสมาชิกประจำเดือน: {currentMonthName} {currentYear}
        </h2>

        <div className="top-section-grid">
          <div className="birthday-summary-section">
            <div className="summary-card">
              <span className="summary-icon">🎉</span>
              <div className="summary-text">
                <h3>
                  สมาชิกเกิดในเดือน{" "}
                  <span className="highlight-month">{currentMonthName}</span>
                </h3>
                <div className="total-count">
                    <CountUp end={birthdayMembers.length} duration={1.5} separator="," />
                    <span>&nbsp;คน</span>
                </div>
                <p className="greeting-message">
                  {randomWish}
                </p>
              </div>
              <span className="balloon-decoration balloon-1">🎈</span>
              <span className="balloon-decoration balloon-2">🎈</span>
              <span className="balloon-decoration balloon-3">🎈</span>
            </div>
          </div>

          <div className="calendar-widget-container">
            <div className="calendar-header">
              <button className="month-nav-button" onClick={() => handleMonthChange(-1)}>◀</button>
              <div className="header-center-content">
                <h3>{currentMonthName} {currentYear}</h3>
                <button className="today-button" onClick={goToToday}>วันนี้</button>
              </div>
              <button className="month-nav-button" onClick={() => handleMonthChange(1)}>▶</button>
            </div>
            <div className="calendar-weekdays">
                {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="calendar-days-grid">
                {renderCalendarDays()}
            </div>
          </div>
        </div>

        <div className="bottom-section-table">
          {isLoading ? ( <div className="status-message"><div className="spinner"></div>กำลังโหลด...</div> ) : ( <> {birthdayMembers.length === 0 ? ( <div className="status-message">😔 ไม่พบสมาชิกที่เกิดในเดือน{currentMonthName}นี้</div> ) : ( <div className="birthday-table-container"> <table> <thead> <tr> <th>ลำดับ</th> <th>ชื่อสมาชิก</th> <th>วันเกิด</th> <th>ราศี</th> <th>อายุ (ปี)</th> </tr> </thead> <tbody> {birthdayMembers.map((member, index) => { const birthDate = new Date(member.birthDate); const isMemberBirthdayToday = birthDate.getDate() === todayDate && birthDate.getMonth() === todayMonth; return ( <tr key={member.id} className={isMemberBirthdayToday ? "today-birthday-row" : ""}> <td>{index + 1}</td> <td className="member-name-cell">{member.name}</td> <td>{birthDate.toLocaleDateString("th-TH", { day: "numeric", month: "long" })}</td> <td>{getZodiacSign(member.birthDate)}</td> <td>{calculateAge(member.birthDate)}</td> </tr> ); })} </tbody> </table> </div> )} </> )}
        </div>
      </main>

      <style jsx>{`
        .overall-layout { background-color: var(--theme-background); transition: background-color 0.5s ease; }
        .main-content { padding: 20px; font-family: "Kanit", sans-serif; }
        .page-title-text-left { color: var(--theme-primary); font-size: 1.25rem; padding-bottom: 12px; border-bottom: 2px solid var(--theme-accent); transition: all 0.5s ease; }
        .top-section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; align-items: stretch; }
        @media (max-width: 1200px) { .top-section-grid { grid-template-columns: 1fr; } }
        .birthday-summary-section { display: flex; }
        .summary-card { background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary)); color: #fff; padding: 20px 25px; border-radius: 12px; display: flex; align-items: center; gap: 15px; transition: background 0.5s ease; width: 100%; position: relative; overflow: hidden; }
        .summary-icon { font-size: 3rem; }
        .summary-text { flex-grow: 1; z-index: 1; }
        .total-count { font-size: 2.2rem; font-weight: 900; display: flex; align-items: baseline; }
        .total-count span { font-size: 1.2rem; font-weight: 500; margin-left: 0.25rem;}
        .highlight-month { color: var(--theme-accent); text-shadow: 1px 1px 2px rgba(0,0,0,0.2); }
        .greeting-message { font-size: 0.9rem; margin-top: 8px; color: rgba(255, 255, 255, 0.9); line-height: 1.4; font-style: italic; }
        .balloon-decoration { position: absolute; font-size: 28px; opacity: 0.6; z-index: 0; animation: floatUp 10s infinite ease-in-out alternate; }
        .balloon-1 { top: 10%; left: 5%; animation-delay: 0s; }
        .balloon-2 { bottom: 20%; right: 15%; font-size: 24px; animation-delay: 3s; }
        .balloon-3 { top: 30%; right: 5%; font-size: 30px; animation-delay: 6s; }
        @keyframes floatUp { from { transform: translateY(0px) rotate(-5deg); } to { transform: translateY(-15px) rotate(5deg); } }
        .calendar-widget-container { background-color: #ffffff; border-radius: 12px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08); padding: 20px; }
        .calendar-header { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid var(--theme-accent); transition: border-color 0.5s ease; }
        .header-center-content { display: flex; flex-direction: column; align-items: center; }
        .calendar-header h3 { color: var(--theme-primary); }
        .month-nav-button { background: none; border: 1px solid #ccc; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; }
        .month-nav-button:hover { background-color: var(--theme-background); }
        .today-button { background-color: var(--theme-background); border: 1px solid var(--theme-accent); border-radius: 12px; padding: 2px 10px; font-size: 12px; cursor: pointer; margin-top: 5px; }
        .today-button:hover { background-color: var(--theme-accent); }
        .calendar-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-weight: 600; color: #6c757d; margin-bottom: 10px; }
        .calendar-days-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
        .calendar-day { display: flex; justify-content: center; align-items: center; aspect-ratio: 1 / 1; border-radius: 50%; transition: all 0.2s ease; position: relative; }
        .calendar-day.empty { background-color: transparent; color: #ccc; }
        .calendar-day.today { background-color: var(--theme-primary); color: #fff; font-weight: 700; }
        .calendar-day.has-birthday { background-color: color-mix(in srgb, var(--theme-highlight) 15%, #fff); border: 1px solid color-mix(in srgb, var(--theme-highlight) 40%, #fff); color: var(--theme-highlight); cursor: pointer; }
        .calendar-day.today.has-birthday { background-color: var(--theme-highlight); border: 2px solid var(--theme-accent); color: #fff; }
        .birthday-gift-icon { position: absolute; bottom: 5px; font-size: 1.2rem; }
        .birthday-table-container { background-color: #fff; border-radius: 12px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08); overflow-x: auto; padding: 15px; }
        table { width: 100%; border-collapse: collapse; }

        /* --- START: โค้ดที่แก้ไข --- */
        th {
            background-color: var(--theme-primary);
            color: #ffffff;
            font-size: 1rem; /* เพิ่มขนาดตัวอักษร */
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 14px 15px; /* เพิ่มความสูง */
            transition: background-color 0.5s ease;
        }
        td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
        }
        /* --- END: โค้ดที่แก้ไข --- */

        .today-birthday-row { background-color: color-mix(in srgb, var(--theme-highlight) 10%, #fff) !important; border-left: 4px solid var(--theme-highlight); }
        .today-birthday-row td { color: var(--theme-highlight); font-weight: 600; }
        .status-message { text-align: center; padding: 40px; display: flex; gap: 10px; justify-content: center; align-items: center; }
        .spinner { border: 4px solid #e9ecef; border-top-color: var(--theme-primary); width: 25px; height: 25px; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <style jsx global>{`
        .swal-custom-popup {
            border-radius: 15px !important;
            padding: 1.5rem !important;
            width: 90% !important;
            max-width: 480px !important;
            background-color: #ffffff !important; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.1) !important;
            border: 1px solid #eee;
        }
        .swal-custom-icon-wrapper {
            margin: 0 auto 1rem;
            width: 70px;
            height: 70px;
            border-radius: 50%;
            background-color: color-mix(in srgb, var(--theme-highlight) 20%, white);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--theme-highlight);
            transition: all 0.5s ease;
        }
        .swal-custom-title {
            font-size: 2rem !important;
            font-weight: 700 !important;
            color: var(--theme-primary) !important;
            margin-bottom: 1.25rem !important;
            transition: color 0.5s ease;
        }
        .swal-custom-html-container { margin: 0 !important; }
        .swal-birthday-list { list-style-type: none; padding-left: 0; margin: 0; }
        .swal-birthday-list-item {
            background-color: #f8f9fa;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 0.75rem;
            text-align: left;
            border-left: 5px solid var(--theme-highlight);
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            transition: all 0.5s ease;
        }
        .swal-member-info { display: flex; flex-direction: column; }
        .swal-member-name { font-weight: 600; color: var(--theme-secondary); font-size: 1.2rem; transition: color 0.5s ease; }
        .swal-member-details { font-size: 0.9rem; color: #777; margin-top: 4px; }
        .swal-custom-close-button { color: #90a4ae !important; font-size: 2rem !important; transition: color 0.2s ease-in-out !important; border: none !important; background: none !important; box-shadow: none !important; }
        .swal-custom-close-button:hover { color: var(--theme-primary) !important; }
      `}</style>
    </div>
  );
};

export default Birthday;

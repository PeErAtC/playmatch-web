import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./components/sidebar";
import Swal from "sweetalert2";
import { db } from "../lib/firebaseConfig";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

// MOCK DATA (เปลี่ยนภายหลังได้)
const courts = ["สนาม 1", "สนาม 2", "สนาม 3"];
const players = [
  "สมชาย",
  "วิชัย",
  "อารีย์",
  "อภิวัฒน์",
  "ณัฐวุฒิ",
  "ธีรยุทธ",
  "วราพงษ์",
  "ธนกร",
];
const balls = Array.from({ length: 10 }, (_, i) => (i + 1).toString());

const RESULT_OPTIONS = [
  { value: "", label: "เลือกผล" },
  { value: "A", label: "ทีม A ชนะ" },
  { value: "B", label: "ทีม B ชนะ" },
  { value: "DRAW", label: "เสมอ" },
];
const STATUS_OPTIONS = [
  { value: "", label: "ยังไม่ได้กรอก" }, // สีเหลือง
  { value: "playing", label: "กำลังแข่งขัน" }, // สีเหลือง
  { value: "finished", label: "จบการแข่งขัน" }, // สีแดง
];

const STATUS_COLORS = {
  "": "#fff8d8", // เหลืองอ่อน
  playing: "#fff8d8",
  finished: "#f44336", // แดง
};

const getScoreByResult = (result) => {
  if (result === "A") return "2/0";
  if (result === "B") return "0/2";
  if (result === "DRAW") return "1/1";
  return "";
};

const padId = (id, len = 4) => String(id).padStart(len, "0");

const ITEMS_PER_PAGE = 30;

const Match = () => {
  // State สำหรับฟอร์ม
  const [matchDate, setMatchDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10); // yyyy-mm-dd
  });
  const [topic, setTopic] = useState("");
  const [isOpen, setIsOpen] = useState(false); // เปิดก๊วน/ปิดก๊วน
  const [matches, setMatches] = useState([]);
  const [activityTime, setActivityTime] = useState(0); // วินาที
  const [timer, setTimer] = useState(null);
  const timerRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showMenuId, setShowMenuId] = useState(null); // สำหรับ 3 จุด (ลบ)

  // ตรวจสอบอีเมลล็อกอิน (กรณีจะบันทึกลง collection history ของ user)
  const [loggedInEmail, setLoggedInEmail] = useState("");

  useEffect(() => {
    setLoggedInEmail(localStorage.getItem("loggedInEmail") || "");
  }, []);

  // Reset เมื่อปิดก๊วน
  const resetSession = () => {
    setMatches([]);
    setActivityTime(0);
    setIsOpen(false);
    setCurrentPage(1);
    clearInterval(timerRef.current);
    setTimer(null);
  };

  // Handle timer
  useEffect(() => {
    if (isOpen) {
      timerRef.current = setInterval(() => {
        setActivityTime((prev) => prev + 1);
      }, 1000);
      setTimer(timerRef.current);
    } else {
      clearInterval(timerRef.current);
      setTimer(null);
    }
    return () => clearInterval(timerRef.current);
  }, [isOpen]);

  // Format เวลา
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s} นาที`;
  };

  // เพิ่มแถวใหม่ (Match)
  const handleAddMatch = () => {
    setMatches((prev) => [
      ...prev,
      {
        matchId: padId(prev.length + 1, 4),
        court: "",
        A1: "",
        A2: "",
        B1: "",
        B2: "",
        balls: "",
        result: "",
        score: "",
        status: "",
      },
    ]);
    setShowMenuId(null);
    // ถ้าเพิ่มแล้วข้าม page ให้กระโดดไปหน้าสุดท้าย
    setTimeout(() => {
      const newTotal = matches.length + 1;
      setCurrentPage(Math.ceil(newTotal / ITEMS_PER_PAGE));
    }, 100);
  };

  // แก้ไขข้อมูลในแถว
  const handleChangeMatch = (idx, field, value) => {
    setMatches((prev) => {
      const updated = [...prev];
      updated[idx][field] = value;
      // เมื่อผลการแข่งขันเปลี่ยน ให้เปลี่ยน score อัตโนมัติ
      if (field === "result") {
        updated[idx].score = getScoreByResult(value);
      }
      return updated;
    });
  };

  // ลบแถว Match
  const handleDeleteMatch = (idx) => {
    setMatches((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((item, i) => ({
          ...item,
          matchId: padId(i + 1, 4),
        }))
    );
    setShowMenuId(null);
  };

  // เปิด/ปิดก๊วน
  const handleStartGroup = () => {
    if (!topic) {
      Swal.fire("กรุณาระบุหัวเรื่อง", "", "warning");
      return;
    }
    setIsOpen(true);
    setActivityTime(0);
    setMatches([]);
    setCurrentPage(1);
  };

  const handleEndGroup = async () => {
    if (matches.length === 0) {
      Swal.fire("ไม่มี match ที่จะบันทึก", "", "info");
      setIsOpen(false);
      setActivityTime(0);
      return;
    }
    // บันทึกลง History (Firebase)
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", loggedInEmail));
      const userSnap = await getDocs(q);
      let userId = null;
      userSnap.forEach((doc) => {
        userId = doc.id;
      });
      if (!userId) throw new Error("User not found");

      const historyRef = collection(db, `users/${userId}/MatchHistory`);
      await addDoc(historyRef, {
        topic,
        matchDate,
        totalTime: activityTime,
        matches,
        savedAt: serverTimestamp(),
      });
      Swal.fire("บันทึกสำเร็จ!", "บันทึก Match เข้าประวัติแล้ว", "success");
      resetSession();
    } catch (error) {
      Swal.fire("เกิดข้อผิดพลาด", error.message, "error");
    }
  };

  // Pagination
  const indexOfLast = currentPage * ITEMS_PER_PAGE;
  const indexOfFirst = indexOfLast - ITEMS_PER_PAGE;
  const currentMatches = matches.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(matches.length / ITEMS_PER_PAGE);

  // หลีกเลี่ยงเลือกซ้ำในผู้เล่น (A1, A2, B1, B2) ได้ด้วยตัวเองภายหลัง

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        height: "100vh",
      }}
    >
      <Sidebar />
      <main
        className="main-content"
        style={{
          padding: "28px",
          backgroundColor: "#f7f7f7",
          borderRadius: "12px",
          overflowY: "auto",
        }}
      >
        <h2 style={{ fontSize: "22px", marginBottom: "12px" }}>Match</h2>
        <hr />

        {/* Row 1 - Top filter/form */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            alignItems: "center",
            gap: "18px",
            marginBottom: "18px",
            marginTop: "20px",
          }}
        >
          {/* Left */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <input
              type="date"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              disabled={isOpen}
              style={{
                fontSize: "15px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                padding: "7px 14px",
                minWidth: "140px",
                background: "#fff",
              }}
            />
            <div>
              <label
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  marginRight: "6px",
                  color: "#333",
                }}
              >
                หัวเรื่อง
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="กรุณากรอกหัวเรื่อง"
                disabled={isOpen}
                style={{
                  fontSize: "15px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  padding: "7px 14px",
                  minWidth: "180px",
                  background: "#fff",
                }}
              />
            </div>
          </div>
          {/* Right */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={isOpen ? handleEndGroup : handleStartGroup}
              style={{
                backgroundColor: isOpen ? "#f44336" : "#37e54d",
                color: "white",
                padding: "10px 32px",
                fontSize: "15px",
                fontWeight: 500,
                borderRadius: "7px",
                border: "none",
                marginRight: "4px",
                cursor: "pointer",
                boxShadow: isOpen
                  ? "0 2px 8px rgba(244,67,54,0.07)"
                  : "0 2px 8px rgba(55,229,77,0.09)",
                transition: "all 0.22s",
              }}
            >
              {isOpen ? "ปิดก๊วน" : "เริ่มจัดก๊วน"}
            </button>
            <div
              style={{
                background: "#fff",
                border: "1px solid #3ec5e0",
                borderRadius: "7px",
                padding: "8px 20px",
                fontSize: "15px",
                fontWeight: 500,
                color: "#0a6179",
                minWidth: "180px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span style={{ color: "#2196f3", fontWeight: 600 }}>
                Total Activity Time
              </span>
              <span style={{ fontWeight: 600, color: "#222", fontSize: "15px" }}>
                - {formatTime(activityTime)}
              </span>
            </div>
          </div>
        </div>

        {/* Row 2 - จำนวนเกม */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            marginBottom: "10px",
            fontSize: "15px",
            color: "#353535",
            fontWeight: 500,
          }}
        >
          จำนวนเกม : {matches.length}
        </div>

        {/* ตาราง Match */}
        <div
          style={{
            overflowX: "auto",
            marginBottom: "16px",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              backgroundColor: "#fff",
              borderRadius: "13px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.07)",
              fontSize: "15px",
              minWidth: "1250px",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#323943",
                  color: "white",
                  fontSize: "15px",
                  textAlign: "center",
                  height: "45px",
                }}
              >
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>
                  Match ID
                </th>
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>
                  court
                </th>
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>
                  A1
                </th>
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>
                  A2
                </th>
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>
                  B1
                </th>
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>
                  B2
                </th>
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>
                  ลูกที่ใช้/เกม
                </th>
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>
                  ผลการแข่งขัน
                </th>
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>
                  score
                </th>
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>
                  status
                </th>
                <th style={{ padding: "11px 9px" }}></th>
              </tr>
            </thead>
            <tbody>
              {currentMatches.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    style={{
                      padding: "34px 0",
                      color: "#999",
                      textAlign: "center",
                      fontSize: "17px",
                    }}
                  >
                    {isOpen
                      ? "ยังไม่มี Match กรุณาเพิ่มรายการ"
                      : "กรุณากดเริ่มจัดก๊วนก่อน"}
                  </td>
                </tr>
              )}
              {currentMatches.map((match, idx) => {
                const globalIdx = indexOfFirst + idx;
                return (
                  <tr
                    key={match.matchId}
                    style={{
                      background:
                        globalIdx % 2 === 0 ? "#f8fcfe" : "#f4f7fa",
                      height: "53px",
                      transition: "background 0.25s",
                    }}
                  >
                    <td
                      style={{
                        textAlign: "center",
                        borderRight: "1px solid #e3e3e3",
                        fontWeight: 500,
                        fontSize: "15.5px",
                      }}
                    >
                      {match.matchId}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        borderRight: "1px solid #e3e3e3",
                      }}
                    >
                      <select
                        value={match.court}
                        onChange={(e) =>
                          handleChangeMatch(globalIdx, "court", e.target.value)
                        }
                        disabled={!isOpen}
                        style={{
                          width: "110px",
                          padding: "7px",
                          borderRadius: "5px",
                          border: "1px solid #bbb",
                          fontSize: "15px",
                        }}
                      >
                        <option value="">เลือกสนาม</option>
                        {courts.map((court) => (
                          <option key={court} value={court}>
                            {court}
                          </option>
                        ))}
                      </select>
                    </td>
                    {/* ผู้เล่น A1 */}
                    <td
                      style={{
                        textAlign: "center",
                        borderRight: "1px solid #e3e3e3",
                      }}
                    >
                      <select
                        value={match.A1}
                        onChange={(e) =>
                          handleChangeMatch(globalIdx, "A1", e.target.value)
                        }
                        disabled={!isOpen}
                        style={{
                          width: "120px",
                          padding: "7px",
                          borderRadius: "5px",
                          border: "1px solid #bbb",
                          fontSize: "15px",
                        }}
                      >
                        <option value="">เลือกผู้เล่น</option>
                        {players.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    {/* ผู้เล่น A2 */}
                    <td
                      style={{
                        textAlign: "center",
                        borderRight: "1px solid #e3e3e3",
                      }}
                    >
                      <select
                        value={match.A2}
                        onChange={(e) =>
                          handleChangeMatch(globalIdx, "A2", e.target.value)
                        }
                        disabled={!isOpen}
                        style={{
                          width: "120px",
                          padding: "7px",
                          borderRadius: "5px",
                          border: "1px solid #bbb",
                          fontSize: "15px",
                        }}
                      >
                        <option value="">เลือกผู้เล่น</option>
                        {players.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    {/* ผู้เล่น B1 */}
                    <td
                      style={{
                        textAlign: "center",
                        borderRight: "1px solid #e3e3e3",
                      }}
                    >
                      <select
                        value={match.B1}
                        onChange={(e) =>
                          handleChangeMatch(globalIdx, "B1", e.target.value)
                        }
                        disabled={!isOpen}
                        style={{
                          width: "120px",
                          padding: "7px",
                          borderRadius: "5px",
                          border: "1px solid #bbb",
                          fontSize: "15px",
                        }}
                      >
                        <option value="">เลือกผู้เล่น</option>
                        {players.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    {/* ผู้เล่น B2 */}
                    <td
                      style={{
                        textAlign: "center",
                        borderRight: "1px solid #e3e3e3",
                      }}
                    >
                      <select
                        value={match.B2}
                        onChange={(e) =>
                          handleChangeMatch(globalIdx, "B2", e.target.value)
                        }
                        disabled={!isOpen}
                        style={{
                          width: "120px",
                          padding: "7px",
                          borderRadius: "5px",
                          border: "1px solid #bbb",
                          fontSize: "15px",
                        }}
                      >
                        <option value="">เลือกผู้เล่น</option>
                        {players.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    {/* ลูกที่ใช้/เกม */}
                    <td
                      style={{
                        textAlign: "center",
                        borderRight: "1px solid #e3e3e3",
                      }}
                    >
                      <select
                        value={match.balls}
                        onChange={(e) =>
                          handleChangeMatch(globalIdx, "balls", e.target.value)
                        }
                        disabled={!isOpen}
                        style={{
                          width: "90px",
                          padding: "7px",
                          borderRadius: "5px",
                          border: "1px solid #bbb",
                          fontSize: "15px",
                        }}
                      >
                        <option value="">เลือก</option>
                        {balls.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </td>
                    {/* ผลการแข่งขัน */}
                    <td
                      style={{
                        textAlign: "center",
                        borderRight: "1px solid #e3e3e3",
                      }}
                    >
                      <select
                        value={match.result}
                        onChange={(e) =>
                          handleChangeMatch(globalIdx, "result", e.target.value)
                        }
                        disabled={!isOpen}
                        style={{
                          width: "110px",
                          padding: "7px",
                          borderRadius: "5px",
                          border: "1px solid #bbb",
                          fontSize: "15px",
                        }}
                      >
                        {RESULT_OPTIONS.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    {/* Score */}
                    <td
                      style={{
                        textAlign: "center",
                        borderRight: "1px solid #e3e3e3",
                        fontWeight: 600,
                        fontSize: "15px",
                        color: "#138c0f",
                      }}
                    >
                      {match.score}
                    </td>
                    {/* Status */}
                    <td
                      style={{
                        textAlign: "center",
                        borderRight: "1px solid #e3e3e3",
                        position: "relative",
                      }}
                    >
                      <select
                        value={match.status}
                        onChange={(e) =>
                          handleChangeMatch(globalIdx, "status", e.target.value)
                        }
                        disabled={!isOpen}
                        style={{
                          width: "110px",
                          padding: "7px",
                          borderRadius: "5px",
                          border: "1px solid #bbb",
                          fontSize: "15px",
                          background:
                            STATUS_COLORS[match.status] || "#fff8d8",
                          color:
                            match.status === "finished"
                              ? "#fff"
                              : "#666",
                          fontWeight: 600,
                        }}
                      >
                        <option value="" style={{ color: "#f8b800" }}>
                          Defill
                        </option>
                        <option value="playing" style={{ color: "#f8b800" }}>
                          กำลังแข่งขัน
                        </option>
                        <option value="finished" style={{ color: "#f44336" }}>
                          จบการแข่งขัน
                        </option>
                      </select>
                    </td>
                    {/* จุด 3 จุด (Dropdown Action) */}
                    <td style={{ textAlign: "center", minWidth: "48px" }}>
                      {isOpen && (
                        <div
                          style={{
                            position: "relative",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            tabIndex={-1}
                            onClick={() =>
                              setShowMenuId(
                                showMenuId === match.matchId
                                  ? null
                                  : match.matchId
                              )
                            }
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "5px",
                              borderRadius: "50%",
                              width: "32px",
                              height: "32px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "23px",
                            }}
                          >
                            <span style={{ color: "#666" }}>⋮</span>
                          </button>
                          {showMenuId === match.matchId && (
                            <div
                              style={{
                                position: "absolute",
                                top: "32px",
                                right: 0,
                                background: "#fff",
                                border: "1px solid #ddd",
                                borderRadius: "7px",
                                boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                                zIndex: 12,
                              }}
                            >
                              <button
                                onClick={() => handleDeleteMatch(globalIdx)}
                                style={{
                                  padding: "9px 28px 9px 22px",
                                  fontSize: "15px",
                                  color: "#b71c1c",
                                  background: "none",
                                  border: "none",
                                  textAlign: "left",
                                  width: "100%",
                                  cursor: "pointer",
                                }}
                              >
                                ลบแถวนี้
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add item */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            margin: "18px 0 22px 8px",
          }}
        >
          <button
            onClick={handleAddMatch}
            disabled={!isOpen}
            style={{
              width: "43px",
              height: "43px",
              borderRadius: "50%",
              backgroundColor: isOpen ? "#40c2ec" : "#bbb",
              border: "none",
              color: "#fff",
              fontSize: "25px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "7px",
              cursor: isOpen ? "pointer" : "not-allowed",
              transition: "all 0.15s",
              boxShadow: "0 2px 7px rgba(50,200,250,0.10)",
              userSelect: "none",
            }}
            tabIndex={-1}
          >
            +
          </button>
          <span
            style={{
              fontSize: "17px",
              color: "#222",
              borderBottom: "2px solid #40c2ec",
              fontWeight: 500,
              cursor: isOpen ? "pointer" : "not-allowed",
              userSelect: "none",
              marginRight: "12px",
            }}
            onClick={() => isOpen && handleAddMatch()}
          >
            Item
          </span>
        </div>

        {/* Pagination */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "7px",
            marginTop: "7px",
            marginBottom: "30px",
          }}
        >
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: "8px 22px",
              border: "1px solid #bbb",
              borderRadius: "5px",
              backgroundColor: "#f1f1f1",
              color: "#333",
              fontSize: "15px",
              fontWeight: 500,
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
            }}
          >
            ย้อนกลับ
          </button>
          {Array.from({ length: totalPages }, (_, idx) => (
            <button
              key={idx + 1}
              onClick={() => setCurrentPage(idx + 1)}
              style={{
                padding: "8px 14px",
                border: "1px solid #bbb",
                borderRadius: "5px",
                margin: "0 2px",
                backgroundColor:
                  currentPage === idx + 1 ? "#6c757d" : "#f1f1f1",
                color: currentPage === idx + 1 ? "#fff" : "#222",
                fontWeight: currentPage === idx + 1 ? 600 : 500,
                fontSize: "15px",
                cursor: "pointer",
              }}
            >
              {idx + 1}
            </button>
          ))}
          <button
            onClick={() =>
              setCurrentPage((p) => Math.min(totalPages, p + 1))
            }
            disabled={currentPage === totalPages || totalPages === 0}
            style={{
              padding: "8px 22px",
              border: "1px solid #bbb",
              borderRadius: "5px",
              backgroundColor: "#f1f1f1",
              color: "#333",
              fontSize: "15px",
              fontWeight: 500,
              cursor:
                currentPage === totalPages || totalPages === 0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            ถัดไป
          </button>
        </div>
      </main>
    </div>
  );
};

export default Match;

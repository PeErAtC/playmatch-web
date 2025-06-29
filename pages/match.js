import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { db } from "../lib/firebaseConfig";
import {
  collection,
  addDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

// รายการสนาม
const courts = [
  "สนาม 1", "สนาม 2", "สนาม 3", "สนาม 4", "สนาม 5",
  "สนาม 6", "สนาม 7", "สนาม 8", "สนาม 9", "สนาม 10",
];

const RESULT_OPTIONS = [
  { value: "", label: "เลือกผล" },
  { value: "A", label: "ทีม A ชนะ" },
  { value: "B", label: "ทีม B ชนะ" },
  { value: "DRAW", label: "เสมอ" },
];

const STATUS_COLORS = {
  "เตรียมพร้อม": "#fff8d8", // Light yellow for "เตรียมพร้อม"
  "playing": "#57e497", // Light green for "Playing"
  "finished": "#f44336", // Red for "Finished"
};

// Colors for member levels - UPDATED WITH ALL YOUR LEVELS (Darker and cool to warm)
const LEVEL_COLORS = {
  // Cool tones (lower levels)
  C: "#6a3d9a",       // Darker Blue
  "P-": "#6a3d9a",    // Lighter Blue (distinct from C)
  P: "#6a3d9a",       // Darker Green
  "N-": "#1f78b4",    // Lighter Green (distinct from P)
  N: "#1f78b4",       // Darker Purple

  // Warmer tones (higher levels)
  "S-": "#f44336",    // Orange-Yellow
  S: "#f44336",       // Darker Orange
  "มือหน้าบ้าน": "#33a02c", // Darker Red
  "มือหน้าบ้าน1": "#33a02c", // Lighter Red (distinct from มือหน้าบ้าน)
  "มือหน้าบ้าน2": "#33a02c", // Lavender (distinct, but still warm-ish)
  "มือหน้าบ้าน3": "#33a02c", // Darker Red/Maroon
};

// Define the order of levels EXACTLY as provided by the user (from high to low, or specific display order)
const LEVEL_ORDER = [
  "C",
  "P",
  "P-",
  "N",
  "N-",
  "S",
  "S-",
  "มือหน้าบ้าน",
  "มือหน้าบ้าน1",
  "มือหน้าบ้าน2",
  "มือหน้าบ้าน3", // assuming these are the lowest based on provided order
];


// Helper function to get the index of a level in the defined order
const getLevelOrderIndex = (level) => {
  const index = LEVEL_ORDER.indexOf(level);
  return index === -1 ? Infinity : index; // Unknown levels go to the end
};


const ITEMS_PER_PAGE = 30;

const padId = (id, len = 4) => String(id).padStart(len, "0");
const getScoreByResult = (result) => {
  if (result === "A") return "2/0";
  if (result === "B") return "0/2";
  if (result === "DRAW") return "1/1";
  return "";
};

const Match = () => {
  // State
  const [matchDate, setMatchDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [topic, setTopic] = useState(() => {
    return typeof window !== "undefined" ? localStorage.getItem("topic") || "" : "";
  });
  const [isOpen, setIsOpen] = useState(false);
  const [matches, setMatches] = useState([]);
  const [activityTime, setActivityTime] = useState(0);
  const timerRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showMenuId, setShowMenuId] = useState(null);
  const [loggedInEmail, setLoggedInEmail] = useState("");
  const [members, setMembers] = useState([]);
  const [balls] = useState(Array.from({ length: 10 }, (_, i) => (i + 1).toString()));

  // ดึงข้อมูลอีเมลผู้ใช้
  useEffect(() => {
    setLoggedInEmail(localStorage.getItem("loggedInEmail") || "");
  }, []);

  // ดึงสมาชิกที่สถานะเป็น "มา" และจัดเรียงตามระดับฝีมือ
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        if (!loggedInEmail) return;
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", loggedInEmail));
        const userSnap = await getDocs(q);
        let userId = null;
        userSnap.forEach((doc) => {
          userId = doc.id;
        });
        if (!userId) return;

        const membersRef = collection(db, `users/${userId}/Members`);
        const memSnap = await getDocs(membersRef);
        let memberList = []; // Change to let for sorting
        memSnap.forEach((doc) => {
          const data = doc.data();
          if (data.status === "มา") {
            memberList.push({
              memberId: doc.id,
              name: data.name,
              level: data.level,
              score: data.score || 0,
              wins: data.wins || 0,
            });
          }
        });

        // Sort members by LEVEL_ORDER
        memberList.sort((a, b) => {
          return getLevelOrderIndex(a.level) - getLevelOrderIndex(b.level);
        });

        setMembers(memberList);
      } catch (err) {
        console.error("Error fetching members:", err);
        setMembers([]);
      }
    };
    fetchMembers();
  }, [loggedInEmail]);

  const isBrowser = typeof window !== "undefined";

  useEffect(() => {
    if (isBrowser) {
      localStorage.setItem("topic", topic);
    }
  }, [topic]);

  const resetSession = () => {
    setMatches([]);
    setActivityTime(0);
    setIsOpen(false);
    setCurrentPage(1);
    clearInterval(timerRef.current);
    if (isBrowser) {
      localStorage.removeItem("isOpen");
      localStorage.removeItem("matches");
      localStorage.removeItem("activityTime");
    }
  };

  useEffect(() => {
    if (!isBrowser) return;

    const savedIsOpen = localStorage.getItem("isOpen");
    const savedMatches = JSON.parse(localStorage.getItem("matches")) || [];
    const savedActivityTime = parseInt(localStorage.getItem("activityTime")) || 0;

    if (savedIsOpen === "true") {
      setIsOpen(true);
      setMatches(savedMatches);
      setActivityTime(savedActivityTime);
    }

    if (isOpen) {
      timerRef.current = setInterval(() => {
        setActivityTime((prev) => {
          const newTime = prev + 1;
          if (isBrowser) {
            localStorage.setItem("activityTime", newTime.toString());
          }
          return newTime;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isOpen, isBrowser]);

  const handleAddMatch = () => {
    setMatches((prev) => {
      const newMatches = [
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
      ];
      if (isBrowser) {
        localStorage.setItem("matches", JSON.stringify(newMatches));
      }
      return newMatches;
    });
    setShowMenuId(null);
    setTimeout(() => {
      const newTotal = matches.length + 1;
      setCurrentPage(Math.ceil(newTotal / ITEMS_PER_PAGE));
    }, 100);
  };

  const getAvailableMembers = (currentMatch, currentField) => {
    const selectedPlayersInMatch = new Set(
      Object.entries(currentMatch)
        .filter(([key, value]) => ["A1", "A2", "B1", "B2"].includes(key) && key !== currentField && value)
        .map(([, value]) => value)
    );

    // Filter available members based on already selected players in the current match
    // Members are already sorted by level from the fetchMembers effect
    return members.filter(mem => {
      if (mem.name === currentMatch[currentField]) {
        return true; // Keep the currently selected player in the dropdown
      }
      return !selectedPlayersInMatch.has(mem.name);
    });
  };

  const handleChangeMatch = (idx, field, value) => {
    setMatches((prev) => {
      const updated = [...prev];
      updated[idx][field] = value;
      if (field === "result") {
        updated[idx].score = getScoreByResult(value);
      }
      // If balls or result are changed, and status was finished,
      // and now either is empty, revert status to empty.
      if ((field === "balls" || field === "result") && updated[idx].status === "finished") {
        if (!updated[idx].balls || !updated[idx].result) {
          updated[idx].status = "";
        }
      }
      if (isBrowser) {
        localStorage.setItem("matches", JSON.stringify(updated));
      }
      return updated;
    });
  };

  const renderMemberOptions = (currentMatch, fieldName) =>
    getAvailableMembers(currentMatch, fieldName).map((mem) => (
      <option key={mem.memberId} value={mem.name} style={{ color: LEVEL_COLORS[mem.level] || 'black' }}>
        {/*
          NOTE: Styling parts of an <option> tag (like coloring only the level)
          is not consistently supported across all browsers using standard HTML/CSS.
          Most browsers will only apply the style to the entire option text.
          If granular control over text within the option is required,
          a custom dropdown component (e.g., using a React UI library) is needed.
          For now, the entire option text will be colored based on the level.
        */}
        {mem.name} ({mem.level})
      </option>
    ));

  const handleStartGroup = () => {
    if (!topic) {
      Swal.fire("กรุณาระบุหัวเรื่อง", "", "warning");
      return;
    }
    setIsOpen(true);
    setActivityTime(0);
    setMatches([]);
    setCurrentPage(1);

    if (isBrowser) {
      localStorage.setItem("isOpen", "true");
      localStorage.setItem("matches", JSON.stringify([]));
      localStorage.setItem("activityTime", "0");
    }
  };

  const handleEndGroup = async () => {
    const hasUnfinished = matches.some((m) => m.status !== "finished");
    if (hasUnfinished) {
      Swal.fire("มี Match ที่ยังไม่จบการแข่งขัน", "กรุณาเลือก 'จบการแข่งขัน' ให้ครบทุก Match", "warning");
      return;
    }

    const result = await Swal.fire({
      title: "คุณต้องการบันทึกและปิดก๊วนหรือไม่?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
    });

    if (!result.isConfirmed) return;

    if (matches.length === 0) {
      Swal.fire("ไม่มี match ที่จะบันทึก", "", "info");
      resetSession();
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", loggedInEmail));
      const userSnap = await getDocs(q);
      let userId = null;
      userSnap.forEach((doc) => {
        userId = doc.id;
      });
      if (!userId) throw new Error("User not found");

      const membersToUpdate = {};

      matches.forEach(match => {
        const { A1, A2, B1, B2, result } = match;

        let score = 0;
        let wins = 0;

        if (result === "A") {
          score = 2;
          wins = 1;
          [A1, A2].filter(Boolean).forEach(playerName => {
            membersToUpdate[playerName] = membersToUpdate[playerName] || { scoreToAdd: 0, winsToAdd: 0 };
            membersToUpdate[playerName].scoreToAdd += score;
            membersToUpdate[playerName].winsToAdd += wins;
          });
        } else if (result === "B") {
          score = 2;
          wins = 1;
          [B1, B2].filter(Boolean).forEach(playerName => {
            membersToUpdate[playerName] = membersToUpdate[playerName] || { scoreToAdd: 0, winsToAdd: 0 };
            membersToUpdate[playerName].scoreToAdd += score;
            membersToUpdate[playerName].winsToAdd += wins;
          });
        } else if (result === "DRAW") {
          score = 1;
          [A1, A2, B1, B2].filter(Boolean).forEach(playerName => {
            membersToUpdate[playerName] = membersToUpdate[playerName] || { scoreToAdd: 0, winsToAdd: 0 };
            membersToUpdate[playerName].scoreToAdd += score;
          });
        }
      });

      const membersRef = collection(db, `users/${userId}/Members`);
      for (const [memberName, data] of Object.entries(membersToUpdate)) {
        const memberQuery = query(membersRef, where("name", "==", memberName));
        const memberSnap = await getDocs(memberQuery);

        if (!memberSnap.empty) {
          const memberDoc = memberSnap.docs[0];
          const currentData = memberDoc.data();
          const currentScore = currentData.score || 0;
          const currentWins = currentData.wins || 0;

          await updateDoc(doc(db, `users/${userId}/Members`, memberDoc.id), {
            score: currentScore + data.scoreToAdd,
            wins: currentWins + data.winsToAdd,
          });
        }
      }

      const matchesRef = collection(db, `users/${userId}/Matches`);
      await addDoc(matchesRef, {
        topic,
        matchDate,
        totalTime: activityTime,
        matches,
        savedAt: serverTimestamp(),
      });
      Swal.fire("บันทึกสำเร็จ!", "บันทึก Match เข้าประวัติและอัปเดตคะแนนสมาชิกแล้ว", "success");
      resetSession();

    } catch (error) {
      console.error("Error ending group and saving matches:", error);
      Swal.fire("เกิดข้อผิดพลาด", error.message, "error");
    }
  };

  const handleDeleteMatch = (idxToDelete) => {
    Swal.fire({
      title: "คุณแน่ใจหรือไม่?",
      text: "คุณต้องการลบ Match นี้ใช่หรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก"
    }).then((result) => {
      if (result.isConfirmed) {
        setMatches((prevMatches) => {
          const updatedMatches = prevMatches.filter((_, idx) => idx !== idxToDelete);
          const rePaddedMatches = updatedMatches.map((match, index) => ({
            ...match,
            matchId: padId(index + 1, 4)
          }));
          if (isBrowser) {
            localStorage.setItem("matches", JSON.stringify(rePaddedMatches));
          }
          return rePaddedMatches;
        });
        Swal.fire("ลบสำเร็จ!", "Match ถูกลบเรียบร้อยแล้ว", "success");
        setShowMenuId(null);
      }
    });
  };

  const indexOfLast = currentPage * ITEMS_PER_PAGE;
  const indexOfFirst = indexOfLast - ITEMS_PER_PAGE;
  const currentMatches = matches.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(matches.length / ITEMS_PER_PAGE);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s} นาที`;
  };

  return (
    <div
      style={{
        display: "block",
        height: "100vh",
      }}
    >
      <main
        className="main-content"
        style={{
          padding: "28px",
          backgroundColor: "#f7f7f7",
          borderRadius: "12px",
          overflowY: "auto",
        }}
      >
        <h2 style={{ fontSize: "18px", marginBottom: "10px" }}>จัดก๊วน</h2>
        <hr />
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
                fontSize: "14px",
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
                  fontSize: "13px",
                  border: topic ? "1px solid #ccc" : "1px solid #FFD700", // Conditional border
                  borderRadius: "6px",
                  padding: "7px 14px",
                  minWidth: "180px",
                  background: "#fff",
                }}
              />
            </div>
          </div>
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
                backgroundColor: isOpen ? "#f44336" : "#4bf196",
                color: "black",
                padding: "10px 32px",
                fontSize: "14px",
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
                fontSize: "14px",
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
              <span
                style={{ fontWeight: 600, color: "#222", fontSize: "15px" }}
              >
                - {formatTime(activityTime)}
              </span>
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            marginBottom: "10px",
            fontSize: "14px",
            color: "#353535",
            fontWeight: 500,
          }}
        >
          จำนวนเกม : {matches.length}
        </div>

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
              fontSize: "14px",
              minWidth: "1250px",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#323943",
                  color: "white",
                  fontSize: "12px",
                  textAlign: "center",
                  height: "20px",
                }}
              >
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>Match ID</th>
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>court</th>
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>A1</th>
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>A2</th>
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>B1</th>
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>B2</th>
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>ลูกที่ใช้/เกม</th>
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>ผลการแข่งขัน</th>
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>score</th>
                <th style={{ padding: "11px 9px", borderRight: "1px solid #ddd" }}>status</th>
                <th style={{ padding: "11px 9px" }}></th>
              </tr>
            </thead>
            <tbody>
              {currentMatches.length === 0 && (
                <tr>
                  <td colSpan={11}
                    style={{
                      padding: "34px 0",
                      color: "#999",
                      textAlign: "center",
                      fontSize: "12px",
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

                const cannotFinish = !match.balls || !match.result || !match.A1 || !match.A2 || !match.B1 || !match.B2;
                const isDisabled = !isOpen || match.status === "finished";

                return (
                  <tr
                    key={match.matchId}
                    style={{
                      background: globalIdx % 2 === 0 ? "#f8fcfe" : "#f4f7fa",
                      height: "53px",
                      transition: "background 0.25s",
                    }}
                  >
                    <td style={{ textAlign: "center", borderRight: "1px solid #e3e3e3", fontWeight: 500, fontSize: "12px" }}>
                      {match.matchId}
                    </td>
                    <td style={{ textAlign: "center", borderRight: "1px solid #e3e3e3" }}>
                      <select
                        value={match.court}
                        onChange={(e) => handleChangeMatch(globalIdx, "court", e.target.value)}
                        disabled={isDisabled}
                        style={{
                          width: "110px",
                          padding: "7px",
                          borderRadius: "5px",
                          border: match.court ? "1px solid #bbb" : "1px solid #FFD700", // Conditional border
                          fontSize: "12px",
                        }}
                      >
                        <option value="">เลือกสนาม</option>
                        {courts.map((court) => (
                          <option key={court} value={court}>{court}</option>
                        ))}
                      </select>
                    </td>

                    <td style={{ textAlign: "center", borderRight: "1px solid #e3e3e3" }}>
                      <select
                        value={match.A1}
                        onChange={(e) => handleChangeMatch(globalIdx, "A1", e.target.value)}
                        disabled={isDisabled}
                        style={{
                          width: "120px",
                          padding: "7px",
                          borderRadius: "5px",
                          border: match.A1 ? "1px solid #bbb" : "1px solid #FFD700", // Conditional border
                          fontSize: "12px",
                        }}
                      >
                        <option value="">เลือกผู้เล่น</option>
                        {renderMemberOptions(match, "A1")}
                      </select>
                    </td>

                    <td style={{ textAlign: "center", borderRight: "1px solid #e3e3e3" }}>
                      <select
                        value={match.A2}
                        onChange={(e) => handleChangeMatch(globalIdx, "A2", e.target.value)}
                        disabled={isDisabled}
                        style={{
                          width: "120px",
                          padding: "7px",
                          borderRadius: "5px",
                          border: match.A2 ? "1px solid #bbb" : "1px solid #FFD700", // Conditional border
                          fontSize: "12px",
                        }}
                      >
                        <option value="">เลือกผู้เล่น</option>
                        {renderMemberOptions(match, "A2")}
                      </select>
                    </td>

                    <td style={{ textAlign: "center", borderRight: "1px solid #e3e3e3" }}>
                      <select
                        value={match.B1}
                        onChange={(e) => handleChangeMatch(globalIdx, "B1", e.target.value)}
                        disabled={isDisabled}
                        style={{
                          width: "120px",
                          padding: "7px",
                          borderRadius: "5px",
                          border: match.B1 ? "1px solid #bbb" : "1px solid #FFD700", // Conditional border
                          fontSize: "12px",
                        }}
                      >
                        <option value="">เลือกผู้เล่น</option>
                        {renderMemberOptions(match, "B1")}
                      </select>
                    </td>

                    <td style={{ textAlign: "center", borderRight: "1px solid #e3e3e3" }}>
                      <select
                        value={match.B2}
                        onChange={(e) => handleChangeMatch(globalIdx, "B2", e.target.value)}
                        disabled={isDisabled}
                        style={{
                          width: "120px",
                          padding: "7px",
                          borderRadius: "5px",
                          border: match.B2 ? "1px solid #bbb" : "1px solid #FFD700", // Conditional border
                          fontSize: "12px",
                        }}
                      >
                        <option value="">เลือกผู้เล่น</option>
                        {renderMemberOptions(match, "B2")}
                      </select>
                    </td>

                    <td style={{ textAlign: "center", borderRight: "1px solid #e3e3e3" }}>
                      <select
                        value={match.balls}
                        onChange={(e) => handleChangeMatch(globalIdx, "balls", e.target.value)}
                        disabled={isDisabled}
                        style={{
                          width: "90px",
                          padding: "7px",
                          borderRadius: "5px",
                          border: match.balls ? "1px solid #bbb" : "1px solid #FFD700", // Conditional border
                          fontSize: "12px",
                        }}
                      >
                        <option value="">เลือก</option>
                        {balls.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </td>

                    <td style={{ textAlign: "center", borderRight: "1px solid #e3e3e3" }}>
                      <select
                        value={match.result}
                        onChange={(e) => handleChangeMatch(globalIdx, "result", e.target.value)}
                        disabled={isDisabled}
                        style={{
                          width: "110px",
                          padding: "7px",
                          borderRadius: "5px",
                          border: match.result ? "1px solid #bbb" : "1px solid #FFD700", // Conditional border
                          fontSize: "12px",
                        }}
                      >
                        {RESULT_OPTIONS.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={{
                      textAlign: "center",
                      borderRight: "1px solid #e3e3e3",
                      fontWeight: 600,
                      fontSize: "12px",
                      color: "#138c0f",
                    }}>
                      {match.score}
                    </td>

                    <td data-label="status">
                      <select
                        value={match.status}
                        onChange={(e) =>
                          handleChangeMatch(globalIdx, "status", e.target.value)
                        }
                        disabled={!isOpen}
                        className="status-select"
                        style={{
                          background: STATUS_COLORS[match.status] || "#fff8d8",
                          color: match.status === "finished" ? "#fff" : "#666",
                        }}
                      >
                        <option value="">เตรียมพร้อม</option>
                        <option value="playing">กำลังแข่งขัน</option>
                        <option value="finished" disabled={cannotFinish}>
                          จบการแข่งขัน
                        </option>
                      </select>
                    </td>

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
                                showMenuId === match.matchId ? null : match.matchId
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
                                  minWidth: "110px",
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
              width: "25px",
              height: "25px",
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
              fontSize: "15px",
              color: "#222",
              borderBottom: "2px solid #40c2ec",
              fontWeight: 500,
              cursor: isOpen ? "pointer" : "not-allowed",
              userSelect: "none",
              marginRight: "12px",
            }}
            onClick={() => isOpen && handleAddMatch()}
          ></span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            marginBottom: "20px",
          }}
        >
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{
              padding: "6px 12px",
              border: "1px solid #ddd",
              borderRadius: "5px",
              backgroundColor: "#f1f1f1",
              marginRight: "5px",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
            }}
          >
            ย้อนกลับ
          </button>
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index + 1}
              onClick={() => setCurrentPage(index + 1)}
              style={{
                padding: "6px 12px",
                border: "1px solid #ddd",
                borderRadius: "5px",
                backgroundColor:
                  currentPage === index + 1 ? "#6c757d" : "#f1f1f1",
                marginRight: "5px",
                cursor: "pointer",
                color: currentPage === index + 1 ? "white" : "black",
              }}
            >
              {index + 1}
            </button>
          ))}
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages || totalPages === 0}
            style={{
              padding: "6px 12px",
              border: "1px solid #ddd",
              borderRadius: "5px",
              backgroundColor: "#f1f1f1",
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

      <style jsx>{`
        /* Global Styles */
        * {
          box-sizing: border-box;
          font-family: "Kanit", sans-serif;
        }

        .overall-layout {
          display: block;
          width: 100%;
          min-height: 100vh;
        }

        .main-content {
          padding: 28px;
          background-color: #f7f7f7;
          overflow-y: auto;
        }

        .title-separator {
          border: 0;
          border-top: 1px solid #aebdc9;
          margin-bottom: 18px;
        }

        /* Top Control Panel - Refined */
        .top-control-panel {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: 25px; /* Increased gap for clearer separation */
          margin-bottom: 18px;
          margin-top: 20px;
          background-color: #ffffff; /* Add background to the panel itself */
          padding: 20px; /* Add padding */
          border-radius: 12px; /* Rounded corners */
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); /* Subtle shadow */
        }

        .date-topic-group {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap; /* Allow wrapping on smaller screens */
          justify-content: flex-start; /* Ensure left alignment */
        }

        .input-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .control-label {
          font-size: 14px;
          font-weight: 500;
          color: #333;
          white-space: nowrap; /* Prevent label from wrapping */
        }

        .control-input {
          font-size: 13px;
          border: 1px solid #ccc;
          border-radius: 6px;
          padding: 7px 14px;
          background: #fff;
          flex-grow: 1; /* Allow inputs to grow */
          min-width: 140px; /* Adjusted min-width for date input */
        }
        .input-group .control-input {
          min-width: 140px; /* Adjust as needed */
        }

        .action-time-group {
          display: flex;
          align-items: center;
          gap: 14px;
          justify-content: flex-end; /* Ensure right alignment */
          flex-wrap: wrap; /* Allow wrapping on smaller screens */
        }

        .action-button {
          padding: 10px 32px;
          font-size: 14px;
          border-radius: 7px;
          border: none;
          cursor: pointer;
          transition: all 0.22s;
          color: black; /* Ensure text is visible on colored backgrounds */
        }

        .action-button.end-group {
          background-color: #f44336;
          box-shadow: 0 2px 8px rgba(244, 67, 54, 0.07);
        }
        .action-button.start-group {
          background-color: #3fc57b;
          box-shadow: 0 2px 8px rgba(55, 229, 77, 0.09);
        }

        .action-button:hover {
          opacity: 0.9; /* Slight hover effect */
        }

        .activity-time-display {
          background: #fff;
          border: 1px solid #3ec5e0;
          border-radius: 7px;
          padding: 8px 20px;
          font-size: 14px;
          color: #0a6179;
          min-width: 150px; /* Adjusted to be shorter */
          max-width: 280px; /* Added max-width to control overall length */
          display: flex;
          align-items: center;
          gap: 6px;
          flex-grow: 1;
        }

        .activity-time-label {
          color: #2196f3;
          font-weight: 600;
        }

        .activity-time-value {
          font-weight: 600;
          color: #222;
          font-size: 15px;
        }

        .game-count-display {
          display: flex;
          justifyContent: "flex-end",
            alignItems: "center",
            marginBottom: "10px",
            fontSize: "14px",
            color: "#353535",
            fontWeight: 500,
        }

        /* Table Styles */
        .table-responsive-container {
          overflow-x: auto;
          margin-bottom: 16px;
        }

        .match-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          background-color: #fff;
          border-radius: 13px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.07);
          font-size: 14px;
          min-width: 1250px;
        }

        .match-table thead tr {
          background-color: #323943;
          color: white;
          font-size: 12px;
          text-align: center;
          height: 40px;
        }

        .match-table th,
        .match-table td {
          padding: 11px 9px;
          border-bottom: 1px solid #e3e3e3;
          border-right: 1px solid #e3e3e3;
          text-align: center;
          font-size: 12px;
          white-space: nowrap;
        }

        .match-table th:last-child,
        .match-table td:last-child {
          border-right: none;
        }

        .match-table tbody tr {
          height: 53px;
        }
        .match-table tbody tr:last-child td {
          border-bottom: none;
        }

        .table-input {
          width: 100%;
          padding: 7px;
          border-radius: 5px;
          border: 1px solid #bbb;
          font-size: 12px;
          text-align: center;
        }

        .score-display {
          font-weight: 600;
          font-size: 12px;
          color: #138c0f;
        }

        .status-select {
          width: 110px;
          padding: 7px;
          border-radius: 5px;
          border: 1px solid #bbb;
          font-size: 12px;
          font-weight: 600;
          text-align: center;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2C197.935L146.2%2C57.135L5.4%2C197.935L0.2%2C192.735L146.2%2C46.935L292.2%2C192.735L287%2C197.935z%22%2F%3E%3C%2Fsvg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          background-size: 12px;
          cursor: pointer;
        }

        .status-select:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .no-data-message {
          padding: 34px 0;
          color: #999;
          text-align: center;
          font-size: 12px;
        }

        /* Action Menu (3 dots dropdown) */
        .action-menu-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .action-menu-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 5px;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 23px;
          color: #666;
          transition: background-color 0.2s;
        }
        .action-menu-button:hover {
          background-color: #f0f0f0;
        }
        .action-menu-dropdown {
          position: absolute;
          top: 32px;
          right: 0;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 7px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          z-index: 12;
          min-width: 120px;
          display: flex;
          flex-direction: column;
        }
        .action-menu-item {
          padding: 9px 28px 9px 22px;
          font-size: 15px;
          color: #b71c1c;
          background: none;
          border: none;
          text-align: left;
          width: 100%;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .action-menu-item:hover {
          background-color: #fbe9e7;
        }

        /* Add Match Button */
        .add-match-container {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 18px 0 22px 8px;
        }

        .add-match-button {
          width: 25px;
          height: 25px;
          border-radius: 50%;
          background-color: #40c2ec;
          border: none;
          color: #fff;
          font-size: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 7px;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 2px 7px rgba(50, 200, 250, 0.1);
          user-select: none;
        }
        .add-match-button:disabled {
          background-color: #bbb;
          cursor: not-allowed;
          box-shadow: none;
        }
        .add-match-button:hover:not(:disabled) {
          background-color: #29b6f6;
        }

        .add-match-text {
          font-size: 15px;
          color: #222;
          border-bottom: 2px solid #40c2ec;
          font-weight: 500;
          cursor: pointer;
          user-select: none;
          margin-right: 12px;
        }
        .add-match-text:hover {
          opacity: 0.8;
        }
        .add-match-text[disabled] {
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* Pagination */
        .pagination-controls {
          display: flex;
          justify-content: flex-start;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .pagination-button {
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 5px;
          background-color: #f1f1f1;
          margin-right: 5px;
          cursor: pointer;
          transition: background-color 0.2s, border-color 0.2s, color 0.2s;
          color: black;
          font-size: 12px;
        }

        .pagination-button:hover:not(:disabled) {
          background-color: #e0e0e0;
        }

        .pagination-button.active {
          background-color: #6c757d;
          color: white;
          border-color: #6c757d;
        }

        .pagination-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background-color: #f7f7f7;
        }

        /* Responsive Design */
        @media (max-width: 900px) {
          .top-control-panel {
            grid-template-columns: 1fr;
            gap: 15px;
            padding: 15px;
          }
          .date-topic-group,
          .action-time-group {
            flex-direction: column;
            align-items: flex-start;
            width: 100%;
            gap: 10px;
          }
          .input-group,
          .control-input,
          .action-button,
          .activity-time-display {
            width: 100%;
            min-width: unset;
            max-width: unset;
          }
          .activity-time-display {
            justify-content: center;
          }
          .input-group .control-input {
            min-width: unset;
          }
        }

        @media (max-width: 768px) {
          .match-table {
            min-width: unset;
            border-radius: 8px;
          }

          .match-table,
          .match-table thead,
          .match-table tbody,
          .match-table th,
          .match-table td,
          .match-table tr {
            display: block;
          }

          .match-table thead tr {
            position: absolute;
            top: -9999px;
            left: -9999px;
          }

          .match-table tr {
            border: 1px solid #e0e0e0;
            margin-bottom: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
            padding: 10px;
          }

          .match-table td {
            border: none;
            position: relative;
            padding-left: 50%;
            text-align: right;
            border-bottom: 1px solid #f0f0f0;
            min-height: 40px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-top: 5px;
            padding-bottom: 5px;
          }

          .match-table td:last-child {
            border-bottom: none;
            padding-bottom: 0;
            padding-top: 0;
            justify-content: center;
          }

          .match-table td:first-child {
            padding-top: 10px;
          }

          .match-table td:before {
            position: absolute;
            left: 15px;
            width: 45%;
            content: attr(data-label);
            font-weight: bold;
            text-align: left;
            color: #555;
            font-size: 12px;
          }

          /* Ensure selects/inputs within mobile table cells take full width */
          .match-table td select,
          .match-table td input {
            width: 100%;
            max-width: unset; /* Remove any max-width */
            text-align: right; /* Align text to the right for values */
            flex-grow: 1; /* Allow input/select to grow */
          }
          .match-table td select.status-select {
            background-position: right 10px center; /* Adjust dropdown arrow position */
          }

          .match-table td .score-display {
            width: 100%; /* Make score display take full width */
            text-align: right;
          }

          .action-menu-dropdown {
            right: auto; /* Remove right alignment */
            left: 50%; /* Center dropdown horizontally */
            transform: translateX(-50%);
            min-width: 150px;
          }
        }
        @media (max-width: 480px) {
          .match-table td {
            padding-left: 45%; /* Adjust padding for smaller screens */
          }
          .match-table td:before {
            width: 40%;
          }
          .game-count-display {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default Match;

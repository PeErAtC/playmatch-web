// Match.js
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
  updateDoc, // Added updateDoc for existing documents
} from "firebase/firestore";

// List of courts
const courts = [
  "สนาม 1",
  "สนาม 2",
  "สนาม 3",
  "สนาม 4",
  "สนาม 5",
  "สนาม 6",
  "สนาม 7",
  "สนาม 8",
  "สนาม 9",
  "สนาม 10",
];

const RESULT_OPTIONS = [
  { value: "", label: "เลือกผล" },
  { value: "A", label: "ทีม A ชนะ" },
  { value: "B", label: "ทีม B ชนะ" },
  { value: "DRAW", label: "เสมอ" },
];

const STATUS_COLORS = {
  เตรียมพร้อม: "#fff8d8", // Light yellow for "เตรียมพร้อม" (was Defill)
  playing: "#57e497", // Light green for "Playing"
  finished: "#f44336", // Red for "Finished"
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
    return typeof window !== "undefined"
      ? localStorage.getItem("topic") || ""
      : ""; // Check for window object
  });
  const [isOpen, setIsOpen] = useState(false); // Group status
  const [matches, setMatches] = useState([]); // Match list
  const [activityTime, setActivityTime] = useState(0); // Activity time
  const [timer, setTimer] = useState(null);
  const timerRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showMenuId, setShowMenuId] = useState(null);
  const [loggedInEmail, setLoggedInEmail] = useState("");
  const [members, setMembers] = useState([]); // Members
  const [balls] = useState(
    Array.from({ length: 10 }, (_, i) => (i + 1).toString())
  );

  // Fetch user email
  useEffect(() => {
    setLoggedInEmail(localStorage.getItem("loggedInEmail") || "");
  }, []);

  // Fetch members with "มา" status
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
        const memberList = [];
        memSnap.forEach((doc) => {
          const data = doc.data();
          if (data.status === "มา") {
            // Add score and wins fields to initial state
            memberList.push({
              memberId: doc.id,
              name: data.name,
              level: data.level,
              score: data.score || 0, // Default to 0 if not present
              wins: data.wins || 0, // Default to 0 if not present
            });
          }
        });
        setMembers(memberList);
      } catch (err) {
        console.error("Error fetching members:", err);
        setMembers([]);
      }
    };
    fetchMembers();
  }, [loggedInEmail]);

  // Check if code is running in the browser before using localStorage
  const isBrowser = typeof window !== "undefined";

  // Store topic in localStorage
  useEffect(() => {
    if (isBrowser) {
      localStorage.setItem("topic", topic);
    }
  }, [topic, isBrowser]); // Added isBrowser to dependency array

  // Reset session
  const resetSession = () => {
    setMatches([]);
    setActivityTime(0);
    setIsOpen(false);
    setCurrentPage(1);
    clearInterval(timerRef.current);
    setTimer(null);
    if (isBrowser) {
      localStorage.removeItem("isOpen");
      localStorage.removeItem("matches");
      localStorage.removeItem("activityTime"); // Also remove activityTime
    }
  };

  // Start timer
  useEffect(() => {
    if (!isBrowser) return; // Do not run if not in browser

    const savedIsOpen = localStorage.getItem("isOpen");
    const savedMatches = JSON.parse(localStorage.getItem("matches")) || [];
    const savedActivityTime =
      parseInt(localStorage.getItem("activityTime")) || 0;

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
      setTimer(timerRef.current);
    } else {
      clearInterval(timerRef.current);
      setTimer(null);
    }

    return () => clearInterval(timerRef.current);
  }, [isOpen, isBrowser]);

  // Add new row (Match)
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

  // Filter selected members (remove duplicate selection condition)
  const getAvailableMembers = (currentMatch, currentField) => {
    // Create a Set of players already selected in the current match, excluding the player in currentField
    const selectedPlayersInMatch = new Set(
      Object.entries(currentMatch)
        .filter(
          ([key, value]) =>
            ["A1", "A2", "B1", "B2"].includes(key) &&
            key !== currentField &&
            value
        )
        .map(([, value]) => value)
    );

    return members.filter((mem) => {
      // Allow the player selected in the current field to remain in its options
      if (mem.name === currentMatch[currentField]) {
        return true;
      }
      // Do not include players already selected in other fields in the same match
      return !selectedPlayersInMatch.has(mem.name);
    });
  };

  // Edit data in row
  const handleChangeMatch = (idx, field, value) => {
    setMatches((prev) => {
      const updated = [...prev];
      updated[idx][field] = value;
      // When result changes, automatically update score
      if (field === "result") {
        updated[idx].score = getScoreByResult(value);
      }
      // If balls/result changes and status is finished, but data is incomplete, reset status
      if (
        (field === "balls" ||
          field === "result" ||
          ["A1", "A2", "B1", "B2"].includes(field)) && // Also trigger if player changes
        updated[idx].status === "finished"
      ) {
        if (
          !updated[idx].balls ||
          !updated[idx].result ||
          !updated[idx].A1 ||
          !updated[idx].A2 ||
          !updated[idx].B1 ||
          !updated[idx].B2
        ) {
          updated[idx].status = "";
        }
      }
      if (isBrowser) {
        localStorage.setItem("matches", JSON.stringify(updated)); // Store data in localStorage
      }
      return updated;
    });
  };

  // Add condition for member selection
  const renderMemberOptions = (currentMatch, fieldName) =>
    getAvailableMembers(currentMatch, fieldName).map((mem) => (
      <option key={mem.memberId} value={mem.name}>
        {mem.name} ({mem.level})
      </option>
    ));

  // Function to start group
  const handleStartGroup = () => {
    if (!topic) {
      Swal.fire("กรุณาระบุหัวเรื่อง", "", "warning");
      return;
    }
    setIsOpen(true);
    setActivityTime(0);
    setMatches([]);
    setCurrentPage(1);

    // Store status in localStorage
    if (isBrowser) {
      localStorage.setItem("isOpen", "true");
      localStorage.setItem("matches", JSON.stringify([])); // Store match data in localStorage
      localStorage.setItem("activityTime", "0"); // Reset activityTime
    }
  };

  // End group (save)
  const handleEndGroup = async () => {
    // Check if all matches have "finished" status
    const hasUnfinished = matches.some((m) => m.status !== "finished");
    if (hasUnfinished) {
      Swal.fire(
        "มี Match ที่ยังไม่จบการแข่งขัน",
        "กรุณาเลือก 'จบการแข่งขัน' ให้ครบทุก Match",
        "warning"
      );
      return;
    }

    // Confirm before saving
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
      resetSession(); // Call resetSession to clear data and close group
      return;
    }

    // Save to Matches (Firebase)
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", loggedInEmail));
      const userSnap = await getDocs(q);
      let userId = null;
      userSnap.forEach((doc) => {
        userId = doc.id;
      });
      if (!userId) throw new Error("User not found");

      // --- Section for updating member scores and wins ---
      const membersToUpdate = {}; // { memberName: { scoreToAdd, winsToAdd } }

      matches.forEach((match) => {
        const { A1, A2, B1, B2, result } = match;

        let score = 0;
        let wins = 0;

        if (result === "A") {
          score = 2;
          wins = 1;
          [A1, A2].filter(Boolean).forEach((playerName) => {
            membersToUpdate[playerName] = membersToUpdate[playerName] || {
              scoreToAdd: 0,
              winsToAdd: 0,
            };
            membersToUpdate[playerName].scoreToAdd += score;
            membersToUpdate[playerName].winsToAdd += wins;
          });
        } else if (result === "B") {
          score = 2;
          wins = 1;
          [B1, B2].filter(Boolean).forEach((playerName) => {
            membersToUpdate[playerName] = membersToUpdate[playerName] || {
              scoreToAdd: 0,
              winsToAdd: 0,
            };
            membersToUpdate[playerName].scoreToAdd += score;
            membersToUpdate[playerName].winsToAdd += wins;
          });
        } else if (result === "DRAW") {
          score = 1;
          // No wins for draw
          [A1, A2, B1, B2].filter(Boolean).forEach((playerName) => {
            membersToUpdate[playerName] = membersToUpdate[playerName] || {
              scoreToAdd: 0,
              winsToAdd: 0,
            };
            membersToUpdate[playerName].scoreToAdd += score;
          });
        }
      });
      // Create name => level map
      const memberLevelMap = {};
      members.forEach((mem) => {
        memberLevelMap[mem.name] = mem.level;
      });

      // Create new matches with embedded level
      const enrichedMatches = matches.map((match) => ({
        ...match,
        A1Level: memberLevelMap[match.A1] || "",
        A2Level: memberLevelMap[match.A2] || "",
        B1Level: memberLevelMap[match.B1] || "",
        B2Level: memberLevelMap[match.B2] || "",
      }));

      const matchesRef = collection(db, `users/${userId}/Matches`);
      await addDoc(matchesRef, {
        topic,
        matchDate,
        totalTime: activityTime,
        matches: enrichedMatches, // Use matches with level
        savedAt: serverTimestamp(),
      });
      Swal.fire(
        "บันทึกสำเร็จ!",
        "บันทึก Match เข้าประวัติและอัปเดตคะแนนสมาชิกแล้ว",
        "success"
      );
      resetSession();
    } catch (error) {
      console.error("Error ending group and saving matches:", error);
      Swal.fire("เกิดข้อผิดพลาด", error.message, "error");
    }
  };

  // Function to delete Match
  const handleDeleteMatch = (idxToDelete) => {
    Swal.fire({
      title: "คุณแน่ใจหรือไม่?",
      text: "คุณต้องการลบ Match นี้ใช่หรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    }).then((result) => {
      if (result.isConfirmed) {
        setMatches((prevMatches) => {
          const updatedMatches = prevMatches.filter(
            (_, idx) => idx !== idxToDelete
          );
          // Re-pad IDs after deletion to maintain sequential IDs
          const rePaddedMatches = updatedMatches.map((match, index) => ({
            ...match,
            matchId: padId(index + 1, 4),
          }));
          if (isBrowser) {
            localStorage.setItem("matches", JSON.stringify(rePaddedMatches));
          }
          return rePaddedMatches;
        });
        Swal.fire("ลบสำเร็จ!", "Match ถูกลบเรียบร้อยแล้ว", "success");
        setShowMenuId(null); // Close the dropdown menu
      }
    });
  };

  // Pagination
  const indexOfLast = currentPage * ITEMS_PER_PAGE;
  const indexOfFirst = indexOfLast - ITEMS_PER_PAGE;
  const currentMatches = matches.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(matches.length / ITEMS_PER_PAGE);

  // Function to format time
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s} นาที`;
  };

  return (
    <div className="overall-layout">
      <main className="main-content">
        <h2 style={{ fontSize: "18px", marginBottom: "10px" }}>จัดก๊วน</h2>
        <hr className="title-separator" />

        {/* Row 1 - Top control panel (Date/Topic on left, Buttons/Time on right) */}
        <div className="top-control-panel">
          {/* Left: Date and Topic */}
          <div className="date-topic-group">
            <div className="input-group">
              <label className="control-label">วันที่</label>
              <input
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                disabled={isOpen}
                className="control-input"
              />
            </div>
            <div className="input-group">
              {" "}
              {/* Changed to input-group */}
              <label className="control-label">หัวเรื่อง</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="กรุณากรอกหัวเรื่อง"
                disabled={isOpen}
                className="control-input"
              />
            </div>
          </div>
          {/* Right: Action Button and Activity Time */}
          <div className="action-time-group">
            <button
              onClick={isOpen ? handleEndGroup : handleStartGroup}
              className={`action-button ${
                isOpen ? "end-group" : "start-group"
              }`}
            >
              {isOpen ? "ปิดก๊วน" : "เริ่มจัดก๊วน"}
            </button>
            <div className="activity-time-display">
              <span className="activity-time-label">Total Activity Time</span>
              <span className="activity-time-value">
                - {formatTime(activityTime)}
              </span>
            </div>
          </div>
        </div>
        {/* Row 2 - จำนวนเกม */}
        <div className="game-count-display">จำนวนเกม : {matches.length}</div>

        {/* Match Table */}
        <div className="table-responsive-container">
          <table className="match-table">
            <thead>
              <tr>
                <th data-label="Match ID">Match ID</th>
                <th data-label="สนาม">court</th>
                <th data-label="A1">A1</th>
                <th data-label="A2">A2</th>
                <th data-label="B1">B1</th>
                <th data-label="B2">B2</th>
                <th data-label="ลูกที่ใช้/เกม">ลูกที่ใช้/เกม</th>
                <th data-label="ผลการแข่งขัน">ผลการแข่งขัน</th>
                <th data-label="score">score</th>
                <th data-label="status">status</th>
                <th data-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {currentMatches.length === 0 && (
                <tr>
                  <td colSpan={11} className="no-data-message">
                    {isOpen
                      ? "ยังไม่มี Match กรุณาเพิ่มรายการ"
                      : "กรุณากดเริ่มจัดก๊วนก่อน"}
                  </td>
                </tr>
              )}
              {currentMatches.map((match, idx) => {
                const globalIdx = indexOfFirst + idx;

                // Condition to disable "จบการแข่งขัน"
                const cannotFinish =
                  !match.balls ||
                  !match.result ||
                  !match.A1 ||
                  !match.A2 ||
                  !match.B1 ||
                  !match.B2; // Must have all players

                return (
                  <tr
                    key={match.matchId}
                    style={{
                      background: globalIdx % 2 === 0 ? "#f8fcfe" : "#f4f7fa",
                      transition: "background 0.25s",
                    }}
                  >
                    <td data-label="Match ID">{match.matchId}</td>
                    <td data-label="สนาม">
                      <select
                        value={match.court}
                        onChange={(e) =>
                          handleChangeMatch(globalIdx, "court", e.target.value)
                        }
                        disabled={!isOpen}
                        className="table-input"
                      >
                        <option value="">เลือกสนาม</option>
                        {courts.map((court) => (
                          <option key={court} value={court}>
                            {court}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Player A1 */}
                    <td data-label="A1">
                      <select
                        value={match.A1}
                        onChange={(e) =>
                          handleChangeMatch(globalIdx, "A1", e.target.value)
                        }
                        disabled={!isOpen}
                        className="table-input"
                      >
                        <option value="">เลือกผู้เล่น</option>
                        {renderMemberOptions(match, "A1")}
                      </select>
                    </td>

                    {/* Player A2 */}
                    <td data-label="A2">
                      <select
                        value={match.A2}
                        onChange={(e) =>
                          handleChangeMatch(globalIdx, "A2", e.target.value)
                        }
                        disabled={!isOpen}
                        className="table-input"
                      >
                        <option value="">เลือกผู้เล่น</option>
                        {renderMemberOptions(match, "A2")}
                      </select>
                    </td>

                    {/* Player B1 */}
                    <td data-label="B1">
                      <select
                        value={match.B1}
                        onChange={(e) =>
                          handleChangeMatch(globalIdx, "B1", e.target.value)
                        }
                        disabled={!isOpen}
                        className="table-input"
                      >
                        <option value="">เลือกผู้เล่น</option>
                        {renderMemberOptions(match, "B1")}
                      </select>
                    </td>

                    {/* Player B2 */}
                    <td data-label="B2">
                      <select
                        value={match.B2}
                        onChange={(e) =>
                          handleChangeMatch(globalIdx, "B2", e.target.value)
                        }
                        disabled={!isOpen}
                        className="table-input"
                      >
                        <option value="">เลือกผู้เล่น</option>
                        {renderMemberOptions(match, "B2")}
                      </select>
                    </td>

                    {/* Balls used/game */}
                    <td data-label="ลูกที่ใช้/เกม">
                      <select
                        value={match.balls}
                        onChange={(e) =>
                          handleChangeMatch(globalIdx, "balls", e.target.value)
                        }
                        disabled={!isOpen}
                        className="table-input"
                      >
                        <option value="">เลือก</option>
                        {balls.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Match Result */}
                    <td data-label="ผลการแข่งขัน">
                      <select
                        value={match.result}
                        onChange={(e) =>
                          handleChangeMatch(globalIdx, "result", e.target.value)
                        }
                        disabled={!isOpen}
                        className="table-input"
                      >
                        {RESULT_OPTIONS.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Score */}
                    <td data-label="score">
                      <span className="score-display">{match.score}</span>
                    </td>

                    {/* Status */}
                    <td data-label="status">
                      <select
                        value={match.status}
                        onChange={(e) =>
                          handleChangeMatch(globalIdx, "status", e.target.value)
                        }
                        disabled={!isOpen} // Only disable the whole select if group is not open
                        className="status-select"
                        style={{
                          background: STATUS_COLORS[match.status] || "#fff8d8",
                          color: match.status === "finished" ? "#fff" : "#666",
                        }}
                      >
                        <option value="">เตรียมพร้อม</option>{" "}
                        {/* Changed label */}
                        <option value="playing">กำลังแข่งขัน</option>
                        <option value="finished" disabled={cannotFinish}>
                          {" "}
                          {/* Keep this disabled condition for 'finished' */}
                          จบการแข่งขัน
                        </option>
                      </select>
                    </td>

                    {/* 3-dot menu (Dropdown Action) */}
                    <td data-label="Actions">
                      {isOpen && (
                        <div className="action-menu-container">
                          <button
                            tabIndex={-1}
                            onClick={() =>
                              setShowMenuId(
                                showMenuId === match.matchId
                                  ? null
                                  : match.matchId
                              )
                            }
                            className="action-menu-button"
                          >
                            <span>⋮</span>
                          </button>
                          {showMenuId === match.matchId && (
                            <div className="action-menu-dropdown">
                              <button
                                onClick={() => handleDeleteMatch(globalIdx)}
                                className="action-menu-item"
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
        <div className="add-match-container">
          <button
            onClick={handleAddMatch}
            disabled={!isOpen}
            className="add-match-button"
            tabIndex={-1}
          >
            +
          </button>
          <span
            className="add-match-text"
            onClick={() => isOpen && handleAddMatch()}
          >
            เพิ่ม Match
          </span>
        </div>

        {/* Pagination */}
        <div className="pagination-controls">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            ย้อนกลับ
          </button>
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index + 1}
              onClick={() => setCurrentPage(index + 1)}
              className={`pagination-button ${
                currentPage === index + 1 ? "active" : ""
              }`}
            >
              {index + 1}
            </button>
          ))}
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages || totalPages === 0}
            className="pagination-button"
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
          border-radius: 12px;
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
          background-color: #4bf196;
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
          max-width: 260px; /* Added max-width to control overall length */
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
          justify-content: flex-end;
          align-items: center;
          margin-bottom: 10px;
          font-size: 14px;
          color: #353535;
          font-weight: 500;
        }

        /* Table Styles */
        .table-responsive-container {
          overflow-x: auto;
          margin-bottom: 16px;
        }

        .match-table {
          width: 100%;
          border-collapse: separate; /* Changed to separate for border-radius */
          border-spacing: 0;
          background-color: #fff;
          border-radius: 13px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.07);
          font-size: 14px;
          min-width: 1250px; /* Minimum width for desktop */
        }

        .match-table thead tr {
          background-color: #323943;
          color: white;
          font-size: 12px;
          text-align: center;
          height: 40px; /* Adjusted height for header */
        }

        .match-table th,
        .match-table td {
          padding: 11px 9px;
          border-bottom: 1px solid #e3e3e3;
          border-right: 1px solid #e3e3e3;
          text-align: center;
          font-size: 12px;
          white-space: nowrap; /* Prevent content from wrapping in desktop view */
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
          width: 100%; /* Make inputs take full width of cell */
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
          appearance: none; /* Remove default dropdown arrow */
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
          background-color: #fbe9e7; /* light red background on hover */
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
          background-color: #29b6f6; /* Lighter blue on hover */
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
          /* For click handler disabled state */
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* Pagination */
        .pagination-controls {
          display: flex;
          justify-content: flex-start;
          margin-bottom: 20px;
          flex-wrap: wrap; /* Allow pagination buttons to wrap */
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
            grid-template-columns: 1fr; /* Stack elements vertically */
            gap: 15px;
            padding: 15px; /* Adjust padding for smaller screens */
          }
          .date-topic-group,
          .action-time-group {
            flex-direction: column; /* Stack sub-elements vertically */
            align-items: flex-start; /* Align to the left */
            width: 100%; /* Take full width */
            gap: 10px;
          }
          .input-group,
          .control-input,
          .action-button,
          .activity-time-display {
            width: 100%; /* Make them take full width */
            min-width: unset; /* Remove min-width constraints */
            max-width: unset; /* Remove max-width for smaller screens */
          }
          .activity-time-display {
            justify-content: center; /* Center content in activity time display */
          }
          .input-group .control-input {
            min-width: unset; /* Remove min-width for inputs in smaller screens */
          }
        }

        @media (max-width: 768px) {
          .match-table {
            min-width: unset; /* Remove min-width for mobile */
            border-radius: 8px; /* Apply border-radius to each row */
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
            margin-bottom: 15px; /* Spacing between "card-like" rows */
            border-radius: 8px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
            padding: 10px; /* Padding inside the card */
          }

          .match-table td {
            border: none;
            position: relative;
            padding-left: 50%; /* Make space for the data-label */
            text-align: right;
            border-bottom: 1px solid #f0f0f0; /* Separator between fields */
            min-height: 40px; /* Ensure a minimum height for cells */
            display: flex; /* Use flex to align label and value */
            align-items: center;
            justify-content: flex-end; /* Align value to the right */
            padding-top: 5px; /* Adjust padding for better spacing */
            padding-bottom: 5px;
          }

          .match-table td:last-child {
            border-bottom: none; /* No border for the last field */
            padding-bottom: 0;
            padding-top: 0;
            justify-content: center; /* Center the action button */
          }

          .match-table td:first-child {
            padding-top: 10px; /* More padding for the first field */
          }

          .match-table td:before {
            position: absolute;
            left: 15px;
            width: 45%; /* Space for the label */
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
            justify-content: flex-start; /* Align to start on very small screens */
          }
        }
      `}</style>
    </div>
  );
};

export default Match;

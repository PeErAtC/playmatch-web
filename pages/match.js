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
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
];

const RESULT_OPTIONS = [
  { value: "", label: "เลือกผล" },
  { value: "A", label: "ทีม A ชนะ" },
  { value: "B", label: "ทีม B ชนะ" },
  { value: "DRAW", label: "เสมอ" },
];

const STATUS_COLORS = {
  เตรียมพร้อม: "#fff8d8", // Light yellow for "เตรียมพร้อม"
  กำลังแข่งขัน: "#57e497", // Light green for "Playing"
  จบการแข่งขัน: "#f44336", // Red for "Finished"
};

// Colors for member levels
const LEVEL_COLORS = {
  C: "#6a3d9a",
  "P-": "#6a3d9a",
  P: "#6a3d9a",
  "N-": "#1f78b4",
  N: "#1f78b4",
  "BG": "#1f78b4",
  "BG-": "#1f78b4",
  "Rookie": "#1f78b4",
  "S-": "#f44336",
  S: "#f44336",
  "S+": "#f44336",
  "P+": "#6a3d9a",
  มือหน้าบ้าน: "#33a02c",
  มือหน้าบ้าน1: "#33a02c",
  มือหน้าบ้าน2: "#33a02c",
  มือหน้าบ้าน3: "#33a02c",
};

// Define the order of levels
const LEVEL_ORDER_NORTHEAST = [
  "มือหน้าบ้าน", "มือหน้าบ้าน1", "มือหน้าบ้าน2", "มือหน้าบ้าน3", "BG", "S-", "S", "N-", "N", "P-", "P", "C",
];

const LEVEL_ORDER_CENTRAL = [
  "Rookie", "BG-", "BG", "N-", "N", "S", "S+", "P-", "P", "P+", "C",
];

// Helper function to get the index of a level in the defined order
const getLevelOrderIndex = (level, currentLevelOrder) => {
  const index = currentLevelOrder.indexOf(level);
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
    return typeof window !== "undefined"
      ? localStorage.getItem("topic") || ""
      : "";
  });
  const [isOpen, setIsOpen] = useState(false);
  const [matches, setMatches] = useState([]);
  const [activityTime, setActivityTime] = useState(0);
  const timerRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showMenuId, setShowMenuId] = useState(null);
  const [loggedInEmail, setLoggedInEmail] = useState("");
  const [members, setMembers] = useState([]);
  const [balls] = useState(
    Array.from({ length: 11 }, (_, i) => i.toString())
  );
  const [matchCount, setMatchCount] = useState(0);
  const [totalBallsInSession, setTotalBallsInSession] = useState(0);
  const isBrowser = typeof window !== "undefined";
  const [ballPrice, setBallPrice] = useState(() =>
    isBrowser ? parseFloat(localStorage.getItem("ballPrice")) || 0 : 0
  );
  const [courtFee, setCourtFee] = useState(() =>
    isBrowser ? parseFloat(localStorage.getItem("courtFee")) || 0 : 0
  );
  const [courtFeePerGame, setCourtFeePerGame] = useState(() =>
    isBrowser ? parseFloat(localStorage.getItem("courtFeePerGame")) || 0 : 0
  );
  const [fixedCourtFeePerPerson, setFixedCourtFeePerPerson] = useState(() =>
    isBrowser
      ? parseFloat(localStorage.getItem("fixedCourtFeePerPerson")) || 0
      : 0
  );
  const [organizeFee, setOrganizeFee] = useState(() =>
    isBrowser ? parseFloat(localStorage.getItem("organizeFee")) || 0 : 0
  );
  const [selectedMemberForEarlyExit, setSelectedMemberForEarlyExit] =
    useState("");
  const [earlyExitCalculationResult, setEarlyExitCalculationResult] =
    useState(null);
  const [isCostSettingsOpen, setIsCostSettingsOpen] = useState(false);
  const contentRef = useRef(null);
  const [selectedRegion, setSelectedRegion] = useState(() =>
    isBrowser ? localStorage.getItem("selectedRegion") || "ภาคอีสาน" : "ภาคอีสาน"
  );
  // New states for coupons
  const [coupons, setCoupons] = useState([]);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  const currentLevelOrder =
    selectedRegion === "ภาคกลาง" ? LEVEL_ORDER_CENTRAL : LEVEL_ORDER_NORTHEAST;

  useEffect(() => {
    setLoggedInEmail(localStorage.getItem("loggedInEmail") || "");
  }, []);

  const fetchMembers = async (isNewSessionStart = false) => {
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
      let memberList = [];
      memSnap.forEach((doc) => {
        const data = doc.data();
        if (data.status === "มา") {
          memberList.push({
            memberId: doc.id,
            name: data.name,
            level: data.level,
            score: data.score || 0,
            wins: data.wins || 0,
            gamesPlayed: 0,
            ballsUsed: 0,
            totalGamesPlayed: data.totalGamesPlayed || 0,
            totalBallsUsed: data.totalBallsUsed || 0,
          });
        }
      });

      memberList.sort((a, b) => {
        return getLevelOrderIndex(a.level, currentLevelOrder) - getLevelOrderIndex(b.level, currentLevelOrder);
      });

      if (!isNewSessionStart && isBrowser && localStorage.getItem("isOpen") === "true") {
        const savedMatches = JSON.parse(localStorage.getItem("matches")) || [];
        const tempGamesPlayed = {};
        const tempBallsUsed = {};
        savedMatches.forEach((match) => {
          if (match.status === "จบการแข่งขัน") {
            const playersInMatch = [match.A1, match.A2, match.B1, match.B2]
              .filter(Boolean);
            const ballsInGame = parseInt(match.balls) || 0;
            playersInMatch.forEach((playerName) => {
              tempGamesPlayed[playerName] = (tempGamesPlayed[playerName] || 0) + 1;
              tempBallsUsed[playerName] = (tempBallsUsed[playerName] || 0) + ballsInGame;
            });
          }
        });

        memberList = memberList.map(member => ({
          ...member,
          gamesPlayed: tempGamesPlayed[member.name] || 0,
          ballsUsed: tempBallsUsed[member.name] || 0,
        }));
      }

      setMembers(memberList);
    } catch (err) {
      console.error("Error fetching members:", err);
      setMembers([]);
    }
  };

  // New useEffect to fetch coupons
  useEffect(() => {
    const fetchCoupons = async () => {
      if (!loggedInEmail) return;
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", loggedInEmail));
        const userSnap = await getDocs(q);
        let userId = null;
        userSnap.forEach((doc) => {
          userId = doc.id;
        });

        if (!userId) return;

        const couponsRef = collection(db, `users/${userId}/Coupons`);
        const couponSnap = await getDocs(
          query(couponsRef, where("status", "==", "ACTIVE"))
        );
        const couponList = [];
        couponSnap.forEach((doc) => {
          couponList.push({ id: doc.id, ...doc.data() });
        });
        setCoupons(couponList);
      } catch (error) {
        console.error("Error fetching coupons:", error);
        setCoupons([]);
      }
    };
    fetchCoupons();
  }, [loggedInEmail]);


  useEffect(() => {
    fetchMembers(false);
  }, [loggedInEmail, isBrowser, selectedRegion]);

  useEffect(() => {
    if (isBrowser) {
      localStorage.setItem("ballPrice", ballPrice.toString());
      localStorage.setItem("courtFee", courtFee.toString());
      localStorage.setItem("courtFeePerGame", courtFeePerGame.toString());
      localStorage.setItem(
        "fixedCourtFeePerPerson",
        fixedCourtFeePerPerson.toString()
      );
      localStorage.setItem("organizeFee", organizeFee.toString());
    }
  }, [
    ballPrice,
    courtFee,
    courtFeePerGame,
    fixedCourtFeePerPerson,
    organizeFee,
    isBrowser,
  ]);

  useEffect(() => {
    if (isBrowser) {
      localStorage.setItem("topic", topic);
    }
  }, [topic, isBrowser]);

  useEffect(() => {
    if (isBrowser) {
      localStorage.setItem("selectedRegion", selectedRegion);
    }
  }, [selectedRegion, isBrowser]);

  useEffect(() => {
    const total = matches.reduce((sum, match) => {
      if (match.status === "จบการแข่งขัน") {
        return sum + (parseInt(match.balls, 10) || 0);
      }
      return sum;
    }, 0);
    setTotalBallsInSession(total);
  }, [matches]);

  const resetSession = () => {
    setMatches([]);
    setActivityTime(0);
    setIsOpen(false);
    setCurrentPage(1);
    clearInterval(timerRef.current);
    setMatchCount(0);
    setTotalBallsInSession(0);
    setMembers((prevMembers) =>
      prevMembers.map((member) => ({ ...member, gamesPlayed: 0, ballsUsed: 0 }))
    );
    setEarlyExitCalculationResult(null);
    setSelectedMemberForEarlyExit("");
    setSelectedCoupon(null); // Reset selected coupon
    setDiscountAmount(0); // Reset discount amount

    if (isBrowser) {
      localStorage.removeItem("isOpen");
      localStorage.removeItem("matches");
      localStorage.removeItem("activityTime");
      localStorage.removeItem("sessionMembers");
    }
  };

  useEffect(() => {
    if (!isBrowser) return;
    const savedIsOpen = localStorage.getItem("isOpen") === "true";
    const savedMatches = JSON.parse(localStorage.getItem("matches")) || [];
    const savedActivityTime = parseInt(localStorage.getItem("activityTime")) || 0;
    setIsOpen(savedIsOpen);
    setMatches(savedMatches);
    setActivityTime(savedActivityTime);
    setMatchCount(savedMatches.length);
  }, [isBrowser]);

  useEffect(() => {
    if (!isBrowser) return;
    clearInterval(timerRef.current);
    if (isOpen) {
      timerRef.current = setInterval(() => {
        setActivityTime((prev) => {
          const newTime = prev + 1;
          localStorage.setItem("activityTime", newTime.toString());
          return newTime;
        });
      }, 1000);
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
      setMatchCount(newMatches.length);
      return newMatches;
    });
    setShowMenuId(null);
    setTimeout(() => {
      const newTotal = matches.length + 1;
      setCurrentPage(Math.ceil(newTotal / ITEMS_PER_PAGE));
    }, 100);
  };

  const getAvailableMembers = (currentMatch, currentField) => {
    const selectedPlayersInCurrentMatch = new Set(
      Object.entries(currentMatch)
        .filter(
          ([key, value]) =>
            ["A1", "A2", "B1", "B2"].includes(key) &&
            key !== currentField &&
            value
        )
        .map(([, value]) => value)
    );

    const playersInPlayingMatches = new Set();
    matches.forEach((match) => {
      if (
        match.matchId !== currentMatch.matchId &&
        match.status === "กำลังแข่งขัน"
      ) {
        [match.A1, match.A2, match.B1, match.B2]
          .filter(Boolean)
          .forEach((playerName) => {
            playersInPlayingMatches.add(playerName);
          });
      }
    });

    return members.filter((mem) => {
      const isCurrentlySelectedInThisField =
        mem.name === currentMatch[currentField];
      const isSelectedInOtherFieldInCurrentMatch =
        selectedPlayersInCurrentMatch.has(mem.name);
      const isPlayingInAnotherMatch = playersInPlayingMatches.has(mem.name);
      return (
        isCurrentlySelectedInThisField ||
        (!isSelectedInOtherFieldInCurrentMatch && !isPlayingInAnotherMatch)
      );
    });
  };

  const getAvailableCourts = (currentMatch) => {
    const courtsInPlayingMatches = new Set();
    matches.forEach((match) => {
      if (
        match.matchId !== currentMatch.matchId &&
        match.status === "กำลังแข่งขัน" &&
        match.court
      ) {
        courtsInPlayingMatches.add(match.court);
      }
    });
    return courts.filter((court) => {
      const isCurrentlySelectedInThisField = court === currentMatch.court;
      const isPlayingInAnotherMatch = courtsInPlayingMatches.has(court);
      return isCurrentlySelectedInThisField || !isPlayingInAnotherMatch;
    });
  };

  const showIncompleteForPlayingToast = () => {
    Swal.fire({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true,
      icon: 'error',
      title: 'กรุณากรอก ผู้เล่น, สนาม, และลูก ก่อนเริ่มการแข่งขัน',
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      }
    });
  };

  const showIncompleteForFinishingToast = () => {
    Swal.fire({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true,
      icon: 'error',
      title: 'กรุณากรอกข้อมูลทั้งหมด รวมถึงผลการแข่งขันให้ครบถ้วน',
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      }
    });
  };

  const handleChangeMatch = (idx, field, value) => {
    setMatches((prev) => {
      const updated = [...prev];
      const matchBeingUpdated = { ...updated[idx] };

      // --- REVISED VALIDATION LOGIC ---
      if (field === "status" && value === "กำลังแข่งขัน") {
        const { A1, A2, B1, B2, court, balls } = matchBeingUpdated;
        if (!A1 || !A2 || !B1 || !B2 || !court || !balls) {
          showIncompleteForPlayingToast();
          return prev;
        }
      }

      if (field === "status" && value === "จบการแข่งขัน") {
        const { A1, A2, B1, B2, court, balls, result } = matchBeingUpdated;
        if (!A1 || !A2 || !B1 || !B2 || !court || !balls || !result) {
          showIncompleteForFinishingToast();
          return prev;
        }
      }

      if (field === "result" && value) {
        const { A1, A2, B1, B2, court, balls } = matchBeingUpdated;
        if (!A1 || !A2 || !B1 || !B2 || !court || !balls) {
          showIncompleteForFinishingToast();
          return prev;
        }
      }
      // --- END OF REVISED VALIDATION LOGIC ---

      const oldStatus = matchBeingUpdated.status;
      const oldBalls = parseInt(matchBeingUpdated.balls) || 0;

      matchBeingUpdated[field] = value;
      let newStatus = matchBeingUpdated.status;

      if (field === "result") {
        matchBeingUpdated.score = getScoreByResult(value);
        if (value && newStatus !== "จบการแข่งขัน") {
          newStatus = "จบการแข่งขัน";
          matchBeingUpdated.status = newStatus;
        } else if (!value && newStatus === "จบการแข่งขัน") {
          newStatus = "";
          matchBeingUpdated.status = newStatus;
        }
      }

      const playersInCurrentMatch = [
        matchBeingUpdated.A1,
        matchBeingUpdated.A2,
        matchBeingUpdated.B1,
        matchBeingUpdated.B2,
      ].filter(Boolean);
      const ballsInCurrentGame = parseInt(matchBeingUpdated.balls) || 0;

      if (newStatus === "จบการแข่งขัน" && oldStatus !== "จบการแข่งขัน") {
        setMembers((prevMembers) =>
          prevMembers.map((member) =>
            playersInCurrentMatch.includes(member.name)
              ? {
                  ...member,
                  gamesPlayed: member.gamesPlayed + 1,
                  ballsUsed: member.ballsUsed + ballsInCurrentGame,
                }
              : member
          )
        );
      }
      else if (newStatus !== "จบการแข่งขัน" && oldStatus === "จบการแข่งขัน") {
        setMembers((prevMembers) =>
          prevMembers.map((member) =>
            playersInCurrentMatch.includes(member.name)
              ? {
                  ...member,
                  gamesPlayed: Math.max(0, member.gamesPlayed - 1),
                  ballsUsed: Math.max(0, member.ballsUsed - ballsInCurrentGame),
                }
              : member
          )
        );
      }
      else if (
        field === "balls" &&
        matchBeingUpdated.status === "จบการแข่งขัน" &&
        matchBeingUpdated.result
      ) {
        const newBalls = parseInt(value) || 0;
        setMembers((prevMembers) =>
          prevMembers.map((member) => {
            if (playersInCurrentMatch.includes(member.name)) {
              return {
                ...member,
                ballsUsed: member.ballsUsed - oldBalls + newBalls,
              };
            }
            return member;
          })
        );
      }

      if (
        oldStatus === "จบการแข่งขัน" &&
        newStatus === "จบการแข่งขัน" &&
        (!matchBeingUpdated.balls || !matchBeingUpdated.result)
      ) {
        matchBeingUpdated.status = "";
        setMembers((prevMembers) =>
          prevMembers.map((member) =>
            playersInCurrentMatch.includes(member.name)
              ? {
                  ...member,
                  gamesPlayed: Math.max(0, member.gamesPlayed - 1),
                  ballsUsed: Math.max(0, member.ballsUsed - ballsInCurrentGame),
                }
              : member
          )
        );
      }

      updated[idx] = matchBeingUpdated;

      if (isBrowser) {
        localStorage.setItem("matches", JSON.stringify(updated));
      }
      return updated;
    });
  };

  const renderMemberOptions = (currentMatch, fieldName) =>
    getAvailableMembers(currentMatch, fieldName).map((mem) => (
      <option
        key={mem.memberId}
        value={mem.name}
        style={{ color: LEVEL_COLORS[mem.level] || "black" }}
      >
        {mem.name} ({mem.level}) (เกม: {mem.gamesPlayed}) (ลูก:{" "}
        { (mem.ballsUsed || 0)})
      </option>
    ));

  const handleStartGroup = async () => {
    if (!topic) {
      Swal.fire({
        title: "กรุณาระบุหัวเรื่อง",
        text: "เพิ่มหัวเรื่องเพื่อค้นหาใน History",
        icon:"warning"});
      return;
    }
    if (isBrowser) {
      localStorage.setItem("isOpen", "true");
      localStorage.setItem("matches", JSON.stringify([]));
      localStorage.setItem("activityTime", "0");
      localStorage.removeItem("sessionMembers");
      localStorage.setItem("topic", topic);
    }

    setIsOpen(true);
    setActivityTime(0);
    setMatches([]);
    setCurrentPage(1);
    setEarlyExitCalculationResult(null);
    setSelectedMemberForEarlyExit("");
    setMatchCount(0);
    setSelectedCoupon(null); // Reset selected coupon on new session
    setDiscountAmount(0); // Reset discount amount on new session

    await fetchMembers(true);
  };

  const handleEndGroup = async () => {
    if (matches.length === 0) {
        Swal.fire(
            "ไม่มี Match ให้บันทึก",
            "กรุณาเพิ่ม Match ก่อนปิดก๊วน หรือกด 'ยกเลิก' เพื่อกลับไปจัดการ Match",
            "info"
        );
        resetSession();
        return;
    }

    const hasUnfinished = matches.some((m) => m.status !== "จบการแข่งขัน");
    if (hasUnfinished) {
      Swal.fire(
        "มี Match ที่ยังไม่จบการแข่งขัน",
        "กรุณาเลือก 'จบการแข่งขัน' ให้ครบทุก Match",
        "warning"
      );
      return;
    }

    Swal.fire({
      title: "ปิดก๊วนและบันทึก?",
      text: "คุณแน่ใจหรือไม่ว่าต้องการปิดก๊วนและบันทึกข้อมูลทั้งหมด?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "ใช่, ปิดก๊วนและบันทิก",
      cancelButtonText: "ยกเลิก",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          if (!loggedInEmail) {
            throw new Error("User not logged in.");
          }
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", loggedInEmail));
          const userSnap = await getDocs(q);
          let userId = null;
          userSnap.forEach((doc) => {
            userId = doc.id;
          });
          if (!userId) {
            throw new Error("User data not found. Please log in again.");
          }

          const memberUpdates = {};
          const memberSessionStats = {};

          matches.forEach((match) => {
            if (match.status === "จบการแข่งขัน") {
              const playersInMatch = [
                match.A1,
                match.A2,
                match.B1,
                match.B2,
              ].filter(Boolean);
              const ballsInGame = parseInt(match.balls) || 0;

              if (match.result === "A") {
                playersInMatch.forEach((player) => {
                  if (!memberUpdates[player])
                    memberUpdates[player] = { scoreToAdd: 0, winsToAdd: 0 };
                  if ([match.A1, match.A2].includes(player)) {
                    memberUpdates[player].winsToAdd += 1;
                    memberUpdates[player].scoreToAdd += 2;
                  }
                });
              } else if (match.result === "B") {
                playersInMatch.forEach((player) => {
                  if (!memberUpdates[player])
                    memberUpdates[player] = { scoreToAdd: 0, winsToAdd: 0 };
                  if ([match.B1, match.B2].includes(player)) {
                    memberUpdates[player].winsToAdd += 1;
                    memberUpdates[player].scoreToAdd += 2;
                  }
                });
              } else if (match.result === "DRAW") {
                playersInMatch.forEach((player) => {
                  if (!memberUpdates[player])
                    memberUpdates[player] = { scoreToAdd: 0, winsToAdd: 0 };
                  memberUpdates[player].scoreToAdd += 1;
                });
              }
              playersInMatch.forEach(player => {
                if (!memberSessionStats[player]) {
                  memberSessionStats[player] = { games: 0, balls: 0 };
                }
                memberSessionStats[player].games += 1;
                memberSessionStats[player].balls += ballsInGame;
              });
            }
          });

          for (const playerName of members.map(m => m.name)) {
            const data = memberUpdates[playerName] || { scoreToAdd: 0, winsToAdd: 0 };
            const sessionStats = memberSessionStats[playerName] || { games: 0, balls: 0 };

            const memberQuery = query(
              collection(db, `users/${userId}/Members`),
              where("name", "==", playerName)
            );
            const memberSnap = await getDocs(memberQuery);
            if (!memberSnap.empty) {
              const memberDoc = memberSnap.docs[0];
              const currentData = memberDoc.data();
              const currentScore = currentData.score || 0;
              const currentWins = currentData.wins || 0;
              const currentTotalGamesPlayed = currentData.totalGamesPlayed || 0;
              const currentTotalBallsUsed = currentData.totalBallsUsed || 0;

              await updateDoc(
                doc(db, `users/${userId}/Members`, memberDoc.id),
                {
                  score: currentScore + data.scoreToAdd,
                  wins: currentWins + data.winsToAdd,
                  totalGamesPlayed: currentTotalGamesPlayed + sessionStats.games,
                  totalBallsUsed: currentTotalBallsUsed + sessionStats.balls,
                }
              );
            }
          }

          // อัปเดตสถานะคูปองเป็น 'USED' เมื่อปิดก๊วนสำเร็จ
          if (selectedCoupon && loggedInEmail) {
            try {
              const couponDocRef = doc(db, `users/${userId}/Coupons`, selectedCoupon.id);
              await updateDoc(couponDocRef, {
                status: 'USED',
                redeemedAt: serverTimestamp(),
                redeemedBy: loggedInEmail,
              });
              console.log(`Coupon ${selectedCoupon.id} updated to USED.`);
            } catch (couponError) {
              console.error("Error updating coupon status:", couponError);
              // ในกรณีที่อัปเดตคูปองไม่สำเร็จ จะแค่ทำการ log ข้อผิดพลาดไว้ แต่ยังคงบันทึกข้อมูล Match ต่อไป
            }
          }

          // --- START: เพิ่มข้อมูลสถานะการชำระเงินของสมาชิกและระดับมือ ---
          const sessionPlayerSummaries = [];
          const totalMembersInSession = members.filter(m => m.gamesPlayed > 0 || m.ballsUsed > 0).length;

          for (const member of members) {
              if (member.gamesPlayed > 0 || member.ballsUsed > 0) { // เฉพาะสมาชิกที่เข้าร่วม
                  const parsedBallPrice = parseFloat(ballPrice) || 0;
                  const parsedCourtFee = parseFloat(courtFee) || 0;
                  const parsedCourtFeePerGame = parseFloat(courtFeePerGame) || 0;
                  const parsedFixedCourtFeePerPerson = parseFloat(fixedCourtFeePerPerson) || 0;
                  const parsedOrganizeFee = parseFloat(organizeFee) || 0;

                  const gamesPlayed = member.gamesPlayed;
                  const ballsUsed = member.ballsUsed || 0;

                  const ballCost = ballsUsed * parsedBallPrice;

                  let courtCostPerPerson = 0;
                  if (parsedFixedCourtFeePerPerson > 0) {
                      courtCostPerPerson = parsedFixedCourtFeePerPerson;
                  } else if (parsedCourtFeePerGame > 0) {
                      courtCostPerPerson = gamesPlayed * parsedCourtFeePerGame;
                  } else if (parsedCourtFee > 0) {
                      courtCostPerPerson = totalMembersInSession > 0 ? parsedCourtFee / totalMembersInSession : 0;
                  }

                  const calculatedCost = Math.ceil(ballCost) + Math.ceil(courtCostPerPerson) + Math.ceil(parsedOrganizeFee);

                  sessionPlayerSummaries.push({
                      name: member.name,
                      level: member.level, // ระดับมือของสมาชิก ณ ตอนปิดก๊วน
                      gamesPlayed: gamesPlayed,
                      ballsUsed: ballsUsed,
                      calculatedCost: calculatedCost,
                      paymentStatus: "Pending", // สถานะเริ่มต้นเป็น "Pending"
                  });
              }
          }
          // --- END: เพิ่มข้อมูลสถานะการชำระเงินของสมาชิกและระดับมือ ---

          const matchesRef = collection(db, `users/${userId}/Matches`);
          await addDoc(matchesRef, {
            topic,
            matchDate,
            totalTime: activityTime,
            matches,
            ballPrice,
            courtFee,
            courtFeePerGame,
            fixedCourtFeePerPerson,
            organizeFee,
            savedAt: serverTimestamp(),
            // --- START: เพิ่มข้อมูลใหม่ใน Matches collection ---
            sessionPlayerSummaries: sessionPlayerSummaries, // ข้อมูลสรุปสมาชิกแต่ละคน
            couponUsedId: selectedCoupon ? selectedCoupon.id : null, // ID คูปองที่ใช้
            sessionDiscountAmount: discountAmount, // จำนวนส่วนลดที่ใช้ในเซสชัน
            // --- END: เพิ่มข้อมูลใหม่ใน Matches collection ---
          });
          Swal.fire(
            "บันทึกสำเร็จ!",
            "บันทึก Match เข้าประวัติและอัปเดตคะแนนสมาชิกแล้ว",
            "success"
          );
          resetSession();
          fetchMembers(false);
        } catch (error) {
          console.error("Error ending group and saving matches:", error);
          Swal.fire("เกิดข้อผิดพลาด", error.message, "error");
        }
      }
    });
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
      cancelButtonText: "ยกเลิก",
    }).then((result) => {
      if (result.isConfirmed) {
        setMatches((prevMatches) => {
          const updatedMatches = prevMatches.filter(
            (_, idx) => idx !== idxToDelete
          );
          const reIndexedMatches = updatedMatches.map((match, idx) => ({
            ...match,
            matchId: padId(idx + 1, 4),
          }));

          const tempGamesPlayed = {};
          const tempBallsUsed = {};
          reIndexedMatches.forEach((match) => {
            if (match.status === "จบการแข่งขัน") {
              const playersInMatch = [
                match.A1,
                match.A2,
                match.B1,
                match.B2,
              ].filter(Boolean);
              const ballsInGame = parseInt(match.balls) || 0;
              playersInMatch.forEach((playerName) => {
                tempGamesPlayed[playerName] =
                  (tempGamesPlayed[playerName] || 0) + 1;
                tempBallsUsed[playerName] =
                  (tempBallsUsed[playerName] || 0) + ballsInGame;
              });
            }
          });
          setMembers((prevMembers) =>
            prevMembers.map((member) => ({
              ...member,
              gamesPlayed: tempGamesPlayed[member.name] || 0,
              ballsUsed: tempBallsUsed[member.name] || 0,
            }))
          );

          if (isBrowser) {
            localStorage.setItem("matches", JSON.stringify(reIndexedMatches));
          }
          setMatchCount(reIndexedMatches.length);
          Swal.fire("ลบสำเร็จ!", "Match ถูกลบเรียบร้อยแล้ว", "success");
          return reIndexedMatches;
        });
      }
    });
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    const pad = (num) => String(num).padStart(2, "0");
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
    } else {
      return `${pad(minutes)}:${pad(remainingSeconds)}`;
    }
  };

  const totalPages = Math.ceil(matches.length / ITEMS_PER_PAGE);
  const paginatedMatches = matches.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const calculatePlayerSummary = () => {
    if (!selectedMemberForEarlyExit) {
      Swal.fire("กรุณาเลือกสมาชิกที่ต้องการคำนวณ", "", "warning");
      return;
    }

    if (
        (courtFee === 0 && courtFeePerGame === 0 && fixedCourtFeePerPerson === 0) &&
        ballPrice === 0 &&
        organizeFee === 0 &&
        discountAmount === 0 // Check discountAmount
      ) {
        Swal.fire(
          "ข้อมูลไม่ครบถ้วน",
          "กรุณากรอกข้อมูลค่าลูก, ค่าจัดก๊วน หรือค่าสนาม หรือเลือกส่วนลด ให้ครบถ้วนก่อนคำนวณ",
          "warning"
        );
        return;
      }

    const player = members.find((mem) => mem.name === selectedMemberForEarlyExit);
    if (!player) {
      Swal.fire("ไม่พบข้อมูลสมาชิก", "กรุณาลองใหม่อีกครั้ง", "error");
      return;
    }

    const parsedBallPrice = parseFloat(ballPrice) || 0;
    const parsedCourtFee = parseFloat(courtFee) || 0;
    const parsedCourtFeePerGame = parseFloat(courtFeePerGame) || 0;
    const parsedFixedCourtFeePerPerson =
      parseFloat(fixedCourtFeePerPerson) || 0;
    const parsedOrganizeFee = parseFloat(organizeFee) || 0;

    const gamesPlayed = player.gamesPlayed;
    const ballsUsed = player.ballsUsed || 0;
    const ballCost = ballsUsed * parsedBallPrice;
    let courtCostPerPerson = 0;

    if (parsedFixedCourtFeePerPerson > 0) {
      courtCostPerPerson = parsedFixedCourtFeePerPerson;
    } else if (parsedCourtFeePerGame > 0) {
      courtCostPerPerson = gamesPlayed * parsedCourtFeePerGame;
    } else if (parsedCourtFee > 0) {
      const totalMembersInSession = members.filter(m => m.gamesPlayed > 0).length;
      courtCostPerPerson =
        totalMembersInSession > 0 ? parsedCourtFee / totalMembersInSession : 0;
    }

    let estimatedTotalCost =
      Math.ceil(ballCost) + Math.ceil(courtCostPerPerson) + Math.ceil(parsedOrganizeFee);

    // Apply discount if a coupon is selected
    if (discountAmount > 0) {
        estimatedTotalCost = Math.max(0, estimatedTotalCost - discountAmount);
    }


    const result = {
      name: player.name,
      gamesPlayed: gamesPlayed,
      ballsUsed: ballsUsed,
      estimatedTotalCost: estimatedTotalCost,
      ballCost: Math.ceil(ballCost),
      courtCost: Math.ceil(courtCostPerPerson),
      organizeFee: Math.ceil(parsedOrganizeFee),
      discount: discountAmount, // Include discount in result
    };

    setEarlyExitCalculationResult(result);

    Swal.fire({
      title: `ยอดรวมสำหรับ ${result.name}`,
      html: `
        <div style="text-align: left; font-size: 16px; color: #333;">
          <p style="margin-bottom: 8px;"><strong>จำนวนเกมที่เล่น:</strong> <span style="float: right;">${result.gamesPlayed} เกม</span></p>
          <p style="margin-bottom: 8px;"><strong>จำนวนลูกขนไก่ที่ใช้:</strong> <span style="float: right;">${result.ballsUsed} ลูก</span></p>
          <hr style="margin: 15px 0; border-top: 1px dashed #ccc;">
          <p style="margin-bottom: 8px;"><strong>ค่าลูก:</strong> <span style="float: right; color: #007bff;">${result.ballCost} บาท</span></p>
          <p style="margin-bottom: 8px;"><strong>ค่าสนาม:</strong> <span style="float: right; color: #007bff;">${result.courtCost} บาท</span></p>
          <p style="margin-bottom: 8px;"><strong>ค่าจัดก๊วน:</strong> <span style="float: right; color: #007bff;">${result.organizeFee} บาท</span></p>
          ${result.discount > 0 ? `<p style="margin-bottom: 8px;"><strong>ส่วนลด (คูปอง):</strong> <span style="float: right; color: #dc3545;">-${result.discount} บาท</span></p><hr style="margin: 15px 0; border-top: 2px solid #5cb85c;">` : '<hr style="margin: 15px 0; border-top: 2px solid #5cb85c;">'}
          <h3 style="color: #d9534f; margin-top: 15px; text-align: center;"><strong>ยอดรวมสุทธิ:</strong> <span style="float: right; font-size: 20px;">${result.estimatedTotalCost} บาท</span></h3>
        </div>
      `,
      icon: "info",
      confirmButtonText: "บันทึกการชำระ", // Changed from "รับทราบ" to "บันทึกการชำระ"
    }).then(async (swalResult) => {
        if (swalResult.isConfirmed) {
            // Update coupon status if a coupon was used
            if (selectedCoupon && loggedInEmail) {
                try {
                    const usersRef = collection(db, "users");
                    const q = query(usersRef, where("email", "==", loggedInEmail));
                    const userSnap = await getDocs(q);
                    let userId = null;
                    userSnap.forEach((doc) => {
                        userId = doc.id;
                    });
                    if (userId) {
                        await updateDoc(doc(db, `users/${userId}/Coupons`, selectedCoupon.id), {
                            status: "USED",
                            usedAt: serverTimestamp(),
                            usedBy: loggedInEmail,
                            usedForMatchDate: matchDate, // Optional: record when it was used
                            usedForTopic: topic, // Optional: record for which topic
                        });
                        Swal.fire("บันทึกการชำระและใช้คูปองเรียบร้อย!", "", "success");
                        setSelectedCoupon(null); // Clear selected coupon
                        setDiscountAmount(0); // Clear discount amount
                        // Re-fetch coupons to update the list (remove the used one)
                        const couponsRef = collection(db, `users/${userId}/Coupons`);
                        const couponSnap = await getDocs(
                          query(couponsRef, where("status", "==", "ACTIVE"))
                        );
                        const couponList = [];
                        couponSnap.forEach((doc) => {
                          couponList.push({ id: doc.id, ...doc.data() });
                        });
                        setCoupons(couponList);
                    }
                } catch (error) {
                    console.error("Error updating coupon status:", error);
                    Swal.fire("เกิดข้อผิดพลาดในการอัปเดตสถานะคูปอง", error.message, "error");
                }
            }
        }
    });
  };

  const handleClearEarlyExitSelection = () => {
    setSelectedMemberForEarlyExit("");
    setEarlyExitCalculationResult(null);
    setSelectedCoupon(null); // Clear selected coupon
    setDiscountAmount(0); // Clear discount amount
  };

  const isCourtFeeActive = courtFee > 0;
  const isCourtFeePerGameActive = courtFeePerGame > 0;
  const isFixedCourtFeePerPersonActive = fixedCourtFeePerPerson > 0;

  const handleCourtFeeChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setCourtFee(value);
    if (value > 0) {
      setCourtFeePerGame(0);
      setFixedCourtFeePerPerson(0);
    }
  };

  const handleCourtFeePerGameChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setCourtFeePerGame(value);
    if (value > 0) {
      setCourtFee(0);
      setFixedCourtFeePerPerson(0);
    }
  };

  const handleFixedCourtFeePerPersonChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setFixedCourtFeePerPerson(value);
    if (value > 0) {
      setCourtFee(0);
      setCourtFeePerGame(0);
    }
  };

  const handleClearCostSettings = () => {
    Swal.fire({
      title: "คุณแน่ใจหรือไม่?",
      text: "การดำเนินการนี้จะล้างค่าใช้จ่ายทั้งหมด (ค่าลูก, ค่าสนาม, ค่าจัดก๊วน) เป็น 0",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ใช่, ล้างค่าทั้งหมด",
      cancelButtonText: "ยกเลิก",
    }).then((result) => {
      if (result.isConfirmed) {
        setBallPrice(0);
        setCourtFee(0);
        setCourtFeePerGame(0);
        setFixedCourtFeePerPerson(0);
        setOrganizeFee(0);
        setSelectedCoupon(null); // Also clear coupon selection
        setDiscountAmount(0); // Also clear discount amount
        Swal.fire("ล้างค่าสำเร็จ!", "ค่าใช้จ่ายทั้งหมดถูกรีเซ็ตเป็น 0 แล้ว", "success");
      }
    });
  };

  return (
    <div style={{ padding: "15px", backgroundColor: "#f0f2f5", minHeight: "100vh", fontFamily: "'Kanit', sans-serif", }} >
      <div className="card control-panel-card">
        <div className="control-panel">
          <div className="date-topic-group">
            <div className="input-group">
              <label htmlFor="matchDate" className="control-label"></label>
              <input type="date" id="matchDate" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="control-input" style={{ minWidth: "160px" }} disabled={isOpen} />
            </div>
            <div className="input-group">
              <label htmlFor="topic" className="control-label"></label>
              <input type="text" id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="เช่น ก๊วนตอนเย็น, ก๊วนพิเศษ" className="control-input" style={{ border: topic ? "1px solid #ccc" : "1px solid #f44336", }} disabled={isOpen} />
            </div>
          </div>
          <div className="action-time-group">
            <button onClick={isOpen ? handleEndGroup : handleStartGroup} className={`action-button ${isOpen ? "end-group" : "start-group"}`} >
              {isOpen ? "ปิดก๊วน" : "เริ่มจัดก๊วน"}
            </button>
            <div className="activity-time-display">
              <span style={{ color: "#2196f3", fontWeight: 600 }}>
                {" "}
                Total Activity Time{" "}
              </span>
              <span style={{ fontWeight: 600, color: "#222", fontSize: "15px" }} >
                {" "}
                - {formatTime(activityTime)}{" "}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="card financial-summary-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", borderBottom: isCostSettingsOpen ? "1px solid #eee" : "none", paddingBottom: isCostSettingsOpen ? "10px" : "0", cursor: "pointer", }} onClick={() => setIsCostSettingsOpen(!isCostSettingsOpen)} >
          <h3 style={{ fontSize: "15px", margin: 0, color: "#222", }} >
            ตั้งค่าค่าใช้จ่าย (จะบันทึกอัตโนมัติ)
          </h3>
          <span style={{ fontSize: "20px", fontWeight: "bold", transition: "transform 0.3s ease", transform: isCostSettingsOpen ? "rotate(45deg)" : "rotate(0deg)", color: "#222", }} >
            +
          </span>
        </div>
        <div ref={contentRef} style={{ maxHeight: isCostSettingsOpen ? contentRef.current ? contentRef.current.scrollHeight + "px" : "500px" : "0", overflow: "hidden", transition: "max-height 0.4s ease-in-out", }} >
          <div>
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "25px", }} >
              <div className="cost-input-group">
                <h4 className="cost-input-heading">
                  ค่าสนาม: (เลือกเพียง 1 รูปแบบ)
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", }} >
                  <div>
                    <label className="cost-label">ค่าสนามรวม (บาท):</label>
                    <input type="number" value={courtFee === 0 ? "" : courtFee} onChange={handleCourtFeeChange} placeholder="ค่าสนามรวม" className="cost-input" style={{ backgroundColor: isCourtFeePerGameActive || isFixedCourtFeePerPersonActive ? "#e9e9e9" : "#fff", }} disabled={isCourtFeePerGameActive || isFixedCourtFeePerPersonActive} />
                  </div>
                  <div>
                    <label className="cost-label">ค่าสนามต่อเกม (บาท/เกม):</label>
                    <input type="number" value={courtFeePerGame === 0 ? "" : courtFeePerGame} onChange={handleCourtFeePerGameChange} placeholder="ค่าสนามต่อเกม" className="cost-input" style={{ backgroundColor: isCourtFeeActive || isFixedCourtFeePerPersonActive ? "#e9e9e9" : "#fff", }} disabled={isCourtFeeActive || isFixedCourtFeePerPersonActive} />
                  </div>
                  <div>
                    <label className="cost-label">ค่าสนามคงที่ต่อคน (บาท/คน):</label>
                    <input type="number" value={fixedCourtFeePerPerson === 0 ? "" : fixedCourtFeePerPerson} onChange={handleFixedCourtFeePerPersonChange} placeholder="ค่าสนามคงที่ต่อคน" className="cost-input" style={{ backgroundColor: isCourtFeeActive || isCourtFeePerGameActive ? "#e9e9e9" : "#fff", }} disabled={isCourtFeeActive || isCourtFeePerGameActive} />
                  </div>
                </div>
              </div>
              <div className="cost-input-group">
                <h4 className="cost-input-heading">ค่าลูกและค่าจัดก๊วน:</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", }} >
                  <div>
                    <label className="cost-label">ราคาลูกละ (บาท):</label>
                    <input type="number" value={ballPrice === 0 ? "" : ballPrice} onChange={(e) => setBallPrice(parseFloat(e.target.value) || 0)} placeholder="ราคาลูกละ" className="cost-input" style={{ width: "120px" }} />
                  </div>
                  <div>
                    <label className="cost-label">ค่าจัดก๊วน (บาท/คน):</label>
                    <input type="number" value={organizeFee === 0 ? "" : organizeFee} onChange={(e) => setOrganizeFee(parseFloat(e.target.value) || 0)} placeholder="ค่าจัดก๊วน" className="cost-input" style={{ width: "120px" }} />
                  </div>
                </div>
                {/* New Coupon Dropdown */}
                <div style={{ marginTop: "20px" }}>
                    <label className="cost-label">เลือกส่วนลด:</label>
                    <select
                        value={selectedCoupon ? selectedCoupon.id : ""}
                        onChange={(e) => {
                            const couponId = e.target.value;
                            const coupon = coupons.find(c => c.id === couponId);
                            setSelectedCoupon(coupon || null);
                            setDiscountAmount(coupon ? parseFloat(coupon.amount) : 0);
                        }}
                        className="cost-input"
                        style={{ width: "100%", maxWidth: "200px" }}
                    >
                        <option value="">ไม่มีส่วนลด</option>
                        {coupons.map(coupon => (
                            <option key={coupon.id} value={coupon.id}>
                                {coupon.reason} ({coupon.amount} บาท)
                            </option>
                        ))}
                    </select>
                </div>
                <button onClick={handleClearCostSettings} className="action-button clear-settings-button" style={{ marginTop: "20px", backgroundColor: "#dc3545" }} >
                  ล้างการตั้งค่าทั้งหมด
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="early-exit-section">
          <h4 className="early-exit-heading">คำนวณยอดสำหรับสมาชิกที่ต้องการออกก่อน</h4>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <select value={selectedMemberForEarlyExit} onChange={(e) => setSelectedMemberForEarlyExit(e.target.value)} className="early-exit-select" >
              <option value="">เลือกสมาชิก</option>
              {members.map((mem) => (
                <option key={mem.memberId} value={mem.name}>
                  {mem.name} (เกม: {mem.gamesPlayed}, ลูก: {mem.ballsUsed})
                </option>
              ))}
            </select>
            <button onClick={calculatePlayerSummary} className="action-button calculate-button" disabled={!isOpen || !selectedMemberForEarlyExit} >
              คำนวณยอด
            </button>
            <button onClick={handleClearEarlyExitSelection} className="action-button clear-button" disabled={!selectedMemberForEarlyExit && !earlyExitCalculationResult} >
              ล้างตัวเลือก
            </button>
          </div>
        </div>
      </div>
      <div className="card match-table-card">
        <div style={{ textAlign: "left", marginBottom: "15px", fontSize: "14px", fontWeight: "600", color: "#333", padding: "10px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }} >
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>จำนวน Match ทั้งหมด: {matchCount}</span>
            <span style={{color: '#007bff'}}>จำนวนลูกทั้งหมดที่ใช้: {totalBallsInSession}</span>
          </div>
          <div className="region-selector-inline">
            <label htmlFor="region-select" style={{ margin: 0, fontSize: "14px", color: "#555" }} >
              เลือกภาค:
            </label>
            <select id="region-select" value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} style={{ minWidth: "100px", padding: "6px 8px", border: "1px solid #ccc", borderRadius: "5px", fontSize: "13px", width: "auto", marginLeft: "8px", }} disabled={isOpen} >
              <option value="ภาคอีสาน">ภาคอีสาน</option>
              <option value="ภาคกลาง">ภาคกลาง</option>
            </select>
          </div>
        </div>
        {matches.length === 0 && isOpen && (
          <div className="no-matches-message">
            <p>ยังไม่มี Match เพิ่ม "Add New Match" เพื่อเริ่มต้น</p>
          </div>
        )}
        {matches.length > 0 && (
          <div className="match-table-wrapper">
            <table className="match-table">
              <thead>
                <tr>
                  <th>Match ID</th>
                  <th>สนาม</th>
                  <th>ทีม A (ผู้เล่น 1)</th>
                  <th>ทีม A (ผู้เล่น 2)</th>
                  <th>ทีม B (ผู้เล่น 1)</th>
                  <th>ทีม B (ผู้เล่น 2)</th>
                  <th>ลูก</th>
                  <th>ผล</th>
                  <th>คะแนน</th>
                  <th>สถานะ</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMatches.map((match, idx) => (
                  <tr key={match.matchId}>
                    <td data-label="Match ID">{match.matchId}</td>
                    <td data-label="สนาม">
                      <select value={match.court} onChange={(e) => handleChangeMatch( (currentPage - 1) * ITEMS_PER_PAGE + idx, "court", e.target.value ) } style={{ border: match.court ? "1px solid #ddd" : "1px solid #f44336" }} disabled={match.status === "จบการแข่งขัน"} >
                        <option value="">เลือกสนาม</option>
                        {getAvailableCourts(match).map((court) => (
                          <option key={court} value={court}>
                            {court}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td data-label="ทีม A (ผู้เล่น 1)">
                      <select value={match.A1} onChange={(e) => handleChangeMatch( (currentPage - 1) * ITEMS_PER_PAGE + idx, "A1", e.target.value ) } style={{ border: match.A1 ? "1px solid #ddd" : "1px solid #f44336" }} disabled={match.status === "จบการแข่งขัน"} >
                        <option value="">เลือกผู้เล่น A1</option>
                        {renderMemberOptions(match, "A1")}
                      </select>
                    </td>
                    <td data-label="ทีม A (ผู้เล่น 2)">
                      <select value={match.A2} onChange={(e) => handleChangeMatch( (currentPage - 1) * ITEMS_PER_PAGE + idx, "A2", e.target.value ) } style={{ border: match.A2 ? "1px solid #ddd" : "1px solid #f44336" }} disabled={match.status === "จบการแข่งขัน"} >
                        <option value="">เลือกผู้เล่น A2</option>
                        {renderMemberOptions(match, "A2")}
                      </select>
                    </td>
                    <td data-label="ทีม B (ผู้เล่น 1)">
                      <select value={match.B1} onChange={(e) => handleChangeMatch( (currentPage - 1) * ITEMS_PER_PAGE + idx, "B1", e.target.value ) } style={{ border: match.B1 ? "1px solid #ddd" : "1px solid #f44336" }} disabled={match.status === "จบการแข่งขัน"} >
                        <option value="">เลือกผู้เล่น B1</option>
                        {renderMemberOptions(match, "B1")}
                      </select>
                    </td>
                    <td data-label="ทีม B (ผู้เล่น 2)">
                      <select value={match.B2} onChange={(e) => handleChangeMatch( (currentPage - 1) * ITEMS_PER_PAGE + idx, "B2", e.target.value ) } style={{ border: match.B2 ? "1px solid #ddd" : "1px solid #f44336" }} disabled={match.status === "จบการแข่งขัน"} >
                        <option value="">เลือกผู้เล่น B2</option>
                        {renderMemberOptions(match, "B2")}
                      </select>
                    </td>
                    <td data-label="ลูก">
                      <select value={match.balls} onChange={(e) => handleChangeMatch( (currentPage - 1) * ITEMS_PER_PAGE + idx, "balls", e.target.value ) } style={{ border: match.balls ? "1px solid #ddd" : "1px solid #f44336" }} disabled={match.status === "จบการแข่งขัน"} >
                        <option value="">ลูก</option>
                        {balls.map((ballCount) => (
                          <option key={ballCount} value={ballCount}>
                            {ballCount}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td data-label="ผล">
                      <select value={match.result} onChange={(e) => handleChangeMatch( (currentPage - 1) * ITEMS_PER_PAGE + idx, "result", e.target.value ) } style={{ border: match.result ? "1px solid #ddd" : "1px solid #f44336" }} disabled={match.status === "จบการแข่งขัน"} >
                        {RESULT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td data-label="คะแนน">
                      <div className="score-display">
                        {match.score || "-"}
                      </div>
                    </td>
                    <td data-label="สถานะ">
                      <select value={match.status} onChange={(e) => handleChangeMatch( (currentPage - 1) * ITEMS_PER_PAGE + idx, "status", e.target.value ) } className="status-select" style={{ backgroundColor: STATUS_COLORS[match.status] || "#f0f2f5", border: match.status ? "1px solid #ddd" : "1px solid #f44336", }} >
                        <option value="">เลือกสถานะ</option>
                        <option value="เตรียมพร้อม">เตรียมพร้อม</option>
                        <option value="กำลังแข่งขัน">กำลังแข่งขัน</option>
                        <option value="จบการแข่งขัน">จบการแข่งขัน</option>
                      </select>
                    </td>
                    <td data-label="Action">
                      <div className="action-menu-container">
                        <button className="action-menu-button" onClick={() => setShowMenuId(showMenuId === match.matchId ? null : match.matchId)} >
                          ...
                        </button>
                        {showMenuId === match.matchId && (
                          <div className="action-menu-dropdown">
                            <button onClick={() => handleDeleteMatch((currentPage - 1) * ITEMS_PER_PAGE + idx)} >
                              ลบ
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="pagination-controls">
                <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} >
                  ก่อนหน้า
                </button>
                <span>
                  หน้า {currentPage} จาก {totalPages}
                </span>
                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} >
                  ถัดไป
                </button>
              </div>
            )}
          </div>
        )}
        {isOpen && (
          <button onClick={handleAddMatch} className="add-match-button" >
            Add New Match
          </button>
        )}
      </div>
       <style jsx>{`
        .card {
          background-color: #ffffff;
          padding: 25px;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          margin-bottom: 30px;
        }
        .control-panel {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: 20px;
          justify-content: space-between;
          align-items: flex-start;
        }
        .financial-summary-card {
          padding-top: 15px;
        }
        .cost-input-group {
          padding: 15px;
          border: 1px solid #d0d0d0;
          border-radius: 5px;
          background-color: #f9f9f9;
          flex: 1;
          min-width: 280px;
        }
        .cost-input-heading {
          font-size: 16px;
          margin-bottom: 10px;
          color: #333;
        }
        .cost-label {
          display: block;
          margin-bottom: 5px;
          font-size: 14px;
          color: #555;
        }
        .cost-input {
          padding: 8px 12px;
          border-radius: 5px;
          border: 1px solid #ccc;
          font-size: 15px;
          width: 140px;
          box-sizing: border-box;
        }
        .early-exit-section {
          margin-top: 20px;
          padding: 15px;
          border: 1px solid #d0d0d0;
          border-radius: 5px;
          background-color: #e9f7ef;
        }
        .early-exit-heading {
          font-size: 16px;
          margin-bottom: 10px;
          color: #28a745;
        }
        .early-exit-select {
          width: 15%;
          padding: 10px 15px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
          min-width: 200px;
          background-color: #fff;
          cursor: pointer;
        }
        .action-button.calculate-button {
            background-color: #28a745;
            color: white;
            padding: 8px 15px;
            border-radius: 5px;
            border: none;
            cursor: pointer;
            font-size: 15px;
            opacity: var(--button-opacity, 1);
            pointer-events: var(--button-pointer-events, auto);
        }
        .action-button.clear-button {
            background-color: #6c757d;
            color: white;
            padding: 8px 15px;
            border-radius: 5px;
            border: none;
            cursor: pointer;
            font-size: 15px;
            opacity: var(--button-opacity, 1);
            pointer-events: var(--button-pointer-events, auto);
        }
        .action-button.clear-settings-button {
            background-color: #dc3545;
            color: white;
            padding: 8px 15px;
            border-radius: 5px;
            border: none;
            cursor: pointer;
            font-size: 15px;
            opacity: var(--button-opacity, 1);
            pointer-events: var(--button-pointer-events, auto);
            width: fit-content;
        }
        .action-button.clear-settings-button:hover {
            background-color: #c82333;
        }
        .match-table-card {
          overflow-x: auto;
        }
        .match-table-wrapper {
            overflow-x: auto;
        }
        .match-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        .match-table th,
        .match-table td {
          border: 1px solid #eee;
          padding: 12px 10px;
          text-align: center;
          font-size: 12px;
          white-space: nowrap;
        }
        .match-table th {
          background-color: #323943;
          font-weight: 600;
          color: #fff;
        }
        .match-table tbody tr:nth-child(even) {
          background-color: #f8f8f8;
        }
        .match-table tbody tr:hover {
          background-color: #eaf6ff;
        }
        .match-table td select,
        .match-table td input {
          width: 100%;
          padding: 8px 5px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 12px;
          box-sizing: border-box;
        }
        .no-matches-message {
          text-align: center;
          padding: 20px;
          color: #777;
          background-color: #fdfdfd;
          border-radius: 8px;
          margin-bottom: 20px;
          border: 1px dashed #e0e0e0;
        }
        .date-topic-group,
        .action-time-group {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          align-items: center;
        }
        .input-group {
          display: flex;
          flex-direction: column;
        }
        .control-label {
          font-weight: 600;
          margin-bottom: 8px;
          color: #333;
          font-size: 15px;
        }
        .control-input {
          padding: 10px 15px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-size: 14px;
          width: 200px;
          max-width: 100%;
          box-sizing: border-box;
        }
        .action-button {
          padding: 10px 25px;
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.3s ease;
          min-width: 120px;
        }
        .action-button.start-group {
          background-color: #4bf196;
        }
        .action-button.start-group:hover {
          background-color: #3fc57b;
        }
        .action-button.end-group {
          background-color: #f44336;
        }
        .action-button.end-group:hover {
          background-color: #d32f2f;
        }
        .activity-time-display {
          background-color: #e3f2fd;
          padding: 10px 15px;
          border-radius: 8px;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .match-table td select:disabled {
          background-color: #f0f0f0;
          cursor: not-allowed;
        }
        .match-table td select.status-select {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%20viewBox%3D%220%200%20292.4%20292.4%22%3E%3Cpath%20fill%3D%22%23000000%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E');
          background-repeat: no-repeat;
          background-position: right 10px top 50%;
          background-size: 12px auto;
          padding-right: 30px;
        }
        .score-display {
          display: block;
          padding: 8px 5px;
          background-color: #f5f5f5;
          border-radius: 4px;
          min-width: 40px;
        }
        .action-menu {
          position: relative;
          display: inline-block;
        }
        .action-menu-button {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 5px;
          line-height: 1;
        }
        .action-menu-dropdown {
          position: absolute;
          background-color: #f9f9f9;
          min-width: 100px;
          box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
          z-index: 1;
          border-radius: 5px;
          right: 0;
          top: 100%;
          margin-top: 5px;
        }
        .action-menu-dropdown button {
          color: black;
          padding: 8px 12px;
          text-decoration: none;
          display: block;
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          font-size: 14px;
        }
        .action-menu-dropdown button:hover {
          background-color: #f1f1f1;
        }
        .pagination-controls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 15px;
          margin-top: 20px;
          padding: 10px;
          background-color: #f2f2f2;
          border-radius: 8px;
        }
        .pagination-controls button {
          background-color: #007bff;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 12px;
          transition: background-color 0.3s ease;
        }
        .pagination-controls button:hover:not(:disabled) {
          background-color: #0056b3;
        }
        .pagination-controls button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        .pagination-controls span {
          font-size: 15px;
          color: #333;
          font-weight: 500;
        }
        .add-match-button {
          display: block;
          width: fit-content;
          margin: 25px auto 0 auto;
          padding: 12px 30px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }
        .add-match-button:hover:not(:disabled) {
          background-color: #0056b3;
        }
        .add-match-button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        @media (max-width: 768px) {
          .control-panel {
            flex-direction: column;
            align-items: stretch;
          }
          .date-topic-group,
          .action-time-group {
            flex-direction: column;
            align-items: stretch;
          }
          .control-input {
            width: 100%;
          }
          .action-button {
            width: 100%;
          }
          .match-table thead {
            display: none;
          }
          .match-table,
          .match-table tbody,
          .match-table tr,
          .match-table td {
            display: block;
            width: 100%;
          }
          .match-table tr {
            margin-bottom: 15px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background-color: #fff;
            padding: 10px;
          }
          .match-table td {
            text-align: right;
            padding-left: 50%;
            position: relative;
            border: none;
          }
          .match-table td:before {
            content: attr(data-label);
            position: absolute;
            left: 10px;
            width: 45%;
            text-align: left;
            font-weight: bold;
            color: #555;
            font-size: 13px;
          }
          .match-table td:nth-of-type(1):before { content: "Match ID"; }
          .match-table td:nth-of-type(2):before { content: "สนาม"; }
          .match-table td:nth-of-type(3):before { content: "ทีม A (ผู้เล่น 1)"; }
          .match-table td:nth-of-type(4):before { content: "ทีม A (ผู้เล่น 2)"; }
          .match-table td:nth-of-type(5):before { content: "ทีม B (ผู้เล่น 1)"; }
          .match-table td:nth-of-type(6):before { content: "ทีม B (ผู้เล่น 2)"; }
          .match-table td:nth-of-type(7):before { content: "ลูก"; }
          .match-table td:nth-of-type(8):before { content: "ผล"; }
          .match-table td:nth-of-type(9):before { content: "คะแนน"; }
          .match-table td:nth-of-type(10):before { content: "สถานะ"; }
          .match-table td:nth-of-type(11):before { content: "Action"; }
          .match-table td select,
          .match-table td input {
            width: 100%;
            max-width: unset;
            text-align: right;
            flex-grow: 1;
          }
          .match-table td select.status-select {
            background-position: right 10px center;
          }
          .match-table td .score-display {
            width: 100%;
            text-align: right;
          }
          .action-menu-dropdown {
            right: auto;
            left: 50%;
            transform: translateX(-50%);
            min-width: 150px;
          }
          .region-selector-inline {
            width: 100%;
            justify-content: flex-start;
          }
          .cost-input-group {
            min-width: unset;
            width: 100%;
          }
          .cost-input {
            width: 100%;
          }
          .early-exit-select {
            width: 100%;
            min-width: unset;
          }
        }
        @media (max-width: 480px) {
          .match-table td {
            padding-left: 45%;
          }
          .match-table td:before {
            width: 40%;
          }
          /* Styles for the new discount selection dropdown */

      .cost-input-group .cost-label {
          display: block; /* Make label take full width */
          margin-bottom: 5px; /* Space between label and select box */
          font-size: 14px;
          color: #555;
          font-weight: 500;
      }

      .cost-input-group select.cost-input {
          width: 100%; /* Ensure it takes full width of its container */
          max-width: 250px; /* Limit max width for better appearance */
          padding: 10px 15px; /* Ample padding for better touch/click area */
          border: 1px solid #ccc;
          border-radius: 8px; /* Slightly rounded corners */
          background-color: #fff;
          font-size: 16px;
          color: #333;
          -webkit-appearance: none; /* Remove default browser styling for dropdown */
          -moz-appearance: none;
          appearance: none;
          background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.9a14.7%2014.7%200%200%200-20.8%200L146.2%20190.9%2026.2%2069.9a14.7%2014.7%200%200%200-20.8%200%2014.7%2014.7%200%200%000%2020.8l120.8%20120.8c5.7%205.7%2014.7%205.7%2020.4%200L287%2090.7a14.7%2014.7%200%200%200%200-20.8z%22%2F%3E%3C%2Fsvg%3E'); /* Custom arrow for dropdown */
          background-repeat: no-repeat;
          background-position: right 15px center;
          background-size: 12px;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05); /* Subtle shadow for depth */
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
      }

      .cost-input-group select.cost-input:focus {
          border-color: #007bff; /* Highlight on focus */
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25); /* Focus ring */
          outline: none;
      }

      .cost-input-group select.cost-input option {
          padding: 10px; /* Padding for options (may not work in all browsers) */
          background-color: #fff;
          color: #333;
      }
        }
      `}</style>
    </div>
  );
};

export default Match;

// pages/MatchDetails.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { db } from "../lib/firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) {
      return dateString;
    }
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${d.getFullYear()}`;
  } catch (e) {
    console.error("Invalid date string:", dateString, e);
    return dateString;
  }
};

const MatchDetails = () => {
  const router = useRouter();
  const { matchId } = router.query;
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courtFee, setCourtFee] = useState("");
  const [courtFeePerGame, setCourtFeePerGame] = useState("");
  const [fixedCourtFeePerPerson, setFixedCourtFeePerPerson] = useState("");
  const [isRankingSaved, setIsRankingSaved] = useState(false);
  const [ballPrice, setBallPrice] = useState("");
  const [organizeFee, setOrganizeFee] = useState("");
  const [memberCalculations, setMemberCalculations] = useState({});
  const [loggedInEmail, setLoggedInEmail] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [isDataCalculated, setIsDataCalculated] = useState(false);
  const [isSavingRanking, setIsSavingRanking] = useState(false);
  const [memberPaidStatus, setMemberPaidStatus] = useState({});
  const [isPaymentHistorySaved, setIsPaymentHistorySaved] = useState(false);

  const tableRef = useRef(null);
  const gameDetailsTableRef = useRef(null);

  // Define a Toast mixin for subtle notifications
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });

  // Fetch loggedInEmail and Admin email on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setLoggedInEmail(localStorage.getItem("loggedInEmail") || "");
      const fetchAdminEmail = async () => {
        try {
          const configDocRef = doc(db, "configurations", "appConfig");
          const configSnap = await getDoc(configDocRef);
          if (configSnap.exists() && configSnap.data().adminEmail) {
            setAdminEmail(configSnap.data().adminEmail);
          } else {
            console.warn(
              "Admin email not found in configurations/appConfig. Defaulting to a fixed admin email."
            );
            setAdminEmail("admin@example.com"); // Fallback if not found in config
          }
        } catch (err) {
          console.error("Error fetching admin email:", err);
          setAdminEmail("admin@example.com"); // Fallback in case of error
        }
      };
      fetchAdminEmail();
    }
  }, []);

  const isAdmin = loggedInEmail && adminEmail && loggedInEmail === adminEmail;

  // Function to calculate expenses and player statistics
  const calculateMemberStats = useCallback(
    (
      currentMatchData,
      currentCourtFee,
      currentBallPrice,
      currentOrganizeFee,
      currentCourtFeePerGame,
      currentFixedCourtFeePerPerson
    ) => {
      if (
        !currentMatchData ||
        !currentBallPrice ||
        !currentOrganizeFee ||
        !currentMatchData.matches ||
        currentMatchData.matches.length === 0
      ) {
        setMemberCalculations({});
        setIsDataCalculated(false);
        return;
      }

      const parsedCourtFee = parseFloat(currentCourtFee);
      const parsedCourtFeePerGame = parseFloat(currentCourtFeePerGame);
      const parsedFixedCourtFeePerPerson = parseFloat(
        currentFixedCourtFeePerPerson
      );
      const parsedBallPrice = parseFloat(currentBallPrice);
      const parsedOrganizeFee = parseFloat(currentOrganizeFee);

      const isCourtFeeValid = !isNaN(parsedCourtFee) && parsedCourtFee >= 0;
      const isCourtFeePerGameValid =
        !isNaN(parsedCourtFeePerGame) && parsedCourtFeePerGame >= 0;
      const isFixedCourtFeePerPersonValid =
        !isNaN(parsedFixedCourtFeePerPerson) &&
        parsedFixedCourtFeePerPerson >= 0;

      if (
        !isCourtFeeValid &&
        !isCourtFeePerGameValid &&
        !isFixedCourtFeePerPersonValid
      ) {
        setMemberCalculations({});
        setIsDataCalculated(false);
        return;
      }

      if (
        isNaN(parsedBallPrice) ||
        isNaN(parsedOrganizeFee) ||
        parsedBallPrice < 0 ||
        parsedOrganizeFee < 0
      ) {
        setMemberCalculations({});
        setIsDataCalculated(false);
        return;
      }

      const playersInMatch = new Set();
      currentMatchData.matches.forEach((game) => {
        if (game.A1) playersInMatch.add(game.A1);
        if (game.A2) playersInMatch.add(game.A2);
        if (game.B1) playersInMatch.add(game.B1);
        if (game.B2) playersInMatch.add(game.B2);
      });

      const tempMemberCalculations = {};
      const memberWinsInMatch = {};
      const memberGamesPlayed = {};
      const memberBallsUsed = {};
      const memberScoresInMatch = {};
      const initialPaidStatus = { ...currentMatchData.paidStatus };

      playersInMatch.forEach((player) => {
        tempMemberCalculations[player] = { name: player, level: "", totalGames: 0, totalBalls: 0, wins: 0, score: 0, ballCost: 0, courtCostPerPerson: 0, organizeFeePerPerson: parsedOrganizeFee, total: 0, calculatedWins: 0, calculatedScore: 0, isPaid: initialPaidStatus[player] || false };
        memberWinsInMatch[player] = 0;
        memberGamesPlayed[player] = 0;
        memberBallsUsed[player] = 0;
        memberScoresInMatch[player] = 0;
      });

      currentMatchData.matches.forEach((game) => {
        const setLevel = (player, levelKey) => { if (player && tempMemberCalculations[player] && game[levelKey] && !tempMemberCalculations[player].level) { tempMemberCalculations[player].level = game[levelKey]; } };
        setLevel(game.A1, "A1Level");
        setLevel(game.A2, "A2Level");
        setLevel(game.B1, "B1Level");
        setLevel(game.B2, "B2Level");
      });

      currentMatchData.matches.forEach((game) => {
        const teamA = [game.A1, game.A2].filter(Boolean);
        const teamB = [game.B1, game.B2].filter(Boolean);
        const allPlayersInGame = [...teamA, ...teamB];
        allPlayersInGame.forEach((player) => {
          memberGamesPlayed[player] = (memberGamesPlayed[player] || 0) + 1;
          memberBallsUsed[player] = (memberBallsUsed[player] || 0) + (parseInt(game.balls) || 0);
        });
        if (game.result === "A") {
          teamA.forEach((player) => {
            memberWinsInMatch[player] = (memberWinsInMatch[player] || 0) + 1;
            memberScoresInMatch[player] = (memberScoresInMatch[player] || 0) + 2;
          });
        } else if (game.result === "B") {
          teamB.forEach((player) => {
            memberWinsInMatch[player] = (memberWinsInMatch[player] || 0) + 1;
            memberScoresInMatch[player] = (memberScoresInMatch[player] || 0) + 2;
          });
        } else if (game.result === "DRAW") {
          allPlayersInGame.forEach((player) => {
            memberScoresInMatch[player] = (memberScoresInMatch[player] || 0) + 1;
          });
        }
      });

      if (isFixedCourtFeePerPersonValid && parsedFixedCourtFeePerPerson > 0) {
        playersInMatch.forEach((player) => {
          tempMemberCalculations[player].courtCostPerPerson = Math.ceil(parsedFixedCourtFeePerPerson);
        });
      } else if (isCourtFeePerGameValid && parsedCourtFeePerGame > 0) {
        playersInMatch.forEach((player) => {
          const gamesPlayed = memberGamesPlayed[player] || 0;
          tempMemberCalculations[player].courtCostPerPerson = Math.ceil(gamesPlayed * parsedCourtFeePerGame);
        });
      } else if (isCourtFeeValid) {
        const totalPlayersForCourtFee = playersInMatch.size;
        const courtCostPerPersonCalculated = totalPlayersForCourtFee > 0 ? Math.ceil(parsedCourtFee / totalPlayersForCourtFee) : 0;
        playersInMatch.forEach((player) => {
          tempMemberCalculations[player].courtCostPerPerson = courtCostPerPersonCalculated;
        });
      }

      playersInMatch.forEach((player) => {
        const ballsUsed = memberBallsUsed[player] || 0;
        const calculatedWins = memberWinsInMatch[player] || 0;
        const totalGames = memberGamesPlayed[player] || 0;
        const calculatedScore = memberScoresInMatch[player] || 0;
        const ballCost = ballsUsed * parsedBallPrice;
        const roundedBallCost = Math.ceil(ballCost);
        const roundedOrganizeFee = Math.ceil(parsedOrganizeFee);
        const playerCourtCost = tempMemberCalculations[player].courtCostPerPerson;
        let totalMemberCost = roundedBallCost + playerCourtCost + roundedOrganizeFee;
        tempMemberCalculations[player] = { ...tempMemberCalculations[player], totalGames, totalBalls: ballsUsed, wins: calculatedWins, score: calculatedScore, ballCost: roundedBallCost, courtCostPerPerson: playerCourtCost, organizeFeePerPerson: roundedOrganizeFee, total: totalMemberCost, calculatedWins, calculatedScore };
      });

      const newPaidStatus = {};
      Object.values(tempMemberCalculations).forEach((member) => {
        newPaidStatus[member.name] = member.isPaid;
      });
      setMemberPaidStatus(newPaidStatus);

      setMemberCalculations(tempMemberCalculations);
      setIsDataCalculated(true);
    },
    []
  );

  const fetchMatchAndMemberDetails = useCallback(async () => {
    if (!matchId || !loggedInEmail) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", loggedInEmail));
      const userSnap = await getDocs(userQuery);
      let userId = null;
      userSnap.forEach((doc) => { userId = doc.id; });

      if (!userId) {
        throw new Error("User data not found. Please log in again.");
      }

      const matchDocRef = doc(db, `users/${userId}/Matches`, matchId);
      const matchSnap = await getDoc(matchDocRef);

      if (!matchSnap.exists()) {
        setError("Match data not found.");
        setLoading(false);
        return;
      }

      const data = matchSnap.data();
      setMatchData(data);

      const loadedCourtFee = data.courtFee != null ? String(data.courtFee) : "";
      const loadedCourtFeePerGame = data.courtFeePerGame != null ? String(data.courtFeePerGame) : "";
      const loadedFixedCourtFeePerPerson = data.fixedCourtFeePerPerson != null ? String(data.fixedCourtFeePerPerson) : "";
      const loadedBallPrice = data.ballPrice != null ? String(data.ballPrice) : "";
      const loadedOrganizeFee = data.organizeFee != null ? String(data.organizeFee) : "";

      setCourtFee(loadedCourtFee);
      setCourtFeePerGame(loadedCourtFeePerGame);
      setFixedCourtFeePerPerson(loadedFixedCourtFeePerPerson);
      setBallPrice(loadedBallPrice);
      setOrganizeFee(loadedOrganizeFee);

      setMemberPaidStatus(data.paidStatus || {});
      setIsRankingSaved(!!data.hasRankingSaved);
      setIsPaymentHistorySaved(!!data.hasPaymentHistorySaved);

      if (data.matches && data.matches.length > 0) {
        calculateMemberStats(data, loadedCourtFee, loadedBallPrice, loadedOrganizeFee, loadedCourtFeePerGame, loadedFixedCourtFeePerPerson);
      } else {
        setMemberCalculations({});
        setIsDataCalculated(false);
      }
    } catch (err) {
      console.error("Error fetching match or member details:", err);
      setError("Cannot fetch match or member details: " + err.message);
      Swal.fire("Error", "Cannot fetch match or member details: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [matchId, loggedInEmail, calculateMemberStats]);

  useEffect(() => {
    fetchMatchAndMemberDetails();
  }, [fetchMatchAndMemberDetails]);

  const handleCourtFeeChange = (e) => {
    const value = e.target.value;
    setCourtFee(value);
    if (value !== "") {
      setCourtFeePerGame("");
      setFixedCourtFeePerPerson("");
    }
  };

  const handleCourtFeePerGameChange = (e) => {
    const value = e.target.value;
    setCourtFeePerGame(value);
    if (value !== "") {
      setCourtFee("");
      setFixedCourtFeePerPerson("");
    }
  };

  const handleFixedCourtFeePerPersonChange = (e) => {
    const value = e.target.value;
    setFixedCourtFeePerPerson(value);
    if (value !== "") {
      setCourtFee("");
      setCourtFeePerGame("");
    }
  };

  const handleCalculateClick = () => {
    if (!matchData) {
      Swal.fire("Error", "No match data found for calculation", "error");
      return;
    }
    const isAnyCourtFeeFilled = (courtFee !== "" && parseFloat(courtFee) >= 0) || (courtFeePerGame !== "" && parseFloat(courtFeePerGame) >= 0) || (fixedCourtFeePerPerson !== "" && parseFloat(fixedCourtFeePerPerson) >= 0);
    if (!isAnyCourtFeeFilled) {
      Swal.fire("Invalid Input", "กรุณากรอกค่าสนาม, ค่าสนาม/เกม, หรือค่าสนาม (ระบุต่อคน) อย่างใดอย่างหนึ่ง และต้องไม่เป็นค่าติดลบ", "warning");
      return;
    }
    if (ballPrice === "" || parseFloat(ballPrice) < 0) {
      Swal.fire("Invalid Input", "กรุณากรอกราคาลูกละ และต้องไม่เป็นค่าติดลบ", "warning");
      return;
    }
    if (organizeFee === "" || parseFloat(organizeFee) < 0) {
      Swal.fire("Invalid Input", "กรุณากรอกค่าจัดก๊วน และต้องไม่เป็นค่าติดลบ", "warning");
      return;
    }
    calculateMemberStats(matchData, courtFee, ballPrice, organizeFee, courtFeePerGame, fixedCourtFeePerPerson);
    Swal.fire("Calculation Successful", "Expense data calculated", "success");
  };

  const handlePaidStatusChange = useCallback(async (memberName, isPaid) => {
    setMemberPaidStatus((prevStatus) => {
      const newStatus = { ...prevStatus, [memberName]: isPaid };
      setMemberCalculations((prevCalcs) => {
        const updatedCalcs = { ...prevCalcs };
        if (updatedCalcs[memberName]) { updatedCalcs[memberName].isPaid = isPaid; }
        return updatedCalcs;
      });
      return newStatus;
    });
    try {
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", loggedInEmail));
      const userSnap = await getDocs(userQuery);
      let userId = null;
      userSnap.forEach((doc) => { userId = doc.id; });
      if (!userId) { throw new Error("User data not found. Please log in again."); }
      const matchDocRef = doc(db, `users/${userId}/Matches`, matchId);
      await updateDoc(matchDocRef, { [`paidStatus.${memberName}`]: isPaid, lastUpdatedPaidStatus: serverTimestamp() });
      Toast.fire({ icon: 'success', title: `สถานะการชำระของ ${memberName} อัปเดตแล้ว!` });
    } catch (err) {
      console.error("Error updating paid status:", err);
      Swal.fire("Error", "Cannot save payment status: " + err.message, "error");
      setMemberPaidStatus((prevStatus) => ({ ...prevStatus, [memberName]: !isPaid }));
      setMemberCalculations((prevCalcs) => {
        const updatedCalcs = { ...prevCalcs };
        if (updatedCalcs[memberName]) { updatedCalcs[memberName].isPaid = !isPaid; }
        return updatedCalcs;
      });
    }
  }, [loggedInEmail, matchId, Toast]);

  const handleSaveToRanking = async () => {
    if (Object.keys(memberCalculations).length === 0) {
      Swal.fire("Insufficient Data", "Please calculate expenses before saving Ranking data", "warning");
      return;
    }
    if (!matchData || !matchData.matchDate) {
      Swal.fire("Incomplete Data", "Match date information not found for saving Ranking", "error");
      return;
    }
    setIsSavingRanking(true);
    try {
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", loggedInEmail));
      const userSnap = await getDocs(userQuery);
      let userId = null;
      userSnap.forEach((doc) => { userId = doc.id; });
      if (!userId) { throw new Error("User data not found. Please log in again."); }
      const matchDateObj = new Date(matchData.matchDate);
      if (isNaN(matchDateObj.getTime())) { throw new Error("Invalid Match Date."); }
      const monthYearId = `${(matchDateObj.getMonth() + 1).toString().padStart(2, "0")}-${matchDateObj.getFullYear()}`;
      const rankingDocRef = doc(db, `users/${userId}/Ranking`, monthYearId);
      const rankingSnap = await getDoc(rankingDocRef);
      const existingRankingData = rankingSnap.exists() ? rankingSnap.data() : {};
      const updatedRankingData = { ...existingRankingData };
      Object.values(memberCalculations).forEach((member) => {
        const playerName = member.name;
        const prevData = existingRankingData[playerName] || { wins: 0, score: 0, totalGames: 0, totalBalls: 0, level: "" };
        updatedRankingData[playerName] = { wins: prevData.wins + member.calculatedWins, score: prevData.score + member.calculatedScore, totalGames: prevData.totalGames + member.totalGames, totalBalls: prevData.totalBalls + member.totalBalls, level: member.level || prevData.level || "", lastUpdated: serverTimestamp() };
      });
      updatedRankingData.lastUpdatedMonth = serverTimestamp();
      await setDoc(rankingDocRef, updatedRankingData, { merge: true });
      const matchDocRef = doc(db, `users/${userId}/Matches`, matchId);
      await updateDoc(matchDocRef, { hasRankingSaved: true, lastRankingSavedAt: serverTimestamp() });
      Swal.fire("Save Successful", `Ranking data for ${monthYearId} saved successfully!`, "success");
      setIsRankingSaved(true);
    } catch (err) {
      console.error("Error saving ranking data:", err);
      Swal.fire("Error", "Cannot save Ranking data: " + err.message, "error");
    } finally {
      setIsSavingRanking(false);
    }
  };

  const handleSavePaymentHistory = async () => {
    if (Object.keys(memberCalculations).length === 0) {
      Swal.fire("Insufficient Data", "กรุณาคำนวณค่าใช้จ่ายก่อนบันทึกประวัติการชำระ", "warning");
      return;
    }
    if (!matchData || !matchData.matchDate || !matchId) {
      Swal.fire("Incomplete Data", "ไม่พบข้อมูล Match ID หรือวันที่ Match สำหรับบันทึกประวัติการชำระ", "error");
      return;
    }
    try {
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", loggedInEmail));
      const userSnap = await getDocs(userQuery);
      let userId = null;
      userSnap.forEach((doc) => { userId = doc.id; });
      if (!userId) { throw new Error("User data not found. Please log in again."); }
      const totalOverallCost = Object.values(memberCalculations).reduce((sum, m) => sum + m.total, 0);
      const paymentHistoryData = { matchId: matchId, matchDate: matchData.matchDate, topic: matchData.topic, totalOverall: Math.ceil(totalOverallCost), membersData: Object.values(memberCalculations).map((member) => ({ name: member.name, total: member.total, isPaid: member.isPaid, level: member.level, totalGames: member.totalGames, totalBalls: member.totalBalls, ballCost: member.ballCost, courtCostPerPerson: member.courtCostPerPerson, organizeFeePerPerson: member.organizeFeePerPerson, wins: member.wins, score: member.score, })), lastUpdated: serverTimestamp() };
      const paymentHistoryDocRef = doc(db, `users/${userId}/PaymentHistory`, matchId);
      await setDoc(paymentHistoryDocRef, paymentHistoryData, { merge: true });
      const matchDocRef = doc(db, `users/${userId}/Matches`, matchId);
      await updateDoc(matchDocRef, { hasPaymentHistorySaved: true, lastPaymentHistorySavedAt: serverTimestamp(), courtFee: parseFloat(courtFee) || 0, ballPrice: parseFloat(ballPrice) || 0, organizeFee: parseFloat(organizeFee) || 0, courtFeePerGame: parseFloat(courtFeePerGame) || 0, fixedCourtFeePerPerson: parseFloat(fixedCourtFeePerPerson) || 0 });
      Swal.fire("บันทึกสำเร็จ", "ประวัติการชำระเงินของ Match นี้ถูกบันทึกแล้ว!", "success");
      setIsPaymentHistorySaved(true);
    } catch (err) {
      console.error("Error saving payment history:", err);
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกประวัติการชำระเงินได้: " + err.message, "error");
    }
  };

  const handleExportToExcel = () => {
    if (Object.keys(memberCalculations).length === 0) {
      Swal.fire("Insufficient Data", "Please calculate expenses before downloading data", "warning");
      return;
    }
    const ws_data = [["No.", "ชื่อ", "จำนวนเกม", "จำนวนลูก", "ราคารวมลูกที่ใช้", "ค่าสนาม (เฉลี่ย)", "ค่าจัดก๊วน", "จำนวนชนะ", "คะแนน", "Total (บาท)", "จ่ายแล้ว"]];
    const sortedMembersForExcel = Object.values(memberCalculations).sort((a, b) => b.score - a.score);
    sortedMembersForExcel.forEach((member, index) => {
      ws_data.push([index + 1, member.name, member.totalGames, member.totalBalls, member.ballCost, member.courtCostPerPerson, member.organizeFeePerPerson, member.wins, member.score, member.total, member.isPaid ? "ใช่" : "ไม่"]);
    });
    if (sortedMembersForExcel.length > 0) {
      ws_data.push(["", "", "", "", "", "", "", "", "", "Total All:", Math.ceil(Object.values(memberCalculations).reduce((sum, m) => sum + m.total, 0))]);
    }
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const centerAlignStyle = { alignment: { horizontal: "center", vertical: "center" } };
    const headerStyle = { font: { bold: true, color: { rgb: "000000" } }, fill: { fgColor: { rgb: "E0E0E0" } }, alignment: { horizontal: "center", vertical: "center" }, border: { top: { style: "thin", color: { auto: 1 } }, bottom: { style: "thin", color: { auto: 1 } }, left: { style: "thin", color: { auto: 1 } }, right: { style: "thin", color: { auto: 1 } } } };
    for (let C = 0; C < ws_data[0].length; ++C) {
      const cell = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[cell]) ws[cell] = {};
      ws[cell].s = headerStyle;
    }
    for (let R = 1; R < ws_data.length; ++R) {
      for (let C = 0; C < ws_data[R].length; ++C) {
        const cell = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cell]) ws[cell] = {};
        ws[cell].s = { ...(ws[cell].s || {}), ...centerAlignStyle };
        if (C === 9 && R < ws_data.length - 1) { ws[cell].s = { ...ws[cell].s, font: { color: { rgb: "FF0000" } } }; }
        if (C === 10 && R === ws_data.length - 1) { ws[cell].s = { ...ws[cell].s, font: { bold: true, color: { rgb: "FF0000" } } }; }
        if (C === 9 && R === ws_data.length - 1) { ws[cell].s = { ...ws[cell].s, font: { bold: true }, ...centerAlignStyle }; }
      }
    }
    const colWidths = ws_data[0].map((_, i) => ({ wch: Math.max(...ws_data.map((row) => (row[i] ? String(row[i]).length : 0))) + 2 }));
    ws["!cols"] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Match Details");
    const fileName = `MatchDetails_${matchData?.matchDate ? formatDate(matchData.matchDate).replace(/\//g, "-") : "data"}.xlsx`;
    XLSX.writeFile(wb, fileName);
    Swal.fire("Download Successful", "Excel file downloaded!", "success");
  };

  const handleDownloadImage = async () => {
    if (!tableRef.current || Object.keys(memberCalculations).length === 0) {
      Swal.fire("ไม่มีข้อมูล", "กรุณาคำนวณข้อมูลก่อนดาวน์โหลดรูปภาพ", "warning");
      return;
    }
    try {
      const canvas = await html2canvas(tableRef.current, {
        scale: 2,
        useCORS: true,
      });
      const fileName = `MatchSummary_${matchData?.matchDate ? formatDate(matchData.matchDate).replace(/\//g, "-") : "data"}.png`;
      saveAs(canvas.toDataURL("image/png"), fileName);
      Toast.fire({ icon: 'success', title: 'ดาวน์โหลดรูปภาพสำเร็จ!' });
    } catch (error) {
      console.error("Error generating image:", error);
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถสร้างไฟล์รูปภาพได้", "error");
    }
  };

  const handleDownloadGameDetailsImage = async () => {
    if (!gameDetailsTableRef.current || !matchData?.matches?.length) {
      Swal.fire("ไม่มีข้อมูล", "ไม่มีข้อมูลเกมสำหรับดาวน์โหลดรูปภาพ", "warning");
      return;
    }
    try {
        const canvas = await html2canvas(gameDetailsTableRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
        });
        const fileName = `GameDetails_${matchData?.matchDate ? formatDate(matchData.matchDate).replace(/\//g, "-") : "data"}.png`;
        saveAs(canvas.toDataURL("image/png"), fileName);
        Toast.fire({ icon: 'success', title: 'ดาวน์โหลดรูปภาพรายละเอียดเกมสำเร็จ!' });
    } catch (error) {
        console.error("Error generating game details image:", error);
        Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถสร้างไฟล์รูปภาพรายละเอียดเกมได้", "error");
    }
  };


  if (loading) { return (<div style={{ textAlign: "center", padding: "50px" }}>Loading Match Details...</div>); }
  if (error) { return (<div style={{ textAlign: "center", padding: "50px", color: "red" }}>{error}</div>); }
  if (!matchData) { return (<div style={{ textAlign: "center", padding: "50px" }}>No Match Data Found.</div>); }

  const sortedMembers = Object.values(memberCalculations).sort((a, b) => b.score - a.score);
  const totalBallsUsedInGames = matchData.matches?.reduce((sum, game) => sum + (parseInt(game.balls, 10) || 0), 0) || 0;

  return (
    <div style={{ padding: "30px", backgroundColor: "#f7f7f7", minHeight: "100vh", fontFamily: "'Kanit', sans-serif" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "15px" }}>
        รายละเอียด Match วันที่ {formatDate(matchData.matchDate)}{" "}
        {isRankingSaved && (<span style={{ fontSize: "16px", color: "#28a745", marginLeft: "10px", fontWeight: "normal" }}>(บันทึก Ranking แล้ว)</span>)}
        {isPaymentHistorySaved && (<span style={{ fontSize: "16px", color: "#17a2b8", marginLeft: "10px", fontWeight: "normal" }}>(บันทึกประวัติการชำระแล้ว)</span>)}
      </h1>
      <p style={{ fontSize: "16px", marginBottom: "20px", color: "#555" }}>หัวเรื่อง: {matchData.topic}</p>

      <div style={{ marginBottom: "25px", padding: "20px", border: "1px solid #e0e0e0", borderRadius: "8px", backgroundColor: "#fff" }}>
        <h3 style={{ fontSize: "18px", marginBottom: "15px", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>คำนวณค่าใช้จ่าย</h3>
        <div style={{ marginBottom: "20px", padding: "15px", border: "1px solid #d0d0d0", borderRadius: "5px", backgroundColor: "#f9f9f9" }}>
          <h4 style={{ fontSize: "16px", marginBottom: "10px", color: "#333" }}>ค่าสนาม (เลือก 1 ช่อง):</h4>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", color: "#333" }}>ค่าสนาม (รวม):</label>
              <input
                type="number"
                value={courtFee}
                onChange={handleCourtFeeChange}
                placeholder="ค่าสนามรวม"
                style={{
                  padding: "8px 12px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "15px", width: "120px"
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", color: "#333" }}>ค่าสนาม/เกม:</label>
              <input
                type="number"
                value={courtFeePerGame}
                onChange={handleCourtFeePerGameChange}
                placeholder="ค่าสนาม/เกม"
                style={{
                  padding: "8px 12px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "15px", width: "120px"
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", color: "#333" }}>ค่าสนาม (ระบุต่อคน):</label>
              <input
                type="number"
                value={fixedCourtFeePerPerson}
                onChange={handleFixedCourtFeePerPersonChange}
                placeholder="ค่าสนามต่อคน"
                style={{
                  padding: "8px 12px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "15px", width: "120px"
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "20px", padding: "15px", border: "1px solid #d0d0d0", borderRadius: "5px", backgroundColor: "#f9f9f9" }}>
          <h4 style={{ fontSize: "16px", marginBottom: "10px", color: "#333" }}>ค่าลูกและค่าจัดก๊วน:</h4>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", color: "#333" }}>ราคาลูกละ:</label>
              <input type="number" value={ballPrice} onChange={(e) => setBallPrice(e.target.value)} placeholder="ราคาลูกละ" style={{ padding: "8px 12px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "15px", width: "120px" }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", color: "#333" }}>ค่าจัดก๊วน:</label>
              <input type="number" value={organizeFee} onChange={(e) => setOrganizeFee(e.target.value)} placeholder="ค่าจัดก๊วน" style={{ padding: "8px 12px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "15px", width: "120px" }} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "15px" }}>
          <button onClick={handleCalculateClick} style={{ backgroundColor: "#007bff", color: "#fff", padding: "10px 20px", borderRadius: "5px", border: "none", cursor: "pointer", fontSize: "15px" }}>คำนวณค่าใช้จ่าย</button>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "15px", paddingTop: "15px", borderTop: "1px solid #eee" }}>
          {isDataCalculated && (<button onClick={handleExportToExcel} style={{ backgroundColor: "#4bf196", color: "#fff", padding: "10px 20px", borderRadius: "5px", border: "none", cursor: "pointer", fontSize: "15px" }}>ดาวน์โหลด Excel</button>)}
          {isDataCalculated && (<button onClick={handleSaveToRanking} disabled={isSavingRanking} style={{ backgroundColor: "#d33", color: "#fff", padding: "10px 20px", borderRadius: "5px", border: "none", cursor: "pointer", fontSize: "15px", opacity: isSavingRanking ? 0.7 : 1 }}>{isSavingRanking ? (<><span className="spinner"></span> กำลังบันทึก...</>) : ("บันทึกข้อมูล Ranking")}</button>)}
          {isDataCalculated && (<button onClick={handleSavePaymentHistory} style={{ backgroundColor: "#28a745", color: "#fff", padding: "10px 20px", borderRadius: "5px", border: "none", cursor: "pointer", fontSize: "15px" }}>บันทึกประวัติการชำระ</button>)}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
          {isDataCalculated && (
            <button
              onClick={handleDownloadImage}
              title="Download as Image"
              style={{
                background: '#ffffff',
                border: '1px solid #ddd',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease-in-out',
              }}
              onMouseOver={e => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.transform = 'scale(1.0)';
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
          )}
      </div>

      <div ref={tableRef} style={{ overflowX: "auto", border: "1px solid #e0e0e0", borderRadius: "8px", backgroundColor: "#fff", padding: '12px' }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ backgroundColor: "#323943", color: "white" }}>
              <th style={{ padding: "12px 10px", borderRight: "1px solid #444", textAlign: "center" }}>No.</th>
              <th style={{ padding: "12px 10px", borderRight: "1px solid #444", textAlign: "left" }}>ชื่อ</th>
              <th style={{ padding: "12px 10px", borderRight: "1px solid #444", textAlign: "center" }}>จำนวนเกม</th>
              <th style={{ padding: "12px 10px", borderRight: "1px solid #444", textAlign: "center" }}>จำนวนลูก</th>
              <th style={{ padding: "12px 10px", borderRight: "1px solid #444", textAlign: "center" }}>ราคารวมลูกที่ใช้</th>
              <th style={{ padding: "12px 10px", borderRight: "1px solid #444", textAlign: "center" }}>ค่าสนาม (เฉลี่ย)</th>
              <th style={{ padding: "12px 10px", borderRight: "1px solid #444", textAlign: "center" }}>ค่าจัดก๊วน</th>
              <th style={{ padding: "12px 10px", borderRight: "1px solid #444", textAlign: "center" }}>จำนวนชนะ</th>
              <th style={{ padding: "12px 10px", borderRight: "1px solid #444", textAlign: "center" }}>คะแนน</th>
              <th style={{ padding: "12px 10px", borderRight: "1px solid #444", textAlign: "center" }}>Total (บาท)</th>
              <th style={{ padding: "12px 10px", textAlign: "center" }}>จ่ายแล้ว</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(memberCalculations).length === 0 ? (
              <tr><td colSpan={"11"} style={{ textAlign: "center", padding: "20px", color: "#777" }}>{isDataCalculated ? "ไม่มีข้อมูลการคำนวณ" : "กรุณากรอกค่าใช้จ่ายแล้วกด 'คำนวณค่าใช้จ่าย' เพื่อดูรายละเอียด"}</td></tr>
            ) : (
              sortedMembers.map((member, index) => (
                <tr key={member.name || index} style={{ borderBottom: "1px solid #eee", backgroundColor: index === 0 ? "#FFFACD" : "inherit" }}>
                  <td style={{ padding: "10px", borderRight: "1px solid #eee", textAlign: "center" }}>{index + 1}</td>
                  <td style={{ padding: "10px", borderRight: "1px solid #eee", textAlign: "left", fontWeight: "bold" }}>
                    {index === 0 && (<span style={{ color: "#DAA520", marginRight: "5px", fontWeight: "bold" }}>MVP ✨ </span>)}
                    {member.name}
                    {member.level ? ` (${member.level})` : ""}
                  </td>
                  <td style={{ padding: "10px", borderRight: "1px solid #eee", textAlign: "center" }}>{member.totalGames}</td>
                  <td style={{ padding: "10px", borderRight: "1px solid #eee", textAlign: "center" }}>{member.totalBalls}</td>
                  <td style={{ padding: "10px", borderRight: "1px solid #eee", textAlign: "center" }}>{member.ballCost}</td>
                  <td style={{ padding: "10px", borderRight: "1px solid #eee", textAlign: "center" }}>{member.courtCostPerPerson}</td>
                  <td style={{ padding: "10px", borderRight: "1px solid #eee", textAlign: "center" }}>{member.organizeFeePerPerson}</td>
                  <td style={{ padding: "10px", borderRight: "1px solid #eee", textAlign: "center" }}>{member.wins}</td>
                  <td style={{ padding: "10px", borderRight: "1px solid #eee", textAlign: "center" }}>{member.score}</td>
                  <td style={{ padding: "10px", borderRight: "1px solid #eee", textAlign: "center", fontWeight: "bold", color: "#e63946" }}>{member.total}</td>
                  <td style={{ padding: "10px", textAlign: "center" }}><input type="checkbox" checked={memberPaidStatus[member.name] || false} onChange={(e) => handlePaidStatusChange(member.name, e.target.checked)} style={{ cursor: "pointer", transform: "scale(1.2)" }} /></td>
                </tr>
              ))
            )}
            {Object.keys(memberCalculations).length > 0 && (
              <tr style={{ backgroundColor: "#f0f0f0", fontWeight: "bold" }}>
                <td colSpan={"10"} style={{ padding: "10px", textAlign: "right", borderRight: "1px solid #eee" }}>Total All:</td>
                <td style={{ padding: "10px", textAlign: "center", color: "#e63946" }}>{Math.ceil(Object.values(memberCalculations).reduce((sum, m) => sum + m.total, 0))}</td>
                <td style={{ padding: "10px", textAlign: "center" }}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CORRECTED: New layout for Game Details Header */}
      <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '30px',
          borderBottom: '1px solid #eee',
          paddingBottom: '10px',
          marginBottom: '15px'
      }}>
        <h3 style={{ fontSize: "18px", margin: 0 }}>รายละเอียดเกม:</h3>
        <div>
          {matchData.matches && matchData.matches.length > 0 && (
            <button
              onClick={handleDownloadGameDetailsImage}
              title="Download Game Details as Image"
              style={{
                background: '#ffffff',
                border: '1px solid #ddd',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease-in-out',
              }}
              onMouseOver={e => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.transform = 'scale(1.0)';
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
          )}
        </div>
      </div>
      
      <div style={{ marginBottom: "30px" }}>
        <div ref={gameDetailsTableRef} style={{ overflowX: "auto", border: "1px solid #e0e0e0", borderRadius: "8px", backgroundColor: "#fff", padding: '12px' }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ backgroundColor: "#323943", color: "white" }}>
                <th style={{ padding: "12px 10px", borderRight: "1px solid #444", textAlign: "center" }}>No.</th>
                <th style={{ padding: "12px 10px", borderRight: "1px solid #444", textAlign: "center" }}>Match ID</th>
                <th style={{ padding: "12px 10px", borderRight: "1px solid #444", textAlign: "center" }}>สนาม</th>
                <th style={{ padding: "12px 10px", borderRight: "1px solid #444", textAlign: "center" }}>ทีม A</th>
                <th style={{ padding: "12px 10px", borderRight: "1px solid #444", textAlign: "center" }}>ทีม B</th>
                <th style={{ padding: "12px 10px", borderRight: "1px solid #444", textAlign: "center" }}>ลูกที่ใช้</th>
                <th style={{ padding: "12px 10px", borderRight: "1px solid #444", textAlign: "center" }}>ผล</th>
                <th style={{ padding: "12px 10px", textAlign: "center" }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {matchData.matches && matchData.matches.length > 0 ? (
                matchData.matches.map((game, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "10px", borderRight: "1px solid #eee", textAlign: "center" }}>{index + 1}</td>
                    <td style={{ padding: "10px", borderRight: "1px solid #eee", textAlign: "center" }}>{game.matchId || ""}</td>
                    <td style={{ padding: "10px", borderRight: "1px solid #eee", textAlign: "center" }}>{game.court || ""}</td>
                    <td style={{ padding: "10px", borderRight: "1px solid #eee", textAlign: "center" }}>{game.A1 || ""}, {game.A2 || ""}</td>
                    <td style={{ padding: "10px", borderRight: "1px solid #eee", textAlign: "center" }}>{game.B1 || ""}, {game.B2 || ""}</td>
                    <td style={{ padding: "10px", borderRight: "1px solid #eee", textAlign: "center" }}>{game.balls || ""}</td>
                    <td style={{ padding: "10px", borderRight: "1px solid #eee", textAlign: "center" }}>{game.result || ""}</td>
                    <td style={{ padding: "10px", textAlign: "center" }}>{game.score || ""}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="8" style={{ textAlign: "center", padding: "20px", color: "#777" }}>ไม่มีรายละเอียดเกมใน Match นี้.</td></tr>
              )}
            </tbody>
            {matchData.matches && matchData.matches.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: "#f0f0f0", fontWeight: "bold" }}>
                  <td colSpan={5} style={{ padding: "10px", textAlign: "right", borderRight: "1px solid #eee" }}>
                    รวมลูกที่ใช้ทั้งหมด:
                  </td>
                  <td style={{ padding: "10px", textAlign: "center", color: "#e63946" }}>
                    {totalBallsUsedInGames}
                  </td>
                  <td colSpan={2} style={{ padding: "10px" }}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <style jsx>{`
        @keyframes spinner {
          to { transform: rotate(360deg); }
        }
        .spinner {
          display: inline-block; width: 1em; height: 1em; vertical-align: middle;
          border: 0.15em solid currentColor; border-right-color: transparent;
          border-radius: 50%; animation: spinner 0.75s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default MatchDetails;

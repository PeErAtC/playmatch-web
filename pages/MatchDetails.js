// pages/MatchDetails.js
import React, { useState, useEffect, useCallback } from "react";
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
} from "firebase/firestore";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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
  // NEW: State for fixed court fee per person
  const [fixedCourtFeePerPerson, setFixedCourtFeePerPerson] = useState("");
  const [ballPrice, setBallPrice] = useState("");
  const [organizeFee, setOrganizeFee] = useState("");
  const [memberCalculations, setMemberCalculations] = useState({});
  const [loggedInEmail, setLoggedInEmail] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [isDataCalculated, setIsDataCalculated] = useState(false);
  const [isSavingRanking, setIsSavingRanking] = useState(false);
  const [memberPaidStatus, setMemberPaidStatus] = useState({});

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
            // >>>>>>>>>>>>> Adjust this to your actual Admin email <<<<<<<<<<<<<
            setAdminEmail("admin@example.com"); // Fallback if not found in config
          }
        } catch (err) {
          console.error("Error fetching admin email:", err);
          // >>>>>>>>>>>>> Adjust this to your actual Admin email <<<<<<<<<<<<<
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
      currentCourtFeePerGame, // NEW
      currentFixedCourtFeePerPerson // NEW
    ) => {
      console.log("Starting calculateMemberStats...");
      console.log("Current Match Data:", currentMatchData);

      if (
        !currentMatchData ||
        !currentBallPrice ||
        !currentOrganizeFee ||
        !currentMatchData.matches ||
        currentMatchData.matches.length === 0
      ) {
        console.log(
          "Insufficient data for calculation (missing ball price, organize fee, or matches). Resetting calculations."
        );
        setMemberCalculations({});
        setIsDataCalculated(false);
        return;
      }

      const parsedCourtFee = parseFloat(currentCourtFee);
      const parsedCourtFeePerGame = parseFloat(currentCourtFeePerGame);
      const parsedFixedCourtFeePerPerson = parseFloat(
        currentFixedCourtFeePerPerson
      ); // NEW
      const parsedBallPrice = parseFloat(currentBallPrice);
      const parsedOrganizeFee = parseFloat(currentOrganizeFee);

      // NEW: Validate at least one court fee input is provided and not negative
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
        console.log(
          "Invalid or missing court fee inputs. Resetting calculations."
        );
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
        console.log(
          "Invalid ball price or organize fee inputs. Resetting calculations."
        );
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

      console.log("Players in this match:", Array.from(playersInMatch));

      const tempMemberCalculations = {};
      const memberWinsInMatch = {};
      const memberGamesPlayed = {};
      const memberBallsUsed = {};
      const memberScoresInMatch = {};
      const initialPaidStatus = { ...currentMatchData.paidStatus }; // Load existing paid status

      playersInMatch.forEach((player) => {
        tempMemberCalculations[player] = {
          name: player,
          level: "",
          totalGames: 0,
          totalBalls: 0,
          wins: 0,
          score: 0,
          ballCost: 0,
          courtCostPerPerson: 0,
          organizeFeePerPerson: parsedOrganizeFee,
          total: 0,
          calculatedWins: 0,
          calculatedScore: 0,
          isPaid: initialPaidStatus[player] || false,
        };
        memberWinsInMatch[player] = 0;
        memberGamesPlayed[player] = 0;
        memberBallsUsed[player] = 0;
        memberScoresInMatch[player] = 0;
      });

      currentMatchData.matches.forEach((game) => {
        const setLevel = (player, levelKey) => {
          if (
            player &&
            tempMemberCalculations[player] &&
            game[levelKey] &&
            !tempMemberCalculations[player].level
          ) {
            tempMemberCalculations[player].level = game[levelKey];
          }
        };

        setLevel(game.A1, "A1Level");
        setLevel(game.A2, "A2Level");
        setLevel(game.B1, "B1Level");
        setLevel(game.B2, "B2Level");
      });

      currentMatchData.matches.forEach((game, gameIndex) => {
        console.log(`Processing game ${gameIndex + 1}:`, game);
        const teamA = [game.A1, game.A2].filter(Boolean);
        const teamB = [game.B1, game.B2].filter(Boolean);

        const allPlayersInGame = [...teamA, ...teamB];

        allPlayersInGame.forEach((player) => {
          memberGamesPlayed[player] = (memberGamesPlayed[player] || 0) + 1;
          memberBallsUsed[player] =
            (memberBallsUsed[player] || 0) + (parseInt(game.balls) || 0);
        });

        if (game.result === "A") {
          teamA.forEach((player) => {
            memberWinsInMatch[player] = (memberWinsInMatch[player] || 0) + 1;
            memberScoresInMatch[player] =
              (memberScoresInMatch[player] || 0) + 2;
          });
        } else if (game.result === "B") {
          teamB.forEach((player) => {
            memberWinsInMatch[player] = (memberWinsInMatch[player] || 0) + 1;
            memberScoresInMatch[player] =
              (memberScoresInMatch[player] || 0) + 2;
          });
        } else if (game.result === "DRAW") {
          allPlayersInGame.forEach((player) => {
            memberScoresInMatch[player] =
              (memberScoresInMatch[player] || 0) + 1;
          });
        }
      });

      // NEW: Calculate court cost based on input preference (priority: fixed, per game, total)
      if (isFixedCourtFeePerPersonValid) {
        // Option 1: Calculate based on fixed court fee per person
        playersInMatch.forEach((player) => {
          tempMemberCalculations[player].courtCostPerPerson = Math.ceil(
            parsedFixedCourtFeePerPerson
          );
        });
      } else if (isCourtFeePerGameValid) {
        // Option 2: Calculate based on court fee per game
        playersInMatch.forEach((player) => {
          const gamesPlayed = memberGamesPlayed[player] || 0;
          tempMemberCalculations[player].courtCostPerPerson = Math.ceil(
            gamesPlayed * parsedCourtFeePerGame
          );
        });
      } else if (isCourtFeeValid) {
        // Option 3: Calculate based on total court fee (existing logic)
        const totalPlayersForCourtFee = playersInMatch.size;
        const courtCostPerPersonCalculated =
          totalPlayersForCourtFee > 0
            ? Math.ceil(parsedCourtFee / totalPlayersForCourtFee)
            : 0;
        playersInMatch.forEach((player) => {
          tempMemberCalculations[player].courtCostPerPerson =
            courtCostPerPersonCalculated;
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

        const playerCourtCost =
          tempMemberCalculations[player].courtCostPerPerson;

        let totalMemberCost =
          roundedBallCost + playerCourtCost + roundedOrganizeFee;

        tempMemberCalculations[player] = {
          name: player,
          level: tempMemberCalculations[player].level || "",
          totalGames: totalGames,
          totalBalls: ballsUsed,
          wins: calculatedWins,
          score: calculatedScore,
          ballCost: roundedBallCost,
          courtCostPerPerson: playerCourtCost,
          organizeFeePerPerson: roundedOrganizeFee,
          total: totalMemberCost,
          calculatedWins: calculatedWins,
          calculatedScore: calculatedScore,
          isPaid: initialPaidStatus[player] || false,
        };
      });

      const newPaidStatus = {};
      Object.values(tempMemberCalculations).forEach((member) => {
        newPaidStatus[member.name] = member.isPaid;
      });
      setMemberPaidStatus(newPaidStatus);

      console.log(
        "Final Calculated Member Data for display:",
        tempMemberCalculations
      );
      setMemberCalculations(tempMemberCalculations);
      setIsDataCalculated(true);
    },
    []
  );

  // Function to fetch Match details and Members from Firebase
  const fetchMatchAndMemberDetails = useCallback(async () => {
    if (!matchId || !loggedInEmail) {
      console.log("No matchId or loggedInEmail. Skipping fetch.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", loggedInEmail));
      const userSnap = await getDocs(userQuery);
      let userId = null;
      userSnap.forEach((doc) => {
        userId = doc.id;
      });

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
      console.log("Fetched Match Data:", data);
      setMatchData(data);
      // Initialize all three court fee fields from fetched data or keep them empty
      setCourtFee(data.courtFee ? String(data.courtFee) : "");
      setCourtFeePerGame(
        data.courtFeePerGame ? String(data.courtFeePerGame) : ""
      );
      setFixedCourtFeePerPerson(
        data.fixedCourtFeePerPerson ? String(data.fixedCourtFeePerPerson) : ""
      ); // NEW
      setBallPrice(data.ballPrice ? String(data.ballPrice) : "");
      setOrganizeFee(data.organizeFee ? String(data.organizeFee) : "");

      setMemberPaidStatus(data.paidStatus || {});

      if (data.matches && data.matches.length > 0) {
        calculateMemberStats(
          data,
          data.courtFee || "",
          data.ballPrice || "",
          data.organizeFee || "",
          data.courtFeePerGame || "",
          data.fixedCourtFeePerPerson || "" // NEW
        );
      } else {
        console.log("No matches found in match data. Resetting calculations.");
        setMemberCalculations({});
        setIsDataCalculated(false);
      }
    } catch (err) {
      console.error("Error fetching match or member details:", err);
      setError("Cannot fetch match or member details: " + err.message);
      Swal.fire(
        "Error",
        "Cannot fetch match or member details: " + err.message,
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [matchId, loggedInEmail, calculateMemberStats]);

  useEffect(() => {
    fetchMatchAndMemberDetails();
  }, [fetchMatchAndMemberDetails]);

  // Determine which court fee input is currently active/filled
  const isCourtFeeActive = courtFee !== "";
  const isCourtFeePerGameActive = courtFeePerGame !== "";
  const isFixedCourtFeePerPersonActive = fixedCourtFeePerPerson !== "";

  // Handlers for court fee changes, ensuring only one is active
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

  // Function to calculate expenses (called when button is clicked)
  const handleCalculateClick = () => {
    if (!matchData) {
      Swal.fire("Error", "No match data found for calculation", "error");
      return;
    }

    // NEW: Check if at least one court fee input has a value and is not negative
    const isAnyCourtFeeFilled =
      (courtFee !== "" && parseFloat(courtFee) >= 0) ||
      (courtFeePerGame !== "" && parseFloat(courtFeePerGame) >= 0) ||
      (fixedCourtFeePerPerson !== "" &&
        parseFloat(fixedCourtFeePerPerson) >= 0);

    if (!isAnyCourtFeeFilled) {
      Swal.fire(
        "Invalid Input",
        "กรุณากรอกค่าสนาม, ค่าสนาม/เกม, หรือค่าสนาม (ระบุต่อคน) อย่างใดอย่างหนึ่ง และต้องไม่เป็นค่าติดลบ",
        "warning"
      );
      return;
    }

    if (ballPrice === "" || parseFloat(ballPrice) < 0) {
      Swal.fire(
        "Invalid Input",
        "กรุณากรอกราคาลูกละ และต้องไม่เป็นค่าติดลบ",
        "warning"
      );
      return;
    }

    if (organizeFee === "" || parseFloat(organizeFee) < 0) {
      Swal.fire(
        "Invalid Input",
        "กรุณากรอกค่าจัดก๊วน และต้องไม่เป็นค่าติดลบ",
        "warning"
      );
      return;
    }

    calculateMemberStats(
      matchData,
      courtFee,
      ballPrice,
      organizeFee,
      courtFeePerGame,
      fixedCourtFeePerPerson // NEW
    );
    Swal.fire("Calculation Successful", "Expense data calculated", "success");
  };

  // Handler for paid status change
  const handlePaidStatusChange = useCallback(
    async (memberName, isPaid) => {
      if (!isAdmin) return;

      setMemberPaidStatus((prevStatus) => {
        const newStatus = { ...prevStatus, [memberName]: isPaid };
        setMemberCalculations((prevCalcs) => {
          const updatedCalcs = { ...prevCalcs };
          if (updatedCalcs[memberName]) {
            updatedCalcs[memberName].isPaid = isPaid;
          }
          return updatedCalcs;
        });
        return newStatus;
      });

      try {
        const usersRef = collection(db, "users");
        const userQuery = query(usersRef, where("email", "==", loggedInEmail));
        const userSnap = await getDocs(userQuery);
        let userId = null;
        userSnap.forEach((doc) => {
          userId = doc.id;
        });

        if (!userId) {
          throw new Error("User data not found. Please log in again.");
        }

        const matchDocRef = doc(db, `users/${userId}/Matches`, matchId);
        await updateDoc(matchDocRef, {
          [`paidStatus.${memberName}`]: isPaid,
          lastUpdatedPaidStatus: serverTimestamp(),
        });
        Swal.fire(
          "Status Saved",
          `Payment status of ${memberName} updated!`,
          "success"
        );
      } catch (err) {
        console.error("Error updating paid status:", err);
        Swal.fire(
          "Error",
          "Cannot save payment status: " + err.message,
          "error"
        );
        // Revert status on error
        setMemberPaidStatus((prevStatus) => ({
          ...prevStatus,
          [memberName]: !isPaid,
        }));
        setMemberCalculations((prevCalcs) => {
          const updatedCalcs = { ...prevCalcs };
          if (updatedCalcs[memberName]) {
            updatedCalcs[memberName].isPaid = !isPaid;
          }
          return updatedCalcs;
        });
      }
    },
    [isAdmin, loggedInEmail, matchId]
  );

  // Function to save table data to Ranking collection
  const handleSaveToRanking = async () => {
    if (Object.keys(memberCalculations).length === 0) {
      Swal.fire(
        "Insufficient Data",
        "Please calculate expenses before saving Ranking data",
        "warning"
      );
      return;
    }

    if (!matchData || !matchData.matchDate) {
      Swal.fire(
        "Incomplete Data",
        "Match date information not found for saving Ranking",
        "error"
      );
      return;
    }

    setIsSavingRanking(true);
    try {
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", loggedInEmail));
      const userSnap = await getDocs(userQuery);
      let userId = null;
      userSnap.forEach((doc) => {
        userId = doc.id;
      });

      if (!userId) {
        throw new Error("User data not found. Please log in again.");
      }

      const matchDateObj = new Date(matchData.matchDate);
      if (isNaN(matchDateObj.getTime())) {
        throw new Error("Invalid Match Date.");
      }
      const monthYearId = `${(matchDateObj.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${matchDateObj.getFullYear()}`;

      const rankingDocRef = doc(db, `users/${userId}/Ranking`, monthYearId);
      const rankingSnap = await getDoc(rankingDocRef);
      const existingRankingData = rankingSnap.exists()
        ? rankingSnap.data()
        : {};

      const updatedRankingData = { ...existingRankingData };

      Object.values(memberCalculations).forEach((member) => {
        const playerName = member.name;

        // Retrieve previous values (or start new if not existing)
        const prevData = existingRankingData[playerName] || {
          wins: 0,
          score: 0,
          totalGames: 0,
          totalBalls: 0,
          level: "",
        };

        // Add the newly calculated values
        updatedRankingData[playerName] = {
          wins: prevData.wins + member.calculatedWins,
          score: prevData.score + member.calculatedScore,
          totalGames: prevData.totalGames + member.totalGames,
          totalBalls: prevData.totalBalls + member.totalBalls,
          level: member.level || prevData.level || "",
          lastUpdated: serverTimestamp(),
        };
      });

      updatedRankingData.lastUpdatedMonth = serverTimestamp();

      // Use setDoc with merge: true to avoid overwriting the entire document
      await updateDoc(rankingDocRef, updatedRankingData);

      Swal.fire(
        "Save Successful",
        `Ranking data for ${monthYearId} saved successfully!`,
        "success"
      );
    } catch (err) {
      console.error("Error saving ranking data:", err);
      Swal.fire("Error", "Cannot save Ranking data: " + err.message, "error");
    } finally {
      setIsSavingRanking(false);
    }
  };

  // --- NEW: Function to Export data to Excel ---
  const handleExportToExcel = () => {
    if (Object.keys(memberCalculations).length === 0) {
      Swal.fire(
        "Insufficient Data",
        "Please calculate expenses before downloading data",
        "warning"
      );
      return;
    }

    const ws_data = [
      [
        "No.",
        "ชื่อ",
        "จำนวนเกม",
        "จำนวนลูก",
        "ราคารวมลูกที่ใช้",
        "ค่าสนาม (เฉลี่ย)",
        "ค่าจัดก๊วน",
        "จำนวนชนะ",
        "คะแนน",
        "Total (บาท)",
        "จ่ายแล้ว",
      ], // Header row with new "Paid" column
    ];

    const sortedMembersForExcel = Object.values(memberCalculations).sort(
      (a, b) => b.score - a.score
    );

    sortedMembersForExcel.forEach((member, index) => {
      ws_data.push([
        index + 1,
        member.name,
        member.totalGames,
        member.totalBalls,
        member.ballCost, // No toFixed here, already rounded up in calculation
        member.courtCostPerPerson,
        member.organizeFeePerPerson, // No toFixed here, already rounded up in calculation
        member.wins,
        member.score,
        member.total, // Use the calculated total
        member.isPaid ? "ใช่" : "ไม่",
      ]);
    });

    // Add Total All row
    if (sortedMembersForExcel.length > 0) {
      const totalAllSum = Object.values(memberCalculations).reduce(
        (sum, m) => sum + m.total,
        0
      );
      ws_data.push([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Total All:",
        Math.ceil(
          Object.values(memberCalculations).reduce((sum, m) => sum + m.total, 0)
        ),
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // --- Apply Styling for Excel ---
    // Universal style for center alignment
    const centerAlignStyle = {
      alignment: { horizontal: "center", vertical: "center" },
    };

    // Header row styling
    const headerStyle = {
      font: { bold: true, color: { rgb: "000000" } }, // Black text for headers
      fill: { fgColor: { rgb: "E0E0E0" } }, // Light gray background for headers (E0E0E0 is a light grey)
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { auto: 1 } },
        bottom: { style: "thin", color: { auto: 1 } },
        left: { style: "thin", color: { auto: 1 } },
        right: { style: "thin", color: { auto: 1 } },
      },
    };

    // Apply header style to the first row
    for (let C = 0; C < ws_data[0].length; ++C) {
      const cell = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[cell]) ws[cell] = {};
      ws[cell].s = headerStyle;
    }

    // Apply center alignment to all data cells and red color to 'Total (บาท)' column
    for (let R = 1; R < ws_data.length; ++R) {
      // Start from second row
      for (let C = 0; C < ws_data[R].length; ++C) {
        const cell = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cell]) ws[cell] = {};

        // Apply center alignment to all data cells
        ws[cell].s = { ...(ws[cell].s || {}), ...centerAlignStyle }; // Merge with existing styles

        // Apply red color to "Total (บาท)" column (index 9)
        if (C === 9 && R < ws_data.length - 1) {
          // Apply to individual totals
          ws[cell].s = { ...ws[cell].s, font: { color: { rgb: "FF0000" } } };
        }
        // Apply red color and bold to "Total All" value (last row, column 10, data part)
        if (C === 10 && R === ws_data.length - 1) {
          ws[cell].s = {
            ...ws[cell].s,
            font: { bold: true, color: { rgb: "FF0000" } },
          };
        }
        // Ensure "Total All:" text itself is bold and centered
        if (C === 9 && R === ws_data.length - 1) {
          ws[cell].s = {
            ...ws[cell].s,
            font: { bold: true },
            ...centerAlignStyle,
          };
        }
      }
    }

    // Auto-width columns based on content
    const colWidths = ws_data[0].map((_, i) => ({
      wch:
        Math.max(
          ...ws_data.map((row) => (row[i] ? String(row[i]).length : 0))
        ) + 2,
    }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Match Details");

    const fileName = `MatchDetails_${
      matchData?.matchDate
        ? formatDate(matchData.matchDate).replace(/\//g, "-")
        : "data"
    }.xlsx`;
    XLSX.writeFile(wb, fileName);

    Swal.fire("Download Successful", "Excel file downloaded!", "success");
  };
  // --- End NEW: Function to Export data to Excel ---

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        Loading Match Details...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "50px", color: "red" }}>
        {error}
      </div>
    );
  }

  if (!matchData) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        No Match Data Found.
      </div>
    );
  }

  // Ensure sortedMembers is always an array for safe mapping
  const sortedMembers = Object.values(memberCalculations).sort(
    (a, b) => b.score - a.score
  );

  return (
    <div
      style={{
        padding: "30px",
        backgroundColor: "#f7f7f7",
        minHeight: "100vh",
        fontFamily: "'Kanit', sans-serif", // Ensure Kanit font is applied
      }}
    >
      <h1 style={{ fontSize: "24px", marginBottom: "15px" }}>
        รายละเอียด Match วันที่ {formatDate(matchData.matchDate)}
      </h1>
      <p style={{ fontSize: "16px", marginBottom: "20px", color: "#555" }}>
        หัวเรื่อง: {matchData.topic}
      </p>

      {/* Input for court fee and ball price */}
      <div
        style={{
          marginBottom: "25px",
          padding: "20px",
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
          backgroundColor: "#fff",
        }}
      >
        <h3
          style={{
            fontSize: "18px",
            marginBottom: "15px",
            borderBottom: "1px solid #eee",
            paddingBottom: "10px",
          }}
        >
          คำนวณค่าใช้จ่าย
        </h3>

        {/* Group for Court Fee Inputs */}
        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            border: "1px solid #d0d0d0",
            borderRadius: "5px",
            backgroundColor: "#f9f9f9",
          }}
        >
          <h4 style={{ fontSize: "16px", marginBottom: "10px", color: "#333" }}>
            ค่าสนาม (เลือก 1 ช่อง):
          </h4>
          <div
            style={{
              display: "flex",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontSize: "14px",
                  color: "#333",
                }}
              >
                ค่าสนาม (รวม):
              </label>
              <input
                type="number"
                value={courtFee}
                onChange={handleCourtFeeChange}
                placeholder="ค่าสนามรวม"
                disabled={
                  isCourtFeePerGameActive || isFixedCourtFeePerPersonActive
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: "5px",
                  border: "1px solid #ccc",
                  fontSize: "15px",
                  width: "120px",
                  backgroundColor:
                    isCourtFeePerGameActive || isFixedCourtFeePerPersonActive
                      ? "#e9e9e9"
                      : "#fff",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontSize: "14px",
                  color: "#333",
                }}
              >
                ค่าสนาม/เกม:
              </label>
              <input
                type="number"
                value={courtFeePerGame}
                onChange={handleCourtFeePerGameChange}
                placeholder="ค่าสนาม/เกม"
                disabled={isCourtFeeActive || isFixedCourtFeePerPersonActive}
                style={{
                  padding: "8px 12px",
                  borderRadius: "5px",
                  border: "1px solid #ccc",
                  fontSize: "15px",
                  width: "120px",
                  backgroundColor:
                    isCourtFeeActive || isFixedCourtFeePerPersonActive
                      ? "#e9e9e9"
                      : "#fff",
                }}
              />
            </div>
            {/* NEW: Input for Fixed Court Fee per Person */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontSize: "14px",
                  color: "#333",
                }}
              >
                ค่าสนาม (ระบุต่อคน):
              </label>
              <input
                type="number"
                value={fixedCourtFeePerPerson}
                onChange={handleFixedCourtFeePerPersonChange}
                placeholder="ค่าสนามต่อคน"
                disabled={isCourtFeeActive || isCourtFeePerGameActive}
                style={{
                  padding: "8px 12px",
                  borderRadius: "5px",
                  border: "1px solid #ccc",
                  fontSize: "15px",
                  width: "120px",
                  backgroundColor:
                    isCourtFeeActive || isCourtFeePerGameActive
                      ? "#e9e9e9"
                      : "#fff",
                }}
              />
            </div>
          </div>
        </div>

        {/* Group for Ball Price and Organize Fee */}
        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            border: "1px solid #d0d0d0",
            borderRadius: "5px",
            backgroundColor: "#f9f9f9",
          }}
        >
          <h4 style={{ fontSize: "16px", marginBottom: "10px", color: "#333" }}>
            ค่าลูกและค่าจัดก๊วน:
          </h4>
          <div
            style={{
              display: "flex",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontSize: "14px",
                  color: "#333",
                }}
              >
                ราคาลูกละ:
              </label>
              <input
                type="number"
                value={ballPrice}
                onChange={(e) => setBallPrice(e.target.value)}
                placeholder="ราคาลูกละ"
                style={{
                  padding: "8px 12px",
                  borderRadius: "5px",
                  border: "1px solid #ccc",
                  fontSize: "15px",
                  width: "120px",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontSize: "14px",
                  color: "#333",
                }}
              >
                ค่าจัดก๊วน:
              </label>
              <input
                type="number"
                value={organizeFee}
                onChange={(e) => setOrganizeFee(e.target.value)}
                placeholder="ค่าจัดก๊วน"
                style={{
                  padding: "8px 12px",
                  borderRadius: "5px",
                  border: "1px solid #ccc",
                  fontSize: "15px",
                  width: "120px",
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "15px",
          }}
        >
          <button
            onClick={handleCalculateClick}
            style={{
              backgroundColor: "#007bff",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "5px",
              border: "none",
              cursor: "pointer",
              fontSize: "15px",
            }}
          >
            คำนวณค่าใช้จ่าย
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "15px",
            paddingTop: "15px",
            borderTop: "1px solid #eee",
          }}
        >
          {isDataCalculated && (
            <button
              onClick={handleExportToExcel}
              style={{
                backgroundColor: "#4bf196",
                color: "#fff",
                padding: "10px 20px",
                borderRadius: "5px",
                border: "none",
                cursor: "pointer",
                fontSize: "15px",
              }}
            >
              ดาวน์โหลด Excel
            </button>
          )}
          {isDataCalculated && (
            <button
              onClick={handleSaveToRanking}
              disabled={isSavingRanking}
              style={{
                backgroundColor: "#d33",
                color: "#fff",
                padding: "10px 20px",
                borderRadius: "5px",
                border: "none",
                cursor: "pointer",
                fontSize: "15px",
                opacity: isSavingRanking ? 0.7 : 1,
              }}
            >
              {isSavingRanking ? (
                <>
                  <span className="spinner"></span> กำลังบันทึก...
                </>
              ) : (
                "บันทึกข้อมูล Ranking"
              )}
            </button>
          )}
        </div>
      </div>

      {/* Table of player details with expenses */}
      <div
        style={{
          overflowX: "auto",
          marginBottom: "30px",
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
          backgroundColor: "#fff",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#323943", color: "white" }}>
              <th
                style={{
                  padding: "12px 10px",
                  borderRight: "1px solid #444",
                  textAlign: "center", // Center-align No.
                }}
              >
                No.
              </th>
              <th
                style={{
                  padding: "12px 10px",
                  borderRight: "1px solid #444",
                  textAlign: "left",
                }}
              >
                ชื่อ
              </th>
              <th
                style={{
                  padding: "12px 10px",
                  borderRight: "1px solid #444",
                  textAlign: "center",
                }}
              >
                จำนวนเกม
              </th>
              <th
                style={{
                  padding: "12px 10px",
                  borderRight: "1px solid #444",
                  textAlign: "center",
                }}
              >
                จำนวนลูก
              </th>
              <th
                style={{
                  padding: "12px 10px",
                  borderRight: "1px solid #444",
                  textAlign: "center",
                }}
              >
                ราคารวมลูกที่ใช้
              </th>
              <th
                style={{
                  padding: "12px 10px",
                  borderRight: "1px solid #444",
                  textAlign: "center",
                }}
              >
                ค่าสนาม (เฉลี่ย)
              </th>
              <th
                style={{
                  padding: "12px 10px",
                  borderRight: "1px solid #444",
                  textAlign: "center",
                }}
              >
                ค่าจัดก๊วน
              </th>
              <th
                style={{
                  padding: "12px 10px",
                  borderRight: "1px solid #444",
                  textAlign: "center",
                }}
              >
                จำนวนชนะ
              </th>
              <th
                style={{
                  padding: "12px 10px",
                  borderRight: "1px solid #444",
                  textAlign: "center",
                }}
              >
                คะแนน
              </th>
              <th
                style={{
                  padding: "12px 10px",
                  borderRight: "1px solid #444",
                  textAlign: "center",
                }}
              >
                Total (บาท)
              </th>
              {isAdmin && (
                <th style={{ padding: "12px 10px", textAlign: "center" }}>
                  จ่ายแล้ว
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {Object.keys(memberCalculations).length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? "11" : "10"}
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#777",
                  }}
                >
                  {isDataCalculated
                    ? "ไม่มีข้อมูลการคำนวณ"
                    : "กรุณากรอกค่าใช้จ่ายแล้วกด 'คำนวณค่าใช้จ่าย' เพื่อดูรายละเอียด"}
                </td>
              </tr>
            ) : (
              sortedMembers.map((member, index) => (
                <tr
                  key={member.name || index}
                  style={{
                    borderBottom: "1px solid #eee",
                    backgroundColor: index === 0 ? "#FFFACD" : "inherit", // Highlight MVP row with a light yellow/gold
                  }}
                >
                  <td
                    style={{
                      padding: "10px",
                      borderRight: "1px solid #eee",
                      textAlign: "center",
                    }}
                  >
                    {index + 1}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderRight: "1px solid #eee",
                      textAlign: "left",
                      fontWeight: "bold",
                    }}
                  >
                    {index === 0 && ( // Add MVP text for the first player
                      <span
                        style={{
                          color: "#DAA520", // Goldenrod color for MVP
                          marginRight: "5px",
                          fontWeight: "bold",
                        }}
                      >
                        MVP ✨{" "}
                      </span>
                    )}
                    {member.name}
                    {member.level ? ` (${member.level})` : ""}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderRight: "1px solid #eee",
                      textAlign: "center",
                    }}
                  >
                    {member.totalGames}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderRight: "1px solid #eee",
                      textAlign: "center",
                    }}
                  >
                    {member.totalBalls}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderRight: "1px solid #eee",
                      textAlign: "center",
                    }}
                  >
                    {member.ballCost}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderRight: "1px solid #eee",
                      textAlign: "center",
                    }}
                  >
                    {member.courtCostPerPerson}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderRight: "1px solid #eee",
                      textAlign: "center",
                    }}
                  >
                    {member.organizeFeePerPerson}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderRight: "1px solid #eee",
                      textAlign: "center",
                    }}
                  >
                    {member.wins}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderRight: "1px solid #eee",
                      textAlign: "center",
                    }}
                  >
                    {member.score}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderRight: "1px solid #eee",
                      textAlign: "center",
                      fontWeight: "bold",
                      color: "#e63946",
                    }}
                  >
                    {member.total}
                  </td>
                  {isAdmin && (
                    <td
                      style={{
                        padding: "10px",
                        textAlign: "center",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={memberPaidStatus[member.name] || false}
                        onChange={(e) =>
                          handlePaidStatusChange(member.name, e.target.checked)
                        }
                        style={{ cursor: "pointer", transform: "scale(1.2)" }}
                      />
                    </td>
                  )}
                </tr>
              ))
            )}
            {Object.keys(memberCalculations).length > 0 && (
              <tr style={{ backgroundColor: "#f0f0f0", fontWeight: "bold" }}>
                <td
                  colSpan={isAdmin ? "10" : "9"}
                  style={{
                    padding: "10px",
                    textAlign: "right",
                    borderRight: "1px solid #eee",
                  }}
                >
                  Total All:
                </td>
                <td
                  style={{
                    padding: "10px",
                    textAlign: "center",
                    color: "#e63946",
                  }}
                >
                  {Math.ceil(
                    Object.values(memberCalculations).reduce(
                      (sum, m) => sum + m.total,
                      0
                    )
                  )}
                </td>
                {isAdmin && (
                  <td style={{ padding: "10px", textAlign: "center" }}></td>
                )}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3
        style={{
          fontSize: "18px",
          marginBottom: "15px",
          borderBottom: "1px solid #eee",
          paddingBottom: "10px",
          marginTop: "30px",
        }}
      >
        รายละเอียดเกม:
      </h3>
      <div
        style={{
          overflowX: "auto",
          marginBottom: "30px",
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
          backgroundColor: "#fff",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#323943", color: "white" }}>
              <th
                style={{
                  padding: "12px 10px",
                  borderRight: "1px solid #444",
                  textAlign: "center",
                }}
              >
                No.
              </th>
              <th
                style={{
                  padding: "12px 10px",
                  borderRight: "1px solid #444",
                  textAlign: "center",
                }}
              >
                Match ID
              </th>
              <th
                style={{
                  padding: "12px 10px",
                  borderRight: "1px solid #444",
                  textAlign: "center",
                }}
              >
                สนาม
              </th>
              <th
                style={{
                  padding: "12px 10px",
                  borderRight: "1px solid #444",
                  textAlign: "center",
                }}
              >
                ทีม A
              </th>
              <th
                style={{
                  padding: "12px 10px",
                  borderRight: "1px solid #444",
                  textAlign: "center",
                }}
              >
                ทีม B
              </th>
              <th
                style={{
                  padding: "12px 10px",
                  borderRight: "1px solid #444",
                  textAlign: "center",
                }}
              >
                ลูกที่ใช้
              </th>
              <th
                style={{
                  padding: "12px 10px",
                  borderRight: "1px solid #444",
                  textAlign: "center",
                }}
              >
                ผล
              </th>
              <th style={{ padding: "12px 10px", textAlign: "center" }}>
                Score
              </th>
            </tr>
          </thead>
          <tbody>
            {matchData.matches && matchData.matches.length > 0 ? (
              matchData.matches.map((game, index) => (
                <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                  <td
                    style={{
                      padding: "10px",
                      borderRight: "1px solid #eee",
                      textAlign: "center",
                    }}
                  >
                    {index + 1}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderRight: "1px solid #eee",
                      textAlign: "center",
                    }}
                  >
                    {game.matchId || ""}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderRight: "1px solid #eee",
                      textAlign: "center",
                    }}
                  >
                    {game.court || ""}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderRight: "1px solid #eee",
                      textAlign: "center",
                    }}
                  >
                    {game.A1 || ""}, {game.A2 || ""}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderRight: "1px solid #eee",
                      textAlign: "center",
                    }}
                  >
                    {game.B1 || ""}, {game.B2 || ""}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderRight: "1px solid #eee",
                      textAlign: "center",
                    }}
                  >
                    {game.balls || ""}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderRight: "1px solid #eee",
                      textAlign: "center",
                    }}
                  >
                    {game.result || ""}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {game.score || ""}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="8"
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#777",
                  }}
                >
                  ไม่มีรายละเอียดเกมใน Match นี้.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        @keyframes spinner {
          to {
            transform: rotate(360deg);
          }
        }
        .spinner {
          display: inline-block;
          width: 1em;
          height: 1em;
          vertical-align: middle;
          border: 0.15em solid currentColor;
          border-right-color: transparent;
          border-radius: 50%;
          animation: spinner 0.75s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default MatchDetails;

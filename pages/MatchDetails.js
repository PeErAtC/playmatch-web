// pages/MatchDetails.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { db } from "../lib/firebaseConfig"; // ตรวจสอบเส้นทางให้ถูกต้อง
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp, // <--- เพิ่ม import serverTimestamp
  setDoc, // <--- เพิ่ม import setDoc สำหรับการสร้างหรืออัปเดตเอกสารโดยใช้ ID ที่กำหนดเอง
} from "firebase/firestore";
import Swal from "sweetalert2";

// ฟังก์ชัน Helper สำหรับ Format วันที่
const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) {
      return dateString;
    }
    return `${d.getDate().toString().padStart(2, "0")}/${(
      d.getMonth() + 1
    ).toString().padStart(2, "0")}/${d.getFullYear()}`;
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
  const [ballPrice, setBallPrice] = useState("");
  const [organizeFee, setOrganizeFee] = useState(""); // <--- เพิ่ม state สำหรับค่าจัดก๊วน
  const [memberCalculations, setMemberCalculations] = useState({});
  const [loggedInEmail, setLoggedInEmail] = useState("");
  const [isDataCalculated, setIsDataCalculated] = useState(false);
  const [isUpdatingMembers, setIsUpdatingMembers] = useState(false);
  const [membersData, setMembersData] = useState({});
  const [isSavingRanking, setIsSavingRanking] = useState(false); // <--- New state for saving ranking

  // ดึง email ของผู้ใช้ที่เข้าสู่ระบบจาก localStorage เมื่อ component โหลดครั้งแรก
  useEffect(() => {
    if (typeof window !== "undefined") {
      setLoggedInEmail(localStorage.getItem("loggedInEmail") || "");
    }
  }, []);

  // ฟังก์ชันสำหรับคำนวณค่าใช้จ่ายและสถิติผู้เล่น
  const calculateMemberStats = useCallback(
    (currentMatchData, currentCourtFee, currentBallPrice, currentOrganizeFee, currentMembersData) => { // <--- เพิ่ม currentOrganizeFee
      if (
        !currentMatchData ||
        !currentCourtFee ||
        !currentBallPrice ||
        !currentOrganizeFee || // <--- ตรวจสอบ organizeFee ด้วย
        currentMatchData.matches.length === 0
      ) {
        setMemberCalculations({});
        setIsDataCalculated(false);
        return;
      }

      const parsedCourtFee = parseFloat(currentCourtFee);
      const parsedBallPrice = parseFloat(currentBallPrice);
      const parsedOrganizeFee = parseFloat(currentOrganizeFee); // <--- แปลง organizeFee เป็น float

      if (
        isNaN(parsedCourtFee) ||
        isNaN(parsedBallPrice) ||
        isNaN(parsedOrganizeFee) || // <--- ตรวจสอบ organizeFee ด้วย
        parsedCourtFee < 0 ||
        parsedBallPrice < 0 ||
        parsedOrganizeFee < 0 // <--- ตรวจสอบ organizeFee ด้วย
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

      playersInMatch.forEach((player) => {
        tempMemberCalculations[player] = {
          totalGames: 0,
          totalBalls: 0,
          wins: currentMembersData[player]?.wins || 0,
          score: currentMembersData[player]?.score || 0,
          ballCost: 0,
          courtCostPerPerson: 0,
          organizeFeePerPerson: parsedOrganizeFee, // <--- เพิ่มค่าจัดก๊วนต่อคน
          total: 0,
          calculatedWins: 0,
          calculatedScore: 0,
        };
        memberWinsInMatch[player] = 0;
        memberGamesPlayed[player] = 0;
        memberBallsUsed[player] = 0;
      });

      currentMatchData.matches.forEach((game) => {
        const teamA = [game.A1, game.A2].filter(Boolean);
        const teamB = [game.B1, game.B2].filter(Boolean);

        const allPlayersInGame = [...teamA, ...teamB];

        allPlayersInGame.forEach((player) => {
          memberGamesPlayed[player] = (memberGamesPlayed[player] || 0) + 1;
          memberBallsUsed[player] =
            (memberBallsUsed[player] || 0) + (parseInt(game.balls) || 0);
        });

        if (game.result === "A") {
          teamA.forEach(
            (player) => (memberWinsInMatch[player] = (memberWinsInMatch[player] || 0) + 1)
          );
        } else if (game.result === "B") {
          teamB.forEach(
            (player) => (memberWinsInMatch[player] = (memberWinsInMatch[player] || 0) + 1)
          );
        }
      });

      const totalPlayersForCourtFee = playersInMatch.size;
      const courtCostPerPerson =
        totalPlayersForCourtFee > 0
          ? parsedCourtFee / totalPlayersForCourtFee
          : 0;

      playersInMatch.forEach((player) => {
        const ballsUsed = memberBallsUsed[player] || 0;
        const calculatedWins = memberWinsInMatch[player] || 0;
        const totalGames = memberGamesPlayed[player] || 0;

        const ballCost = ballsUsed * parsedBallPrice;
        const calculatedScore = calculatedWins;
        // <--- เพิ่ม organizeFeePerPerson เข้าไปในยอดรวม
        const totalMemberCost = ballCost + courtCostPerPerson + parsedOrganizeFee;

        tempMemberCalculations[player] = {
          name: player,
          totalGames: totalGames,
          totalBalls: ballsUsed,
          wins: currentMembersData[player]?.wins || 0,
          score: currentMembersData[player]?.score || 0,
          ballCost: ballCost,
          courtCostPerPerson: courtCostPerPerson,
          organizeFeePerPerson: parsedOrganizeFee, // <--- เพิ่มค่าจัดก๊วนต่อคนใน object ผลลัพธ์
          total: totalMemberCost,
          calculatedWins: calculatedWins,
          calculatedScore: calculatedScore,
        };
      });

      console.log("Calculated Member Data:", tempMemberCalculations);
      setMemberCalculations(tempMemberCalculations);
      setIsDataCalculated(true);
    },
    []
  );

  // ฟังก์ชันสำหรับดึงรายละเอียด Match และ Members จาก Firebase
  const fetchMatchAndMemberDetails = useCallback(async () => {
    if (!matchId || !loggedInEmail) return;

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
        throw new Error("ไม่พบข้อมูลผู้ใช้. กรุณาเข้าสู่ระบบอีกครั้ง.");
      }

      // 1. ดึงข้อมูล Match
      const matchDocRef = doc(db, `users/${userId}/Matches`, matchId);
      const matchSnap = await getDoc(matchDocRef);

      if (!matchSnap.exists()) {
        setError("ไม่พบข้อมูล Match นี้.");
        setLoading(false);
        return;
      }
      const data = matchSnap.data();
      setMatchData(data);
      setCourtFee(data.courtFee ? String(data.courtFee) : "");
      setBallPrice(data.ballPrice ? String(data.ballPrice) : "");
      setOrganizeFee(data.organizeFee ? String(data.organizeFee) : ""); // <--- ดึงค่าจัดก๊วนจาก matchData

      // 2. ดึงข้อมูล Members
      const membersCollectionRef = collection(db, `users/${userId}/Members`);
      const membersSnapshot = await getDocs(membersCollectionRef);
      const fetchedMembersData = {};
      membersSnapshot.forEach((doc) => {
        const memberData = doc.data();
        fetchedMembersData[memberData.name] = {
          id: doc.id,
          ...memberData,
        };
      });
      setMembersData(fetchedMembersData);

      // 3. คำนวณสถิติผู้เล่น (ส่งข้อมูล Members ที่ดึงมาไปด้วย)
      if (data.matches && data.matches.length > 0) {
        calculateMemberStats(
          data,
          data.courtFee || "",
          data.ballPrice || "",
          data.organizeFee || "", // <--- ส่งค่าจัดก๊วนไปยัง calculateMemberStats
          fetchedMembersData
        );
      } else {
        setMemberCalculations({});
        setIsDataCalculated(false);
      }
    } catch (err) {
      console.error("Error fetching match or member details:", err);
      setError("ไม่สามารถดึงรายละเอียด Match หรือสมาชิกได้: " + err.message);
      Swal.fire(
        "ข้อผิดพลาด",
        "ไม่สามารถดึงรายละเอียด Match หรือสมาชิกได้: " + err.message,
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [matchId, loggedInEmail, calculateMemberStats]);

  useEffect(() => {
    fetchMatchAndMemberDetails();
  }, [fetchMatchAndMemberDetails]);

  // ฟังก์ชันสำหรับคำนวณค่าใช้จ่าย (เรียกเมื่อกดปุ่ม)
  const handleCalculateClick = () => {
    if (!matchData) {
      Swal.fire("ข้อผิดพลาด", "ไม่พบข้อมูล Match เพื่อคำนวณ", "error");
      return;
    }
    // ใช้ membersData ที่มีอยู่แล้ว
    calculateMemberStats(matchData, courtFee, ballPrice, organizeFee, membersData); // <--- ส่ง organizeFee
    Swal.fire("คำนวณสำเร็จ", "คำนวณข้อมูลค่าใช้จ่ายแล้ว", "success");
  };

  // NEW: ฟังก์ชันสำหรับบันทึกข้อมูลในตารางลงใน Ranking collection
  const handleSaveToRanking = async () => {
    if (Object.keys(memberCalculations).length === 0) {
      Swal.fire(
        "ข้อมูลไม่เพียงพอ",
        "กรุณาคำนวณค่าใช้จ่ายก่อนบันทึกข้อมูล Ranking",
        "warning"
      );
      return;
    }

    if (!matchData || !matchData.matchDate) {
      Swal.fire(
        "ข้อมูลไม่สมบูรณ์",
        "ไม่พบข้อมูลวันที่ของ Match เพื่อใช้ในการบันทึก Ranking",
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
        throw new Error("ไม่พบข้อมูลผู้ใช้. กรุณาเข้าสู่ระบบอีกครั้ง.");
      }

      // Generate Month-Year ID
      const matchDateObj = new Date(matchData.matchDate);
      if (isNaN(matchDateObj.getTime())) {
        throw new Error("วันที่ของ Match ไม่ถูกต้อง.");
      }
      const monthYearId = `${(matchDateObj.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${matchDateObj.getFullYear()}`;

      const rankingDocRef = doc(db, `users/${userId}/Ranking`, monthYearId);
      const batch = writeBatch(db);

      // Fetch existing ranking data for the month if it exists
      const rankingSnap = await getDoc(rankingDocRef);
      const existingRankingData = rankingSnap.exists()
        ? rankingSnap.data()
        : {};

      Object.values(memberCalculations).forEach((member) => {
        const playerName = member.name;
        const currentWins = existingRankingData[playerName]?.wins || 0;
        const currentScore = existingRankingData[playerName]?.score || 0;
        const currentGames = existingRankingData[playerName]?.totalGames || 0;
        const currentBalls = existingRankingData[playerName]?.totalBalls || 0;

        // Update values by adding the calculated values from the current match
        const newWins = currentWins + member.calculatedWins;
        const newScore = currentScore + member.calculatedScore;
        const newGames = currentGames + member.totalGames;
        const newBalls = currentBalls + member.totalBalls;

        batch.set(
          rankingDocRef,
          {
            [playerName]: {
              wins: newWins,
              score: newScore,
              totalGames: newGames,
              totalBalls: newBalls,
              lastUpdated: serverTimestamp(),
            },
            // Maintain other top-level fields if they exist
            ...(rankingSnap.exists() ? existingRankingData : {}),
            lastUpdatedMonth: serverTimestamp(), // Update a top-level timestamp for the document
          },
          { merge: true } // Use merge to update specific fields without overwriting the entire document
        );
      });

      // Add createdAt timestamp only if it's a new document
      if (!rankingSnap.exists()) {
        batch.set(rankingDocRef, { createdAt: serverTimestamp() }, { merge: true });
      }

      await batch.commit();

      Swal.fire(
        "บันทึกสำเร็จ",
        `ข้อมูล Ranking สำหรับ ${monthYearId} ถูกบันทึกเรียบร้อยแล้ว!`,
        "success"
      );
    } catch (err) {
      console.error("Error saving ranking data:", err);
      Swal.fire(
        "ข้อผิดพลาด",
        "ไม่สามารถบันทึกข้อมูล Ranking ได้: " + err.message,
        "error"
      );
    } finally {
      setIsSavingRanking(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        กำลังโหลดรายละเอียด Match...
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
        ไม่พบข้อมูล Match.
      </div>
    );
  }

  return (
    <div
      style={{ padding: "30px", backgroundColor: "#f7f7f7", minHeight: "100vh" }}
    >
      <h1 style={{ fontSize: "24px", marginBottom: "15px" }}>
        รายละเอียด Match วันที่ {formatDate(matchData.matchDate)}
      </h1>
      <p style={{ fontSize: "16px", marginBottom: "20px", color: "#555" }}>
        หัวเรื่อง: {matchData.topic}
      </p>

      {/* Input ค่าสนามและราคาลูก */}
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
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginBottom: "20px",
            alignItems: "center",
            flexWrap: "wrap", // เพิ่ม flexWrap เพื่อให้ responsive
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
              ค่าสนาม:
            </label>
            <input
              type="number"
              value={courtFee}
              onChange={(e) => setCourtFee(e.target.value)}
              placeholder="ค่าสนาม"
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
          {/* <--- เพิ่มช่องสำหรับค่าจัดก๊วน */}
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
          {/* เพิ่มช่องสำหรับค่าจัดก๊วน ---/> */}
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
              marginLeft: "auto",
            }}
          >
            คำนวณค่าใช้จ่าย
          </button>
        </div>
        {/* NEW: Button to save to Ranking */}
        {isDataCalculated && (
          <div style={{ textAlign: "right", marginTop: "15px" }}>
            <button
              onClick={handleSaveToRanking}
              disabled={isSavingRanking}
              style={{
                backgroundColor: "#28a745",
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
          </div>
        )}
      </div>

      {/* ตารางรายละเอียดผู้เล่นพร้อมค่าใช้จ่าย */}
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
          style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}
        >
          <thead>
            <tr style={{ backgroundColor: "#323943", color: "white" }}>
              <th
                style={{
                  padding: "12px 10px",
                  borderRight: "1px solid #444",
                  textAlign: "left",
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
              </th> {/* <--- เพิ่มหัวข้อ ค่าจัดก๊วน */}
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
                คะแนน (จากชนะ)
              </th>
              <th style={{ padding: "12px 10px", textAlign: "center" }}>
                Total (บาท)
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(memberCalculations).length === 0 ? (
              <tr>
                <td
                  colSpan="10" // <--- เพิ่ม colspan เพราะมีคอลัมน์เพิ่ม
                  style={{ textAlign: "center", padding: "20px", color: "#777" }}
                >
                  {isDataCalculated
                    ? "ไม่มีข้อมูลการคำนวณ"
                    : "กรุณากรอกค่าสนามและราคาลูกละแล้วกด 'คำนวณค่าใช้จ่าย' เพื่อดูรายละเอียด"}
                </td>
              </tr>
            ) : (
              Object.values(memberCalculations)
                .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                .map((member, index) => (
                  <tr
                    key={member.name || index}
                    style={{ borderBottom: "1px solid #eee" }}
                  >
                    <td
                      style={{
                        padding: "10px",
                        borderRight: "1px solid #eee",
                        textAlign: "left",
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
                      {member.name}
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
                      {member.ballCost.toFixed(2)}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        borderRight: "1px solid #eee",
                        textAlign: "center",
                      }}
                    >
                      {member.courtCostPerPerson.toFixed(2)}
                    </td>
                    {/* <--- เพิ่มคอลัมน์ ค่าจัดก๊วน */}
                    <td
                      style={{
                        padding: "10px",
                        borderRight: "1px solid #eee",
                        textAlign: "center",
                      }}
                    >
                      {member.organizeFeePerPerson.toFixed(2)}
                    </td>
                    {/* เพิ่มคอลัมน์ ค่าจัดก๊วน ---/> */}
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
                        textAlign: "center",
                        fontWeight: "bold",
                        color: "#e63946",
                      }}
                    >
                      {member.total.toFixed(2)}
                    </td>
                  </tr>
                ))
            )}
            {Object.keys(memberCalculations).length > 0 && (
              <tr style={{ backgroundColor: "#f0f0f0", fontWeight: "bold" }}>
                <td
                  colSpan="9" // <--- เพิ่ม colspan เพราะมีคอลัมน์เพิ่ม
                  style={{
                    padding: "10px",
                    textAlign: "right",
                    borderRight: "1px solid #eee",
                  }}
                >
                  Total All:
                </td>
                <td
                  style={{ padding: "10px", textAlign: "center", color: "#e63946" }}
                >
                  {Object.values(memberCalculations)
                    .reduce((sum, m) => sum + m.total, 0)
                    .toFixed(2)}
                </td>
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
          style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}
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
                  style={{ textAlign: "center", padding: "20px", color: "#777" }}
                >
                  ไม่มีรายละเอียดเกมใน Match นี้.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ textAlign: "right", marginTop: "20px" }}>
        <button
          onClick={() => router.back()}
          style={{
            backgroundColor: "#6c757d",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "5px",
            border: "none",
            cursor: "pointer",
            fontSize: "15px",
          }}
        >
          กลับ
        </button>
      </div>

      {/* เพิ่ม CSS keyframe สำหรับ animation spin (ถ้ายังไม่มี) */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spinner {
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top: 2px solid #fff;
          width: 16px;
          height: 16px;
          -webkit-animation: spin 1s linear infinite;
          animation: spin 1s linear infinite;
          display: inline-block;
          vertical-align: middle;
          margin-right: 5px;
        }
      `}</style>
    </div>
  );
};

export default MatchDetails;

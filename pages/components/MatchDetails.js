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
  writeBatch, // ใช้ writeBatch สำหรับการอัปเดตหลายเอกสารพร้อมกัน
  // setDoc, // ลบ setDoc ออก เนื่องจากไม่ต้องการบันทึกข้อมูล Match แล้ว
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
  const { matchId } = router.query; // รับ matchId จาก URL query
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courtFee, setCourtFee] = useState(""); // ค่าสนาม (เก็บใน state)
  const [ballPrice, setBallPrice] = useState(""); // ราคาลูกละ (เก็บใน state)
  const [memberCalculations, setMemberCalculations] = useState({});
  const [loggedInEmail, setLoggedInEmail] = useState("");
  const [isDataCalculated, setIsDataCalculated] = useState(false); // สถานะว่าคำนวณข้อมูลแล้วหรือยัง
  const [isUpdatingMembers, setIsUpdatingMembers] = useState(false); // สถานะกำลังอัปเดต Member

  // ดึง email ของผู้ใช้ที่เข้าสู่ระบบจาก localStorage เมื่อ component โหลดครั้งแรก
  useEffect(() => {
    if (typeof window !== "undefined") {
      setLoggedInEmail(localStorage.getItem("loggedInEmail") || "");
    }
  }, []);

  // ฟังก์ชันสำหรับดึงรายละเอียด Match จาก Firebase
  const fetchMatchDetails = useCallback(async () => {
    // หยุดทำงานถ้าไม่มี matchId หรือ loggedInEmail
    if (!matchId || !loggedInEmail) return;

    setLoading(true);
    setError(null);
    try {
      // 1. ค้นหา userId จาก email ของผู้ใช้ที่เข้าสู่ระบบ
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

      // 2. ดึงข้อมูล Match โดยใช้ userId และ matchId
      const matchDocRef = doc(db, `users/${userId}/Matches`, matchId);
      const matchSnap = await getDoc(matchDocRef);

      if (matchSnap.exists()) {
        const data = matchSnap.data();
        setMatchData(data);
        // ไม่โหลด memberCalculations, courtFee, ballPrice จาก matchData อีกต่อไป
        setIsDataCalculated(false); // ตั้งค่าเริ่มต้นให้ยังไม่ได้คำนวณ
        setMemberCalculations({}); // เคลียร์ค่าเดิม
        setCourtFee(""); // เคลียร์ค่า input
        setBallPrice(""); // เคลียร์ค่า input
      } else {
        setError("ไม่พบข้อมูล Match นี้.");
      }
    } catch (err) {
      console.error("Error fetching match details:", err);
      setError("ไม่สามารถดึงรายละเอียด Match ได้: " + err.message);
      Swal.fire(
        "ข้อผิดพลาด",
        "ไม่สามารถดึงรายละเอียด Match ได้: " + err.message,
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [matchId, loggedInEmail]);

  // เรียก fetchMatchDetails เมื่อ component โหลดหรือ matchId/loggedInEmail เปลี่ยน
  useEffect(() => {
    fetchMatchDetails();
  }, [fetchMatchDetails]);

  // ฟังก์ชันสำหรับคำนวณค่าใช้จ่าย (จะไม่บันทึกลงใน Match document แล้ว)
  const calculateCosts = async () => {
    // ตรวจสอบว่ามีข้อมูล Match และค่าสนาม/ราคาลูกครบถ้วน
    if (!matchData || !courtFee || !ballPrice) {
      Swal.fire(
        "กรุณากรอกข้อมูล",
        "กรุณากรอกค่าสนามและราคาลูกละให้ครบถ้วน",
        "warning"
      );
      return;
    }

    // แปลงค่าจาก string เป็น float
    const parsedCourtFee = parseFloat(courtFee);
    const parsedBallPrice = parseFloat(ballPrice);

    // ตรวจสอบความถูกต้องของข้อมูลตัวเลข
    if (
      isNaN(parsedCourtFee) ||
      isNaN(parsedBallPrice) ||
      parsedCourtFee < 0 ||
      parsedBallPrice < 0
    ) {
      Swal.fire(
        "ข้อมูลไม่ถูกต้อง",
        "ค่าสนามและราคาลูกละต้องเป็นตัวเลขที่ถูกต้องและไม่เป็นค่าลบ",
        "warning"
      );
      return;
    }

    const playersInMatch = new Set(); // Set สำหรับเก็บชื่อผู้เล่นที่ไม่ซ้ำกันทั้งหมดใน Match นี้
    // วนลูปผ่านแต่ละเกมเพื่อรวบรวมผู้เล่นทั้งหมด
    matchData.matches.forEach((game) => {
      if (game.A1) playersInMatch.add(game.A1);
      if (game.A2) playersInMatch.add(game.A2);
      if (game.B1) playersInMatch.add(game.B1);
      if (game.B2) playersInMatch.add(game.B2);
    });

    const tempMemberCalculations = {}; // Object สำหรับเก็บผลการคำนวณชั่วคราว
    const memberWins = {}; // Object สำหรับเก็บจำนวนชนะของแต่ละ Member
    const memberGamesPlayed = {}; // Object สำหรับเก็บจำนวนเกมที่แต่ละ Member เล่น
    const memberBallsUsed = {}; // Object สำหรับเก็บจำนวนลูกที่แต่ละ Member ใช้

    // กำหนดค่าเริ่มต้นสำหรับผู้เล่นทุกคนที่พบใน Match นี้
    playersInMatch.forEach((player) => {
      tempMemberCalculations[player] = {
        totalGames: 0,
        totalBalls: 0,
        wins: 0,
        score: 0, // คะแนน (จากจำนวนชนะ)
        ballCost: 0,
        courtCostPerPerson: 0,
        total: 0,
      };
      memberWins[player] = 0;
      memberGamesPlayed[player] = 0;
      memberBallsUsed[player] = 0;
    });

    // วนลูปผ่านแต่ละเกมเพื่อคำนวณสถิติของผู้เล่นแต่ละคน
    matchData.matches.forEach((game) => {
      const teamA = [game.A1, game.A2].filter(Boolean); // กรองค่าว่าง
      const teamB = [game.B1, game.B2].filter(Boolean); // กรองค่าว่าง

      const allPlayersInGame = [...teamA, ...teamB];

      allPlayersInGame.forEach((player) => {
        memberGamesPlayed[player] = (memberGamesPlayed[player] || 0) + 1; // นับเกมที่เล่น
        memberBallsUsed[player] =
          (memberBallsUsed[player] || 0) + (parseInt(game.balls) || 0); // นับลูกที่ใช้
      });

      // ตรวจสอบผลแพ้ชนะเพื่อเพิ่มจำนวนชนะ
      if (game.result === "A Win") {
        teamA.forEach(
          (player) => (memberWins[player] = (memberWins[player] || 0) + 1)
        );
      } else if (game.result === "B Win") {
        teamB.forEach(
          (player) => (memberWins[player] = (memberWins[player] || 0) + 1)
        );
      }
    });

    // คำนวณค่าใช้จ่ายและยอดรวมสำหรับแต่ละ Member
    const totalPlayersForCourtFee = playersInMatch.size; // จำนวนผู้เล่นทั้งหมดที่หารค่าสนาม
    const courtCostPerPerson =
      totalPlayersForCourtFee > 0 ? parsedCourtFee / totalPlayersForCourtFee : 0;

    playersInMatch.forEach((player) => {
      const ballsUsed = memberBallsUsed[player] || 0;
      const wins = memberWins[player] || 0;
      const totalGames = memberGamesPlayed[player] || 0;

      const ballCost = ballsUsed * parsedBallPrice;
      const totalScore = wins; // คะแนน = จำนวนชนะ (ตามที่คุณระบุ)
      const totalMemberCost = ballCost + courtCostPerPerson;

      // อัปเดตข้อมูลใน tempMemberCalculations
      tempMemberCalculations[player] = {
        name: player, // เพิ่มชื่อสมาชิก
        totalGames: totalGames,
        totalBalls: ballsUsed,
        wins: wins,
        score: totalScore,
        ballCost: ballCost,
        courtCostPerPerson: courtCostPerPerson,
        total: totalMemberCost,
      };
    });

    // อัปเดต state ด้วยผลการคำนวณชั่วคราว
    setMemberCalculations(tempMemberCalculations);
    setIsDataCalculated(true); // ตั้งสถานะว่าคำนวณแล้ว

    Swal.fire("คำนวณสำเร็จ", "คำนวณข้อมูลค่าใช้จ่ายแล้ว", "success");
  };

  // ฟังก์ชันสำหรับอัปเดตสถิติของ Member ใน Collection "Ranking"
  const updateMemberStats = async () => {
    // ตรวจสอบว่ามีการคำนวณข้อมูลแล้วหรือไม่
    if (!isDataCalculated || Object.keys(memberCalculations).length === 0) {
      Swal.fire("แจ้งเตือน", "กรุณาคำนวณค่าใช้จ่ายก่อนอัปเดตข้อมูลสมาชิก", "info");
      return;
    }

    setIsUpdatingMembers(true); // ตั้งสถานะกำลังอัปเดต
    try {
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", loggedInEmail));
      const userSnap = await getDocs(userQuery);
      let userId = null;
      userSnap.forEach((doc) => {
        userId = doc.id;
      });

      if (!userId) throw new Error("ไม่พบข้อมูลผู้ใช้");

      // ชี้ไปที่ collection 'Ranking'
      const rankingCollectionRef = collection(db, `users/${userId}/Ranking`);
      const batch = writeBatch(db); // เริ่มต้น batch operation เพื่ออัปเดตหลายเอกสารพร้อมกัน

      // ดึงข้อมูล Members ทั้งหมดที่เกี่ยวข้อง (ชื่อที่อยู่ใน memberCalculations) เพื่อตรวจสอบว่ามีอยู่แล้วหรือไม่
      const memberNames = Object.keys(memberCalculations);
      const qMembers = query(rankingCollectionRef, where("name", "in", memberNames));
      const membersSnapshot = await getDocs(qMembers);

      const existingMembers = {};
      membersSnapshot.forEach((doc) => {
        existingMembers[doc.data().name] = { id: doc.id, data: doc.data() };
      });

      // วนลูปผ่านผลการคำนวณของแต่ละ Member เพื่ออัปเดตข้อมูล
      for (const memberName in memberCalculations) {
        const calculatedData = memberCalculations[memberName];
        const memberDocRef = existingMembers[memberName]
          ? doc(rankingCollectionRef, existingMembers[memberName].id) // ถ้าพบ Member เดิม ใช้อ้างอิงเอกสารเดิม
          : doc(rankingCollectionRef); // ถ้าไม่พบ Member ให้สร้างเอกสารใหม่พร้อม ID อัตโนมัติ

        // กำหนดค่าเริ่มต้นถ้ายังไม่มีฟิลด์ score หรือ totalWins
        const currentScore = existingMembers[memberName]?.data?.score || 0;
        const currentTotalWins = existingMembers[memberName]?.data?.totalWins || 0;

        // อัปเดตข้อมูล (บวกเพิ่มจากค่าเดิม)
        batch.set(
          memberDocRef,
          {
            name: memberName, // ให้แน่ใจว่ามีชื่อ
            score: currentScore + calculatedData.score, // คะแนนรวม (บวกสะสม)
            totalWins: currentTotalWins + calculatedData.wins, // จำนวนชนะรวม (บวกสะสม)
            // สามารถเพิ่มฟิลด์อื่นๆ ที่คุณต้องการเก็บใน Ranking ได้ที่นี่ เช่น totalGamesPlayed, totalBallsUsed
            // ควรพิจารณาว่าฟิลด์เหล่านี้ควรบวกสะสม หรือเป็นข้อมูลสรุปต่อ Match
          },
          { merge: true }
        ); // ใช้ merge เพื่ออัปเดตเฉพาะฟิลด์ที่ระบุ โดยไม่เขียนทับข้อมูลอื่นๆ
      }

      // แสดง SweetAlert2 กำลังอัปเดต
      await Swal.fire({
        title: "กำลังอัปเดตข้อมูลสมาชิก",
        text: "กรุณารอสักครู่...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });
      await batch.commit(); // ยืนยันการเปลี่ยนแปลงทั้งหมดใน batch
      Swal.fire("อัปเดตสำเร็จ", "ข้อมูลสมาชิกได้รับการอัปเดตแล้ว", "success");
    } catch (err) {
      console.error("Error updating member stats:", err);
      Swal.fire("ข้อผิดพลาด", "ไม่สามารถอัปเดตข้อมูลสมาชิกได้: " + err.message, "error");
    } finally {
      setIsUpdatingMembers(false); // ตั้งสถานะสิ้นสุดการอัปเดต
    }
  };

  // ส่วนของการแสดงผล: Loading State
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        กำลังโหลดรายละเอียด Match...
      </div>
    );
  }

  // ส่วนของการแสดงผล: Error State
  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "50px", color: "red" }}>
        {error}
      </div>
    );
  }

  // ส่วนของการแสดงผล: No Match Data
  if (!matchData) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        ไม่พบข้อมูล Match.
      </div>
    );
  }

  // ส่วนของการแสดงผลหลัก
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
          <button
            onClick={calculateCosts} // เรียกใช้ calculateCosts แทน calculateAndSaveCosts
            style={{
              backgroundColor: "#007bff",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "5px",
              border: "none",
              cursor: "pointer",
              fontSize: "15px",
              marginLeft: "auto", // จัดปุ่มไปทางขวา
            }}
          >
            คำนวณค่าใช้จ่าย
          </button>
        </div>
        {/* แสดงปุ่มอัปเดตสมาชิกเมื่อมีการคำนวณข้อมูลแล้ว */}
        {isDataCalculated && (
          <div style={{ textAlign: "right" }}>
            <button
              onClick={updateMemberStats}
              disabled={isUpdatingMembers} // ปิดใช้งานปุ่มขณะกำลังอัปเดต
              style={{
                backgroundColor: "#28a745",
                color: "#fff",
                padding: "10px 20px",
                borderRadius: "5px",
                border: "none",
                cursor: "pointer",
                fontSize: "15px",
                opacity: isUpdatingMembers ? 0.7 : 1, // ลดความทึบแสงเมื่อปิดใช้งาน
              }}
            >
              {isUpdatingMembers ? "กำลังอัปเดต..." : "อัปเดตคะแนนและจำนวนชนะสมาชิก"}
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
                ราคาลูกละ
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
            {/* แสดงข้อความหากไม่มีข้อมูลการคำนวณ หรือยังไม่ได้คำนวณ */}
            {Object.keys(memberCalculations).length === 0 ? (
              <tr>
                <td
                  colSpan="9"
                  style={{ textAlign: "center", padding: "20px", color: "#777" }}
                >
                  {isDataCalculated
                    ? "ไม่มีข้อมูลการคำนวณ"
                    : "กรุณากรอกค่าสนามและราคาลูกละแล้วกด 'คำนวณค่าใช้จ่าย' เพื่อดูรายละเอียด"}
                </td>
              </tr>
            ) : (
              // วนลูปแสดงข้อมูล Member ที่คำนวณได้
              Object.values(memberCalculations)
                .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                .map((member, index) => (
                  <tr key={member.name || index} style={{ borderBottom: "1px solid #eee" }}>
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
                    {/* แก้ไขส่วนนี้: ใช้ ballPrice จาก state และแปลงเป็น float เพื่อแสดงผล */}
                    <td
                      style={{
                        padding: "10px",
                        borderRight: "1px solid #eee",
                        textAlign: "center",
                      }}
                    >
                      {parseFloat(ballPrice || 0).toFixed(2)}
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
            {/* Row สำหรับ Total All (เฉพาะเมื่อมีการคำนวณ) */}
            {Object.keys(memberCalculations).length > 0 && (
              <tr style={{ backgroundColor: "#f0f0f0", fontWeight: "bold" }}>
                <td
                  colSpan="8"
                  style={{ padding: "10px", textAlign: "right", borderRight: "1px solid #eee" }}
                >
                  Total All:
                </td>
                <td
                  style={{ padding: "10px", textAlign: "center", color: "#e63946" }}
                >
                  {/* คำนวณผลรวมของ Total ทั้งหมด */}
                  {Object.values(memberCalculations)
                    .reduce((sum, m) => sum + m.total, 0)
                    .toFixed(2)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ตารางรายละเอียด Match แต่ละเกม (จาก match.matches) */}
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
              <th
                style={{ padding: "12px 10px", textAlign: "center" }}
              >
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
      {/* ปุ่มกลับ */}
      <div style={{ textAlign: "right", marginTop: "20px" }}>
        <button
          onClick={() => router.back()} // กลับไปหน้าเดิม
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
    </div>
  );
};

export default MatchDetails;

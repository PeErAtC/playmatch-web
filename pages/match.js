import { useState, useEffect } from 'react';
import Sidebar from './components/sidebar'; // Sidebar Component
import { db } from '../lib/firebaseConfig';
import { collection, getDocs, setDoc, doc, query, where } from 'firebase/firestore';
import Swal from 'sweetalert2';

const Match = () => {
  const [members, setMembers] = useState([]); 
  const [matches, setMatches] = useState([]);
  const [searchDate, setSearchDate] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [teamAssignment, setTeamAssignment] = useState({ A: [], B: [] });
  const [searchPlayer, setSearchPlayer] = useState('');
  const [courtNumber, setCourtNumber] = useState('');
  const [shuttleCount, setShuttleCount] = useState('');
  const [organizer] = useState('');
  const [matchType, setMatchType] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState('');

  useEffect(() => {
    fetchMatches();
  }, [searchDate]);

  useEffect(() => {
    const username = localStorage.getItem('loggedInUsername');
    setLoggedInUsername(username); // Setting the logged-in username
  }, []);

  // Fetch members from Firestore (users/{userId}/Members)
  const fetchMembers = async () => {
    const userId = "currentUserId"; // Replace with the actual logged-in userId
    const membersRef = collection(db, `users/${userId}/Members`);
    const snapshot = await getDocs(membersRef);
    const memberData = [];

    snapshot.forEach(doc => {
      memberData.push({ memberId: doc.id, ...doc.data() });
    });

    setMembers(memberData); // Setting all members in state
  };

  const fetchMatches = async () => {
    const q = query(collection(db, 'Matches'), where('date', '==', searchDate));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setMatches(data);
  };

  const toggleSelectPlayer = (player) => {
    if (selectedPlayers.find(p => p.memberId === player.memberId)) {
      setSelectedPlayers(selectedPlayers.filter(p => p.memberId !== player.memberId));
      setTeamAssignment({
        A: teamAssignment.A.filter(p => p.memberId !== player.memberId),
        B: teamAssignment.B.filter(p => p.memberId !== player.memberId),
      });
    } else {
      setSelectedPlayers([...selectedPlayers, player]);
    }
  };

  const assignToTeam = (player, team) => {
    setTeamAssignment(prev => {
      const newTeam = [...prev[team], player];
      const otherTeam = team === 'A' ? 'B' : 'A';
      return {
        [team]: newTeam,
        [otherTeam]: prev[otherTeam].filter(p => p.memberId !== player.memberId)
      };
    });
  };

  const confirmCreateMatch = async () => {
    if (matchType === '1vs1' && selectedPlayers.length !== 2) {
      return Swal.fire('เลือกผู้เล่นให้ครบ 2 คน', '', 'warning');
    }
    if (matchType === '4players' && (teamAssignment.A.length !== 2 || teamAssignment.B.length !== 2)) {
      return Swal.fire('เลือกผู้เล่นให้ครบ 2 คนต่อทีม', '', 'warning');
    }

    const snapshot = await getDocs(collection(db, 'Matches'));
    const newId = `match_${String(snapshot.size + 1).padStart(3, '0')}`;

    const matchData = {
      courtNumber,
      date: searchDate,
      shuttleCount,
      score: '',
      result: '',
      status: 'กำลังแข่ง',
      createdBy: organizer,
    };

    if (matchType === '1vs1') {
      matchData.teamA = { player1: selectedPlayers[0].memberId };
      matchData.teamB = { player1: selectedPlayers[1].memberId };
    } else {
      matchData.teamA = {
        player1: teamAssignment.A[0].memberId,
        player2: teamAssignment.A[1].memberId
      };
      matchData.teamB = {
        player1: teamAssignment.B[0].memberId,
        player2: teamAssignment.B[1].memberId
      };
    }

    try {
      await setDoc(doc(db, 'Matches', newId), matchData);
      Swal.fire('สำเร็จ', 'บันทึกแมตช์แล้ว', 'success');
      setModalOpen(false);
      setSelectedPlayers([]);
      setTeamAssignment({ A: [], B: [] });
      fetchMatches();
    } catch (err) {
      Swal.fire('ผิดพลาด', err.message, 'error');
    }
  };

  const filteredPlayers = members.filter(m =>
    m.name?.toLowerCase().includes(searchPlayer.toLowerCase())
  );

  return (
    <>
      <div className="grid-container">
        <Sidebar />
        <main className="main-content">
          <h2 className="page-title">Match - {loggedInUsername}</h2> {/* Showing logged-in user's username */}
          <div className="controls">
            <input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} />
            <input type="text" placeholder="CSBY/ผู้จัด" value={organizer} disabled />
            <button className="btn green" onClick={() => { setModalOpen(true); setMatchType('1vs1'); fetchMembers(); }}>1 vs 1</button>
            <button className="btn orange" onClick={() => { setModalOpen(true); setMatchType('4players'); fetchMembers(); }}>จับคู่ 4 คน</button>
          </div>

          <table className="match-table">
            <thead>
              <tr>
                <th>Match ID</th><th>court</th><th>A1</th><th>A2</th><th>B1</th><th>B2</th>
                <th>ลูกที่ใช้/เกม</th><th>ผลการแข่งขัน</th><th>score</th><th>status</th>
              </tr>
            </thead>
            <tbody>
              {matches.length === 0 ? (
                <tr><td colSpan="10" style={{ textAlign: 'center' }}>ไม่มีข้อมูลแมตช์</td></tr>
              ) : (
                matches.map(m => (
                  <tr key={m.id} className="fade-in">
                    <td>{m.id}</td><td>{m.courtNumber}</td>
                    <td>{m.teamA?.player1}</td><td>{m.teamA?.player2 || '-'}</td>
                    <td>{m.teamB?.player1}</td><td>{m.teamB?.player2 || '-'}</td>
                    <td>{m.shuttleCount}</td><td>{m.result}</td><td>{m.score}</td>
                    <td>{m.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {modalOpen && (
            <div className="modal">
              <div className="modal-content">
                <h3>สร้างแมตช์: {matchType === '1vs1' ? '1 vs 1' : '4 คน'}</h3>
                <input type="text" placeholder="ค้นหาชื่อผู้เล่น..." value={searchPlayer} onChange={(e) => setSearchPlayer(e.target.value)} />
                <input type="text" placeholder="คอร์ท" value={courtNumber} onChange={(e) => setCourtNumber(e.target.value)} />
                <input type="text" placeholder="ลูกที่ใช้/เกม" value={shuttleCount} onChange={(e) => setShuttleCount(e.target.value)} />

                <div className="player-list">
                  {filteredPlayers.map(p => {
                    const selected = selectedPlayers.some(sp => sp.memberId === p.memberId);

                    return (
                      <label key={p.memberId} className="player-item">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelectPlayer(p)}
                        /> {p.name} ({p.status})
                      </label>
                    );
                  })}
                </div>

                <div className="form-buttons">
                  <button className="btn green" onClick={confirmCreateMatch}>ยืนยัน</button>
                  <button className="btn red" onClick={() => setModalOpen(false)}>ยกเลิก</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <style jsx>{`
        .grid-container {
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 20px;
        }
        .main-content { padding: 70px 20px 20px 20px; font-family: 'Segoe UI', sans-serif; background: #f9f9f9; }
        .page-title { font-size: 24px; font-weight: bold; margin-bottom: 16px; color: #333; }
        .controls { margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .controls input { padding: 8px; border: 1px solid #ccc; border-radius: 6px; min-width: 160px; }
        .btn { padding: 8px 16px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.3s ease; }
        .green { background-color: #4caf50; color: white; }
        .orange { background-color: #ff9800; color: white; }
        .red, .red-selected { background-color: #f44336; color: white; }
        .blue, .blue-selected { background-color: #2196f3; color: white; }
        .red-selected, .blue-selected { box-shadow: 0 0 0 3px rgba(255,255,255,0.6) inset; font-weight: bold; }
        .btn:hover, .mini-btn:hover { opacity: 0.85; }
        .match-table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        th, td { border: 1px solid #eee; padding: 10px; text-align: center; }
        th { background-color: #f0f0f0; color: #333; }
        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); display: flex; justify-content: center; align-items: center; z-index: 10; }
        .modal-content { background: white; padding: 24px; border-radius: 10px; width: 500px; max-height: 90vh; overflow-y: auto; }
        .player-list { margin-top: 10px; max-height: 200px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; border-radius: 6px; background: #fafafa; }
        .player-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .mini-btn { margin-left: 5px; padding: 4px 8px; border-radius: 4px; border: none; cursor: pointer; font-size: 0.8rem; }
        .form-buttons { margin-top: 16px; display: flex; gap: 10px; justify-content: flex-end; }
        .fade-in { animation: fade 0.3s ease-in; }
        @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
};

export default Match;


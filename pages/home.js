import { useState, useEffect } from 'react';
import Sidebar from './components/sidebar'; // นำเข้า Sidebar
import Swal from 'sweetalert2';
import { db } from '../lib/firebaseConfig';
import { collection, getDocs, setDoc, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

const Home = () => {
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [lineId, setLineId] = useState('');
  const [handed, setHanded] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [experience, setExperience] = useState('');
  const [status, setStatus] = useState('');
  const [members, setMembers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState('');

  // Fetch logged-in user details
  const fetchUsername = async () => {
    const email = localStorage.getItem('loggedInEmail');
    if (email) {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          setLoggedInUsername(data.username);
        });
      } catch (error) {
        console.error("Error fetching username: ", error);
      }
    }
  };

  useEffect(() => {
    fetchUsername();
    fetchMembers();
  }, []);

  const generateMemberId = (index) => {
    return `member_${String(index).padStart(3, '0')}`;
  };

  const fetchMembers = async () => {
    try {
      const email = localStorage.getItem('loggedInEmail');
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach(async (doc) => {
        const userId = doc.id;
        const membersRef = collection(db, `users/${userId}/Members`); // Accessing subcollection Members under user
        const membersSnapshot = await getDocs(membersRef);
        const membersData = membersSnapshot.docs.map(doc => doc.data());
        setMembers(membersData);
      });
    } catch (error) {
      Swal.fire('เกิดข้อผิดพลาดในการโหลดข้อมูลสมาชิก', error.message, 'error');
    }
  };

  const handleSelectUser = (user) => {
    if (selectedUser && selectedUser.memberId === user.memberId) {
      setSelectedUser(null);  // ถ้าเลือกสมาชิกที่ถูกเลือกอยู่แล้ว ให้ยกเลิกการเลือก
      clearForm();             // รีเซ็ตฟอร์ม
      setIsEditing(false);     // ปิดโหมดแก้ไข
    } else {
      setSelectedUser(user);
      setName(user.name);
      setLevel(user.level);
      setLineId(user.lineId);
      setHanded(user.handed);
      setPhone(user.phone);
      setAge(user.age);
      setExperience(user.experience);
      setStatus(user.status);
      setIsEditing(true);      // เปิดโหมดแก้ไข
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newUser = { name, level, lineId, handed, phone, age, experience, status, createBy: loggedInUsername };

    if (!name || !level || !lineId || !handed || !phone || !age || !experience || !status) {
      Swal.fire('กรุณากรอกข้อมูลให้ครบทุกช่อง', '', 'warning');
      return;
    }

    try {
      const email = localStorage.getItem('loggedInEmail');
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach(async (docSnapshot) => {
        const userId = docSnapshot.id;
        const memberId = selectedUser ? selectedUser.memberId : generateMemberId(members.length + 1);

        if (isEditing) {
          const memberRef = doc(db, `users/${userId}/Members/${selectedUser.memberId}`);
          await updateDoc(memberRef, {
            ...newUser,
            updatedAt: new Date(),
          });

          Swal.fire('สำเร็จ!', 'แก้ไขข้อมูลสมาชิกสำเร็จ!', 'success');
        } else {
          const memberRef = doc(db, `users/${userId}/Members/${memberId}`);
          await setDoc(memberRef, {
            ...newUser,
            memberId,
            createdAt: new Date(),
          });

          Swal.fire('สำเร็จ!', 'เพิ่มสมาชิกสำเร็จ!', 'success');
        }

        clearForm();
        fetchMembers(); // Reload members after adding or editing
      });
    } catch (error) {
      Swal.fire('เกิดข้อผิดพลาด', error.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (selectedUser) {
      const result = await Swal.fire({
        title: `ลบสมาชิก ${selectedUser.name}?`,
        text: 'คุณต้องการลบสมาชิกนี้จริงหรือไม่?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ลบ',
        cancelButtonText: 'ยกเลิก',
      });

      if (!result.isConfirmed) return;

      try {
        const email = localStorage.getItem('loggedInEmail');
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach(async (docSnapshot) => {
          const userId = docSnapshot.id;
          const memberRef = doc(db, `users/${userId}/Members/${selectedUser.memberId}`);
          
          await deleteDoc(memberRef);
          Swal.fire('ลบสำเร็จ!', '', 'success');
        });

        clearForm();
        fetchMembers(); // Reload members after delete
      } catch (error) {
        Swal.fire('เกิดข้อผิดพลาดในการลบ', error.message, 'error');
      }
    }
  };

  const toggleStatus = async (user) => {
    const newStatus = user.status === 'มา' ? 'ไม่มา' : 'มา';  // เปลี่ยนสถานะ
    try {
      const email = localStorage.getItem('loggedInEmail');
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach(async (docSnapshot) => {
        const userId = docSnapshot.id;
        const memberRef = doc(db, `users/${userId}/Members/${user.memberId}`);
        
        await updateDoc(memberRef, { status: newStatus });
        fetchMembers();  // โหลดข้อมูลสมาชิกใหม่หลังจากการอัปเดตสถานะ
      });
    } catch (error) {
      Swal.fire('เกิดข้อผิดพลาดในการอัปเดตสถานะ', error.message, 'error');
    }
  };

  const clearForm = () => {
    setName('');
    setLevel('');
    setLineId('');
    setHanded('');
    setPhone('');
    setAge('');
    setExperience('');
    setStatus('ไม่มา');  // ตั้งสถานะเริ่มต้นเป็น "ไม่มา"
    setSelectedUser(null);
    setIsEditing(false);
  };

  const filteredMembers = members.filter(user => user.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', height: '100vh' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: '20px', backgroundColor: '#f7f7f7', borderRadius: '8px', overflowY: 'auto' }}>
        <h2 style={{ fontWeight: 'bold', color: '#333', fontSize: '18px', marginBottom: '10px' }}>ยินดีต้อนรับ, {loggedInUsername}</h2><hr />
        <form onSubmit={handleSubmit} className="form-box" noValidate style={{ marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
            <input className="modern-input" type="text" placeholder="ชื่อ" value={name} onChange={(e) => setName(e.target.value)} style={{ borderRadius: '4px' }} />
            <select className="modern-input" value={level} onChange={(e) => setLevel(e.target.value)} style={{ borderRadius: '4px' }}>
              <option value="">เลือกระดับ</option>
              <option value="S">S</option>
              <option value="P-">P-</option>
              <option value="P">P</option>
              <option value="P+/C">P+/C</option>
              <option value="C">C</option>
            </select>
            <input className="modern-input" type="text" placeholder="Line ID" value={lineId} onChange={(e) => setLineId(e.target.value)} style={{ borderRadius: '4px' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
            <select className="modern-input" value={handed} onChange={(e) => setHanded(e.target.value)} style={{ borderRadius: '4px' }}>
              <option value="">เลือกมือ</option>
              <option value="Right">ขวา</option>
              <option value="Left">ซ้าย</option>
            </select>
            <input className="modern-input" type="text" placeholder="เบอร์โทร" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ borderRadius: '4px' }} />
            <input className="modern-input" type="number" placeholder="อายุ" value={age} onChange={(e) => setAge(e.target.value)} style={{ borderRadius: '4px' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
            <select className="modern-input" value={experience} onChange={(e) => setExperience(e.target.value)} style={{ borderRadius: '4px' }}>
              <option value="">ประสบการณ์</option>
              {[...Array(10)].map((_, i) => (
                <option key={i + 1} value={`${i + 1} ปี`}>{i + 1} ปี</option>
              ))}
              <option value=">10 ปี">มากกว่า 10 ปี</option>
            </select>
            <select className="modern-input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ borderRadius: '4px' }}>
              <option value="มา">มา</option>
              <option value="ไม่มา">ไม่มา</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button 
              type="submit" 
              className={`submit-btn ${isEditing ? 'edit' : ''}`} 
              style={{
                backgroundColor: isEditing ? '#ff9800' : '#4bf196', 
                color: 'black',
                padding: '8px 20px', 
                borderRadius: '6px', 
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.3s ease-in-out',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = isEditing ? '#ffa500' : '#3fc57b'}
              onMouseOut={(e) => e.target.style.backgroundColor = isEditing ? '#ff9800' : '#57e497'}
            >
              {isEditing ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้'}
            </button>

            <button 
              type="button" 
              onClick={handleDelete} 
              disabled={!selectedUser} 
              className="delete-btn" 
              style={{
                backgroundColor: '#9e9e9e',
                color: 'white', 
                padding: '8px 20px', 
                borderRadius: '6px', 
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.3s ease-in-out',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#757575'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#9e9e9e'}
            >
              ลบ
            </button>
          </div>
        </form>

        <div className="search-box" style={{ marginBottom: '15px', display: 'flex', justifyContent: 'flex-end' }}>
          <input
            type="text"
            className="modern-input"
            placeholder="ค้นหาผู้ใช้"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '200px', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}  
          />
        </div>

        <table className="user-table" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)' }}>
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2', textAlign: 'center', fontSize: '12px' }}>
              <th>เลือก</th><th>ชื่อ</th><th>ระดับ</th><th>Line ID</th><th>มือ</th><th>เบอร์โทร</th><th>อายุ</th><th>ประสบการณ์</th><th>สถานะ มา-ไม่มา</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map(user => (
              <tr key={user.memberId} style={{ backgroundColor: selectedUser?.memberId === user.memberId ? '#e8f7e8' : '', cursor: 'pointer', transition: 'background-color 0.3s' }}>
                <td style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={selectedUser?.memberId === user.memberId} onChange={() => handleSelectUser(user)} />
                </td>
                <td>{user.name}</td><td>{user.level}</td><td>{user.lineId}</td>
                <td>{user.handed}</td><td>{user.phone}</td><td>{user.age}</td>
                <td>{user.experience}</td>
                <td>
                  <button
                    onClick={() => toggleStatus(user)}
                    style={{
                      backgroundColor: user.status === 'มา' ? 'green' : 'red',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }} >
                    {user.status || 'ไม่ระบุ'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
};

export default Home;

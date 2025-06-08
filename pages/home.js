import { useState, useEffect } from 'react';
import Sidebar from './components/sidebar';
import Swal from 'sweetalert2';
import { db } from '../lib/firebaseConfig';
import { collection, getDocs, setDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

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
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const generateMemberId = (index) => {
    return `member_${String(index).padStart(3, '0')}`;
  };

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "member"));
      const usersData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.memberId || doc.id,
          ...data
        };
      });
      setUsers(usersData);
    } catch (error) {
      Swal.fire('เกิดข้อผิดพลาดในการโหลดข้อมูลสมาชิก', error.message, 'error');
    }
  };

  const handleSelectUser = (user) => {
    if (selectedUser && selectedUser.id === user.id) {
      setSelectedUser(null);
      clearForm();
      setIsEditing(false);
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
      setIsEditing(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newUser = { name, level, lineId, handed, phone, age, experience, status };

    // ✅ ตรวจสอบว่ากรอกข้อมูลครบหรือไม่
    if (!name || !level || !lineId || !handed || !phone || !age || !experience || !status) {
      Swal.fire('กรุณากรอกข้อมูลให้ครบทุกช่อง', '', 'warning');
      return;
    }

    try {
      if (isEditing) {
        const result = await Swal.fire({
          title: `ยืนยันการแก้ไขข้อมูลของผู้ใช้ ${name}?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'ตกลง',
          cancelButtonText: 'ยกเลิก',
        });
        if (!result.isConfirmed) return;

        await updateDoc(doc(db, "member", selectedUser.id), newUser);
        Swal.fire('สำเร็จ!', 'แก้ไขข้อมูลผู้ใช้สำเร็จ!', 'success');
      } else {
        const memberId = generateMemberId(users.length + 1); // เช่น member_001
        await setDoc(doc(db, "member", memberId), {
          ...newUser,
          memberId,
          createdBy: "ไม่มีผู้สร้าง",
          createdAt: new Date()
        });
        Swal.fire('สำเร็จ!', 'เพิ่มผู้ใช้สำเร็จ!', 'success');
      }

      clearForm();
      fetchUsers();
    } catch (error) {
      Swal.fire('เกิดข้อผิดพลาด', error.message, 'error');
    }
  };


  const handleDelete = async () => {
    if (selectedUser) {
      const result = await Swal.fire({
        title: `ลบผู้ใช้ ${selectedUser.name}?`,
        text: 'คุณต้องการลบผู้ใช้นี้จริงหรือไม่?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ลบ',
        cancelButtonText: 'ยกเลิก',
      });
      if (!result.isConfirmed) return;

      try {
        await deleteDoc(doc(db, "member", selectedUser.id));
        Swal.fire('ลบสำเร็จ!', '', 'success');
        clearForm();
        fetchUsers();
      } catch (error) {
        Swal.fire('เกิดข้อผิดพลาดในการลบ', error.message, 'error');
      }
    }
  };

  const toggleStatus = async (user) => {
    const newStatus = user.status === 'มา' ? 'ไม่มา' : 'มา';
    try {
      await updateDoc(doc(db, "member", user.id), { ...user, status: newStatus });
      fetchUsers();
    } catch (error) {
      Swal.fire('เกิดข้อผิดพลาดในการอัปเดตสถานะ', error.message, 'error');
    }
  };

  const clearForm = () => {
    setName(''); setLevel(''); setLineId(''); setHanded(''); setPhone('');
    setAge(''); setExperience(''); setStatus('');
    setSelectedUser(null); setIsEditing(false);
  };

  const filteredUsers = users.filter(user => user.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="container">
        <Sidebar />


        <main className="main-content">
          <h2>users</h2><hr />
          <form onSubmit={handleSubmit} className="form-box" noValidate>
            <input className="modern-input" type="text" placeholder="ชื่อ" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '120px' }} />
            <select className="modern-input" value={level} onChange={(e) => setLevel(e.target.value)} style={{ width: '110px' }}>
              <option value="">เลือกระดับ</option>
              <option value="S">S</option>
              <option value="P-">P-</option>
              <option value="P">P</option>
              <option value="P+/C">P+/C</option>
              <option value="C">C</option>
            </select>
            <input className="modern-input" type="text" placeholder="Line ID" value={lineId} onChange={(e) => setLineId(e.target.value)} style={{ width: '140px' }} />
            <select className="modern-input" value={handed} onChange={(e) => setHanded(e.target.value)} style={{ width: '100px' }}>
              <option value="">เลือกมือ</option>
              <option value="Right">ขวา</option>
              <option value="Left">ซ้าย</option>
            </select>
            <input className="modern-input" type="text" placeholder="เบอร์โทร" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: '140px' }} />
            <input className="modern-input" type="number" placeholder="อายุ" value={age} onChange={(e) => setAge(e.target.value)} style={{ width: '50px' }} />
            <select className="modern-input" value={experience} onChange={(e) => setExperience(e.target.value)} style={{ width: '120px' }}>
              <option value="">ประสบการณ์</option>
              {[...Array(10)].map((_, i) => (
                <option key={i + 1} value={`${i + 1} ปี`}>{i + 1} ปี</option>
              ))}
              <option value=">10 ปี">มากกว่า 10 ปี</option>
            </select>
            <select className="modern-input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '90px' }}>
              <option value="">สถานะ</option>
              <option value="มา">มา</option>
              <option value="ไม่มา">ไม่มา</option>
            </select>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button type="submit" className={`submit-btn ${isEditing ? 'edit' : ''}`}>{isEditing ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้'}</button>
              <button type="button" onClick={handleDelete} disabled={!selectedUser} className="delete-btn">ลบ</button>
            </div>
          </form>

          <div className="search-box">
            <input
              type="text"
              className="modern-input"
              placeholder="ค้นหาผู้ใช้"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '300px' }}  // <-- เพิ่มตรงนี้
            />
          </div>
          <table className="user-table">
            <thead>
              <tr>
                <th></th><th>ชื่อ</th><th>ระดับ</th><th>Line ID</th><th>มือ</th><th>เบอร์โทร</th><th>อายุ</th><th>ประสบการณ์</th><th>สถานะ มา-ไม่มา</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} style={{ backgroundColor: selectedUser?.id === user.id ? '#f0f0f0' : '' }}>
                  <td><input type="checkbox" checked={selectedUser?.id === user.id} onChange={() => handleSelectUser(user)} /></td>
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
                        cursor: 'pointer'
                      }}>
                      {user.status || 'ไม่ระบุ'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>
      </div>

      <style jsx>{`
        .main-content {
        flex-grow: 1; 
        margin-left: 160px; 
        margin-top: 70px;
        }
        .form-box {
          background: #e6f0fd;
          padding: 15px;
          border-radius: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          box-shadow: 0 0 10px rgba(0,0,0,0.05);
        }
        .modern-input {
          padding: 7px 10px;
          border-radius: 6px;
          border: 1px solid #ccc;
          font-size: 0.95rem;
          background-color: #fff;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
        }
        .submit-btn, .delete-btn {
          padding: 6px 12px;
          border-radius: 5px;
          font-size: 0.9rem;
          border: none;
          cursor: pointer;
        }
        .submit-btn { background-color: #0c76ff; color: white; }
        .submit-btn.edit { background-color: #f8b600; }
        .delete-btn { background-color: #f92710; color: white; }
        .search-box {
          margin: 30px 0 15px 0; /* เพิ่มระยะห่างด้านบน */
        }        
        .user-table {
          width: 100%;
          border-collapse: collapse;
        }
        .user-table th {
          background: #ddebfe;
          padding: 8px;
          text-align: left;
        }
        .user-table td {
          padding: 8px;
          border: 1px solid #ddd;
        }
        .user-table th, .user-table td {
          text-align: center;
          vertical-align: middle;
        }
      `}</style>
    </>
  );
};

export default Home;

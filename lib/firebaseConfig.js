// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, serverTimestamp } from 'firebase/firestore'; // เพิ่ม serverTimestamp ที่นี่


// การตั้งค่า Firebase ของคุณ
const firebaseConfig = {
  apiKey: "AIzaSyBcnqc0_pvcQUGWMokx-GoLy3sriO9CG-o",
  authDomain: "playmatch-web.firebaseapp.com",
  projectId: "playmatch-web",
  storageBucket: "playmatch-web.firebasestorage.app",
  messagingSenderId: "406018542975",
  appId: "1:406018542975:web:ad7afeacbb46cc3d4a5e4a",
  measurementId: "G-GYWT56PF9R"
};

// เริ่มต้น Firebase App (ควรอยู่ในไฟล์นี้ครั้งเดียว)
const app = initializeApp(firebaseConfig);

// ส่งออกบริการที่ใช้ในแอปพลิเคชัน
export const auth = getAuth(app);  // Firebase Authentication
export const db = getFirestore(app);  // Firestore
export { serverTimestamp }; // ส่งออก serverTimestamp ด้วย

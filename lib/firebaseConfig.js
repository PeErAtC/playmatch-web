// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBcnqc0_pvcQUGWMokx-GoLy3sriO9CG-o",
  authDomain: "playmatch-web.firebaseapp.com",
  projectId: "playmatch-web",
  storageBucket: "playmatch-web.firebasestorage.app",
  messagingSenderId: "406018542975",
  appId: "1:406018542975:web:ad7afeacbb46cc3d4a5e4a",
  measurementId: "G-GYWT56PF9R"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

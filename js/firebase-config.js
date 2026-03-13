/**
 * WAQTORO — Firebase Configuration
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDBtBrF2Uhlt_08_TT-80LXpjhmoYPS83c",
  authDomain: "waqtoro-8b2d8.firebaseapp.com",
  projectId: "waqtoro-8b2d8",
  storageBucket: "waqtoro-8b2d8.firebasestorage.app",
  messagingSenderId: "367188242571",
  appId: "1:367188242571:web:3adfb3930e4ae9b5e0648e",
  measurementId: "G-HGJTEQ1DLF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };

/**
 * WAQTORO — Lightweight Firebase config for reviews only (Firestore, no Auth)
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDBtBrF2Uhlt_08_TT-80LXpjhmoYPS83c",
  authDomain: "waqtoro-8b2d8.firebaseapp.com",
  projectId: "waqtoro-8b2d8",
  storageBucket: "waqtoro-8b2d8.firebasestorage.app",
  messagingSenderId: "367188242571",
  appId: "1:367188242571:web:3adfb3930e4ae9b5e0648e"
};

const app = initializeApp(firebaseConfig, "reviews");
const db = getFirestore(app);

export { db };

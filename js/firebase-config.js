/**
 * WebPOS Firebase Configuration
 * LOCKED — Jangan ubah struktur, hanya config values kalau pindah project
 */

const firebaseConfig = {
  apiKey: "AIzaSyCSC05MTnaiiSftj1TA-LVCH4ymHBAbkoU",
  authDomain: "hifzicell-v2.firebaseapp.com",
  databaseURL: "https://hifzicell-v2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hifzicell-v2",
  storageBucket: "hifzicell-v2.firebasestorage.app",
  messagingSenderId: "766095621773",
  appId: "1:766095621773:web:da40a79eab0f573683acc4",
  measurementId: "G-N9B9PKFCHT"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export references (global)
const auth = firebase.auth();
const database = firebase.database();

console.log('✅ Firebase initialized (compat v9)');

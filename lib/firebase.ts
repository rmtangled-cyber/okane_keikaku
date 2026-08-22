import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBJGLsMedP9YBSioJKjW76y3HMfGziC6X8",
  authDomain: "okane-kanri-538ad.firebaseapp.com",
  projectId: "okane-kanri-538ad",
  storageBucket: "okane-kanri-538ad.firebasestorage.app",
  messagingSenderId: "1095830022610",
  appId: "1:1095830022610:web:0988377599db2e41fcc00b",
  measurementId: "G-J21XWYPQNX",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);

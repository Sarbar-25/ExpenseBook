import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, orderBy, query, deleteDoc, doc } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCygJMIszE2FfBH_ira102IcHmS_rlNiCg",
    authDomain: "expensebook-edbdc.firebaseapp.com",
    projectId: "expensebook-edbdc",
    storageBucket: "expensebook-edbdc.firebasestorage.app",
    messagingSenderId: "531241741670",
    appId: "1:531241741670:web:fe185526db378b893e2ca7",
    measurementId: "G-34141Y6QCK"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider(); // ✅ FIXED

export { collection, addDoc, getDocs, orderBy, query, deleteDoc, doc };
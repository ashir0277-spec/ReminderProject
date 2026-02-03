// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBoE5ZnqwmDNCgnnBfV0ujyCA5QK4HkDDc",
  authDomain: "practice-project-2ad74.firebaseapp.com",
  projectId: "practice-project-2ad74",
  storageBucket: "practice-project-2ad74.firebasestorage.app",
  messagingSenderId: "320329395785",
  appId: "1:320329395785:web:d678c674cfc7a7eccd5998",
  measurementId: "G-2QGLPJ082K"
};

// 🔹 Primary Firebase App (Admin session)
const app = initializeApp(firebaseConfig);

// 🔹 Secondary Firebase App (User creation – NO session override)
const secondaryApp = initializeApp(firebaseConfig, "Secondary");

// Analytics (optional)
getAnalytics(app);

// 🔐 Auth instances
export const auth = getAuth(app);                    // Admin login auth
export const secondaryAuth = getAuth(secondaryApp);  // Create-user auth

// 🔥 Firestore
export const db = getFirestore(app);

export default app;

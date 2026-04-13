import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyAMiyQTVzxI8pisDXbxCwgfH6mZsybzKOA",
  authDomain: "smartparking-realtime.firebaseapp.com",
  projectId: "smartparking-realtime",
  storageBucket: "smartparking-realtime.firebasestorage.app",
  messagingSenderId: "944561185785",
  appId: "1:944561185785:web:6afbd401903479cc27d328",
  measurementId: "G-CJL1LG3X0N"
}

const app = initializeApp(firebaseConfig)

export const db   = getFirestore(app)  // قاعدة البيانات
export const auth = getAuth(app)       // تسجيل الدخول

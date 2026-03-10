import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCJCwahdfonvYtxdbzKw8Q4MZ-WdUW6M6g",
  authDomain: "meu-horario-app.firebaseapp.com",
  projectId: "meu-horario-app",
  storageBucket: "meu-horario-app.firebasestorage.app",
  messagingSenderId: "478699942785",
  appId: "1:478699942785:web:8fe49a8cf11e37d0d3ae80",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);

// LOGIN GOOGLE
export const loginGoogle = () => signInWithPopup(auth, provider);

// LOGOUT
export const logout = () => signOut(auth);
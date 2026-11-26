import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);

export const watchUser = cb => onAuthStateChanged(auth, cb);
export const login = (e, p) => signInWithEmailAndPassword(auth, e, p);
export const register = (e, p) => createUserWithEmailAndPassword(auth, e, p);
export const logout = () => signOut(auth);

// Đồng bộ sao & tiến độ theo tài khoản: users/{uid}
export async function loadProgress(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : { stars: 0, done: {} };
}
export const saveProgress = (uid, subject, stars) =>
  setDoc(doc(db, "users", uid), { stars: increment(stars), done: { [subject]: increment(1) } }, { merge: true });

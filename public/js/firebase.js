import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  GoogleAuthProvider, signInWithPopup }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, increment, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);

export const watchUser = cb => onAuthStateChanged(auth, cb);
export const login = (e, p) => signInWithEmailAndPassword(auth, e, p);
export const register = (e, p) => createUserWithEmailAndPassword(auth, e, p);
export const loginGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
export const logout = () => signOut(auth);

// Đồng bộ sao & tiến độ theo tài khoản: users/{uid}
export async function loadProgress(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : { stars: 0, done: {} };
}
// Mỗi lượt học lưu 1 dòng lịch sử: { subject, correct, total, ts }
export const saveProgress = (uid, subject, correct, total) =>
  setDoc(doc(db, "users", uid), {
    stars: increment(correct),
    done: { [subject]: increment(1) },
    history: arrayUnion({ subject, correct, total, ts: Date.now() })
  }, { merge: true });
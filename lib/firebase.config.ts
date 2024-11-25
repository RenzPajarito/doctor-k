import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCDrhw7y4bBMct9J7BC9mULZfe0di32LK0",
  authDomain: "exam-quiz-master.firebaseapp.com",
  projectId: "exam-quiz-master",
  storageBucket: "exam-quiz-master.appspot.com",
  messagingSenderId: "282350778503",
  appId: "1:282350778503:web:81810d31561ff33d8fa022",
  measurementId: "G-VP48J9XMXG",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, collection, getDocs, getStorage };

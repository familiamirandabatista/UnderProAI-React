import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: "underproai-react.firebaseapp.com",
  projectId: "underproai-react",
  storageBucket: "underproai-react.appspot.com",
  messagingSenderId: "458703871274",
  appId: "1:458703871274:web:6276a9587c28990e8d5253"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
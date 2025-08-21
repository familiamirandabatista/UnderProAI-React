import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAxKlUFMVhagG4aZvlyzHw6ll40rYo63FQ",
  authDomain: "underproai-final.firebaseapp.com",
  projectId: "underproai-final",
  storageBucket: "underproai-final.firebasestorage.app",
  messagingSenderId: "421575148404",
  appId: "1:421575148404:web:e46a502f95dce7566d2221"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
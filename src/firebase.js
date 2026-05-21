import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBATvPC-5EQzwF321Vt4G0IRS3H3iHIb7g",
  authDomain: "release-helper.firebaseapp.com",
  projectId: "release-helper",
  storageBucket: "release-helper.firebasestorage.app",
  messagingSenderId: "287177019073",
  appId: "1:287177019073:web:f4af8fe3bfefe366654e40",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

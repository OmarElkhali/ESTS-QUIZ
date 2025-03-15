
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Remplacez ces valeurs par celles de votre projet Firebase
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY", // Remplacez par votre clé API
  authDomain: "VOTRE_PROJECT_ID.firebaseapp.com", // Remplacez par votre authDomain
  projectId: "VOTRE_PROJECT_ID", // Remplacez par votre projectId
  storageBucket: "VOTRE_PROJECT_ID.appspot.com", // Remplacez par votre storageBucket
  messagingSenderId: "VOTRE_MESSAGING_SENDER_ID", // Remplacez par votre messagingSenderId
  appId: "VOTRE_APP_ID" // Remplacez par votre appId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;

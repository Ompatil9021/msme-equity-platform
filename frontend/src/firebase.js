import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, serverTimestamp } from 'firebase/firestore'

// Firebase client initialization for Firestore.
// Replace the placeholder values with your Firebase Console config or set them in frontend/.env.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '<YOUR_FIREBASE_API_KEY>',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '<YOUR_FIREBASE_AUTH_DOMAIN>',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '<YOUR_FIREBASE_PROJECT_ID>',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '<YOUR_FIREBASE_STORAGE_BUCKET>',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '<YOUR_FIREBASE_MESSAGING_SENDER_ID>',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '<YOUR_FIREBASE_APP_ID>',
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
const db = getFirestore(app)

export { db, serverTimestamp, firebaseConfig }

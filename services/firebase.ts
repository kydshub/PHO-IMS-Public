
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';
import 'firebase/compat/storage';

// Safely access environment variables
const env = (import.meta as any).env || {};

// Use environment variables for configuration
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
if (!firebase.apps.length) {
  // Only initialize if config is valid to prevent immediate crash on load if env is missing
  if (firebaseConfig.apiKey) {
    firebase.initializeApp(firebaseConfig);
  } else {
    console.error("Firebase Configuration missing. Please check your .env file.");
  }
}

const app = firebase.app();

// Initialize a secondary app for user creation to avoid automatic sign-in
let secondaryApp;
try {
  if (firebaseConfig.apiKey) {
      secondaryApp = firebase.initializeApp(firebaseConfig, 'secondary');
  }
} catch (error: any) {
  if (error.code === 'app/duplicate-app') {
    secondaryApp = firebase.app('secondary');
  } else {
    console.error("Error initializing secondary firebase app", error);
  }
}

// Get a reference to the database service and export it
export const db = app.database();
export const auth = app.auth();
export const storage = app.storage();
export const secondaryAuth = secondaryApp ? secondaryApp.auth() : app.auth(); // Fallback if secondary fails
export default firebase;

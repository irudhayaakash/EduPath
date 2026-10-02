import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.databaseURL && firebaseConfig.projectId && firebaseConfig.appId);
}

let auth: Auth | null = null;
let database: Database | null = null;
let authUser: User | null | undefined;
let authReady: Promise<User | null> | null = null;

export function getFirebaseApp() {
  if (typeof window === "undefined" || !isFirebaseConfigured()) return null;
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!auth) auth = getAuth(app);
  return auth;
}

export function getFirebaseDatabase() {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!database) database = getDatabase(app);
  return database;
}

export function getFirebaseUser() {
  return getFirebaseAuth()?.currentUser ?? null;
}

export async function waitForFirebaseAuth() {
  const instance = getFirebaseAuth();
  if (!instance) return null;
  if (instance.currentUser) {
    authUser = instance.currentUser;
    return authUser;
  }
  if (authReady) return authReady;
  authReady = new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(instance, (user) => {
      authUser = user;
      unsubscribe();
      resolve(user);
    });
  });
  return authReady;
}

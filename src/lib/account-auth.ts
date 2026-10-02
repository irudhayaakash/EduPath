import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { get, ref, remove, set } from "firebase/database";
import { getFirebaseAuth, getFirebaseDatabase } from "./firebase";

export type LocalAccount = {
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
};

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password);
  const salt = new TextEncoder().encode("EduPath-password-verifier-v1");
  const baseKey = await crypto.subtle.importKey("raw", data, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, baseKey, 256);
  return `pbkdf2-sha256$120000$${Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function cleanName(name: string) {
  return name.trim().replace(/[.#$\[\]/]/g, "").replace(/\//g, "-") || "Learner";
}

function userKey(name: string, uid: string) {
  return `${cleanName(name)} (${uid})`;
}

// Set to false to let users sign in without clicking the verification link.
const REQUIRE_EMAIL_VERIFICATION = true;
const INVALID_EMAIL_MESSAGE = "Invalid email. Enter a real, existing email address.";

async function dnsHasRecord(name: string, type: "MX" | "A"): Promise<boolean | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, { signal: controller.signal, headers: { accept: "application/dns-json" } });
    if (!response.ok) return null;
    const data = (await response.json()) as { Status?: number; Answer?: unknown[] };
    if (data.Status === 3) return false; // NXDOMAIN: the domain does not exist
    return Array.isArray(data.Answer) && data.Answer.length > 0;
  } catch {
    return null; // DNS lookup unavailable: do not block the user
  } finally {
    clearTimeout(timer);
  }
}

async function assertRealEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error(INVALID_EMAIL_MESSAGE);
  const domain = email.split("@")[1]!.toLowerCase();
  const mx = await dnsHasRecord(domain, "MX");
  if (mx === null || mx) return;
  const a = await dnsHasRecord(domain, "A");
  if (a === false) throw new Error(INVALID_EMAIL_MESSAGE);
}

function friendlyAuthError(error: unknown, fallback: string) {
  const code = (error as { code?: string })?.code || "";
  const message = error instanceof Error ? error.message : "";
  if (code === "auth/email-already-in-use") return "An account with this email already exists. Sign in instead.";
  if (code === "auth/weak-password") return "Password must contain at least 6 characters.";
  if (code === "auth/invalid-email") return "Enter a valid email address.";
  if (code === "auth/wrong-password") return "Wrong password. Please try again.";
  if (code === "auth/user-not-found") return "No account found with this email. Create an account first.";
  if (code === "auth/invalid-credential" || code === "auth/invalid-login-credentials") return "Wrong password or email. Please check and try again, or create an account if you are new.";
  if (code === "auth/too-many-requests") return "Too many attempts. Please wait a few minutes and try again.";
  if (code === "auth/network-request-failed") return "Network error. Check your internet connection and try again.";
  if (code === "auth/operation-not-allowed") return "Email/Password sign-in is not enabled. Enable it in Firebase Console > Authentication > Sign-in method.";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "Google sign-in was cancelled.";
  if (code === "auth/unauthorized-domain") return "This domain is not authorized in Firebase Console > Authentication > Settings > Authorized domains.";
  if (/permission[_ ]denied/i.test(code) || /permission[_ ]denied/i.test(message)) return "Database permission denied. Publish database.rules.json in Firebase Console > Realtime Database > Rules.";
  return message || fallback;
}

async function saveAccountRecord(user: { uid: string; email: string | null; displayName: string | null; metadata: { creationTime?: string | undefined; lastSignInTime?: string | undefined } }, passwordHash: string | null, authProvider: string) {
  const db = getFirebaseDatabase();
  if (!db) throw new Error("Firebase database is not configured.");
  const name = cleanName(user.displayName || user.email?.split("@")[0] || "Learner");
  const key = userKey(name, user.uid);
  const existingSnap = await get(ref(db, `edupath/users/${key}`));
  const current = existingSnap.exists() ? existingSnap.val() as { profile?: Record<string, unknown>; details?: Record<string, unknown> } : null;
  const currentProfile = current?.profile;
  const existingDetails = current?.details;
  const details = {
    ...(existingDetails || {}),
    dateTime: new Date().toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }),
    deviceType: typeof navigator !== "undefined" && /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "Mobile" : "Desktop",
    deviceModel: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : "Browser",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    lastActive: new Date().toISOString(),
    email: user.email || existingDetails?.email || "",
    passwordHash: passwordHash ?? existingDetails?.passwordHash ?? null,
    authProvider,
    createdAt: existingDetails?.createdAt || user.metadata.creationTime || new Date().toISOString(),
    lastLoginAt: user.metadata.lastSignInTime || new Date().toISOString(),
  };
  const profile = { ...(currentProfile || {}), name, aiCoach: currentProfile?.aiCoach || {} };
  await set(ref(db, `edupath/users/${key}`), { profile, details });
  return { name, email: user.email || "", uid: user.uid, key, lastLoginAt: String(details.lastLoginAt) };
}

export async function createLocalAccount(name: string, email: string, password: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase is not configured. Add the Firebase web configuration first.");
  const cleanEmail = email.trim().toLowerCase();
  await assertRealEmail(cleanEmail);
  try {
    const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
    const passwordHash = await hashPassword(password);
    const record = await saveAccountRecord({ ...credential.user, displayName: name.trim() || credential.user.displayName }, passwordHash, "email");
    let verificationSent = false;
    if (REQUIRE_EMAIL_VERIFICATION) {
      try { await sendEmailVerification(credential.user); verificationSent = true; } catch { /* a new link is sent again at sign-in */ }
      await firebaseSignOut(auth);
    }
    return { ...record, verificationRequired: REQUIRE_EMAIL_VERIFICATION, verificationSent };
  } catch (error) {
    throw new Error(friendlyAuthError(error, "Could not create the account."));
  }
}


export async function resetLocalPassword(email: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase is not configured. Add the Firebase web configuration first.");
  const cleanEmail = email.trim().toLowerCase();
  await assertRealEmail(cleanEmail);
  try {
    await sendPasswordResetEmail(auth, cleanEmail);
  } catch (error) {
    throw new Error(friendlyAuthError(error, "Could not send the password reset email."));
  }
}

export async function signInLocalAccount(email: string, password: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase is not configured. Add the Firebase web configuration first.");
  const cleanEmail = email.trim().toLowerCase();
  await assertRealEmail(cleanEmail);
  try {
    const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    if (REQUIRE_EMAIL_VERIFICATION && !credential.user.emailVerified) {
      let sent = true;
      try { await sendEmailVerification(credential.user); } catch { sent = false; }
      await firebaseSignOut(auth);
      throw new Error(sent ? `Email not verified. We sent a verification link to ${cleanEmail}. Open it, then sign in again.` : "Email not verified. Check your inbox (and spam folder) for the verification link, then sign in again.");
    }
    const passwordHash = await hashPassword(password);
    return await saveAccountRecord(credential.user, passwordHash, "email");
  } catch (error) {
    throw new Error(friendlyAuthError(error, "Could not sign in."));
  }
}

export async function signInWithGoogle() {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase is not configured. Add the Firebase web configuration first.");
  try {
    const credential = await signInWithPopup(auth, new GoogleAuthProvider());
    return await saveAccountRecord(credential.user, null, "google");
  } catch (error) {
    throw new Error(friendlyAuthError(error, "Google sign-in could not be completed."));
  }
}

export async function renameLocalAccount(email: string, name: string) {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!auth || !user || user.email?.toLowerCase() !== email.trim().toLowerCase()) throw new Error("Please sign in again.");
  const oldKey = userKey(user.displayName || user.email?.split("@")[0] || "Learner", user.uid);
  const clean = name.trim();
  if (!clean) throw new Error("Name cannot be empty.");
  await updateProfile(user, { displayName: clean });
  const result = await saveAccountRecord(user, null, "email");
  if (oldKey !== result.key) await remove(ref(getFirebaseDatabase()!, `edupath/users/${oldKey}`));
  return result;
}

export async function changeLocalPassword(email: string, currentPassword: string, newPassword: string) {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!auth || !user || user.email?.toLowerCase() !== email.trim().toLowerCase()) throw new Error("Please sign in again.");
  if (!currentPassword) throw new Error("Current password is incorrect.");
  if (user.providerData.some((provider) => provider.provider === "password")) {
    try {
      const credential = EmailAuthProvider.credential(email.trim().toLowerCase(), currentPassword);
      await reauthenticateWithCredential(user, credential);
    } catch {
      throw new Error("Current password is incorrect.");
    }
  }
  try {
    await updatePassword(user, newPassword);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "auth/requires-recent-login") throw new Error("Please sign out and sign in again before changing your password.");
    throw error;
  }
  return saveAccountRecord(user, await hashPassword(newPassword), "email");
}

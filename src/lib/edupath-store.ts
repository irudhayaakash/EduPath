import { useSyncExternalStore } from "react";
import { get, ref, set } from "firebase/database";
import { emptyProfile, type Analysis, type ChatThread, type EduPathState, type LearnerProfile, type ModuleStatus } from "./edupath-types";
import { getFirebaseDatabase, getFirebaseUser, waitForFirebaseAuth } from "./firebase";

const STATE_KEY = "edupath.state.v3";
const THREADS_KEY = "edupath.threads.v3";
const HISTORY_KEY = "edupath.history.v3";
const CURRENT_HISTORY_KEY = "edupath.currentHistoryId.v2";
const defaultState: EduPathState = { profile: null, analysis: null, progress: {}, notes: "" };

export type HistoryItem = {
  id: string;
  profile: LearnerProfile;
  analysis: Analysis | null;
  progress: EduPathState["progress"];
  notes: string;
  coachThreads: ChatThread[];
  createdAt: number;
  updatedAt: number;
};

function normalizeAnalysis(value: Analysis | null | undefined): Analysis | null {
  if (!value || typeof value !== "object") return null;
  return { summary: value.summary ?? "", strengths: Array.isArray(value.strengths) ? value.strengths : [], risks: Array.isArray(value.risks) ? value.risks : [], assessment: Array.isArray(value.assessment) ? value.assessment : [], gaps: Array.isArray(value.gaps) ? value.gaps : [], phases: Array.isArray(value.phases) ? value.phases.map((phase) => ({ ...phase, modules: Array.isArray(phase.modules) ? phase.modules : [] })) : [], adaptationNote: value.adaptationNote ?? null, generatedAt: value.generatedAt ?? new Date(0).toISOString() };
}

let state: EduPathState = defaultState;
let threads: ChatThread[] = [];
let history: HistoryItem[] = [];
let currentHistoryId: string | null = null;
let hydrated = false;
let firebaseHydrated = false;
let firebaseWriteQueue: Promise<void> = Promise.resolve();
let generation = 0;
const listeners = new Set<() => void>();
function emit() { listeners.forEach((listener) => listener()); }

function currentUid() { return typeof window === "undefined" ? "" : sessionStorage.getItem("edupath:uid") || ""; }
// Every account gets its own local cache so one browser never mixes learners/chats between accounts.
function scoped(base: string) { return `${base}:${currentUid()}`; }

function hydrateLocal() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try { const raw = localStorage.getItem(scoped(STATE_KEY)); if (raw) { const parsed = JSON.parse(raw) as EduPathState; state = { ...defaultState, ...parsed, analysis: normalizeAnalysis(parsed.analysis) }; } } catch { state = defaultState; }
  try { const raw = localStorage.getItem(scoped(THREADS_KEY)); if (raw) threads = JSON.parse(raw) as ChatThread[]; } catch { threads = []; }
  try { const raw = localStorage.getItem(scoped(HISTORY_KEY)); if (raw) history = JSON.parse(raw) as HistoryItem[]; } catch { history = []; }
  try { currentHistoryId = localStorage.getItem(scoped(CURRENT_HISTORY_KEY)); } catch { currentHistoryId = null; }
}

function persistLocal() {
  if (typeof window === "undefined" || !currentUid()) return;
  localStorage.setItem(scoped(STATE_KEY), JSON.stringify(state));
  localStorage.setItem(scoped(THREADS_KEY), JSON.stringify(threads));
  localStorage.setItem(scoped(HISTORY_KEY), JSON.stringify(history));
  if (currentHistoryId) localStorage.setItem(scoped(CURRENT_HISTORY_KEY), currentHistoryId); else localStorage.removeItem(scoped(CURRENT_HISTORY_KEY));
}

function safeUserKey(name: string, uid: string) { return `${(name || "Learner").trim().replace(/[.#$\[\]/]/g, "").replace(/\//g, "-")} (${uid})`; }

async function findFirebaseUserRecord() {
  const database = getFirebaseDatabase();
  const user = getFirebaseUser();
  if (!database || !user) return null;
  const key = safeUserKey(user.displayName || user.email?.split("@")[0] || state.profile?.name || "Learner", user.uid);
  const snapshot = await get(ref(database, `edupath/users/${key}`));
  return { database, user, key, value: snapshot.exists() ? snapshot.val() : null };
}
function firebaseMessagesToThreads(aiCoach: Record<string, any> | undefined): ChatThread[] {
  if (!aiCoach || typeof aiCoach !== "object") return [];
  const groups = new Map<string, ChatThread>();
  Object.values(aiCoach).forEach((entry: any) => {
    if (!entry || typeof entry !== "object" || !entry.threadId) return;
    const thread = groups.get(entry.threadId) || { id: entry.threadId, title: entry.title || "Conversation", updatedAt: Number(entry.timestamp || Date.now()), messages: [] };
    thread.messages.push({ id: entry.id || crypto.randomUUID(), role: entry.role || "assistant", text: entry.text || "", timestamp: entry.timestamp || Date.now() });
    thread.updatedAt = Math.max(thread.updatedAt, Number(entry.timestamp || Date.now()));
    if (entry.title) thread.title = entry.title;
    groups.set(entry.threadId, thread);
  });
  return [...groups.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

function threadsToAiCoach() {
  const output: Record<string, unknown> = {};
  let counter = 1;
  for (const thread of threads) {
    for (const message of thread.messages as any[]) {
      output[`message${counter++}`] = { threadId: thread.id, title: thread.title, id: message.id || crypto.randomUUID(), role: message.role, text: message.text || message.content || "", timestamp: message.timestamp || Date.now() };
    }
  }
  return output;
}

async function writeFirebase(gen: number) {
  const target = await findFirebaseUserRecord();
  if (!target || gen !== generation) return;
  const previous = target.value || {};
  const profile = { ...(state.profile || {}), aiCoach: threadsToAiCoach() };
  const details = { ...(previous.details || {}), email: target.user.email || previous.details?.email || "", lastActive: new Date().toISOString(), lastLoginAt: previous.details?.lastLoginAt || new Date().toISOString(), authProvider: previous.details?.authProvider || "email", createdAt: previous.details?.createdAt || target.user.metadata.creationTime || new Date().toISOString(), dateTime: new Date().toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }), deviceType: typeof navigator !== "undefined" && /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "Mobile" : "Desktop", deviceModel: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : "Browser", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  await set(ref(target.database, `edupath/users/${target.key}`), { profile, details });
}

function syncToFirebase() {
  const gen = generation;
  firebaseWriteQueue = firebaseWriteQueue.then(async () => { if (gen !== generation) return; try { await writeFirebase(gen); } catch (error) { console.warn("Firebase sync failed; local data remains available.", error); } });
  return firebaseWriteQueue;
}

function makeHistoryItem(): HistoryItem | null {
  if (!state.profile) return null;
  const now = Date.now();
  return { id: currentHistoryId ?? crypto.randomUUID(), profile: structuredClone(state.profile), analysis: state.analysis ? structuredClone(state.analysis) : null, progress: structuredClone(state.progress), notes: state.notes, coachThreads: structuredClone(threads), createdAt: now, updatedAt: now };
}
function upsertCurrentHistory() {
  const item = makeHistoryItem(); if (!item) return;
  currentHistoryId = item.id;
  const index = history.findIndex((entry) => entry.id === item.id);
  history = index >= 0 ? history.map((entry, i) => i === index ? { ...item, createdAt: entry.createdAt } : entry) : [item, ...history];
}

async function hydrateFirebase() {
  if (firebaseHydrated || typeof window === "undefined") return;
  firebaseHydrated = true;
  const gen = generation;
  try {
    await waitForFirebaseAuth();
    if (gen !== generation) return;
    const target = await findFirebaseUserRecord();
    if (gen !== generation) return;
    if (!target) { emit(); return; }
    if (!target.value) { if (state.profile) { upsertCurrentHistory(); await syncToFirebase(); persistLocal(); } return; }
    const record = target.value as { profile?: LearnerProfile & { aiCoach?: Record<string, any> }; details?: Record<string, any> };
    if (record.profile) {
      const { aiCoach, ...profile } = record.profile;
      state = { ...state, profile: { ...emptyProfile, ...(profile as LearnerProfile) } };
      threads = firebaseMessagesToThreads(aiCoach);
      // First visit of this account: show the learner (name + "Profile") in Recent learners.
      // The first profile submit updates this same entry instead of adding a second one.
      if (currentHistoryId ? threads.length > 0 : history.length === 0) upsertCurrentHistory();
      persistLocal(); emit();
    }
  } catch (error) { console.warn("Firebase load failed; using local data.", error); }
  finally { if (gen === generation) { firebaseHydrated = true; emit(); } }
}
function hydrate() {
  if (typeof window !== "undefined" && !currentUid()) return;
  hydrateLocal(); void hydrateFirebase();
}

/** Call on sign-in and sign-out so the next account starts from its own data, never the previous account's. */
export function resetStore() {
  generation += 1;
  state = defaultState; threads = []; history = []; currentHistoryId = null;
  hydrated = false; firebaseHydrated = false;
  firebaseWriteQueue = Promise.resolve();
  emit();
}

export function getState() { hydrate(); return state; }
export function getHistory() { hydrate(); return history; }
export function getThreadsSnapshot() { hydrate(); return threads; }
export function getCurrentHistoryId() { hydrate(); return currentHistoryId; }

function isPlaceholderProfile(p: LearnerProfile | null | undefined) {
  return !p || (!p.goalRole?.trim() && !p.currentRole?.trim() && !(p.skills?.length));
}

export function setProfile(profile: LearnerProfile) {
  getState();
  // The empty "Name / Profile" entry created at first login is updated in place by the first submit.
  const reusePlaceholder = !!currentHistoryId && history.some((entry) => entry.id === currentHistoryId) && !state.analysis && threads.length === 0 && isPlaceholderProfile(state.profile);
  if (state.profile && currentHistoryId && !reusePlaceholder) upsertCurrentHistory();
  state = { ...defaultState, profile: structuredClone(profile) };
  threads = [];
  if (!reusePlaceholder) currentHistoryId = crypto.randomUUID();
  upsertCurrentHistory(); persistLocal(); emit(); void syncToFirebase();
}
export function setAnalysis(analysis: Analysis) {
  const current = getState();
  const validIds = new Set(analysis.phases.flatMap((p) => p.modules.map((m) => m.id)));
  const progress = Object.fromEntries(Object.entries(current.progress).filter(([id]) => validIds.has(id)));
  state = { ...current, analysis: normalizeAnalysis(structuredClone(analysis)), progress };
  upsertCurrentHistory(); persistLocal(); emit(); void syncToFirebase();
}
export function selectHistory(id: string) {
  const item = getHistory().find((entry) => entry.id === id); if (!item) return;
  currentHistoryId = item.id; state = { profile: structuredClone(item.profile), analysis: item.analysis ? structuredClone(item.analysis) : null, progress: structuredClone(item.progress), notes: item.notes }; threads = structuredClone(item.coachThreads || []); persistLocal(); emit(); void syncToFirebase();
}
export async function clearCurrent() { state = defaultState; threads = []; currentHistoryId = null; persistLocal(); emit(); }
export async function refreshSite() { await clearCurrent(); if (typeof window !== "undefined") window.location.reload(); }
export function resetAll() { void clearCurrent(); }
export function deleteHistory(id: string) { history = history.filter((item) => item.id !== id); if (currentHistoryId === id) { currentHistoryId = null; state = defaultState; threads = []; } persistLocal(); emit(); void syncToFirebase(); }
export function setModuleStatus(moduleId: string, status: ModuleStatus) { const current = getState(); state = { ...current, progress: { ...current.progress, [moduleId]: status } }; upsertCurrentHistory(); persistLocal(); emit(); void syncToFirebase(); }
export function setNotes(notes: string) { state = { ...getState(), notes }; upsertCurrentHistory(); persistLocal(); emit(); void syncToFirebase(); }
export function createThread(title = "New conversation"): ChatThread { return { id: crypto.randomUUID(), title, updatedAt: Date.now(), messages: [] }; }
export function saveThread(id: string, messages: unknown[], title?: string) {
  const snapshot = getThreadsSnapshot(); const existing = snapshot.find((thread) => thread.id === id);
  if (existing) threads = snapshot.map((thread) => thread.id === id ? { ...thread, messages: structuredClone(messages), updatedAt: Date.now(), title: title ?? thread.title } : thread);
  else if (messages.length > 0) threads = [{ id, title: title ?? "New conversation", updatedAt: Date.now(), messages: structuredClone(messages) }, ...snapshot];
  upsertCurrentHistory(); persistLocal(); emit(); void syncToFirebase();
}
export function saveThreadForHistory(historyId: string, threadId: string, messages: unknown[], title?: string) {
  history = history.map((item) => {
    if (item.id !== historyId) return item;
    const existing = item.coachThreads.find((thread) => thread.id === threadId);
    const nextThreads = existing ? item.coachThreads.map((thread) => thread.id === threadId ? { ...thread, messages: structuredClone(messages), updatedAt: Date.now(), title: title ?? thread.title } : thread) : [...item.coachThreads, { id: threadId, title: title ?? "Conversation", updatedAt: Date.now(), messages: structuredClone(messages) }];
    return { ...item, coachThreads: nextThreads, updatedAt: Date.now() };
  });
  persistLocal(); emit();
  const target = history.find((item) => item.id === historyId);
  if (target && state.profile && currentHistoryId !== historyId) {
    // Preserve the exact active user/profile isolation: remote Firebase contains the current user's chat set.
    const previous = threads; threads = target.coachThreads; void syncToFirebase().finally(() => { threads = previous; });
  }
}
export function deleteThread(id: string) { threads = threads.filter((thread) => thread.id !== id); upsertCurrentHistory(); persistLocal(); emit(); void syncToFirebase(); }

export function subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
const serverSnapshot = () => defaultState;
export function useEduPath() { return useSyncExternalStore(subscribe, getState, serverSnapshot); }
export function useHistory() { return useSyncExternalStore(subscribe, getHistory, () => []); }
export function useThreads() { return useSyncExternalStore(subscribe, getThreadsSnapshot, () => []); }
export function useHydrated() { return useSyncExternalStore(subscribe, () => hydrated && firebaseHydrated, () => false); }

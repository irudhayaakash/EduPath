import { Link, useNavigate } from "@tanstack/react-router";
import { Bot, ChevronLeft, ChevronRight, GraduationCap, LayoutDashboard, LogOut, Map, MessageCircle, Moon, Plus, Search, Settings, Sun, Trash2, UserRound, X, KeyRound, Pencil } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changeLocalPassword, renameLocalAccount } from "@/lib/account-auth";
import { getFirebaseAuth, getFirebaseDatabase, getFirebaseUser } from "@/lib/firebase";
import { get, ref, update } from "firebase/database";
import { clearCurrent, deleteHistory, resetStore, selectHistory, useHistory } from "@/lib/edupath-store";

const nav = [
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/roadmap", label: "Roadmap", icon: Map },
  { to: "/coach", label: "AI Coach", icon: MessageCircle },
  { to: "/agent", label: "Agent", icon: Bot },
] as const;

function getStoredTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem("edupath:theme") === "dark" ? "dark" : "light";
}

function applyTheme(theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem("edupath:theme", theme);
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const history = useHistory();
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarId, setAvatarId] = useState("girl-1");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [createdAt, setCreatedAt] = useState("");
  const avatars = ["👩🏻‍💻","👩🏼‍🎨","👩🏽‍🔬","👩🏾‍💼","👩🏿‍🚀","👨🏻‍💻","👨🏼‍🎨","👨🏽‍🔬","👨🏾‍💼","👨🏿‍🚀"];

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("edupath:logged-in") !== "true") {
      navigate({ to: "/", replace: true });
      return;
    }
    const savedName = sessionStorage.getItem("edupath:name") || "Learner";
    const savedEmail = sessionStorage.getItem("edupath:email") || "";
    setName(savedName);
    setNewName(savedName);
    setEmail(savedEmail);
    const savedTheme = getStoredTheme();
    setTheme(savedTheme);
    applyTheme(savedTheme);
    setAvatarId(localStorage.getItem(`edupath:avatar:${savedEmail.toLowerCase()}`) || "girl-1");
    void getFirebaseUser()?.getIdToken().then(async () => {
      const db = getFirebaseDatabase(); const user = getFirebaseUser();
      if (!db || !user) return;
      const key = `${(user.displayName || user.email?.split("@")[0] || "Learner").trim().replace(/[.#$\[\]/]/g, "").replace(/\//g, "-")} (${user.uid})`;
      const snap = await get(ref(db, `edupath/users/${key}/details`));
      if (snap.exists() && snap.val()?.createdAt) setCreatedAt(snap.val().createdAt);
    }).catch(() => {});
  }, [navigate]);

  useEffect(() => {
    const uid = sessionStorage.getItem("edupath:uid");
    const expectedLogin = sessionStorage.getItem("edupath:last-login");
    if (!uid || !expectedLogin) return;
    const checkSession = async () => {
      try {
        const db = getFirebaseDatabase(); const user = getFirebaseUser();
        if (!db || !user) return;
        const key = `${(user.displayName || user.email?.split("@")[0] || "Learner").trim().replace(/[.#$\[\]/]/g, "").replace(/\//g, "-")} (${user.uid})`;
        const snap = await get(ref(db, `edupath/users/${key}/details/lastLoginAt`));
        if (snap.exists() && String(snap.val()) !== expectedLogin) {
          sessionStorage.clear();
          window.location.href = "/";
        }
      } catch {}
    };
    const timer = window.setInterval(checkSession, 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [accountOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? history.filter((item) => [item.profile.name, item.profile.currentRole, item.profile.goalRole].join(" ").toLowerCase().includes(q)) : history;
  }, [history, query]);

  const newChat = async () => {
    await clearCurrent();
    navigate({ to: "/profile" });
  };

  const openHistory = (id: string) => {
    selectHistory(id);
    navigate({ to: "/dashboard" });
  };

  const signOut = () => {
    sessionStorage.removeItem("edupath:logged-in");
    sessionStorage.removeItem("edupath:email");
    sessionStorage.removeItem("edupath:name");
    sessionStorage.removeItem("edupath:uid");
    resetStore();
    void import("firebase/auth").then(({ signOut: firebaseSignOut }) => { const auth = getFirebaseAuth(); if (auth) void firebaseSignOut(auth).catch(() => {}); });
    setAccountOpen(false);
    navigate({ to: "/", replace: true });
  };

  const signOutAllSessions = async () => {
    const db = getFirebaseDatabase(); const user = getFirebaseUser();
    if (db && user) {
      const key = `${(user.displayName || user.email?.split("@")[0] || "Learner").trim().replace(/[.#$\[\]/]/g, "").replace(/\//g, "-")} (${user.uid})`;
      await update(ref(db, `edupath/users/${key}/details`), { lastLoginAt: new Date().toISOString() });
    }
    signOut();
    toast.success("Signed out. Other active sessions will be asked to sign in again.");
  };

  const changeTheme = (next: "light" | "dark") => {
    setTheme(next);
    applyTheme(next);
  };

  const saveAvatar = async (id: string) => {
    setAvatarId(id);
    localStorage.setItem(`edupath:avatar:${email.toLowerCase()}`, id);
    setAvatarOpen(false);
    toast.success("Avatar updated.");
  };

  const saveName = async () => {
    try {
      const updated = await renameLocalAccount(email, newName);
      setName(updated.name);
      sessionStorage.setItem("edupath:name", updated.name);
      setRenameOpen(false);
      toast.success("Profile name updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your name.");
    }
  };

  const savePassword = async () => {
    if (newPassword.length < 6) return toast.error("New password must contain at least 6 characters.");
    if (newPassword !== confirmPassword) return toast.error("New passwords do not match.");
    try {
      await changeLocalPassword(email, currentPassword, newPassword);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordOpen(false);
      toast.success("Password changed successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change your password.");
    }
  };

  return (
    <div className="min-h-screen app-warm-bg">
      <aside className={`fixed inset-y-0 left-0 z-50 hidden overflow-hidden sidebar-surface border-r border-sidebar-border md:flex md:flex-col transition-[width] duration-200 ${collapsed ? "w-16" : "w-72"}`}>
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
          <Link to="/dashboard" className="flex min-w-0 flex-1 items-center gap-3 px-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-foreground"><GraduationCap className="size-5" /></span>
            {!collapsed && <span className="font-display text-lg font-semibold tracking-tight">EduPath</span>}
          </Link>
          <Button variant="ghost" size="icon-sm" className="text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground" onClick={() => setCollapsed((v) => !v)} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
        </div>

        {!collapsed ? <>
          <div className="space-y-2 p-3">
            <Button className="w-full justify-start gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90" onClick={newChat}><Plus className="size-4" /> New chat</Button>
            <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground" onClick={() => { setSearchOpen(true); }}><Search className="size-4" /> Search</Button>
            {searchOpen && <div className="relative"><Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search learners..." className="border-sidebar-border bg-card/80 text-sidebar-foreground placeholder:text-muted-foreground pr-8" /><button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => { setQuery(""); setSearchOpen(false); }}><X className="size-4" /></button></div>}
          </div>

          <nav className="space-y-1 px-3 pb-3">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">Workspace</p>
            {nav.map((item) => <Link key={item.to} to={item.to} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground" activeProps={{ className: "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm bg-sidebar-accent text-sidebar-foreground" }} activeOptions={{ exact: item.to === "/" }}><item.icon className="size-4" />{item.label}</Link>)}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto border-t border-sidebar-border px-3 py-3">
            <div className="flex items-center justify-between px-2 pb-2"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">Recent learners</p><span className="text-[10px] text-sidebar-foreground/40">{filtered.length}</span></div>
            <div className="space-y-1">
              {filtered.map((item) => <div key={item.id} className="group flex items-center gap-1 rounded-lg hover:bg-sidebar-accent">
                <button type="button" onClick={() => openHistory(item.id)} className="min-w-0 flex-1 px-2 py-2 text-left"><div className="truncate text-sm font-medium text-sidebar-foreground">{item.profile.name || "Unnamed learner"}</div></button>
                <Button variant="ghost" size="icon-sm" className="text-sidebar-foreground/50 opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent hover:text-sidebar-foreground" onClick={() => deleteHistory(item.id)} title="Delete history"><Trash2 className="size-3.5" /></Button>
              </div>)}
              {filtered.length === 0 && <p className="px-2 py-6 text-xs leading-5 text-sidebar-foreground/45">No saved learners yet. Create a profile and run Analyze.</p>}
            </div>
          </div>

          <div className="border-t border-sidebar-border p-3">
            <button type="button" onClick={() => setAccountOpen(true)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-sidebar-accent">
              <span className="profile-avatar-static grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-xl" aria-hidden="true">{avatars[Math.max(0, avatars.findIndex((_, i) => `girl-${i + 1}` === avatarId || `boy-${i - 4}` === avatarId))] || "👤"}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-sidebar-foreground">{name || "Learner"}</span><span className="block truncate text-[11px] text-sidebar-foreground/50">{email}</span></span>
              <Settings className="size-4 text-sidebar-foreground/50" />
            </button>
          </div>
        </> : <div className="flex flex-col items-center gap-3 p-3">
          <Button variant="ghost" size="icon" className="text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground" onClick={newChat} title="New chat"><Plus /></Button>
          <Button variant="ghost" size="icon" className="text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground" onClick={() => { setCollapsed(false); setSearchOpen(true); }} title="Search"><Search /></Button>
          <button type="button" onClick={() => setAccountOpen(true)} className="profile-avatar-static mt-auto grid size-9 place-items-center rounded-full bg-primary text-primary-foreground text-xl" title="Account">{avatars[avatarId.startsWith("boy-") ? 5 + Number(avatarId.split("-")[1]) - 1 : Number(avatarId.split("-")[1]) - 1] || "👤"}</button>
        </div>}
      </aside>

      <div className={`transition-[margin] duration-200 ${collapsed ? "md:ml-16" : "md:ml-72"}`}>
        <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl md:hidden">
          <div className="flex items-center justify-between px-4 py-3"><Link to="/dashboard" className="font-display text-lg font-semibold">EduPath</Link><button type="button" onClick={() => setAccountOpen(true)} className="profile-avatar-static grid size-9 place-items-center rounded-full bg-primary text-primary-foreground text-xl">{avatars[avatarId.startsWith("boy-") ? 5 + Number(avatarId.split("-")[1]) - 1 : Number(avatarId.split("-")[1]) - 1] || "👤"}</button></div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">{children}</main>
      </div>

      {accountOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setAccountOpen(false); }}>
        <section className="account-modal surface flex w-full max-w-lg flex-col overflow-hidden">
          <div className="flex shrink-0 items-start gap-4 border-b border-border p-6">
            <div className="avatar-edit-wrap shrink-0" onMouseLeave={() => {}}><button type="button" className="profile-avatar-large grid size-14 place-items-center rounded-full bg-primary text-3xl" onClick={() => setAvatarOpen(true)} aria-label="Edit profile avatar">{avatars[avatarId.startsWith("boy-") ? 5 + Number(avatarId.split("-")[1]) - 1 : Number(avatarId.split("-")[1]) - 1] || "👤"}<span className="avatar-edit-icon"><Pencil className="size-3.5" /></span></button></div>
            <div className="min-w-0 flex-1"><h2 className="text-xl font-semibold">{name || "Learner"}</h2><p className="mt-1 truncate text-sm text-muted-foreground">{email}</p><p className="mt-2 text-xs text-muted-foreground">Account & appearance</p></div>
            <button type="button" onClick={() => setAccountOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary" aria-label="Close settings"><X className="size-5" /></button>
          </div>

          <div className="account-modal-body">
            <div className="account-section">
              <div><h3 className="text-sm font-semibold">Profile details</h3><p className="mt-1 text-xs text-muted-foreground">{createdAt ? `Account created ${createdAt}` : "Your EduPath account details"}</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-secondary/30 p-4"><p className="text-[11px] text-muted-foreground">Name</p><p className="mt-1 truncate text-sm font-semibold">{name || "Learner"}</p></div>
                <div className="rounded-xl border border-border bg-secondary/30 p-4"><p className="text-[11px] text-muted-foreground">Email</p><p className="mt-1 truncate text-sm font-semibold">{email}</p></div>
              </div>
            </div>

            <div className="account-section">
              <h3 className="text-sm font-semibold">Profile settings</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" className="account-action" onClick={() => { setRenameOpen((v) => !v); setPasswordOpen(false); }}><Pencil className="size-4 shrink-0" /><span>Rename profile</span></button>
                <button type="button" className="account-action" onClick={() => { setPasswordOpen((v) => !v); setRenameOpen(false); }}><KeyRound className="size-4 shrink-0" /><span>Change password</span></button>
              </div>
            </div>

            {avatarOpen && <div className="rounded-xl border border-border bg-secondary/35 p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Choose an avatar</p><p className="text-xs text-muted-foreground">5 girl and 5 boy avatars</p></div><button type="button" onClick={() => setAvatarOpen(false)} className="text-muted-foreground" aria-label="Close avatar picker"><X className="size-4" /></button></div><div className="mt-4 grid grid-cols-5 justify-items-center gap-3">{avatars.map((avatar, index) => { const id = index < 5 ? `girl-${index + 1}` : `boy-${index - 4}`; return <button key={id} type="button" onClick={() => void saveAvatar(id)} className={`avatar-option ${avatarId === id ? "selected" : ""}`} title={index < 5 ? `Girl avatar ${index + 1}` : `Boy avatar ${index - 4}`}>{avatar}</button>; })}</div></div>}

            {renameOpen && <div className="rounded-xl border border-border bg-secondary/35 p-5"><label className="text-xs font-semibold text-muted-foreground">Profile name</label><div className="mt-3 flex gap-3"><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Your name" /><Button onClick={saveName}>Save</Button></div></div>}

            {passwordOpen && <div className="rounded-xl border border-border bg-secondary/35 p-5"><label className="text-xs font-semibold text-muted-foreground">Change password</label><div className="mt-3 grid gap-3"><Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" /><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (6+ characters)" /><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" /><Button onClick={savePassword}>Update password</Button></div></div>}

            <div className="account-section">
              <h3 className="text-sm font-semibold">Appearance</h3>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-secondary/30 p-1.5"><button type="button" className={`theme-choice ${theme === "light" ? "active" : ""}`} onClick={() => changeTheme("light")}><Sun className="size-4" /> Light</button><button type="button" className={`theme-choice ${theme === "dark" ? "active" : ""}`} onClick={() => changeTheme("dark")}><Moon className="size-4" /> Dark</button></div>
            </div>

            <div className="account-section">
              <h3 className="text-sm font-semibold">About</h3>
              <button type="button" onClick={() => setAboutOpen((v) => !v)} className="account-action"><GraduationCap className="size-4 shrink-0" /><span>About EduPath</span></button>
              {aboutOpen && <div className="rounded-xl border border-border bg-secondary/35 p-5"><p className="font-display text-lg font-semibold">EduPath</p><p className="mt-1 text-xs text-muted-foreground">Learn · Grow · Build Your Future</p><p className="mt-3 text-sm leading-6 text-muted-foreground">An AI-powered personalized learning platform for skill-gap analysis, adaptive roadmaps and learning guidance.</p><div className="mt-3 grid gap-1.5 text-xs text-muted-foreground"><span>Version 1.0.0</span><span>Platform: Web Application</span><span>AI: Personalized Learning Assistant</span></div><div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground"><p>© 2026 EduPath</p><p className="mt-1">Authors: Irudhaya Akash A &amp; Varsha V</p><p className="mt-2 font-medium text-foreground">Shaping skills. Creating possibilities.</p></div></div>}
            </div>

            <div className="account-section">
              <h3 className="text-sm font-semibold">Session</h3>
              <button type="button" onClick={signOutAllSessions} className="account-action"><LogOut className="size-4 shrink-0" /><span>Sign out from all sessions</span></button>
              <button type="button" onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/12"><LogOut className="size-4" /> Sign out</button>
            </div>
          </div>
        </section>
      </div>}
    </div>
  );
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-semibold tracking-tight">{title}</h2>{subtitle ? <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">{subtitle}</p> : null}</div>{action}</div>;
}
export function EmptyState({ title, body, cta }: { title: string; body: string; cta?: ReactNode }) {
  return <div className="surface flex min-h-[360px] flex-col items-center justify-center gap-3 px-6 py-16 text-center"><div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><GraduationCap className="size-6" /></div><h3 className="text-lg font-semibold">{title}</h3><p className="max-w-md text-sm leading-6 text-muted-foreground">{body}</p>{cta}</div>;
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, BrainCircuit, Eye, EyeOff, GraduationCap, LockKeyhole, Mail, Map, Sparkles, Target } from "lucide-react";
import { resetLocalPassword, signInLocalAccount, signInWithGoogle } from "@/lib/account-auth";
import { resetStore } from "@/lib/edupath-store";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "EduPath — Welcome back" }, { name: "description", content: "Sign in to continue your personalized EduPath learning journey." }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("edupath:last-email");
    if (savedEmail) setEmail(savedEmail);
    if (sessionStorage.getItem("edupath:logged-in") === "true") navigate({ to: "/profile", replace: true });
  }, [navigate]);

  const finishLogin = (account: { email: string; name: string; uid?: string; lastLoginAt?: string }) => {
    resetStore();
    sessionStorage.setItem("edupath:logged-in", "true");
    sessionStorage.setItem("edupath:email", account.email);
    sessionStorage.setItem("edupath:name", account.name);
    if (account.uid) sessionStorage.setItem("edupath:uid", account.uid);
    if (account.lastLoginAt) sessionStorage.setItem("edupath:last-login", account.lastLoginAt);
    localStorage.setItem("edupath:last-email", account.email);
    toast.success(`Welcome back, ${account.name || "learner"}!`);
    navigate({ to: "/profile" });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) return toast.error("Enter a valid email address.");
    if (password.length < 6) return toast.error("Password must contain at least 6 characters.");
    setLoading(true);
    try {
      const account = await signInLocalAccount(cleanEmail, password);
      if (remember) localStorage.setItem("edupath:last-email", account.email);
      finishLogin(account);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in.");
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) return toast.error("Enter your email address first.");
    setResetting(true);
    try {
      await resetLocalPassword(cleanEmail);
      toast.success("Password reset link sent. Check your inbox and spam folder.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the reset email.");
    } finally { setResetting(false); }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try { const account = await signInWithGoogle(); if (account) finishLogin(account); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Google sign-in could not be completed."); }
    finally { setLoading(false); }
  };

  return <main className="login-page min-h-screen">
    <div className="login-brand-panel">
      <Brand />
      <div className="login-copy"><p className="login-eyebrow"><Sparkles className="size-4" /> AI-powered learning</p><h1>Your Personalized<br /><span>Learning Journey</span></h1><p className="login-description">Personalized guidance, skill-gap analysis and an adaptive roadmap — all in one place.</p></div>
      <div className="login-features"><Feature icon={BrainCircuit} title="AI Career Guidance" text="Get personalized recommendations for your career goals." tone="purple" /><Feature icon={Target} title="Skill Gap Analysis" text="Identify your strengths and improve where it matters." tone="coral" /><Feature icon={Map} title="Personalized Roadmap" text="Follow a clear path to achieve your learning goals." tone="violet" /></div>
      <div className="login-journey-art" aria-hidden="true"><div className="journey-orbit orbit-one"><Target /></div><div className="journey-orbit orbit-two"><BrainCircuit /></div><div className="journey-orbit orbit-three"><GraduationCap /></div><div className="journey-mountain mountain-back" /><div className="journey-mountain mountain-front" /><div className="journey-path" /><div className="journey-flag" /><div className="journey-person"><div className="person-head" /><div className="person-body" /><div className="person-book" /></div></div>
    </div>
    <section className="login-form-panel"><div className="login-form-wrap">
      <div className="login-heading"><h2>Welcome Back!</h2><p>Sign in with the account you created for EduPath.</p></div>
      <form onSubmit={handleSubmit} className="login-form">
        <label className="login-field"><span>Email Address</span><div className="login-input-wrap"><Mail className="size-5" /><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" type="email" autoComplete="email" /></div></label>
        <label className="login-field"><span>Password</span><div className="login-input-wrap"><LockKeyhole className="size-5" /><input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" type={showPassword ? "text" : "password"} autoComplete="current-password" /><button type="button" className="login-eye" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((v) => !v)}>{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button></div></label>
        <div className="login-options"><label className="login-check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span>Remember me</span></label><button type="button" className="login-link" onClick={() => void handleForgotPassword()} disabled={resetting || loading}>{resetting ? "Sending…" : "Forgot password?"}</button></div>
        <button className="login-submit" type="submit" disabled={loading}>{loading ? "Checking account…" : "Sign In"}<ArrowRight className="size-5" /></button>
      </form>
      <div className="login-divider"><span>OR</span></div>
      <button type="button" className="social-login" disabled={loading} onClick={handleGoogle}><span className="google-mark">G</span><span>Continue with Google</span></button>
      <div className="login-create bottom-create">Don't have an account? <Link to="/signup">Create Account</Link></div>
    </div></section>
  </main>;
}

function Brand() { return <div className="login-brand"><span className="login-brand-mark"><GraduationCap className="size-7" /></span><div><div className="login-brand-name">Edu<span>Path</span></div><div className="login-brand-tagline">Learn · Grow · Build Your Future</div></div></div>; }
function Feature({ icon: Icon, title, text, tone }: { icon: typeof BrainCircuit; title: string; text: string; tone: "purple" | "coral" | "violet" | "mint" }) { return <div className="login-feature"><span className={`login-feature-icon ${tone}`}><Icon className="size-5" /></span><div><strong>{title}</strong><p>{text}</p></div></div>; }

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, GraduationCap, LockKeyhole, Mail, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";
import { createLocalAccount } from "@/lib/account-auth";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "EduPath — Create Account" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return toast.error("Enter your name.");
    if (!email.includes("@")) return toast.error("Enter a valid email address.");
    if (password.length < 6) return toast.error("Password must contain at least 6 characters.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    setLoading(true);
    try {
      const result = await createLocalAccount(name, email, password);
      toast.success(result.verificationRequired
        ? (result.verificationSent ? `Account created. We sent a verification link to ${email.trim().toLowerCase()}. Verify your email, then sign in.` : "Account created. Sign in to receive your email verification link.")
        : "Account created. Please sign in.");
      navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the account.");
    } finally { setLoading(false); }
  };

  return <main className="login-page signup-page min-h-screen">
    <div className="login-brand-panel"><div className="login-brand"><span className="login-brand-mark"><GraduationCap className="size-7" /></span><div><div className="login-brand-name">Edu<span>Path</span></div><div className="login-brand-tagline">Learn · Grow · Build Your Future</div></div></div><div className="login-copy"><p className="login-eyebrow"><Sparkles className="size-4" /> Start your journey</p><h1>Build your<br /><span>future with EduPath</span></h1><p className="login-description">Create your learner account, add your skills and let EduPath build a personalized path around your goal.</p></div><div className="signup-points"><div><b>01</b><span>Create your learner account</span></div><div><b>02</b><span>Add your skills and target role</span></div><div><b>03</b><span>Get your personalized roadmap</span></div></div></div>
    <section className="login-form-panel"><div className="login-form-wrap"><div className="login-create"><Link to="/"><ArrowLeft className="inline size-4" /> Back to Sign In</Link></div><div className="login-heading"><h2>Create Account</h2><p>Set up your EduPath learner account.</p></div><form onSubmit={submit} className="login-form"><label className="login-field"><span>Full Name</span><div className="login-input-wrap"><UserRound className="size-5" /><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" /></div></label><label className="login-field"><span>Email Address</span><div className="login-input-wrap"><Mail className="size-5" /><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" autoComplete="email" /></div></label><label className="login-field"><span>Password</span><div className="login-input-wrap"><LockKeyhole className="size-5" /><input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" type={showPassword ? "text" : "password"} autoComplete="new-password" /><button type="button" className="login-eye" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password visibility">{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button></div></label><label className="login-field"><span>Confirm Password</span><div className="login-input-wrap"><LockKeyhole className="size-5" /><input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter your password" type={showPassword ? "text" : "password"} autoComplete="new-password" /></div></label><button className="login-submit" type="submit" disabled={loading}>{loading ? "Creating account…" : "Create Account"}<ArrowRight className="size-5" /></button></form><div className="login-create bottom-create">Already have an account? <Link to="/">Sign In</Link></div><p className="login-terms">Create an account first. After successful registration, EduPath takes you back to Sign In instead of entering the app automatically.</p></div></section>
  </main>;
}

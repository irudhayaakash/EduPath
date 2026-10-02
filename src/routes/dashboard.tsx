import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Flame, Pencil, Target, TrendingUp } from "lucide-react";
import { AppShell, EmptyState, SectionTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useEduPath, useHydrated } from "@/lib/edupath-store";
import { progressStats } from "@/lib/edupath-types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — EduPath" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const hydrated = useHydrated();
  const { profile, analysis, progress } = useEduPath();
  if (!hydrated) return <AppShell><div className="surface flex min-h-[360px] items-center justify-center"><div className="text-center"><div className="mx-auto size-8 animate-spin rounded-full border-2 border-[#e2def3] border-t-primary" /><p className="mt-3 text-sm text-muted-foreground">Loading your workspace…</p></div></div></AppShell>;
  if (!profile) return <AppShell><EmptyState title="No learner profile yet" body="Create a profile first. Your dashboard will be built from the details you submit and the AI analysis that follows." cta={<Button asChild><Link to="/profile">Create profile</Link></Button>} /></AppShell>;

  const stats = progressStats(analysis, progress);
  if (!analysis) return <AppShell><SectionTitle title={`${profile.name || "Your"} profile`} subtitle="Your profile is saved. Run Analyze to generate the dashboard." action={<Button asChild><Link to="/profile">Analyze profile</Link></Button>} /><ProfilePreview profile={profile} /></AppShell>;

  return <AppShell>
    <SectionTitle title={`${profile.name || "Your"} learning dashboard`} subtitle={`Target: ${profile.goalRole}. ${analysis.summary}`} action={<div className="flex flex-wrap gap-2"><Button asChild variant="secondary"><Link to="/roadmap">Open roadmap</Link></Button><Button asChild variant="outline"><Link to="/profile"><Pencil className="size-4" /> Edit profile</Link></Button></div>} />

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat icon={TrendingUp} label="Path completion" value={`${stats.percent}%`} tone="indigo" />
      <Stat icon={CheckCircle2} label="Modules done" value={`${stats.done}/${stats.total}`} tone="emerald" />
      <Stat icon={Target} label="Critical gaps" value={String(analysis.gaps.filter((g) => g.importance === "critical").length)} tone="amber" />
      <Stat icon={Flame} label="Flagged difficult" value={String(stats.stuck)} tone="rose" />
    </div>

    <section className="surface mt-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Learner snapshot</h3><p className="mt-1 text-sm text-muted-foreground">The same profile is available to the roadmap and AI Coach.</p></div><Button asChild variant="outline"><Link to="/agent">Open agent</Link></Button></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Detail label="Current role / studies" value={profile.currentRole || "Not provided"}/><Detail label="Experience" value={`${profile.experienceYears} ${profile.experienceYears === 1 ? "year" : "years"}`}/><Detail label="Timeline" value={`${profile.timelineMonths} months`}/><Detail label="Study time" value={`${profile.hoursPerWeek} hours/week`}/><Detail label="Skills" value={profile.skills.map((s) => `${s.name} (${s.level}/5)`).join(", ") || "None entered"} className="lg:col-span-2"/><Detail label="Interests / constraints" value={profile.interests || "Not provided"} className="lg:col-span-2"/></div>
    </section>

    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <section className="surface p-5 sm:p-6"><div><h3 className="font-semibold">Skill profile</h3><p className="mt-1 text-sm text-muted-foreground">AI-assessed capability from 0–100.</p></div><div className="mt-5 space-y-4">{(analysis.assessment ?? []).map((item) => <div key={item.skill}><div className="mb-1.5 flex items-center justify-between gap-3"><span className="text-sm font-medium">{item.skill}</span><span className="text-xs font-semibold text-muted-foreground">{item.level}%</span></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500" style={{ width: `${Math.max(0, Math.min(100, item.level))}%` }}/></div><p className="mt-1 text-xs text-muted-foreground">{item.evidence}</p></div>)}</div></section>
      <section className="surface p-5 sm:p-6"><div><h3 className="font-semibold">Gap to target role</h3><p className="mt-1 text-sm text-muted-foreground">Current capability versus target capability.</p></div><div className="mt-5 space-y-4">{(analysis.gaps ?? []).map((gap) => { const gapPercent = Math.max(0, Math.min(100, gap.targetLevel - gap.currentLevel)); return <div key={gap.skill}><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="truncate text-sm font-medium">{gap.skill}</span><ImportanceTag importance={gap.importance}/></div><span className="text-xs text-muted-foreground">{gap.currentLevel} → {gap.targetLevel}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${gapPercent}%` }}/></div><p className="mt-1.5 text-xs text-muted-foreground">{gap.why}</p></div>})}</div></section>
    </div>

    <div className="mt-6 grid gap-5 lg:grid-cols-3"><InfoList title="Strengths" icon={CheckCircle2} iconClass="text-primary bg-primary/10" items={(analysis.strengths ?? [])}/><InfoList title="Risks to watch" icon={AlertTriangle} iconClass="text-[#e56f52] bg-[#fff0eb]" items={(analysis.risks ?? [])}/><InfoList title="Next steps" icon={Target} iconClass="text-primary bg-primary/10" items={[`Open Roadmap and mark modules as you learn.`, `Use AI Coach for questions about your gaps.`, `Re-analyze after your evidence changes.`]}/></div>
  </AppShell>;
}

function ProfilePreview({ profile }: { profile: ReturnType<typeof useEduPath>["profile"] }) { if (!profile) return null; return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"><Detail label="Current role / studies" value={profile.currentRole || "Not provided"}/><Detail label="Target career" value={profile.goalRole || "Not provided"}/><Detail label="Timeline" value={`${profile.timelineMonths} months · ${profile.hoursPerWeek} h/week`}/><Detail label="Skills" value={profile.skills.map((s) => `${s.name} · ${s.level}/5`).join(", ") || "None entered"} className="md:col-span-2 lg:col-span-3"/><Detail label="Interests / constraints" value={profile.interests || "Not provided"} className="md:col-span-2 lg:col-span-3"/></div>; }
function Detail({ label, value, className = "" }: { label: string; value: string; className?: string }) { return <div className={`rounded-xl border border-border bg-secondary/35 p-4 ${className}`}><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="mt-1.5 text-sm leading-5">{value}</p></div>; }
function Stat({ icon: Icon, label, value, tone }: { icon: typeof TrendingUp; label: string; value: string; tone: "indigo" | "emerald" | "amber" | "rose" }) { const styles = { indigo: "bg-indigo-50 text-indigo-600", emerald: "bg-[#e8f7f3] text-[#3cae98]", amber: "bg-[#fff0eb] text-[#e56f52]", rose: "bg-[#fff0f2] text-[#d95d67]" }; return <div className="surface flex items-center gap-3 p-4"><span className={`flex size-10 items-center justify-center rounded-xl ${styles[tone]}`}><Icon className="size-5"/></span><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 text-xl font-semibold">{value}</p></div></div>; }
function InfoList({ title, icon: Icon, iconClass, items }: { title: string; icon: typeof CheckCircle2; iconClass: string; items: string[] }) { return <section className="surface p-5"><div className="flex items-center gap-2"><span className={`flex size-8 items-center justify-center rounded-lg ${iconClass}`}><Icon className="size-4"/></span><h3 className="font-semibold">{title}</h3></div><ul className="mt-4 space-y-2.5 text-sm">{items.map((item) => <li key={item} className="leading-5">{item}</li>)}</ul></section>; }
function ImportanceTag({ importance }: { importance: string }) { const tone = importance === "critical" ? "bg-[#fff0f2] text-[#b94d63]" : importance === "high" ? "bg-[#fff0eb] text-[#a64f3a]" : "bg-secondary text-muted-foreground"; return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${tone}`}>{importance}</span>; }

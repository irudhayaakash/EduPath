import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, CheckCircle2, ClipboardList, Loader2, Map, Pencil, Route as RouteIcon, Sparkles, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AppShell, EmptyState, SectionTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { generateLearningPlan } from "@/lib/edupath.functions";
import { setAnalysis, useEduPath } from "@/lib/edupath-store";
import { progressStats } from "@/lib/edupath-types";

export const Route = createFileRoute("/agent")({ component: AgentPage });

const workflow = [
  { title: "Analyze", icon: ClipboardList, body: "Reads the learner details exactly as entered.", tone: "indigo" },
  { title: "Identify gaps", icon: Target, body: "Compares current evidence with the target role.", tone: "blue" },
  { title: "Plan & adapt", icon: Map, body: "Builds a roadmap around time, skills and goals.", tone: "violet" },
  { title: "Progress loop", icon: TrendingUp, body: "Uses progress and notes as new evidence.", tone: "emerald" },
  { title: "Coach context", icon: Bot, body: "Keeps profile, gaps and progress available to the coach.", tone: "amber" },
] as const;

const toneClasses: Record<string, string> = {
  indigo: "bg-violet-50 text-violet-700 border-violet-200",
  blue: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  violet: "bg-purple-50 text-purple-700 border-purple-200",
  emerald: "bg-[#e8f7f3] text-[#3cae98] border-[#ccefe5]",
  amber: "bg-[#fff0eb] text-[#a64f3a] border-[#ffd9cf]",
};

function AgentPage() {
  const navigate = useNavigate();
  const state = useEduPath();
  const generate = useServerFn(generateLearningPlan);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);
  const [requestedStage, setRequestedStage] = useState<number | null>(null);
  const stats = progressStats(state.analysis, state.progress);

  useEffect(() => {
    const raw = sessionStorage.getItem("edupath-agent-stage");
    const requested = raw === null ? 0 : Number(raw);
    const safeStage = Number.isInteger(requested) && requested >= 0 && requested < workflow.length ? requested : 0;
    setStage(safeStage);
    setRequestedStage(safeStage);
    sessionStorage.removeItem("edupath-agent-stage");
  }, []);

  useEffect(() => {
    if (!state.profile || state.analysis || running || requestedStage === null) return;
    setRunning(true);
    void (async () => {
      try {
        const result = await generate({ data: state.profile! });
        setAnalysis(result);
        setStage(requestedStage);
        toast.success("Your personalized learning path is ready.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "The AI agent could not complete the analysis.");
      } finally {
        setRunning(false);
      }
    })();
  }, [state.profile, state.analysis, running, generate, requestedStage]);

  if (!state.profile) return <AppShell><EmptyState title="Start with your learner profile" body="Enter your role, target career, skills and learning constraints first." cta={<Button asChild><Link to="/profile">Create profile</Link></Button>} /></AppShell>;

  const selectedStage = Math.min(stage, workflow.length - 1);
  const profileRows = [
    ["Name", state.profile.name || "Not provided"],
    ["Current role / studies", state.profile.currentRole || "Not provided"],
    ["Target career", state.profile.goalRole || "Not provided"],
    ["Experience", `${state.profile.experienceYears} ${state.profile.experienceYears === 1 ? "year" : "years"}`],
    ["Timeline", `${state.profile.timelineMonths} months`],
    ["Study time", `${state.profile.hoursPerWeek} hours/week`],
    ["Skills", state.profile.skills.map((s) => `${s.name} (${s.level}/5)`).join(", ") || "None entered"],
    ["Interests / constraints", state.profile.interests || "Not provided"],
  ];

  return <AppShell>
    <SectionTitle title="AI Agent" subtitle={`Five connected stages built from ${state.profile.name || "your learner profile"}.`} action={<Button variant="outline" onClick={() => navigate({ to: "/profile" })}><Pencil className="size-4" /> Edit profile</Button>} />

    <section className="surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-semibold">Agent workflow</p><p className="mt-1 text-sm text-muted-foreground">Click any stage. Each card opens its actual result.</p></div>
        {running ? <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700"><Loader2 className="size-3.5 animate-spin" /> AI working</span> : state.analysis ? <span className="inline-flex items-center gap-2 rounded-full bg-[#fff0eb] px-3 py-1.5 text-xs font-medium text-[#a64f3a]"><CheckCircle2 className="size-3.5" /> Analysis ready</span> : null}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {workflow.map((item, index) => {
          const Icon = item.icon;
          const selected = selectedStage === index;
          return <button key={item.title} type="button" onClick={() => setStage(index)} className={`rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${selected ? `${toneClasses[item.tone]} shadow-sm` : "border-border bg-card hover:border-[#cfc8f5]"}`}>
            <div className="flex items-start justify-between gap-2"><span className={`flex size-10 items-center justify-center rounded-xl border ${toneClasses[item.tone]}`}><Icon className="size-5" /></span>{state.analysis ? <CheckCircle2 className="mt-1 size-4 text-[#ff7b58]" /> : null}</div>
            <p className="mt-3 text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.body}</p>
          </button>;
        })}
      </div>
    </section>

    <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.4fr]">
      <section className="surface p-5 sm:p-6">
        <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary"><Bot className="size-5" /></span><div><p className="font-semibold">Learner details</p><p className="text-xs text-muted-foreground">Source data used by every agent stage</p></div></div>
        <div className="mt-5 space-y-2.5">{profileRows.map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-secondary/35/70 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="mt-1 text-sm leading-5">{value}</p></div>)}</div>
      </section>

      <section className="surface p-5 sm:p-6">
        <div className="flex items-center gap-3"><span className={`flex size-10 items-center justify-center rounded-xl border ${toneClasses[workflow[selectedStage].tone]}`}><Sparkles className="size-5" /></span><div><p className="font-semibold">{workflow[selectedStage].title}</p><p className="text-xs text-muted-foreground">{workflow[selectedStage].body}</p></div></div>
        {running ? <div className="mt-6 rounded-2xl bg-secondary/35 p-10 text-center"><Loader2 className="mx-auto size-8 animate-spin text-primary" /><p className="mt-4 font-medium">Generating your personalized path…</p><p className="mt-1 text-sm text-muted-foreground">This analysis uses the profile shown on the left.</p></div> : state.analysis ? <StageAnswer stage={selectedStage} state={state} stats={stats} /> : <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">The analysis will appear here after Gemini finishes.</div>}
      </section>
    </div>

    {state.analysis && <section className="mt-5 surface p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">Continue</p><p className="text-sm text-muted-foreground">Move from the agent result into the working pages.</p></div><div className="flex flex-wrap gap-2"><Button asChild><Link to="/dashboard"><TrendingUp className="size-4" /> Dashboard</Link></Button><Button asChild variant="secondary"><Link to="/roadmap"><RouteIcon className="size-4" /> Roadmap</Link></Button><Button asChild variant="outline"><Link to="/coach"><Bot className="size-4" /> AI Coach</Link></Button></div></div></section>}
  </AppShell>;
}

function StageAnswer({ stage, state, stats }: { stage: number; state: ReturnType<typeof useEduPath>; stats: ReturnType<typeof progressStats> }) {
  if (!state.analysis) return null;
  if (stage === 0) return <div className="mt-6 space-y-4"><AnswerBox title="Profile extraction" text={`EduPath identified ${state.profile?.skills.length ?? 0} skill(s), ${state.profile?.experienceYears ?? 0} year(s) of experience, a ${state.profile?.timelineMonths ?? 0}-month timeline and ${state.profile?.hoursPerWeek ?? 0} study hours/week for ${state.profile?.goalRole || "the target role"}.`} /><AnswerList title="How the agent interpreted the learner" items={[state.analysis.summary, ...state.analysis.strengths.slice(0, 3)]} /></div>;
  if (stage === 1) return <div className="mt-6 space-y-5"><AnswerList title="Detected strengths" items={state.analysis.strengths} /><div><p className="text-sm font-semibold">Skill gaps</p><div className="mt-2 space-y-2">{state.analysis.gaps.map(g => <div key={g.skill} className="rounded-xl border border-border bg-secondary/35 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{g.skill}</p><span className="rounded-full bg-[#eeeaff] px-2.5 py-1 text-[11px] font-medium capitalize text-[#5f50d8]">{g.importance}</span></div><p className="mt-1.5 text-sm text-muted-foreground">{g.currentLevel}/5 → {g.targetLevel}/5 · {g.why}</p></div>)}</div></div></div>;
  if (stage === 2) return <div className="mt-6 space-y-4"><AnswerBox title="Personalized plan" text={state.analysis.summary} /><div className="grid gap-3 sm:grid-cols-2">{state.analysis.phases.map((phase, i) => <div key={phase.id} className="rounded-xl border border-border bg-secondary/35 p-4"><p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600">Phase {i + 1} · {phase.durationWeeks} weeks</p><p className="mt-1 font-semibold">{phase.title}</p><p className="mt-1 text-sm text-muted-foreground">{phase.focus}</p><ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{phase.modules.slice(0, 4).map(m => <li key={m.id}>{m.title}</li>)}</ul></div>)}</div></div>;
  if (stage === 3) return <div className="mt-6 space-y-4"><AnswerBox title="Progress loop" text={`${stats.done}/${stats.total} modules complete (${stats.percent}%). Module statuses and notes are now available as evidence for future roadmap adaptations.`} /><AnswerList title="Current evidence" items={[`${stats.doing} module(s) in progress`, `${stats.stuck} module(s) marked stuck`, state.analysis.adaptationNote || "No adaptation note yet."]} /><Button asChild variant="outline"><Link to="/roadmap">Open roadmap & update progress</Link></Button></div>;
  return <div className="mt-6 space-y-4"><AnswerBox title="Coach context" text="The AI Coach can use the learner profile, detected gaps, roadmap and live progress together when answering questions." /><div className="grid gap-3 sm:grid-cols-2"><ContextCard label="Profile" value={`${state.profile?.name || "Learner"} → ${state.profile?.goalRole || "Target role not set"}`} /><ContextCard label="Gaps" value={`${state.analysis.gaps.length} skill gap(s)`}/><ContextCard label="Roadmap" value={`${state.analysis.phases.length} learning phase(s)`}/><ContextCard label="Progress" value={`${stats.percent}% complete · ${stats.stuck} stuck`}/></div><Button asChild><Link to="/coach"><Bot className="size-4" /> Open AI Coach</Link></Button></div>;
}

function ContextCard({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border bg-secondary/35 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>; }
function AnswerBox({ title, text }: { title: string; text: string }) { return <div className="rounded-xl border border-[#ddd8fb] bg-[#f3f1ff] p-4"><p className="font-semibold text-[#3b3267]">{title}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>; }
function AnswerList({ title, items }: { title: string; items: string[] }) { return <div><p className="text-sm font-semibold">{title}</p><ul className="mt-2 space-y-2">{items.map((item, i) => <li key={`${item}-${i}`} className="rounded-xl border border-border bg-card p-3 text-sm leading-5">{item}</li>)}</ul></div>; }

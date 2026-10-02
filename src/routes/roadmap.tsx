import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { adaptLearningPlan } from "@/lib/edupath.functions";
import { CheckCircle2, Circle, CircleDot, ExternalLink, Flame, RotateCcw, Bot } from "lucide-react";
import { AppShell, EmptyState, SectionTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEduPath, setAnalysis, setModuleStatus, setNotes } from "@/lib/edupath-store";
import { progressStats, type ModuleStatus } from "@/lib/edupath-types";

export const Route = createFileRoute("/roadmap")({ component: RoadmapPage });

const statusOptions: { value: ModuleStatus; label: string; icon: typeof Circle }[] = [
  { value: "todo", label: "To do", icon: Circle },
  { value: "doing", label: "In progress", icon: CircleDot },
  { value: "done", label: "Done", icon: CheckCircle2 },
  { value: "stuck", label: "Stuck", icon: Flame },
];

function RoadmapPage() {
  const { profile, analysis, progress, notes } = useEduPath();
  const adapt = useServerFn(adaptLearningPlan);
  const [adapting, setAdapting] = useState(false);
  if (!analysis || !profile) return <AppShell><EmptyState title="Your roadmap is empty" body="Create a learner profile first, then EduPath will generate a personalized path." cta={<Button asChild><Link to="/profile">Create profile</Link></Button>} /></AppShell>;

  const stats = progressStats(analysis, progress);
  return (
    <AppShell>
      <SectionTitle
        title="Your adaptive roadmap"
        subtitle={`${stats.done}/${stats.total} modules complete · ${stats.percent}% progress`}
        action={
          <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/agent"><Bot className="size-4" /> Track progress</Link></Button>
          <Button
            disabled={adapting}
            onClick={async () => {
              setAdapting(true);
              try {
                const result = await adapt({
                  data: {
                    profileSummary: `Name: ${profile.name}; Current role/studies: ${profile.currentRole}; Experience: ${profile.experienceYears} years; Target: ${profile.goalRole}; Timeline: ${profile.timelineMonths} months; ${profile.hoursPerWeek} hours/week; Skills: ${profile.skills.map((s) => `${s.name} (${s.level}/5)`).join(", ")}; Interests/constraints: ${profile.interests || "none"}; Resume/background: ${profile.resumeText.slice(0, 6000) || "none"}.`,
                    currentPlan: JSON.stringify(analysis),
                    progressSummary: `${stats.done}/${stats.total} complete, ${stats.doing} in progress, ${stats.stuck} stuck.`,
                    difficulties: notes || "No extra difficulties reported.",
                  },
                });
                setAnalysis(result);
                toast.success("Roadmap adapted to your latest progress.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not adapt the roadmap.");
              } finally {
                setAdapting(false);
              }
            }}
          >
            <RotateCcw className={`size-4 ${adapting ? "animate-spin" : ""}`} />
            {adapting ? "Adapting…" : "Adapt roadmap"}
          </Button>
          </div>
        }
      />
      <div className="mb-6 surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold">Roadmap built for {profile.name || "this learner"}</p>
            <p className="mt-1 text-sm text-muted-foreground">The path is tailored to the learner profile, target role, experience, available time and current progress.</p>
          </div>
          <Button asChild size="sm" variant="outline"><Link to="/profile"><Bot className="size-4" /> Edit learner details</Link></Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-secondary/45 p-3"><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Current</p><p className="mt-1 text-sm font-medium">{profile.currentRole || "Not provided"}</p></div>
          <div className="rounded-lg bg-secondary/45 p-3"><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Target</p><p className="mt-1 text-sm font-medium">{profile.goalRole}</p></div>
          <div className="rounded-lg bg-secondary/45 p-3"><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Experience</p><p className="mt-1 text-sm font-medium">{profile.experienceYears} {profile.experienceYears === 1 ? "year" : "years"}</p></div>
          <div className="rounded-lg bg-secondary/45 p-3"><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Learning budget</p><p className="mt-1 text-sm font-medium">{profile.hoursPerWeek} hrs/week · {profile.timelineMonths} months</p></div>
        </div>
      </div>

      <div className="mb-6 surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-semibold">Learning progress</p><p className="text-sm text-muted-foreground">Mark modules as you learn so the adaptive agent can use real progress.</p></div>
          <div className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">{stats.percent}% complete</div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all" style={{width:`${stats.percent}%`}} /></div>
      </div>

      <div className="space-y-5">
        {analysis.phases.map((phase, i) => (
          <section key={phase.id} className="surface overflow-hidden">
            <div className="border-b border-border bg-secondary/35 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Phase {i+1}</p><h2 className="mt-1 text-xl font-semibold">{phase.title}</h2><p className="mt-1 text-sm text-muted-foreground">{phase.focus}</p></div>
                <span className="rounded-full bg-background px-3 py-1 text-xs text-muted-foreground">{phase.durationWeeks} weeks</span>
              </div>
            </div>
            <div className="divide-y divide-border">
              {phase.modules.map((module) => {
                const status = progress[module.id] ?? "todo";
                return <article key={module.id} className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{module.title}</h3><span className="rounded-full bg-accent/60 px-2 py-0.5 text-[11px] capitalize">{module.difficulty}</span><span className="text-xs text-muted-foreground">{module.estimatedHours}h</span></div>
                      <p className="mt-2 text-sm text-muted-foreground">{module.summary}</p>
                      <div className="mt-3 flex flex-wrap gap-2">{module.topics.map(t=><span key={t} className="rounded-md border border-border px-2 py-1 text-xs">{t}</span>)}</div>
                      {module.practice.length > 0 && <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Practice</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{module.practice.map(x=><li key={x}>{x}</li>)}</ul></div>}
                      {module.project && <p className="mt-3 rounded-lg bg-secondary/55 p-3 text-sm"><strong>Project:</strong> {module.project}</p>}
                      {module.resources.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{module.resources.map((res,idx)=>res.url ? <a key={`${res.title}-${idx}`} href={res.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">{res.title}<ExternalLink className="size-3" /></a> : <span key={`${res.title}-${idx}`} className="rounded-lg border border-border px-3 py-1.5 text-xs">{res.title}</span>)}</div>}
                    </div>
                    <div className="flex flex-wrap gap-2 lg:w-40 lg:justify-end">
                      {statusOptions.map(({value,label,icon:Icon})=><Button key={value} size="sm" variant={status===value?"default":"outline"} onClick={()=>setModuleStatus(module.id,value)} className="gap-1.5">{<Icon className="size-3.5" />}{label}</Button>)}
                    </div>
                  </div>
                </article>
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-6 surface p-5">
        <div className="flex items-center gap-2"><RotateCcw className="size-4 text-primary"/><h2 className="font-semibold">Adaptive notes</h2></div>
        <p className="mt-1 text-sm text-muted-foreground">Tell the agent what feels difficult or what you already know. Use this when you re-analyze the path.</p>
        <Textarea className="mt-3" rows={4} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Example: SQL joins are difficult; I already know basic Python loops." />
      </section>
    </AppShell>
  );
}

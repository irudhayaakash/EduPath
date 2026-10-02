export type SkillEntry = {
  name: string;
  level: number; // 1-5 self rated
};

export type LearnerProfile = {
  name: string;
  currentRole: string;
  experienceYears: number;
  skills: SkillEntry[];
  goalRole: string;
  timelineMonths: number;
  hoursPerWeek: number;
  interests: string;
  resumeText: string;
  avatarId?: string;
};

export type Resource = {
  title: string;
  type: string;
  url: string | null;
};

export type LearningModule = {
  id: string;
  title: string;
  summary: string;
  skill: string;
  difficulty: string;
  estimatedHours: number;
  topics: string[];
  resources: Resource[];
  practice: string[];
  project: string | null;
};

export type Phase = {
  id: string;
  title: string;
  focus: string;
  durationWeeks: number;
  modules: LearningModule[];
};

export type SkillAssessment = {
  skill: string;
  level: number; // 0-100
  evidence: string;
};

export type SkillGap = {
  skill: string;
  importance: string; // critical | high | medium
  currentLevel: number; // 0-100
  targetLevel: number; // 0-100
  why: string;
};

export type Analysis = {
  summary: string;
  strengths: string[];
  risks: string[];
  assessment: SkillAssessment[];
  gaps: SkillGap[];
  phases: Phase[];
  adaptationNote: string | null;
  generatedAt: string;
};

export type ModuleStatus = "todo" | "doing" | "done" | "stuck";

export type ProgressState = Record<string, ModuleStatus>;

export type EduPathState = {
  profile: LearnerProfile | null;
  analysis: Analysis | null;
  progress: ProgressState;
  notes: string;
};

export type ChatThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: unknown[];
};

export const emptyProfile: LearnerProfile = {
  name: "",
  currentRole: "",
  experienceYears: 0,
  skills: [],
  goalRole: "",
  timelineMonths: 6,
  hoursPerWeek: 8,
  interests: "",
  resumeText: "",
};

export function allModules(analysis: Analysis | null): LearningModule[] {
  if (!analysis) return [];
  return analysis.phases.flatMap((phase) => phase.modules);
}

export function progressStats(analysis: Analysis | null, progress: ProgressState) {
  const modules = allModules(analysis);
  const total = modules.length;
  const count = (status: ModuleStatus) =>
    modules.filter((module) => (progress[module.id] ?? "todo") === status).length;
  const done = count("done");
  return {
    total,
    done,
    doing: count("doing"),
    stuck: count("stuck"),
    todo: count("todo"),
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

export function buildLearnerContext(state: EduPathState): string {
  const { profile, analysis, progress, notes } = state;
  if (!profile) return "The learner has not created a profile yet.";
  const stats = progressStats(analysis, progress);
  const lines: string[] = [
    `Learner: ${profile.name || "Anonymous"}`,
    `Current role: ${profile.currentRole} (${profile.experienceYears} years experience)`,
    `Target career: ${profile.goalRole}`,
    `Timeline: ${profile.timelineMonths} months at ~${profile.hoursPerWeek} h/week`,
    `Self-rated skills: ${profile.skills.map((s) => `${s.name} (${s.level}/5)`).join(", ") || "none listed"}`,
    `Interests: ${profile.interests || "n/a"}`,
  ];

  if (analysis) {
    lines.push(`AI summary: ${analysis.summary}`);
    lines.push(`Key gaps: ${analysis.gaps.map((g) => `${g.skill} [${g.importance}]`).join(", ")}`);
    lines.push(
      `Roadmap progress: ${stats.done}/${stats.total} modules complete (${stats.percent}%), ${stats.doing} in progress, ${stats.stuck} flagged as difficult.`,
    );
    const inFlight = allModules(analysis)
      .filter((m) => progress[m.id] === "doing" || progress[m.id] === "stuck")
      .map((m) => `${m.title} (${progress[m.id]})`);
    if (inFlight.length) lines.push(`Active/struggling modules: ${inFlight.join("; ")}`);
  } else {
    lines.push("No learning path has been generated yet.");
  }

  if (notes.trim()) lines.push(`Learner notes about difficulties: ${notes.trim()}`);
  return lines.join("\n");
}

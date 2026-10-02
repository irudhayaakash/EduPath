import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Analysis } from "./edupath-types";
import { callGemini } from "./gemini.server";

const ResourceSchema = z.object({
  title: z.string(),
  type: z.string(),
  url: z.string().nullable(),
});

const ModuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  skill: z.string(),
  difficulty: z.string(),
  estimatedHours: z.number(),
  topics: z.array(z.string()),
  resources: z.array(ResourceSchema),
  practice: z.array(z.string()),
  project: z.string().nullable(),
});

const PhaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  focus: z.string(),
  durationWeeks: z.number(),
  modules: z.array(ModuleSchema),
});

const AnalysisSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  risks: z.array(z.string()),
  assessment: z.array(z.object({ skill: z.string(), level: z.number(), evidence: z.string() })),
  gaps: z.array(
    z.object({
      skill: z.string(),
      importance: z.string(),
      currentLevel: z.number(),
      targetLevel: z.number(),
      why: z.string(),
    }),
  ),
  phases: z.array(PhaseSchema),
  adaptationNote: z.string().nullable(),
});

const ProfileInput = z.object({
  name: z.string(),
  currentRole: z.string(),
  experienceYears: z.number(),
  skills: z.array(z.object({ name: z.string(), level: z.number() })),
  goalRole: z.string().min(1),
  timelineMonths: z.number(),
  hoursPerWeek: z.number(),
  interests: z.string(),
  resumeText: z.string(),
});

const AdaptInput = z.object({
  profileSummary: z.string(),
  currentPlan: z.string(),
  progressSummary: z.string(),
  difficulties: z.string(),
});

const JSON_HEADERS = { "Content-Type": "application/json" };

const analysisResponseSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    assessment: {
      type: "array",
      items: {
        type: "object",
        properties: {
          skill: { type: "string" },
          level: { type: "number" },
          evidence: { type: "string" },
        },
        required: ["skill", "level", "evidence"],
      },
    },
    gaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          skill: { type: "string" },
          importance: { type: "string" },
          currentLevel: { type: "number" },
          targetLevel: { type: "number" },
          why: { type: "string" },
        },
        required: ["skill", "importance", "currentLevel", "targetLevel", "why"],
      },
    },
    phases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          focus: { type: "string" },
          durationWeeks: { type: "number" },
          modules: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                summary: { type: "string" },
                skill: { type: "string" },
                difficulty: { type: "string" },
                estimatedHours: { type: "number" },
                topics: { type: "array", items: { type: "string" } },
                resources: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      type: { type: "string" },
                      url: { type: ["string", "null"] },
                    },
                    required: ["title", "type", "url"],
                  },
                },
                practice: { type: "array", items: { type: "string" } },
                project: { type: ["string", "null"] },
              },
              required: [
                "id", "title", "summary", "skill", "difficulty", "estimatedHours",
                "topics", "resources", "practice", "project",
              ],
            },
          },
        },
        required: ["id", "title", "focus", "durationWeeks", "modules"],
      },
    },
    adaptationNote: { type: ["string", "null"] },
  },
  required: ["summary", "strengths", "risks", "assessment", "gaps", "phases", "adaptationNote"],
};

async function geminiJson<T>(prompt: string, systemInstruction: string, responseSchema: object, thinkingLevel: "low" | "medium" = "low"): Promise<T> {
  const text = await callGemini(prompt, systemInstruction, {
    schema: responseSchema,
    thinkingLevel,
  });

  try {
    return JSON.parse(text) as T;
  } catch {
    // Be forgiving if a provider ever wraps valid JSON in a markdown fence.
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1]) as T;
      } catch {
        // Fall through to the clear error below.
      }
    }
    throw new Error("Gemini returned an invalid structured response. Please try again.");
  }
}

export async function geminiCoachText(prompt: string, systemInstruction: string): Promise<string> {
  return callGemini(prompt, systemInstruction, { thinkingLevel: "low" });
}

function profileText(data: z.infer<typeof ProfileInput>) {
  return `
Name: ${data.name || "Anonymous"}
Current role/studies: ${data.currentRole || "not stated"}
Experience: ${data.experienceYears} years
Self-rated skills (1-5): ${data.skills.map((s) => `${s.name}=${s.level}`).join(", ") || "none listed"}
Target career: ${data.goalRole}
Timeline: ${data.timelineMonths} months, about ${data.hoursPerWeek} hours per week
Interests and constraints: ${data.interests || "none stated"}
Resume / background:
${data.resumeText.slice(0, 12000) || "(none provided)"}
`.trim();
}

const SHARED_RULES = `
Rules:
- assessment rates existing capability from 0-100 using only evidence in the learner profile.
- gaps compare the learner with realistic expectations for the target role; importance is critical, high, or medium.
- phases are ordered and should contain 2-4 modules each.
- module ids are stable short slugs. Completed module ids must remain unchanged during adaptation.
- difficulty is beginner, intermediate, or advanced.
- resources should be real, well-known learning materials. url can be null if you cannot confidently provide it.
- practice contains 2-4 concrete exercises and project is a portfolio-worthy build or null.
- total estimated hours must fit the learner's timeline and weekly hours.
- Never invent achievements, skills, experience, certificates, jobs, or education.
- Prefer the learner's actual entered details over generic assumptions.
- Keep the roadmap in dependency order: foundations first, then applied skills, then projects/interview readiness.
`;

export const generateLearningPlan = createServerFn({ method: "POST" })
  .validator((input: unknown) => ProfileInput.parse(input))
  .handler(async ({ data }) => {
    const profile = profileText(data);

    // One fast structured Gemini call replaces the previous sequential
    // benchmark + synthesis calls. The prompt still makes the agent reason in
    // distinct stages internally, but the user receives one coherent response.
    const output = await geminiJson<Analysis>(
      `LEARNER PROFILE
${profile}

Create a personalized EduPath result in one response. Internally follow this order:
1) Extract the learner facts exactly as provided.
2) Infer a realistic competency benchmark for the target career.
3) Compare current evidence against that benchmark and identify the most important gaps.
4) Build an ordered roadmap that fits the learner's timeline and weekly study hours.
5) Make every phase and module specific to this learner rather than generic.

Important: do not invent experience or skills. Keep foundations before applied work, then projects and interview readiness. Make the roadmap practical enough to start immediately. Set adaptationNote to null.`,
      `You are EduPath's fast agentic career-learning planner. You must perform profile extraction, role benchmarking, gap diagnosis and adaptive planning as one coordinated reasoning pass. Personalize the result to the learner's exact details, target role, existing skills, experience, timeline, study time, interests/constraints and resume evidence. The learner should receive a useful answer quickly, so avoid unnecessary explanation outside the requested JSON. ${SHARED_RULES}`,
      analysisResponseSchema,
      "medium",
    );

    const parsed = AnalysisSchema.parse(output);
    return { ...parsed, generatedAt: new Date().toISOString() };
  });

export const adaptLearningPlan = createServerFn({ method: "POST" })
  .validator((input: unknown) => AdaptInput.parse(input))
  .handler(async ({ data }) => {
    const output = await geminiJson<Analysis>(
      `LEARNER PROFILE\n${data.profileSummary}\n\nCURRENT PLAN\n${data.currentPlan.slice(0, 30000)}\n\nPROGRESS\n${data.progressSummary}\n\nDIFFICULTIES / NOTES\n${data.difficulties || "none reported"}\n\nRewrite the full plan. Keep completed module ids unchanged, preserve mastered work only when useful, reinforce stuck areas, and re-prioritize the remaining work. Put a short explanation of changes in adaptationNote.`,
      `You are EduPath's adaptive agent. Treat progress as new evidence. Decide what should be kept, compressed, reordered, reinforced, or added. Never erase completed work from the learner's history. Return a coherent full roadmap that can replace the current plan. ${SHARED_RULES}`,
      analysisResponseSchema,
      "medium",
    );
    const parsed = AnalysisSchema.parse(output);
    return { ...parsed, generatedAt: new Date().toISOString() };
  });

export const coachResponse = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ context: z.string(), message: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    const text = await geminiCoachText(
      data.message,
      `You are EduPath's personal learning coach. Use the learner context below as the source of truth. Give practical, specific guidance. When useful, reference the learner's target role, exact skill gaps, current modules, progress, and notes. If the learner asks for a plan, give ordered steps. If they ask for an explanation, teach at their level with a small example or exercise. Do not claim you performed actions you did not perform.\n\nLEARNER CONTEXT\n${data.context}`,
    );
    return { text };
  });

const ResumeInput = z.object({ fileName: z.string(), base64: z.string() });

export const extractResumeText = createServerFn({ method: "POST" })
  .validator((input: unknown) => ResumeInput.parse(input))
  .handler(async ({ data }) => {
    const binary = atob(data.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    if (data.fileName.toLowerCase().endsWith(".pdf")) {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(bytes);
      const { text } = await extractText(pdf, { mergePages: true });
      return { text: (text ?? "").trim() };
    }
    return { text: new TextDecoder().decode(bytes).trim() };
  });

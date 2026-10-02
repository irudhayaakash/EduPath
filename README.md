# EduPath Navigator

EduPath is an agentic AI learning platform that turns a learner profile into a skill-gap analysis, personalized roadmap, progress tracker, and AI learning coach.

## Core flow

**Profile → Analyze → Identify gaps → Plan → Learn → Track → Adapt**

### Included
- Learner profiling with skill levels and optional PDF/text resume upload
- AI skill assessment and skill-gap detection
- Personalized multi-phase roadmap
- Progress states: To do / In progress / Done / Stuck
- Adaptive notes for future re-analysis
- Dashboard with skill and gap visualizations
- AI learning coach grounded in the learner's profile and roadmap
- Local persistence using browser storage
- Responsive light UI

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
copy .env.example .env
```

Add your `GEMINI_API_KEY` to `.env`, then:

```bash
npm run dev
```

Open the URL printed by Vite.

## Build check

```bash
npm run build
npm run lint
```

If you only want to inspect the UI, the profile/dashboard/roadmap shell can load without existing learner data; AI generation requires the API key.

## Project structure

- `src/routes/index.tsx` — learner profile and AI analysis
- `src/routes/dashboard.tsx` — analytics dashboard
- `src/routes/roadmap.tsx` — roadmap and progress tracking
- `src/routes/coach.tsx` — AI learning coach
- `src/lib/edupath.functions.ts` — server-side AI analysis functions
- `src/routes/api/chat.ts` — streaming AI coach endpoint
- `src/lib/edupath-store.ts` — local learner state

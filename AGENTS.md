# EduPath development notes

- Keep Gemini API access server-side only.
- Store the Gemini key in `.env` as `GEMINI_API_KEY`.
- Never expose the key through a `VITE_` environment variable or client-side code.
- The learner profile, analysis, roadmap, progress and coach should remain synchronized through the EduPath store.

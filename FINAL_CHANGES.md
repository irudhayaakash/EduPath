# EduPath final UI and workflow fixes

- Reworked the visual system into a clean dark-sidebar + light workspace theme.
- Removed the previous glass/gradient-heavy look.
- Dashboard was simplified to reliable CSS-based skill/gap visuals instead of runtime chart components.
- AI Agent now has five distinct, working stages with different icon colors.
- Progress Loop and Coach Context show actual content and working navigation.
- ChatGPT-style sidebar keeps New chat, Search, Recent learners, history deletion, and Refresh site.
- Current Clear control is removed from the sidebar.
- Refresh site clears only the active workspace, keeps history, and performs a browser reload.
- New profile creation starts a clean current workspace while preserving previous profiles in History.
- AI Coach conversations remain attached to the selected learner/history item.
- Firebase remains the persistent source for current workspace + history.

## Coach conversation isolation fix
- Each learner now has fully isolated coach conversations.
- Switching learners never mixes messages between profiles.
- A Gemini reply that finishes after switching learners is written back to the original learner's history.
- Empty conversations are not persisted.
- Conversation messages can continue after returning to the learner.
- Firebase writes are queued to prevent rapid chat/profile changes from overwriting each other with stale snapshots.

## Login Page Update — October 2, 2026
- Added a polished split-screen EduPath login page at `/`.
- Added email/password sign-in validation and session-based access.
- Added working show/hide password, remember-me, forgot-password feedback, Google continuation, Microsoft feedback, terms/privacy feedback, and create-account navigation.
- Moved the existing learner profile workspace to `/profile` so the login page becomes the site entry point without removing the original profile workflow.
- Added a lightweight session guard to the existing AppShell and a working Sign out action.
- Preserved the existing Firebase, Gemini, history, AI Coach, roadmap, agent, and dashboard functionality.
- Added responsive login styling matching the selected EduPath purple/coral/warm-white visual direction.

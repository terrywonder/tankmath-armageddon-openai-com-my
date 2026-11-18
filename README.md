# TankMath Armageddon — Math Artillery (`tankmath-armageddon-openai-com-my`)

2D Vector Tank Artillery educational mathematics game integrated into **https://www.openai.com.my/** (`/games/tankmath-armageddon/`).

> **Canonical Portal Blueprint:** See [`terrywonder/openai.com.my/blob/main/MASTER_BLUEPRINT.md`](https://github.com/terrywonder/openai.com.my/blob/main/MASTER_BLUEPRINT.md) for the complete OpenAI.com.my game integration, XP, quest, leaderboard, and responsive design rules.

## Integration Summary
- **Portal Meta & SDK:** `<meta name="openai-portal-game" content="tankmath-armageddon" />` + `<script src="/shared/portal-sdk.js?v=2.9.1"></script>`
- **Save Key:** `tankmath_save_v1` (registered identically in `games-manifest.json` and `shared/portal-sdk.js` `TANKMATH_STORAGE_KEY`)
- **Live XP & Quest Reporting:** Each correct equation shot immediately reports incremental XP + `questionsDelta: 1` via `window.OpenAIPortal.reportGameEvent()`, and `finishRun()` submits only remaining deltas (zero double counting) along with `levelsDelta`, `starsDelta`, and `bossesDelta`.
- **Adaptive Syllabus & AI Tutor:** Reads `ageBand` (`5-6` → Tier 1, `7-9`/`10-12` → Tier 2, `13-15` → Tier 3, `16+` → Tier 5) from `OpenAIPortal.getActiveUserStats()` and enriches equation hints via `OpenAIPortal.askGemini({ mode: 'hint', subject: 'Mathematics', ... })`.
- **Unified Leaderboard:** Combines Firebase global leaderboard (when signed in) with `OpenAIPortal.getLeaderboard('tankmath-armageddon')` Malaysian peer rankings.

## Build & Deploy to Main Portal
```bash
npm run lint
npm run build
# Copy dist/* -> titan-academy-google-antigravity/games/tankmath-armageddon/
```

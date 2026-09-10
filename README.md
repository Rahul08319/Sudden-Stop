# SUDDEN STOP

### A neon precision-tapping challenge built for YouTube Playables

**Stop at exactly the right moment. Build a streak. Beat the ghost.**

Sudden Stop is a fast, single-input reflex game. A moving orb races across the track; tap inside the target zone to score, chain perfect hits, and master escalating modifiers.

> Built as a responsive HTML5 game with YouTube Playables SDK support. No advertising or monetization features are included.

## Highlights

| Feature | What it does |
| --- | --- |
| 🎯 Three core modes | Classic, Survival, and Time Attack give every session a different pace. |
| 🎛 Practice lab | Choose a fixed speed and refine your timing across ten focused rounds. |
| 👻 Race Your Best | A seeded ghost marker recreates the target layout from your personal-best run. |
| ⭐ Daily + weekly challenges | Rotating modifiers, deterministic layouts, bonus scoring, and special rules. |
| ⚡ Power-ups | Wider zones, slow motion, magnets, and score multipliers keep runs surprising. |
| ♿ Accessibility | Reduced-motion mode plus high-contrast and blue/gold palettes. |
| 🔊 Platform aware | YouTube audio, pause/resume, locale, cloud-save, score, and health hooks. |

## Controls

| Input | Action |
| --- | --- |
| Tap / click / `Space` / `Enter` | Start, select, or stop the orb |
| `F` | Toggle fullscreen |
| `Esc` | Close a menu or tutorial; also exits fullscreen normally |

## YouTube Playables readiness

The SDK is loaded in `index.html` before the application bundle. The game integrates:

- `firstFrameReady()` followed by `gameReady()`
- `IN_PLAYABLES_ENV` checks with local fallbacks
- YouTube cloud save/load for player settings and best score
- YouTube audio preference and audio-change events
- Pause/resume handling with an immediate save
- Locale detection, score reporting, and health reporting

### Responsive resolution support

The UI is designed to remain playable through orientation and viewport changes, including portrait, square, desktop, and ultrawide displays. The game track has a logical 320px coordinate system and scales down only for extremely narrow viewports, so target and ghost positions remain accurate rather than stretched.

### Test Suite checklist

The official YouTube Playables Test Suite is run through a Playables Developer Portal release. Before submitting:

1. Build the project with `npm run build`.
2. Upload the generated `dist` bundle through the Developer Portal.
3. Open the portal’s Test Suite link and validate SDK order, readiness calls, audio, pause/resume, saves, scores, and responsive resize behavior.
4. Test the Dev Link on desktop plus Android and iOS.

The Playables environment and its Test Suite are portal-managed, so they cannot be fully simulated by a normal local browser. Official requirements: [SDK reference](https://developers.google.com/youtube/gaming/playables/reference/sdk) · [design requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements_design) · [integration requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration).

## Local development

```bash
npm install
npm run dev
```

### Verification

```bash
npm run build
npm run test
npm run lint
```

## Technology

React · TypeScript · Vite · Tailwind CSS · shadcn/ui · Supabase · Capacitor

## Ideas for the next update

- A true moving ghost orb that mirrors the saved timing, not only its stop marker.
- A compact achievement card collection for precision, streaks, and challenge mastery.
- Optional text-size controls and a screen-reader-friendly live score announcer.
- Seasonal visual themes that change the track, particle effects, and challenge presentation.

---

Made for quick sessions, precise timing, and one-more-run energy.

# Learning Atlas Local App

The first runnable application surface for Learning Atlas. It runs only on the learner's machine and serves a browser interface from a local Node process.

## Run

Requires Node 22.18 or later.

```bash
npm run dev
```

Open the printed `http://127.0.0.1:<port>` URL. The application creates `data/learning-atlas.sqlite` locally. To keep personal data elsewhere, set `LEARNING_ATLAS_DATA_DIR` before starting it.

## Current scope — v0.30.0 (2026-11-06)

The home page maps all 20 practice phases and all 20 theory chapters. `/learn?lessonId=...` loads each published practice lesson's identity, provenance, content, quiz, theory cards, and local resources, alongside persistent notes, learning state, reading position, learner-confirmed review items, and local tutor conversations. `/theory?theoryId=...` publishes only reviewed Chinese theory content whose source fingerprint matches the locally synchronized `main` snapshot; every theory source link follows the official upstream English `main`.

Learners can configure an OpenAI-compatible local or chosen model service in the practice tutor panel; each request carries the active reading section, linked approved theory card, and local learning state, while its key stays in the local database and is never included in exports. JSON and Markdown exports are available from the notes panel. The app can create a learner-owned VS Code workspace with a Python reference implementation, exercise scaffold, standard-library tests, and optional marimo exploration from approved templates. Theory progress, notes, assessments, tutor state, and workspaces remain outside the current release scope. Versioned adaptations and mappings follow [`docs/content-schema.md`](../../docs/content-schema.md). The app's original source is licensed under [`LICENSE`](../../LICENSE); bundled third-party assets retain the notices in [`THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md).

Reader drafts survive panels, navigation and restart. Pre-reading predictions are unscored; full end-of-lesson quizzes reveal answers only after submission. Backups use schema 4 (schema 3 remains accepted), preserve unknown lessons, and exclude model credentials. Deletes/imports offer a server-validated 60-second undo. SQLite may emit an experimental-feature notice; model keys are stored in plaintext in the local database, so protect the data directory.

Run `npm run check`, `npm test` and `npm run test:browser` to validate. Browser tests use Chrome at `/usr/bin/google-chrome` by default; set `CHROME_PATH` to your executable on other systems. They use temporary databases and a local compatible-model stub. See the [remediation record](../../docs/review-remediation-plan.md) for acceptance evidence.

Tutor responses stream through `/api/tutor/messages/stream`; the existing JSON endpoint stays compatible. Cancellation or provider truncation does not save a partial turn. Course evidence, matching theory and complete history turns have independent character budgets. `npm run benchmark` uses the same `runtime.env` configuration as start/dev to measure 20 warmed requests while checking every file dependency.

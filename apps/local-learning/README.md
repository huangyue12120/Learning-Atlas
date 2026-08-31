# Learning Atlas Local App

The first runnable application surface for Learning Atlas. It runs only on the learner's machine and serves a browser interface from a local Node process.

## Run

Requires Node 22.18 or later.

```bash
npm run dev
```

Open the printed `http://127.0.0.1:<port>` URL. The application creates `data/learning-atlas.sqlite` locally. To keep personal data elsewhere, set `LEARNING_ATLAS_DATA_DIR` before starting it.

## Current scope

The home page maps all 20 practice phases and all 20 theory chapters. `/learn?lessonId=...` loads each published practice lesson's identity, provenance, content, quiz, theory cards, and local resources, alongside persistent notes, learning state, reading position, learner-confirmed review items, and local tutor conversations. `/theory?theoryId=...` publishes only reviewed Chinese theory content whose source fingerprint matches the locally synchronized `main` snapshot; every theory source link follows the official upstream English `main`.

Learners can configure an OpenAI-compatible local or chosen model service in the practice tutor panel; each request carries the active reading section, linked approved theory card, and local learning state, while its key stays in the local database and is never included in exports. JSON and Markdown exports are available from the notes panel. The app can create a learner-owned VS Code workspace with a Python reference implementation, exercise scaffold, standard-library tests, and optional marimo exploration from approved templates. Theory progress, notes, assessments, tutor state, and workspaces remain outside the current release scope. Versioned adaptations and mappings follow [`docs/content-schema.md`](../../docs/content-schema.md). The app's original source is licensed under [`LICENSE`](../../LICENSE); bundled third-party assets retain the notices in [`THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md).

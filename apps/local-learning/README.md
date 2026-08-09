# Learning Atlas Local App

The first runnable application surface for Learning Atlas. It runs only on the learner's machine and serves a browser interface from a local Node process.

## Run

Requires Node 22.18 or later.

```bash
npm run dev
```

Open the printed `http://127.0.0.1:<port>` URL. The application creates `data/learning-atlas.sqlite` locally. To keep personal data elsewhere, set `LEARNING_ATLAS_DATA_DIR` before starting it.

## Current scope

The app loads each published lesson's identity, provenance, content, quiz, theory cards, and local practice resources from its `lessonId`, alongside persistent notes, learning state, reading position, learner-confirmed review items, and local tutor conversations. Learners can configure an OpenAI-compatible local or chosen model service in the tutor panel; each tutor request carries the active reading section, linked approved theory card, and local learning state, while its key stays in the local database and is never included in exports. JSON and Markdown exports are available from the notes panel. The app can create a learner-owned VS Code workspace with a Python reference implementation, exercise scaffold, standard-library tests, and optional marimo exploration from approved templates. It intentionally does not present a draft translation or unapproved theory link as published course content. Versioned adaptations and mappings follow [`docs/content-schema.md`](../../docs/content-schema.md).

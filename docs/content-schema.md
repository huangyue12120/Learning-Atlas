# Versioned Content Schema

This contract governs material owned by Learning Atlas. The upstream repositories remain read-only submodules; learner data belongs only in the local SQLite database.

License boundaries follow the same ownership split: original software is under
[`LICENSE`](../LICENSE), original documentation and independent learning prose
are under [`LICENSE-CONTENT.md`](../LICENSE-CONTENT.md), and upstream-derived or
third-party material keeps its applicable license and attribution listed in
[`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

## Layout

```text
content/
  translations/
    practice/<phase>/<lesson>/zh.md
    theory/<chapter>/<note>/zh.md
  theory-links/
    <phase>/<lesson>/<anchor>.yaml
  explorations/
    <phase>/<lesson>/<name>.py
  workspace-templates/
    <phase>/<lesson>/<file>
  assessments/
    practice/<phase>/<lesson>/zh.json
```

Each translation is Markdown with YAML front matter. The body is the Chinese learning adaptation; the front matter makes its provenance and review state verifiable.

```yaml
kind: practice-translation
source:
  repository: ai-engineering-from-scratch
  path: phases/01-math-foundations/01-linear-algebra-intuition/docs/en.md
  revision: <submodule commit SHA>
  sha256: <SHA-256 of source file>
status: draft # draft | reviewed | stale
```

Theory notes use a stable identifier derived from the published snapshot path, for example `theory/chapter-04-statistics/03-sampling`. The identifier belongs to the note across language and reader surfaces; later theory progress or notes must reuse it rather than inventing a second key. A Chinese theory body records `branch: main` and is publishable only when it is `reviewed`, names the matching theory source path, and its SHA-256 equals the current source file after the local theory submodule has been synchronized with upstream `main`. A recorded `revision` is an audit trail for the review; API consumers receive it as `reviewedRevision`, while the published source `revision` and URL remain `main`. Every other state falls back to the official upstream English `main` without serving the local Chinese body.

Each theory-link file represents one link from a stable practice-lesson anchor to one theory note. It includes both source locations, the theory-note anchor, and a structured contextual card. Multiple approved links may share one practice anchor; the reader renders each approved card at that section. For published Phase 0–16 content, `practice.anchor.slug` must appear on exactly one corresponding heading in the translated lesson so the card is injected at the intended location. The application renders only approved links whose practice and theory fingerprints are current. Published Phase 0–16 cards must have the complete card contract; during a migration window, an older approved card may use a summary-only fallback that explicitly says its extension is pending and never invents missing learning content. A changed source hash marks the corresponding translation stale; it never overwrites it automatically.

Published contextual cards use this contract:

```yaml
card:
  title: <concise concept title>
  summary: <enough-for-this-task summary shown while collapsed>
  context: "<why this concept is needed at the current practice anchor>"
  intuition: "<operational mental model grounded in the linked theory section>"
  key_points:
    - "<specific fact, condition, relation, or boundary>"
    - "<specific fact, condition, relation, or boundary>"
  application: "<how the learner uses the concept in this lesson>"
  check_question: "<one answerable diagnostic question ending with a question mark>"
```

`key_points` contains two to four non-redundant items. `context` and `application` are practice-anchor-specific; `intuition` and every key point must be supported by the linked theory section. The check question tests the relationship needed in the current lesson rather than asking for a definition by rote. These fields are versioned learning content: an agent may draft them, but a human editor must compare them with both anchors before the existing theory link may remain `approved`.

The collapsed card shows the label, title, summary, and available full-text language. Expansion reveals context, intuition, key points, application, one check question, and deduplicated source actions. When the internal Chinese reader and official English source are different destinations, both may appear. When they resolve to the same official `main` URL, the reader renders only one English action.

Each exploration is a Python marimo template. The application copies it into the learner's workspace before launch, so the versioned template stays reviewable and the learner can experiment without changing course content.

Each workspace template is a Python-first learner artifact such as an exercise scaffold, standard-library test, or short practice guide. The application copies a template only when the target file is absent, so later launches never overwrite learner code.

Each assessment adaptation is JSON with its source repository, path, revision, SHA-256 fingerprint, review status, and Chinese questions. The application may expose questions only when the source fingerprint remains current; answer keys and explanations stay on the local backend until the learner submits an attempt.

## Editorial Rules

Keep Python code, commands, formulas, attribution, and licensing notices semantically intact. Link to non-Python upstream variants instead of maintaining them. Preserve the source path and the applicable upstream branch/revision metadata for every adaptation; theory source links use the official `main` branch, while a recorded theory revision only identifies the review snapshot. Add a mapping only after human editorial review; an agent may create a proposal but cannot publish it.

### Source-correspondence requirement

A Chinese adaptation is a translation of one specific upstream document, not a topic summary or a rewrite assembled from several source sections. It must preserve the source document's teaching sequence and provide one corresponding Chinese unit for each source unit:

- retain the title, hook, metadata, learning objectives, top-level sections, subsections, examples, figures, build/use steps, deliverable, exercises, terms, and further-reading entries in their original order;
- keep Python code, commands, formulas, figure identifiers, links, and exercise requirements semantically intact and at the same instructional location;
- for every Mermaid diagram, preserve the source diagram's graph direction, node IDs, edge operators and directions, subgraph declarations, shape delimiters, and existing quoted-label syntax exactly; the reader must localize every learner-visible node, edge, and subgraph label without changing an ID, removing quotes, flattening a subgraph, or rewriting topology;
- translate prose naturally into Chinese, but do not merge, omit, move, or add a source unit merely for brevity;
- where the upstream document contains a non-Python implementation, omit its maintained copy under the Python-first policy only when that exact location links learners to the upstream original;
- label genuinely new explanatory material as `> **编者注：** ...`; it must follow the source unit it explains and must not replace any source material.

Before a translation may be marked `reviewed`, the editor must compare it with the source named in its front matter and check: section/subsection order, all fenced examples and figure placeholders, code and formulas, exercises, links, and the Python-first exception above. A matching source SHA-256 establishes freshness only; it does not establish source correspondence.

Run `python3 scripts/check_translation_correspondence.py <translation-file>...` as the structural portion of this review. It checks Mermaid grammar/topology while permitting translated quoted labels. For any changed Mermaid diagram, also render the translated Markdown with Mermaid CLI before marking the lesson `reviewed`. The check does not evaluate Chinese meaning; it deliberately leaves that final editorial judgment to a human reviewer.

## Reader and learner-data compatibility (v0.28.0)

`/api/course` retains `available` and adds `publicationStatus` (`available`, `stale`, `untranslated`, `staged`). Phase 19 remains blocked for reading and tools. A translation marked `reviewed` must contain no pending Chinese review marker.

`/api/quiz` exposes `stage` and a content fingerprint, without answers. Grading exposes `correctOption`; predictions are draft state only. `/api/reader-draft?lessonId=...` supports GET/PUT for note/tutor/review text, answer/prediction selections and expanded cards. Choices bind to the quiz fingerprint and clear when questions change. Model credentials are excluded.

JSON backup schema 4 adds `readerDrafts`; schema 3 remains accepted with no drafts. Unknown lesson records are retained. `/api/undo` accepts the server-issued token and scope, enforces a 60-second lifetime and rejects whole-import restoration after any subsequent learner-data write. Snapshot and learner tables remain local SQLite data and never enter versioned content.

## Assessment evidence (v0.29.0)

`content/assessment-links/practice/<phase>/<lesson>/links.json` records the lesson id, translation/assessment SHA-256, reviewer attribution and per-question `id`, `status`, `headingId`, `quote`. Only explicitly reviewed entries with matching fingerprints and an existing quote are eligible for grading feedback. Draft candidates live under `review/followups/assessment-candidates.json` and are never loaded by the reader. Candidate similarity scores are search aids, not a semantic approval. The reader confirms the paragraph against rendered text and falls back to a section or the lesson body if it cannot locate the quote.

Mappings may also record `reviewedAt` and a per-question `reviewNote`. Attribution identifies agent review explicitly and must not imply external human approval. The checker confines each quote to its named section, including code and table evidence; the browser verifies the quote against the actual rendered paragraph, code or table cell. A heading inside a code fence does not create a new section.

Run `python3 scripts/assessment_review.py --write` after source changes, examine the option-length priority report, then run `--check`. Candidate generation never updates a published mapping. Updated reviewed links require a new comparison of question, answer/explanation and the actual supporting paragraph before refreshing their fingerprints. The current pilot covers five checked questions; full question-by-question editorial review remains separate.

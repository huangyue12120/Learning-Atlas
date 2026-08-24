# Versioned Content Schema

This contract governs material owned by Learning Atlas. The upstream repositories remain read-only submodules; learner data belongs only in the local SQLite database.

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

Each theory-link file represents one link from a stable practice-lesson anchor to one theory note. It includes the card title and summary, both source locations, the theory-note anchor, and `status: proposed | approved | rejected`. Multiple approved links may share one practice anchor; the reader renders each approved card at that section. The application renders only approved links. A changed source hash marks the corresponding translation stale; it never overwrites it automatically.

Each exploration is a Python marimo template. The application copies it into the learner's workspace before launch, so the versioned template stays reviewable and the learner can experiment without changing course content.

Each workspace template is a Python-first learner artifact such as an exercise scaffold, standard-library test, or short practice guide. The application copies a template only when the target file is absent, so later launches never overwrite learner code.

Each assessment adaptation is JSON with its source repository, path, revision, SHA-256 fingerprint, review status, and Chinese questions. The application may expose questions only when the source fingerprint remains current; answer keys and explanations stay on the local backend until the learner submits an attempt.

## Editorial Rules

Keep Python code, commands, formulas, attribution, and licensing notices semantically intact. Link to non-Python upstream variants instead of maintaining them. Preserve the source path and pinned revision for every adaptation. Add a mapping only after human editorial review; an agent may create a proposal but cannot publish it.

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

# Learning Atlas Content

This directory contains versioned Chinese adaptations and human-approved contextual theory links owned by Learning Atlas. Its structure and metadata contract are defined in [`docs/content-schema.md`](../docs/content-schema.md).

The v0.32.0 snapshot (2026-11-06) tracks `ai-engineering-from-scratch` at `d7b5633f91591ee3bf55c8d80831b515498cc0e6` and `maths-cs-ai-compendium` at `9850ee574a370bc1cde59de98b394e953775b67d`. All 542 reviewed practice lessons in Phase 0–19 are available in the reader. The published content includes 392 Chinese assessments (2362 questions), 534 Python workspace guides, 311 approved rich theory cards, and 89 reviewed Chinese theory notes. The remaining 15 theory notes use the official English `main`; 150 practice lessons have no upstream quiz, so no quiz is fabricated. P16's two TypeScript-only exceptions retain upstream links.

P19 adds 85 assessments, 85 guides and the remaining 22 rich cards. Private P19 workspaces preserve `code/`, root-level tests and fixed sibling prerequisites, including the taxonomy fixture, without overwriting learner files or maintaining parallel TypeScript copies. The user authorized Codex's per-item semantic review for this batch; its attribution, source issues and verification limits are recorded in [the P19 review](../docs/p19-review.md). Existing theory-link approvals remain unchanged. Formal paragraph evidence stays at 177 reviewed mappings; 2185 questions still lack that separate evidence mapping. Historical releases are listed in [release notes](../docs/release-notes.md).

Use [`docs/translation-glossary.md`](../docs/translation-glossary.md) as the Chinese terminology baseline when editing or adding adaptations.

Original content in this directory is covered by [`LICENSE-CONTENT.md`](../LICENSE-CONTENT.md) unless a file identifies another license. Adaptations and excerpts derived from an upstream repository retain that repository's license and attribution; see [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

Do not store progress, notes, conversations, review items, learner workspaces, API keys, or database files here. Those are learner-owned local data.

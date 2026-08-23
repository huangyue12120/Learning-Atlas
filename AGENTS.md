# Repository Guidelines

## Project Structure & Module Organization

This workspace combines a local learning product with two independent upstream course repositories. Keep changes scoped to the relevant project:

- `maths-cs-ai-compendium/` contains Markdown theory chapters, MkDocs configuration, and `mcp/`, a TypeScript MCP server.
- `ai-engineering-from-scratch/` contains practical lessons under `phases/`, static site assets in `site/`, and shared terms in `glossary/`.
- `apps/local-learning/` is the local Node-and-browser app; `content/` holds adaptations and approved theory links; `docs/adr/` records decisions; `design-system/learning-atlas/` holds product-design references.

Read `CONTEXT.md` before changing the unified learning experience. Follow a nested project's own `AGENTS.md` when present; it takes precedence for that subtree.

## Build, Test, and Development Commands

Run commands from the applicable project directory, not the workspace root:

```bash
cd maths-cs-ai-compendium/mcp && npm run setup && npm start # install and run MCP server
cd ai-engineering-from-scratch && node site/build.js        # rebuild site data after source edits
cd apps/local-learning && npm run dev                       # start the local learning app
```

Run `npm test` in `apps/local-learning/` for its API. TypeScript capstones commonly provide `npm run typecheck` and `npm test`; consult their local `package.json`. For Python lessons, install `ai-engineering-from-scratch/requirements.txt` only when needed.

## Coding Style & Naming Conventions

Preserve each subproject's existing style and avoid cross-project refactors. Keep Markdown chapter and lesson paths in their established numbered form, such as `chapter 03 - calculus/01. differential calculus.md` and `phases/02-ml-fundamentals/10-lesson-name/`. Use descriptive, lowercase kebab-case slugs for new directories.

Write Chinese learning adaptations naturally while preserving Python code, commands, formulas, source links, and technical meaning. Link to non-Python upstream variants rather than maintaining them. Do not add learner data or API keys to versioned content.

## Testing Guidelines

Test the smallest affected surface. Run a touched TypeScript package's `npm test` and `npm run typecheck`. Execute changed Python examples and their local test command when supplied. Do not claim a workspace-wide test run: there is no root test runner.

## Versioning and Release Guidelines

Treat substantial user-visible changes as a release change. This includes adding or materially revising a batch of Chinese adaptations, opening a new phase, changing the published learning scope, or adding a major reader capability. Before committing such work:

- increment the project version using SemVer (`0.x.0` for a backward-compatible major content or feature milestone, patch versions for smaller fixes, and a major version for breaking changes);
- keep the root `README.md`, the applicable release notes and content manifest, and the local app `package.json`/`package-lock.json` version fields consistent;
- record the new version and release date in the user-facing documentation;
- verify that no current documentation still describes the previous published scope.

Small internal fixes, typo corrections, and non-user-visible refactors do not require a version bump unless the task explicitly requests one.

## Commit & Pull Request Guidelines

Use concise Conventional Commit-style subjects reflected in upstream history: `feat(reader): add review filter`, `fix(mcp): handle chapter paths`, or `chore(site): rebuild data`. Keep each commit and pull request focused on one logical change. Describe the user-visible effect, list validation performed, link the related issue when available, and include screenshots for prototype or site UI changes. Do not commit generated files unless the affected subproject explicitly requires them.

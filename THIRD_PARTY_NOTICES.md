# Learning Atlas third-party notices

This file identifies material that is not relicensed by the root project
licenses. Retain the applicable upstream license, copyright, attribution, and
change notices when redistributing a portion that uses this material. The
submodules also carry their complete license files at the paths below.

## Upstream course repositories

### `ai-engineering-from-scratch`

- Repository: <https://github.com/rohitg00/ai-engineering-from-scratch>
- Published snapshot: `d18b8fe5a913c46011a3b06cb6ebd6a924414fd3`
- License: MIT, as stated in `ai-engineering-from-scratch/LICENSE`
- Copyright notice in the snapshot: Rohit Ghumare
- Scope in this repository: source lessons and the Chinese adaptations that
  identify this repository in their provenance metadata. The Learning Atlas
  translation and editorial contribution does not remove the upstream MIT
  notice or grant rights beyond the upstream license.

### `maths-cs-ai-compendium`

- Repository: <https://github.com/HenryNdubuaku/maths-cs-ai-compendium>
- Published snapshot: `9850ee574a370bc1cde59de98b394e953775b67d`
- License: Apache-2.0, as stated in `maths-cs-ai-compendium/LICENSE`
- Scope in this repository: theory source material and translations or
  excerpts that identify this repository in their provenance metadata. Keep
  the upstream Apache-2.0 terms, notices, and any notice of changes.

The submodule directories are read-only inputs. Root `LICENSE` and
`LICENSE-CONTENT.md` do not relicense either upstream repository.

## Bundled fonts

The local reader bundles font files under
`apps/local-learning/public/fonts/`. Each font remains under its own SIL Open
Font License, Version 1.1 notice:

- Atlas Sans SC: `apps/local-learning/public/fonts/OFL-AtlasSansSC.txt`
- DM Mono: `apps/local-learning/public/fonts/OFL-DMMono.txt`
- Source Serif 4: `apps/local-learning/public/fonts/OFL-SourceSerif4.md`

## Runtime dependencies

The local app's direct npm dependencies are distributed under their own
package licenses and are not covered by the root Apache or CC BY grants. The
lockfile records the exact versions and declared licenses:

| Package | Version | Declared license |
| --- | ---: | --- |
| `@highlightjs/cdn-assets` | 11.11.1 | BSD-3-Clause |
| `gsap` | 3.15.0 | GreenSock Standard “no charge” license; see <https://gsap.com/standard-license> |
| `katex` | 0.18.4 | MIT |
| `mermaid` | 11.16.1 | MIT |

Transitive dependencies remain subject to their own notices in the package
distribution and lockfile. Check the current package metadata before making a
redistributable bundle.

## External references and visuals

Links to papers, standards, tutorials, and other external references retain
their source terms. Bundled visual assets under
`apps/local-learning/public/assets/` are Learning Atlas materials only to the
extent that the project holds the necessary rights; add a per-asset notice
before redistributing any asset whose provenance is not project-owned.

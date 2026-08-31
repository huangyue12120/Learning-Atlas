# Separate software, educational content, and third-party license boundaries

## Context

Learning Atlas combines original local-reader software, original Chinese
learning adaptations and design documentation, two read-only upstream course
repositories, bundled fonts, and npm dependencies. A single root license would
make it unclear which rights apply to a translated upstream lesson or a font.
The project also needs a clear, reusable license for software while keeping
educational content easy to share with attribution.

## Decision

License original software source under Apache-2.0. This covers the local app,
scripts, tests, and configuration unless a more specific notice applies.
License original documentation, design material, and independently authored
educational prose under CC BY 4.0. Keep the two grants in separate files:
`LICENSE` and `LICENSE-CONTENT.md`.

Material derived from `ai-engineering-from-scratch` or
`maths-cs-ai-compendium` remains subject to the applicable upstream MIT or
Apache-2.0 license, including attribution and change-notice requirements.
Bundled fonts, npm dependencies, visuals, and other third-party material keep
their own licenses. `THIRD_PARTY_NOTICES.md` records the known boundaries and
points to the authoritative notices.

Contributors may only license material for which they hold the necessary
rights. A file-level or asset-level notice takes precedence over the default
path boundary above.

## Consequences

Software users receive a permissive license with an explicit patent grant,
while educators can reuse and adapt original content with attribution. The
repository must maintain attribution and provenance metadata for upstream
derivatives and must not imply that root licenses cover third-party assets or
dependencies. New external assets require a provenance check before inclusion
in a redistributable release.

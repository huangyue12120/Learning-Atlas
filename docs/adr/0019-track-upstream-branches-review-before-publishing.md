# Track upstream branches and review updates before publishing

The two source submodules track their upstream `main` branches. A parent Git commit still records a specific submodule commit, so every Learning Atlas release remains reproducible. Tracking a branch does not auto-publish new source content.

The scheduled upstream check detects commits ahead of the recorded source snapshots. Maintainers use `scripts/manage_upstreams.py --sync` to bring those commits into a working tree, then update and review affected Chinese adaptations, assessments and theory links. Source fingerprint and translation-correspondence checks must pass before committing the new submodule pointers. The application continues to mark mismatched content as pending synchronization while this review is incomplete.

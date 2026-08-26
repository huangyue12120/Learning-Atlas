# Add translation coverage and dependency checks

## Context

Content validation already checks source fingerprints and translation structure, but it does not report newly published upstream lessons that have no Chinese practice adaptation. The repository also needs a lightweight guard against accidentally versioning learner data, local state, credentials, or common secret formats. Dependency changes in pull requests should receive an independent security review.

## Decision

Add a weekly and manually triggered **Monitoring / Check translation coverage** workflow. It uses existing practice-translation metadata to define the active Chinese learning scope, compares that scope with upstream `docs/en.md` lessons, and creates or updates a deduplicated `[Coverage] Chinese practice translations missing` issue when gaps are found. A missing translation is a content follow-up and therefore does not get silently ignored, while fetch or script errors remain workflow failures without a coverage issue.

Run `scripts/check_translation_correspondence.py` and `scripts/check_repository_hygiene.py` in the content-validation workflow. The hygiene check examines tracked root-repository files for learner-owned data paths, local-state suffixes, credential filenames, private keys, and common access-token patterns; upstream submodule contents are not treated as project-owned uploads.

Add **Security / Review dependency changes** for pull requests targeting `main`, using the official GitHub dependency-review action and failing on high or critical severity. Release smoke tests and browser smoke tests remain out of scope until the project has a stable release and browser-test harness.

## Consequences

Translation gaps become visible and actionable without declaring not-yet-adopted phases incomplete. CI catches structural drift and common accidental uploads before merge, while dependency review adds a narrowly scoped PR gate without introducing a package manager audit policy. The checks are intentionally advisory about content scope but blocking about repository integrity and high-severity dependency changes.

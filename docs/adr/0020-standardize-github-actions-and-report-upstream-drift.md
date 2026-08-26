# Standardize GitHub Actions and report upstream drift

## Context

Learning Atlas has three workflows for validation, upstream synchronization, and freshness monitoring. Their display names and job identifiers were inconsistent, and freshness failures did not preserve enough information to identify which source files required translation review. A fetch, permission, or network failure must remain distinguishable from a tracked upstream commit update.

## Decision

Use workflow display names in the form `<Area> / <Action and object>`: `CI / ...`, `Automation / ...`, and `Monitoring / ...`. Keep job IDs as stable kebab-case identifiers and use natural-language `jobs.<id>.name` values for the Actions UI. Add concurrency groups so stale validation runs can be cancelled while review and synchronization runs are serialized.

The monitoring workflow treats `manage_upstreams.py --check --fail-on-update` exit code 2 as the only confirmed “upstream branch is ahead” condition. It then generates a Markdown report from the upstream commit range. The report lists every changed upstream path, maps referenced files to local translations, assessments, and theory links, compares recorded and target SHA-256 values, and embeds bounded unified diffs with links to the complete upstream comparison.

The workflow creates or updates one open `[Upstream] Source updates require review` issue. A stable snapshot marker prevents repeated daily runs from adding duplicate comments. Other nonzero statuses remain workflow failures without creating a content issue. GitHub Issue subscriptions are the default notification channel; SMTP or third-party email requires separately managed repository secrets and is not enabled by default.

## Consequences

Maintainers receive an actionable, deduplicated review record without automatic content overwrites or theory-link approvals. The freshness workflow still fails until the pinned upstream snapshot and all affected content have been deliberately reviewed. Large diffs are bounded in the Issue body and remain available through the upstream comparison link.

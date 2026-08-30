# Offer complete theory as a secondary course

ADR 0002 made practice the primary path and rejected a parallel theory sequence. Learning Atlas v0.12.0 partially supersedes that boundary: practice remains the default path, while the complete theory snapshot becomes an independently browsable secondary course. Contextual theory cards remain the human-approved connection from a practical task to that course, and theory does not receive progress, notes, assessments, or tutor state in this release.

The theory source follows the official `main` branch. A reviewed Chinese note remains versioned locally and is shown only while its SHA-256 matches the locally synchronized `main` snapshot; any recorded review revision is provenance metadata, not a pinned reader URL. This supersedes ADR 0018's pinned-theory-link wording for the theory course while preserving its review and practice-first boundaries.

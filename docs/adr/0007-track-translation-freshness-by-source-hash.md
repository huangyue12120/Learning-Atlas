# Track translation freshness by source hash

Translations will record the SHA-256 of their upstream source content and the source path and revision used to create them. The application will compare that fingerprint with the currently checked-out upstream file and visibly mark mismatches as pending synchronization; updates are reviewed and translated deliberately rather than silently overwriting Chinese content. For theory translations, the upstream branch is `main` and the recorded revision is audit provenance only; reader source links follow the official `main` branch.

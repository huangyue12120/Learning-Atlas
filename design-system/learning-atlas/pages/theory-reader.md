# Theory Reader Page

The theory reader at `/theory?theoryId=...` presents only reviewed Chinese theory documents whose source fingerprint matches the local theory submodule after synchronization with upstream `main`. It is a reference surface in v0.12.0: do not add theory progress, notes, assessments, workspaces, or tutor controls.

## Layout

Desktop uses a persistent chapter navigator beside one focused reading column. The navigator contains all 20 chapters and their note links; the current note is uniquely highlighted. Below 1024px the navigator becomes a labelled drawer with a scrim and Escape-key close behaviour. The article header shows the Chinese title, source path, reviewed status, tracked `main` branch, and the official English `main` source link. Any recorded revision is audit metadata only.

The body uses Source Serif 4 for prose, Atlas Sans SC for interface text, and DM Mono for code and source metadata. It supports stable heading anchors, a page table of contents, relative images, KaTeX formulas, Highlight.js code, and code copy. Images are real upstream assets served from the restricted read-only theory resource route.

## States and accessibility

Loading uses a two-column reader skeleton. Unknown, stale, draft, or otherwise unpublished theory content renders a safe error with retry and a link back to the theory directory. Maintain keyboard navigation, visible focus, 44px controls, readable formula overflow, alt text, light/dark token parity, and reduced-motion static behaviour. After an upstream `main` update, a stale Chinese translation must not be shown until its SHA-256 is reviewed again.

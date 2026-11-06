# Course Reader Page

This page is the primary Learning Atlas experience. These rules override the shared design system where they are more specific.

## Layout

Use a three-region desktop shell: persistent curriculum navigation, a centered lesson column (about 760–860px), and an optional resizable tutor panel. Keep the lesson as the visual focus. On screens below 900px, replace the navigation with a drawer and render the tutor and learner-data panels as bottom sheets.

The reading column contains, in order: lesson identity and source status, title and learning objectives, prose and code, contextual theory cards at the relevant paragraph, a reflection prompt, and lesson navigation. Do not add a landing-page hero, newsletter sign-up, subscriber counts, testimonials, or author-promotion sections.

## Reading Components

- **Theory cards:** show a concise “enough for this task” summary by default; expansion reveals intuition, derivation or example, and an attributed link to the full theory note.
- **Source status:** make upstream attribution and translation freshness visible but quiet; a stale translation must not look current.
- **Personal state:** progress, notes, confirmed misconceptions, and review items are clearly marked as learner-owned data.
- **Tutor:** starts collapsed. Its evidence strip identifies the active lesson section and linked theory. The initial action is one answerable diagnostic question, not a direct answer.

## Behaviour

Use disclosure rather than modal interruption. Preserve reading position when panels open or close. Buttons provide immediate feedback, but completion and review status must never imply mastery without learner confirmation. Code is visually distinct, scrollable on narrow screens, and copyable without changing its semantics.

## v0.28.0 implementation

The shell and panel forms stay mounted. Lesson navigation replaces the lesson region, while note lists, conversation messages, review items and grading feedback update locally. Store drafts by lesson in SQLite; bind quiz choices to their content fingerprint. Keep unsaved model credentials in memory only.

At 1440px the right region shows a text section directory and reading progress; opening any auxiliary panel uses that region. At 1024px panels overlay with focus containment. At 375/768px the directory collapses, curriculum navigation is a drawer and auxiliary panels are bottom sheets. Modal surfaces trap focus, make background regions inert, close with Escape and return focus to their trigger. Theme control remains available at every width. Course statuses combine shape and text; external links announce a new window. Destructive actions use inline confirmation and a 60-second server-backed undo.

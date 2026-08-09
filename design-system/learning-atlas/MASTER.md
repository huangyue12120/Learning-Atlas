# Learning Atlas Design System

## Product Intent

Learning Atlas is a local-first Chinese learning application. The reading experience is the product: learners follow the practical curriculum, open contextual theory only when it helps the current task, and retain control of their notes, progress, and model configuration. Design must clarify that hierarchy; it must not resemble a marketing site, newsletter, generic chatbot, or a second theory curriculum.

## Visual Direction

Use a quiet, paper-like editorial interface for technically serious adult learners.

| Role | Token | Value |
| --- | --- | --- |
| Canvas | `--color-canvas` | `#F7F4EC` |
| Surface | `--color-surface` | `#FFFEFA` |
| Ink | `--color-ink` | `#183538` |
| Muted ink | `--color-ink-muted` | `#527072` |
| Primary | `--color-primary` | `#0A726C` |
| Primary strong | `--color-primary-strong` | `#07534F` |
| Learning cue | `--color-learning` | `#B96F16` |
| Review cue | `--color-review` | `#B6463D` |
| Border | `--color-border` | `#D8D4C8` |

Use `Noto Sans SC` for Chinese UI text, `Source Serif 4` for long-form explanations and formulas, and `DM Mono` for source paths, code, and compact metadata. Use a 4px spacing scale, restrained shadows, and square-to-slightly-rounded surfaces. Avoid oversized display type, playful illustration, gradients used as decoration, and conversion-oriented CTA patterns.

## Token and Component Rules

Maintain three layers: primitive values, semantic aliases, then component tokens. Components must reference semantic tokens rather than raw hex values. Define states for default, hover, focus-visible, active, disabled, and selected.

Use teal for navigation and confirmed progress, amber for learning prompts and contextual theory, and red only for review or destructive actions. Never communicate a state through colour alone.

## Interaction & Accessibility

Motion is subtle and functional (150–250ms); support `prefers-reduced-motion`. Keyboard focus must remain visible, icon-only controls need accessible names, body text must meet 4.5:1 contrast, and touch targets must be at least 44px where practical. Validate the course reader at 375px, 768px, 1024px, and 1440px without horizontal scrolling.

## Product Surfaces

The reader is the primary surface. It combines a collapsible curriculum navigator, focused lesson prose, expandable theory cards, source attribution, and learner-owned state. The tutor is an explicitly opened, evidence-labelled panel: desktop side panel and mobile bottom sheet. Notes and review items are separate learner-data panels, never part of the versioned course content.

# Learning Home Page

The home page introduces one practical main path and one complete secondary theory course. These rules apply only to `/`; the practice reader retains the rules in `course-reader.md`.

## Layout and hierarchy

Use a single-page AIDA sequence: navigation, asymmetric hero, dynamic start or continue action, one curriculum-domain marquee, a manual Phase carousel, the complete theory accordion, a practice/theory relationship statement, and a final action. The hero visual is a gapless 12-column grid of real upstream teaching SVGs: the primary visual spans seven columns and both rows, while two supporting visuals occupy five columns each. Below 768px every multi-column section becomes one strict column.

Practice is always named and placed first. Phase 0-13 may link into the practice reader; Phase 14-19 must say “已审核，待接入” and must not expose a reader target. Theory notes with a current reviewed Chinese translation link to the internal theory reader; all other notes open the official upstream `main` in a new tab.

## Motion and states

Use `DESIGN_VARIANCE 7`, `MOTION 6`, and `DENSITY 4`. GSAP is limited to one desktop course-section pin and one text scrub reveal; both communicate curriculum hierarchy. Mobile, reduced-motion, and low-performance layouts show the final static state. The page uses one CSS marquee only.

Loading uses a skeleton shaped like the final navigation, hero copy, and three-cell visual. Error state provides retry and a direct practice-reader link. Empty practice or theory directories explain that the local curriculum snapshot is unavailable. Keep visible focus, 44px targets, single-line CTA labels, WCAG AA contrast, and no horizontal overflow.

#!/usr/bin/env python3
"""Check structural correspondence between Learning Atlas translations and sources.

This check intentionally verifies structure, not Chinese wording. Editorial review
still confirms that each translated unit faithfully conveys its source unit.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
UPSTREAM_REPOSITORIES = {
    "ai-engineering-from-scratch": ROOT / "ai-engineering-from-scratch",
    "maths-cs-ai-compendium": ROOT / "maths-cs-ai-compendium",
}
TRANSLATION_ROOT = ROOT / "content" / "translations"
FRONT_MATTER = re.compile(r"\A---\r?\n.*?\r?\n---\r?\n", re.DOTALL)
HTML_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)
SOURCE_REPOSITORY = re.compile(r"^\s*repository:\s*(\S+)\s*$", re.MULTILINE)
SOURCE_PATH = re.compile(r"^\s*path:\s*(.+?)\s*$", re.MULTILINE)
FENCE = re.compile(r"^```([^\n]*)\n(.*?)^```\s*$", re.MULTILINE | re.DOTALL)
HEADING = re.compile(r"^(#{1,6})\s+(.+?)\s*$", re.MULTILINE)
LINK = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")
MERMAID_QUOTED_TEXT = re.compile(r'"(?:[^"\\]|\\.)*"')
MERMAID_EDGE_LABEL = re.compile(r'\|(?:[^|\\]|\\.)*\|')
MERMAID_DOTTED_EDGE_LABEL = re.compile(r'(?P<prefix>-\.\s*)(?:[^\n.]+?)(?P<suffix>\s*\.->)')
MERMAID_FLOW_EDGE_LABEL = re.compile(r'(?P<prefix>--\s+)(?:[^-\n]+?)(?P<suffix>\s+-->)')
MERMAID_SQUARE_LABEL = re.compile(r'(?P<prefix>\b[A-Za-z][A-Za-z0-9_-]*\s*)\[(?:[^\]\\]|\\.)*\]')
MERMAID_CURLY_LABEL = re.compile(r'(?P<prefix>\b[A-Za-z][A-Za-z0-9_-]*\s*)\{(?:[^}\\]|\\.)*\}')
MERMAID_PAREN_LABEL = re.compile(r'(?P<prefix>\b[A-Za-z][A-Za-z0-9_-]*\s*)\((?:[^)\\]|\\.)*\)')
MERMAID_TIMELINE_TITLE = re.compile(r'^(\s*title\s+).+$', re.MULTILINE)
MERMAID_TIMELINE_EVENT = re.compile(r'^(\s*[^:\n]+\s*:\s*[^:\n]+\s*:\s*).+$', re.MULTILINE)
MERMAID_UNQUOTED_SUBGRAPH = re.compile(
    r'^(\s*subgraph\s+)(?![A-Za-z][A-Za-z0-9_-]*\s*\[).+$', re.MULTILINE
)
MERMAID_SEQUENCE_PARTICIPANT = re.compile(r'^(\s*participant\s+\S+\s+as\s+).+$', re.MULTILINE)
MERMAID_SEQUENCE_PARTICIPANT_ID = re.compile(
    r'^(\s*participant\s+\S+)(?:\s+as\s+.+)?$', re.MULTILINE
)
MERMAID_SEQUENCE_NOTE = re.compile(r'^(\s*Note\s+over\s+[^:\n]+:\s*).+$', re.MULTILINE)
MERMAID_SEQUENCE_MESSAGE = re.compile(
    r'^(\s*[^:\n]+(?:->>|-->>|-->|->|\.\.>|-\)|==>)[^:\n]*:\s*).+$',
    re.MULTILINE,
)
MERMAID_SEQUENCE_BRANCH = re.compile(
    r'^(\s*(?:alt|else|opt|loop|par|and|critical|option|break)\b)(?:\s+.+)?$', re.MULTILINE
)
MERMAID_STATE_ALIAS = re.compile(
    r'^(?:\s*state\s+"[^"]*"\s+as\s+[A-Za-z][A-Za-z0-9_-]*\s*\n)+', re.MULTILINE
)
MERMAID_STATE_TRANSITION = re.compile(
    r'^(?P<prefix>\s*(?:\[\*\]|[A-Za-z][A-Za-z0-9_-]*)\s*-->\s*'
    r'(?:\[\*\]|[A-Za-z][A-Za-z0-9_-]*)\s*:\s*).+$',
    re.MULTILINE,
)
MERMAID_STATE_NOTE = re.compile(
    r'^(?P<start>\s*note\s+(?:left|right|over)\s+.+?\n)(?P<body>.*?)(?P<end>^\s*end note\s*$)',
    re.MULTILINE | re.DOTALL,
)
OMITTED_NON_PYTHON = re.compile(r"<!--\s*learning-atlas:\s*upstream-non-python omitted=([a-z0-9_+-]+)\s*-->")


@dataclass(frozen=True)
class Structure:
    heading_levels: list[int]
    fences: list[str]
    figures: list[str]
    links: list[str]
    mermaid: list[str]


def normalize_mermaid(diagram: str) -> str:
    """Keep Mermaid grammar while ignoring translated quoted labels.

    Node IDs, graph direction, edge syntax, subgraph declarations, shape
    delimiters, and quoting must remain source-compatible. Chinese adaptations
    may replace learner-visible node, edge, and subgraph labels in place.
    """

    normalized = MERMAID_QUOTED_TEXT.sub('"…"', diagram)
    # A bare `subgraph title` has no separate ID; the title itself is visible
    # text. Allow that title to be localized while preserving explicit IDs such
    # as `subgraph Prefill["..."]`.
    normalized = MERMAID_UNQUOTED_SUBGRAPH.sub(r'\1…', normalized)
    if re.search(r'^\s*timeline\b', normalized, re.MULTILINE):
        # Timeline event text is learner-visible like a flowchart node label.
        # Preserve the date/category delimiters while allowing its translation.
        normalized = MERMAID_TIMELINE_TITLE.sub(r'\1…', normalized)
        normalized = MERMAID_TIMELINE_EVENT.sub(r'\1…', normalized)
    if re.search(r'^\s*sequenceDiagram\b', normalized, re.MULTILINE):
        # Sequence participants, notes, and message text are visible labels;
        # keep participant IDs and message arrows while ignoring translations.
        normalized = MERMAID_SEQUENCE_PARTICIPANT.sub(r'\1…', normalized)
        normalized = MERMAID_SEQUENCE_PARTICIPANT_ID.sub(r'\1', normalized)
        normalized = MERMAID_SEQUENCE_NOTE.sub(r'\1…', normalized)
        normalized = MERMAID_SEQUENCE_MESSAGE.sub(r'\1…', normalized)
        normalized = MERMAID_SEQUENCE_BRANCH.sub(r'\1…', normalized)
    if re.search(r'^\s*stateDiagram(?:-v2)?\b', normalized, re.MULTILINE):
        # State aliases localize visible state names while retaining the source
        # IDs in every transition. They do not change the diagram topology.
        normalized = MERMAID_STATE_ALIAS.sub("", normalized)
        normalized = MERMAID_STATE_TRANSITION.sub(r'\g<prefix>…', normalized)

        def normalize_state_note(match: re.Match[str]) -> str:
            note_body = re.sub(r'^(\s*).+$', r'\1…', match.group('body'), flags=re.MULTILINE)
            return f"{match.group('start')}{note_body}{match.group('end')}"

        normalized = MERMAID_STATE_NOTE.sub(normalize_state_note, normalized)
    normalized = MERMAID_EDGE_LABEL.sub('|…|', normalized)
    normalized = MERMAID_DOTTED_EDGE_LABEL.sub(
        lambda match: f"{match.group('prefix')}…{match.group('suffix')}", normalized
    )
    # Flowchart edges may use `-- label -->` rather than pipe-delimited labels.
    # The label is learner-visible; preserve the two-dash arrow grammar while
    # allowing Chinese localization.
    normalized = MERMAID_FLOW_EDGE_LABEL.sub(
        lambda match: f"{match.group('prefix')}…{match.group('suffix')}", normalized
    )
    normalized = MERMAID_SQUARE_LABEL.sub(lambda match: f"{match.group('prefix')}[…]", normalized)
    normalized = MERMAID_CURLY_LABEL.sub(lambda match: f"{match.group('prefix')}{{…}}", normalized)
    return MERMAID_PAREN_LABEL.sub(lambda match: f"{match.group('prefix')}(…)", normalized)


def body(markdown: str) -> str:
    return FRONT_MATTER.sub("", markdown, count=1)


def without_fences(markdown: str) -> str:
    return FENCE.sub("", markdown)


def structure(markdown: str) -> Structure:
    document = HTML_COMMENT.sub("", body(markdown))
    blocks = FENCE.findall(document)
    fenced_out = without_fences(document)
    figures = [content.strip() for language, content in blocks if language.strip() == "figure"]
    # An untyped upstream display block and a Chinese `text` block have the
    # same role. Other language labels must stay in the same sequence.
    fence_roles = [language.strip() or "text" for language, _ in blocks]
    return Structure(
        heading_levels=[len(match.group(1)) for match in HEADING.finditer(fenced_out)],
        fences=fence_roles,
        figures=figures,
        links=LINK.findall(fenced_out),
        mermaid=[normalize_mermaid(content) for language, content in blocks if language.strip() == "mermaid"],
    )


def differences(source: Structure, translation: Structure, translation_markdown: str) -> list[str]:
    errors: list[str] = []
    if source.heading_levels != translation.heading_levels:
        errors.append(
            "heading levels differ "
            f"(source={source.heading_levels}, translation={translation.heading_levels})"
        )
    omitted_languages = OMITTED_NON_PYTHON.findall(translation_markdown)
    source_fences = source.fences.copy()
    for language in omitted_languages:
        if language == "python" or language not in source_fences:
            errors.append(f"invalid upstream-non-python omission marker: {language}")
            continue
        source_fences.remove(language)
    if source_fences != translation.fences:
        errors.append(
            f"fenced-block roles differ (source={source_fences}, translation={translation.fences})"
        )
    if source.figures != translation.figures:
        errors.append(f"figure placeholders differ (source={source.figures}, translation={translation.figures})")
    if source.mermaid != translation.mermaid:
        errors.append(
            "Mermaid syntax/topology differs; only learner-visible labels may be translated in place"
        )
    link_index = 0
    for target in translation.links:
        if link_index < len(source.links) and target == source.links[link_index]:
            link_index += 1
    if link_index != len(source.links):
        errors.append(f"source link targets are missing or reordered (source={source.links}, translation={translation.links})")
    return errors


def source_for(translation: Path) -> Path:
    front_matter = translation.read_text(encoding="utf-8")
    repository_match = SOURCE_REPOSITORY.search(front_matter)
    path_match = SOURCE_PATH.search(front_matter)
    if not repository_match:
        raise ValueError("missing source.repository in front matter")
    if not path_match:
        raise ValueError("missing source.path in front matter")
    repository = UPSTREAM_REPOSITORIES.get(repository_match.group(1))
    if not repository:
        raise ValueError(f"unknown source.repository: {repository_match.group(1)}")
    return repository / path_match.group(1)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("translations", nargs="*", type=Path, help="translation files to inspect")
    args = parser.parse_args()
    translations = args.translations or sorted(TRANSLATION_ROOT.glob("**/zh.md"))
    failed = False
    for translation in translations:
        display_path = translation.relative_to(ROOT) if translation.is_relative_to(ROOT) else translation
        try:
            source = source_for(translation)
            if not source.is_file():
                raise ValueError(f"source file does not exist: {source}")
            errors = differences(
                structure(source.read_text(encoding="utf-8")),
                structure(translation.read_text(encoding="utf-8")),
                translation.read_text(encoding="utf-8"),
            )
        except (OSError, ValueError) as error:
            errors = [str(error)]
        if errors:
            failed = True
            print(f"FAIL {display_path}")
            for error in errors:
                print(f"  - {error}")
        else:
            print(f"PASS {display_path}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

"""Published Chinese practice scope shared by the monitoring scripts.

The reader publishes the phases listed in ``apps/local-learning/src/server.ts``
(the ``phases`` constant). Monitoring must use exactly the same set: a phase in
the reader but missing here would hide new upstream lessons, and a phase here but
not in the reader would turn staged work into a monitoring obligation.
``test_monitoring_scope.py`` keeps the two lists equal.
"""

from __future__ import annotations

import re
from pathlib import Path, PurePosixPath

from manage_upstreams import ROOT


PRACTICE_REPOSITORY = "ai-engineering-from-scratch"
SERVER_SOURCE = ROOT / "apps" / "local-learning" / "src" / "server.ts"

PUBLISHED_PRACTICE_PHASES = (
    "phases/00-setup-and-tooling",
    "phases/01-math-foundations",
    "phases/02-ml-fundamentals",
    "phases/03-deep-learning-core",
    "phases/04-computer-vision",
    "phases/05-nlp-foundations-to-advanced",
    "phases/06-speech-and-audio",
    "phases/07-transformers-deep-dive",
    "phases/08-generative-ai",
    "phases/09-reinforcement-learning",
    "phases/10-llms-from-scratch",
    "phases/11-llm-engineering",
    "phases/12-multimodal-ai",
    "phases/13-tools-and-protocols",
    "phases/14-agent-engineering",
    "phases/15-autonomous-systems",
    "phases/16-multi-agent-and-swarms",
    "phases/17-infrastructure-and-production",
    "phases/18-ethics-safety-alignment",
)

LESSON_SOURCE = re.compile(
    r"^phases/(?P<phase>[^/]+)/(?P<lesson>\d{2}-[^/]+)/(?P<file>docs/en\.md|quiz\.json|code/[^/]+\.py)$"
)
# Same rule as the reader's ``resources.workspace``: a lesson offers a Python
# workspace when ``code/`` has a top-level ``.py`` file, and every such lesson
# needs a Chinese practice guide.
ADAPTATION_KINDS = ("practice translation", "assessment", "workspace guide")
THEORY_REPOSITORY = "maths-cs-ai-compendium"
THEORY_NOTE = re.compile(r"^chapter \d{2} - [^/]+/\d{2}\. [^/]+\.md$")


def phase_key(source_path: str) -> str | None:
    parts = PurePosixPath(source_path).parts
    if len(parts) < 2 or parts[0] != "phases":
        return None
    return "/".join(parts[:2])


def is_published(source_path: str) -> bool:
    return phase_key(source_path) in PUBLISHED_PRACTICE_PHASES


def expected_adaptation(source_path: str) -> tuple[str, str] | None:
    """Map a published upstream lesson source to its required local adaptation.

    Returns ``(kind, local_path)`` for ``docs/en.md`` (Chinese practice
    translation), ``quiz.json`` (Chinese assessment) and a top-level
    ``code/*.py`` file (Python workspace guide); ``None`` otherwise.
    """

    match = LESSON_SOURCE.match(source_path)
    if not match or not is_published(source_path):
        return None
    phase, lesson = match["phase"], match["lesson"]
    if match["file"] == "docs/en.md":
        return "practice translation", f"content/translations/practice/{phase}/{lesson}/zh.md"
    if match["file"] == "quiz.json":
        return "assessment", f"content/assessments/practice/{phase}/{lesson}/zh.json"
    return "workspace guide", f"content/workspace-templates/{phase}/{lesson}/EXERCISES.md"


def is_theory_note(source_path: str) -> bool:
    """Return whether a theory-repository path is a note shown in the theory catalog."""

    return bool(THEORY_NOTE.match(source_path))


def server_phase_slugs(source: Path = SERVER_SOURCE) -> tuple[str, ...]:
    """Read the reader's published phase slugs from the ``phases`` constant."""

    text = source.read_text(encoding="utf-8")
    block = re.search(r"^const phases = \[(?P<body>.*?)^\] as const;", text, re.MULTILINE | re.DOTALL)
    if not block:
        raise ValueError(f"published phases constant not found in {source}")
    return tuple(f"phases/{slug}" for slug in re.findall(r'slug:\s*"([^"]+)"', block["body"]))

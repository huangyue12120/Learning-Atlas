#!/usr/bin/env python3
"""Check that Chinese assessments correspond question by question to their sources.

A matching source SHA-256 only proves freshness. This check also requires the
same number of questions, the same ``stage`` and ``correct`` index and four
options per question, a non-empty Chinese explanation, unique ids, and no
untranslated English sentence outside code spans. An explanation must explain
its own question: the same sentence (ignoring the quoted answer) may not be
reused for more than two questions, which catches boilerplate. As an advisory signal it
warns when a source question names several numbers, years or proper nouns and
none of them appear in the Chinese question.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSESSMENT_ROOT = ROOT / "content" / "assessments" / "practice"
UPSTREAM_REPOSITORIES = {"ai-engineering-from-scratch": ROOT / "ai-engineering-from-scratch"}
CODE_SPAN = re.compile(r"`[^`]*`")
QUOTED = re.compile(r"“[^”]*”|「[^」]*」|\"[^\"]*\"")
MAX_REPEATED_EXPLANATIONS = 2
ENGLISH_SENTENCE = re.compile(r"[A-Za-z]{2,}(?:[ ,]+[A-Za-z][A-Za-z'-]*){7,}")
DISTINCTIVE = re.compile(r"\b(?:19|20)\d\d\b|\b\d+(?:\.\d+)?%?|\b[A-Z][a-zA-Z]+(?:-[A-Z][a-zA-Z]+)*\b")
COMMON_WORDS = {
    "Which", "What", "Why", "How", "When", "Where", "Who", "In", "The", "A", "An", "If", "You", "Your",
    "For", "Under", "Given", "After", "Before", "During", "Is", "Does", "Do", "One", "Two", "Three",
    "Four", "Five", "Can", "Should", "According", "This", "That", "It", "To", "On", "At",
}


def source_questions(document: dict) -> list[dict]:
    source = document["source"]
    repository = UPSTREAM_REPOSITORIES.get(source.get("repository", ""))
    if repository is None:
        raise ValueError(f"unknown source.repository: {source.get('repository')}")
    upstream = json.loads((repository / source["path"]).read_text(encoding="utf-8"))
    return upstream["questions"] if isinstance(upstream, dict) else upstream


def english_sentence(text: str) -> bool:
    return bool(ENGLISH_SENTENCE.search(CODE_SPAN.sub("", text)))


def check(path: Path) -> tuple[list[str], list[str]]:
    document = json.loads(path.read_text(encoding="utf-8"))
    translated = document.get("questions", [])
    upstream = source_questions(document)
    errors: list[str] = []
    warnings: list[str] = []
    if len(translated) != len(upstream):
        errors.append(f"question count differs (source={len(upstream)}, translation={len(translated)})")
    ids = [item.get("id") for item in translated]
    if len(set(ids)) != len(ids):
        errors.append("duplicate question ids")
    for number, (item, source) in enumerate(zip(translated, upstream), start=1):
        if item.get("stage") != source.get("stage"):
            errors.append(f"Q{number}: stage differs (source={source.get('stage')}, translation={item.get('stage')})")
        if item.get("correct") != source.get("correct"):
            errors.append(f"Q{number}: correct index differs (source={source.get('correct')}, translation={item.get('correct')})")
        if len(item.get("options", [])) != 4 or len(source.get("options", [])) != len(item.get("options", [])):
            errors.append(f"Q{number}: option count differs from the source or is not 4")
        if not str(item.get("explanation", "")).strip():
            errors.append(f"Q{number}: explanation is empty")
        for field, value in (("question", item.get("question", "")), ("explanation", item.get("explanation", "")),
                             *((f"option {index + 1}", option) for index, option in enumerate(item.get("options", [])))):
            if english_sentence(str(value)):
                errors.append(f"Q{number}: untranslated English in {field}")
        tokens = set(DISTINCTIVE.findall(source.get("question", ""))) - COMMON_WORDS
        if len(tokens) >= 2 and not any(token.lower() in item.get("question", "").lower() for token in tokens):
            warnings.append(f"Q{number}: none of {sorted(tokens)[:4]} appears in the Chinese question")
    return errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("assessments", nargs="*", type=Path, help="assessment files to inspect")
    args = parser.parse_args()
    paths = args.assessments or sorted(ASSESSMENT_ROOT.glob("**/zh.json"))
    failed = False
    explanations: dict[str, list[str]] = {}
    for path in paths:
        try:
            for number, item in enumerate(json.loads(path.read_text(encoding="utf-8")).get("questions", []), start=1):
                key = QUOTED.sub("“…”", str(item.get("explanation", ""))).strip()
                if key:
                    explanations.setdefault(key, []).append(f"{path.parent.name} Q{number}")
        except (OSError, json.JSONDecodeError):
            pass
    repeated = {key: where for key, where in explanations.items() if len(where) > MAX_REPEATED_EXPLANATIONS}
    for key, where in sorted(repeated.items(), key=lambda pair: -len(pair[1])):
        failed = True
        print(f"FAIL explanation reused for {len(where)} questions: {key[:60]}… (e.g. {', '.join(where[:3])})")
    for path in paths:
        resolved = path.resolve()
        display = resolved.relative_to(ROOT) if resolved.is_relative_to(ROOT) else path
        try:
            errors, warnings = check(path)
        except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
            errors, warnings = [str(error)], []
        for warning in warnings:
            print(f"WARN {display}: {warning}")
        if errors:
            failed = True
            print(f"FAIL {display}")
            for error in errors:
                print(f"  - {error}")
    print(f"{'FAIL' if failed else 'PASS'} {len(paths)} assessments")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Report option-length bias and prepare auditable paragraph candidates, never auto-publish them."""
from __future__ import annotations
import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def fingerprint(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def plain(text):
    text = re.sub(r"<!--.*?-->", "", text)
    text = re.sub(r"!?\[([^]]*)\]\([^)]*\)", r"\1", text)
    return re.sub(r"\s+", "", re.sub(r"[`*_]", "", text))


def slug(title):
    import unicodedata
    title = unicodedata.normalize("NFKC", re.sub(r"<[^>]+>|[`*_]", "", title)).lower()
    return re.sub(r"[^\w\u3400-\u9fff]+", "-", title).strip("-") or "section"


def sections(text):
    result = []; counts = {}; current = None; paragraph = []; fence = False
    def flush():
        if current and paragraph:
            quote = plain(" ".join(paragraph))
            if len(quote) >= 15: current["paragraphs"].append(quote[:180])
        paragraph.clear()
    for line in text.splitlines():
        if re.match(r"^\s*(`{3,}|~{3,})", line):
            flush(); fence = not fence; continue
        heading = None if fence else re.match(r"^(#{1,6})\s+(.+?)(?:\s+<!-- learning-atlas: ([a-z0-9-]+) -->)?$", line)
        if heading:
            flush(); title = heading[2]; base = heading[3] or slug(title)
            count = counts.get(base, 0); counts[base] = count + 1
            current = {"headingId": base if not count else f"{base}-{count+1}", "title": title, "paragraphs": [], "source": ""}; result.append(current)
        else:
            if current: current["source"] += line + "\n"
            if fence: continue
            if not line.strip(): flush()
            elif current and not line.startswith("|"): paragraph.append(re.sub(r"^\s*(?:[-*>]|\d+[.)])\s*", "", line))
    flush(); return result


def tokens(text):
    english = re.findall(r"[a-z][a-z0-9_-]{1,}", text.lower())
    chinese = re.findall(r"[\u3400-\u9fff]+", text)
    stop = {"什么", "下面", "哪个", "以下", "如何", "一个", "可以", "正确", "为什么"}
    return set(english + [word[i:i+2] for word in chinese for i in range(len(word)-1) if word[i:i+2] not in stop])


def review(root=ROOT):
    lessons = []; lengths = []; total = unique = longest = 0
    for path in sorted((root / "content/assessments/practice").glob("*/*/zh.json")):
        assessment = json.loads(path.read_text(encoding="utf-8")); phase, lesson = path.parts[-3:-1]
        translation = root / "content/translations/practice" / phase / lesson / "zh.md"
        source = translation.read_text(encoding="utf-8"); source = re.sub(r"\A---\n.*?\n---\n", "", source, flags=re.S)
        parts = sections(source); candidates = []; rows = [(section, quote) for section in parts for quote in section["paragraphs"]]
        frequencies = Counter(token for section, quote in rows for token in tokens(section["title"] + quote))
        for question in assessment["questions"]:
            total += 1; sizes = [len(plain(option)) for option in question["options"]]; correct = sizes[question["correct"]]
            tied = correct == max(sizes); sole = tied and sizes.count(correct) == 1
            longest += tied; unique += sole
            if sole: lengths.append({"lessonId": f"practice/{phase}/{lesson}", "id": question["id"], "lengths": sizes, "ratio": round(correct / max(size for i, size in enumerate(sizes) if i != question["correct"]), 3)})
            query = tokens(question["question"] + question["explanation"])
            scored = [(sum(math.log(1+len(rows)/(1+frequencies[token])) for token in sorted(query & tokens(section["title"] + quote))), section, quote) for section, quote in rows]
            scored.sort(key=lambda row: -row[0]); top = scored[:3]
            candidates.append({"id": question["id"], "question": question["question"], "status": "draft", "candidates": [{"headingId": section["headingId"], "heading": section["title"], "quote": quote, "score": round(score, 3)} for score, section, quote in top]})
        lessons.append({"lessonId": f"practice/{phase}/{lesson}", "translationSha256": fingerprint(translation), "assessmentSha256": fingerprint(path), "questions": candidates})
    lengths.sort(key=lambda row: -row["ratio"])
    return {"questionCount": total, "correctLongestIncludingTies": longest, "correctSoleLongest": unique, "soleLongestRate": round(unique / max(1,total), 4), "priority": lengths}, lessons


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="write draft evidence and option-quality report under review/followups")
    parser.add_argument("--check", action="store_true", help="verify stored draft report fingerprints and complete question coverage")
    args = parser.parse_args(); quality, lessons = review()
    directory = ROOT / "review/followups"
    if args.write:
        directory.mkdir(parents=True, exist_ok=True)
        (directory / "assessment-quality.json").write_text(json.dumps(quality, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
        (directory / "assessment-candidates.json").write_text(json.dumps(lessons, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    reviewed = {}
    for mapping in (ROOT / "content/assessment-links/practice").glob("*/*/links.json"):
        data = json.loads(mapping.read_text(encoding="utf-8"))
        expected_id = f"practice/{mapping.parent.parent.name}/{mapping.parent.name}"
        if data["lessonId"] != expected_id or not data.get("reviewedBy"): raise SystemExit(f"FAIL invalid review attribution or lesson path: {mapping}")
        lesson = next((lesson for lesson in lessons if lesson["lessonId"] == data["lessonId"]), None)
        if not lesson or any(data[key] != lesson[key] for key in ["translationSha256", "assessmentSha256"]): raise SystemExit(f"FAIL stale reviewed evidence: {mapping}")
        phase, name = data["lessonId"].split("/")[1:]
        source = (ROOT / "content/translations/practice" / phase / name / "zh.md").read_text(encoding="utf-8")
        source = re.sub(r"\A---\n.*?\n---\n", "", source, flags=re.S)
        headings = {section["headingId"]: section for section in sections(source)}
        ids = {question["id"] for question in lesson["questions"]}
        if len({link["id"] for link in data["links"]}) != len(data["links"]): raise SystemExit(f"FAIL duplicate paragraph evidence: {mapping}")
        for link in data["links"]:
            if link.get("status") != "reviewed" or len(link["quote"]) < 8 or link["id"] not in ids or link["headingId"] not in headings or plain(link["quote"]) not in plain(headings[link["headingId"]]["source"]): raise SystemExit(f"FAIL invalid paragraph evidence: {mapping} {link['id']}")
        reviewed[data["lessonId"]] = len(data["links"])
    phases = {}
    for lesson in lessons:
        phase = lesson["lessonId"].split("/")[1]
        row = phases.setdefault(phase, {"phase": phase, "questionCount": 0, "reviewedEvidenceCount": 0, "remainingEvidenceCount": 0})
        count = len(lesson["questions"]); done = reviewed.get(lesson["lessonId"], 0)
        row["questionCount"] += count; row["reviewedEvidenceCount"] += done; row["remainingEvidenceCount"] += count - done
    progress = {"questionCount": quality["questionCount"], "reviewedEvidenceCount": sum(reviewed.values()),
                "remainingEvidenceCount": quality["questionCount"] - sum(reviewed.values()), "phases": list(phases.values())}
    progress_path = ROOT / "review/assessment-review/progress.json"
    if args.write:
        progress_path.parent.mkdir(parents=True, exist_ok=True)
        progress_path.write_text(json.dumps(progress, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    if args.check:
        stored = json.loads((directory / "assessment-candidates.json").read_text(encoding="utf-8"))
        if stored != lessons: raise SystemExit("FAIL candidate report is stale; regenerate and review changed candidates")
        if json.loads((directory / "assessment-quality.json").read_text(encoding="utf-8")) != quality: raise SystemExit("FAIL quality report is stale")
        if json.loads(progress_path.read_text(encoding="utf-8")) != progress: raise SystemExit("FAIL reviewed-evidence progress is stale")
    if quality["soleLongestRate"] > 0.5: print(f'WARN correct-answer length bias: {quality["soleLongestRate"]:.1%}; priority list: review/followups/assessment-quality.json')
    print(f'{quality["questionCount"]} questions; unique-longest correct answers {quality["correctSoleLongest"]} ({quality["soleLongestRate"]:.1%}); {len(lessons)} lesson candidate sets (draft only)')
    print(f'Reviewed paragraph evidence: {progress["reviewedEvidenceCount"]}; remaining: {progress["remainingEvidenceCount"]}; attribution is recorded per mapping')

if __name__ == "__main__": main()

#!/usr/bin/env python3
"""Serve the temporary human-review page for proposed theory links."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, urlparse


ROOT = Path(__file__).resolve().parents[2]
TOOL_DIR = Path(__file__).resolve().parent
THEORY_LINK_ROOT = ROOT / "content" / "theory-links"
DEFAULT_RESULTS = TOOL_DIR / "review-results.json"
MAX_REQUEST_BYTES = 5 * 1024 * 1024

PHASE_TITLES = {
    "00-setup-and-tooling": "Phase 0 · 环境与工具",
    "01-math-foundations": "Phase 1 · 数学基础",
    "02-ml-fundamentals": "Phase 2 · 机器学习基础",
    "03-deep-learning-core": "Phase 3 · 深度学习核心",
    "04-computer-vision": "Phase 4 · 计算机视觉",
    "05-nlp-foundations-to-advanced": "Phase 5 · 自然语言处理基础到进阶",
    "06-speech-and-audio": "Phase 6 · 语音与音频",
    "07-transformers-deep-dive": "Phase 7 · Transformer 深入理解",
    "08-generative-ai": "Phase 8 · 生成式 AI",
    "09-reinforcement-learning": "Phase 9 · 强化学习",
    "10-llms-from-scratch": "Phase 10 · 从零构建 LLM",
    "11-llm-engineering": "Phase 11 · LLM 工程",
    "12-multimodal-ai": "Phase 12 · 多模态 AI",
    "13-tools-and-protocols": "Phase 13 · 工具与协议",
    "14-agent-engineering": "Phase 14 · 智能体工程",
    "15-autonomous-systems": "Phase 15 · 自主系统",
    "16-multi-agent-and-swarms": "Phase 16 · 多智能体与群体",
    "17-infrastructure-and-production": "Phase 17 · 基础设施与生产",
    "18-ethics-safety-alignment": "Phase 18 · 伦理、安全与对齐",
    "19-capstone-projects": "Phase 19 · 综合项目",
}

SOURCE_REPOSITORIES = {
    "ai-engineering-from-scratch": "https://github.com/huangyue12120/ai-engineering-from-scratch",
    "maths-cs-ai-compendium": "https://github.com/huangyue12120/maths-cs-ai-compendium",
}

VALID_DECISIONS = {"unreviewed", "approved", "proposed", "rejected"}
AUTO_REVIEW_EXPLANATION = (
    "当前自动检查只验证关联双方的来源文件、SHA-256 指纹和锚点是否存在，"
    "不判断语义关联是否直接支撑课程操作；因此 proposed 不会被自动转为 approved，"
    "需要人工确认。"
)


def yaml_block(document: str, label: str, indent: int = 0) -> str:
    """Read one simple, fixed-shape YAML mapping block without a dependency."""

    prefix = " " * indent
    pattern = (
        rf"^{re.escape(prefix + label)}:\s*\n"
        rf"([\s\S]*?)(?=^{re.escape(prefix)}[a-z][a-z0-9-]*:\s*$|\Z)"
    )
    match = re.search(pattern, document, re.MULTILINE)
    return match.group(1) if match else ""


def yaml_field(document: str, name: str, indent: int = 2) -> str:
    prefix = " " * indent
    match = re.search(
        rf"^{re.escape(prefix + name)}:\s*(.*?)\s*$", document, re.MULTILINE
    )
    if not match:
        return ""
    return match.group(1).strip().strip('"').strip("'")


def source_url(repository: str, revision: str, path: str) -> str | None:
    base = SOURCE_REPOSITORIES.get(repository)
    if not base or not revision or not path:
        return None
    return f"{base}/blob/{revision}/{quote(path, safe='/')}"


def source_path(repository: str, relative_path: str) -> Path | None:
    if repository not in SOURCE_REPOSITORIES:
        return None
    candidate = ROOT / repository / relative_path
    try:
        candidate.relative_to(ROOT / repository)
    except ValueError:
        return None
    return candidate


def source_check(repository: str, relative_path: str, expected_sha256: str, label: str) -> dict[str, str]:
    candidate = source_path(repository, relative_path)
    if candidate is None or not candidate.is_file():
        return {
            "label": label,
            "status": "attention",
            "detail": "来源文件不存在或仓库不在允许的来源列表中。",
        }

    actual_sha256 = hashlib.sha256(candidate.read_bytes()).hexdigest()
    if actual_sha256 != expected_sha256:
        return {
            "label": label,
            "status": "attention",
            "detail": f"SHA-256 不匹配：记录值 {expected_sha256}，当前值 {actual_sha256}。",
        }
    return {
        "label": label,
        "status": "passed",
        "detail": "来源文件存在，SHA-256 与候选记录一致。",
    }


def anchor_check(repository: str, relative_path: str, heading: str, label: str) -> dict[str, str]:
    candidate = source_path(repository, relative_path)
    if candidate is None or not candidate.is_file():
        return {
            "label": label,
            "status": "attention",
            "detail": "无法读取来源文件，因此无法验证锚点。",
        }

    document = candidate.read_text(encoding="utf-8")
    if heading and not re.search(rf"^#+\s+{re.escape(heading)}\s*$", document, re.MULTILINE):
        return {
            "label": label,
            "status": "attention",
            "detail": f"原文中找不到标题锚点“{heading}”。",
        }
    return {
        "label": label,
        "status": "passed",
        "detail": f"原文中存在标题锚点“{heading}”。",
    }


def automatic_audit(practice: dict[str, str], theory: dict[str, str]) -> dict[str, object]:
    checks = [
        source_check(
            practice["repository"], practice["path"], practice["sha256"], "课程来源指纹"
        ),
        source_check(
            theory["repository"], theory["path"], theory["sha256"], "理论来源指纹"
        ),
        anchor_check(
            practice["repository"], practice["path"], practice["heading"], "课程位置锚点"
        ),
        anchor_check(
            theory["repository"], theory["path"], theory["heading"], "理论章节锚点"
        ),
    ]
    failures = [check["detail"] for check in checks if check["status"] != "passed"]
    if failures:
        reason = "自动核验发现：" + "；".join(failures)
        status = "attention"
    else:
        reason = AUTO_REVIEW_EXPLANATION
        status = "passed"
    return {"status": status, "reason": reason, "checks": checks}


def parse_candidate(path: Path) -> dict[str, object] | None:
    document = path.read_text(encoding="utf-8")
    if yaml_field(document, "status", 0) != "proposed":
        return None

    practice_block = yaml_block(document, "practice")
    theory_block = yaml_block(document, "theory")
    card_block = yaml_block(document, "card")
    practice_anchor = yaml_block(practice_block, "anchor", 2)
    theory_anchor = yaml_block(theory_block, "anchor", 2)
    practice = {
        "repository": yaml_field(practice_block, "repository"),
        "path": yaml_field(practice_block, "path"),
        "revision": yaml_field(practice_block, "revision"),
        "sha256": yaml_field(practice_block, "sha256"),
        "heading": yaml_field(practice_anchor, "heading", 4),
        "slug": yaml_field(practice_anchor, "slug", 4),
    }
    theory = {
        "repository": yaml_field(theory_block, "repository"),
        "path": yaml_field(theory_block, "path"),
        "revision": yaml_field(theory_block, "revision"),
        "sha256": yaml_field(theory_block, "sha256"),
        "heading": yaml_field(theory_anchor, "heading", 4),
        "slug": yaml_field(theory_anchor, "slug", 4),
    }
    relative_id = path.relative_to(THEORY_LINK_ROOT).as_posix()
    practice_parts = practice["path"].split("/")
    phase = practice_parts[1] if len(practice_parts) > 1 else path.relative_to(THEORY_LINK_ROOT).parts[0]
    lesson = practice_parts[2] if len(practice_parts) > 2 else ""
    audit = automatic_audit(practice, theory)
    return {
        "id": relative_id,
        "filePath": f"content/theory-links/{relative_id}",
        "phase": phase,
        "phaseTitle": PHASE_TITLES.get(phase, phase),
        "lesson": lesson,
        "cardTitle": yaml_field(card_block, "title"),
        "candidateReason": yaml_field(card_block, "summary"),
        "practice": {
            **practice,
            "sourceUrl": source_url(practice["repository"], practice["revision"], practice["path"]),
        },
        "theory": {
            **theory,
            "sourceUrl": source_url(theory["repository"], theory["revision"], theory["path"]),
        },
        "automaticAudit": audit,
    }


def all_link_ids() -> set[str]:
    return {
        path.relative_to(THEORY_LINK_ROOT).as_posix()
        for path in THEORY_LINK_ROOT.glob("**/*.yaml")
    }


def load_candidates() -> list[dict[str, object]]:
    candidates = []
    for path in sorted(THEORY_LINK_ROOT.glob("**/*.yaml")):
        candidate = parse_candidate(path)
        if candidate is not None:
            candidates.append(candidate)
    return candidates


def read_reviews(results_path: Path) -> dict[str, object]:
    if not results_path.is_file():
        return {"version": 1, "savedAt": None, "reviews": {}}
    try:
        document = json.loads(results_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"version": 1, "savedAt": None, "reviews": {}}
    reviews = document.get("reviews", {}) if isinstance(document, dict) else {}
    if not isinstance(reviews, dict):
        reviews = {}
    return {
        "version": 1,
        "savedAt": document.get("savedAt") if isinstance(document, dict) else None,
        "reviews": reviews,
    }


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def save_reviews(results_path: Path, incoming: object) -> dict[str, object]:
    if not isinstance(incoming, dict):
        raise ValueError("reviews 必须是对象。")
    valid_ids = all_link_ids()
    reviews: dict[str, dict[str, str]] = {}
    for candidate_id, value in incoming.items():
        if candidate_id not in valid_ids:
            continue
        if isinstance(value, str):
            decision = value
        elif isinstance(value, dict):
            decision = value.get("decision")
        else:
            continue
        if decision not in VALID_DECISIONS:
            raise ValueError(f"候选 {candidate_id} 的审核状态无效。")
        reviews[candidate_id] = {"decision": decision, "updatedAt": now_iso()}

    payload = {"version": 1, "savedAt": now_iso(), "reviews": reviews}
    results_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = results_path.with_name(results_path.name + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(results_path)
    return payload


class ReviewHandler(BaseHTTPRequestHandler):
    static_root = TOOL_DIR
    results_path = DEFAULT_RESULTS
    write_lock = threading.Lock()

    def log_message(self, format: str, *args: object) -> None:
        return

    def send_json(self, payload: object, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, message: str, status: int = 400) -> None:
        self.send_json({"error": message}, status)

    def do_GET(self) -> None:  # noqa: N802 - stdlib handler API
        path = urlparse(self.path).path
        if path == "/api/candidates":
            candidates = load_candidates()
            self.send_json({"version": 1, "total": len(candidates), "candidates": candidates})
            return
        if path == "/api/reviews":
            self.send_json(read_reviews(self.results_path))
            return

        static_name = "index.html" if path in {"/", "/index.html"} else path.lstrip("/")
        if static_name not in {"index.html", "styles.css", "app.js"}:
            self.send_error(404)
            return
        target = self.static_root / static_name
        if not target.is_file():
            self.send_error(404)
            return
        body = target.read_bytes()
        content_type = {
            "index.html": "text/html; charset=utf-8",
            "styles.css": "text/css; charset=utf-8",
            "app.js": "text/javascript; charset=utf-8",
        }[static_name]
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:  # noqa: N802 - stdlib handler API
        if urlparse(self.path).path != "/api/reviews":
            self.send_error_json("不存在的 API 路径。", 404)
            return
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_error_json("请求体长度无效。")
            return
        if content_length < 0 or content_length > MAX_REQUEST_BYTES:
            self.send_error_json("请求体过大。")
            return
        try:
            payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
            incoming = payload.get("reviews") if isinstance(payload, dict) else None
            with self.write_lock:
                saved = save_reviews(self.results_path, incoming)
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError, OSError) as error:
            self.send_error_json(str(error))
            return
        self.send_json({"ok": True, "savedAt": saved["savedAt"], "count": len(saved["reviews"])})


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1", help="bind address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8765, help="port (default: 8765)")
    parser.add_argument(
        "--results",
        type=Path,
        default=DEFAULT_RESULTS,
        help="review result JSON path (default: ignored local file beside this script)",
    )
    args = parser.parse_args()
    results_path = args.results if args.results.is_absolute() else ROOT / args.results
    ReviewHandler.results_path = results_path
    server = ThreadingHTTPServer((args.host, args.port), ReviewHandler)
    print(f"理论关联审核页：http://{args.host}:{args.port}/")
    print(f"审核结果：{results_path}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n审核页已停止。")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

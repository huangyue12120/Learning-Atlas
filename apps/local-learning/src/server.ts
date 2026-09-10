import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const applicationDirectory = resolve(moduleDirectory, "..");
const publicDirectory = join(applicationDirectory, "public");
const mermaidDirectory = join(applicationDirectory, "node_modules/mermaid/dist");
const highlightDirectory = join(applicationDirectory, "node_modules/@highlightjs/cdn-assets");
const gsapDirectory = join(applicationDirectory, "node_modules/gsap");
const katexDirectory = join(applicationDirectory, "node_modules/katex/dist");
const repositoryDirectory = resolve(applicationDirectory, "../..");
const practiceDirectory = join(repositoryDirectory, "ai-engineering-from-scratch/phases");
const theoryDirectory = join(repositoryDirectory, "maths-cs-ai-compendium");
const theoryTranslationDirectory = join(repositoryDirectory, "content/translations/theory");
const phases = [
  { slug: "00-setup-and-tooling", title: "Phase 0 · 环境与工具" },
  { slug: "01-math-foundations", title: "Phase 1 · 数学基础" },
  { slug: "02-ml-fundamentals", title: "Phase 2 · 机器学习基础" },
  { slug: "03-deep-learning-core", title: "Phase 3 · 深度学习核心" },
  { slug: "04-computer-vision", title: "Phase 4 · 计算机视觉" },
  { slug: "05-nlp-foundations-to-advanced", title: "Phase 5 · 自然语言处理基础到进阶" },
  { slug: "06-speech-and-audio", title: "Phase 6 · 语音与音频" },
  { slug: "07-transformers-deep-dive", title: "Phase 7 · Transformer 深入理解" },
  { slug: "08-generative-ai", title: "Phase 8 · 生成式 AI" },
  { slug: "09-reinforcement-learning", title: "Phase 9 · 强化学习" },
  { slug: "10-llms-from-scratch", title: "Phase 10 · 从零构建 LLM" },
  { slug: "11-llm-engineering", title: "Phase 11 · LLM 工程" },
  { slug: "12-multimodal-ai", title: "Phase 12 · 多模态 AI" },
  { slug: "13-tools-and-protocols", title: "Phase 13 · 工具与协议" },
  { slug: "14-agent-engineering", title: "Phase 14 · Agent 工程" },
  { slug: "15-autonomous-systems", title: "Phase 15 · 自主系统" },
  { slug: "16-multi-agent-and-swarms", title: "Phase 16 · 多智能体与群体智能" }
] as const;
type Phase = typeof phases[number];
const curriculumPhases = [
  ...phases,
  { slug: "17-infrastructure-and-production", title: "Phase 17 · 基础设施与生产" },
  { slug: "18-ethics-safety-alignment", title: "Phase 18 · 伦理、安全与对齐" },
  { slug: "19-capstone-projects", title: "Phase 19 · 综合项目" }
] as const;
const defaultLessonId = "practice/01-math-foundations/01-linear-algebra-intuition";
const officialTheoryRepository = "https://github.com/HenryNdubuaku/maths-cs-ai-compendium";

type LearningState = {
  completed: boolean;
  review: boolean;
};

type Note = {
  id: number;
  text: string;
  createdAt: string;
};

type App = {
  close(): void;
  handler(request: IncomingMessage, response: ServerResponse): Promise<void>;
};

type Workspace = {
  directory: string;
  sourceFile: string;
  explorationFile: string | null;
  exerciseFile: string | null;
  exerciseTestFile: string | null;
  exercisesGuide: string | null;
};

type Lesson = {
  id: string;
  phaseSlug: string;
  phase: string;
  position: string;
  title: string;
  originalTitle: string;
  duration: string;
  source: { repository: string; path: string; revision: string; sha256: string };
  sourceUrl: string;
  resources: { workspace: boolean; exploration: boolean };
};

type CourseOutline = {
  slug: string;
  title: string;
  lessons: Array<Pick<Lesson, "id" | "position" | "title"> & { available: boolean; progress: CourseProgress }>;
};

type CourseProgress = "not-started" | "in-progress" | "understood" | "review";

type TheoryReadKind = "internal" | "external";

type TheoryNote = {
  theoryId: string;
  chapterSlug: string;
  position: string;
  title: string;
  sourcePath: string;
  sourceUrl: string;
  latestSourceUrl: string;
  readKind: TheoryReadKind;
  readLanguage: "zh" | "en";
  readUrl: string;
};

type TheoryChapter = {
  slug: string;
  position: string;
  title: string;
  originalTitle: string;
  notes: TheoryNote[];
};

type PublishedTheoryDocument = {
  markdown: string;
  revision: string;
  sha256: string;
  sourcePath: string;
};

type TheoryCard = {
  slug: string;
  title: string;
  summary: string;
  context?: string;
  intuition?: string;
  keyPoints?: string[];
  application?: string;
  checkQuestion?: string;
  sourceUrl: string;
  theoryId: string;
  readKind: TheoryReadKind;
  readLanguage: "zh" | "en";
  readUrl: string;
  latestSourceUrl: string;
};

type RichTheoryCard = TheoryCard & Required<Pick<TheoryCard, "context" | "intuition" | "keyPoints" | "application" | "checkQuestion">>;

function isRichTheoryCard(card: TheoryCard): card is RichTheoryCard {
  return Boolean(card.context && card.intuition && Array.isArray(card.keyPoints) && card.keyPoints.length >= 2 && card.keyPoints.length <= 4 && card.application && card.checkQuestion);
}

type LessonContent = {
  markdown: string;
  translationStatus: "reviewed" | "stale" | "unavailable";
  theoryCards: TheoryCard[];
};

type QuizQuestion = { id: string; question: string; options: string[]; correct: number; explanation: string };
type PublishedQuiz = { questions: QuizQuestion[]; status: "reviewed" | "stale" | "unavailable" };

function yamlString(value: string | undefined) {
  value = value?.trim();
  if (!value) return null;
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
}

function yamlScalar(block: string, pattern: RegExp) {
  return yamlString(pattern.exec(block)?.[1]);
}

function yamlList(block: string, key: string) {
  const match = new RegExp(`^  ${key}:\\r?\\n((?:    - .*(?:\\r?\\n|$))+)`, "m").exec(block);
  if (!match) return [];
  return match[1]
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => yamlString(line.match(/^    -\s+(.+)$/)?.[1]))
    .filter((value): value is string => Boolean(value));
}

function sourceUrl(repository: string, revision: string, path: string) {
  const repositories: Record<string, string> = {
    "ai-engineering-from-scratch": "https://github.com/huangyue12120/ai-engineering-from-scratch",
    "maths-cs-ai-compendium": "https://github.com/huangyue12120/maths-cs-ai-compendium"
  };
  const base = repositories[repository];
  if (!base) throw new Error(`Unknown source repository: ${repository}`);
  return `${base}/blob/${revision}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function officialTheoryUrl(path: string) {
  return `${officialTheoryRepository}/blob/main/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function sourceSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function publishableTheoryDocument(sourceFile: string, translationFile: string): PublishedTheoryDocument | null {
  if (!existsSync(sourceFile) || !existsSync(translationFile)) return null;
  const document = readFileSync(translationFile, "utf8");
  const match = document.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  const [, frontmatter, markdown] = match;
  if (yamlScalar(frontmatter, /^status:\s*(.+)$/m) !== "reviewed") return null;
  if (yamlScalar(frontmatter, /^  repository:\s*(.+)$/m) !== "maths-cs-ai-compendium") return null;
  const sourcePath = yamlScalar(frontmatter, /^  path:\s*(.+)$/m);
  const branch = yamlScalar(frontmatter, /^  branch:\s*(.+)$/m) ?? "main";
  const revision = yamlScalar(frontmatter, /^  revision:\s*(.+)$/m) ?? "main";
  const fingerprint = yamlScalar(frontmatter, /^  sha256:\s*(.+)$/m);
  if (branch !== "main" || !sourcePath || !fingerprint || sha256(sourceFile) !== fingerprint) return null;
  return { markdown, revision, sha256: fingerprint, sourcePath };
}

const theoryChapterTitles: Record<string, string> = {
  "01": "向量",
  "02": "矩阵",
  "03": "微积分",
  "04": "统计学",
  "05": "概率论",
  "06": "机器学习",
  "07": "计算语言学",
  "08": "计算机视觉",
  "09": "音频与语音",
  "10": "多模态学习",
  "11": "自主系统",
  "12": "图神经网络",
  "13": "计算与操作系统",
  "14": "数据结构与算法",
  "15": "生产软件工程",
  "16": "SIMD 与 GPU 编程",
  "17": "AI 推理",
  "18": "机器学习系统设计",
  "19": "应用 AI",
  "20": "前沿 AI"
};

function buildTheoryCatalog(): TheoryChapter[] {
  return readdirSync(theoryDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^chapter \d{2} - /.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => {
      const chapterMatch = /^chapter (\d{2}) - (.+)$/.exec(entry.name)!;
      const [, position, originalTitle] = chapterMatch;
      const chapterSlug = `chapter-${position}-${sourceSlug(originalTitle)}`;
      const notes = readdirSync(join(theoryDirectory, entry.name), { withFileTypes: true })
        .filter((note) => note.isFile() && /^\d{2}\. .+\.md$/.test(note.name))
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((note) => {
          const noteMatch = /^(\d{2})\. (.+)\.md$/.exec(note.name)!;
          const [, notePosition, sourceName] = noteMatch;
          const noteSlug = `${notePosition}-${sourceSlug(sourceName)}`;
          const theoryId = `theory/${chapterSlug}/${noteSlug}`;
          const sourcePath = `${entry.name}/${note.name}`;
          const sourceFile = join(theoryDirectory, sourcePath);
          const sourceDocument = readFileSync(sourceFile, "utf8");
          const sourceTitle = sourceDocument.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? sourceName;
          const translationFile = join(theoryTranslationDirectory, chapterSlug, noteSlug, "zh.md");
          const translation = publishableTheoryDocument(sourceFile, translationFile);
          const translationMatchesSource = translation?.sourcePath === sourcePath;
          const translatedTitle = translationMatchesSource
            ? translation.markdown.match(/^#\s+(.+)$/m)?.[1]?.trim()
            : null;
          const readKind: TheoryReadKind = translationMatchesSource ? "internal" : "external";
          return {
            theoryId,
            chapterSlug,
            position: notePosition,
            title: translatedTitle ?? sourceTitle,
            sourcePath,
            sourceUrl: officialTheoryUrl(sourcePath),
            latestSourceUrl: officialTheoryUrl(sourcePath),
            readKind,
            readLanguage: translationMatchesSource ? "zh" : "en",
            readUrl: translationMatchesSource
              ? `/theory?theoryId=${encodeURIComponent(theoryId)}`
              : officialTheoryUrl(sourcePath)
          } satisfies TheoryNote;
        });
      return {
        slug: chapterSlug,
        position,
        title: theoryChapterTitles[position] ?? originalTitle,
        originalTitle,
        notes
      } satisfies TheoryChapter;
    });
}

const theoryCatalog = buildTheoryCatalog();
const theoryNotes = theoryCatalog.flatMap((chapter) => chapter.notes);
const theoryNoteById = new Map(theoryNotes.map((note) => [note.theoryId, note]));
const theoryNoteBySourcePath = new Map(theoryNotes.map((note) => [note.sourcePath, note]));

function theoryContentFor(theoryId: string) {
  const note = theoryNoteById.get(theoryId);
  if (!note || note.readKind !== "internal") return null;
  const sourceFile = join(theoryDirectory, note.sourcePath);
  const translationFile = join(theoryTranslationDirectory, ...theoryId.split("/").slice(1), "zh.md");
  const translation = publishableTheoryDocument(sourceFile, translationFile);
  if (!translation || translation.sourcePath !== note.sourcePath) return null;
  const sourceDirectory = note.sourcePath.split("/").slice(0, -1).map(encodeURIComponent).join("/");
  return {
    theoryId,
    title: note.title,
    markdown: translation.markdown,
    source: {
      repository: "maths-cs-ai-compendium",
      path: note.sourcePath,
      branch: "main",
      revision: "main",
      reviewedRevision: translation.revision,
      sha256: translation.sha256
    },
    sourceUrl: officialTheoryUrl(note.sourcePath),
    latestSourceUrl: note.latestSourceUrl,
    resourceBaseUrl: `/api/theory/assets/${sourceDirectory}/`
  };
}

function phaseFor(slug: string): Phase | null {
  return phases.find((phase) => phase.slug === slug) ?? null;
}

function lessonReference(lessonId: string) {
  const match = /^practice\/([^/]+)\/(\d{2}-[a-z0-9-]+)$/.exec(lessonId);
  if (!match) return null;
  const phase = phaseFor(match[1]);
  return phase ? { phase, slug: match[2] } : null;
}

function phaseDirectory(phase: Phase) {
  return join(practiceDirectory, phase.slug);
}

function lessonSlugs(phase: Phase) {
  return readdirSync(phaseDirectory(phase), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name) &&
      existsSync(join(repositoryDirectory, "content/translations/practice", phase.slug, entry.name, "zh.md")))
    .map((entry) => entry.name)
    .sort();
}

function lessonFor(lessonId: string): Lesson | null {
  const reference = lessonReference(lessonId);
  if (!reference) return null;
  const { phase, slug } = reference;
  const slugs = lessonSlugs(phase);
  const index = slugs.indexOf(slug);
  if (index === -1) return null;

  const documentFile = join(phaseDirectory(phase), slug, "docs/en.md");
  const translationFile = join(repositoryDirectory, "content/translations/practice", phase.slug, slug, "zh.md");
  if (!existsSync(documentFile) || !existsSync(translationFile)) return null;
  const sourceDocument = readFileSync(documentFile, "utf8");
  const translation = readFileSync(translationFile, "utf8");
  const frontmatter = translation.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const source = {
    repository: yamlScalar(frontmatter, /^  repository:\s*(.+)$/m) ?? "ai-engineering-from-scratch",
    path: yamlScalar(frontmatter, /^  path:\s*(.+)$/m) ?? `phases/${phase.slug}/${slug}/docs/en.md`,
    revision: yamlScalar(frontmatter, /^  revision:\s*(.+)$/m) ?? "",
    sha256: yamlScalar(frontmatter, /^  sha256:\s*(.+)$/m) ?? ""
  };
  const title = translation.match(/^#\s+(.+)$/m)?.[1] ?? sourceDocument.match(/^#\s+(.+)$/m)?.[1] ?? slug;
  const originalTitle = sourceDocument.match(/^#\s+(.+)$/m)?.[1] ?? slug;
  const duration = translation.match(/^\*\*(?:预计学习|预计时间|时间)：\*\*\s*(.+)$/m)?.[1]?.trim() ?? "未提供";
  const resourceDirectory = join(repositoryDirectory, "content");
  return {
    id: lessonId,
    phaseSlug: phase.slug,
    phase: phase.title,
    position: `${String(index + 1).padStart(2, "0")} / ${slugs.length}`,
    title,
    originalTitle,
    duration,
    source,
    sourceUrl: sourceUrl(source.repository, source.revision, source.path),
    resources: {
      workspace: existsSync(join(phaseDirectory(phase), slug, "code")) &&
        readdirSync(join(phaseDirectory(phase), slug, "code")).some((name) => name.endsWith(".py")),
      exploration: existsSync(join(resourceDirectory, "explorations", phase.slug, slug))
    }
  };
}

export const firstLesson = lessonFor(defaultLessonId)!;

function courseProgress(database: DatabaseSync, lessonId: string): CourseProgress {
  const state = database.prepare("SELECT completed, review, reading_position AS readingPosition FROM learning_state WHERE lesson_id = ?")
    .get(lessonId) as { completed: number; review: number; readingPosition: number } | undefined;
  if (state?.review === 1) return "review";
  if (state?.completed === 1) return "understood";
  const hasActivity = Boolean(state?.readingPosition) ||
    Boolean(database.prepare("SELECT 1 FROM notes WHERE lesson_id = ? LIMIT 1").get(lessonId)) ||
    Boolean(database.prepare("SELECT 1 FROM quiz_attempts WHERE lesson_id = ? LIMIT 1").get(lessonId));
  return hasActivity ? "in-progress" : "not-started";
}

function courseOutline(database: DatabaseSync): CourseOutline[] {
  return phases.map((phase) => ({
    slug: phase.slug,
    title: phase.title,
    lessons: lessonSlugs(phase).map((slug) => {
      const lesson = lessonFor(`practice/${phase.slug}/${slug}`)!;
      return {
        id: lesson.id,
        position: lesson.position,
        title: lesson.title,
        available: publishedLessonContent(lesson).translationStatus === "reviewed",
        progress: courseProgress(database, lesson.id)
      };
    })
  }));
}

function practicePhaseLessonCount(slug: string) {
  const directory = join(practiceDirectory, slug);
  if (!existsSync(directory)) return 0;
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
    .length;
}

function learningTarget(course: CourseOutline[]) {
  const lessons = course.flatMap((phase) => phase.lessons.filter((lesson) => lesson.available));
  const inProgress = lessons.find((lesson) => lesson.progress === "in-progress");
  const review = lessons.find((lesson) => lesson.progress === "review");
  let continuousCompleted = 0;
  while (lessons[continuousCompleted]?.progress === "understood") continuousCompleted += 1;
  const nextLesson = inProgress ?? review ?? lessons[continuousCompleted] ?? lessons[0];
  const continuing = Boolean(inProgress || review || continuousCompleted > 0);
  return {
    kind: continuing ? "continue" : "start",
    label: continuing ? "继续学习" : "开始学习",
    lessonId: nextLesson?.id ?? null,
    url: nextLesson ? `/learn?lessonId=${encodeURIComponent(nextLesson.id)}` : null
  };
}

function curriculumFor(database: DatabaseSync) {
  const course = courseOutline(database);
  const outlines = new Map(course.map((phase) => [phase.slug, phase]));
  const practice = curriculumPhases.map((phase, index) => {
    const outline = outlines.get(phase.slug);
    const staged = index >= phases.length;
    const lessonCount = staged ? practicePhaseLessonCount(phase.slug) : outline?.lessons.length ?? 0;
    const availableLessonCount = outline?.lessons.filter((lesson) => lesson.available).length ?? 0;
    const startedLessonCount = outline?.lessons.filter((lesson) => lesson.progress !== "not-started").length ?? 0;
    const completedLessonCount = outline?.lessons.filter((lesson) => lesson.progress === "understood").length ?? 0;
    return {
      slug: phase.slug,
      position: String(index).padStart(2, "0"),
      title: phase.title.replace(/^Phase \d+ · /, ""),
      status: staged ? "staged" : "available",
      lessonCount,
      availableLessonCount,
      startedLessonCount,
      completedLessonCount,
      firstLessonId: staged ? null : outline?.lessons.find((lesson) => lesson.available)?.id ?? null
    };
  });
  return {
    practice,
    target: learningTarget(course),
    theory: theoryCatalog,
    summary: {
      practicePhaseCount: practice.length,
      publishedPracticePhaseCount: phases.length,
      theoryChapterCount: theoryCatalog.length,
      theoryNoteCount: theoryNotes.length,
      reviewedTheoryNoteCount: theoryNotes.filter((note) => note.readKind === "internal").length
    }
  };
}

type ModelConfig = {
  baseUrl: string;
  model: string;
  apiKey: string;
};

type PublicModelConfig = Omit<ModelConfig, "apiKey"> & {
  apiKeyConfigured: boolean;
};

type TutorMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};

type TutorContext = {
  sectionTitle: string;
  theoryCardSlug: string;
};

type TutorResponseMode = "socratic" | "explanation";

type ReviewItem = {
  id: number;
  text: string;
  createdAt: string;
  resolved: boolean;
  resolvedAt: string | null;
};

type ExportedLearningState = {
  lessonId: string;
  completed: boolean;
  review: boolean;
  readingPosition: number;
};

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(body));
}

function sendText(response: ServerResponse, status: number, body: string) {
  response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  response.end(body);
}

function sendDownload(response: ServerResponse, contentType: string, filename: string, body: string) {
  response.writeHead(200, {
    "content-type": contentType,
    "content-disposition": `attachment; filename="${filename}"`,
    "cache-control": "no-store"
  });
  response.end(body);
}

async function readJson(request: IncomingMessage, maximumBytes = 32_000): Promise<Record<string, unknown> | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > maximumBytes) throw new Error("Request body is too large");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return null;
  const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function createDatabase(dataDirectory: string) {
  mkdirSync(dataDirectory, { recursive: true });
  const database = new DatabaseSync(join(dataDirectory, "learning-atlas.sqlite"));
  database.exec(`
    CREATE TABLE IF NOT EXISTS learning_state (
      lesson_id TEXT PRIMARY KEY,
      completed INTEGER NOT NULL DEFAULT 0,
      review INTEGER NOT NULL DEFAULT 0,
      reading_position INTEGER NOT NULL DEFAULT 0
    ) STRICT;
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY,
      lesson_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS model_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      base_url TEXT NOT NULL,
      model TEXT NOT NULL,
      api_key TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS tutor_messages (
      id INTEGER PRIMARY KEY,
      lesson_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS review_items (
      id INTEGER PRIMARY KEY,
      lesson_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      resolved_at TEXT
    ) STRICT;
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY,
      lesson_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      answers TEXT NOT NULL,
      created_at TEXT NOT NULL
    ) STRICT;
  `);
  const columns = database.prepare("PRAGMA table_info(learning_state)").all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "reading_position")) {
    database.exec("ALTER TABLE learning_state ADD COLUMN reading_position INTEGER NOT NULL DEFAULT 0");
  }
  const modelConfigColumns = database.prepare("PRAGMA table_info(model_config)").all() as Array<{ name: string }>;
  if (modelConfigColumns.some((column) => column.name === "web_search_api_key")) {
    database.exec("UPDATE model_config SET web_search_api_key = ''");
  }
  return database;
}

function stateFor(database: DatabaseSync, lessonId: string): LearningState {
  const row = database.prepare(
    "SELECT completed, review FROM learning_state WHERE lesson_id = ?"
  ).get(lessonId) as { completed: number; review: number } | undefined;
  return { completed: row?.completed === 1, review: row?.review === 1 };
}

function readingPositionFor(database: DatabaseSync, lessonId: string) {
  const row = database.prepare(
    "SELECT reading_position AS position FROM learning_state WHERE lesson_id = ?"
  ).get(lessonId) as { position: number } | undefined;
  return { position: row?.position ?? 0 };
}

function notesFor(database: DatabaseSync, lessonId: string): Note[] {
  return database.prepare(
    "SELECT id, text, created_at AS createdAt FROM notes WHERE lesson_id = ? ORDER BY id DESC"
  ).all(lessonId) as Note[];
}

function exportedLearningStates(database: DatabaseSync): ExportedLearningState[] {
  const rows = database.prepare(`
    SELECT lesson_id AS lessonId, completed, review, reading_position AS readingPosition
    FROM learning_state
    ORDER BY lesson_id
  `).all() as Array<{ lessonId: string; completed: number; review: number; readingPosition: number }>;
  return rows.map((row) => ({
    lessonId: row.lessonId,
    completed: row.completed === 1,
    review: row.review === 1,
    readingPosition: row.readingPosition
  }));
}

function exportedNotes(database: DatabaseSync): Array<Note & { lessonId: string }> {
  return database.prepare(`
    SELECT id, lesson_id AS lessonId, text, created_at AS createdAt
    FROM notes
    ORDER BY lesson_id, id
  `).all() as Array<Note & { lessonId: string }>;
}

function exportedTutorMessages(database: DatabaseSync): Array<TutorMessage & { lessonId: string }> {
  return database.prepare(`
    SELECT id, lesson_id AS lessonId, role, text, created_at AS createdAt
    FROM tutor_messages
    ORDER BY lesson_id, id
  `).all() as Array<TutorMessage & { lessonId: string }>;
}

function reviewItemsFor(database: DatabaseSync, lessonId: string): ReviewItem[] {
  const rows = database.prepare(`
    SELECT id, text, created_at AS createdAt, resolved, resolved_at AS resolvedAt
    FROM review_items
    WHERE lesson_id = ? AND resolved = 0
    ORDER BY id DESC
  `).all(lessonId) as Array<Omit<ReviewItem, "resolved"> & { resolved: number }>;
  return rows.map((row) => ({ ...row, resolved: row.resolved === 1 }));
}

function exportedReviewItems(database: DatabaseSync): Array<ReviewItem & { lessonId: string }> {
  const rows = database.prepare(`
    SELECT id, lesson_id AS lessonId, text, created_at AS createdAt, resolved, resolved_at AS resolvedAt
    FROM review_items
    ORDER BY lesson_id, id
  `).all() as Array<Omit<ReviewItem, "resolved"> & { lessonId: string; resolved: number }>;
  return rows.map((row) => ({ ...row, resolved: row.resolved === 1 }));
}

function exportedQuizAttempts(database: DatabaseSync) {
  return database.prepare(`
    SELECT lesson_id AS lessonId, score, total, answers, created_at AS createdAt
    FROM quiz_attempts
    ORDER BY lesson_id, id
  `).all() as Array<{ lessonId: string; score: number; total: number; answers: string; createdAt: string }>;
}

function learningDataExport(database: DatabaseSync) {
  return {
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    learningStates: exportedLearningStates(database),
    notes: exportedNotes(database),
    tutorMessages: exportedTutorMessages(database),
    reviewItems: exportedReviewItems(database),
    quizAttempts: exportedQuizAttempts(database)
  };
}

type RestoredLearningData = {
  learningStates: ExportedLearningState[];
  notes: Array<Omit<Note, "id"> & { lessonId: string }>;
  tutorMessages: Array<Omit<TutorMessage, "id"> & { lessonId: string }>;
  reviewItems: Array<Omit<ReviewItem, "id"> & { lessonId: string }>;
  quizAttempts: Array<{ lessonId: string; score: number; total: number; answers: string; createdAt: string }>;
};

function importRows(data: Record<string, unknown>, key: string) {
  const rows = data[key];
  if (!Array.isArray(rows) || rows.length > 10_000) throw new Error(`${key} 必须是不超过 10000 条记录的数组。`);
  return rows.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error(`${key}[${index}] 必须是对象。`);
    return row as Record<string, unknown>;
  });
}

function importedText(row: Record<string, unknown>, key: string, maximumLength: number, optional = false) {
  const value = row[key];
  if (optional && (value === null || value === undefined)) return null;
  if (typeof value !== "string" || value.length === 0 || value.length > maximumLength) {
    throw new Error(`${key} 必须是 1–${maximumLength} 个字符的文本。`);
  }
  return value;
}

function importedTimestamp(row: Record<string, unknown>, key: string, optional = false) {
  const value = importedText(row, key, 100, optional);
  if (value === null) return null;
  if (Number.isNaN(Date.parse(value))) throw new Error(`${key} 必须是有效时间。`);
  return value;
}

function importedLessonId(row: Record<string, unknown>) {
  const lessonId = importedText(row, "lessonId", 200)!;
  if (!lessonFor(lessonId)) throw new Error(`备份包含当前课程目录中不存在的课程：${lessonId}`);
  return lessonId;
}

function restoreDataFrom(data: Record<string, unknown>): RestoredLearningData {
  if (data.schemaVersion !== 3) throw new Error("仅支持 schemaVersion 为 3 的 Learning Atlas JSON 备份。");
  return {
    learningStates: importRows(data, "learningStates").map((row) => {
      const readingPosition = row.readingPosition;
      if (typeof row.completed !== "boolean" || typeof row.review !== "boolean" || !Number.isInteger(readingPosition) || readingPosition < 0 || readingPosition > 10_000_000) {
        throw new Error("learningStates 包含无效状态。");
      }
      return { lessonId: importedLessonId(row), completed: row.completed, review: row.review, readingPosition };
    }),
    notes: importRows(data, "notes").map((row) => ({
      lessonId: importedLessonId(row), text: importedText(row, "text", 2_000)!, createdAt: importedTimestamp(row, "createdAt")!
    })),
    tutorMessages: importRows(data, "tutorMessages").map((row) => {
      if (row.role !== "user" && row.role !== "assistant") throw new Error("tutorMessages 包含无效角色。");
      return { lessonId: importedLessonId(row), role: row.role, text: importedText(row, "text", 4_000)!, createdAt: importedTimestamp(row, "createdAt")! };
    }),
    reviewItems: importRows(data, "reviewItems").map((row) => {
      if (typeof row.resolved !== "boolean") throw new Error("reviewItems 包含无效完成状态。");
      const resolvedAt = importedTimestamp(row, "resolvedAt", true);
      if (row.resolved && !resolvedAt) throw new Error("已完成的复习项必须包含完成时间。");
      if (!row.resolved && resolvedAt) throw new Error("未完成的复习项不能包含完成时间。");
      return { lessonId: importedLessonId(row), text: importedText(row, "text", 1_000)!, createdAt: importedTimestamp(row, "createdAt")!, resolved: row.resolved, resolvedAt };
    }),
    quizAttempts: importRows(data, "quizAttempts").map((row) => {
      if (!Number.isInteger(row.score) || !Number.isInteger(row.total) || (row.score as number) < 0 || (row.total as number) < 1 || (row.score as number) > (row.total as number)) {
        throw new Error("quizAttempts 包含无效分数。");
      }
      const answers = importedText(row, "answers", 10_000)!;
      try {
        const values = JSON.parse(answers);
        if (!Array.isArray(values) || !values.every((value) => Number.isInteger(value) && value >= 0 && value <= 3)) throw new Error();
      } catch {
        throw new Error("quizAttempts 包含无效作答。" );
      }
      return { lessonId: importedLessonId(row), score: row.score as number, total: row.total as number, answers, createdAt: importedTimestamp(row, "createdAt")! };
    })
  };
}

function restoreLearningData(database: DatabaseSync, source: Record<string, unknown>) {
  const data = restoreDataFrom(source);
  database.exec("BEGIN IMMEDIATE");
  try {
    database.exec("DELETE FROM learning_state; DELETE FROM notes; DELETE FROM tutor_messages; DELETE FROM review_items; DELETE FROM quiz_attempts;");
    const stateStatement = database.prepare("INSERT INTO learning_state (lesson_id, completed, review, reading_position) VALUES (?, ?, ?, ?)");
    for (const state of data.learningStates) stateStatement.run(state.lessonId, Number(state.completed), Number(state.review), state.readingPosition);
    const noteStatement = database.prepare("INSERT INTO notes (lesson_id, text, created_at) VALUES (?, ?, ?)");
    for (const note of data.notes) noteStatement.run(note.lessonId, note.text, note.createdAt);
    const messageStatement = database.prepare("INSERT INTO tutor_messages (lesson_id, role, text, created_at) VALUES (?, ?, ?, ?)");
    for (const message of data.tutorMessages) messageStatement.run(message.lessonId, message.role, message.text, message.createdAt);
    const reviewStatement = database.prepare("INSERT INTO review_items (lesson_id, text, created_at, resolved, resolved_at) VALUES (?, ?, ?, ?, ?)");
    for (const item of data.reviewItems) reviewStatement.run(item.lessonId, item.text, item.createdAt, Number(item.resolved), item.resolvedAt);
    const quizStatement = database.prepare("INSERT INTO quiz_attempts (lesson_id, score, total, answers, created_at) VALUES (?, ?, ?, ?, ?)");
    for (const attempt of data.quizAttempts) quizStatement.run(attempt.lessonId, attempt.score, attempt.total, attempt.answers, attempt.createdAt);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
  return {
    learningStates: data.learningStates.length,
    notes: data.notes.length,
    tutorMessages: data.tutorMessages.length,
    reviewItems: data.reviewItems.length,
    quizAttempts: data.quizAttempts.length
  };
}

function markdownExport(database: DatabaseSync) {
  const data = learningDataExport(database);
  const stateLines = data.learningStates.length
    ? data.learningStates.map((state) => `- \`${state.lessonId}\`：${state.completed ? "已标记理解" : "未标记理解"}；${state.review ? "待复习" : "未加入待复习"}；阅读位置 ${state.readingPosition}px`).join("\n")
    : "- 尚无课程状态。";
  const noteSections = data.notes.length
    ? data.notes.map((note) => [
      `### \`${note.lessonId}\``,
      "",
      `记录于 ${note.createdAt}`,
      "",
      ...note.text.split("\n").map((line) => `> ${line}`)
    ].join("\n")).join("\n\n")
    : "尚无笔记。";
  const tutorSections = data.tutorMessages.length
    ? data.tutorMessages.map((message) => [
      `### \`${message.lessonId}\` · ${message.role === "user" ? "学习者" : "学习助理"}`,
      "",
      `记录于 ${message.createdAt}`,
      "",
      ...message.text.split("\n").map((line) => `> ${line}`)
    ].join("\n")).join("\n\n")
    : "尚无助理对话。";
  const reviewSections = data.reviewItems.length
    ? data.reviewItems.map((item) => [
      `- [${item.resolved ? "x" : " "}] \`${item.lessonId}\`：${item.text}`,
      `  - 记录于 ${item.createdAt}${item.resolvedAt ? `；完成于 ${item.resolvedAt}` : ""}`
    ].join("\n")).join("\n")
    : "尚无待复习项。";
  const quizSections = data.quizAttempts.length
    ? data.quizAttempts.map((attempt) => `- \`${attempt.lessonId}\`：${attempt.score} / ${attempt.total}；作答于 ${attempt.createdAt}`).join("\n")
    : "尚无自测记录。";
  return [
    "# Learning Atlas 学习数据导出",
    "",
    `导出时间：${data.exportedAt}`,
    "",
    "## 课程状态",
    "",
    stateLines,
    "",
    "## 笔记",
    "",
    noteSections,
    "",
    "## 助理对话",
    "",
    tutorSections,
    "",
    "## 待复习项",
    "",
    reviewSections,
    "",
    "## 自测记录",
    "",
    quizSections,
    ""
  ].join("\n");
}

function modelConfigFor(database: DatabaseSync): ModelConfig | null {
  return database.prepare(
    "SELECT base_url AS baseUrl, model, api_key AS apiKey FROM model_config WHERE id = 1"
  ).get() as ModelConfig | undefined ?? null;
}

function publicModelConfig(config: ModelConfig | null): PublicModelConfig {
  return config
    ? {
      baseUrl: config.baseUrl,
      model: config.model,
      apiKeyConfigured: config.apiKey.length > 0
    }
    : { baseUrl: "", model: "", apiKeyConfigured: false };
}

function saveModelConfig(database: DatabaseSync, config: ModelConfig) {
  database.prepare(`
    INSERT INTO model_config (id, base_url, model, api_key, updated_at) VALUES (1, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET base_url = excluded.base_url, model = excluded.model, api_key = excluded.api_key, updated_at = excluded.updated_at
  `).run(config.baseUrl, config.model, config.apiKey, new Date().toISOString());
  return publicModelConfig(config);
}

async function compatibleModels(baseUrl: string, apiKey: string) {
  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
    headers: apiKey ? { authorization: `Bearer ${apiKey}` } : {},
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error(`模型列表接口返回 ${response.status}。请检查地址、权限和接口兼容性。`);
  const payload = await response.json() as { data?: Array<{ id?: unknown }> };
  const models = Array.isArray(payload.data)
    ? payload.data.map((item) => typeof item.id === "string" ? item.id.trim() : "").filter((id) => id.length > 0 && id.length <= 200)
    : [];
  if (!models.length) throw new Error("模型列表接口没有返回可用模型。请手动填写模型名。");
  return [...new Set(models)].sort((left, right) => left.localeCompare(right));
}

function tutorMessagesFor(database: DatabaseSync, lessonId: string): TutorMessage[] {
  return database.prepare(`
    SELECT id, role, text, created_at AS createdAt
    FROM tutor_messages
    WHERE lesson_id = ?
    ORDER BY id
  `).all(lessonId) as TutorMessage[];
}

function saveTutorMessage(database: DatabaseSync, lessonId: string, role: TutorMessage["role"], text: string) {
  const createdAt = new Date().toISOString();
  const result = database.prepare(
    "INSERT INTO tutor_messages (lesson_id, role, text, created_at) VALUES (?, ?, ?, ?)"
  ).run(lessonId, role, text, createdAt);
  return { id: Number(result.lastInsertRowid), role, text, createdAt } satisfies TutorMessage;
}

function deleteTutorMessage(database: DatabaseSync, lessonId: string, id: number) {
  return database.prepare("DELETE FROM tutor_messages WHERE id = ? AND lesson_id = ?").run(id, lessonId).changes > 0;
}

function clearTutorMessages(database: DatabaseSync, lessonId: string) {
  return database.prepare("DELETE FROM tutor_messages WHERE lesson_id = ?").run(lessonId).changes;
}

function tutorEvidence(lesson: Lesson) {
  const content = publishedLessonContent(lesson);
  if (content.translationStatus !== "reviewed") throw new Error("当前课程译文不可作为助理证据。");
  const theory = content.theoryCards.map((card) => {
    if (!isRichTheoryCard(card)) {
      return `- ${card.title}：${card.summary}\n  扩展内容待迁移，助理不应补写未经审核的字段。`;
    }
    return [
      `- ${card.title}`,
      `  当前用途：${card.context}`,
      `  核心直觉：${card.intuition}`,
      `  关键点：${card.keyPoints.join("；")}`,
      `  本课应用：${card.application}`,
      `  自检问题：${card.checkQuestion}`
    ].join("\n");
  }).join("\n");
  return [
    "当前实践课程（已审核中文改编）：",
    content.markdown,
    "",
    "已批准的上下文理论卡：",
    theory || "无"
  ].join("\n");
}

function tutorLearningContext(database: DatabaseSync, lesson: Lesson, context: TutorContext) {
  const content = publishedLessonContent(lesson);
  const theoryCard = content.theoryCards.find((card) => card.slug === context.theoryCardSlug);
  const state = stateFor(database, lesson.id);
  const pendingReviews = reviewItemsFor(database, lesson.id);
  const theoryContext = theoryCard && isRichTheoryCard(theoryCard)
    ? `${theoryCard.title}；当前用途：${theoryCard.context}；本课应用：${theoryCard.application}；自检问题：${theoryCard.checkQuestion}`
    : theoryCard
      ? `${theoryCard.title}；摘要：${theoryCard.summary}；扩展内容待迁移。`
      : "当前段落没有已批准的关联理论卡。";
  return [
    "当前学习上下文（优先围绕此处追问）：",
    `当前段落：${context.sectionTitle}`,
    `关联理论卡：${theoryContext}`,
    `本课状态：${state.completed ? "学习者已标记理解" : "尚未标记理解"}；${state.review ? "整课仍需复习" : "未标记整课复习"}。`,
    `已确认待复习点：${pendingReviews.length ? pendingReviews.map((item) => item.text).join("；") : "无"}。`
  ].join("\n");
}

function tutorContextFrom(body: Record<string, unknown> | null): TutorContext {
  const context = body?.context;
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    return { sectionTitle: "本课概览", theoryCardSlug: "" };
  }
  const values = context as Record<string, unknown>;
  const sectionTitle = typeof values.sectionTitle === "string" ? values.sectionTitle.trim() : "";
  const theoryCardSlug = typeof values.theoryCardSlug === "string" ? values.theoryCardSlug.trim() : "";
  return {
    sectionTitle: sectionTitle && sectionTitle.length <= 160 ? sectionTitle : "本课概览",
    theoryCardSlug: /^[a-z0-9-]{0,100}$/.test(theoryCardSlug) ? theoryCardSlug : ""
  };
}

function tutorResponseModeFrom(body: Record<string, unknown> | null): TutorResponseMode {
  return body?.mode === "explanation" ? "explanation" : "socratic";
}

async function tutorReply(
  database: DatabaseSync,
  lesson: Lesson,
  text: string,
  context: TutorContext,
  responseMode: TutorResponseMode
) {
  const config = modelConfigFor(database);
  if (!config || !config.baseUrl || !config.model) throw new Error("请先配置本地学习助理的兼容接口和模型名。");
  const priorMessages = tutorMessagesFor(database, lesson.id).slice(-10);
  const endpoint = `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {})
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content: [
            "你是 Learning Atlas 的苏格拉底式学习助理。优先依据下列课程内证据回答。",
            responseMode === "explanation"
              ? "学习者已明确要求完整解释。请先简短说明关键误区，再基于课程内证据给出清晰、分步的解释；不要假装这仍是诊断阶段。"
              : "先用一个可回答的诊断问题和最小提示帮助学习者思考；不要直接给出完整解答。",
            "若课程内证据不足，明确说明边界，不要把模型常识伪装成课程内容。",
            "不要把未经对话确认的猜测写成误解或学习状态。",
            "优先围绕当前学习上下文中的段落和关联理论卡提问；不要把已有待复习点当作新的诊断结论。",
            "\n--- 当前学习上下文 ---\n",
            tutorLearningContext(database, lesson, context),
            "\n--- 课程内证据 ---\n",
            tutorEvidence(lesson)
          ].join("\n")
        },
        ...priorMessages.map((message) => ({ role: message.role, content: message.text })),
        { role: "user", content: text }
      ]
    }),
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok) throw new Error(`模型接口返回 ${response.status}。`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const reply = payload.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("模型接口没有返回可显示的文本。");
  const userMessage = saveTutorMessage(database, lesson.id, "user", text);
  const assistantMessage = saveTutorMessage(database, lesson.id, "assistant", reply);
  return { userMessage, assistantMessage };
}

export function prepareWorkspace(dataDirectory: string, lessonId = defaultLessonId): Workspace {
  const lesson = lessonFor(lessonId);
  if (!lesson) throw new Error("课程不存在。");
  const reference = lessonReference(lesson.id)!;
  const { phase, slug } = reference;
  const directory = join(dataDirectory, "workspaces", phase.slug, slug);
  const sourceDirectory = join(phaseDirectory(phase), slug, "code");
  const explorationDirectory = join(repositoryDirectory, "content/explorations", phase.slug, slug);
  const workspaceTemplateDirectory = join(repositoryDirectory, "content/workspace-templates", phase.slug, slug);
  const sourceName = readdirSync(sourceDirectory).filter((name) => name.endsWith(".py")).sort()[0];
  if (!sourceName) throw new Error("当前课程没有 Python 参考实现。");
  const explorationName = existsSync(explorationDirectory)
    ? readdirSync(explorationDirectory).filter((name) => name.endsWith(".py")).sort()[0] ?? null
    : null;
  const templateNames = existsSync(workspaceTemplateDirectory)
    ? readdirSync(workspaceTemplateDirectory, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name)
    : [];
  const exerciseName = templateNames.find((name) => /^exercise_.*\.py$/.test(name)) ?? null;
  const exerciseTestName = templateNames.find((name) => /^test_exercise_.*\.py$/.test(name)) ?? null;
  const guideName = templateNames.includes("EXERCISES.md") ? "EXERCISES.md" : null;
  const sourceFile = join(directory, sourceName);
  const explorationFile = explorationName ? join(directory, explorationName) : null;
  const exerciseFile = exerciseName ? join(directory, exerciseName) : null;
  const exerciseTestFile = exerciseTestName ? join(directory, exerciseTestName) : null;
  const exercisesGuide = guideName ? join(directory, guideName) : null;
  mkdirSync(directory, { recursive: true });
  if (!existsSync(sourceFile)) copyFileSync(join(sourceDirectory, sourceName), sourceFile);
  if (explorationFile && explorationName && !existsSync(explorationFile)) copyFileSync(join(explorationDirectory, explorationName), explorationFile);
  for (const name of templateNames) {
    const target = join(directory, name);
    if (!existsSync(target)) copyFileSync(join(workspaceTemplateDirectory, name), target);
  }
  const readme = join(directory, "README.md");
  if (!existsSync(readme)) writeFileSync(readme, [
    `# ${lesson.title}`,
    "",
    "这是 Learning Atlas 为本课创建的私人实践工作区。",
    "",
    `- 在 VS Code 中先运行参考实现 \`${sourceName}\`。`,
    exercisesGuide ? `- 阅读 \`${guideName}\`，完成练习后运行对应的标准库测试。` : "- 使用课程中的 Python 文件完成练习。",
    explorationFile ? `- 在 marimo 中打开 \`${explorationName}\`，改变参数并观察结果。` : "- 本课暂无已发布的 marimo 探索笔记。",
    "- 此目录不会修改上游课程仓库。",
    ""
  ].join("\n"), "utf8");
  // 让 workspace 继承根目录的共享 .venv，避免每次打开都是孤立环境
  const venvSource = join(repositoryDirectory, ".venv");
  const venvTarget = join(directory, ".venv");
  if (existsSync(venvSource) && !existsSync(venvTarget)) {
    try { symlinkSync(venvSource, venvTarget, "junction"); } catch { /* 忽略已有目录或权限错误 */ }
  }
  // VSCode 识别共享解释器
  const vscodeDir = join(directory, ".vscode");
  mkdirSync(vscodeDir, { recursive: true });
  const settingsPath = join(vscodeDir, "settings.json");
  if (!existsSync(settingsPath)) {
    writeFileSync(settingsPath, JSON.stringify({
      "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python"
    }, null, 2), "utf8");
  }
  return { directory, sourceFile, explorationFile, exerciseFile, exerciseTestFile, exercisesGuide };
}

function commandAvailable(command: string) {
  const result = spawnSync(command, ["--version"], { stdio: "ignore" });
  return !result.error && result.status === 0;
}

function sha256(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function approvedTheoryCards(lesson: Lesson): TheoryCard[] {
  const { slug } = lessonReference(lesson.id)!;
  const theoryLinksDirectory = join(repositoryDirectory, "content/theory-links", lesson.phaseSlug, slug);
  if (!existsSync(theoryLinksDirectory)) return [];
  return readdirSync(theoryLinksDirectory)
    .filter((name) => name.endsWith(".yaml"))
    .flatMap((name) => {
      const document = readFileSync(join(theoryLinksDirectory, name), "utf8");
      if (yamlScalar(document, /^status:\s*(.+)$/m) !== "approved") return [];
      const practiceBlock = document.match(/^practice:\n([\s\S]*?)(?=^card:)/m)?.[1] ?? "";
      const cardBlock = document.match(/^card:\n([\s\S]*?)(?=^theory:)/m)?.[1] ?? "";
      const theoryBlock = document.match(/^theory:\n([\s\S]*)$/m)?.[1] ?? "";
      const slug = yamlScalar(practiceBlock, /^    slug:\s*(.+)$/m);
      const title = yamlScalar(cardBlock, /^  title:\s*(.+)$/m);
      const summary = yamlScalar(cardBlock, /^  summary:\s*(.+)$/m);
      const context = yamlScalar(cardBlock, /^  context:\s*(.+)$/m);
      const intuition = yamlScalar(cardBlock, /^  intuition:\s*(.+)$/m);
      const keyPoints = yamlList(cardBlock, "key_points");
      const application = yamlScalar(cardBlock, /^  application:\s*(.+)$/m);
      const checkQuestion = yamlScalar(cardBlock, /^  check_question:\s*(.+)$/m);
      const repository = yamlScalar(theoryBlock, /^  repository:\s*(.+)$/m);
      const path = yamlScalar(theoryBlock, /^  path:\s*(.+)$/m);
      const fingerprint = yamlScalar(theoryBlock, /^  sha256:\s*(.+)$/m);
      if (!slug || !title || !summary || !repository || !path || !fingerprint) return [];
      const currentSource = join(repositoryDirectory, repository, path);
      if (!existsSync(currentSource) || sha256(currentSource) !== fingerprint) return [];
      const note = theoryNoteBySourcePath.get(path);
      if (!note) return [];
      const hasRichContent = Boolean(context && intuition && keyPoints.length >= 2 && keyPoints.length <= 4 && application && checkQuestion);
      return [{
        slug,
        title,
        summary,
        ...(hasRichContent ? { context, intuition, keyPoints, application, checkQuestion } : {}),
        sourceUrl: repository === "maths-cs-ai-compendium" ? officialTheoryUrl(path) : sourceUrl(repository, "main", path),
        theoryId: note.theoryId,
        readKind: note.readKind,
        readLanguage: note.readLanguage,
        readUrl: note.readUrl,
        latestSourceUrl: note.latestSourceUrl
      }];
    });
}

function publishedLessonContent(lesson: Lesson): LessonContent {
  const { phase, slug } = lessonReference(lesson.id)!;
  const translationFile = join(repositoryDirectory, "content/translations/practice", phase.slug, slug, "zh.md");
  const lessonDocumentFile = join(phaseDirectory(phase), slug, "docs/en.md");
  if (!existsSync(translationFile) || !existsSync(lessonDocumentFile)) {
    return { markdown: "", translationStatus: "unavailable", theoryCards: [] };
  }
  const document = readFileSync(translationFile, "utf8");
  const match = document.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { markdown: "", translationStatus: "unavailable", theoryCards: [] };
  const [, frontmatter, markdown] = match;
  const status = yamlScalar(frontmatter, /^status:\s*(.+)$/m);
  const fingerprint = yamlScalar(frontmatter, /^  sha256:\s*(.+)$/m);
  if (status !== "reviewed") return { markdown: "", translationStatus: "unavailable", theoryCards: [] };
  if (!fingerprint || sha256(lessonDocumentFile) !== fingerprint) {
    return { markdown: "", translationStatus: "stale", theoryCards: [] };
  }
  return { markdown, translationStatus: "reviewed", theoryCards: approvedTheoryCards(lesson) };
}

function publishedQuiz(lesson: Lesson): PublishedQuiz {
  const { phase, slug } = lessonReference(lesson.id)!;
  const quizTranslationFile = join(repositoryDirectory, "content/assessments/practice", phase.slug, slug, "zh.json");
  const quizSourceFile = join(phaseDirectory(phase), slug, "quiz.json");
  if (!existsSync(quizTranslationFile) || !existsSync(quizSourceFile)) return { questions: [], status: "unavailable" };
  try {
    const quiz = JSON.parse(readFileSync(quizTranslationFile, "utf8")) as {
      status?: string;
      source?: { sha256?: string };
      questions?: QuizQuestion[];
    };
    if (quiz.status !== "reviewed" || quiz.source?.sha256 !== sha256(quizSourceFile) || !Array.isArray(quiz.questions)) {
      return { questions: [], status: "stale" };
    }
    const valid = quiz.questions.every((item) => typeof item.id === "string" && typeof item.question === "string" &&
      Array.isArray(item.options) && item.options.length === 4 && item.options.every((option) => typeof option === "string") &&
      Number.isInteger(item.correct) && item.correct >= 0 && item.correct < item.options.length && typeof item.explanation === "string");
    return valid ? { questions: quiz.questions, status: "reviewed" } : { questions: [], status: "unavailable" };
  } catch {
    return { questions: [], status: "unavailable" };
  }
}

function quizForLearner(lesson: Lesson) {
  const quiz = publishedQuiz(lesson);
  return { status: quiz.status, questions: quiz.questions.map(({ id, question, options }) => ({ id, question, options })) };
}

function quizResultForAnswers(quiz: PublishedQuiz, selected: number[]) {
  const results = quiz.questions.map((question, index) => ({
    id: question.id,
    selected: selected[index],
    correct: selected[index] === question.correct,
    explanation: question.explanation
  }));
  return { score: results.filter((result) => result.correct).length, total: results.length, results };
}

function latestQuizAttempt(database: DatabaseSync, lesson: Lesson) {
  const row = database.prepare("SELECT answers FROM quiz_attempts WHERE lesson_id = ? ORDER BY id DESC LIMIT 1")
    .get(lesson.id) as { answers: string } | undefined;
  if (!row) return null;
  try {
    const selected = JSON.parse(row.answers);
    const quiz = publishedQuiz(lesson);
    if (!Array.isArray(selected) || selected.length !== quiz.questions.length || !selected.every(Number.isInteger)) return null;
    return quizResultForAnswers(quiz, selected);
  } catch {
    return null;
  }
}

function submitQuiz(database: DatabaseSync, lesson: Lesson, answers: Record<string, unknown>) {
  const quiz = publishedQuiz(lesson);
  if (quiz.status !== "reviewed") throw new Error("当前自测内容不可用。");
  const selected = quiz.questions.map((question) => answers[question.id]);
  if (selected.some((answer) => !Number.isInteger(answer) || (answer as number) < 0 || (answer as number) > 3)) {
    throw new Error("请完成每一道题后再提交。");
  }
  const result = quizResultForAnswers(quiz, selected as number[]);
  database.prepare("INSERT INTO quiz_attempts (lesson_id, score, total, answers, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(lesson.id, result.score, result.total, JSON.stringify(selected), new Date().toISOString());
  return result;
}

function launch(command: string, args: string[], directory: string) {
  const child = spawn(command, args, {
    cwd: directory,
    detached: true,
    shell: false,
    stdio: "ignore"
  });
  child.unref();
}

const mimeTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

async function serveFile(rootDirectory: string, requestedPath: string, response: ServerResponse) {
  const relativePath = normalize(requestedPath).replace(/^[/\\]+/, "");
  const filePath = resolve(rootDirectory, relativePath);
  if (!filePath.startsWith(`${rootDirectory}/`)) return sendText(response, 403, "Forbidden");

  try {
    if (!(await stat(filePath)).isFile()) return sendText(response, 404, "Not found");
    response.writeHead(200, {
      "content-type": mimeTypes[extname(filePath)] ?? "application/octet-stream",
      "cache-control": "no-cache"
    });
    response.end(await readFile(filePath));
  } catch {
    sendText(response, 404, "Not found");
  }
}

function serveStatic(pathname: string, response: ServerResponse) {
  const requestedPath = ["/", "/learn", "/theory"].includes(pathname) ? "/index.html" : pathname;
  return serveFile(publicDirectory, requestedPath, response);
}

function serveMermaid(pathname: string, response: ServerResponse) {
  return serveFile(mermaidDirectory, pathname.slice("/vendor/mermaid/".length), response);
}

function serveHighlight(pathname: string, response: ServerResponse) {
  return serveFile(highlightDirectory, pathname.slice("/vendor/highlight/".length), response);
}

function serveGsap(pathname: string, response: ServerResponse) {
  return serveFile(gsapDirectory, pathname.slice("/vendor/gsap/".length), response);
}

function serveKatex(pathname: string, response: ServerResponse) {
  return serveFile(katexDirectory, pathname.slice("/vendor/katex/".length), response);
}

function serveTheoryAsset(pathname: string, response: ServerResponse) {
  let requestedPath = pathname.slice("/api/theory/assets/".length);
  try {
    requestedPath = decodeURIComponent(requestedPath);
  } catch {
    return sendText(response, 400, "Bad request");
  }
  if (![".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"].includes(extname(requestedPath).toLowerCase())) {
    return sendText(response, 403, "Forbidden");
  }
  return serveFile(theoryDirectory, requestedPath, response);
}

export function createApp(dataDirectory = join(applicationDirectory, "data")): App {
  const database = createDatabase(dataDirectory);
  const vscodeCommand = process.env.LEARNING_ATLAS_VSCODE_COMMAND ?? "code";
  const marimoCommand = process.env.LEARNING_ATLAS_MARIMO_COMMAND ?? "marimo";

  return {
    close() {
      database.close();
    },
    async handler(request, response) {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const lessonId = url.searchParams.get("lessonId") ?? defaultLessonId;
      const lesson = lessonFor(lessonId);

      try {
        if (request.method === "GET" && url.pathname === "/api/health") {
          return sendJson(response, 200, { status: "ok" });
        }
        if (request.method === "GET" && url.pathname === "/api/curriculum") {
          return sendJson(response, 200, curriculumFor(database));
        }
        if (request.method === "GET" && url.pathname === "/api/theory/content") {
          const theoryId = url.searchParams.get("theoryId") ?? "";
          const content = theoryContentFor(theoryId);
          return content
            ? sendJson(response, 200, content)
            : sendJson(response, 404, { error: "Theory content not found" });
        }
        if (request.method === "GET" && url.pathname.startsWith("/api/theory/assets/")) {
          return serveTheoryAsset(url.pathname, response);
        }
        const lessonRoute = [
          "/api/lesson", "/api/lesson/content", "/api/quiz", "/api/quiz/attempts", "/api/tutor/messages",
          "/api/review-items", "/api/tools", "/api/workspace/open", "/api/exploration/open", "/api/learning-state",
          "/api/reading-position", "/api/notes"
        ].some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`));
        if (lessonRoute && !lesson) return sendJson(response, 404, { error: "Lesson not found" });
        if (request.method === "GET" && url.pathname === "/api/lesson") {
          return sendJson(response, 200, {
            ...lesson!,
            translationStatus: publishedLessonContent(lesson!).translationStatus
          });
        }
        if (request.method === "GET" && url.pathname === "/api/course") {
          return sendJson(response, 200, courseOutline(database));
        }
        if (request.method === "GET" && url.pathname === "/api/lesson/content") {
          return sendJson(response, 200, publishedLessonContent(lesson!));
        }
        if (request.method === "GET" && url.pathname === "/api/quiz") {
          return sendJson(response, 200, quizForLearner(lesson!));
        }
        if (request.method === "GET" && url.pathname === "/api/quiz/attempts") {
          return sendJson(response, 200, latestQuizAttempt(database, lesson!));
        }
        if (request.method === "POST" && url.pathname === "/api/quiz/attempts") {
          const body = await readJson(request);
          const answers = body?.answers;
          if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
            return sendJson(response, 400, { error: "answers must be an object" });
          }
          try {
            return sendJson(response, 201, submitQuiz(database, lesson!, answers as Record<string, unknown>));
          } catch (error) {
            return sendJson(response, 400, { error: error instanceof Error ? error.message : "Invalid quiz attempt" });
          }
        }
        if (request.method === "GET" && url.pathname === "/api/export") {
          const format = url.searchParams.get("format");
          if (format === "json") {
            return sendDownload(response, "application/json; charset=utf-8", "learning-atlas-data.json", `${JSON.stringify(learningDataExport(database), null, 2)}\n`);
          }
          if (format === "markdown") {
            return sendDownload(response, "text/markdown; charset=utf-8", "learning-atlas-data.md", markdownExport(database));
          }
          return sendJson(response, 400, { error: "format must be json or markdown" });
        }
        if (request.method === "POST" && url.pathname === "/api/import") {
          try {
            const body = await readJson(request, 5_000_000);
            if (!body) return sendJson(response, 400, { error: "请提供 Learning Atlas JSON 备份。" });
            return sendJson(response, 200, { restored: restoreLearningData(database, body) });
          } catch (error) {
            return sendJson(response, 400, { error: error instanceof Error ? error.message : "无法导入备份。" });
          }
        }
        if (request.method === "GET" && url.pathname === "/api/model-config") {
          return sendJson(response, 200, publicModelConfig(modelConfigFor(database)));
        }
        if (request.method === "POST" && url.pathname === "/api/model-config/models") {
          const body = await readJson(request);
          const existing = modelConfigFor(database);
          const baseUrl = typeof body?.baseUrl === "string" ? body.baseUrl.trim().replace(/\/+$/, "") : existing?.baseUrl ?? "";
          const apiKey = typeof body?.apiKey === "string" && body.apiKey.trim() ? body.apiKey.trim() : existing?.apiKey ?? "";
          try {
            if (!baseUrl || !["http:", "https:"].includes(new URL(baseUrl).protocol)) throw new Error();
          } catch {
            return sendJson(response, 400, { error: "baseUrl must be an http(s) URL" });
          }
          try {
            return sendJson(response, 200, { models: await compatibleModels(baseUrl, apiKey) });
          } catch (error) {
            return sendJson(response, 502, { error: error instanceof Error ? error.message : "无法获取模型列表。" });
          }
        }
        if (request.method === "PUT" && url.pathname === "/api/model-config") {
          const body = await readJson(request);
          const baseUrl = typeof body?.baseUrl === "string" ? body.baseUrl.trim().replace(/\/+$/, "") : "";
          const model = typeof body?.model === "string" ? body.model.trim() : "";
          const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : null;
          const clearApiKey = body?.clearApiKey === "on";
          try {
            if (!baseUrl || !["http:", "https:"].includes(new URL(baseUrl).protocol) || !model || model.length > 200) throw new Error();
          } catch {
            return sendJson(response, 400, { error: "baseUrl must be an http(s) URL and model must be provided" });
          }
          const existing = modelConfigFor(database);
          return sendJson(response, 200, saveModelConfig(database, {
            baseUrl,
            model,
            apiKey: clearApiKey ? "" : apiKey || existing?.apiKey || ""
          }));
        }
        if (request.method === "GET" && url.pathname === "/api/tutor/messages") {
          return sendJson(response, 200, tutorMessagesFor(database, lessonId));
        }
        if (request.method === "DELETE" && url.pathname === "/api/tutor/messages") {
          clearTutorMessages(database, lessonId);
          return sendJson(response, 200, { cleared: true });
        }
        const tutorMessageMatch = url.pathname.match(/^\/api\/tutor\/messages\/(\d+)$/);
        if (request.method === "DELETE" && tutorMessageMatch) {
          if (!deleteTutorMessage(database, lessonId, Number(tutorMessageMatch[1]))) {
            return sendJson(response, 404, { error: "对话不存在。" });
          }
          return sendJson(response, 200, { deleted: true });
        }
        if (request.method === "POST" && url.pathname === "/api/tutor/messages") {
          const body = await readJson(request);
          const text = typeof body?.text === "string" ? body.text.trim() : "";
          if (!text || text.length > 4_000) return sendJson(response, 400, { error: "text must contain 1–4000 characters" });
          return sendJson(response, 201, await tutorReply(
            database,
            lesson!,
            text,
            tutorContextFrom(body),
            tutorResponseModeFrom(body)
          ));
        }
        if (request.method === "GET" && url.pathname === "/api/review-items") {
          return sendJson(response, 200, reviewItemsFor(database, lessonId));
        }
        if (request.method === "POST" && url.pathname === "/api/review-items") {
          const body = await readJson(request);
          const text = typeof body?.text === "string" ? body.text.trim() : "";
          if (!text || text.length > 1_000) {
            return sendJson(response, 400, { error: "review item text must contain 1–1000 characters" });
          }
          const createdAt = new Date().toISOString();
          const result = database.prepare(
            "INSERT INTO review_items (lesson_id, text, created_at) VALUES (?, ?, ?)"
          ).run(lessonId, text, createdAt);
          return sendJson(response, 201, {
            id: Number(result.lastInsertRowid),
            text,
            createdAt,
            resolved: false,
            resolvedAt: null
          } satisfies ReviewItem);
        }
        const reviewItemMatch = url.pathname.match(/^\/api\/review-items\/(\d+)$/);
        if (request.method === "PUT" && reviewItemMatch) {
          const body = await readJson(request);
          if (body?.resolved !== true) return sendJson(response, 400, { error: "resolved must be true" });
          const resolvedAt = new Date().toISOString();
          const result = database.prepare(`
            UPDATE review_items
            SET resolved = 1, resolved_at = ?
            WHERE id = ? AND lesson_id = ? AND resolved = 0
          `).run(resolvedAt, Number(reviewItemMatch[1]), lessonId);
          if (result.changes === 0) return sendJson(response, 404, { error: "Review item not found" });
          return sendJson(response, 200, { resolvedAt });
        }
        if (request.method === "GET" && url.pathname === "/api/tools") {
          return sendJson(response, 200, {
            vscodeAvailable: commandAvailable(vscodeCommand),
            marimoAvailable: commandAvailable(marimoCommand)
          });
        }
        if (request.method === "POST" && url.pathname === "/api/workspace/open") {
          const workspace = prepareWorkspace(dataDirectory, lessonId);
          if (!commandAvailable(vscodeCommand)) {
            return sendJson(response, 409, { error: "未找到 VS Code 命令。请安装 code 命令后重试。", workspace });
          }
          launch(vscodeCommand, [workspace.directory], workspace.directory);
          return sendJson(response, 202, { workspace, opened: "vscode" });
        }
        if (request.method === "POST" && url.pathname === "/api/exploration/open") {
          const workspace = prepareWorkspace(dataDirectory, lessonId);
          if (!workspace.explorationFile) {
            return sendJson(response, 409, { error: "本课暂无已发布的 marimo 探索笔记。", workspace });
          }
          if (!commandAvailable(marimoCommand)) {
            return sendJson(response, 409, { error: "未找到 marimo。请在你的 Python 环境中安装它后重试。", workspace });
          }
          launch(marimoCommand, [
            "edit",
            workspace.explorationFile,
            "--host", "127.0.0.1",
            "--watch",
            "--timeout", "120",
            "--skip-update-check"
          ], workspace.directory);
          return sendJson(response, 202, { workspace, opened: "marimo" });
        }
        if (request.method === "GET" && url.pathname === "/api/learning-state") {
          return sendJson(response, 200, stateFor(database, lessonId));
        }
        if (request.method === "PUT" && url.pathname === "/api/learning-state") {
          const body = await readJson(request);
          if (typeof body?.completed !== "boolean" || typeof body.review !== "boolean") {
            return sendJson(response, 400, { error: "completed and review must be boolean" });
          }
          database.prepare(`
            INSERT INTO learning_state (lesson_id, completed, review) VALUES (?, ?, ?)
            ON CONFLICT(lesson_id) DO UPDATE SET completed = excluded.completed, review = excluded.review
          `).run(lessonId, Number(body.completed), Number(body.review));
          return sendJson(response, 200, stateFor(database, lessonId));
        }
        if (request.method === "GET" && url.pathname === "/api/reading-position") {
          return sendJson(response, 200, readingPositionFor(database, lessonId));
        }
        if (request.method === "PUT" && url.pathname === "/api/reading-position") {
          const body = await readJson(request);
          const position = body?.position;
          if (typeof position !== "number" || !Number.isSafeInteger(position) || position < 0 || position > 10_000_000) {
            return sendJson(response, 400, { error: "position must be an integer between 0 and 10000000" });
          }
          database.prepare(`
            INSERT INTO learning_state (lesson_id, reading_position) VALUES (?, ?)
            ON CONFLICT(lesson_id) DO UPDATE SET reading_position = excluded.reading_position
          `).run(lessonId, position);
          return sendJson(response, 200, readingPositionFor(database, lessonId));
        }
        if (request.method === "GET" && url.pathname === "/api/notes") {
          return sendJson(response, 200, notesFor(database, lessonId));
        }
        if (request.method === "POST" && url.pathname === "/api/notes") {
          const body = await readJson(request);
          const text = typeof body?.text === "string" ? body.text.trim() : "";
          if (text.length === 0 || text.length > 2_000) {
            return sendJson(response, 400, { error: "note text must contain 1–2000 characters" });
          }
          const createdAt = new Date().toISOString();
          const result = database.prepare(
            "INSERT INTO notes (lesson_id, text, created_at) VALUES (?, ?, ?)"
          ).run(lessonId, text, createdAt);
          return sendJson(response, 201, {
            id: Number(result.lastInsertRowid),
            text,
            createdAt
          });
        }
        if (url.pathname.startsWith("/api/")) return sendJson(response, 404, { error: "Not found" });
        if (url.pathname.startsWith("/vendor/mermaid/")) return serveMermaid(url.pathname, response);
        if (url.pathname.startsWith("/vendor/highlight/")) return serveHighlight(url.pathname, response);
        if (url.pathname.startsWith("/vendor/gsap/")) return serveGsap(url.pathname, response);
        if (url.pathname.startsWith("/vendor/katex/")) return serveKatex(url.pathname, response);
        return serveStatic(url.pathname, response);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return sendJson(response, 500, { error: message });
      }
    }
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = createApp(process.env.LEARNING_ATLAS_DATA_DIR);
  const server = createServer((request, response) => void app.handler(request, response));
  server.listen(4173, "127.0.0.1", () => {
    console.log("Learning Atlas is running at http://127.0.0.1:4173");
  });
  process.on("SIGINT", () => server.close(() => app.close()));
  process.on("SIGTERM", () => server.close(() => app.close()));
}

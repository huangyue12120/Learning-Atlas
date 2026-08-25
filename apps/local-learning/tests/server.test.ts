import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, type Server } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { createApp, firstLesson, prepareWorkspace } from "../src/server.ts";

const cleanups: Array<() => void> = [];
const correctFirstQuizAnswers = {
  "dot-product": 1,
  embedding: 3,
  "linear-independence": 1,
  "matrix-rank": 0,
  lora: 0
};

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

async function startTestServer(directory = mkdtempSync(join(tmpdir(), "learning-atlas-"))) {
  const app = createApp(directory);
  const server = createServer((request, response) => void app.handler(request, response));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  cleanups.push(() => {
    server.close();
    app.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return `http://127.0.0.1:${address.port}`;
}

test("loads published lesson content and resources by lessonId", async () => {
  const baseUrl = await startTestServer();
  const health = await fetch(`${baseUrl}/api/health`).then((response) => response.json());
  const lesson = await fetch(`${baseUrl}/api/lesson`).then((response) => response.json());
  assert.deepEqual(health, { status: "ok" });
  assert.equal(lesson.id, firstLesson.id);
  assert.equal(lesson.source.sha256, firstLesson.source.sha256);
  assert.equal(lesson.translationStatus, "reviewed");
  const content = await fetch(`${baseUrl}/api/lesson/content`).then((response) => response.json());
  assert.match(content.markdown, /线性代数直觉/);
  assert.equal(content.theoryCards.length, 3);
  const course = await fetch(`${baseUrl}/api/course`).then((response) => response.json());
  assert.equal(course.length, 12);
  const setup = course.find((phase: { slug: string }) => phase.slug === "00-setup-and-tooling");
  const foundations = course.find((phase: { slug: string }) => phase.slug === "01-math-foundations");
  const mlFundamentals = course.find((phase: { slug: string }) => phase.slug === "02-ml-fundamentals");
  const deepLearningCore = course.find((phase: { slug: string }) => phase.slug === "03-deep-learning-core");
  const computerVision = course.find((phase: { slug: string }) => phase.slug === "04-computer-vision");
  const nlpFoundations = course.find((phase: { slug: string }) => phase.slug === "05-nlp-foundations-to-advanced");
  const speechAndAudio = course.find((phase: { slug: string }) => phase.slug === "06-speech-and-audio");
  const transformers = course.find((phase: { slug: string }) => phase.slug === "07-transformers-deep-dive");
  const generativeAI = course.find((phase: { slug: string }) => phase.slug === "08-generative-ai");
  const reinforcementLearning = course.find((phase: { slug: string }) => phase.slug === "09-reinforcement-learning");
  const llmsFromScratch = course.find((phase: { slug: string }) => phase.slug === "10-llms-from-scratch");
  const llmEngineering = course.find((phase: { slug: string }) => phase.slug === "11-llm-engineering");
  assert.ok(setup);
  assert.ok(foundations);
  assert.ok(mlFundamentals);
  assert.ok(deepLearningCore);
  assert.ok(computerVision);
  assert.ok(nlpFoundations);
  assert.ok(speechAndAudio);
  assert.ok(transformers);
  assert.ok(generativeAI);
  assert.ok(reinforcementLearning);
  assert.ok(llmsFromScratch);
  assert.ok(llmEngineering);
  assert.equal(setup.lessons.length, 12);
  assert.equal(setup.lessons.every((item: { available: boolean }) => item.available), true);
  assert.equal(foundations.lessons.length, 22);
  assert.equal(mlFundamentals.lessons.length, 18);
  assert.equal(mlFundamentals.lessons.every((item: { available: boolean }) => item.available), true);
  assert.equal(deepLearningCore.lessons.length, 13);
  assert.equal(deepLearningCore.lessons.every((item: { available: boolean }) => item.available), true);
  assert.equal(computerVision.lessons.length, 28);
  assert.equal(computerVision.lessons.every((item: { available: boolean }) => item.available), true);
  assert.equal(nlpFoundations.lessons.length, 29);
  assert.equal(nlpFoundations.lessons.every((item: { available: boolean }) => item.available), true);
  assert.equal(speechAndAudio.lessons.length, 17);
  assert.equal(speechAndAudio.lessons.every((item: { available: boolean }) => item.available), true);
  assert.equal(transformers.lessons.length, 16);
  assert.equal(transformers.lessons.every((item: { available: boolean }) => item.available), true);
  assert.equal(generativeAI.lessons.length, 15);
  assert.equal(generativeAI.lessons.every((item: { available: boolean }) => item.available), true);
  assert.equal(reinforcementLearning.lessons.length, 12);
  assert.equal(reinforcementLearning.lessons.every((item: { available: boolean }) => item.available), true);
  assert.equal(llmsFromScratch.lessons.length, 24);
  assert.equal(llmsFromScratch.lessons.every((item: { available: boolean }) => item.available), true);
  assert.equal(llmEngineering.lessons.length, 17);
  assert.equal(llmEngineering.lessons.every((item: { available: boolean }) => item.available), true);
  assert.deepEqual(foundations.lessons[0], {
    id: firstLesson.id,
    position: "01 / 22",
    title: "线性代数直觉",
    available: true,
    progress: "not-started"
  });
  assert.equal(foundations.lessons[1].available, true);
  assert.equal(foundations.lessons.every((item: { available: boolean }) => item.available), true);

  const secondLessonId = foundations.lessons[1].id;
  const secondLesson = await fetch(`${baseUrl}/api/lesson?lessonId=${encodeURIComponent(secondLessonId)}`).then((response) => response.json());
  assert.equal(secondLesson.title, "向量、矩阵与运算");
  assert.equal(secondLesson.resources.workspace, true);
  assert.equal(secondLesson.resources.exploration, true);
  const secondContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(secondLessonId)}`).then((response) => response.json());
  assert.match(secondContent.markdown, /向量、矩阵与运算/);
  assert.equal(secondContent.theoryCards.length, 2);
  const secondQuiz = await fetch(`${baseUrl}/api/quiz?lessonId=${encodeURIComponent(secondLessonId)}`).then((response) => response.json());
  assert.equal(secondQuiz.status, "reviewed");
  assert.equal(secondQuiz.questions[0].id, "matrix-multiplication-shape");

  const regressionLessonId = "practice/02-ml-fundamentals/02-linear-regression";
  const regressionContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(regressionLessonId)}`).then((response) => response.json());
  assert.equal(regressionContent.translationStatus, "reviewed");
  assert.deepEqual(regressionContent.theoryCards.map((item: { slug: string }) => item.slug), ["gradient-descent"]);

  const backpropagationLessonId = "practice/03-deep-learning-core/03-backpropagation";
  const backpropagationContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(backpropagationLessonId)}`).then((response) => response.json());
  assert.equal(backpropagationContent.translationStatus, "reviewed");
  assert.deepEqual(backpropagationContent.theoryCards.map((item: { slug: string }) => item.slug), ["the-chain-rule-applied-to-networks"]);

  const visionContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(computerVision.lessons[0].id)}`).then((response) => response.json());
  assert.equal(visionContent.translationStatus, "reviewed");
  assert.deepEqual(visionContent.theoryCards, []);

  const nlpContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(nlpFoundations.lessons[0].id)}`).then((response) => response.json());
  assert.equal(nlpContent.translationStatus, "reviewed");
  assert.deepEqual(nlpContent.theoryCards, []);

  const audioContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(speechAndAudio.lessons[0].id)}`).then((response) => response.json());
  assert.equal(audioContent.translationStatus, "reviewed");
  assert.deepEqual(audioContent.theoryCards.map((item: { slug: string }) => item.slug), ["the-concept"]);

  const proposedAudioContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(speechAndAudio.lessons[13].id)}`).then((response) => response.json());
  assert.deepEqual(proposedAudioContent.theoryCards, []);

  const transformerContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(transformers.lessons[0].id)}`).then((response) => response.json());
  assert.equal(transformerContent.translationStatus, "reviewed");
  assert.deepEqual(transformerContent.theoryCards.map((item: { slug: string }) => item.slug), ["the-concept"]);

  const vaeContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(generativeAI.lessons[1].id)}`).then((response) => response.json());
  assert.equal(vaeContent.translationStatus, "reviewed");
  assert.deepEqual(vaeContent.theoryCards.map((item: { title: string }) => item.title), [
    "高斯潜变量与重参数化采样",
    "VAE 中的 KL 正则与 ELBO 权衡"
  ]);

  const proposedGenerativeContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(generativeAI.lessons[0].id)}`).then((response) => response.json());
  assert.deepEqual(proposedGenerativeContent.theoryCards, []);

  const simToRealContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(reinforcementLearning.lessons[10].id)}`).then((response) => response.json());
  assert.equal(simToRealContent.translationStatus, "reviewed");
  assert.deepEqual(simToRealContent.theoryCards.map((item: { slug: string }) => item.slug), ["the-concept"]);

  const proposedPpoContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(reinforcementLearning.lessons[7].id)}`).then((response) => response.json());
  assert.deepEqual(proposedPpoContent.theoryCards, []);

  const tokenizerContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(llmsFromScratch.lessons[0].id)}`).then((response) => response.json());
  assert.equal(tokenizerContent.translationStatus, "reviewed");
  assert.deepEqual(tokenizerContent.theoryCards.map((item: { slug: string }) => item.slug), ["the-concept"]);

  const proposedTokenizerContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(llmsFromScratch.lessons[1].id)}`).then((response) => response.json());
  assert.deepEqual(proposedTokenizerContent.theoryCards, []);

  const embeddingsContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(llmEngineering.lessons[3].id)}`).then((response) => response.json());
  assert.equal(embeddingsContent.translationStatus, "reviewed");
  assert.deepEqual(embeddingsContent.theoryCards.map((item: { title: string }) => item.title), ["嵌入空间、相似度与向量检索"]);

  const proposedPromptContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(llmEngineering.lessons[0].id)}`).then((response) => response.json());
  assert.deepEqual(proposedPromptContent.theoryCards, []);

  const setupLessonId = setup.lessons[0].id;
  const setupLesson = await fetch(`${baseUrl}/api/lesson?lessonId=${encodeURIComponent(setupLessonId)}`).then((response) => response.json());
  assert.equal(setupLesson.phase, "Phase 0 · 环境与工具");
  assert.equal(setupLesson.title, "开发环境");
  assert.equal(setupLesson.resources.workspace, true);
  const setupContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(setupLessonId)}`).then((response) => response.json());
  assert.match(setupContent.markdown, /开发环境/);
  const setupQuiz = await fetch(`${baseUrl}/api/quiz?lessonId=${encodeURIComponent(setupLessonId)}`).then((response) => response.json());
  assert.equal(setupQuiz.status, "reviewed");
  assert.equal(setupQuiz.questions[0].id, "virtual-environment");

  const allSetupCourses = await Promise.all(setup.lessons.map(async (item: { id: string }) => {
    const encoded = encodeURIComponent(item.id);
    const [itemLesson, itemContent, itemQuiz] = await Promise.all([
      fetch(`${baseUrl}/api/lesson?lessonId=${encoded}`).then((response) => response.json()),
      fetch(`${baseUrl}/api/lesson/content?lessonId=${encoded}`).then((response) => response.json()),
      fetch(`${baseUrl}/api/quiz?lessonId=${encoded}`).then((response) => response.json())
    ]);
    return { itemLesson, itemContent, itemQuiz };
  }));
  assert.equal(allSetupCourses.every(({ itemContent, itemQuiz }) => itemContent.translationStatus === "reviewed" && itemQuiz.status === "reviewed"), true);
  assert.deepEqual(allSetupCourses.map(({ itemLesson }) => itemLesson.resources.workspace), [
    true, false, true, true, true, false, false, false, true, false, false, true
  ]);
  assert.deepEqual(allSetupCourses.map(({ itemContent }) => itemContent.theoryCards.length), [
    0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1
  ]);
  assert.equal(allSetupCourses[1].itemContent.theoryCards[0].title, "Git：让一次实验可以被准确追溯");
});

test("serves the local Mermaid module", async () => {
  const baseUrl = await startTestServer();
  const response = await fetch(`${baseUrl}/vendor/mermaid/mermaid.esm.min.mjs`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /text\/javascript/);
  assert.match(await response.text(), /flowchart/);
});

test("serves local syntax-highlighting modules", async () => {
  const baseUrl = await startTestServer();
  const response = await fetch(`${baseUrl}/vendor/highlight/es/languages/python.min.js`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /text\/javascript/);
  assert.match(await response.text(), /Python/);
});

test("publishes the reviewed CLT theory card for statistics", async () => {
  const baseUrl = await startTestServer();
  const lessonId = "practice/01-math-foundations/15-statistics-for-ml";
  const content = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(lessonId)}`).then((response) => response.json());
  assert.deepEqual(content.theoryCards, [{
    slug: "central-limit-theorem-practical-implications",
    title: "中心极限定理：为何样本均值可用于推断",
    summary: "在解释置信区间、t 检验和 mini-batch 平均的近似正态性前，复习正态分布及中心极限定理的适用条件。",
    sourceUrl: "https://github.com/huangyue12120/maths-cs-ai-compendium/blob/9850ee574a370bc1cde59de98b394e953775b67d/chapter%2004%20-%20statistics/03.%20sampling.md"
  }]);
});

test("serves a reviewed Chinese quiz without answers and persists its latest result", async () => {
  const baseUrl = await startTestServer();
  const quiz = await fetch(`${baseUrl}/api/quiz`).then((response) => response.json());
  assert.equal(quiz.status, "reviewed");
  assert.equal(quiz.questions.length, 5);
  assert.equal("correct" in quiz.questions[0], false);
  assert.equal("explanation" in quiz.questions[0], false);

  const incomplete = await fetch(`${baseUrl}/api/quiz/attempts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ answers: { "linear-independence": 1 } })
  });
  assert.equal(incomplete.status, 400);

  const attempt = await fetch(`${baseUrl}/api/quiz/attempts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ answers: correctFirstQuizAnswers })
  });
  assert.equal(attempt.status, 201);
  assert.deepEqual((await attempt.json()).score, 5);
  const latest = await fetch(`${baseUrl}/api/quiz/attempts`).then((response) => response.json());
  assert.equal(latest.score, 5);
  assert.equal(latest.results[0].correct, true);
  const exported = await fetch(`${baseUrl}/api/export?format=json`).then((response) => response.json());
  assert.equal(exported.quizAttempts[0].score, 5);
  const markdown = await fetch(`${baseUrl}/api/export?format=markdown`).then((response) => response.text());
  assert.match(markdown, /## 自测记录/);
});

test("persists learner state and notes locally", async () => {
  const baseUrl = await startTestServer();
  const stateResponse = await fetch(`${baseUrl}/api/learning-state`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ completed: true, review: true })
  });
  assert.deepEqual(await stateResponse.json(), { completed: true, review: true });

  const noteResponse = await fetch(`${baseUrl}/api/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "向量可以表示对象的特征。" })
  });
  assert.equal(noteResponse.status, 201);
  const notes = await fetch(`${baseUrl}/api/notes`).then((response) => response.json());
  assert.equal(notes.length, 1);
  assert.equal(notes[0].text, "向量可以表示对象的特征。");
  const course = await fetch(`${baseUrl}/api/course`).then((response) => response.json());
  const foundations = course.find((phase: { slug: string }) => phase.slug === "01-math-foundations");
  assert.equal(foundations.lessons[0].progress, "review");
});

test("persists the learner reading position locally", async () => {
  const baseUrl = await startTestServer();
  const initial = await fetch(`${baseUrl}/api/reading-position`).then((response) => response.json());
  assert.deepEqual(initial, { position: 0 });

  const response = await fetch(`${baseUrl}/api/reading-position`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ position: 840 })
  });
  assert.deepEqual(await response.json(), { position: 840 });
  const restored = await fetch(`${baseUrl}/api/reading-position`).then((nextResponse) => nextResponse.json());
  assert.deepEqual(restored, { position: 840 });
});

test("exports learner data as JSON and Markdown", async () => {
  const baseUrl = await startTestServer();
  await fetch(`${baseUrl}/api/learning-state`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ completed: true, review: false })
  });
  await fetch(`${baseUrl}/api/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "向量可以表示对象特征。" })
  });

  const jsonResponse = await fetch(`${baseUrl}/api/export?format=json`);
  assert.match(jsonResponse.headers.get("content-disposition") ?? "", /learning-atlas-data\.json/);
  const json = await jsonResponse.json();
  assert.equal(json.schemaVersion, 3);
  assert.deepEqual(json.learningStates[0], {
    lessonId: firstLesson.id,
    completed: true,
    review: false,
    readingPosition: 0
  });
  assert.equal(json.notes[0].text, "向量可以表示对象特征。");

  const markdownResponse = await fetch(`${baseUrl}/api/export?format=markdown`);
  assert.match(markdownResponse.headers.get("content-disposition") ?? "", /learning-atlas-data\.md/);
  const markdown = await markdownResponse.text();
  assert.match(markdown, /# Learning Atlas 学习数据导出/);
  assert.match(markdown, /向量可以表示对象特征。/);
});

test("restores a JSON backup into a new learner database", async () => {
  const sourceUrl = await startTestServer();
  await fetch(`${sourceUrl}/api/learning-state`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ completed: true, review: false })
  });
  await fetch(`${sourceUrl}/api/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "用于恢复验收的笔记。" })
  });
  await fetch(`${sourceUrl}/api/review-items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "用于恢复验收的复习项。" })
  });
  await fetch(`${sourceUrl}/api/quiz/attempts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ answers: correctFirstQuizAnswers })
  });
  const backup = await fetch(`${sourceUrl}/api/export?format=json`).then((response) => response.json());
  backup.tutorMessages.push({
    id: 1,
    lessonId: firstLesson.id,
    role: "assistant",
    text: "用于恢复验收的助理回复。",
    createdAt: "2026-08-09T00:00:00.000Z"
  });

  const targetUrl = await startTestServer();
  const invalid = await fetch(`${targetUrl}/api/import`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ schemaVersion: 999 })
  });
  assert.equal(invalid.status, 400);

  const restored = await fetch(`${targetUrl}/api/import`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(backup)
  });
  assert.deepEqual((await restored.json()).restored, {
    learningStates: 1,
    notes: 1,
    tutorMessages: 1,
    reviewItems: 1,
    quizAttempts: 1
  });
  const imported = await fetch(`${targetUrl}/api/export?format=json`).then((response) => response.json());
  assert.deepEqual(imported.learningStates, backup.learningStates);
  assert.equal(imported.notes[0].text, "用于恢复验收的笔记。");
  assert.equal(imported.tutorMessages[0].text, "用于恢复验收的助理回复。");
  assert.equal(imported.reviewItems[0].text, "用于恢复验收的复习项。");
  assert.equal(imported.quizAttempts[0].score, 5);
});

test("stores learner-confirmed review items and includes resolved items in exports", async () => {
  const baseUrl = await startTestServer();
  const created = await fetch(`${baseUrl}/api/review-items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "我需要重新判断点积的正负和向量方向之间的关系。" })
  });
  assert.equal(created.status, 201);
  const item = await created.json();
  assert.equal(item.resolved, false);

  const pending = await fetch(`${baseUrl}/api/review-items`).then((response) => response.json());
  assert.equal(pending.length, 1);
  assert.equal(pending[0].text, item.text);

  const resolved = await fetch(`${baseUrl}/api/review-items/${item.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ resolved: true })
  });
  assert.equal(resolved.status, 200);
  assert.deepEqual(await fetch(`${baseUrl}/api/review-items`).then((response) => response.json()), []);

  const exported = await fetch(`${baseUrl}/api/export?format=json`).then((response) => response.json());
  assert.equal(exported.reviewItems.length, 1);
  assert.equal(exported.reviewItems[0].resolved, true);
  const markdown = await fetch(`${baseUrl}/api/export?format=markdown`).then((response) => response.text());
  assert.match(markdown, /## 待复习项/);
  assert.match(markdown, /点积的正负/);
});

test("uses a locally configured compatible tutor and persists its conversation", async () => {
  let modelRequest: { model: string; messages: Array<{ role: string; content: string }> } | undefined;
  let modelListAuthorization = "";
  const modelServer = createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/v1/models") {
      modelListAuthorization = request.headers.authorization ?? "";
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ data: [{ id: "local-tutor" }, { id: "second-model" }] }));
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    modelRequest = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ choices: [{ message: { content: "你能先判断这两个向量的点积是正、零还是负吗？提示：看它们的方向。" } }] }));
  });
  await new Promise<void>((resolve) => modelServer.listen(0, "127.0.0.1", resolve));
  const address = modelServer.address();
  assert.ok(address && typeof address !== "string");
  cleanups.push(() => modelServer.close());

  const baseUrl = await startTestServer();
  const configResponse = await fetch(`${baseUrl}/api/model-config`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ baseUrl: `http://127.0.0.1:${address.port}/v1`, model: "local-tutor", apiKey: "secret" })
  });
  assert.deepEqual(await configResponse.json(), {
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    model: "local-tutor",
    apiKeyConfigured: true
  });

  const discoveredModels = await fetch(`${baseUrl}/api/model-config/models`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ baseUrl: `http://127.0.0.1:${address.port}/v1`, apiKey: "secret" })
  });
  assert.deepEqual(await discoveredModels.json(), { models: ["local-tutor", "second-model"] });
  assert.equal(modelListAuthorization, "Bearer secret");

  const clearKeyResponse = await fetch(`${baseUrl}/api/model-config`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ baseUrl: `http://127.0.0.1:${address.port}/v1`, model: "local-tutor", apiKey: "", clearApiKey: "on" })
  });
  assert.equal((await clearKeyResponse.json()).apiKeyConfigured, false);

  await fetch(`${baseUrl}/api/model-config`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ baseUrl: `http://127.0.0.1:${address.port}/v1`, model: "local-tutor", apiKey: "secret" })
  });

  await fetch(`${baseUrl}/api/review-items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "我需要复习点积的符号。" })
  });

  const replyResponse = await fetch(`${baseUrl}/api/tutor/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: "我不明白点积为什么能表示相似度。",
      context: { sectionTitle: "点积衡量相似度", theoryCardSlug: "the-dot-product-measures-similarity" },
      mode: "explanation"
    })
  });
  assert.equal(replyResponse.status, 201);
  const reply = await replyResponse.json();
  assert.match(reply.assistantMessage.text, /点积/);
  assert.equal(modelRequest?.model, "local-tutor");
  assert.match(modelRequest?.messages[0]?.content ?? "", /课程内证据/);
  assert.match(modelRequest?.messages[0]?.content ?? "", /线性代数直觉/);
  assert.match(modelRequest?.messages[0]?.content ?? "", /当前段落：点积衡量相似度/);
  assert.match(modelRequest?.messages[0]?.content ?? "", /关联理论卡：点积：把方向关系变成一个数/);
  assert.match(modelRequest?.messages[0]?.content ?? "", /我需要复习点积的符号/);
  assert.match(modelRequest?.messages[0]?.content ?? "", /学习者已明确要求完整解释/);

  const socraticResponse = await fetch(`${baseUrl}/api/tutor/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "我还是不确定应该怎样判断。" })
  });
  assert.equal(socraticResponse.status, 201);
  assert.match(modelRequest?.messages[0]?.content ?? "", /先用一个可回答的诊断问题和最小提示/);

  const messages = await fetch(`${baseUrl}/api/tutor/messages`).then((response) => response.json());
  assert.deepEqual(messages.map((message: { role: string }) => message.role), ["user", "assistant", "user", "assistant"]);
  const exported = await fetch(`${baseUrl}/api/export?format=json`).then((response) => response.json());
  assert.deepEqual(exported.tutorMessages.map((message: { role: string }) => message.role), ["user", "assistant", "user", "assistant"]);
  const publicConfig = await fetch(`${baseUrl}/api/model-config`).then((response) => response.json());
  assert.equal("apiKey" in publicConfig, false);

  const deleteResponse = await fetch(`${baseUrl}/api/tutor/messages/${messages[0].id}`, { method: "DELETE" });
  assert.equal(deleteResponse.status, 200);
  assert.equal((await fetch(`${baseUrl}/api/tutor/messages`).then((response) => response.json())).length, 3);
  const clearResponse = await fetch(`${baseUrl}/api/tutor/messages`, { method: "DELETE" });
  assert.equal(clearResponse.status, 200);
  assert.deepEqual(await fetch(`${baseUrl}/api/tutor/messages`).then((response) => response.json()), []);
});

test("adds reading position to an existing learner database", async () => {
  const directory = mkdtempSync(join(tmpdir(), "learning-atlas-migration-"));
  const database = new DatabaseSync(join(directory, "learning-atlas.sqlite"));
  database.exec(`
    CREATE TABLE learning_state (
      lesson_id TEXT PRIMARY KEY,
      completed INTEGER NOT NULL DEFAULT 0,
      review INTEGER NOT NULL DEFAULT 0
    ) STRICT;
  `);
  database.close();

  const baseUrl = await startTestServer(directory);
  const response = await fetch(`${baseUrl}/api/reading-position`);
  assert.deepEqual(await response.json(), { position: 0 });
});

test("rejects empty notes", async () => {
  const baseUrl = await startTestServer();
  const response = await fetch(`${baseUrl}/api/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "   " })
  });
  assert.equal(response.status, 400);
});

test("creates a learner-owned workspace without changing the template", () => {
  const directory = mkdtempSync(join(tmpdir(), "learning-atlas-workspace-"));
  cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
  const workspace = prepareWorkspace(directory);
  assert.match(readFileSync(workspace.sourceFile, "utf8"), /class Vector/);
  assert.match(readFileSync(workspace.explorationFile, "utf8"), /import marimo/);
  assert.match(readFileSync(workspace.exerciseFile, "utf8"), /实现 Vector\.dot/);
  assert.match(readFileSync(workspace.exerciseTestFile, "utf8"), /test_matrix_vector_multiplication/);
  assert.match(readFileSync(workspace.exercisesGuide, "utf8"), /python -m unittest/);
  writeFileSync(workspace.sourceFile, "learner edit", "utf8");
  writeFileSync(workspace.exerciseFile, "learner exercise edit", "utf8");
  prepareWorkspace(directory);
  assert.equal(readFileSync(workspace.sourceFile, "utf8"), "learner edit");
  assert.equal(readFileSync(workspace.exerciseFile, "utf8"), "learner exercise edit");

  const secondWorkspace = prepareWorkspace(directory, "practice/01-math-foundations/02-vectors-matrices-operations");
  assert.match(readFileSync(secondWorkspace.sourceFile, "utf8"), /class Matrix/);
  assert.ok(secondWorkspace.explorationFile);
  assert.match(readFileSync(secondWorkspace.explorationFile, "utf8"), /import marimo/);

  const setupWorkspace = prepareWorkspace(directory, "practice/00-setup-and-tooling/01-dev-environment");
  assert.match(readFileSync(setupWorkspace.sourceFile, "utf8"), /torch/);
});

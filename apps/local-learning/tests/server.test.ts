import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { afterEach, test } from "node:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, type Server } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { createApp, firstLesson, prepareWorkspace, publishableTheoryDocument } from "../src/server.ts";
import { renderTheoryCard, theoryCardActions } from "../public/theory-card.js";

const cleanups: Array<() => void> = [];
const correctFirstQuizAnswers = {
  "dot-product": 1,
  embedding: 3,
  "linear-independence": 1,
  "matrix-rank": 0,
  lora: 0
};

const t1TheoryIds = [
  "theory/chapter-07-computational-linguistics/05-advanced-text-generation",
  "theory/chapter-07-computational-linguistics/04-transformers-and-language-models",
  "theory/chapter-18-ml-systems-design/03-large-scale-infrastructure",
  "theory/chapter-17-ai-inference/05-scaling-and-deployment",
  "theory/chapter-06-machine-learning/04-reinforcement-learning",
  "theory/chapter-07-computational-linguistics/02-text-processing-and-classic-nlp",
  "theory/chapter-17-ai-inference/03-serving-and-batching",
  "theory/chapter-18-ml-systems-design/01-systems-design-fundamentals",
  "theory/chapter-13-computing-and-os/03-operating-systems",
  "theory/chapter-06-machine-learning/03-deep-learning",
  "theory/chapter-10-multimodal-learning/04-cross-modal-generation"
] as const;

const t2TheoryIds = [
  "theory/chapter-03-calculus/05-optimisation",
  "theory/chapter-05-probability/05-information-theory",
  "theory/chapter-06-machine-learning/01-classical-machine-learning",
  "theory/chapter-07-computational-linguistics/03-embeddings-and-sequence-models",
  "theory/chapter-08-computer-vision/04-vision-transformers-and-generation",
  "theory/chapter-14-data-structures-and-algorithms/04-graphs",
  "theory/chapter-15-production-software-engineering/04-testing-and-quality-assurance",
  "theory/chapter-17-ai-inference/02-efficient-architectures",
  "theory/chapter-18-ml-systems-design/04-ml-systems-design",
  "theory/chapter-02-matrices/03-operations",
  "theory/chapter-02-matrices/05-decompositions",
  "theory/chapter-05-probability/03-distributions",
  "theory/chapter-05-probability/04-bayesian"
] as const;

const t3TheoryIds = [
  "theory/chapter-01-vectors/03-norms-and-metrics",
  "theory/chapter-03-calculus/03-multivariate-calculus",
  "theory/chapter-06-machine-learning/02-gradient-machine-learning",
  "theory/chapter-06-machine-learning/05-distributed-deep-learning",
  "theory/chapter-07-computational-linguistics/01-linguistic-foundations",
  "theory/chapter-09-audio-and-speech/01-digital-signal-processing",
  "theory/chapter-09-audio-and-speech/02-automatic-speech-recognition",
  "theory/chapter-09-audio-and-speech/03-text-to-speech-and-voice",
  "theory/chapter-09-audio-and-speech/04-speaker-and-audio-analysis",
  "theory/chapter-10-multimodal-learning/02-vision-language-models",
  "theory/chapter-10-multimodal-learning/03-image-and-video-tokenisation",
  "theory/chapter-13-computing-and-os/04-concurrency-and-parallelism",
  "theory/chapter-17-ai-inference/01-quantisation"
] as const;

const officialTheoryMainUrl = /^https:\/\/github\.com\/HenryNdubuaku\/maths-cs-ai-compendium\/blob\/main\//;

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

test("renders rich theory cards with deduplicated source actions", () => {
  const externalCard = {
    title: "矩阵变换",
    summary: "先理解线性映射如何改变输入。",
    context: "本课正在把输入乘以权重矩阵，需要区分坐标计算与空间变换。",
    intuition: "矩阵不是一张静态数字表，而是一条把向量送到新位置的线性规则。",
    keyPoints: ["矩阵列描述基向量变换后的方向。", "复合变换的顺序由矩阵乘法顺序决定。"],
    application: "检查每一层权重矩阵的输入输出维度，并解释它对表示空间做了什么。",
    checkQuestion: "交换两个矩阵的乘法顺序时，为什么输出通常会改变？",
    readKind: "external",
    readUrl: "https://example.com/theory",
    sourceUrl: "https://example.com/theory",
    latestSourceUrl: "https://example.com/theory"
  };
  assert.deepEqual(theoryCardActions(externalCard).map(({ href, label }) => ({ href, label })), [
    { href: "https://example.com/theory", label: "阅读英文原文" }
  ]);
  const html = renderTheoryCard({
    ...externalCard,
    keyPoints: [...externalCard.keyPoints, "尖括号 <内容> 必须安全转义。"]
  });
  assert.equal((html.match(/href="https:\/\/example\.com\/theory"/g) ?? []).length, 1);
  assert.match(html, /为什么现在需要/);
  assert.match(html, /核心直觉/);
  assert.match(html, /在本课中怎么用/);
  assert.match(html, /先想一想/);
  assert.match(html, /&lt;内容&gt;/);

  const internalActions = theoryCardActions({
    ...externalCard,
    readKind: "internal",
    readUrl: "/theory?theoryId=matrix-transform"
  });
  assert.deepEqual(internalActions.map(({ label }) => label), ["阅读完整中文理论", "查看英文原文"]);
  assert.equal(new Set(internalActions.map(({ href }) => href)).size, 2);

  const legacyHtml = renderTheoryCard({ ...externalCard, context: undefined, intuition: undefined, keyPoints: undefined, application: undefined, checkQuestion: undefined });
  assert.match(legacyHtml, /扩展内容待迁移/);
  assert.doesNotMatch(legacyHtml, /为什么现在需要/);
  assert.equal((legacyHtml.match(/href="https:\/\/example\.com\/theory"/g) ?? []).length, 1);

  const incompleteHtml = renderTheoryCard({ ...externalCard, keyPoints: [externalCard.keyPoints[0]] });
  assert.match(incompleteHtml, /扩展内容待迁移/);

  const malformedHtml = renderTheoryCard({ ...externalCard, keyPoints: "not-an-array" as unknown as string[] });
  assert.match(malformedHtml, /扩展内容待迁移/);
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
  assert.equal(course.length, 16);
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
  const multimodalAI = course.find((phase: { slug: string }) => phase.slug === "12-multimodal-ai");
  const toolsAndProtocols = course.find((phase: { slug: string }) => phase.slug === "13-tools-and-protocols");
  const agentEngineering = course.find((phase: { slug: string }) => phase.slug === "14-agent-engineering");
  const autonomousSystems = course.find((phase: { slug: string }) => phase.slug === "15-autonomous-systems");
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
  assert.ok(multimodalAI);
  assert.ok(toolsAndProtocols);
  assert.ok(agentEngineering);
  assert.ok(autonomousSystems);
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
  assert.equal(multimodalAI.lessons.length, 25);
  assert.equal(multimodalAI.lessons.every((item: { available: boolean }) => item.available), true);
  assert.equal(toolsAndProtocols.lessons.length, 31);
  assert.equal(toolsAndProtocols.lessons.every((item: { available: boolean }) => item.available), true);
  assert.equal(agentEngineering.lessons.length, 54);
  assert.equal(agentEngineering.lessons.every((item: { available: boolean }) => item.available), true);
  assert.equal(autonomousSystems.lessons.length, 22);
  assert.equal(autonomousSystems.lessons.every((item: { available: boolean }) => item.available), true);
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

  const p14LessonId = "practice/14-agent-engineering/43-frame-the-task-before-code";
  const p14Lesson = await fetch(`${baseUrl}/api/lesson?lessonId=${encodeURIComponent(p14LessonId)}`).then((response) => response.json());
  assert.equal(p14Lesson.title, "在智能体编写代码前界定任务");
  assert.equal(p14Lesson.position, "43 / 54");
  assert.equal(p14Lesson.resources.workspace, true);
  const p14Content = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(p14LessonId)}`).then((response) => response.json());
  assert.equal(p14Content.translationStatus, "reviewed");
  assert.deepEqual(p14Content.theoryCards, []);
  const p14Quiz = await fetch(`${baseUrl}/api/quiz?lessonId=${encodeURIComponent(p14LessonId)}`).then((response) => response.json());
  assert.equal(p14Quiz.status, "reviewed");
  assert.equal(p14Quiz.questions.length, 6);

  const p15Lessons = await Promise.all(autonomousSystems.lessons.map(async (item: { id: string }) => {
    const encoded = encodeURIComponent(item.id);
    const [itemLesson, itemContent, itemQuiz] = await Promise.all([
      fetch(`${baseUrl}/api/lesson?lessonId=${encoded}`).then((response) => response.json()),
      fetch(`${baseUrl}/api/lesson/content?lessonId=${encoded}`).then((response) => response.json()),
      fetch(`${baseUrl}/api/quiz?lessonId=${encoded}`).then((response) => response.json())
    ]);
    return { itemLesson, itemContent, itemQuiz };
  }));
  assert.equal(p15Lessons.every(({ itemLesson, itemContent, itemQuiz }) =>
    itemLesson.resources.workspace === true && itemContent.translationStatus === "reviewed" &&
    itemQuiz.status === "unavailable" && itemQuiz.questions.length === 0), true);
  assert.equal(p15Lessons.reduce((total, { itemContent }) => total + itemContent.theoryCards.length, 0), 13);
  assert.equal(p15Lessons.filter(({ itemContent }) => itemContent.theoryCards.length > 0).length, 13);
  assert.equal(p15Lessons.every(({ itemContent }) => itemContent.theoryCards.every((card: Record<string, unknown>) =>
    typeof card.context === "string" && typeof card.intuition === "string" && Array.isArray(card.keyPoints) &&
    typeof card.application === "string" && typeof card.checkQuestion === "string")), true);
  const p15First = p15Lessons[0].itemLesson;
  assert.equal(p15First.phase, "Phase 15 · 自主系统");
  assert.equal(p15First.position, "01 / 22");
  assert.equal(p15First.title, "从聊天机器人到长时程智能体的转变");
  assert.equal(p15Lessons[0].itemContent.theoryCards[0].title, "长轨迹可靠性与概率连乘");

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
  assert.deepEqual(nlpContent.theoryCards.map((item: { slug: string }) => item.slug), ["step-1-a-regex-word-tokenizer"]);

  const audioContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(speechAndAudio.lessons[0].id)}`).then((response) => response.json());
  assert.equal(audioContent.translationStatus, "reviewed");
  assert.deepEqual(audioContent.theoryCards.map((item: { slug: string }) => item.slug), ["the-concept"]);

  const vadContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(speechAndAudio.lessons[13].id)}`).then((response) => response.json());
  assert.deepEqual(vadContent.theoryCards.map((item: { slug: string }) => item.slug), ["the-three-tier-vad-cascade"]);

  const transformerContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(transformers.lessons[0].id)}`).then((response) => response.json());
  assert.equal(transformerContent.translationStatus, "reviewed");
  assert.deepEqual(transformerContent.theoryCards.map((item: { slug: string }) => item.slug), ["the-concept"]);

  const vaeContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(generativeAI.lessons[1].id)}`).then((response) => response.json());
  assert.equal(vaeContent.translationStatus, "reviewed");
  assert.deepEqual(vaeContent.theoryCards.map((item: { title: string }) => item.title), [
    "高斯潜变量与重参数化采样",
    "VAE 中的 KL 正则与 ELBO 权衡"
  ]);
  assert.deepEqual(vaeContent.theoryCards.map((item: { slug: string }) => item.slug), ["the-concept", "the-concept"]);

  const generativeContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(generativeAI.lessons[0].id)}`).then((response) => response.json());
  assert.deepEqual(generativeContent.theoryCards.map((item: { title: string }) => item.title), ["生成模型家族的目标与取舍"]);

  const simToRealContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(reinforcementLearning.lessons[10].id)}`).then((response) => response.json());
  assert.equal(simToRealContent.translationStatus, "reviewed");
  assert.deepEqual(simToRealContent.theoryCards.map((item: { slug: string }) => item.slug), ["the-concept"]);

  const ppoContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(reinforcementLearning.lessons[7].id)}`).then((response) => response.json());
  assert.deepEqual(ppoContent.theoryCards.map((item: { slug: string }) => item.slug), ["the-concept"]);

  const tokenizerContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(llmsFromScratch.lessons[0].id)}`).then((response) => response.json());
  assert.equal(tokenizerContent.translationStatus, "reviewed");
  assert.deepEqual(tokenizerContent.theoryCards.map((item: { slug: string }) => item.slug), ["the-concept"]);

  const productionTokenizerContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(llmsFromScratch.lessons[1].id)}`).then((response) => response.json());
  assert.deepEqual(productionTokenizerContent.theoryCards.map((item: { slug: string }) => item.slug), ["the-full-pipeline"]);

  const embeddingsContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(llmEngineering.lessons[3].id)}`).then((response) => response.json());
  assert.equal(embeddingsContent.translationStatus, "reviewed");
  assert.deepEqual(embeddingsContent.theoryCards.map((item: { title: string }) => item.title), ["嵌入空间、相似度与向量检索"]);

  const promptContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(llmEngineering.lessons[0].id)}`).then((response) => response.json());
  assert.deepEqual(promptContent.theoryCards.map((item: { slug: string }) => item.slug), ["anatomy-of-a-prompt"]);

  const patchTokenContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(multimodalAI.lessons[0].id)}`).then((response) => response.json());
  assert.equal(patchTokenContent.translationStatus, "reviewed");
  assert.deepEqual(patchTokenContent.theoryCards.map((item: { title: string }) => item.title), ["图像分块如何变成视觉词元"]);

  const qformerContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(multimodalAI.lessons[2].id)}`).then((response) => response.json());
  assert.deepEqual(qformerContent.theoryCards.map((item: { title: string }) => item.title), ["Q-Former 作为视觉到语言的桥"]);

  const transfusionContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(multimodalAI.lessons[12].id)}`).then((response) => response.json());
  assert.deepEqual(transfusionContent.theoryCards.map((item: { title: string }) => item.title), ["自回归与扩散目标的统一"]);

  const asyncTaskContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(toolsAndProtocols.lessons[12].id)}`).then((response) => response.json());
  assert.deepEqual(asyncTaskContent.theoryCards.map((item: { title: string }) => item.title), ["异步任务如何把长时工作从请求连接中拆开"]);

  const authenticationContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(toolsAndProtocols.lessons[17].id)}`).then((response) => response.json());
  assert.deepEqual(authenticationContent.theoryCards.map((item: { title: string }) => item.title), ["OAuth 认证是系统安全链路中的一层"]);

  const routingContent = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(toolsAndProtocols.lessons[20].id)}`).then((response) => response.json());
  assert.deepEqual(routingContent.theoryCards.map((item: { title: string }) => item.title).sort(), [
    "LLM 路由策略与负载均衡",
    "LLM 路由与请求调度"
  ].sort());

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

test("publishes all 248 visible theory cards with the complete rich-content contract", async () => {
  const baseUrl = await startTestServer();
  const course = await fetch(`${baseUrl}/api/course`).then((response) => response.json());
  const lessons = course.flatMap((phase: { lessons: Array<{ id: string }> }) => phase.lessons);
  const contents = await Promise.all(lessons.map(({ id }: { id: string }) =>
    fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(id)}`).then((response) => response.json())));
  const cards = contents.flatMap((content: { theoryCards: Array<Record<string, unknown>> }) => content.theoryCards);
  assert.equal(cards.length, 248);
  for (const card of cards) {
    assert.equal(typeof card.context, "string");
    assert.equal(typeof card.intuition, "string");
    assert.ok(Array.isArray(card.keyPoints) && card.keyPoints.length >= 2 && card.keyPoints.length <= 4);
    assert.equal(typeof card.application, "string");
    assert.match(String(card.checkQuestion), /[？?]$/);
    const actions = theoryCardActions(card);
    assert.equal(new Set(actions.map(({ href }) => href)).size, actions.length);
    if (card.readKind === "external") assert.equal(actions.length, 1);
  }
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

test("serves route bootstraps and local GSAP and KaTeX modules", async () => {
  const baseUrl = await startTestServer();
  for (const path of ["/", "/learn", "/theory"]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /\/bootstrap\.js/);
  }
  const gsap = await fetch(`${baseUrl}/vendor/gsap/index.js`);
  assert.equal(gsap.status, 200);
  assert.match(await gsap.text(), /gsap/);
  const katex = await fetch(`${baseUrl}/vendor/katex/katex.mjs`);
  assert.equal(katex.status, 200);
  assert.match(await katex.text(), /renderToString/);
  const katexCss = await fetch(`${baseUrl}/vendor/katex/katex.min.css`);
  assert.equal(katexCss.status, 200);
  assert.match(katexCss.headers.get("content-type") ?? "", /text\/css/);
});

test("publishes the reviewed CLT theory card for statistics", async () => {
  const baseUrl = await startTestServer();
  const lessonId = "practice/01-math-foundations/15-statistics-for-ml";
  const content = await fetch(`${baseUrl}/api/lesson/content?lessonId=${encodeURIComponent(lessonId)}`).then((response) => response.json());
  assert.deepEqual(content.theoryCards, [{
    slug: "central-limit-theorem-practical-implications",
    title: "中心极限定理：为何样本均值可用于推断",
    summary: "在解释置信区间、t 检验和 mini-batch 平均的近似正态性前，复习正态分布及中心极限定理的适用条件。",
    context: "本课要从有限样本均值推断总体并解释 mini-batch 波动；这依赖抽样分布，而不是假设原始数据本身一定正态。",
    intuition: "反复抽取同样大小的独立样本并计算均值，这些均值会比原始观测更集中，样本足够大时趋近钟形分布。",
    keyPoints: [
      "在独立同分布且总体方差有限等条件下，标准化样本均值的分布随样本量增大趋近正态。",
      "样本均值的期望等于总体均值，标准误差按总体标准差除以样本量平方根缩小。",
      "中心极限定理描述均值的抽样分布，不表示有限样本中的原始观测会变成正态。"
    ],
    application: "从一个偏斜总体反复抽取不同大小的样本，绘制样本均值分布，并比较其形状和标准差随样本量的变化。",
    checkQuestion: "样本量从 25 增加到 100 时，其他条件不变，样本均值的标准误差应缩小到原来的多少？",
    sourceUrl: "https://github.com/HenryNdubuaku/maths-cs-ai-compendium/blob/main/chapter%2004%20-%20statistics/03.%20sampling.md",
    theoryId: "theory/chapter-04-statistics/03-sampling",
    readKind: "internal",
    readLanguage: "zh",
    readUrl: "/theory?theoryId=theory%2Fchapter-04-statistics%2F03-sampling",
    latestSourceUrl: "https://github.com/HenryNdubuaku/maths-cs-ai-compendium/blob/main/chapter%2004%20-%20statistics/03.%20sampling.md"
  }]);
});

test("serves the complete curriculum with safe staged phases and a dynamic target", async () => {
  const baseUrl = await startTestServer();
  const curriculum = await fetch(`${baseUrl}/api/curriculum`).then((response) => response.json());
  assert.equal(curriculum.practice.length, 20);
  assert.equal(curriculum.theory.length, 20);
  assert.equal(curriculum.summary.publishedPracticePhaseCount, 16);
  assert.equal(curriculum.summary.reviewedTheoryNoteCount, 38);
  assert.equal(curriculum.target.kind, "start");
  assert.equal(curriculum.target.lessonId, "practice/00-setup-and-tooling/01-dev-environment");
  const publishedAgentPhase = curriculum.practice[14];
  assert.equal(publishedAgentPhase.status, "available");
  assert.equal(publishedAgentPhase.lessonCount, 54);
  assert.equal(publishedAgentPhase.availableLessonCount, 54);
  assert.equal(publishedAgentPhase.firstLessonId, "practice/14-agent-engineering/01-the-agent-loop");
  const publishedAutonomousPhase = curriculum.practice[15];
  assert.equal(publishedAutonomousPhase.status, "available");
  assert.equal(publishedAutonomousPhase.lessonCount, 22);
  assert.equal(publishedAutonomousPhase.availableLessonCount, 22);
  assert.equal(publishedAutonomousPhase.firstLessonId, "practice/15-autonomous-systems/01-long-horizon-agents");
  assert.equal(curriculum.practice.slice(16).every((phase: { status: string; firstLessonId: string | null }) =>
    phase.status === "staged" && phase.firstLessonId === null), true);

  const publishedLesson = await fetch(`${baseUrl}/api/lesson?lessonId=${encodeURIComponent("practice/14-agent-engineering/01-the-agent-loop")}`);
  assert.equal(publishedLesson.status, 200);
  const publishedAutonomousLesson = await fetch(`${baseUrl}/api/lesson?lessonId=${encodeURIComponent("practice/15-autonomous-systems/01-long-horizon-agents")}`);
  assert.equal(publishedAutonomousLesson.status, 200);

  await fetch(`${baseUrl}/api/reading-position?lessonId=${encodeURIComponent(curriculum.target.lessonId)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ position: 240 })
  });
  const continued = await fetch(`${baseUrl}/api/curriculum`).then((response) => response.json());
  assert.equal(continued.target.kind, "continue");
  assert.equal(continued.target.lessonId, curriculum.target.lessonId);
});

test("publishes every T1 theory translation with official main source links", async () => {
  const baseUrl = await startTestServer();
  const curriculum = await fetch(`${baseUrl}/api/curriculum`).then((response) => response.json());
  const notes = curriculum.theory.flatMap((chapter: { notes: Array<{
    theoryId: string;
    sourcePath: string;
    sourceUrl: string;
    latestSourceUrl: string;
    readKind: string;
    readLanguage: string;
    readUrl: string;
  }> }) => chapter.notes);
  const t1Notes = t1TheoryIds.map((theoryId) => {
    const note = notes.find((item) => item.theoryId === theoryId);
    assert.ok(note, `missing T1 theory note ${theoryId}`);
    return note;
  });

  assert.equal(t1Notes.length, 11);
  for (const note of t1Notes) {
    assert.equal(note.readKind, "internal");
    assert.equal(note.readLanguage, "zh");
    assert.match(note.readUrl, /^\/theory\?theoryId=/);
    assert.match(note.sourceUrl, officialTheoryMainUrl);
    assert.match(note.latestSourceUrl, officialTheoryMainUrl);
    assert.equal(note.sourceUrl, note.latestSourceUrl);

    const response = await fetch(`${baseUrl}/api/theory/content?theoryId=${encodeURIComponent(note.theoryId)}`);
    assert.equal(response.status, 200);
    const content = await response.json();
    assert.equal(content.theoryId, note.theoryId);
    assert.equal(content.source.path, note.sourcePath);
    assert.equal(content.source.branch, "main");
    assert.equal(content.source.revision, "main");
    assert.equal(content.source.reviewedRevision, "9850ee574a370bc1cde59de98b394e953775b67d");
    assert.equal(content.sourceUrl, note.sourceUrl);
    assert.equal(content.latestSourceUrl, note.latestSourceUrl);
    assert.match(content.markdown.trimStart(), /^#\s+.+/);
  }
});

test("publishes every T2 theory translation with official main source links", async () => {
  const baseUrl = await startTestServer();
  const curriculum = await fetch(`${baseUrl}/api/curriculum`).then((response) => response.json());
  const notes = curriculum.theory.flatMap((chapter: { notes: Array<{
    theoryId: string;
    sourcePath: string;
    sourceUrl: string;
    latestSourceUrl: string;
    readKind: string;
    readLanguage: string;
    readUrl: string;
  }> }) => chapter.notes);
  const t2Notes = t2TheoryIds.map((theoryId) => {
    const note = notes.find((item) => item.theoryId === theoryId);
    assert.ok(note, `missing T2 theory note ${theoryId}`);
    return note;
  });

  assert.equal(t2Notes.length, 13);
  for (const note of t2Notes) {
    assert.equal(note.readKind, "internal");
    assert.equal(note.readLanguage, "zh");
    assert.match(note.readUrl, /^\/theory\?theoryId=/);
    assert.match(note.sourceUrl, officialTheoryMainUrl);
    assert.match(note.latestSourceUrl, officialTheoryMainUrl);
    assert.equal(note.sourceUrl, note.latestSourceUrl);

    const response = await fetch(`${baseUrl}/api/theory/content?theoryId=${encodeURIComponent(note.theoryId)}`);
    assert.equal(response.status, 200);
    const content = await response.json();
    assert.equal(content.theoryId, note.theoryId);
    assert.equal(content.source.path, note.sourcePath);
    assert.equal(content.source.branch, "main");
    assert.equal(content.source.revision, "main");
    assert.equal(content.source.reviewedRevision, "9850ee574a370bc1cde59de98b394e953775b67d");
    assert.equal(content.sourceUrl, note.sourceUrl);
    assert.equal(content.latestSourceUrl, note.latestSourceUrl);
    assert.match(content.markdown.trimStart(), /^#\s+.+/);
  }
});

test("publishes every T3 theory translation with official main source links", async () => {
  const baseUrl = await startTestServer();
  const curriculum = await fetch(`${baseUrl}/api/curriculum`).then((response) => response.json());
  const notes = curriculum.theory.flatMap((chapter: { notes: Array<{
    theoryId: string;
    sourcePath: string;
    sourceUrl: string;
    latestSourceUrl: string;
    readKind: string;
    readLanguage: string;
    readUrl: string;
  }> }) => chapter.notes);
  const t3Notes = t3TheoryIds.map((theoryId) => {
    const note = notes.find((item) => item.theoryId === theoryId);
    assert.ok(note, `missing T3 theory note ${theoryId}`);
    return note;
  });

  assert.equal(t3Notes.length, 13);
  for (const note of t3Notes) {
    assert.equal(note.readKind, "internal");
    assert.equal(note.readLanguage, "zh");
    assert.match(note.readUrl, /^\/theory\?theoryId=/);
    assert.match(note.sourceUrl, officialTheoryMainUrl);
    assert.match(note.latestSourceUrl, officialTheoryMainUrl);
    assert.equal(note.sourceUrl, note.latestSourceUrl);

    const response = await fetch(`${baseUrl}/api/theory/content?theoryId=${encodeURIComponent(note.theoryId)}`);
    assert.equal(response.status, 200);
    const content = await response.json();
    assert.equal(content.theoryId, note.theoryId);
    assert.equal(content.source.path, note.sourcePath);
    assert.equal(content.source.branch, "main");
    assert.equal(content.source.revision, "main");
    assert.equal(content.source.reviewedRevision, "9850ee574a370bc1cde59de98b394e953775b67d");
    assert.equal(content.sourceUrl, note.sourceUrl);
    assert.equal(content.latestSourceUrl, note.latestSourceUrl);
    assert.match(content.markdown.trimStart(), /^#\s+.+/);
  }
});

test("publishes the reviewed sampling theory reader and rejects unsafe resources", async () => {
  const baseUrl = await startTestServer();
  const theoryId = "theory/chapter-04-statistics/03-sampling";
  const curriculum = await fetch(`${baseUrl}/api/curriculum`).then((response) => response.json());
  const sampling = curriculum.theory[3].notes.find((note: { theoryId: string }) => note.theoryId === theoryId);
  const fallback = curriculum.theory[0].notes[0];
  assert.equal(sampling.readKind, "internal");
  assert.equal(sampling.readLanguage, "zh");
  assert.match(sampling.readUrl, /^\/theory\?theoryId=/);
  assert.match(sampling.sourceUrl, /^https:\/\/github\.com\/HenryNdubuaku\/maths-cs-ai-compendium\/blob\/main\//);
  assert.equal(fallback.readKind, "external");
  assert.match(fallback.readUrl, /^https:\/\/github\.com\/HenryNdubuaku\/maths-cs-ai-compendium\/blob\/main\//);
  assert.match(fallback.sourceUrl, /^https:\/\/github\.com\/HenryNdubuaku\/maths-cs-ai-compendium\/blob\/main\//);
  assert.match(fallback.latestSourceUrl, officialTheoryMainUrl);
  assert.equal(fallback.sourceUrl, fallback.latestSourceUrl);

  const response = await fetch(`${baseUrl}/api/theory/content?theoryId=${encodeURIComponent(theoryId)}`);
  assert.equal(response.status, 200);
  const content = await response.json();
  assert.equal(content.title, "抽样");
  assert.equal(content.source.branch, "main");
  assert.equal(content.source.revision, "main");
  assert.equal(content.source.reviewedRevision, "9850ee574a370bc1cde59de98b394e953775b67d");
  assert.equal(content.sourceUrl, "https://github.com/HenryNdubuaku/maths-cs-ai-compendium/blob/main/chapter%2004%20-%20statistics/03.%20sampling.md");
  assert.equal((content.markdown.match(/!\[/g) ?? []).length, 2);
  assert.equal((content.markdown.match(/^\$\$/gm) ?? []).length, 2);
  assert.equal((content.markdown.match(/```python/g) ?? []).length, 3);
  assert.match(content.latestSourceUrl, /HenryNdubuaku.+\/blob\/main\//);

  const image = await fetch(`${baseUrl}/api/theory/assets/images/sampling_methods.svg`);
  assert.equal(image.status, 200);
  assert.match(image.headers.get("content-type") ?? "", /image\/svg\+xml/);
  const markdownAsset = await fetch(`${baseUrl}/api/theory/assets/chapter%2004%20-%20statistics/03.%20sampling.md`);
  assert.equal(markdownAsset.status, 403);
  const traversal = await fetch(`${baseUrl}/api/theory/assets/%2e%2e/package.json`);
  assert.ok([403, 404].includes(traversal.status));
  const missingImage = await fetch(`${baseUrl}/api/theory/assets/images/not-present.svg`);
  assert.equal(missingImage.status, 404);
  const unknown = await fetch(`${baseUrl}/api/theory/content?theoryId=${encodeURIComponent("theory/chapter-99-missing/01-nope")}`);
  assert.equal(unknown.status, 404);
  const invalid = await fetch(`${baseUrl}/api/theory/content?theoryId=${encodeURIComponent("../../package.json")}`);
  assert.equal(invalid.status, 404);
});

test("publishes only reviewed theory translations with a matching source fingerprint", () => {
  const directory = mkdtempSync(join(tmpdir(), "learning-atlas-theory-"));
  cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
  const sourceFile = join(directory, "source.md");
  const translationFile = join(directory, "zh.md");
  writeFileSync(sourceFile, "# Sampling\n\nSource body.\n", "utf8");
  const fingerprint = createHash("sha256").update(readFileSync(sourceFile)).digest("hex");
  const translation = (status: string, sha256: string, revision = "0123456789012345678901234567890123456789", branch = "main") => `---\nkind: theory-translation\nsource:\n  repository: maths-cs-ai-compendium\n  path: chapter 04 - statistics/03. sampling.md\n  branch: ${branch}\n${revision ? `  revision: ${revision}\n` : ""}  sha256: ${sha256}\nstatus: ${status}\n---\n# 抽样\n`;

  assert.equal(publishableTheoryDocument(sourceFile, join(directory, "missing.md")), null);
  writeFileSync(translationFile, translation("draft", fingerprint), "utf8");
  assert.equal(publishableTheoryDocument(sourceFile, translationFile), null);
  writeFileSync(translationFile, translation("stale", fingerprint), "utf8");
  assert.equal(publishableTheoryDocument(sourceFile, translationFile), null);
  writeFileSync(translationFile, translation("reviewed", "0".repeat(64)), "utf8");
  assert.equal(publishableTheoryDocument(sourceFile, translationFile), null);
  writeFileSync(translationFile, translation("reviewed", fingerprint), "utf8");
  assert.equal(publishableTheoryDocument(sourceFile, translationFile)?.markdown.trim(), "# 抽样");
  writeFileSync(translationFile, translation("reviewed", fingerprint, "", "main"), "utf8");
  assert.equal(publishableTheoryDocument(sourceFile, translationFile)?.revision, "main");
  writeFileSync(translationFile, translation("reviewed", fingerprint, "", "release"), "utf8");
  assert.equal(publishableTheoryDocument(sourceFile, translationFile), null);
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
  assert.match(modelRequest?.messages[0]?.content ?? "", /点积衡量一个向量沿另一个方向投影了多少/);
  assert.match(modelRequest?.messages[0]?.content ?? "", /余弦相似度用两向量范数归一点积/);
  assert.match(modelRequest?.messages[0]?.content ?? "", /先手算两组向量的点积与范数/);
  assert.match(modelRequest?.messages[0]?.content ?? "", /点积与余弦相似度会怎样变化/);
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

  const p14Workspace = prepareWorkspace(directory, "practice/14-agent-engineering/43-frame-the-task-before-code");
  assert.match(readFileSync(p14Workspace.sourceFile, "utf8"), /task|assumption/i);
  assert.ok(p14Workspace.exercisesGuide);
  assert.match(readFileSync(p14Workspace.exercisesGuide, "utf8"), /python3 code\/main\.py/);

  const p15Workspace = prepareWorkspace(directory, "practice/15-autonomous-systems/01-long-horizon-agents");
  assert.match(readFileSync(p15Workspace.sourceFile, "utf8"), /METR-style time-horizon simulator/);
  assert.ok(p15Workspace.exercisesGuide);
  assert.match(readFileSync(p15Workspace.exercisesGuide, "utf8"), /python3 code\/main\.py/);
});

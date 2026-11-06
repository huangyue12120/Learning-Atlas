import { test, expect } from "@playwright/test";
const id = "practice/01-math-foundations/01-linear-algebra-intuition";
const url = path => `${path}?lessonId=${encodeURIComponent(id)}`;

test("prediction is unscored, omissions receive focus, feedback reveals answers and confirmed review is deduplicated", async ({ page, request }) => {
  const draft = await (await request.get(url("/api/reader-draft"))).json();
  await request.put(url("/api/reader-draft"), { data: { ...draft, predictions: {}, answers: {} } });
  const before = await (await request.get(url("/api/quiz/attempts"))).json();
  await page.goto(`/learn?lessonId=${id}`);
  await page.locator("#prediction-form input").first().check();
  await expect.poll(async () => (await (await request.get(url("/api/reader-draft"))).json()).predictions["dot-product"]).toBe(0);
  expect(await (await request.get(url("/api/quiz/attempts"))).json()).toEqual(before);
  await page.locator("#quiz-form button").click();
  await expect(page.locator("#quiz-status")).toContainText("第 1、2、3、4、5 题");
  await expect(page.locator("#quiz-form fieldset").first()).toBeFocused();
  const fields = page.locator("#quiz-form fieldset");
  for (let i = 0; i < await fields.count(); i++) await fields.nth(i).locator("input").first().check();
  await page.locator("#quiz-form button").click();
  await expect(page.locator(".quiz-result")).toContainText("正确选项：");
  await expect(page.locator(".quiz-result")).toContainText("你读前选择：");
  const button = page.locator("[data-review-question-id]").first();
  const question = await button.getAttribute("data-review-question-id");
  await button.click(); await expect(page.locator(`[data-review-question-id='${question}']`)).toBeDisabled();
  await page.locator("[data-quiz-reset]").click();
  await expect(page.locator(".quiz-result")).toHaveCount(0); await expect(page.locator("#quiz-form input:checked")).toHaveCount(0);
});

test("note deletion and backup import use inline cancellation and server undo", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/learn?lessonId=${id}`); await page.locator(".notes-toggle").click();
  await page.fill("#note-text", "撤销验收笔记"); await page.locator("#note-form button").click();
  const note = page.locator(".note").filter({ hasText: "撤销验收笔记" }); await expect(note).toBeVisible();
  await note.locator("[data-delete-note]").click(); await page.locator("[data-confirm-no]").click(); await expect(note).toBeVisible();
  await note.locator("[data-delete-note]").click(); await page.locator("[data-confirm-yes]").click(); await expect(note).toHaveCount(0);
  await page.locator("[data-undo-token]").click(); await expect(note).toBeVisible();
  const backup = { schemaVersion: 3, learningStates: [], notes: [], tutorMessages: [], reviewItems: [], quizAttempts: [] };
  await page.setInputFiles("#import-file", { name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
  await page.locator("#import-form button[type='submit']").click(); await page.locator("[data-confirm-no]").click();
  expect((await (await request.get(url("/api/notes"))).json()).some(note => note.text === "撤销验收笔记")).toBe(true);
  await page.locator("#import-form button[type='submit']").click(); await page.locator("[data-confirm-yes]").click();
  await expect(page.locator("#undo-status")).toContainText("已恢复备份"); await expect(note).toHaveCount(0);
  await page.locator("[data-undo-token]").click(); await expect(note).toBeVisible();
});

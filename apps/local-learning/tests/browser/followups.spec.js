import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
const lesson = "practice/00-setup-and-tooling/01-dev-environment";
const directory = resolve("../../review/followups/screenshots");
async function configure(request) {
  await request.put("/api/model-config", { data: { baseUrl: "http://127.0.0.1:4176/v1", model: "atlas-fixture" } });
}

for (const width of [375, 1440]) test(`streaming ${width}px: visible partial output and cancellation preserve drafts`, async ({ page, request }) => {
  await configure(request); await page.setViewportSize({ width, height: 900 });
  await page.goto(`/learn?lessonId=${lesson}`); await page.locator(".tutor-toggle").click();
  const before = await (await request.get(`/api/tutor/messages?lessonId=${encodeURIComponent(lesson)}`)).json();
  await page.fill("#tutor-text", "流式验收：请给我一个提示"); await page.locator("#tutor-form button[type='submit']").first().click();
  await expect(page.locator(".tutor-streaming")).toContainText("你能指出");
  mkdirSync(directory, { recursive: true }); await page.screenshot({ path: `${directory}/stream-${width}.png` });
  await page.locator("[data-stop-tutor]").click();
  await expect(page.locator("#tutor-status")).toContainText("已停止"); await expect(page.locator("#tutor-text")).toHaveValue("流式验收：请给我一个提示");
  await expect.poll(async () => (await (await request.get(`/api/tutor/messages?lessonId=${encodeURIComponent(lesson)}`)).json()).length).toBe(before.length);
});

test("broken stream shows an error and keeps the learner draft", async ({ page, request }) => {
  await configure(request); await page.goto(`/learn?lessonId=${lesson}`); await page.locator(".tutor-toggle").click();
  await page.fill("#tutor-text", "断流验收"); await page.locator("#tutor-form button[type='submit']").first().click();
  await expect(page.locator("#tutor-status")).toContainText("中断"); await expect(page.locator("#tutor-text")).toHaveValue("断流验收");
});

test("reviewed quiz evidence links to the exact paragraph without losing answers on hash history", async ({ page }) => {
  await page.goto("/learn?lessonId=practice/01-math-foundations/01-linear-algebra-intuition");
  const fields = page.locator("#quiz-form fieldset");
  await expect(fields.first()).toBeVisible();
  for (let index = 0; index < await fields.count(); index++) await fields.nth(index).locator("input").first().check();
  await page.locator("#quiz-form button").click();
  const link = page.locator('[data-evidence-question="dot-product"]');
  await expect(link).toHaveAttribute("href", "#evidence-dot-product"); await link.click();
  await expect(page).toHaveURL(/#evidence-dot-product$/);
  expect(await page.locator("#evidence-dot-product").evaluate(element => element.nextElementSibling.textContent)).toContain("点积能反映");
  await page.goBack(); await expect(page.locator("#quiz-form input:checked")).toHaveCount(5);
});

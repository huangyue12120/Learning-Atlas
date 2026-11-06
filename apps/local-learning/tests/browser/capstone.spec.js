import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { screenshotDirectory } from "./screenshot-directory.js";

const first = "practice/19-capstone-projects/01-terminal-native-coding-agent";
const last = "practice/19-capstone-projects/87-end-to-end-safety-gate";

for (const width of [1440, 375]) test(`P19 home entry, theory cards, quiz drafts and phase navigation at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1200 });
  await page.goto("/");
  const card = page.locator("[data-phase-card]").filter({ hasText: "综合项目" });
  await expect(card).toContainText("85 节课程，85 节已发布");
  await expect(card.locator(".phase-card-top span")).toHaveText("可学习");
  const next = page.locator("[data-phase-next]");
  while (!await next.isDisabled()) await next.click();
  await card.getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(encodeURIComponent(first)));
  await expect(page.locator("#lesson h1")).toHaveCount(1);
  await expect(page.locator("#lesson h1")).toBeVisible();
  await expect(page.locator(".theory-card")).toHaveCount(2);
  const theory = page.locator(".theory-card").first();
  if (!await theory.evaluate(element => element.open)) await theory.locator("summary").click();
  await expect(theory).toContainText("如果工具执行失败");
  await expect(theory.getByRole("link", { name: "阅读完整中文理论" })).toHaveAttribute("href", /\/theory\?theoryId=/);
  const reset = page.locator("[data-quiz-reset]");
  if (await reset.isVisible()) await reset.click();
  await page.locator("#quiz-form input").first().check();
  await page.reload();
  await expect(page.locator("#quiz-form input").first()).toBeChecked();
  await expect(page.locator(".theory-card").first()).toHaveAttribute("open", "");
  const fields = page.locator("#quiz-form fieldset");
  for (let i = 0; i < await fields.count(); i++) await fields.nth(i).locator("input").first().check();
  await page.locator("#quiz-form button").click();
  await expect(page.locator(".quiz-result")).toContainText("正确选项：");
  await expect(page.locator("[data-action='workspace']")).toBeVisible();
  await page.locator(".theory-card").first().scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({ path: join(screenshotDirectory, `p19-${width}-light.png`), animations: "disabled" });
  await page.selectOption("#theme-select", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: join(screenshotDirectory, `p19-${width}-dark.png`), animations: "disabled" });

  await page.goto("/learn?lessonId=practice/18-ethics-safety-alignment/30-dual-use-risk-cyber-bio-chem-nuclear");
  await page.locator(".lesson-navigation a").last().click();
  await expect(page).toHaveURL(new RegExp(encodeURIComponent(first)));
  await page.goto(`/learn?lessonId=${last}`);
  await expect(page.locator("#lesson h1")).toContainText("安全网关");
  await expect(page.locator(".theory-card")).toHaveCount(0);
  await expect(page.locator(".lesson-navigation a")).toHaveCount(1);
});

test("P19 reader withholds stale content and quizzes", async ({ page }) => {
  await page.route("**/api/lesson/content?*", async route => {
    const response = await route.fetch();
    const content = await response.json();
    await route.fulfill({ json: { ...content, translationStatus: "stale", theoryCards: [] } });
  });
  await page.route("**/api/quiz?*", route => route.fulfill({ json: { status: "stale", questions: [] } }));
  await page.goto(`/learn?lessonId=${first}`);
  await expect(page.getByRole("heading", { name: "译文需要同步" })).toBeVisible();
  await expect(page.locator("#lesson-body")).toContainText("阅读器不会显示可能过期的内容");
  await expect(page.locator(".theory-card")).toHaveCount(0);
  await expect(page.locator("#quiz-form")).toHaveCount(0);
});

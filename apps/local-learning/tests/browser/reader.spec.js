import { test, expect } from "@playwright/test";
const math = "practice/01-math-foundations/01-linear-algebra-intuition";
const open = page => page.goto(`/learn?lessonId=${math}`);

test("preserves DOM, drafts, quiz choices and theory expansion across panels, theme, history and refresh", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page); await expect(page.locator("#lesson h1")).toHaveText("线性代数直觉");
  await page.evaluate(() => { window.shellReference = document.querySelector(".shell"); });
  const firstCard = page.locator(".theory-card").first();
  await firstCard.locator("summary").click();
  await page.locator("#quiz-form input").first().check();
  await page.locator(".notes-toggle").click();
  await page.fill("#note-text", "保留我的笔记草稿");
  await page.locator(".tutor-toggle").click();
  await page.fill("#tutor-text", "保留我的助理草稿");
  await page.locator(".review-toggle").click();
  await page.fill("#review-item-text", "保留我的复习草稿");
  await page.locator(".notes-toggle").click();
  await expect(page.locator("#note-text")).toHaveValue("保留我的笔记草稿");
  await page.selectOption("#theme-select", "dark");
  await expect(page.locator("#quiz-form input").first()).toBeChecked();
  await expect(firstCard).toHaveAttribute("open", "");
  expect(await page.evaluate(() => window.shellReference === document.querySelector(".shell"))).toBe(true);
  await page.locator(".notes-close").click();
  await page.locator(".lesson-navigation a").last().click();
  await expect(page.locator("#lesson h1")).not.toHaveText("线性代数直觉");
  await page.goBack(); await expect(page.locator("#lesson h1")).toHaveText("线性代数直觉");
  await page.locator(".notes-toggle").click(); await expect(page.locator("#note-text")).toHaveValue("保留我的笔记草稿");
  await page.reload(); await page.locator(".notes-toggle").click();
  await expect(page.locator("#note-text")).toHaveValue("保留我的笔记草稿");
  await expect(page.locator("#quiz-form input").first()).toBeChecked();
  await expect(page.locator(".theory-card").first()).toHaveAttribute("open", "");
  await page.locator(".notes-close").click();
  await page.goForward(); await expect(page.locator("#lesson h1")).not.toHaveText("线性代数直觉");
});

test("late lesson responses cannot replace a more recent navigation", async ({ page }) => {
  await page.goto("/learn?lessonId=practice/00-setup-and-tooling/01-dev-environment");
  await expect(page.locator("#lesson h1")).toBeVisible();
  const links = page.locator(".phase-group[open] a[data-lesson-id]");
  const target = await links.nth(1).getAttribute("data-lesson-id");
  await page.route("**/api/lesson/content?*02-*", async route => { await new Promise(r => setTimeout(r, 1700)); await route.continue(); });
  await links.nth(0).click(); await links.nth(1).click();
  await expect(page).toHaveURL(new RegExp(encodeURIComponent(target)));
  const title = await page.locator("#lesson h1").textContent();
  await page.waitForTimeout(1900); await expect(page.locator("#lesson h1")).toHaveText(title);
  await page.goBack(); await expect(page.locator("#lesson h1")).toContainText("开发环境");
});

test("mobile navigation and panels trap focus, close with Escape and retain theme access", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); await open(page);
  await expect(page.locator("#theme-select")).toBeVisible();
  await page.locator(".navigator-toggle").click();
  await expect(page.locator("#course-navigator")).toHaveAttribute("aria-modal", "true");
  await page.keyboard.press("Escape"); await expect(page.locator(".navigator-toggle")).toBeFocused();
  await page.locator(".notes-toggle").click();
  await expect(page.locator("#notes-panel")).toHaveAttribute("role", "dialog");
  await page.keyboard.press("Shift+Tab");
  expect(await page.evaluate(() => !!document.activeElement.closest("#notes-panel"))).toBe(true);
  await page.keyboard.press("Escape"); await expect(page.locator(".notes-toggle")).toBeFocused();
  await expect(page.locator("#lesson")).not.toHaveAttribute("inert", "");
});

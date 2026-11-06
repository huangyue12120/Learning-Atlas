import { test, expect } from "@playwright/test";
const lesson = "practice/00-setup-and-tooling/01-dev-environment";

test("model discovery and tutor use the actual local compatible API stub", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/learn?lessonId=${lesson}`); await page.locator(".tutor-toggle").click();
  await page.locator(".tutor-config summary").click();
  await page.fill("#model-base-url", "http://127.0.0.1:4176/v1");
  await page.fill("#model-api-key", "sk-fixture-private"); await page.locator("#discover-models").click();
  await expect(page.locator("#model-name")).toHaveValue("atlas-fixture");
  await page.locator("#model-config-form button[type='submit']").click();
  await expect(page.locator("#tutor-status")).toContainText("连接已保存");
  await page.route("**/api/tutor/messages?*", async route => {
    if (route.request().method() !== "POST") return route.continue();
    const response = await route.fetch(); await new Promise(resolve => setTimeout(resolve, 800)); await route.fulfill({ response });
  });
  await page.fill("#tutor-text", "我该怎样验证 Python 环境？"); await page.locator("#tutor-form button").first().click();
  await page.fill("#tutor-text", "下一条尚未发送的问题");
  await expect(page.locator(".tutor-message.assistant").last()).toContainText("本课哪个证据");
  await expect(page.locator("#tutor-text")).toHaveValue("下一条尚未发送的问题");
  const requests = await (await request.get("http://127.0.0.1:4176/requests")).json();
  expect(requests.at(-1).model).toBe("atlas-fixture"); expect(requests.at(-1).messages[0].content).toContain("课程");
  const backup = await (await request.get("/api/export?format=json")).text(); expect(backup).not.toContain("sk-fixture-private");
});

test("course filter and bracket shortcuts respect editable controls", async ({ page }) => {
  await page.goto(`/learn?lessonId=${lesson}`); await expect(page.locator("#lesson h1")).toBeVisible();
  await page.fill("#course-filter", "终端原生编码智能体"); await expect(page.locator(".phase-group:not([hidden])")).toHaveCount(1);
  await page.fill("#course-filter", ""); await page.locator("#course-filter").press("]");
  await expect(page).toHaveURL(new RegExp(encodeURIComponent(lesson)));
  await page.locator("#lesson h1").click(); await page.keyboard.press("]");
  await expect(page).not.toHaveURL(new RegExp(encodeURIComponent(lesson)));
  await page.keyboard.press("["); await expect(page).toHaveURL(new RegExp(encodeURIComponent(lesson)));
});

test("theory drawer traps and returns focus; source lesson return is retained", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/theory?theoryId=theory/chapter-04-statistics/03-sampling&lessonId=${encodeURIComponent(lesson)}`);
  await expect(page.locator("#practice-return")).toHaveAttribute("href", `/learn?lessonId=${encodeURIComponent(lesson)}`);
  await expect(page.locator(".theory-practice-return")).toBeVisible();
  await page.locator(".theory-nav-toggle").click(); await expect(page.locator(".theory-nav-close")).toBeFocused();
  await expect(page.locator(".theory-nav")).toHaveAttribute("aria-modal", "true");
  await page.keyboard.press("Shift+Tab"); expect(await page.evaluate(() => !!document.activeElement.closest(".theory-nav"))).toBe(true);
  await page.keyboard.press("Escape"); await expect(page.locator(".theory-nav-toggle")).toBeFocused();
  await expect(page.locator(".theory-reading-area")).not.toHaveAttribute("inert", "");
});

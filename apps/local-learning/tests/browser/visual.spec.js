import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
const directory = resolve("../../review/remediation/screenshots");
const surfaces = [
  ["home", "/", ".home-hero"],
  ["reader", "/learn?lessonId=practice/01-math-foundations/01-linear-algebra-intuition", "#lesson h1"],
  ["theory", "/theory?theoryId=theory/chapter-04-statistics/03-sampling", ".theory-article h1"]
];
for (const width of [375, 768, 1024, 1440]) for (const theme of ["light", "dark"]) {
  test(`visual ${width}px ${theme}: three surfaces, theme and horizontal containment`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme });
    await page.addInitScript(value => localStorage.setItem("learning-atlas-theme", value), theme);
    for (const [name, path, selector] of surfaces) {
      await page.goto(path); await expect(page.locator(selector)).toBeVisible();
      await expect(page.locator(".theme-control select")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      expect(await page.locator('a[target="_blank"]:not([aria-label*="在新窗口打开"])').count()).toBe(0);
      const shortControls = await page.locator("button:visible, select:visible").evaluateAll(elements => elements.filter(el => el.getBoundingClientRect().height < 43.5).map(el => el.textContent));
      expect(shortControls).toEqual([]);
      if (name === "home") await expect(page.locator(".home-theory-chapter[open]")).toHaveCount(0);
      if (name === "reader") await expect(page.locator(".diagram-error")).toHaveCount(0);
      mkdirSync(directory, { recursive: true });
      await page.screenshot({ path: `${directory}/${name}-${width}-${theme}.png` });
    }
  });
}


test("diagrams, display math and theory SVGs render in both themes", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const theme of ["light", "dark"]) {
    await page.addInitScript(value => localStorage.setItem("learning-atlas-theme", value), theme);
    await page.goto("/learn?lessonId=practice/00-setup-and-tooling/01-dev-environment");
    await expect(page.locator(".mermaid-diagram svg").first()).toBeVisible();
    await expect(page.locator(".diagram-error")).toHaveCount(0);
    await page.locator(".mermaid-diagram").first().screenshot({ path: `${directory}/mermaid-${theme}.png` });
    await page.goto("/theory?theoryId=theory/chapter-04-statistics/03-sampling");
    const figure = page.locator(".markdown-figure").first();
    await expect(figure.locator("img")).toBeVisible();
    expect(await figure.locator("img").evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    await figure.screenshot({ path: `${directory}/theory-figure-${theme}.png` });
    const formula = page.locator(".math-display").first();
    await expect(formula.locator(".katex")).toBeVisible();
    await formula.screenshot({ path: `${directory}/formula-${theme}.png` });
  }
});

test("reader drawers, bottom sheets and side panels match the prototype regions; practice images load locally", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const theme of ["light", "dark"]) {
    await page.addInitScript(value => localStorage.setItem("learning-atlas-theme", value), theme);
    for (const width of [375, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/learn?lessonId=practice/01-math-foundations/01-linear-algebra-intuition");
      await page.locator(width === 1440 ? ".tutor-toggle" : ".notes-toggle").click();
      await page.screenshot({ path: `${directory}/panel-${width}-${theme}.png` });
      await page.keyboard.press("Escape");
      if (width === 375) {
        await page.locator(".navigator-toggle").click();
        await page.screenshot({ path: `${directory}/panel-navigator-${theme}.png` });
        await page.keyboard.press("Escape");
      }
    }
    await page.goto("/learn?lessonId=practice/11-llm-engineering/17-agent-framework-tradeoffs");
    const image = page.locator(".markdown-figure img").first();
    await expect(image).toHaveAttribute("src", /127.0.0.1:4175\/api\/practice\/assets\//);
    await expect.poll(() => image.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    await image.screenshot({ path: `${directory}/practice-figure-${theme}.png` });
  }
});

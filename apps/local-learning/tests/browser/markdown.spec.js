import { test, expect } from "@playwright/test";

test("renders course Markdown safely with stable anchors, math and exact code", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.locator(".markdown-content")).toBeVisible();
  const result = await page.evaluate(async () => {
    const { createMarkdownRenderer } = await import("/markdown.js");
    const render = createMarkdownRenderer({ renderTheoryCard: card => `<details class="theory-card"><summary>${card.title}</summary></details>` });
    const source = '## 概念 <!-- learning-atlas: stable -->\n\n> 练习提示\n>\n> **练习一**：运行代码。\n\n---\n\n3. 第三步\n   - 嵌套项\n\n    print("缩进代码")\n\n```python\nprint("$5 到 $10")\n```\n\n$5 到 $10，公式 $x^2$。\n\n$$\nx^2 + y^2\n$$\n\n<div onclick="alert(1)">HTML 块<script>alert(1)</script></div>\n\n[不安全](javascript:alert(1))';
    const result = render(source, { cards: [{ slug: "stable", title: "理论" }] });
    const root = document.createElement("div"); root.innerHTML = result.html;
    return { headings: result.headings, quotes: root.querySelectorAll("blockquote").length, start: root.querySelector("ol").start,
      nested: !!root.querySelector("li ul"), hr: !!root.querySelector("hr"), cards: root.querySelectorAll(".theory-card").length,
      unsafe: !!root.querySelector("script, [onclick], a[href^='javascript:']"), text: root.textContent,
      code: [...root.querySelectorAll("pre code")].map(node => node.textContent), math: root.querySelectorAll(".katex").length };
  });
  expect(result.headings[0].id).toBe("stable");
  expect(result.quotes).toBe(1); expect(result.start).toBe(3); expect(result.nested).toBe(true); expect(result.hr).toBe(true);
  expect(result.cards).toBe(1); expect(result.unsafe).toBe(false); expect(result.math).toBe(2);
  expect(result.text).toContain("$5 到 $10"); expect(result.code).toContain('print("$5 到 $10")');
});

test("real lesson cards, formulas and diagrams stay readable in either theme", async ({ page }) => {
  await page.goto("/learn?lessonId=practice/01-math-foundations/01-linear-algebra-intuition");
  await expect(page.locator(".markdown-content .theory-card").first()).toBeVisible();
  await expect(page.locator(".markdown-content .katex").first()).toBeVisible();
  for (const theme of ["dark", "light"]) {
    await page.selectOption("#theme-select", theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    expect(await page.locator(".markdown-content").evaluate(el => getComputedStyle(el).fontFamily)).not.toContain("Atlas");
    await expect(page.locator(".diagram-error")).toHaveCount(0);
  }
});

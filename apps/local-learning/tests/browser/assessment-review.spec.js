import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve('../..');
const phase = '00-setup-and-tooling';
const lessons = readdirSync(`${root}/content/assessment-links/practice/${phase}`);

for (const slug of lessons) test(`reviewed Phase 0 evidence resolves in the rendered lesson: ${slug}`, async ({ page }) => {
  const lessonId = `practice/${phase}/${slug}`;
  const quiz = JSON.parse(readFileSync(`${root}/content/assessments/practice/${phase}/${slug}/zh.json`, 'utf8'));
  const mapping = JSON.parse(readFileSync(`${root}/content/assessment-links/practice/${phase}/${slug}/links.json`, 'utf8'));
  expect(mapping.links.map(link => link.id)).toEqual(quiz.questions.map(question => question.id));
  await page.goto(`/learn?lessonId=${encodeURIComponent(lessonId)}`);
  const fields = page.locator('#quiz-form fieldset');
  await fields.first().waitFor();
  await expect(fields).toHaveCount(quiz.questions.length);
  for (let index = 0; index < quiz.questions.length; index++) await fields.nth(index).locator('input').nth(quiz.questions[index].correct).check();
  await page.locator('#quiz-form button').click();
  await expect(page.locator('.quiz-result')).toContainText(`${quiz.questions.length} / ${quiz.questions.length}`);
  for (const link of mapping.links) {
    await expect(page.locator(`[data-evidence-question="${link.id}"]`)).toHaveAttribute('href', `#evidence-${link.id}`);
    const anchor = page.locator(`[id="evidence-${link.id}"]`);
    await expect(anchor).toHaveCount(1);
    const content = await anchor.evaluate(element => {
      if (['LI', 'TD', 'TH'].includes(element.parentElement.tagName)) return element.parentElement.textContent;
      let next = element.nextElementSibling;
      while (next?.classList.contains('evidence-anchor')) next = next.nextElementSibling;
      return next?.textContent ?? '';
    });
    const normalize = text => text.replace(/[`*_\s]/g, '');
    expect(normalize(content), `${slug}: ${link.id}`).toContain(normalize(link.quote));
  }
  if (['01-dev-environment', '07-docker-for-ai'].includes(slug)) {
    await page.setViewportSize({ width: slug.startsWith('01') ? 375 : 1440, height: 900 });
    const id = slug.startsWith('01') ? 'virtual-environment' : 'volumes';
    await page.locator(`[data-evidence-question="${id}"]`).click();
    await expect(page).toHaveURL(new RegExp(`#evidence-${id}$`));
    await expect.poll(() => page.locator(`[id="evidence-${id}"]`).evaluate(element => {
      const top = element.getBoundingClientRect().top;
      return top >= 0 && top < innerHeight;
    })).toBe(true);
    const directory = `${root}/review/assessment-review/screenshots`; mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: `${directory}/${slug}.png` });
  }
});

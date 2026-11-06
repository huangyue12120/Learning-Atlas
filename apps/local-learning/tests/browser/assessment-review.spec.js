import { screenshotDirectory } from "./screenshot-directory.js";
import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve('../..');
const phases = ['00-setup-and-tooling', '01-math-foundations', '19-capstone-projects'];
const lessons = phases.flatMap(phase => readdirSync(`${root}/content/assessment-links/practice/${phase}`).map(slug => ({ phase, slug })));

for (const { phase, slug } of lessons) test(`reviewed ${phase} evidence resolves in the rendered lesson: ${slug}`, async ({ page }) => {
  if (phase === '19-capstone-projects') {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: Number(slug.slice(0, 2)) % 2 ? 1440 : 375, height: 900 });
  }
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
    if (phase === '19-capstone-projects') {
      await page.locator(`[data-evidence-question="${link.id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`#evidence-${link.id}$`));
      await expect.poll(() => anchor.evaluate(element => {
        const top = element.getBoundingClientRect().top;
        return top >= 0 && top < innerHeight;
      })).toBe(true);
    }
  }
  if (phase === '19-capstone-projects' && ['58-vision-encoder-patches', '65-hybrid-retrieval-bm25-dense', '87-end-to-end-safety-gate'].includes(slug)) {
    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({ path: `${screenshotDirectory}/${slug}.png` });
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
    const directory = screenshotDirectory; mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: `${directory}/${slug}.png` });
  }
});

test('reviewed 19-capstone-projects length-only strategy stays below 40% with complete feedback evidence', async ({ request }) => {
  const course = await (await request.get('/api/course')).json();
  const phase = course.find(item => item.slug === '19-capstone-projects');
  let total = 0, score = 0, references = 0;
  for (const lesson of phase.lessons) {
    const query = `?lessonId=${encodeURIComponent(lesson.id)}`;
    const quiz = await (await request.get(`/api/quiz${query}`)).json();
    const answers = Object.fromEntries(quiz.questions.map(question => {
      expect(question.correct).toBeUndefined();
      const sizes = question.options.map(option => option.replace(/[`*_\s]/g, '').length);
      return [question.id, sizes.indexOf(Math.max(...sizes))];
    }));
    const response = await request.post(`/api/quiz/attempts${query}`, { data: { answers } });
    expect(response.ok()).toBe(true);
    const result = await response.json();
    total += result.total; score += result.score;
    references += result.results.filter(item => item.reference).length;
  }
  expect(total).toBe(530);
  expect(score / total).toBeLessThan(0.4);
  expect(references).toBe(total);
  console.log(`P19 length-only score: ${score}/${total}; paragraph references: ${references}`);
});

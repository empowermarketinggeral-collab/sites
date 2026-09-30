// Gera public/guia/da-estetica-a-posicao.pdf a partir de guide/guia.html.
//   npm run guide            (usa o Chromium do Playwright)
//   CHROMIUM=/caminho npm run guide
// Falha se algum texto não couber na sua página A4.
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, '../public/guia/da-estetica-a-posicao.pdf');
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(dir, 'guia.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const overflow = await page.$$eval('.page', (pages) =>
  pages.flatMap((p, i) => {
    const limit = p.getBoundingClientRect().bottom - 20 * 3.78; // acima da linha do rodapé (20 mm)
    const worst = [...p.querySelectorAll('p, li, h2, h3, .write, table, ul, ol, div.box')]
      .filter((el) => !el.closest('.folio'))
      .reduce((m, el) => Math.max(m, el.getBoundingClientRect().bottom), 0);
    return worst > limit ? [`página ${i + 1}: passa ${Math.round((worst - limit) / 3.78)} mm`] : [];
  }),
);
if (overflow.length) {
  console.error('Texto fora da página:\n' + overflow.join('\n'));
  process.exitCode = 1;
}
await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
console.log(`${await page.$$eval('.page', (p) => p.length)} páginas → ${path.relative(process.cwd(), out)}`);
await browser.close();

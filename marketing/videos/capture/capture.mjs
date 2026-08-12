#!/usr/bin/env node
/**
 * Record scripted walkthroughs of the public portal as 1080x1920 clips.
 *
 * The factory's hardest constraint is raw material: without real footage every
 * piece is a typographic slide. This harness produces the footage on demand and
 * writes a manifest so the planner can pick a clip by what it proves instead of
 * by filename.
 *
 * Only public pages are allowed. Anything behind a session — the admin, the
 * owner dashboard, the account area — is refused, because a marketing clip must
 * never carry someone else's data.
 */

import {execFile} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

const run = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const factory = resolve(here, '..');
const repo = resolve(factory, '../..');
const output = join(factory, 'assets/screens');

const PRIVATE_PATHS = [
  '/admin', '/mis-propiedades', '/my-properties', '/cuenta', '/account',
  '/iniciar-sesion', '/registro', '/add-property', '/verificar-correo',
  '/recuperar-contrasena', '/restablecer-contrasena',
];

// Playwright lives with the end-to-end suite; reusing it avoids a second 300 MB
// browser download inside the factory.
const require = createRequire(join(repo, 'tests/package.json'));
let chromium;
try {
  ({chromium} = require('@playwright/test'));
} catch {
  console.error('Playwright not found. Run: cd tests && npm install && npx playwright install chromium');
  process.exit(1);
}

const CURSOR = `
  const dot = document.createElement('div');
  dot.style.cssText = 'position:fixed;z-index:2147483647;width:30px;height:30px;margin:-15px 0 0 -15px;' +
    'border-radius:50%;background:rgba(255,255,255,.92);box-shadow:0 0 0 8px rgba(34,197,94,.35),0 6px 20px rgba(0,0,0,.45);' +
    'pointer-events:none;transition:transform .08s ease-out;left:-100px;top:-100px';
  document.documentElement.appendChild(dot);
  document.addEventListener('mousemove', (event) => {
    dot.style.left = event.clientX + 'px';
    dot.style.top = event.clientY + 'px';
  }, true);
  document.addEventListener('mousedown', () => { dot.style.transform = 'scale(.7)'; }, true);
  document.addEventListener('mouseup', () => { dot.style.transform = 'scale(1)'; }, true);
`;

const guard = (path) => {
  const lowered = path.toLowerCase();
  if (PRIVATE_PATHS.some((blocked) => lowered.startsWith(blocked))) {
    throw new Error(`Refusing to capture a private route: ${path}`);
  }
};

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

async function play(page, step, baseUrl) {
  switch (step.action) {
    case 'goto':
      guard(step.path);
      await page.goto(new URL(step.path, baseUrl).toString(), {waitUntil: 'domcontentloaded', timeout: 60_000});
      break;
    case 'settle':
      await wait(step.ms ?? 1000);
      break;
    case 'move':
      await page.mouse.move(step.x, step.y, {steps: 20});
      break;
    case 'drag':
      await page.mouse.move(step.from[0], step.from[1], {steps: 12});
      await page.mouse.down();
      await page.mouse.move(step.to[0], step.to[1], {steps: step.steps ?? 30});
      await page.mouse.up();
      break;
    case 'wheel':
      await page.mouse.move(step.x, step.y, {steps: 10});
      await page.mouse.wheel(0, step.deltaY ?? -300);
      break;
    case 'scroll':
      await page.evaluate(
        ([to, ms]) => new Promise((done) => {
          const start = window.scrollY;
          const startedAt = performance.now();
          const tick = () => {
            const progress = Math.min(1, (performance.now() - startedAt) / ms);
            const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            window.scrollTo(0, start + (to - start) * eased);
            if (progress < 1) requestAnimationFrame(tick);
            else done();
          };
          tick();
        }),
        [step.to, step.ms ?? 1500],
      );
      break;
    case 'dismiss': {
      // Consent banners and permission prompts are part of the real product but
      // they are not what the clip is meant to show.
      for (const label of step.labels ?? []) {
        const button = page.getByRole('button', {name: label}).first();
        if (await button.isVisible().catch(() => false)) {
          await button.click({timeout: 5_000}).catch(() => {});
          await wait(400);
        }
      }
      break;
    }
    case 'clickFirst': {
      const target = page.locator(step.selector).first();
      await target.waitFor({state: 'visible', timeout: 20_000});
      const box = await target.boundingBox();
      if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {steps: 24});
      await wait(320);
      await target.click({timeout: 15_000});
      break;
    }
    default:
      throw new Error(`Unknown step: ${step.action}`);
  }
}

async function capture(flow, baseUrl, browser) {
  const temporary = join(output, `.raw-${flow.name}`);
  rmSync(temporary, {recursive: true, force: true});
  mkdirSync(temporary, {recursive: true});
  const context = await browser.newContext({
    // A 1080 px wide viewport is a desktop breakpoint: the portal would render
    // its desktop layout and the clip would look nothing like a phone. Record a
    // real phone viewport at triple density instead, which lands exactly on
    // 1080 x 1920. Step coordinates are therefore in 360 x 640 space.
    viewport: {width: 360, height: 640},
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'es-EC',
    timezoneId: 'America/Guayaquil',
    recordVideo: {dir: temporary, size: {width: 1080, height: 1920}},
  });
  await context.addInitScript(CURSOR);
  const page = await context.newPage();
  try {
    for (const step of flow.steps) {
      await play(page, step, baseUrl);
    }
  } finally {
    await page.close();
    await context.close();
  }
  const raw = readFileSync;
  const {readdirSync} = await import('node:fs');
  const recorded = readdirSync(temporary).filter((name) => name.endsWith('.webm'));
  if (!recorded.length) throw new Error(`No recording produced for ${flow.name}`);
  const source = join(temporary, recorded[0]);
  const target = join(output, `${flow.name}.mp4`);
  await run('ffmpeg', [
    '-y', '-i', source,
    '-t', String(flow.seconds ?? 8),
    '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30',
    '-an', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p',
    target,
  ]);
  rmSync(temporary, {recursive: true, force: true});
  void raw;
  return target;
}

async function main() {
  const config = JSON.parse(readFileSync(join(here, 'flows.json'), 'utf8'));
  const baseUrl = process.env.CAPTURE_BASE_URL ?? config.baseUrl;
  const only = process.argv.slice(2).filter((value) => !value.startsWith('-'));
  const flows = only.length ? config.flows.filter((flow) => only.includes(flow.name)) : config.flows;
  if (!flows.length) {
    console.error(`No matching flow. Available: ${config.flows.map((flow) => flow.name).join(', ')}`);
    process.exit(1);
  }
  mkdirSync(output, {recursive: true});
  const browser = await chromium.launch({args: ['--autoplay-policy=no-user-gesture-required']});
  const manifestPath = join(output, 'manifest.json');
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, 'utf8'))
    : {version: 1, base_url: baseUrl, clips: []};
  const clips = new Map(manifest.clips.map((clip) => [clip.file, clip]));
  for (const flow of flows) {
    process.stdout.write(`${flow.name}… `);
    try {
      const file = await capture(flow, baseUrl, browser);
      clips.set(`${flow.name}.mp4`, {
        file: `${flow.name}.mp4`,
        description: flow.description,
        proves: flow.proves,
        seconds: flow.seconds ?? 8,
        requires_authorization: Boolean(flow.requiresAuthorization),
        captured_at: new Date().toISOString(),
        source: baseUrl,
      });
      console.log(`ok → ${file}`);
    } catch (error) {
      console.log(`falló: ${error.message}`);
    }
  }
  await browser.close();
  manifest.base_url = baseUrl;
  manifest.clips = [...clips.values()].sort((a, b) => a.file.localeCompare(b.file));
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`\nManifiesto: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

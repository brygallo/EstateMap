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

async function play(page, step, baseUrl, clock) {
  switch (step.action) {
    case 'mark':
      // Recording starts when the browser context is created, so the first
      // seconds of every take are a blank page. This is where the usable clip
      // begins; everything before it is trimmed away.
      clock.startsAt = (Date.now() - clock.openedAt) / 1000;
      break;
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
    case 'drag': {
      // Playwright fires every step of a gesture as fast as it can, so a drag
      // with thirty steps is over in a few milliseconds: the recording shows a
      // jump and then a frozen screen. Pacing the steps against the clock is
      // what makes the motion look like a hand moving a map.
      const duration = step.ms ?? 2000;
      const steps = Math.max(2, Math.round((duration / 1000) * 30));
      await page.mouse.move(step.from[0], step.from[1], {steps: 10});
      await wait(160);
      await page.mouse.down();
      for (let index = 1; index <= steps; index += 1) {
        const progress = index / steps;
        const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        await page.mouse.move(
          step.from[0] + (step.to[0] - step.from[0]) * eased,
          step.from[1] + (step.to[1] - step.from[1]) * eased,
        );
        await wait(duration / steps);
      }
      await page.mouse.up();
      break;
    }
    case 'wheel': {
      const duration = step.ms ?? 1600;
      const ticks = Math.max(2, Math.round((duration / 1000) * 20));
      await page.mouse.move(step.x, step.y, {steps: 10});
      for (let index = 0; index < ticks; index += 1) {
        await page.mouse.wheel(0, (step.deltaY ?? -300) / ticks);
        await wait(duration / ticks);
      }
      break;
    }
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
    case 'click': {
      // The map is a canvas, so a cluster can only be reached by coordinate.
      await page.mouse.move(step.x, step.y, {steps: 24});
      await wait(step.before ?? 420);
      await page.mouse.down();
      await wait(90);
      await page.mouse.up();
      break;
    }
    case 'shot': {
      // A still is crisp where a recording is not: no compression, no dropped
      // repaints, and it can be pushed slowly by the renderer instead.
      await page.screenshot({path: join(output, `${step.name}.png`), animations: 'disabled'});
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
    // its desktop layout and the clip would look nothing like a phone. 540 px
    // stays under every mobile breakpoint and is exactly half of the master, so
    // the clip only has to be doubled afterwards.
    //
    // The recorder captures at CSS viewport size and only ever scales *down* to
    // the requested size, padding the rest of the canvas. Asking for 1080 x 1920
    // here would put the page in a corner of a grey frame, so the video is
    // recorded at viewport size and upscaled with ffmpeg instead.
    viewport: {width: 540, height: 960},
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'es-EC',
    timezoneId: 'America/Guayaquil',
    recordVideo: {dir: temporary, size: {width: 540, height: 960}},
  });
  await context.addInitScript(CURSOR);
  const clock = {openedAt: Date.now(), startsAt: null};
  const page = await context.newPage();
  try {
    for (const step of flow.steps) {
      await play(page, step, baseUrl, clock);
    }
  } finally {
    await page.close();
    await context.close();
  }
  const raw = readFileSync;
  const {readdirSync} = await import('node:fs');
  const {statSync} = await import('node:fs');
  const recorded = readdirSync(temporary)
    .filter((name) => name.endsWith('.webm'))
    .map((name) => join(temporary, name))
    .sort((a, b) => statSync(b).size - statSync(a).size);
  if (!recorded.length) throw new Error(`No recording produced for ${flow.name}`);
  const source = recorded[0];
  const target = join(output, `${flow.name}.mp4`);
  if (clock.startsAt === null) {
    throw new Error(`Flow ${flow.name} has no "mark" step saying where the usable clip starts`);
  }
  await run('ffmpeg', [
    '-y', '-i', source,
    '-ss', clock.startsAt.toFixed(2), '-t', String(flow.seconds ?? 8),
    '-vf', 'scale=1080:1920:flags=lanczos:force_original_aspect_ratio=increase,crop=1080:1920,fps=30',
    '-an', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p',
    target,
  ]);
  // A clip that came out empty must fail loudly: a silent zero-byte file only
  // shows up much later, as a broken render.
  const {stdout} = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', target,
  ]);
  const seconds = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(seconds) || seconds < 1) {
    throw new Error(`Clip is empty (${stdout.trim() || 'no duration'}); check the mark position`);
  }
  if (!process.env.CAPTURE_KEEP_RAW) rmSync(temporary, {recursive: true, force: true});
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
  // The map is a WebGL canvas. Headless Chrome falls back to software
  // rasterisation and repaints it at roughly seven frames a second, which reads
  // as stuttering no matter what frame rate the recorder writes. A headed window
  // uses the real GPU, so that is the default; CAPTURE_HEADLESS=1 forces the old
  // behaviour for an unattended machine.
  const browser = await chromium.launch({
    headless: Boolean(process.env.CAPTURE_HEADLESS),
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--ignore-gpu-blocklist',
      '--enable-gpu-rasterization',
      '--enable-zero-copy',
      '--disable-frame-rate-limit',
    ],
  });
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

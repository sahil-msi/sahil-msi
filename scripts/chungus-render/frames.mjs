// Renders the rabbit's poses to transparent WebP frames for the stage.
// Needs Playwright: `npm i --no-save playwright && npx playwright install chromium`.
//
// Usage: node scripts/chungus-render/frames.mjs [outDir=assets/chungus]

import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.argv[2] ?? fileURLToPath(new URL('../../assets/chungus/', import.meta.url));

const overshoot = (t) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;

/** [phase, pose] in the order the stage plays them. */
const POSES = [
	...Array.from({ length: 8 }, (_, i) => ['walk', { step: (i / 8) * Math.PI * 2 }]),
	...[0.3, 0.6, 0.85, 1].map((f) => ['turn', { facing: f }]),
	...[0.2, 0.4, 0.6, 0.8, 1].map((t) => ['raise', { facing: 1, lift: overshoot(t), to: 'ready', t: Math.min(1, t * 1.25) }]),
	['charge', { facing: 1, lift: 1, from: 'ready', to: 'press', t: 0.5, glow: 0.55 }],
	['charge', { facing: 1, lift: 1, from: 'ready', to: 'press', t: 1, glow: 1.1 }],
	['snap', { facing: 1, lift: 1, from: 'press', to: 'snapped', t: 0.55, glow: 1.5, flick: 0.1 }],
	['snap', { facing: 1, lift: 1, from: 'press', to: 'snapped', t: 1, glow: 1.25, flick: 0.16 }],
	['after', { facing: 1, lift: 1, from: 'snapped', to: 'snapped', glow: 0.35 }],
];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const server = createServer(async (req, res) => {
	try {
		const path = join(here, new URL(req.url, 'http://x').pathname.replace(/^\/+/, '') || 'index.html');
		if (!path.startsWith(here)) throw new Error('outside');
		res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
		res.end(await readFile(path));
	} catch {
		res.writeHead(404).end();
	}
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 350, height: 400 } });
page.on('pageerror', (e) => console.error(e));
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
await page.waitForFunction(() => window.ready, null, { timeout: 60_000 });

await mkdir(outDir, { recursive: true });
const frames = [];
for (const [i, [phase, spec]] of POSES.entries()) {
	const url = await page.evaluate((s) => window.pose(s), spec);
	const name = `${String(i).padStart(2, '0')}-${phase}.webp`;
	await writeFile(join(outDir, name), Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
	frames.push({ name, phase });
}
await writeFile(join(outDir, 'frames.json'), `${JSON.stringify(frames, null, '\t')}\n`);

await browser.close();
server.close();
console.log(`Rendered ${frames.length} frames to ${outDir}`);

// Shared pieces for every SVG the profile renders.

import { PROFILE } from './profile.mjs';

export const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif`;

/** Every image is this wide, so the README stacks them into one column. */
export const WIDTH = 860;

/** GitHub's own light and dark palettes, plus the colour of the snap's flash. */
export const THEMES = {
	light: {
		bg: '#ffffff',
		card: '#f6f8fa',
		border: '#d0d7de',
		text: '#1f2328',
		muted: '#59636e',
		grid: '#eaeef2',
		accent: '#0969da',
		line: '#1a7f37',
		fill: '#2da44e',
		flash: '#fff6d6',
		flashPeak: 0.75,
	},
	dark: {
		bg: '#0d1117',
		card: '#161b22',
		border: '#30363d',
		text: '#e6edf3',
		muted: '#8b949e',
		grid: '#21262d',
		accent: '#4493f8',
		line: '#3fb950',
		fill: '#3fb950',
		flash: '#ffe6a3',
		flashPeak: 0.32,
	},
};

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const fmt = (n, digits = 0) =>
	Number(n).toLocaleString(PROFILE.locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Seeded PRNG (mulberry32), so the same seed always scatters the dust the same way. */
export function random(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Fisher-Yates on a copy. */
export function shuffle(items, rand) {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/**
 * Greedy word wrap using an average glyph width. SVG has no text layout, and
 * the system sans GitHub renders with averages about 0.53em per character.
 */
export function wrap(text, size, width) {
	const perLine = Math.max(8, Math.floor(width / (size * 0.53)));
	const lines = [];
	let line = '';
	for (const word of text.split(/\s+/)) {
		const next = line ? `${line} ${word}` : word;
		if (next.length > perLine && line) {
			lines.push(line);
			line = word;
		} else line = next;
	}
	if (line) lines.push(line);
	return lines;
}

/** A standalone SVG document. */
export const svg = ({ width = WIDTH, height, title, style = '', body }) =>
	`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}">
<title>${esc(title)}</title>${style ? `\n<style>${style}</style>` : ''}
${body}
</svg>
`;

// The README's rows of cards. Each row is a single image inside a single
// link, because GitHub only makes a README image clickable as a whole. When
// the rabbit snaps, the row's snapped cards blow away as dust and the cards
// that survive slide over and widen to fill the row, re-wrapped to fit.

import { WIDTH, esc, random, shuffle, svg, wrap } from './lib.mjs';
import { ROWS, TOOLS } from './profile.mjs';

const GAP = 14;
const PAD = 18;

/* ---- Cards ----------------------------------------------------------- */

const frame = (t, w, h) =>
	`<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="10" fill="${t.card}" stroke="${t.border}"/>`;

const heading = (t, name, tag) =>
	`<text x="${PAD}" y="34" font-size="17" font-weight="700" fill="${t.accent}">${esc(name)}</text>
<text x="${PAD}" y="54" font-size="11.5" fill="${t.muted}">${esc(tag)}</text>`;

/** A name, a small tag line under it and a paragraph. */
function textCard({ id, name, tag, text }) {
	const lines = (w) => wrap(text, 13, w - PAD * 2);
	return {
		id,
		label: `${name}: ${text}`,
		height: (w) => 80 + lines(w).length * 19 + 4,
		draw: (t, w, h) =>
			`${frame(t, w, h)}
${heading(t, name, tag)}
${lines(w)
	.map((l, i) => `<text x="${PAD}" y="${80 + i * 19}" font-size="13" fill="${t.text}">${esc(l)}</text>`)
	.join('\n')}`,
	};
}

/** Lay the tool names out as chips, wrapping onto new lines as needed. */
function chips(w) {
	const out = [];
	let x = PAD;
	let y = 70;
	for (const tool of TOOLS) {
		const cw = Math.round(tool.length * 7.1 + 22);
		if (x + cw > w - PAD) {
			x = PAD;
			y += 34;
		}
		out.push({ tool, x, y, cw });
		x += cw + 8;
	}
	return out;
}

function toolsCard({ id, name, tag }) {
	return {
		id,
		label: `${name}: ${TOOLS.join(', ')}`,
		height: (w) => chips(w).at(-1).y + 26 + PAD,
		draw: (t, w, h) =>
			`${frame(t, w, h)}
${heading(t, name, tag)}
${chips(w)
	.map(
		(c) =>
			`<rect x="${c.x}" y="${c.y}" width="${c.cw}" height="26" rx="13" fill="${t.bg}" stroke="${t.border}"/><text x="${c.x + c.cw / 2}" y="${c.y + 17}" text-anchor="middle" font-size="12" fill="${t.text}">${esc(c.tool)}</text>`,
	)
	.join('\n')}`,
	};
}

const build = (card) => (card.kind === 'tools' ? toolsCard(card) : textCard(card));

/* ---- Who gets snapped ------------------------------------------------ */

/**
 * Half of all the cards turn to dust, but never a whole row: every row keeps
 * at least one card to slide into the gap.
 */
export function pickSnapped(seed) {
	const rand = random(seed);
	const cards = ROWS.flatMap((row) => row.cards.map((card) => ({ row: row.id, id: card.id })));
	const left = Object.fromEntries(ROWS.map((row) => [row.id, row.cards.length]));
	const quota = Math.floor(cards.length / 2);
	const snapped = new Set();
	for (const card of shuffle(cards, rand)) {
		if (snapped.size === quota) break;
		if (left[card.row] > 1) {
			snapped.add(card.id);
			left[card.row]--;
		}
	}
	return snapped;
}

/* ---- Rows ------------------------------------------------------------ */

/** `n` equal slots across the row. */
function slots(n) {
	const w = (WIDTH - GAP * (n - 1)) / n;
	return Array.from({ length: n }, (_, i) => ({ x: i * (w + GAP), w }));
}

/**
 * One row as an animated image. `dustAt` is when this row's snap lands, in
 * seconds from load, and `snapped` holds the ids of the cards that go.
 */
export function rowSvg(row, theme, snapped, dustAt, seed) {
	const cards = row.cards.map(build);
	const survivors = cards.filter((c) => !snapped.has(c.id));
	const before = slots(cards.length);
	const after = slots(survivors.length);
	const H = Math.ceil(
		Math.max(...cards.map((c, i) => c.height(before[i].w)), ...survivors.map((c, i) => c.height(after[i].w))),
	);
	const sweep = 1.1; // seconds for the dust to cross one card
	const settle = dustAt + sweep + 0.3;
	const rand = random(seed);
	const palette = [theme.accent, theme.text, theme.muted, theme.border];

	let layers = '';
	let dust = '';
	cards.forEach((card, i) => {
		const slot = before[i];
		const drawn = `<g transform="translate(${slot.x.toFixed(1)} 0)">${card.draw(theme, slot.w, H)}</g>`;
		if (snapped.has(card.id)) {
			// A mask slides off the card left to right while dust lifts away
			// from the edge it uncovers.
			layers += `<mask id="m${i}" maskUnits="userSpaceOnUse" x="${slot.x}" y="0" width="${slot.w}" height="${H}"><rect class="wipe" x="${slot.x}" y="0" width="${slot.w}" height="${H}" fill="#fff"/></mask>
<g mask="url(#m${i})">${drawn}</g>\n`;
			const count = Math.round((slot.w * H) / 290);
			for (let k = 0; k < count; k++) {
				const along = rand();
				const size = 1.8 + rand() * 3.6;
				dust += `<rect class="p" x="${(slot.x + along * slot.w).toFixed(1)}" y="${(rand() * (H - size)).toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" fill="${palette[Math.floor(rand() * palette.length)]}" style="--dx:${Math.round(50 + rand() * 150)}px;--dy:${Math.round(-25 - rand() * 95)}px;animation-delay:${(dustAt + along * sweep + rand() * 0.2).toFixed(2)}s"/>\n`;
			}
		} else {
			// Survivors are drawn twice: where they are, then in their new,
			// wider slot, which slides in from the old position.
			const to = after[survivors.indexOf(card)];
			layers += `<g class="old">${drawn}</g>
<g class="new" style="--from:${(slot.x - to.x).toFixed(1)}px"><g transform="translate(${to.x.toFixed(1)} 0)">${card.draw(theme, to.w, H)}</g></g>\n`;
		}
	});

	const style = [
		`@keyframes wipe{to{transform:translateX(100%)}}`,
		`.wipe{transform-box:fill-box;animation:wipe ${sweep}s linear ${dustAt}s forwards}`,
		`@keyframes dust{from{opacity:1;transform:none}to{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(40deg)}}`,
		`.p{opacity:0;transform-box:fill-box;transform-origin:center;animation:dust 1.7s cubic-bezier(.3,.6,.4,1) forwards}`,
		`@keyframes leave{to{opacity:0}}`,
		`.old{animation:leave .2s ease-in ${settle.toFixed(2)}s forwards}`,
		`@keyframes arrive{from{opacity:0;transform:translateX(var(--from))}to{opacity:1;transform:none}}`,
		`.new{opacity:0;animation:arrive .7s cubic-bezier(.2,.8,.2,1) ${(settle + 0.15).toFixed(2)}s forwards}`,
		// Without motion nothing is snapped: show the row as it was.
		`@media (prefers-reduced-motion: reduce){.wipe,.p,.old,.new{animation:none}.p,.new{display:none}}`,
	].join('\n');

	return svg({ height: H, title: row.alt, style, body: `${layers}${dust}` });
}

export { ROWS };

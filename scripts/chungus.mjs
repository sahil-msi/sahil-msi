// The stage at the top of the README: a very large rabbit walks in, turns,
// raises a gold gauntlet and snaps. The card rows underneath (sections.mjs)
// time their dust to the snap. Everything plays once from the moment the
// image loads, then holds its last frame.
//
// The rabbit is a set of frames rendered from the three.js model in
// scripts/chungus-render, embedded as WebP so the SVG needs nothing else.

import { readFileSync } from 'node:fs';
import { WIDTH, esc, svg } from './lib.mjs';
import { PROFILE } from './profile.mjs';

const FRAMES = new URL('../assets/chungus/', import.meta.url);

/** Beats, in seconds from image load. */
export const BEAT = {
	enter: 0.8, // starts walking in from the right
	arrive: 3.9, // reaches the middle and turns
	talk: 4.4, // speech bubble
	raise: 5.9, // lifts the gauntlet
	charge: 6.4, // stones glow
	snap: 7.6,
	dust: 7.75, // the first row of cards starts to blow away
	stagger: 0.45, // and each row below it this much later
	end: 12,
};

const WALK_STEP = 0.1;
const CHARGE_STEP = 0.15;

const pct = (t) => `${((Math.min(t, BEAT.end) / BEAT.end) * 100).toFixed(3)}%`;

function loadFrames() {
	const list = JSON.parse(readFileSync(new URL('frames.json', FRAMES), 'utf8'));
	return list.map(({ name, phase }) => ({
		phase,
		href: `data:image/webp;base64,${readFileSync(new URL(name, FRAMES)).toString('base64')}`,
	}));
}

/** For each frame, the [from, to) windows in which it is the one on screen. */
function schedule(frames) {
	const windows = frames.map(() => []);
	const of = (phase) => frames.flatMap((f, i) => (f.phase === phase ? [i] : []));
	const show = (i, from, to) => windows[i].push([from, to]);

	const walk = of('walk');
	show(walk[0], 0, BEAT.enter);
	for (let k = 0, t = BEAT.enter; t < BEAT.arrive - 1e-9; k++, t += WALK_STEP)
		show(walk[k % walk.length], t, Math.min(t + WALK_STEP, BEAT.arrive));

	const turn = of('turn');
	turn.forEach((i, k) => show(i, BEAT.arrive + k * WALK_STEP, BEAT.arrive + (k + 1) * WALK_STEP));
	show(turn.at(-1), BEAT.arrive + turn.length * WALK_STEP, BEAT.raise);

	const raise = of('raise');
	raise.forEach((i, k) => show(i, BEAT.raise + k * WALK_STEP, BEAT.raise + (k + 1) * WALK_STEP));
	show(raise.at(-1), BEAT.raise + raise.length * WALK_STEP, BEAT.charge);

	const charge = of('charge');
	for (let k = 0, t = BEAT.charge; t < BEAT.snap - 1e-9; k++, t += CHARGE_STEP)
		show(charge[k % charge.length], t, Math.min(t + CHARGE_STEP, BEAT.snap));

	const [click, release] = of('snap');
	show(click, BEAT.snap, BEAT.snap + 0.06);
	show(release, BEAT.snap + 0.06, BEAT.snap + 0.8);
	show(of('after')[0], BEAT.snap + 0.8, Infinity);

	// Merge windows that touch, so no keyframe percentage appears twice.
	return windows.map((list) =>
		list
			.sort((a, b) => a[0] - b[0])
			.reduce((out, w) => {
				const last = out.at(-1);
				if (last && w[0] - last[1] < 1e-6) last[1] = Math.max(last[1], w[1]);
				else out.push([...w]);
				return out;
			}, []),
	);
}

/** Opacity keyframes that switch a frame on inside its windows and off outside them. */
function blink(name, windows) {
	if (!windows.length) return `@keyframes ${name}{0%,100%{opacity:0}}`;
	const stops = windows[0][0] > 0 ? ['0%{opacity:0}'] : [];
	for (const [from, to] of windows) {
		stops.push(`${pct(from)}{opacity:1}`);
		stops.push(to < BEAT.end ? `${pct(to)}{opacity:0}` : '100%{opacity:1}');
	}
	return `@keyframes ${name}{${stops.join('')}}`;
}

export function stageSvg(theme) {
	const H = 440;
	const frames = loadFrames();
	const windows = schedule(frames);
	const last = frames.length - 1;

	// Frames are 700 x 800 (2x for sharp screens), drawn at 350 x 400 with his
	// feet on the bottom edge.
	const fw = 350;
	const fh = 400;
	const fx = (WIDTH - fw) / 2;
	const fy = H - fh;
	const head = { x: fx + 0.5 * fw, y: fy + 0.37 * fh };
	const hand = { x: fx + 0.74 * fw, y: fy + 0.3 * fh };

	const images = frames
		.map((f, i) => `<image class="f f${i}" href="${f.href}" x="${fx}" y="${fy}" width="${fw}" height="${fh}"/>`)
		.join('\n');

	// Sized to the line (bold 15px averages about 8.6px a character), with its
	// tail just left of his face.
	const bw = Math.max(150, Math.round(PROFILE.quip.length * 8.6 + 34));
	const bubble = { w: bw, h: 40, x: head.x - 86 - bw, y: head.y - 34 };
	const style = [
		`.f,.walker,.bubble,.snap,.flash,.caption{animation-duration:${BEAT.end}s;animation-fill-mode:forwards;animation-timing-function:step-end}`,
		'.f{opacity:0}',
		...windows.map((w, i) => `${blink(`f${i}`, w)}.f${i}{animation-name:f${i}}`),
		`@keyframes walker{0%,${pct(BEAT.enter)}{transform:translateX(${WIDTH}px)}${pct(BEAT.arrive)},100%{transform:none}}`,
		'.walker{animation-name:walker;animation-timing-function:linear}',
		`${blink('bubble', [[BEAT.talk, BEAT.raise]])}.bubble{animation-name:bubble;opacity:0}`,
		`@keyframes snap{0%,${pct(BEAT.snap)}{opacity:0;transform:scale(.35) rotate(-8deg)}${pct(BEAT.snap + 0.18)}{opacity:1;transform:scale(1.14) rotate(-4deg)}${pct(BEAT.snap + 1.1)}{opacity:1;transform:scale(1) rotate(-4deg)}${pct(BEAT.snap + 1.6)},100%{opacity:0;transform:scale(1) rotate(-4deg)}}`,
		'.snap{animation-name:snap;animation-timing-function:ease-out;transform-box:fill-box;transform-origin:center;opacity:0}',
		`@keyframes flash{0%,${pct(BEAT.snap)}{opacity:0}${pct(BEAT.snap + 0.08)}{opacity:${theme.flashPeak}}${pct(BEAT.snap + 0.75)},100%{opacity:0}}`,
		'.flash{animation-name:flash;animation-timing-function:ease-out;opacity:0}',
		`@keyframes caption{0%,${pct(BEAT.dust + 2.8)}{opacity:0}${pct(BEAT.dust + 3.4)},100%{opacity:1}}`,
		'.caption{animation-name:caption;animation-timing-function:ease-in-out;opacity:0}',
		// Without motion: just the finished pose, and nothing has been snapped.
		`@media (prefers-reduced-motion: reduce){*{animation:none!important}.f${last}{opacity:1}.walker{transform:none}}`,
	].join('\n');

	const [role, extra] = PROFILE.lines;
	const body = `<text x="0" y="44" font-size="34" font-weight="800" fill="${theme.text}">Hi, I&#39;m ${esc(PROFILE.name)}</text>
<text x="0" y="74" font-size="15" fill="${theme.muted}">${esc(role)}</text>
<text x="0" y="98" font-size="13" fill="${theme.muted}">${esc(extra)}</text>
<g class="walker">
${images}
</g>
<g class="bubble">
<rect x="${bubble.x}" y="${bubble.y}" width="${bubble.w}" height="${bubble.h}" rx="14" fill="${theme.card}" stroke="${theme.border}"/>
<path d="M${bubble.x + bubble.w - 1} ${bubble.y + 13}l17 7l-17 7" fill="${theme.card}" stroke="${theme.border}" stroke-linejoin="round"/>
<rect x="${bubble.x + bubble.w - 3}" y="${bubble.y + 14}" width="3" height="12" fill="${theme.card}"/>
<text x="${bubble.x + bubble.w / 2}" y="${bubble.y + 26}" text-anchor="middle" font-size="15" font-weight="700" fill="${theme.text}">${esc(PROFILE.quip)}</text>
</g>
<text class="snap" x="${hand.x + 104}" y="${hand.y - 30}" text-anchor="middle" font-size="46" font-weight="900" font-style="italic" fill="#ffd23f" stroke="#9a6812" stroke-width="1.6" paint-order="stroke">SNAP</text>
<text class="caption" x="${WIDTH}" y="${H - 14}" text-anchor="end" font-size="15" font-style="italic" fill="${theme.muted}">Perfectly balanced, as all things should be.</text>
<rect class="flash" width="${WIDTH}" height="${H}" fill="${theme.flash}"/>`;

	return svg({
		height: H,
		title: `${PROFILE.name}'s profile: a very large rabbit with a gold gauntlet walks in and snaps`,
		style,
		body,
	});
}

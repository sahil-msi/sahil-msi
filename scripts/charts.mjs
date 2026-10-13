// The contribution activity graph and the overview card, as static SVGs.

import { WIDTH, esc, fmt, svg } from './lib.mjs';
import { PROFILE } from './profile.mjs';

const card = (t, h) =>
	`<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${h - 1}" rx="10" fill="${t.bg}" stroke="${t.border}"/>`;

const shortDate = (iso) =>
	new Date(`${iso}T00:00:00Z`).toLocaleDateString(PROFILE.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** A round step for `ticks` gridlines that clear `max`. */
function niceStep(max, ticks) {
	const raw = Math.max(max, ticks) / ticks;
	const mag = 10 ** Math.floor(Math.log10(raw));
	return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
}

/**
 * Monotone cubic (Fritsch-Carlson) through the points, as SVG path commands.
 * Unlike a plain spline it never dips below zero or overshoots a peak.
 */
function monotone(points) {
	const n = points.length;
	if (n < 2) return '';
	const dx = (points[1][0] - points[0][0]) || 1;
	const d = points.slice(1).map(([, y], i) => (y - points[i][1]) / dx);
	const m = points.map((_, i) => {
		if (i === 0) return d[0];
		if (i === n - 1) return d[n - 2];
		return d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
	});
	for (let i = 0; i < n - 1; i++) {
		if (d[i] === 0) {
			m[i] = 0;
			m[i + 1] = 0;
			continue;
		}
		const a = m[i] / d[i];
		const b = m[i + 1] / d[i];
		const s = a * a + b * b;
		if (s > 9) {
			const k = 3 / Math.sqrt(s);
			m[i] = k * a * d[i];
			m[i + 1] = k * b * d[i];
		}
	}
	const f = (v) => v.toFixed(1);
	let path = `M${f(points[0][0])},${f(points[0][1])}`;
	for (let i = 0; i < n - 1; i++) {
		const [x0, y0] = points[i];
		const [x1, y1] = points[i + 1];
		path += ` C${f(x0 + dx / 3)},${f(y0 + (m[i] * dx) / 3)} ${f(x1 - dx / 3)},${f(y1 - (m[i + 1] * dx) / 3)} ${f(x1)},${f(y1)}`;
	}
	return path;
}

export function activitySvg(days, theme) {
	const H = 300;
	const pad = { l: 48, r: 24, t: 84, b: 40 };
	const cw = WIDTH - pad.l - pad.r;
	const ch = H - pad.t - pad.b;
	const counts = days.map((d) => d.contributionCount);
	const step = niceStep(Math.max(...counts), 4);
	const top = step * 4;
	const x = (i) => pad.l + (i / (days.length - 1)) * cw;
	const y = (v) => pad.t + ch - (v / top) * ch;

	const line = monotone(counts.map((c, i) => [x(i), y(c)]));
	const area = `${line} L${x(days.length - 1).toFixed(1)},${y(0)} L${pad.l},${y(0)} Z`;

	const grid = [0, 1, 2, 3, 4]
		.map((k) => {
			const v = k * step;
			return `<line x1="${pad.l}" x2="${WIDTH - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="${theme.grid}"/>
<text x="${pad.l - 10}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="${theme.muted}">${fmt(v)}</text>`;
		})
		.join('\n');

	// A label each week, plus the last day unless it would crowd the one before.
	const lastIndex = days.length - 1;
	const ticks = days.map((_, i) => i).filter((i) => i % 7 === 0 && lastIndex - i >= 4);
	ticks.push(lastIndex);
	const labels = ticks
		.map((i) => {
			const anchor = i === 0 ? 'start' : i === lastIndex ? 'end' : 'middle';
			return `<text x="${x(i)}" y="${H - 14}" text-anchor="${anchor}" font-size="11" fill="${theme.muted}">${esc(shortDate(days[i].date))}</text>`;
		})
		.join('\n');

	const total = counts.reduce((s, c) => s + c, 0);
	const active = counts.filter((c) => c > 0).length;
	const best = days.reduce((a, d) => (d.contributionCount > a.contributionCount ? d : a));

	const body = `${card(theme, H)}
<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${theme.fill}" stop-opacity="0.35"/><stop offset="1" stop-color="${theme.fill}" stop-opacity="0"/></linearGradient></defs>
<text x="24" y="34" font-size="16" font-weight="600" fill="${theme.text}">Contribution activity</text>
<text x="24" y="52" font-size="12" fill="${theme.muted}">Last ${days.length} days</text>
<text x="${WIDTH - 24}" y="34" text-anchor="end" font-size="13" fill="${theme.text}"><tspan font-weight="600">${fmt(total)}</tspan><tspan fill="${theme.muted}"> contributions · </tspan><tspan font-weight="600">${active}</tspan><tspan fill="${theme.muted}"> active days</tspan></text>
<text x="${WIDTH - 24}" y="52" text-anchor="end" font-size="12" fill="${theme.muted}">Busiest day: ${fmt(best.contributionCount)}${best.contributionCount ? ` on ${esc(shortDate(best.date))}` : ''}</text>
${grid}
<path d="${area}" fill="url(#fade)"/>
<path d="${line}" fill="none" stroke="${theme.line}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"/>
${labels}`;
	return svg({ height: H, title: `Contribution activity over the last ${days.length} days`, body });
}

/** Totals over the whole contribution calendar (the last 12 months). */
export function yearStats(days) {
	const counts = days.map((d) => d.contributionCount);
	let longest = 0;
	let run = 0;
	for (const c of counts) {
		run = c > 0 ? run + 1 : 0;
		longest = Math.max(longest, run);
	}
	const total = counts.reduce((s, c) => s + c, 0);
	const active = counts.filter((c) => c > 0).length;
	return {
		total,
		active,
		longest,
		perActiveDay: active ? total / active : 0,
		best: Math.max(0, ...counts),
	};
}

export function overviewSvg(stats, languages, theme) {
	const H = 200;
	const cells = [
		[fmt(stats.total), 'Contributions (12 months)'],
		[fmt(stats.active), 'Active days'],
		[`${fmt(stats.longest)} ${stats.longest === 1 ? 'day' : 'days'}`, 'Longest streak'],
		[fmt(stats.perActiveDay, 1), 'Per active day'],
		[fmt(stats.best), 'Busiest day'],
	];
	const colW = (WIDTH - 48) / cells.length;
	const statText = cells
		.map(
			([value, label], i) => `<text x="${24 + i * colW}" y="44" font-size="22" font-weight="600" fill="${theme.text}">${esc(value)}</text>
<text x="${24 + i * colW}" y="64" font-size="12" fill="${theme.muted}">${esc(label)}</text>`,
		)
		.join('\n');

	const sum = languages.reduce((s, l) => s + l.share, 0) || 1;
	const shown = [...languages].sort((a, b) => b.share - a.share).slice(0, 6);
	const barW = WIDTH - 48;
	let bx = 24;
	const bar = shown
		.map((l) => {
			const w = (l.share / sum) * barW;
			const seg = `<rect x="${bx.toFixed(1)}" y="112" width="${Math.max(w, 1).toFixed(1)}" height="10" fill="${l.color ?? theme.muted}"/>`;
			bx += w;
			return seg;
		})
		.join('\n');
	const legend = shown
		.map((l, i) => {
			const lx = 24 + (i % 3) * (barW / 3);
			const ly = 148 + Math.floor(i / 3) * 24;
			return `<circle cx="${lx + 5}" cy="${ly - 4}" r="5" fill="${l.color ?? theme.muted}"/>
<text x="${lx + 16}" y="${ly}" font-size="12" fill="${theme.text}">${esc(l.name)} <tspan fill="${theme.muted}">${((l.share / sum) * 100).toFixed(1)}%</tspan></text>`;
		})
		.join('\n');

	const body = `${card(theme, H)}
${statText}
<text x="24" y="100" font-size="12" font-weight="600" fill="${theme.text}">${esc(PROFILE.languagesLabel)}</text>
<clipPath id="bar"><rect x="24" y="112" width="${barW}" height="10" rx="5"/></clipPath>
<rect x="24" y="112" width="${barW}" height="10" rx="5" fill="${theme.grid}"/>
<g clip-path="url(#bar)">
${bar}
</g>
${legend}`;
	return svg({ height: H, title: 'Contribution totals and languages', body });
}

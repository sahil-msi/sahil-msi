// Renders every image the README shows: the rabbit's stage, one image per row
// of cards, the activity graph and the overview card, in light and dark.
// Runs in GitHub Actions (.github/workflows/profile.yml), so the profile
// never depends on a third-party image service staying up.
//
// The only thing fetched is the public contribution calendar; everything
// else comes from scripts/profile.mjs.
//
// Usage: GITHUB_TOKEN=... node scripts/generate.mjs [login] [outDir]

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { activitySvg, overviewSvg, yearStats } from './charts.mjs';
import { BEAT, stageSvg } from './chungus.mjs';
import { THEMES } from './lib.mjs';
import { LANGUAGES, PROFILE } from './profile.mjs';
import { ROWS, pickSnapped, rowSvg } from './sections.mjs';

const login = process.argv[2] ?? PROFILE.login;
const outDir = process.argv[3] ?? 'dist';
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN is required');

const DAYS = 60;

const QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

async function fetchCalendar() {
	const res = await fetch('https://api.github.com/graphql', {
		method: 'POST',
		headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' },
		body: JSON.stringify({ query: QUERY, variables: { login } }),
	});
	const json = await res.json();
	if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors ?? json));
	return json.data.user.contributionsCollection.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
}

const calendar = await fetchCalendar();
const stats = yearStats(calendar);

// Half the cards are snapped; which half changes with every six-hour run.
const seed = Number(process.env.CHUNGUS_SEED ?? Math.floor(Date.now() / (6 * 3600 * 1000)));
const snapped = pickSnapped(seed);

await mkdir(outDir, { recursive: true });
for (const [name, theme] of Object.entries(THEMES)) {
	await writeFile(join(outDir, `chungus-stage-${name}.svg`), stageSvg(theme));
	for (const [i, row] of ROWS.entries())
		await writeFile(join(outDir, `row-${row.id}-${name}.svg`), rowSvg(row, theme, snapped, BEAT.dust + i * BEAT.stagger, seed + i));
	await writeFile(join(outDir, `activity-${name}.svg`), activitySvg(calendar.slice(-DAYS), theme));
	await writeFile(join(outDir, `overview-${name}.svg`), overviewSvg(stats, LANGUAGES, theme));
}

console.log(`Snapped: ${[...snapped].join(', ')}`);
console.log(`Wrote the stage, ${ROWS.length} rows, activity and overview for ${login} (${stats.total} contributions in the last year) to ${outDir}`);

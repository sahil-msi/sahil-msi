// Everything personal on the profile lives here: the stage's text, the cards
// in each row and the languages bar. Change this file and push; the workflow
// re-renders the images. If you add, remove or rename a row, update its
// <picture> block in README.md to match.
//
// This repo is public. Keep it generic: no emails, credentials, keys,
// hostnames, IPs, cloud or hosting details, employer, organisation, client
// or vendor names, product domains or ticket numbers.

export const PROFILE = {
	login: 'sahil-msi',
	name: 'Sahil',
	/** The two lines under "Hi, I'm …" on the stage. */
	lines: ['Full-Stack & AI Engineer · India', 'TypeScript · React · Next.js · AI agents'],
	/** What the rabbit says before he snaps. */
	quip: 'I am... inevitable.',
	/** Number and date formatting on the charts. */
	locale: 'en-IN',
	languagesLabel: 'Languages across the repos I work on',
};

/** The chips on the Tools card, most used first. */
export const TOOLS = [
	'TypeScript', 'React', 'Next.js', 'Node.js', 'tRPC',
	'Tailwind CSS', 'Drizzle', 'Vite', 'Python',
	'FastAPI', 'OpenAI', 'Claude', 'Playwright',
];

const REPOS = 'https://github.com/sahil-msi?tab=repositories';

/**
 * The rows of cards, top to bottom. Each row is one image and one link.
 * Cards are `{ id, name, tag, text }`, or `kind: 'tools'` for the chips.
 * Names on four-card rows need to stay under about 15 characters.
 */
export const ROWS = [
	{
		id: 'about',
		href: REPOS,
		alt: 'About me and the tools I use',
		cards: [
			{
				id: 'about',
				name: 'About me',
				tag: 'Full-Stack & AI Engineer · India',
				text: 'I build full-stack TypeScript apps and put AI to work inside them. I ship products end to end, from React and tRPC frontends to tool-calling agents, voice pipelines and e-signature flows.',
			},
			{ id: 'tools', kind: 'tools', name: 'Tools', tag: 'What I build with' },
		],
	},
	{
		id: 'work',
		href: REPOS,
		alt: 'Projects I build',
		cards: [
			{
				id: 'ld-studio',
				name: 'L&D Studio',
				tag: 'Next.js · tRPC · AI SDK',
				text: 'AI course-authoring studio. I built its editors, slide and flowchart canvases, interactive video and the in-editor AI.',
			},
			{
				id: 'crm',
				name: 'Enrollment CRM',
				tag: 'React · tRPC · Drizzle',
				text: "A school's admissions pipeline from interview to enrolled, with online payment plans, e-signatures, and HR and parent portals.",
			},
			{
				id: 'docsign',
				name: 'DocSign',
				tag: 'React · Express · pdf-lib',
				text: 'E-signature platform: place fields, route documents to signers in order and download a sealed PDF with its audit trail.',
			},
			{
				id: 'foundation',
				name: 'Foundation Site',
				tag: 'Next.js · Prisma · Tailwind',
				text: 'Website for a family foundation, with an admin editor, a PDF reader that loads only the pages being read and a WebP image pipeline.',
			},
		],
	},
	{
		id: 'more',
		href: REPOS,
		alt: 'More projects',
		cards: [
			{
				id: 'health-assistant',
				name: 'Health Assistant',
				tag: 'React · LangGraph · Voice AI',
				text: 'Voice-first, multilingual health assistants for people and their animals. I worked on voice latency and streaming chat.',
			},
			{
				id: 'voice-agent',
				name: 'Voice Helpline',
				tag: 'Python · FastAPI · WebSockets',
				text: 'Real-time phone agent in Indian languages: speech to text, an LLM, then speech back. I cut its reply time from about 10s to 4s.',
			},
			{
				id: 'course-builder',
				name: 'Course Builder',
				tag: 'Next.js · Drizzle · AI SDK',
				text: 'Turns a prompt or a document into a full course with lessons, quizzes and exports. Its design system now runs L&D Studio.',
			},
		],
	},
];

/**
 * Share of code by language, in percent, across the repos I work on
 * (13 Oct 2026). Build and infrastructure languages are left out. Those
 * repos are private and the workflow's token cannot read them, so update
 * this by hand when it drifts.
 */
export const LANGUAGES = [
	{ name: 'TypeScript', color: '#3178c6', share: 95.6 },
	{ name: 'Python', color: '#3572A5', share: 1.5 },
	{ name: 'JavaScript', color: '#f1e05a', share: 1.3 },
	{ name: 'CSS', color: '#663399', share: 1.3 },
	{ name: 'HTML', color: '#e34c26', share: 0.3 },
];

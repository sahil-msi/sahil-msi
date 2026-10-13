// A very large rabbit in a gold gauntlet, built from three.js primitives.
// He stands on y = 0, faces +z and is a little over four units tall.
// index.html poses him; this file only builds the parts and hands back the
// joints that move.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Stone colours: index, middle, ring and little knuckles, the thumb, then the back of the hand. */
export const STONES = [0x8b3dff, 0x2a66ff, 0xff2d50, 0xffc82a, 0x22d07c, 0xff7a1c];

const FUR = 0x6c6f7a;
const BELLY = 0xf4f0e8;

const material = (color, props = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.84, ...props });

const M = {
	fur: material(FUR),
	cream: material(BELLY, { roughness: 0.92 }),
	pink: material(0xf3a9ba, { roughness: 0.7 }),
	nose: material(0x9a5262, { roughness: 0.38 }),
	mouth: material(0x9c1631, { roughness: 0.5 }),
	pupil: material(0x131418, { roughness: 0.25 }),
	lid: material(0x7a7d88),
	whisker: material(0x3a3c44, { roughness: 0.6 }),
	gold: material(0xe2aa3d, { metalness: 1, roughness: 0.3 }),
	bezel: material(0xc58d22, { metalness: 1, roughness: 0.22 }),
};

function part(geometry, mat, position = [0, 0, 0], scale = [1, 1, 1]) {
	const mesh = new THREE.Mesh(geometry, mat);
	mesh.position.fromArray(position);
	mesh.scale.fromArray(scale);
	mesh.castShadow = true;
	return mesh;
}

const ball = (r, segments = 32) => new THREE.SphereGeometry(r, segments, Math.round(segments * 0.75));
const pill = (r, length) => new THREE.CapsuleGeometry(r, length, 8, 20);

/* ---- Body ------------------------------------------------------------ */

/** The pear: a lathed outline, painted cream wherever it faces forward. */
function body() {
	const outline = [
		[0.0, 0.03], [0.86, 0.06], [1.27, 0.3], [1.46, 0.72], [1.46, 1.16], [1.33, 1.62],
		[1.1, 2.06], [0.86, 2.46], [0.66, 2.8], [0.44, 3.04], [0.0, 3.14],
	].map(([r, y]) => new THREE.Vector2(r, y));
	const geometry = new THREE.LatheGeometry(new THREE.SplineCurve(outline).getPoints(48), 72);
	geometry.scale(1, 1, 0.9);
	geometry.computeVertexNormals();

	const position = geometry.getAttribute('position');
	const fur = new THREE.Color(FUR);
	const cream = new THREE.Color(BELLY);
	const c = new THREE.Color();
	const colors = new Float32Array(position.count * 3);
	for (let i = 0; i < position.count; i++) {
		const x = position.getX(i);
		const y = position.getY(i);
		const z = position.getZ(i);
		// 1 straight ahead, 0 at the sides. The patch is broad round the
		// belly and narrows up the chest.
		const ahead = z / (Math.hypot(x, z) || 1);
		const edge = THREE.MathUtils.lerp(0.5, 0.8, THREE.MathUtils.clamp(y / 3.1, 0, 1));
		c.copy(fur).lerp(cream, THREE.MathUtils.smoothstep(ahead, edge - 0.07, edge + 0.07));
		c.toArray(colors, i * 3);
	}
	geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
	return part(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
}

/* ---- Head ------------------------------------------------------------ */

function ear(side) {
	const root = new THREE.Group();
	root.position.set(side * 0.24, 0.4, -0.12);
	root.rotation.z = -side * 0.09;
	root.add(part(pill(0.16, 0.7), M.fur, [0, 0.5, 0], [1, 1, 0.7]));
	root.add(part(pill(0.095, 0.6), M.pink, [0, 0.5, 0.095], [1, 1, 0.3]));
	// The top third hinges, so one ear can flop.
	const tip = new THREE.Group();
	tip.position.y = 0.92;
	tip.add(part(pill(0.15, 0.36), M.fur, [0, 0.2, 0], [1, 1, 0.7]));
	tip.add(part(pill(0.085, 0.26), M.pink, [0, 0.18, 0.09], [1, 1, 0.3]));
	root.add(tip);
	return { root, tip };
}

function head() {
	const group = new THREE.Group();
	group.position.set(0, 3.2, 0.06);
	group.add(part(ball(0.64), M.fur, [0, 0, 0], [1.04, 0.9, 0.9]));

	// Puffed cheeks over a muzzle that runs down into the belly.
	for (const s of [-1, 1]) group.add(part(ball(0.3), M.cream, [s * 0.28, -0.22, 0.24], [1.14, 0.84, 0.8]));
	group.add(part(ball(0.38), M.cream, [0, -0.31, 0.23], [1.16, 0.74, 0.84]));
	group.add(part(ball(0.062), M.nose, [0, -0.13, 0.58], [1.35, 0.85, 0.8]));
	group.add(part(ball(0.14), M.mouth, [0, -0.35, 0.51], [1.22, 0.6, 0.38]));
	const tooth = new RoundedBoxGeometry(0.064, 0.078, 0.032, 2, 0.012);
	for (const s of [-1, 1]) group.add(part(tooth, M.cream, [s * 0.035, -0.283, 0.585]));

	// Whiskers fan out from each cheek.
	const whisker = new THREE.CylinderGeometry(0.006, 0.006, 0.42, 6);
	for (const s of [-1, 1])
		for (const tilt of [-0.18, 0.04, 0.24]) {
			const w = part(whisker, M.whisker, [s * 0.5, -0.2 + tilt * 0.25, 0.42]);
			w.rotation.set(0, -s * 0.35, Math.PI / 2 + s * tilt);
			group.add(w);
		}

	// Big eyes under heavy lids, glancing sideways: the smug look.
	for (const s of [-1, 1]) {
		group.add(part(ball(0.175), M.cream, [s * 0.19, 0.1, 0.46], [0.8, 1.06, 0.5]));
		group.add(part(ball(0.055), M.pupil, [s * 0.19 - 0.045, 0.04, 0.545], [1, 1.12, 0.5]));
		const lid = part(
			new THREE.SphereGeometry(0.184, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
			M.lid,
			[s * 0.19, 0.095, 0.46],
			[0.84, 1.08, 0.64],
		);
		lid.rotation.set(-0.06, 0, s * 0.16);
		group.add(lid);
	}

	const ears = [-1, 1].map(ear);
	for (const e of ears) group.add(e.root);
	return { group, ears };
}

/* ---- Gauntlet -------------------------------------------------------- */

/**
 * A hinge with one capsule hanging off it. Built along +y, so a positive
 * `curl` (applied by the pose code as -rotation.x) folds it towards the palm.
 */
function segment(parent, at, length, radius) {
	const hinge = new THREE.Group();
	hinge.position.y = at;
	hinge.add(part(pill(radius, length), M.gold, [0, length / 2 + radius * 0.5, 0]));
	parent.add(hinge);
	return hinge;
}

function stone(parent, color, position, r, materials) {
	const glow = new THREE.MeshStandardMaterial({
		color: new THREE.Color(color).multiplyScalar(0.5),
		emissive: color,
		emissiveIntensity: 0.3,
		roughness: 0.06,
		toneMapped: false,
	});
	materials.push(glow);
	const gem = part(ball(r, 20), glow, position, [1, 1, 0.62]);
	const bezel = part(new THREE.TorusGeometry(r * 1.05, r * 0.24, 10, 28), M.bezel, position);
	parent.add(gem, bezel);
}

/**
 * The gauntlet in its own frame: fingers up +y, the back of the hand
 * towards +z and the thumb out on +x, as a left hand seen from behind.
 */
function gauntlet() {
	const hand = new THREE.Group();
	const stones = [];

	// A closed cuff, lathed like the body, with a rim where it meets the hand.
	const cuffOutline = [[0, -0.46], [0.22, -0.46], [0.27, -0.41], [0.28, -0.12], [0.33, -0.02], [0.32, 0.07], [0, 0.08]];
	hand.add(part(new THREE.LatheGeometry(cuffOutline.map(([r, y]) => new THREE.Vector2(r, y)), 40), M.gold));
	for (const y of [-0.42, 0.0]) hand.add(part(new THREE.TorusGeometry(y < 0 ? 0.265 : 0.325, 0.028, 10, 40), M.bezel, [0, y, 0]).rotateX(Math.PI / 2));

	// Back of the hand.
	hand.add(part(new RoundedBoxGeometry(0.6, 0.54, 0.3, 5, 0.12), M.gold, [0, 0.33, 0]));
	stone(hand, STONES[5], [0, 0.32, 0.155], 0.09, stones);

	const fingers = [-0.2, -0.067, 0.067, 0.2].map((x, i) => {
		const knuckle = new THREE.Group();
		knuckle.position.set(x, 0.58, 0.01);
		hand.add(knuckle);
		const near = segment(knuckle, 0, 0.12, 0.062);
		const mid = segment(near, 0.21, 0.09, 0.057);
		const tip = segment(mid, 0.17, 0.06, 0.052);
		stone(hand, STONES[i], [x, 0.53, 0.155], 0.048, stones);
		return [near, mid, tip];
	});

	const thumbRoot = new THREE.Group();
	thumbRoot.position.set(0.29, 0.22, -0.04);
	hand.add(thumbRoot);
	const thumbNear = segment(thumbRoot, 0, 0.17, 0.068);
	const thumbTip = segment(thumbNear, 0.28, 0.12, 0.062);
	stone(thumbNear, STONES[4], [0, 0.14, 0.06], 0.04, stones);

	// Lights the fur around the hand while the stones charge, with a soft
	// halo just behind it.
	const light = new THREE.PointLight(0xffc56b, 0, 4.5, 1.6);
	light.position.set(0, 0.4, 0.7);
	hand.add(light);
	const canvas = Object.assign(document.createElement('canvas'), { width: 128, height: 128 });
	const ctx = canvas.getContext('2d');
	const fade = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
	fade.addColorStop(0, 'rgba(255, 222, 140, 0.95)');
	fade.addColorStop(0.4, 'rgba(255, 196, 96, 0.38)');
	fade.addColorStop(1, 'rgba(255, 176, 64, 0)');
	ctx.fillStyle = fade;
	ctx.fillRect(0, 0, 128, 128);
	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthWrite: false, opacity: 0 }));
	halo.position.set(0, 0.5, -0.25);
	hand.add(halo);

	return { hand, fingers, thumb: [thumbRoot, thumbNear, thumbTip], stones, light, halo };
}

/* ---- Limbs ----------------------------------------------------------- */

/** An arm hanging from the shoulder along -y, with whatever it holds at the wrist. */
function arm(side, holding) {
	const shoulder = new THREE.Group();
	shoulder.position.set(side * 1.02, 2.08, 0.04);
	shoulder.add(part(pill(0.22, 0.78), M.fur, [0, -0.5, 0]));
	const wrist = new THREE.Group();
	wrist.position.y = -1.04;
	wrist.add(holding);
	shoulder.add(wrist);
	return { shoulder, wrist };
}

export function buildChungus() {
	const root = new THREE.Group();
	const figure = new THREE.Group();
	root.add(figure);

	figure.add(body());
	const h = head();
	figure.add(h.group);
	figure.add(part(ball(0.26), M.cream, [0, 0.62, -1.24], [1, 1, 0.9]));

	const feet = [-1, 1].map((s) => {
		const foot = part(ball(0.44), M.fur, [s * 0.56, 0.14, 0.52], [0.92, 0.36, 1.5]);
		figure.add(foot);
		return foot;
	});

	// White glove on the right, the gauntlet on the left.
	const glove = part(ball(0.26), M.cream, [0, -0.04, 0], [1, 1.1, 0.92]);
	const right = arm(-1, glove);
	figure.add(right.shoulder);

	const g = gauntlet();
	// Flip the hand so its fingers carry on down the arm.
	const mount = new THREE.Group();
	mount.rotation.z = Math.PI;
	mount.add(g.hand);
	const left = arm(1, mount);
	figure.add(left.shoulder);

	return { root, figure, head: h.group, ears: h.ears, feet, right, left, gauntlet: g };
}

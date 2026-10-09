"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export const BAND_MODEL = "/media/atelier/band.glb";

type Target = "center" | "lens" | "button" | "contacts";

/** One camera pose per chapter of the universe. `dir` points from the target toward the camera. */
export type Pose = {
  target: Target;
  /** Shifts where the camera looks, so the band can sit off-centre in the frame. */
  shift?: [number, number, number];
  dir: [number, number, number];
  dist: number;
  explode: number;
  led: number;
  spin?: boolean;
};

export const POSES: Pose[] = [
  { target: "center", shift: [0, 0.95, 0], dir: [0.62, 0.42, 1], dist: 7.4, explode: 0, led: 0.7, spin: true },
  { target: "center", dir: [0, 0.08, 1], dist: 4.2, explode: 0, led: 0.8 },
  { target: "lens", shift: [0.35, 0, 0], dir: [0.22, 0.3, 1], dist: 2.1, explode: 0, led: 1 },
  { target: "button", shift: [0.75, 0, 0], dir: [-0.35, 0.22, 1], dist: 2.4, explode: 0, led: 0.6 },
  { target: "contacts", shift: [0.3, 0, 0], dir: [0.35, 1.25, -1], dist: 3.6, explode: 0, led: 0.4 },
  { target: "center", shift: [-0.7, 0.55, 0], dir: [0.75, 0.5, 0.9], dist: 8, explode: 1, led: 0.9 },
  { target: "center", dir: [-0.6, 0.62, 0.85], dist: 5.6, explode: 0, led: 0.8 },
];

/** Exploded layers, outermost first, with how far (scene units) each lifts along the housing normal. */
const LAYERS: { test: RegExp; lift: number }[] = [
  { test: /^(Upper_cover|Cyan_indicator_lens|Power_)/, lift: 1.55 },
  { test: /^(Upper_|RF_module|Module_|Shield_|Unidentified_board)/, lift: 1.05 },
  { test: /^(Lower_PCB|Lower_processor|Lower_controller|PCB_support)/, lift: 0.68 },
  { test: /^(LiPo|Amber_end_tape|Battery_wire)/, lift: 0.32 },
];

const SCALE = 46;

export type StageProgress = { current: number };

const smooth = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function BandStage({ progress, onReady, onFail }: { progress: StageProgress; onReady?: () => void; onFail?: () => void }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      onFail?.();
      return;
    }
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lite = document.documentElement.hasAttribute("data-lite");
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lite ? 1 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !lite;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.85;

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 6, 5);
    key.castShadow = !lite;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 6;
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 });
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xdff6ff, 1.1);
    rim.position.set(-5, 2, -4);
    scene.add(rim);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);

    const root = new THREE.Group();
    scene.add(root);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.12 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const targets: Record<Target, THREE.Vector3> = {
      center: new THREE.Vector3(),
      lens: new THREE.Vector3(),
      button: new THREE.Vector3(),
      contacts: new THREE.Vector3(),
    };
    const lifted: { obj: THREE.Object3D; base: THREE.Vector3; delta: THREE.Vector3 }[] = [];
    const pending: { obj: THREE.Object3D; lift: number }[] = [];
    let lens: THREE.MeshStandardMaterial | null = null;
    let loaded = false;
    let disposed = false;

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      BAND_MODEL,
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        model.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.castShadow = !lite;
          mesh.receiveShadow = !lite;
          if (mesh.name.startsWith("Cyan_indicator_lens")) {
            lens = new THREE.MeshStandardMaterial({ color: 0x0d3a3e, emissive: 0x43dbe8, emissiveIntensity: 3, roughness: 0.25 });
            mesh.material = lens;
          }
          const layer = LAYERS.find((l) => l.test.test(mesh.name));
          if (layer) pending.push({ obj: mesh, lift: layer.lift });
        });

        // Housing faces the camera: the model's +Y (housing normal) becomes +Z.
        const pivot = new THREE.Group();
        pivot.add(model);
        model.rotation.x = Math.PI / 2;
        model.scale.setScalar(SCALE);
        model.updateMatrixWorld(true);

        const cover = model.getObjectByName("Upper_cover");
        const box = new THREE.Box3().setFromObject(cover ?? model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.updateMatrixWorld(true);

        const where = (name: string, fallback: THREE.Vector3) => {
          const o = model.getObjectByName(name);
          return o ? new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()) : fallback.clone();
        };
        targets.center.set(0, 0, -0.35);
        targets.lens.copy(where("Cyan_indicator_lens", targets.center));
        targets.button.copy(where("Power_button", targets.center));
        targets.contacts.copy(where("Lower_contact_tray", targets.center)).add(new THREE.Vector3(0, 0, -0.2));

        const whole = new THREE.Box3().setFromObject(model);
        floor.position.y = whole.min.y - 0.02;

        // Lift each layer along the housing normal (+Z in world space), converted into the part's own parent space,
        // since the exported nodes carry their own unit scale.
        for (const { obj, lift } of pending) {
          const parent = obj.parent;
          if (!parent) continue;
          const from = obj.getWorldPosition(new THREE.Vector3());
          const to = from.clone().add(new THREE.Vector3(0, 0, lift));
          const delta = parent.worldToLocal(to).sub(parent.worldToLocal(from.clone()));
          lifted.push({ obj, base: obj.position.clone(), delta });
        }
        root.add(pivot);
        loaded = true;
        onReady?.();
      },
      undefined,
      () => onFail?.(),
    );

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Pull back on narrow screens so the band still fits.
      camera.fov = w < h ? 42 : 30;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const camPos = new THREE.Vector3(4, 3, 7);
    const camLook = new THREE.Vector3();
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    let explode = 0;
    let led = 0.7;
    let spin = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);

    const pose = (p: Pose, out: { pos: THREE.Vector3; look: THREE.Vector3 }) => {
      out.look.copy(targets[p.target]);
      if (p.shift) out.look.add(tmp.set(...p.shift));
      tmp.set(...p.dir).normalize().multiplyScalar(p.dist * (camera.fov > 31 ? 1.35 : 1));
      out.pos.copy(out.look).add(tmp);
    };
    const a = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
    const b = { pos: new THREE.Vector3(), look: new THREE.Vector3() };

    const clock = new THREE.Clock();
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!visible || !loaded) return;

      const seg = clamp01(progress.current) * (POSES.length - 1);
      const i = Math.min(POSES.length - 2, Math.floor(seg));
      const t = smooth(clamp01((seg - i - 0.12) / 0.76));
      const pa = POSES[i];
      const pb = POSES[i + 1];
      pose(pa, a);
      pose(pb, b);
      wantPos.lerpVectors(a.pos, b.pos, t);
      wantLook.lerpVectors(a.look, b.look, t);

      const k = reduced ? 1 : 1 - Math.exp(-dt * 3.2);
      camPos.lerp(wantPos, k);
      camLook.lerp(wantLook, k);
      explode += (THREE.MathUtils.lerp(pa.explode, pb.explode, t) - explode) * k;
      led += (THREE.MathUtils.lerp(pa.led, pb.led, t) - led) * k;

      const spinWeight = (pa.spin ? 1 - t : 0) + (pb.spin ? t : 0);
      if (!reduced) spin += dt * 0.22 * spinWeight;
      spin *= spinWeight > 0.01 ? 1 : 1 - k;
      root.rotation.y = Math.sin(spin) * 0.5;

      const e = smooth(clamp01(explode));
      for (const l of lifted) l.obj.position.copy(l.base).addScaledVector(l.delta, e);
      if (lens) {
        const pulse = reduced ? 1 : 0.86 + 0.14 * Math.sin(clock.elapsedTime * 2.1);
        (lens as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + 3.4 * led * pulse;
      }

      camera.position.copy(camPos);
      camera.lookAt(camLook);
      renderer.render(scene, camera);
    };
    frame();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          Object.values(m).forEach((v) => v instanceof THREE.Texture && v.dispose());
          m.dispose();
        });
      });
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [progress, onReady, onFail]);

  return <div ref={host} className="at-stage__canvas" aria-hidden="true" />;
}

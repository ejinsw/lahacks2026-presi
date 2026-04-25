import { useEffect, useRef, useState } from "react";
import { useAtom } from "jotai";
import * as THREE from "three";
import * as GaussianSplats3D from "@mkkellogg/gaussian-splats-3d";
import { slideAtom } from "./Overlay";

const SLIDE_IDX = 2;

export function GaussianSplatSlide() {
  const [slide] = useAtom(slideAtom);
  const containerRef = useRef(null);
  const visible = slide === SLIDE_IDX;

  // Lazy-mount: only create the viewer the first time slide 3 is shown
  const [hasEverShown, setHasEverShown] = useState(false);
  useEffect(() => {
    if (visible) setHasEverShown(true);
  }, [visible]);

  // Live state shared with the RAF loop via a plain object (no re-render needed)
  const live = useRef({
    dollying: false,
    dollyProgress: 0,
    orbitAngle: 0,
  });

  // Sync dollying flag and reset progress when leaving slide
  useEffect(() => {
    live.current.dollying = visible;
    if (!visible) live.current.dollyProgress = 0;
  }, [visible]);

  // Create viewer once on first show, clean up on unmount
  useEffect(() => {
    if (!hasEverShown || !containerRef.current) return;
    const container = containerRef.current;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
      60, window.innerWidth / window.innerHeight, 0.01, 500
    );
    camera.position.set(0, 0.3, 7);
    camera.lookAt(0, 0, 0);

    const viewer = new GaussianSplats3D.Viewer({
      selfDrivenMode: false,
      renderer,
      camera,
      useBuiltInControls: false,
      gpuAcceleratedSort: false,
      sharedMemoryForWorkers: false,
    });

    let loaded = false;
    viewer
      .addSplatScene("/models/example.ply", {
        format: GaussianSplats3D.SceneFormat.Ply,
        splatAlphaRemovalThreshold: 5,
      })
      .then(() => { loaded = true; })
      .catch(console.error);

    let rafId = null;
    let lastTime = performance.now();

    const loop = () => {
      rafId = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const lv = live.current;

      // Advance dolly progress when on use-case slide (slow, cinematic)
      if (lv.dollying && lv.dollyProgress < 1) {
        lv.dollyProgress = Math.min(1, lv.dollyProgress + dt * 0.18);
      }

      // Ease-in-out cubic
      const p = lv.dollyProgress;
      const t = p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;

      const z = 7 - 4 * t;                           // 7 → 3
      lv.orbitAngle += dt * 0.12 * (0.2 + 0.8 * t); // gentle orbit, faster when close

      camera.position.x = Math.sin(lv.orbitAngle) * z * 0.18;
      camera.position.y = 0.3 + 0.3 * t;
      camera.position.z = z;
      camera.lookAt(0, 0, 0);

      if (loaded) {
        try { viewer.update(); } catch { /* ignore mid-load errors */ }
        try { viewer.render(); } catch { /* ignore mid-load errors */ }
      }
    };
    loop();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      try { viewer.dispose?.(); } catch {}
      renderer.dispose();
      if (container.contains(renderer.domElement))
        container.removeChild(renderer.domElement);
    };
  }, [hasEverShown]);

  if (!hasEverShown) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.6s ease",
        pointerEvents: "none",
      }}
    />
  );
}

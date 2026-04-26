import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
import * as THREE from "three";
import * as GaussianSplats3D from "@mkkellogg/gaussian-splats-3d";
import { presentationAssets, slideAtom } from "../presentationState";

function getMode(slide) {
  if (slide === 3) {
    return {
      className: "is-conversion",
      path: presentationAssets.sourcePointCloud,
      delay: 0.85,
      camera: {
        start: new THREE.Vector3(0.18, 0.08, 4.8),
        end: new THREE.Vector3(0.08, 0.06, 4.25),
        target: new THREE.Vector3(0, 0, 0),
      },
    };
  }

  if (slide === 4) {
    return {
      className: "is-pipeline",
      path: presentationAssets.pipelinePointCloud,
      delay: 1.15,
      camera: {
        start: new THREE.Vector3(0.15, 0.04, 5.1),
        end: new THREE.Vector3(0.05, 0.03, 4.45),
        target: new THREE.Vector3(0, 0, 0),
      },
    };
  }

  return null;
}

export function GaussianSplatLayer() {
  const slide = useAtomValue(slideAtom);
  const mode = getMode(slide);
  const containerRef = useRef(null);
  const stateRef = useRef({
    mode,
    progress: 0,
    path: null,
  });
  const [shouldMount, setShouldMount] = useState(false);
  const [scenePath, setScenePath] = useState(null);

  useEffect(() => {
    stateRef.current.mode = mode;
    if (mode) {
      stateRef.current.progress = 0;
      setScenePath(mode.path);
      setShouldMount(true);
    }
  }, [mode]);

  const frameClass = useMemo(
    () => `gaussian-splat-layer ${mode?.className ?? "is-hidden"}`,
    [mode?.className],
  );

  useEffect(() => {
    if (!shouldMount || !scenePath || !containerRef.current) return;

    const container = containerRef.current;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "gaussian-splat-canvas";
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(58, 1, 0.01, 500);
    camera.position.copy(stateRef.current.mode?.camera.start ?? new THREE.Vector3(0, 0, 5));
    camera.lookAt(stateRef.current.mode?.camera.target ?? new THREE.Vector3(0, 0, 0));

    const viewer = new GaussianSplats3D.Viewer({
      selfDrivenMode: false,
      renderer,
      camera,
      useBuiltInControls: false,
      gpuAcceleratedSort: false,
      sharedMemoryForWorkers: false,
    });

    let loaded = false;
    let disposed = false;
    viewer
      .addSplatScene(scenePath, {
        format: GaussianSplats3D.SceneFormat.Ply,
        splatAlphaRemovalThreshold: 1,
        progressiveLoad: true,
        showLoadingUI: false,
      })
      .then(() => {
        loaded = true;
      })
      .catch((error) => {
        if (!disposed) console.error(error);
      });

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    let rafId = null;
    let lastTime = performance.now();
    const tick = () => {
      rafId = requestAnimationFrame(tick);
      resize();

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const current = stateRef.current;
      const active = Boolean(current.mode);
      current.progress = THREE.MathUtils.damp(current.progress, active ? 1 : 0, 2.2, dt);

      const t = current.progress * current.progress * (3 - 2 * current.progress);
      const cameraSpec = current.mode?.camera;
      if (cameraSpec) {
        camera.position.lerpVectors(cameraSpec.start, cameraSpec.end, t);
        camera.lookAt(cameraSpec.target);
      }

      if (loaded) {
        try {
          viewer.update();
          viewer.render();
        } catch {
          // Ignore transient render errors while the progressive loader is rebuilding buffers.
        }
      } else {
        renderer.clear();
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      try {
        viewer.dispose?.();
      } catch {}
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [scenePath, shouldMount]);

  if (!shouldMount) return null;

  return (
    <motion.div
      ref={containerRef}
      className={frameClass}
      initial={false}
      animate={{
        opacity: mode ? 1 : 0,
        scale: mode ? 1 : 0.98,
      }}
      transition={{
        duration: 1.15,
        delay: mode?.delay ?? 0,
        ease: [0.22, 1, 0.36, 1],
      }}
    />
  );
}

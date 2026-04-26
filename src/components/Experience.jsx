import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader";
import { presentationAssets, slideAtom } from "../presentationState";

const fadeTo = (current, target, dt, speed = 4.5) =>
  THREE.MathUtils.damp(current, target, speed, dt);

const smooth = (value) => {
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
};

function useStageFade(active, speed = 4.5) {
  const fade = useRef(active ? 1 : 0);
  useFrame((_, dt) => {
    fade.current = fadeTo(fade.current, active ? 1 : 0, dt, speed);
  });
  return fade;
}

function setOpacity(material, opacity) {
  if (!material) return;
  material.transparent = true;
  material.opacity = opacity;
  material.depthWrite = false;
  material.needsUpdate = true;
}

function makeGlobeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#102027";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(238, 229, 202, 0.14)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 32; y <= canvas.height; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  const land = [
    [[120, 170], [170, 112], [250, 130], [286, 190], [262, 248], [204, 260], [136, 226]],
    [[250, 270], [320, 256], [360, 318], [338, 420], [280, 472], [236, 398]],
    [[470, 152], [530, 106], [628, 124], [660, 190], [610, 234], [510, 220]],
    [[570, 228], [654, 244], [694, 320], [652, 412], [574, 392], [542, 310]],
    [[682, 140], [820, 118], [912, 176], [886, 262], [768, 248], [704, 202]],
    [[780, 308], [858, 300], [922, 354], [892, 420], [798, 410]],
  ];

  land.forEach((poly, index) => {
    ctx.beginPath();
    poly.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = index % 2 === 0 ? "#d6d2aa" : "#9ebf9e";
    ctx.fill();
  });

  ctx.fillStyle = "rgba(236, 150, 86, 0.62)";
  ctx.beginPath();
  ctx.arc(575, 260, 13, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makeGlobeParticles(count = 3600) {
  const base = new Float32Array(count * 3);
  const live = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const scatter = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * Math.PI * (3 - Math.sqrt(5));
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    const lat = Math.asin(y);
    const lon = Math.atan2(z, x);
    const land =
      Math.sin(lon * 2.3 + lat * 4.1) + Math.cos(lon * 5.1 - lat * 1.8) > 0.68;
    const color = new THREE.Color(land ? "#e0d8a6" : "#77b2b3");
    const jitter = 0.78 + Math.random() * 0.22;

    base[i * 3] = x * 1.82;
    base[i * 3 + 1] = y * 1.82;
    base[i * 3 + 2] = z * 1.82;
    live[i * 3] = base[i * 3];
    live[i * 3 + 1] = base[i * 3 + 1];
    live[i * 3 + 2] = base[i * 3 + 2];
    colors[i * 3] = color.r * jitter;
    colors[i * 3 + 1] = color.g * jitter;
    colors[i * 3 + 2] = color.b * jitter;
    scatter[i * 3] = x * (0.12 + Math.random() * 0.48) + (Math.random() - 0.5) * 0.22;
    scatter[i * 3 + 1] = y * (0.12 + Math.random() * 0.48) + (Math.random() - 0.5) * 0.22;
    scatter[i * 3 + 2] = z * (0.12 + Math.random() * 0.48) + (Math.random() - 0.5) * 0.22;
  }

  return { base, live, colors, scatter, count };
}

function TitleGlobe({ active }) {
  const { viewport } = useThree();
  const group = useRef();
  const fallbackMaterial = useRef();
  const wireMaterial = useRef();
  const pointsMaterial = useRef();
  const pointsGeometry = useRef();
  const globeMaterials = useRef([]);
  const activeTime = useRef(0);
  const [globeScene, setGlobeScene] = useState(null);
  const fade = useStageFade(active, 4.6);
  const texture = useMemo(() => makeGlobeTexture(), []);
  const particles = useMemo(() => makeGlobeParticles(), []);
  const isWide = viewport.width > 6.2;

  useEffect(() => () => texture.dispose(), [texture]);

  useEffect(() => {
    let disposed = false;
    const loader = new GLTFLoader();

    loader.load(
      presentationAssets.globeModel,
      (gltf) => {
        if (disposed) return;
        const scene = gltf.scene;
        const materials = [];

        scene.traverse((child) => {
          if (!child.isMesh) return;
          const existing = child.material;
          const map = Array.isArray(existing) ? existing[0]?.map : existing?.map;
          const material = new THREE.MeshBasicMaterial({
            color: map ? "#ffffff" : "#d9d2aa",
            map: map ?? null,
            transparent: true,
            opacity: 0,
            toneMapped: false,
            depthWrite: false,
          });
          child.material = material;
          child.renderOrder = 1;
          materials.push(material);
        });

        scene.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(scene);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);
        const scale = 3.65 / (Math.max(size.x, size.y, size.z) || 1);
        scene.scale.setScalar(scale);
        scene.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

        globeMaterials.current = materials;
        setGlobeScene(scene);
      },
      undefined,
      () => {},
    );

    return () => {
      disposed = true;
      globeMaterials.current.forEach((material) => material.dispose());
    };
  }, []);

  useFrame((state, dt) => {
    activeTime.current = active ? activeTime.current + dt : 0;
    const stageOpacity = fade.current;
    const morph = smooth((activeTime.current - 1.05) / 2.2);
    const alive = smooth((activeTime.current - 1.25) / 2.1);
    const particleOpacity = smooth((activeTime.current - 0.95) / 1.2);

    if (group.current) {
      group.current.visible = stageOpacity > 0.01;
      group.current.position.x = isWide ? 2.05 : 0;
      group.current.position.y = isWide ? 0.12 : -0.28;
      group.current.scale.setScalar(isWide ? 0.94 : 0.84);
      group.current.scale.z = THREE.MathUtils.lerp(0.07, isWide ? 0.94 : 0.84, alive);
      group.current.rotation.y = alive * (state.clock.elapsedTime * 0.26);
      group.current.rotation.x = alive * Math.sin(state.clock.elapsedTime * 0.42) * 0.12;
    }

    for (let i = 0; i < particles.count; i++) {
      const wave = Math.sin(activeTime.current * 1.5 + i * 0.017) * 0.035;
      particles.live[i * 3] =
        particles.base[i * 3] + particles.scatter[i * 3] * morph + wave * morph;
      particles.live[i * 3 + 1] =
        particles.base[i * 3 + 1] + particles.scatter[i * 3 + 1] * morph;
      particles.live[i * 3 + 2] =
        particles.base[i * 3 + 2] + particles.scatter[i * 3 + 2] * morph;
    }

    if (pointsGeometry.current) {
      pointsGeometry.current.attributes.position.needsUpdate = true;
    }
    const modelOpacity = stageOpacity * (1 - morph);
    globeMaterials.current.forEach((material) => setOpacity(material, modelOpacity));
    setOpacity(fallbackMaterial.current, stageOpacity * (globeScene ? 0 : 1) * (1 - morph));
    setOpacity(wireMaterial.current, stageOpacity * alive * (0.42 - morph * 0.28));
    setOpacity(pointsMaterial.current, stageOpacity * particleOpacity * (0.2 + morph * 0.8));
  });

  return (
    <group ref={group}>
      {globeScene && <primitive object={globeScene} />}
      <mesh>
        <sphereGeometry args={[1.8, 96, 48]} />
        <meshBasicMaterial ref={fallbackMaterial} map={texture} toneMapped={false} transparent opacity={0} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.815, 48, 24]} />
        <meshBasicMaterial ref={wireMaterial} color="#efe5ca" wireframe />
      </mesh>
      <points>
        <bufferGeometry ref={pointsGeometry}>
          <bufferAttribute
            attach="attributes-position"
            array={particles.live}
            count={particles.count}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            array={particles.colors}
            count={particles.count}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={pointsMaterial}
          size={0.028}
          vertexColors
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

function NormalizedPLY({
  active,
  path,
  fit = 4.4,
  size = 0.017,
  color = "#d7b36a",
  placement = "solution",
  opacityScale = 1,
  delay = 0,
}) {
  const source = useLoader(PLYLoader, path);
  const points = useRef();
  const material = useRef();
  const fade = useRef(0);
  const activeTime = useRef(0);
  const { viewport } = useThree();

  const normalized = useMemo(() => {
    const geometry = source.clone();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const center = new THREE.Vector3();
    const dimensions = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(dimensions);
    geometry.translate(-center.x, -center.y, -center.z);
    const maxDim = Math.max(dimensions.x, dimensions.y, dimensions.z) || 1;
    return {
      geometry,
      scale: fit / maxDim,
      hasColor: Boolean(geometry.getAttribute("color")),
    };
  }, [source, fit]);

  useEffect(() => () => normalized.geometry.dispose(), [normalized.geometry]);

  useFrame((_, dt) => {
    activeTime.current = active ? activeTime.current + dt : 0;
    const delayedActive = active && activeTime.current >= delay;
    fade.current = fadeTo(fade.current, delayedActive ? 1 : 0, dt, 3.3);
    const opacity = fade.current;
    const wide = viewport.width > 6;
    const compact = viewport.width < 5;
    const zoom = smooth((activeTime.current - delay) / 2.4);
    if (points.current) {
      points.current.visible = opacity > 0.01;
      if (placement === "process") {
        points.current.position.x = wide ? 2.55 : 0.7;
        points.current.position.y = compact ? -0.92 : -0.04;
        points.current.position.z = 0;
        points.current.scale.setScalar(normalized.scale * 0.46 * (0.94 + zoom * 0.08));
      } else {
        points.current.position.x = wide ? 1.55 : 0;
        points.current.position.y = compact ? 0.78 : wide ? 0.08 : -0.36;
        points.current.position.z = 0;
        points.current.scale.setScalar(normalized.scale * (compact ? 0.6 : 1) * (0.95 + zoom * 0.08));
      }
      points.current.rotation.y = THREE.MathUtils.lerp(-0.22, 0.08, zoom);
      points.current.rotation.x = THREE.MathUtils.lerp(0.04, -0.04, zoom);
    }
    setOpacity(material.current, opacity * 0.96 * opacityScale);
  });

  return (
    <points ref={points}>
      <primitive object={normalized.geometry} attach="geometry" />
      <pointsMaterial
        ref={material}
        size={size}
        vertexColors={normalized.hasColor}
        color={color}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function SolutionMemory({ active }) {
  return (
    <Suspense fallback={<ProceduralCloud active={active} />}>
      <NormalizedPLY active={active} path={presentationAssets.sourcePointCloud} />
    </Suspense>
  );
}

function ProceduralCloud({ active, count = 4500, opacityScale = 1 }) {
  const points = useRef();
  const material = useRef();
  const fade = useStageFade(active, 3.8);
  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = ["#d7b36a", "#a4c7ba", "#ee8f64"];

    for (let i = 0; i < count; i++) {
      const layer = Math.floor(Math.random() * 4);
      positions[i * 3] = (Math.random() - 0.5) * 4.2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2.2 + layer * 0.08;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3.2;
      const c = new THREE.Color(palette[i % palette.length]);
      const v = 0.65 + Math.random() * 0.35;
      colors[i * 3] = c.r * v;
      colors[i * 3 + 1] = c.g * v;
      colors[i * 3 + 2] = c.b * v;
    }

    return { positions, colors };
  }, [count]);

  useFrame((state) => {
    const opacity = fade.current;
    if (points.current) {
      points.current.visible = opacity > 0.01;
      points.current.rotation.y = state.clock.elapsedTime * 0.12;
    }
    setOpacity(material.current, opacity * 0.82 * opacityScale);
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={data.positions} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={data.colors} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        ref={material}
        size={0.028}
        vertexColors
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function PipelineParticles({ active, from, to, color = "#d8b05f", count = 160, opacityScale = 1 }) {
  const geometry = useRef();
  const material = useRef();
  const fade = useStageFade(active, 4.2);
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const colors = useMemo(() => {
    const values = new Float32Array(count * 3);
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      values[i * 3] = c.r;
      values[i * 3 + 1] = c.g;
      values[i * 3 + 2] = c.b;
    }
    return values;
  }, [color, count]);

  useFrame((state) => {
    const opacity = fade.current;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const p = (t * 0.28 + i / count) % 1;
      positions[i * 3] = THREE.MathUtils.lerp(from[0], to[0], p);
      positions[i * 3 + 1] = THREE.MathUtils.lerp(from[1], to[1], p) + Math.sin(p * Math.PI) * 0.26;
      positions[i * 3 + 2] = THREE.MathUtils.lerp(from[2], to[2], p);
    }
    if (geometry.current) geometry.current.attributes.position.needsUpdate = true;
    setOpacity(material.current, opacity * 0.76 * opacityScale);
  });

  return (
    <points>
      <bufferGeometry ref={geometry}>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={colors} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        ref={material}
        size={0.035}
        vertexColors
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function VideoPlate() {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.8, 1.08, 0.08]} />
        <meshBasicMaterial color="#151613" transparent opacity={0} userData={{ baseOpacity: 0.86 }} />
      </mesh>
      <mesh position={[0, 0, 0.055]}>
        <planeGeometry args={[1.56, 0.78]} />
        <meshBasicMaterial color="#7c8f83" transparent opacity={0} userData={{ baseOpacity: 0.78 }} />
      </mesh>
      <mesh position={[-0.26, 0.08, 0.06]}>
        <planeGeometry args={[0.84, 0.42]} />
        <meshBasicMaterial color="#eadcbd" transparent opacity={0} userData={{ baseOpacity: 0.38 }} />
      </mesh>
      <mesh position={[0.38, -0.22, 0.061]}>
        <planeGeometry args={[0.58, 0.1]} />
        <meshBasicMaterial color="#ec8f64" transparent opacity={0} userData={{ baseOpacity: 0.74 }} />
      </mesh>
    </group>
  );
}

function makeAsusTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111111";
  ctx.font = "900 78px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ASUS", canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function GX10Node() {
  const labelTexture = useMemo(() => makeAsusTexture(), []);

  useEffect(() => () => labelTexture.dispose(), [labelTexture]);

  return (
    <group rotation={[0.12, -0.42, 0.02]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.1, 0.58, 1.42]} />
        <meshStandardMaterial
          color="#c9c8c1"
          metalness={0.82}
          roughness={0.22}
          emissive="#ffffff"
          emissiveIntensity={0.03}
          transparent
          opacity={0}
          userData={{ baseOpacity: 1 }}
        />
      </mesh>
      <mesh position={[0, 0.04, 0.725]}>
        <planeGeometry args={[1.05, 0.38]} />
        <meshBasicMaterial
          map={labelTexture}
          transparent
          opacity={0}
          toneMapped={false}
          userData={{ baseOpacity: 0.9 }}
        />
      </mesh>
      <mesh position={[0, 0.31, -0.34]}>
        <boxGeometry args={[1.52, 0.035, 0.44]} />
        <meshStandardMaterial
          color="#eceae2"
          metalness={0.7}
          roughness={0.16}
          emissive="#d6c998"
          emissiveIntensity={0.16}
          transparent
          opacity={0}
          userData={{ baseOpacity: 0.8 }}
        />
      </mesh>
      {[-0.68, -0.34, 0, 0.34, 0.68].map((x) => (
        <mesh key={x} position={[x, -0.01, 0.725]}>
          <boxGeometry args={[0.18, 0.16, 0.025]} />
          <meshBasicMaterial color="#272725" transparent opacity={0} userData={{ baseOpacity: 0.42 }} />
        </mesh>
      ))}
      <mesh position={[0, -0.33, 0]}>
        <boxGeometry args={[1.7, 0.08, 1.08]} />
        <meshBasicMaterial color="#7d7b73" transparent opacity={0} userData={{ baseOpacity: 0.48 }} />
      </mesh>
    </group>
  );
}

function MiniPointMemory({ active, opacityScale = 1 }) {
  return (
    <group scale={0.5}>
      <ProceduralCloud active={active} count={2200} opacityScale={opacityScale} />
    </group>
  );
}

function PipelineScene({ active }) {
  const { viewport } = useThree();
  const group = useRef();
  const light = useRef();
  const fade = useStageFade(active, 4.2);
  const span = Math.min(2.85, Math.max(1.35, viewport.width * 0.31));
  const compact = viewport.width < 5;
  const opacityScale = compact ? 0.2 : 1;

  useFrame((state) => {
    const opacity = fade.current;
    const visualOpacity = opacity * opacityScale;
    if (group.current) {
      group.current.visible = opacity > 0.01;
      group.current.position.y = compact ? -1.28 : 0.15;
      group.current.scale.setScalar(compact ? 0.72 : 1);
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.22) * 0.07;
      group.current.traverse((child) => {
        const materials = child.material
          ? Array.isArray(child.material)
            ? child.material
            : [child.material]
          : [];
        materials.forEach((mat) => {
          if (mat.type === "PointsMaterial") return;
          setOpacity(mat, visualOpacity * (mat.userData?.baseOpacity ?? 1));
        });
      });
    }
    if (light.current) light.current.intensity = visualOpacity * 2.4;
  });

  return (
    <group ref={group} position={[0, 0.15, 0]}>
      <group position={[0, 0, 0]}>
        <GX10Node />
      </group>
      <PipelineParticles active={active} from={[-span + 0.95, 0, 0]} to={[-0.88, 0, 0]} color="#a4c7ba" opacityScale={opacityScale} />
      <PipelineParticles active={active} from={[0.88, 0, 0]} to={[span - 0.95, 0, 0]} color="#e0a94f" opacityScale={opacityScale} />
      <pointLight ref={light} position={[0, 3.5, 3]} intensity={0} color="#d8b05f" />
    </group>
  );
}

function ProcessPointCloud({ active }) {
  return (
    <Suspense fallback={<MiniPointMemory active={active} opacityScale={0.7} />}>
      <NormalizedPLY
        active={active}
        path={presentationAssets.pipelinePointCloud}
        placement="process"
        delay={1.15}
        size={0.018}
      />
    </Suspense>
  );
}

function StatsComputeField({ active }) {
  const { viewport } = useThree();
  const group = useRef();
  const ringA = useRef();
  const ringB = useRef();
  const light = useRef();
  const fade = useStageFade(active, 4);

  useFrame((state) => {
    const opacity = fade.current;
    const compact = viewport.width < 5;
    if (group.current) {
      group.current.visible = opacity > 0.01;
      group.current.position.x = viewport.width > 6 ? 2.05 : 0;
      group.current.position.y = compact ? -1.0 : -0.05;
      group.current.scale.setScalar(compact ? 0.78 : 1.1);
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.35) * 0.16;
      group.current.traverse((child) => {
        const materials = child.material
          ? Array.isArray(child.material)
            ? child.material
            : [child.material]
          : [];
        materials.forEach((mat) => {
          if (mat.type === "PointsMaterial") return;
          setOpacity(mat, opacity * (mat.userData?.baseOpacity ?? 1));
        });
      });
    }
    setOpacity(ringA.current, opacity * 0.72);
    setOpacity(ringB.current, opacity * 0.5);
    if (light.current) light.current.intensity = opacity * 2.1;
  });

  return (
    <group ref={group}>
      <group scale={1.18}>
        <GX10Node />
      </group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.42, 0.012, 10, 128]} />
        <meshBasicMaterial ref={ringA} color="#e7b160" transparent opacity={0} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0.4, 0]}>
        <torusGeometry args={[1.78, 0.01, 10, 128]} />
        <meshBasicMaterial ref={ringB} color="#9fd5c3" transparent opacity={0} />
      </mesh>
      <pointLight ref={light} position={[0, 2.5, 2.5]} color="#e7b160" intensity={0} />
    </group>
  );
}

function CreditsField({ active }) {
  const group = useRef();
  const leftRing = useRef();
  const rightRing = useRef();
  const fade = useStageFade(active, 4);

  useFrame((state) => {
    const opacity = fade.current;
    if (group.current) {
      group.current.visible = opacity > 0.01;
      group.current.rotation.y = state.clock.elapsedTime * 0.055;
    }
    setOpacity(leftRing.current, opacity * 0.85);
    setOpacity(rightRing.current, opacity * 0.85);
  });

  return (
    <group ref={group} position={[0, -0.2, 0]}>
      <ProceduralCloud active={active} count={6500} />
      <mesh position={[-1.05, 0.28, 0]}>
        <torusGeometry args={[0.72, 0.01, 12, 96]} />
        <meshBasicMaterial ref={leftRing} color="#a4c7ba" transparent opacity={0} />
      </mesh>
      <mesh position={[1.05, -0.2, 0]} rotation={[0.2, 0.1, 0]}>
        <torusGeometry args={[0.72, 0.01, 12, 96]} />
        <meshBasicMaterial ref={rightRing} color="#ec8f64" transparent opacity={0} />
      </mesh>
    </group>
  );
}

export function Experience() {
  const slide = useAtomValue(slideAtom);

  return (
    <>
      <ambientLight intensity={0.72} />
      <pointLight position={[3, 4, 4]} intensity={1.2} color="#f0d184" />
      <pointLight position={[-3, -2, 5]} intensity={0.65} color="#8fbcb2" />

      <TitleGlobe active={slide === 0} />
      <PipelineScene active={slide === 3} />
      <StatsComputeField active={slide === 4} />
      <CreditsField active={slide === 5} />
    </>
  );
}

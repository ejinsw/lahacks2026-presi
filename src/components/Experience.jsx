import { Suspense, useEffect, useMemo, useRef } from "react";
import { useAtomValue } from "jotai";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
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


// Each particle gets a fixed orbital plane (random tilt) and a speed multiplier.
// They all orbit at roughly the globe surface radius + a small spread.
const ORBIT_COUNT = 16;
const orbitData = Array.from({ length: ORBIT_COUNT }, (_, i) => ({
  tiltX: (Math.random() - 0.5) * Math.PI,       // random plane tilt
  tiltZ: (Math.random() - 0.5) * Math.PI,
  phase:  (i / ORBIT_COUNT) * Math.PI * 2,       // spread starting angles
  speed:  0.18 + Math.random() * 0.28,           // vary speed per particle
  radius: 1.92 + Math.random() * 0.28,           // slightly outside the wire sphere
}));

function TitleGlobe({ active }) {
  const { viewport } = useThree();
  const group = useRef();
  const wireMat = useRef();
  const orbitGeo = useRef();
  const orbitMat = useRef();
  const fade = useStageFade(active, 4.6);
  const isWide = viewport.width > 6.2;

  // Pre-allocate position buffer for all orbit particles
  const orbitPos = useMemo(() => new Float32Array(ORBIT_COUNT * 3), []);

  useFrame((state) => {
    const opacity = fade.current;
    const t = state.clock.elapsedTime;

    if (group.current) {
      group.current.visible = opacity > 0.01;
      group.current.position.x = isWide ? 2.05 : 0;
      group.current.position.y = isWide ? 0.12 : -0.28;
      group.current.scale.setScalar(isWide ? 0.94 : 0.84);
      group.current.rotation.y = t * 0.26;
      group.current.rotation.x = Math.sin(t * 0.42) * 0.12;
    }

    // Update each particle position along its tilted circular orbit
    for (let i = 0; i < ORBIT_COUNT; i++) {
      const { tiltX, tiltZ, phase, speed, radius } = orbitData[i];
      const angle = phase + t * speed;
      // Base orbit in XZ plane, then tilt it
      const cx = Math.cos(angle) * radius;
      const cy = Math.sin(angle) * radius;
      // Rotate around X axis by tiltX, then Z axis by tiltZ
      const x = cx * Math.cos(tiltZ) - cy * Math.sin(tiltX) * Math.sin(tiltZ);
      const y = cy * Math.cos(tiltX);
      const z = cx * Math.sin(tiltZ) + cy * Math.sin(tiltX) * Math.cos(tiltZ);
      orbitPos[i * 3]     = x;
      orbitPos[i * 3 + 1] = y;
      orbitPos[i * 3 + 2] = z;
    }
    if (orbitGeo.current) orbitGeo.current.attributes.position.needsUpdate = true;

    setOpacity(wireMat.current, opacity * 0.72);
    if (orbitMat.current) {
      orbitMat.current.opacity = opacity * 0.9;
      orbitMat.current.needsUpdate = true;
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[1.815, 48, 24]} />
        <meshBasicMaterial ref={wireMat} color="#efe5ca" wireframe transparent opacity={0} depthWrite={false} />
      </mesh>
      <points>
        <bufferGeometry ref={orbitGeo}>
          <bufferAttribute attach="attributes-position" array={orbitPos} count={ORBIT_COUNT} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          ref={orbitMat}
          size={0.11}
          color="#e7b160"
          sizeAttenuation
          transparent
          depthWrite={false}
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
        blending={normalized.hasColor ? THREE.NormalBlending : THREE.AdditiveBlending}
      />
    </points>
  );
}

// Three.js's PLYLoader silently drops uchar colors when an alpha channel is
// also present. This custom loader parses the binary header generically and
// always extracts red/green/blue as a Float32 color attribute.
class RGBAPLYLoader extends THREE.Loader {
  load(url, onLoad, onProgress, onError) {
    const fl = new THREE.FileLoader(this.manager);
    fl.setResponseType("arraybuffer");
    fl.load(url, (buf) => { try { onLoad(this.parse(buf)); } catch (e) { onError?.(e); } }, onProgress, onError);
  }

  parse(buffer) {
    const bytes = new Uint8Array(buffer);
    const dec = new TextDecoder();
    const marker = "end_header\n";
    let dataStart = -1;
    for (let i = 0; i < 8192 && i + marker.length <= bytes.length; i++) {
      if (dec.decode(bytes.subarray(i, i + marker.length)) === marker) { dataStart = i + marker.length; break; }
    }
    if (dataStart < 0) throw new Error("PLY: end_header not found");

    const header = dec.decode(bytes.subarray(0, dataStart));
    const vm = header.match(/element vertex (\d+)/);
    if (!vm) throw new Error("PLY: no vertex element");
    const count = parseInt(vm[1]);

    const byteSize = { float: 4, double: 8, int: 4, uint: 4, short: 2, ushort: 2, uchar: 1 };
    const props = [];
    let inVtx = false;
    for (const line of header.split("\n")) {
      const l = line.trim();
      if (l.startsWith("element vertex")) { inVtx = true; continue; }
      if (l.startsWith("element ") && inVtx) break;
      if (inVtx) {
        const m = l.match(/^property (\S+) (\S+)/);
        if (m && byteSize[m[1]] != null) props.push({ name: m[2], size: byteSize[m[1]], type: m[1] });
      }
    }

    const offsets = {};
    let off = 0;
    for (const p of props) { offsets[p.name] = { off, type: p.type }; off += p.size; }
    const stride = off;
    const le = !header.includes("big_endian");

    const pos  = new Float32Array(count * 3);
    const norm = new Float32Array(count * 3);
    const col  = new Float32Array(count * 3);
    const hasN = "nx" in offsets;
    const hasC = "red" in offsets && "green" in offsets && "blue" in offsets;

    const view = new DataView(buffer, dataStart);
    for (let i = 0; i < count; i++) {
      const b = i * stride;
      pos[i*3]   = view.getFloat32(b + offsets.x.off,  le);
      pos[i*3+1] = view.getFloat32(b + offsets.y.off,  le);
      pos[i*3+2] = view.getFloat32(b + offsets.z.off,  le);
      if (hasN) {
        norm[i*3]   = view.getFloat32(b + offsets.nx.off, le);
        norm[i*3+1] = view.getFloat32(b + offsets.ny.off, le);
        norm[i*3+2] = view.getFloat32(b + offsets.nz.off, le);
      }
      if (hasC) {
        col[i*3]   = view.getUint8(b + offsets.red.off)   / 255;
        col[i*3+1] = view.getUint8(b + offsets.green.off) / 255;
        col[i*3+2] = view.getUint8(b + offsets.blue.off)  / 255;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    if (hasN) geo.setAttribute("normal", new THREE.BufferAttribute(norm, 3));
    if (hasC) geo.setAttribute("color",  new THREE.BufferAttribute(col, 3));
    return geo;
  }
}

function SolutionPLY({ active }) {
  const source = useLoader(RGBAPLYLoader, presentationAssets.sourcePointCloud);
  const points = useRef();
  const mat = useRef();
  const fade = useRef(0);
  const activeTime = useRef(0);
  const { viewport } = useThree();

  const normalized = useMemo(() => {
    const geometry = source.clone();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    geometry.translate(-center.x, -center.y, -center.z);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const hasColor = Boolean(geometry.getAttribute("color"));
    return { geometry, scale: 7.0 / maxDim, hasColor };
  }, [source]);

  useEffect(() => () => normalized.geometry.dispose(), [normalized.geometry]);

  useFrame((_, dt) => {
    activeTime.current = active ? activeTime.current + dt : 0;
    fade.current = fadeTo(fade.current, active ? 1 : 0, dt, 3.3);
    const opacity = fade.current;
    // slow continuous fly-through — always moving forward, no end point
    const flySpeed = 0.1; // units per second through the cloud
    const zOffset = activeTime.current * flySpeed;

    if (points.current) {
      points.current.visible = opacity > 0.01;
      points.current.position.x = viewport.width > 6 ? 0 : 0;
      points.current.position.y = 0.2;
      // camera is at z=8, cloud center at z=0; start the cloud close so
      // we're already inside it — pull it toward viewer continuously
      points.current.position.z = 3 + zOffset;
      // large scale so the cloud surrounds the camera
      points.current.scale.setScalar(normalized.scale * 1.4);
      points.current.rotation.set(0, 0, 0);
    }
    if (mat.current) {
      mat.current.opacity = opacity * 0.97;
      mat.current.needsUpdate = true;
    }
  });

  return (
    <points ref={points}>
      <primitive object={normalized.geometry} attach="geometry" />
      <pointsMaterial
        ref={mat}
        size={0.024}
        // color must be white so vertex colors are not tinted
        color="#ffffff"
        vertexColors={normalized.hasColor}
        sizeAttenuation
        transparent
        depthWrite={false}
      />
    </points>
  );
}

function SolutionMemory({ active }) {
  return (
    <Suspense fallback={<ProceduralCloud active={active} />}>
      <SolutionPLY active={active} />
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
      <SolutionMemory active={slide === 2} />
      <PipelineScene active={slide === 3} />
      <StatsComputeField active={slide === 4} />
    </>
  );
}

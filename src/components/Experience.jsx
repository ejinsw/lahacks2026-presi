import { useRef, useMemo, useEffect, useState, Suspense, useCallback } from "react";
import { useFrame, useThree, useLoader } from "@react-three/fiber";
import {
  CameraControls,
  Environment,
  Float,
  Html,
  MeshDistortMaterial,
  MeshTransmissionMaterial,
  RoundedBox,
  Stars,
} from "@react-three/drei";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader";
import { useAtom } from "jotai";
import * as THREE from "three";
import { slideAtom } from "./Overlay";

// ── Shaders (inspired by LAHacks particle.vert/.frag) ────────────────────────
//
// PLY raw point clouds: reads the `color` vertex attribute baked by PLYLoader.
// Procedural clouds:    same shader, colors supplied as a per-vertex attribute.
// Both produce circular, soft-edge, perspective-correct splats.

const PLY_VERT = /* glsl */`
precision highp float;
attribute vec3 color;
uniform float uSize;
varying vec3 vColor;

void main() {
  vColor = color;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = uSize * (300.0 / -mv.z);
  gl_Position  = projectionMatrix * mv;
}`;

const PLY_FRAG = /* glsl */`
precision highp float;
varying vec3 vColor;

void main() {
  vec2  uv   = gl_PointCoord * 2.0 - 1.0;
  float dist = length(uv);
  if (dist > 1.0) discard;
  float alpha = 1.0 - smoothstep(0.35, 1.0, dist);
  gl_FragColor = vec4(vColor, alpha * 0.94);
}`;

// Procedural particles get a soft inner glow, matching LAHacks' "uColor + 0.3" trick
const PARTICLE_FRAG = /* glsl */`
precision highp float;
varying vec3 vColor;

void main() {
  vec2  uv   = gl_PointCoord * 2.0 - 1.0;
  float dist = length(uv);
  if (dist > 1.0) discard;
  float core  = 1.0 - smoothstep(0.0, 0.45, dist);
  float halo  = 1.0 - smoothstep(0.3, 1.0,  dist);
  float alpha = halo * 0.82 + core * 0.18;
  gl_FragColor = vec4(vColor + core * 0.3, alpha);
}`;

// ── PLY point cloud ───────────────────────────────────────────────────────────
function PLYPointCloud({ path, size = 0.15, fallbackColor = "#aaaaaa", ...groupProps }) {
  const geometry = useLoader(PLYLoader, path);

  const scale = useMemo(() => {
    geometry.computeBoundingBox();
    const dim = new THREE.Vector3();
    geometry.boundingBox.getSize(dim);
    const maxDim = Math.max(dim.x, dim.y, dim.z);
    geometry.center();
    return 7.5 / maxDim;
  }, [geometry]);

  const material = useMemo(() => {
    const hasColor = Boolean(geometry.attributes.color);
    if (hasColor) {
      return new THREE.ShaderMaterial({
        vertexShader:   PLY_VERT,
        fragmentShader: PLY_FRAG,
        uniforms: { uSize: { value: size } },
        transparent: true,
        depthWrite:  false,
      });
    }
    // Fallback: solid-color circles
    return new THREE.ShaderMaterial({
      vertexShader: `
        precision highp float;
        uniform float uSize;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_PointSize = uSize * (300.0 / -mv.z);
          gl_Position  = projectionMatrix * mv;
        }`,
      fragmentShader: `
        precision highp float;
        uniform vec3 uFallback;
        void main() {
          vec2 uv = gl_PointCoord*2.0-1.0;
          if(length(uv)>1.0) discard;
          float a = 1.0-smoothstep(0.35,1.0,length(uv));
          gl_FragColor = vec4(uFallback,a*0.9);
        }`,
      uniforms: {
        uSize:     { value: size },
        uFallback: { value: new THREE.Color(fallbackColor) },
      },
      transparent: true,
      depthWrite: false,
    });
  }, [geometry, size, fallbackColor]);

  return (
    <group scale={scale} {...groupProps}>
      <points>
        <primitive object={geometry} attach="geometry" />
        <primitive object={material} attach="material" />
      </points>
    </group>
  );
}

// ── Procedural particle cloud ─────────────────────────────────────────────────
function ParticleCloud({ count = 8000, color = "#ffffff", shape = "sphere", size = 1.2, spread = 2 }) {
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      let x = 0, y = 0, z = 0;
      if (shape === "sphere") {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = 2 * Math.PI * Math.random();
        const r = spread * (0.5 + 0.5 * Math.random());
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      } else if (shape === "scattered") {
        x = (Math.random() - 0.5) * spread * 3;
        y = (Math.random() - 0.5) * spread * 2.5;
        z = (Math.random() - 0.5) * spread * 3;
      } else if (shape === "room") {
        const face = Math.floor(Math.random() * 5);
        if      (face===0){x=(Math.random()-.5)*spread*2;y=-spread*.6;z=(Math.random()-.5)*spread*2;}
        else if (face===1){x=(Math.random()-.5)*spread*2;y= spread*.6;z=(Math.random()-.5)*spread*2;}
        else if (face===2){x=-spread;y=(Math.random()-.5)*spread*1.2;z=(Math.random()-.5)*spread*2;}
        else if (face===3){x= spread;y=(Math.random()-.5)*spread*1.2;z=(Math.random()-.5)*spread*2;}
        else              {x=(Math.random()-.5)*spread*2;y=(Math.random()-.5)*spread*1.2;z=-spread;}
      } else if (shape === "flat") {
        x = (Math.random() - 0.5) * spread * 3.5;
        y = (Math.random() - 0.5) * 0.08 + Math.sin(i * 0.05) * 0.12;
        z = (Math.random() - 0.5) * spread * 2.5;
      }
      pos[i*3]=x; pos[i*3+1]=y; pos[i*3+2]=z;
      const v = 0.55 + Math.random() * 0.45;
      col[i*3]=c.r*v; col[i*3+1]=c.g*v; col[i*3+2]=c.b*v;
    }
    return { positions: pos, colors: col };
  }, [count, color, shape, spread]);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   PLY_VERT,
    fragmentShader: PARTICLE_FRAG,
    uniforms: { uSize: { value: size } },
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  }), [size]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-color"    array={colors}    count={count} itemSize={3} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
}

// ── Slide 0 · Title ─ Tokyo Alleyway PLY ─────────────────────────────────────
function Slide0({ offset }) {
  const ref = useRef();
  useFrame((s) => { if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.01; });
  return (
    <group position={[offset, 0, 0]}>
      <group ref={ref}>
        <Suspense fallback={<ParticleCloud count={14000} color="#c8b89a" shape="scattered" size={1.0} spread={3.5} />}>
          <PLYPointCloud path="/models/TokyoAlleyway1_500k.ply" size={0.14} />
        </Suspense>
      </group>
      <pointLight position={[0,3,4]} intensity={1.4} color="#f97316" distance={10} />
      <pointLight position={[-2,-1,3]} intensity={0.7} color="#a855f7" distance={8} />
    </group>
  );
}

// ── Slide 1 · Problem ─ example.mp4 floating rectangle ───────────────────────
function VideoPlane() {
  const [aspect, setAspect] = useState(16 / 9);

  const texture = useMemo(() => {
    const vid = document.createElement("video");
    vid.src = "/videos/example.mp4";
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    vid.play().catch(() => {});
    const tex = new THREE.VideoTexture(vid);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useEffect(() => {
    const vid = texture.image;
    const onMeta = () => {
      if (vid.videoWidth && vid.videoHeight)
        setAspect(vid.videoWidth / vid.videoHeight);
    };
    vid.addEventListener("loadedmetadata", onMeta);
    if (vid.readyState >= 1) onMeta();
    return () => {
      vid.removeEventListener("loadedmetadata", onMeta);
      vid.pause();
      texture.dispose();
    };
  }, [texture]);

  const w = 6.2, h = w / aspect;
  return (
    <group>
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[w + 1.2, h + 1.2]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[w + 0.08, h + 0.08]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Slide1({ offset }) {
  return (
    <group position={[offset, 0, 0]}>
      <VideoPlane />
      <pointLight position={[0, 3, 5]} intensity={0.25} color="#ffffff" distance={8} />
    </group>
  );
}

// ── Slide 2 · Use Case ─ GaussianSplatSlide overlay handles this ──────────────
function Slide2({ offset }) {
  return <group position={[offset, 0, 0]} />;
}

// ── Slide 3 · Pipeline ─ sequential animated reveal ───────────────────────────
function ParticleStream({ from, to, count = 200, color = "#a855f7" }) {
  const geo = useRef();
  const pos = useMemo(() => new Float32Array(count * 3), [count]);
  const streamMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   PLY_VERT,
    fragmentShader: PARTICLE_FRAG,
    uniforms: { uSize: { value: 1.2 } },
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  }), []);
  const streamColors = useMemo(() => {
    const c = new THREE.Color(color);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b; }
    return col;
  }, [count, color]);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const p = ((t * 0.45 + i / count) % 1);
      pos[i*3]  =from[0]+(to[0]-from[0])*p;
      pos[i*3+1]=from[1]+(to[1]-from[1])*p+Math.sin(p*Math.PI)*0.3;
      pos[i*3+2]=from[2]+(to[2]-from[2])*p;
    }
    if (geo.current) geo.current.attributes.position.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry ref={geo}>
        <bufferAttribute attach="attributes-position" array={pos}          count={count} itemSize={3} />
        <bufferAttribute attach="attributes-color"    array={streamColors} count={count} itemSize={3} />
      </bufferGeometry>
      <primitive object={streamMat} attach="material" />
    </points>
  );
}

const NX = [-5.2, -1.8, 1.8, 5.2];
const lbl = (color) => ({
  color, fontSize:"11px", fontWeight:700, fontFamily:"sans-serif",
  background:"rgba(0,0,0,0.75)", padding:"3px 9px", borderRadius:"4px",
  letterSpacing:"0.08em", pointerEvents:"none", whiteSpace:"nowrap",
});

// Spring-like overshoot: starts at 0, overshoots ~1.1, settles at 1
function springScale(p) {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return 1 - Math.exp(-8 * p) * Math.cos(8 * p);
}

const PIPELINE_SLIDE = 3;

function Slide3({ offset }) {
  const [slide] = useAtom(slideAtom);
  const isActive = slide === PIPELINE_SLIDE;

  // stepState drives conditional JSX (stream mounts); stepRef is read in useFrame
  const [stepState, setStepState] = useState(-1);
  const stepRef  = useRef(-1);
  const progress = useRef([0, 0, 0, 0]);

  const ref0 = useRef(), ref1 = useRef(), ref2 = useRef(), ref3 = useRef();
  const nodeRefs = [ref0, ref1, ref2, ref3];

  const advance = useCallback((n) => {
    stepRef.current = n;
    setStepState(n);
  }, []);

  useEffect(() => {
    if (!isActive) {
      advance(-1);
      progress.current = [0, 0, 0, 0];
      nodeRefs.forEach(r => { if (r.current) r.current.scale.setScalar(0); });
      return;
    }
    advance(0);
    const t1 = setTimeout(() => advance(1), 2200);
    const t2 = setTimeout(() => advance(2), 4400);
    const t3 = setTimeout(() => advance(3), 6600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [isActive]);

  useFrame((_, dt) => {
    const s = stepRef.current;
    for (let i = 0; i < 4; i++) {
      if (s >= i) progress.current[i] = Math.min(1, progress.current[i] + dt * 1.6);
      const sc = springScale(progress.current[i]);
      if (nodeRefs[i].current) nodeRefs[i].current.scale.setScalar(sc);
    }
  });

  return (
    <group position={[offset, 0, 0]}>
      <Environment preset="city" />

      {/* Phone */}
      <group ref={ref0} position={[NX[0],0,0]} scale={0}>
        <mesh><boxGeometry args={[0.55,1.15,0.09]} />
          <meshStandardMaterial color="#1e3a8a" metalness={0.3} roughness={0.3} emissive="#3b82f6" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0,0.08,0.051]}><planeGeometry args={[0.44,0.72]} />
          <meshStandardMaterial color="#0f172a" emissive="#38bdf8" emissiveIntensity={0.25} />
        </mesh>
        <mesh position={[0,-0.43,0.051]}><circleGeometry args={[0.035,20]} />
          <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={0.5} />
        </mesh>
        <Html center position={[0,-1.1,0]} distanceFactor={10}><div style={lbl("#93c5fd")}>PHONE</div></Html>
      </group>

      {/* Web */}
      <group ref={ref1} position={[NX[1],0,0]} scale={0}>
        <mesh><boxGeometry args={[1.0,1.0,1.0]} />
          <MeshTransmissionMaterial backside samples={4} thickness={0.45} roughness={0.03} transmission={0.93} ior={1.5} chromaticAberration={0.06} color="#c0ffe1" />
        </mesh>
        <Html center position={[0,-1.1,0]} distanceFactor={10}><div style={lbl("#86efac")}>WEB APP</div></Html>
      </group>

      {/* GX10 */}
      <group ref={ref2} position={[NX[2],0,0]} scale={0}>
        <GX10Box scale={0.72} />
        <Html center position={[0,-1.1,0]} distanceFactor={10}><div style={lbl("#fbbf24")}>GX10</div></Html>
      </group>

      {/* Splat */}
      <group ref={ref3} position={[NX[3],0,0]} scale={0}>
        <Float speed={0.6} floatIntensity={0.3}>
          <ParticleCloud count={4000} color="#f9c0ff" shape="sphere" size={1.4} spread={0.9} />
        </Float>
        <Html center position={[0,-1.1,0]} distanceFactor={10}><div style={lbl("#f0abfc")}>3D SPLAT</div></Html>
      </group>

      {/* Streams mount only after the upstream node is fully visible */}
      {stepState >= 1 && <ParticleStream from={[NX[0]+0.42,0,0]} to={[NX[1]-0.55,0,0]} color="#60a5fa" />}
      {stepState >= 2 && <ParticleStream from={[NX[1]+0.55,0,0]} to={[NX[2]-0.65,0,0]} color="#a855f7" />}
      {stepState >= 3 && <ParticleStream from={[NX[2]+0.65,0,0]} to={[NX[3]-0.92,0,0]} color="#f0abfc" />}
    </group>
  );
}

// ── GX10 primitive ────────────────────────────────────────────────────────────
function GX10Box({ scale = 1, pulse = false }) {
  const matRef = useRef();
  useFrame((s) => {
    if (!matRef.current) return;
    matRef.current.emissiveIntensity = pulse
      ? 0.25 + 0.55*(Math.sin(s.clock.elapsedTime*Math.PI*2)*.5+.5)
      : 0.35;
  });
  return (
    <group scale={scale}>
      <RoundedBox args={[2.8,1.6,2.1]} radius={0.1}>
        <meshStandardMaterial ref={matRef} color="#0a0a14" metalness={0.94} roughness={0.1} emissive="#f59e0b" emissiveIntensity={0.35} />
      </RoundedBox>
      <mesh position={[0,0,1.06]}><planeGeometry args={[2.6,0.028]} /><meshBasicMaterial color="#f59e0b" /></mesh>
      {[-0.45,0,0.45].map((x,i) => (
        <mesh key={i} position={[x,0.81,0]} rotation={[Math.PI/2,0,0]}>
          <planeGeometry args={[0.022,1.7]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.45} />
        </mesh>
      ))}
    </group>
  );
}

// ── Slide 4 · GX10 Detail ─────────────────────────────────────────────────────
const callout = {
  color:"#fbbf24", fontSize:"12px", fontWeight:700, fontFamily:"sans-serif",
  background:"rgba(0,0,0,0.88)", padding:"9px 13px", borderRadius:"8px",
  border:"1px solid rgba(245,158,11,0.6)", minWidth:"120px", lineHeight:"1.6", pointerEvents:"none",
};
const csub = { color:"#e5e7eb", fontWeight:400, fontSize:"11px" };
const cdet = { color:"rgba(255,255,255,0.45)", fontWeight:400, fontSize:"10px" };

function Slide4({ offset }) {
  return (
    <group position={[offset,0,0]}>
      <Stars radius={12} depth={70} count={5000} factor={5} saturation={0.35} fade />
      <Float speed={0.32} floatIntensity={0.22}>
        <GX10Box pulse />
        <Html position={[-3.6,1.8,0]} distanceFactor={10} style={{pointerEvents:"none"}}>
          <div style={callout}>128 GB<br/><span style={csub}>Unified Memory</span><br/><span style={cdet}>Holds full 3DGS models in RAM</span></div>
        </Html>
        <Html position={[0,2.4,0]} distanceFactor={10} style={{pointerEvents:"none",transform:"translateX(-50%)"}}>
          <div style={{...callout,textAlign:"center"}}>1 petaFLOP<br/><span style={csub}>Neural Engine + GPU</span><br/><span style={cdet}>Trains 3M Gaussians in ~60 s</span></div>
        </Html>
        <Html position={[3.6,1.8,0]} distanceFactor={10} style={{pointerEvents:"none"}}>
          <div style={callout}>100% Local<br/><span style={csub}>Zero cloud upload</span><br/><span style={cdet}>Your data never leaves the room</span></div>
        </Html>
      </Float>
      <pointLight position={[0,5,4]} intensity={2.5} color="#f59e0b" distance={12} />
    </group>
  );
}

// ── Slide 5 · Credits ─ Bridge PLY ───────────────────────────────────────────
const TEAM = [
  { color:"#f9c0ff", name:"Elijah" },
  { color:"#c0ffe1", name:"Team"   },
  { color:"#ffdec0", name:"Member" },
  { color:"#ffc0cb", name:"Member" },
];

function Slide5({ offset }) {
  const cloudRef = useRef();
  useFrame((s) => { if (cloudRef.current) cloudRef.current.rotation.y = s.clock.elapsedTime * 0.015; });
  return (
    <group position={[offset,0,0]}>
      <group ref={cloudRef} position={[0,-0.5,-1]}>
        <Suspense fallback={<ParticleCloud count={18000} color="#6ee7b7" shape="scattered" size={0.9} spread={3.5} />}>
          <PLYPointCloud path="/models/CP_Bridge_PC_1_85M.ply" size={0.09} />
        </Suspense>
      </group>
      {TEAM.map((t,i) => (
        <group key={i} position={[(i-1.5)*2.2,1.0,2]}>
          <Float speed={0.25+i*.07} floatIntensity={0.18}>
            <RoundedBox args={[1.55,1.95,0.09]} radius={0.07}>
              <MeshDistortMaterial color={t.color} speed={1.5} distort={0.1} metalness={0.05} roughness={0.35} />
            </RoundedBox>
            <Html center distanceFactor={10} style={{pointerEvents:"none"}}>
              <div style={{color:"#111",fontSize:"13px",fontWeight:700,fontFamily:"sans-serif"}}>{t.name}</div>
            </Html>
          </Float>
        </group>
      ))}
      <Html center position={[0,-1.8,2]} distanceFactor={10} style={{pointerEvents:"none"}}>
        <div style={{color:"rgba(255,255,255,0.45)",fontSize:"10px",letterSpacing:"0.3em",fontFamily:"sans-serif",textAlign:"center",textTransform:"uppercase"}}>
          3DGS · React Three Fiber · Three.js · Apple Silicon
        </div>
      </Html>
      <pointLight position={[0,4,4]} intensity={1.5} color="#22c55e" distance={11} />
      <pointLight position={[-3,0,3]} intensity={0.8} color="#a855f7" distance={8} />
    </group>
  );
}

// ── Camera ────────────────────────────────────────────────────────────────────
function CameraHandler({ slideW }) {
  const cam = useRef();
  const [slide] = useAtom(slideAtom);
  const last = useRef(0);
  const { viewport } = useThree();

  useEffect(() => {
    const t = setTimeout(() => cam.current?.setLookAt(slide * slideW, 0, 7, slide * slideW, 0, 0), 220);
    return () => clearTimeout(t);
  }, [viewport]);

  useEffect(() => {
    if (last.current === slide) return;
    const prev = last.current;
    last.current = slide;
    cam.current
      ?.setLookAt(prev * slideW, 2, 14, prev * slideW, 0, 0, true)
      .then(() => cam.current?.setLookAt(slide * slideW, 0, 7, slide * slideW, 0, 0, true));
  }, [slide]);

  return (
    <CameraControls
      ref={cam}
      smoothTime={0.6}
      touches={{ one: 0, two: 0, three: 0 }}
      mouseButtons={{ left: 0, middle: 0, right: 0 }}
    />
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export const Experience = () => {
  const { viewport } = useThree();
  const slideW = viewport.width + 3;
  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight position={[0,8,8]} intensity={0.6} color="#a855f7" />
      <CameraHandler slideW={slideW} />
      <Slide0 offset={0 * slideW} />
      <Slide1 offset={1 * slideW} />
      <Slide2 offset={2 * slideW} />
      <Slide3 offset={3 * slideW} />
      <Slide4 offset={4 * slideW} />
      <Slide5 offset={5 * slideW} />
    </>
  );
};

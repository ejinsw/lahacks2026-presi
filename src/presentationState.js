import { atom } from "jotai";

export const slideAtom = atom(0);

export const developers = ["Elijah Won", "Henry Wei"];

export const presentationAssets = {
  globeModel: "/models/globe/scene.gltf",
  sourceVideo: "/videos/exvid.mp4",
  cloudVideo: "/videos/excloud.mp4",
  sourcePointCloud: "/models/TokyoAlleyway1_500k.ply",
  pipelineVideo: "/videos/royce.mp4",
  pipelinePointCloud: null,
};

export const techStack = [
  "React",
  "Framer Motion",
  "Three.js",
  "React Three Fiber",
  "PLY point clouds",
  "MonoGS",
  "Gaussian splats package",
  "ASUS Ascent GX10",
];

export const computeStats = [
  { value: "1–5M Gaussians", label: "reconstructed per scene, each storing 59 parameters: 3D position, rotation, scale, opacity, and spherical-harmonic color" },
  { value: "≥10 GFLOP / frame", label: "dense rasterization + gradient descent over the full Gaussian field every SLAM keyframe" },
  { value: "24+ GB VRAM", label: "minimum GPU memory to keep the full Gaussian field in RAM without paging — MonoGS requires an RTX 3090 at minimum" },
  { value: "128 GB unified", label: "GX10 memory — 5× the minimum spec, entire Gaussian field held across all SLAM iterations with zero swapping" },
];

export const slides = [
  {
    eyebrow: "Recall",
    title: "Recall",
    body: "Regenerating memory as a place you can move through.",
    tone: "title",
  },
  {
    eyebrow: "The Problem",
    title: "Memories are more than videos.",
    body:
      "For refugees forced to flee home, photos and videos may be the only record left. But a single clip only preserves one narrow path. A place is remembered through many angles, people, rooms, sounds, and fragments held by different perspectives.",
    tone: "problem",
  },
  {
    eyebrow: "The Solution",
    title: "Vid to Place.",
    body:
      "Recall turns a 2D photo or video into a 3D point cloud that can be revisited from different perspectives. The memory stops being locked to the original camera and starts behaving like a place.",
    tone: "solution",
  },
  {
    eyebrow: "Process",
    title: "Video enters GX10. A place comes back.",
    body:
      "The source capture feeds into ASUS AI compute, MonoGS reconstructs the camera path and scene geometry, and the video fades into the generated point cloud in the same spatial position.",
    tone: "process",
  },
  {
    eyebrow: "Compute",
    title: "MonoGS needs serious local compute.",
    body:
      "Gaussian Splatting SLAM is dense, iterative, and memory hungry. GX10-class hardware lets Recall process the reconstruction locally instead of sending intimate home footage to a distant GPU queue.",
    tone: "stats",
  },
  {
    eyebrow: "Credits",
    title: "LAHacks 2026.",
    body:
      "Recall combines real-time web graphics, point cloud reconstruction, and local AI compute into a presentation-native prototype.",
    tone: "credits",
  },
];

export const SLIDE_COUNT = slides.length;

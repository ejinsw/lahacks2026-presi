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
  demo1: "/videos/demo1.mp4",
  demo2: "/videos/demo2.mp4",
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
  { value: "56 GB", label: "raw 1080p RGB for a 5-min scan at 30 FPS — 9,000 frames that a normal 8–24 GB GPU cannot hold alongside a live 3D map and active optimizer" },
  { value: "128 GB unified", label: "GX10 memory keeps video stream, active Gaussian map, optimizer state, and local AI model fully resident on one machine with zero swapping" },
  { value: "273 GB/s", label: "memory bandwidth — Gaussian Splatting is memory-bound as much as compute-bound; throughput determines how fast the scene can grow each keyframe" },
  { value: "200B params", label: "local AI inference capacity on GX10 — run a vision-language model on the reconstructed space with no cloud upload of private video or geometry" },
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
    title: "Expanding with GenAI.",
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
    title: "One machine. Full pipeline.",
    body:
      "At 1080p and 30 FPS, a 5-minute scan produces 9,000 frames and roughly 56 GB of raw RGB data. MonoGS tracks the camera, optimizes a growing 3D Gaussian map, and renders the scene — while the GX10's 128 GB unified memory, 273 GB/s bandwidth, and Blackwell GPU keep the full pipeline local. No cloud. No latency. No privacy trade-off.",
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

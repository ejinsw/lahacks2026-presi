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
  displacementStat: "/images/unstat.png",
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
  {
    value: "1 petaFLOP",
    label: "MonoGS runs 10,000 optimization iterations per memory, refining millions of Gaussians. A petaFLOP turns a thirty-second video into a walkable scene in minutes — never in the cloud.",
  },
  {
    value: "128 GB unified",
    label: "SLAM tracking and Gaussian optimization share one memory pool. No PCIe shuffling between CPU and GPU — camera path and point cloud reconstruct in lockstep, on footage too large for a consumer GPU.",
  },
  {
    value: "273 GB/s Bandwidth",
    label: "Every iteration streams the full Gaussian field through memory. The bandwidth keeps optimization from stalling and ships the finished .ply to the browser the moment training ends.",
  },
  {
    value: "200B params",
    label: "The headroom Recall hasn't touched. Captioning, semantic search, voice narration — every future feature stays on the GX10. Your memories never leave the device.",
  },
];

export const slides = [
  {
    eyebrow: "",
    title: "Recall",
    body: "Regenerating places and memories.",
    tone: "title",
  },
  {
    eyebrow: "The Problem",
    title: "Every day, 37k+ people are newly displaced.",
    body:
      "Each leaves behind a room, a street, a neighborhood that they cling to with pictures and videos.",
    tone: "problem-wide",
  },
  {
    eyebrow: "",
    title: "But memories are more than videos.",
    body: "",
    tone: "problem-gallery",
  },
  {
    eyebrow: "The Solution",
    title: "They're places.",
    body:
  "Recall transforms 2D video into navigable 3D environments, enabling users to revisit moments from any perspective. Memories become immersive, spatial experiences grounded in familiar places.",
    tone: "solution",
  },
  {
    eyebrow: "The Process",
    title: "Gaussian Splatting powered by 1 petaFLOP of AI compute.",
    body:
      "",
    tone: "process",
  },
  {
    eyebrow: "Compute",
    title: "Made possible by ASUS Ascent GX10.",
    body:
      "",
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

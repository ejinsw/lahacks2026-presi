import { atom } from "jotai";

export const slideAtom = atom(0);

export const developers = ["Elijah", "Ejin"];

export const presentationAssets = {
  globeModel: "/models/globe/scene.gltf",
  sourceVideo: "/videos/example.mp4",
  sourcePointCloud: "/models/example.ply",
  pipelineVideo: "/videos/example.mp4",
  pipelinePointCloud: "/models/example.ply",
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
  { value: "MonoGS", label: "Gaussian Splatting SLAM from monocular video" },
  { value: "1 petaFLOP", label: "AI compute available on ASUS Ascent GX10" },
  { value: "128 GB", label: "coherent unified system memory" },
  { value: "200B", label: "parameter-class local AI workload support" },
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
    title: "Memory is not a solo camera.",
    body:
      "For refugees forced to flee home, photos and videos may be the only record left. But a single clip only preserves one narrow path. A place is remembered through many angles, people, rooms, sounds, and fragments held by different people.",
    tone: "problem",
  },
  {
    eyebrow: "The Solution",
    title: "Flat memories become spatial again.",
    body:
      "Recall turns a 2D photo or video into a 3D point cloud that can be revisited from new positions. The memory stops being locked to the original camera and starts behaving like a place.",
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
    title: "Built by two developers.",
    body:
      "Recall combines real-time web graphics, point cloud reconstruction, and local AI compute into a presentation-native prototype.",
    tone: "credits",
  },
];

export const SLIDE_COUNT = slides.length;

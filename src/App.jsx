import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { Experience } from "./components/Experience";
import { Overlay } from "./components/Overlay";
import { GaussianSplatSlide } from "./components/GaussianSplatSlide";

function App() {
  return (
    <>
      <Leva hidden />
      {/* z-index stack:
          1  – R3F Canvas (all slides except use-case)
          5  – GaussianSplatSlide (slide 3 only, own WebGL canvas)
          10 – Overlay (navigation, text, always on top)  */}
      <div style={{ position: "fixed", inset: 0, zIndex: 1 }}>
        <Canvas shadows camera={{ position: [0, 0, 7], fov: 45 }}>
          <color attach="background" args={["#000008"]} />
          <Experience />
        </Canvas>
      </div>
      <GaussianSplatSlide />
      <Overlay />
    </>
  );
}

export default App;

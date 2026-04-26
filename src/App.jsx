import { Canvas } from "@react-three/fiber";
import { MotionConfig } from "framer-motion";
import { Experience } from "./components/Experience";
import { MediaLayer } from "./components/MediaLayer";
import { Overlay } from "./components/Overlay";

function App() {
  return (
    <MotionConfig transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}>
      <main className="deck-shell">
        <Canvas
          className="three-stage"
          camera={{ position: [0, 0, 8], fov: 45, near: 0.1, far: 80 }}
          gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
          dpr={[1, 2]}
        >
          <Experience />
        </Canvas>
        <MediaLayer />
        <Overlay />
      </main>
    </MotionConfig>
  );
}

export default App;

import { AnimatePresence, motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { presentationAssets, slideAtom } from "../presentationState";

const galleryItems = [
  { type: "video", className: "wide", label: "home table" },
  { type: "photo", className: "warm", label: "front room" },
  { type: "photo", className: "cool", label: "street corner" },
  { type: "video", className: "tall", label: "family clip" },
  { type: "photo", className: "paper", label: "old print" },
  { type: "photo", className: "green", label: "courtyard" },
];

function MemoryGallery() {
  return (
    <motion.div
      key="memory-gallery"
      className="memory-gallery"
      initial={{ opacity: 0, filter: "blur(10px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(10px)" }}
    >
      {galleryItems.map((item, index) => (
        <motion.div
          className={`gallery-card ${item.className}`}
          key={`${item.label}-${index}`}
          initial={{ opacity: 0, y: 22, rotate: index % 2 ? 2.4 : -2.4 }}
          animate={{ opacity: 1, y: 0, rotate: index % 2 ? 1.1 : -1.1 }}
          transition={{ delay: index * 0.07, duration: 0.7 }}
        >
          {item.type === "video" ? (
            <video src={presentationAssets.sourceVideo} autoPlay muted loop playsInline />
          ) : (
            <div className="photo-memory" />
          )}
          <span>{item.label}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}

function ConversionSource() {
  return (
    <motion.div
      key="conversion-source"
      className="source-memory-frame is-conversion"
      initial={{ opacity: 0, scale: 0.96, filter: "blur(10px)" }}
      animate={{
        opacity: [0, 0.95, 0.62, 0.2],
        scale: [0.96, 1, 0.995, 0.985],
        filter: ["blur(10px)", "blur(0px)", "blur(0px)", "blur(1px)"],
      }}
      exit={{ opacity: 0, scale: 0.97, filter: "blur(8px)" }}
      transition={{ duration: 4.4, times: [0, 0.22, 0.62, 1] }}
    >
      <video src={presentationAssets.sourceVideo} autoPlay muted loop playsInline />
      <motion.div
        className="memory-video-scan"
        initial={{ x: "-120%" }}
        animate={{ x: "140%" }}
        transition={{ duration: 2.1, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}

function PipelineMedia() {
  return (
    <motion.div
      key="pipeline-media"
      className="pipeline-media-layer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="pipeline-input-frame"
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: [0, 0.88, 0.38], x: [-24, 0, 42] }}
        transition={{ duration: 2.8, times: [0, 0.4, 1] }}
      >
        <video src={presentationAssets.pipelineVideo} autoPlay muted loop playsInline />
      </motion.div>

      <motion.div
        className="pipeline-output-frame"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{
          opacity: [0, 0.9, 0.54, 0.16],
          scale: [0.96, 1, 0.995, 0.985],
        }}
        transition={{ delay: 0.45, duration: 4.2, times: [0, 0.28, 0.64, 1] }}
      >
        <video src={presentationAssets.pipelineVideo} autoPlay muted loop playsInline />
        <motion.div
          className="memory-video-scan"
          initial={{ x: "-120%" }}
          animate={{ x: "140%" }}
          transition={{ delay: 0.4, duration: 1.8, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>
    </motion.div>
  );
}

export function MediaLayer() {
  const slide = useAtomValue(slideAtom);

  return (
    <div className="media-layer" aria-hidden="true">
      <AnimatePresence mode="wait">
        {slide === 1 && <MemoryGallery />}
        {slide === 2 && <ConversionSource />}
        {slide === 3 && <PipelineMedia />}
      </AnimatePresence>
    </div>
  );
}

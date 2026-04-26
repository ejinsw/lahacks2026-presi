import { AnimatePresence, motion } from "framer-motion";
import { useAtom } from "jotai";
import { useEffect } from "react";
import {
  computeStats,
  developers,
  slideAtom,
  slides,
  SLIDE_COUNT,
  techStack,
} from "../presentationState";

const slideTransition = {
  duration: 0.72,
  ease: [0.22, 1, 0.36, 1],
};

function modSlide(value) {
  return (value + SLIDE_COUNT) % SLIDE_COUNT;
}

function PipelineStrip() {
  const nodes = [
    { label: "Capture", detail: "phone video or image set" },
    { label: "ASUS GX10", detail: "local MonoGS processing" },
    { label: "Point cloud", detail: "same memory, spatialized" },
  ];

  return (
    <div className="pipeline-strip">
      {nodes.map((node, index) => (
        <div className="pipeline-step" key={node.label}>
          <motion.div
            className="pipeline-node"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.18, ...slideTransition }}
          >
            <span>{node.label}</span>
            <small>{node.detail}</small>
          </motion.div>
          {index < nodes.length - 1 && (
            <motion.div
              className="pipeline-connector"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 0.28 + index * 0.18, ...slideTransition }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function StatsBlock() {
  return (
    <div className="stats-block">
      {computeStats.map((item, index) => (
        <motion.div
          className="stat-card"
          key={item.value}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 + index * 0.08, ...slideTransition }}
        >
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

function CreditsBlock() {
  return (
    <div className="credits-block">
      <div className="developer-list">
        {developers.map((name) => (
          <div className="developer-name" key={name}>
            {name}
          </div>
        ))}
      </div>
      <div className="stack-list">
        {techStack.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </div>
  );
}

export function Overlay() {
  const [slide, setSlide] = useAtom(slideAtom);
  const current = slides[slide];

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === " ") {
        setSlide((value) => modSlide(value + 1));
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        setSlide((value) => modSlide(value - 1));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setSlide]);

  return (
    <div className="deck-overlay">
      <header className="deck-header">
        <button className="brand-mark" onClick={() => setSlide(0)} type="button">
          Recall
        </button>
        <div className="deck-count">
          {String(slide + 1).padStart(2, "0")} / {String(SLIDE_COUNT).padStart(2, "0")}
        </div>
      </header>

      <div className="side-nav">
        <button type="button" aria-label="Previous slide" onClick={() => setSlide((value) => modSlide(value - 1))}>
          ‹
        </button>
        <button type="button" aria-label="Next slide" onClick={() => setSlide((value) => modSlide(value + 1))}>
          ›
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={slide}
          className={`slide-copy slide-${current.tone}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={slideTransition}
        >
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, ...slideTransition }}
          >
            {current.eyebrow}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, ...slideTransition }}
          >
            {current.title}
          </motion.h1>
          <motion.p
            className="slide-body"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, ...slideTransition }}
          >
            {current.body}
          </motion.p>

          {slide === 3 && <PipelineStrip />}
          {slide === 4 && <StatsBlock />}
          {slide === 5 && <CreditsBlock />}
        </motion.section>
      </AnimatePresence>

      <footer className="deck-progress">
        {slides.map((item, index) => (
          <button
            key={item.eyebrow}
            type="button"
            aria-label={`Go to slide ${index + 1}`}
            className={index === slide ? "is-active" : ""}
            onClick={() => setSlide(index)}
          />
        ))}
      </footer>
    </div>
  );
}

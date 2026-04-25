import { atom, useAtom } from "jotai";
import { useEffect, useState } from "react";

export const slideAtom = atom(0);
export const SLIDE_COUNT = 6;

const slides = [
  // 0 – Title
  { tag: null, title: null, body: null },

  // 1 – Problem / Hook
  {
    tag: "THE PROBLEM",
    title: "Video captures light. Not space.",
    body: "Three years ago I shot 47 seconds of video at my grandmother's 80th birthday. I've watched it a hundred times. I still can't tell you what the room smelled like — where everyone was standing, what it looked like behind the camera. That data was never captured. We were saving rectangles.",
  },

  // 2 – Use Case (example.ply Gaussian Splat)
  {
    tag: "USE CASE",
    title: "A grandmother's last birthday.",
    body: "Upload the footage. 60 seconds later, the dining room exists again in three dimensions. You can walk to the corner where she sat, look back at who was standing by the door. A moment that would have been a flat rectangle is now a place you can return to.",
  },

  // 4 – Pipeline
  {
    tag: "HOW IT WORKS",
    title: "Phone → Web → GX10 → Splat",
    body: "Record on your phone. Upload through the web app. A GX10 on our desk runs structure-from-motion, trains 3 million Gaussians in ~60 seconds, and streams the 3D scene straight back to your browser. Local. Private. Fast.",
  },

  // 4 – GX10 Detail
  {
    tag: "THE HARDWARE",
    title: "128 GB · 1 petaFLOP · On-device.",
    body: "Cloud GPUs see every frame you upload. The GX10's 128 GB of unified memory holds entire Gaussian Splat models in RAM — no paging, no fragmentation. Its Neural Engine and GPU deliver a full petaFLOP of ML compute. Splatting at this quality used to need a data centre. Now it fits on a desk.",
  },

  // 5 – Credits + Team
  {
    tag: "THE TEAM",
    title: "Built in 36 hours.",
    body: "Four builders. One hackathon. Going for the GX10 hardware track — so we can keep training splats long after we leave this room.",
  },
];

export const Overlay = () => {
  const [slide, setSlide] = useAtom(slideAtom);
  const [display, setDisplay] = useState(slide);
  const [visible, setVisible] = useState(false);
  const [recallKey, setRecallKey] = useState(0);

  // initial mount fade-in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 700);
    return () => clearTimeout(t);
  }, []);

  // cross-fade on slide change
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => {
      setDisplay(slide);
      if (slide === 0) setRecallKey((k) => k + 1);
      setVisible(true);
    }, 550);
    return () => clearTimeout(t);
  }, [slide]);

  // keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown")
        setSlide((p) => (p < SLIDE_COUNT - 1 ? p + 1 : 0));
      if (e.key === "ArrowLeft" || e.key === "ArrowUp")
        setSlide((p) => (p > 0 ? p - 1 : SLIDE_COUNT - 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setSlide]);

  const { tag, title, body } = slides[display];

  return (
    <>
      <style>{`
        @keyframes recallIn {
          0%   { opacity:0; transform:scale(0.88) translateY(16px); letter-spacing:0.6em; }
          65%  { opacity:1; transform:scale(1.02) translateY(0);    letter-spacing:0.27em; }
          100% { opacity:1; transform:scale(1)    translateY(0);    letter-spacing:0.28em; }
        }
        @keyframes subIn {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      <div
        className={`fixed z-10 inset-0 flex flex-col justify-between pointer-events-none text-white
          transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        {/* Top logo */}
        <div className="flex items-center gap-2 p-7">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-xs font-bold tracking-[0.35em] uppercase text-purple-300">Recall</span>
        </div>

        {/* Left / right nav */}
        <div className="absolute inset-0 flex items-center justify-between px-4">
          <button
            className="pointer-events-auto p-2 rounded-full bg-white/5 hover:bg-white/15 transition-colors backdrop-blur-sm"
            onClick={() => setSlide((p) => (p > 0 ? p - 1 : SLIDE_COUNT - 1))}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 15.75L3 12m0 0l3.75-3.75M3 12h18" />
            </svg>
          </button>
          <button
            className="pointer-events-auto p-2 rounded-full bg-white/5 hover:bg-white/15 transition-colors backdrop-blur-sm"
            onClick={() => setSlide((p) => (p < SLIDE_COUNT - 1 ? p + 1 : 0))}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
            </svg>
          </button>
        </div>

        {/* Slide 0: RECALL hero */}
        {display === 0 && visible && (
          <div key={recallKey} className="absolute inset-0 flex flex-col items-center justify-center gap-5">
            <div style={{
              fontSize: "clamp(3.5rem, 10.5vw, 8.5rem)",
              fontWeight: 900,
              letterSpacing: "0.28em",
              fontFamily: "system-ui, sans-serif",
              background: "linear-gradient(140deg, #ffffff 25%, #c084fc 75%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "recallIn 2.6s cubic-bezier(0.16,1,0.3,1) forwards",
            }}>
              RECALL
            </div>
            <div style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "0.85rem",
              letterSpacing: "0.42em",
              textTransform: "uppercase",
              fontFamily: "system-ui, sans-serif",
              animation: "subIn 1s 1.6s cubic-bezier(0.16,1,0.3,1) both",
            }}>
              Memory capsules in 3D
            </div>
          </div>
        )}

        {/* Bottom bar for slides 1–6 */}
        <div className="bg-gradient-to-t from-black/85 via-black/45 to-transparent pt-14 pb-9 px-10 flex flex-col gap-2">
          {tag && (
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-purple-400">{tag}</span>
          )}
          {title && (
            <h1 className="text-2xl font-extrabold tracking-tight leading-snug max-w-2xl">{title}</h1>
          )}
          {body && (
            <p className="text-sm text-white/60 max-w-xl leading-relaxed">{body}</p>
          )}

          {/* Progress dots */}
          <div className="flex gap-2 mt-5">
            {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
              <button
                key={i}
                className={`pointer-events-auto h-2 rounded-full transition-all duration-300 ${
                  i === display ? "bg-purple-400 w-7" : "w-2 bg-white/25 hover:bg-white/55"
                }`}
                onClick={() => setSlide(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

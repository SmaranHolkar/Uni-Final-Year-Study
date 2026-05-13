import { useEffect, useRef, useState } from "react";

// Scroll reveal hook
export const useReveal = (threshold = 0.1) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
};

// Scroll reveal component
export const Reveal = ({ children, delay = 0, className = "" }) => {
  const [ref, visible] = useReveal();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(28px)",
      transition: `opacity 0.75s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.75s cubic-bezier(.16,1,.3,1) ${delay}s`,
    }}>
      {children}
    </div>
  );
};

// Dot grid background
export const DotGrid = () => (
  <div style={{
    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
    zIndex: 0, pointerEvents: "none",
    backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.1) 1.5px, transparent 1.5px)",
    backgroundSize: "36px 36px",
    opacity: 1,
  }} />
);

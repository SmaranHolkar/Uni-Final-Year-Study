const DotGrid = () => (
  <div style={{
    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
    zIndex: 0, pointerEvents: "none",
    backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)",
    backgroundSize: "28px 28px",
  }} />
);

export default function PublicPageBackground({ children }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
      <DotGrid />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

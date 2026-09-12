import React from "react";

// Draws the signature iridescent glow and concentric circles ambient backdrop
const AmbientBackdrop = () => (
  <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
    {/* Concentric circle lines */}
    <div className="absolute right-[5%] top-[8%] w-[600px] h-[600px] flex items-center justify-center opacity-40">
      <div className="absolute w-[580px] h-[580px] rounded-full border border-[#2e2e33]" />
      <div className="absolute w-[440px] h-[440px] rounded-full border border-[#2e2e33]" />
      <div className="absolute w-[300px] h-[300px] rounded-full border border-[#2e2e33]" />

      {/* Signature iridescent sphere */}
      <div
        className="w-[320px] h-[320px] rounded-full filter blur-[40px] opacity-40"
        style={{
          background:
            "linear-gradient(255deg, rgb(250, 203, 14), rgb(240, 107, 168) 30%, rgb(120, 186, 230) 65%, rgb(255, 255, 255))",
        }}
      />
    </div>

    {/* Subtle secondary glow bottom left */}
    <div
      className="absolute -left-[10%] -bottom-[10%] w-[500px] h-[500px] rounded-full filter blur-[80px] opacity-20"
      style={{
        background: "radial-gradient(circle, rgba(120, 186, 230, 0.4), transparent 70%)",
      }}
    />
  </div>
);

// Applies the unified public-page background and keeps page content in the foreground.
export default function PublicPageBackground({ children }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#121214] text-[#f0f0ee] antialiased">
      <AmbientBackdrop />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

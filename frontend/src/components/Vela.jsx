// Renders the animated Vela branding star and its CSS keyframes.
import React from 'react';

const velaStyles = `
  @keyframes velaGlow {
    0%, 100% {
      filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.4)) drop-shadow(0 0 16px rgba(59, 130, 246, 0.2));
      transform: scale(1) translateY(0px);
    }
    50% {
      filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.7)) drop-shadow(0 0 30px rgba(59, 130, 246, 0.4));
      transform: scale(1.05) translateY(-3px);
    }
  }

  @keyframes velaShimmer {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.85;
    }
  }

  .vela-pulsing-star-container {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .vela-star-halo {
    position: absolute;
    width: 75px;
    height: 75px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
    animation: velaGlow 3s ease-in-out infinite;
    filter: blur(8px);
    z-index: 0;
  }

  .vela-pulsing-star {
    animation: velaGlow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite, velaShimmer 3s ease-in-out infinite;
    position: relative;
    z-index: 1;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
  }

  .vela-pulsing-star polygon {
    filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.3));
  }
`;

// Renders the animated Vela star graphic with inline CSS effects.
export default function Vela() {
    return (
        <>
            <style>{velaStyles}</style>
            <div className="vela-pulsing-star-container">
                <div className="vela-star-halo"></div>
                <svg
                    className="vela-pulsing-star"
                    viewBox="0 0 100 100"
                    width="60"
                    height="60"
                >
                    <defs>
                        <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{stopColor: '#3b82f6', stopOpacity: 1}} />
                            <stop offset="100%" style={{stopColor: '#1e40af', stopOpacity: 1}} />
                        </linearGradient>
                    </defs>
                    <polygon
                        points="50,10 61,40 92,40 67,60 78,90 50,70 22,90 33,60 8,40 39,40"
                        fill="url(#starGradient)"
                    />
                </svg>
            </div>
        </>
    );
}

import React from 'react';

/**
 * Vela Mascot - Authentic 9x9 LED Dot Matrix Engine
 * Every facial feature and animation is 100% physically locked to exact integer grid coordinates (cx: 10 + c*10, cy: 10 + r*10).
 * State changes (blinking, breathing, loading) occur directly on the LED nodes without coordinate displacement.
 */
export default function Vela({ size = 60, loading = false, color = '#5A7D99', className = '' }) {
  const primaryColor = color;

  // 9x9 Matrix: 81 physical LED bulbs at (r: 0..8, c: 0..8)
  const rows = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const cols = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  // Specific Feature Node Coordinates
  const isEyebrow = (r, c) => 
    (r === 2 && (c === 1 || c === 7)) ||
    (r === 1 && (c === 2 || c === 3 || c === 5 || c === 6));

  const isUpperEye = (r, c) =>
    r === 3 && (c === 2 || c === 3 || c === 5 || c === 6);

  const isLowerEye = (r, c) =>
    r === 4 && (c === 2 || c === 3 || c === 5 || c === 6);

  const isSmile = (r, c) =>
    (r === 6 && (c === 2 || c === 6)) ||
    (r === 7 && (c === 3 || c === 4 || c === 5));

  const isFaceFeature = (r, c) =>
    isEyebrow(r, c) || isUpperEye(r, c) || isLowerEye(r, c) || isSmile(r, c);

  return (
    <div
      className={`vela-face-wrapper ${className}`}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{ overflow: 'visible', display: 'block' }}
      >
        <defs>
          <filter id="vela-node-glow-main" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.75" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Unified 9x9 LED Dot Matrix (81 Grid Nodes) */}
        {rows.map((r) =>
          cols.map((c) => {
            const active = isFaceFeature(r, c);
            const lowerEye = isLowerEye(r, c);
            const upperEye = isUpperEye(r, c);
            const eyebrow = isEyebrow(r, c);
            const smile = isSmile(r, c);

            const cx = 10 + c * 10;
            const cy = 10 + r * 10;
            const key = `led-${r}-${c}`;

            // Calculate staggered wave animation delay for loading effect
            const waveDelay = ((c + r) * 0.08).toFixed(2);

            let nodeClass = 'vela-led';
            if (active) nodeClass += ' vela-active';
            if (lowerEye) nodeClass += ' vela-lower-eye';
            if (upperEye) nodeClass += ' vela-upper-eye';
            if (eyebrow) nodeClass += ' vela-brow';
            if (smile) nodeClass += ' vela-smile';
            if (loading) nodeClass += ' vela-loading-node';

            return (
              <circle
                key={key}
                cx={cx}
                cy={cy}
                r={active ? 3.6 : 2.2}
                fill={primaryColor}
                className={nodeClass}
                filter={active ? 'url(#vela-node-glow-main)' : undefined}
                style={{
                  '--led-delay': `${waveDelay}s`,
                }}
              />
            );
          })
        )}
      </svg>

      <style>{`
        /* Base Inactive LED */
        .vela-led {
          opacity: 0.18;
          transition: opacity 0.25s ease, r 0.25s ease;
        }

        /* Active Face Features */
        .vela-active {
          opacity: 1;
        }

        /* Digital LED Blinking (Turns off lower eye LEDs to form a 1-row slit without moving off-grid) */
        .vela-lower-eye {
          animation: velaDigitalBlink 4.5s infinite ease-in-out;
        }

        .vela-upper-eye {
          animation: velaUpperEyePulse 4.5s infinite ease-in-out;
        }

        @keyframes velaDigitalBlink {
          0%, 88%, 100% {
            opacity: 1;
            r: 3.6px;
          }
          93%, 96% {
            opacity: 0.18;
            r: 2.2px;
          }
        }

        @keyframes velaUpperEyePulse {
          0%, 88%, 100% {
            opacity: 1;
            r: 3.6px;
          }
          93%, 96% {
            opacity: 1;
            r: 3.8px;
          }
        }

        /* Subtle Alive Breathing Pulse on Facial Features */
        .vela-brow, .vela-smile {
          animation: velaFeatureGlow 3.5s infinite ease-in-out;
        }

        @keyframes velaFeatureGlow {
          0%, 100% {
            opacity: 0.92;
            r: 3.5px;
          }
          50% {
            opacity: 1;
            r: 3.7px;
          }
        }

        /* Matrix Loading Wave (Energizes the entire LED grid in a diagonal wave without affine scaling) */
        .vela-loading-node.vela-active {
          animation: velaActiveLoadingWave 1.4s infinite ease-in-out;
          animation-delay: var(--led-delay, 0s);
        }

        .vela-loading-node:not(.vela-active) {
          animation: velaBgLoadingWave 1.4s infinite ease-in-out;
          animation-delay: var(--led-delay, 0s);
        }

        @keyframes velaActiveLoadingWave {
          0%, 100% {
            opacity: 0.85;
            r: 3.5px;
          }
          50% {
            opacity: 1;
            r: 4.1px;
          }
        }

        @keyframes velaBgLoadingWave {
          0%, 100% {
            opacity: 0.16;
            r: 2.2px;
          }
          50% {
            opacity: 0.45;
            r: 2.8px;
          }
        }
      `}</style>
    </div>
  );
}

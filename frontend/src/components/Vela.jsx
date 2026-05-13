import React from 'react';

/**
 * Vela Mascot - Expressive Dot Matrix Face
 * Hardcoded colors for testing visibility.
 */
export default function Vela({ size = 60, loading = false, className = '' }) {
  // Electric Cyan fallback
  const primaryColor = '#00E5FF'; 

  return (
    <div className={`vela-face-wrapper ${className}`} style={{ 
      width: size, 
      height: size, 
      display: 'inline-flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'transparent'
    }}>
      <svg 
        viewBox="0 0 100 100" 
        width={size} 
        height={size}
        style={{ overflow: 'visible', display: 'block' }}
      >
        <g>
          {/* 9x9 Background Grid */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(r => 
            [0, 1, 2, 3, 4, 5, 6, 7, 8].map(c => (
              <circle key={`${r}-${c}`} cx={10 + c * 10} cy={10 + r * 10} r="2.5" fill={primaryColor} opacity="0.15" />
            ))
          )}
        </g>

        <g style={{ 
          animation: loading ? 'velaPulse 1.5s infinite ease-in-out' : 'none',
          transformOrigin: '50% 50%'
        }}>
          {/* Eyebrows */}
          <circle cx="20" cy="25" r="3.8" fill={primaryColor} />
          <circle cx="30" cy="22" r="3.8" fill={primaryColor} />
          <circle cx="40" cy="25" r="3.8" fill={primaryColor} />
          <circle cx="60" cy="25" r="3.8" fill={primaryColor} />
          <circle cx="70" cy="22" r="3.8" fill={primaryColor} />
          <circle cx="80" cy="25" r="3.8" fill={primaryColor} />

          {/* Eyes */}
          <g style={{ 
            animation: 'velaBlink 4s infinite', 
            transformOrigin: '50% 42%' 
          }}>
            <circle cx="30" cy="42" r="6.5" fill={primaryColor} />
            <circle cx="70" cy="42" r="6.5" fill={primaryColor} />
          </g>

          {/* Mouth */}
          <circle cx="30" cy="72" r="3.8" fill={primaryColor} />
          <circle cx="40" cy="77" r="3.8" fill={primaryColor} />
          <circle cx="50" cy="77" r="3.8" fill={primaryColor} />
          <circle cx="60" cy="77" r="3.8" fill={primaryColor} />
          <circle cx="70" cy="72" r="3.8" fill={primaryColor} />
        </g>

        <defs>
          <style>{`
            @keyframes velaBlink {
              0%, 45%, 55%, 100% { transform: scaleY(1); }
              50% { transform: scaleY(0.1); }
            }
            @keyframes velaPulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.05); opacity: 0.8; }
            }
          `}</style>
        </defs>
      </svg>
    </div>
  );
}

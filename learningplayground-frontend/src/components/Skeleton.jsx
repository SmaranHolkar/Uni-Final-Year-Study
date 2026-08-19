import React from 'react'

export function Skeleton({ className = '', style = {}, rounded = '0.5rem' }) {
  return (
    <div
      className={`bg-[#21262E] animate-pulse ${className}`.trim()}
      style={{
        borderRadius: rounded,
        ...style,
      }}
      aria-hidden
    />
  )
}

export function FullscreenSkeleton({ message = 'Loading Learning Playground...' }) {
  return (
    <div
      className="flex h-screen items-center justify-center bg-[#131519] text-[#CDD1D6]"
      role="status"
      aria-live="polite"
    >
      <div
        style={{
          width: 'min(760px, 92vw)',
          border: '1px solid #282E38',
          background: '#1A1E24',
          borderRadius: '1rem',
          padding: '1.25rem',
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <Skeleton style={{ height: '1.1rem', width: '12rem' }} />
          <Skeleton rounded="999px" style={{ height: '1.7rem', width: '7rem' }} />
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} style={{ border: '1px solid #282E38', borderRadius: '0.75rem', padding: '0.8rem' }}>
              <Skeleton style={{ height: '0.8rem', width: '65%' }} />
              <Skeleton className="mt-2" style={{ height: '1.4rem', width: '45%' }} />
              <Skeleton className="mt-2" style={{ height: '0.7rem', width: '75%' }} />
            </div>
          ))}
        </div>

        <div style={{ border: '1px solid #282E38', borderRadius: '0.75rem', marginTop: '0.9rem', padding: '0.9rem' }}>
          <Skeleton style={{ height: '0.9rem', width: '9rem' }} />
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="mt-2" style={{ height: '0.8rem', width: `${90 - index * 10}%` }} />
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-[#6E7580] font-sans">
          {message}
        </p>
      </div>
    </div>
  )
}

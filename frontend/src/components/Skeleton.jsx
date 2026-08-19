import React from 'react'

export function Skeleton({ className = '', style = {}, rounded = '0.5rem' }) {
  return (
    <div
      className={`app-skeleton ${className}`.trim()}
      style={{
        borderRadius: rounded,
        ...style,
      }}
      aria-hidden
    />
  )
}

export function FullscreenSkeleton({ message = 'Loading your workspace...' }) {
  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ background: 'var(--background)', color: 'var(--foreground)' }}
      role="status"
      aria-live="polite"
    >
      <div
        style={{
          width: 'min(760px, 92vw)',
          border: '1px solid var(--border)',
          background: 'var(--card)',
          borderRadius: '1rem',
          padding: '1.25rem',
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <Skeleton style={{ height: '1.1rem', width: '12rem' }} />
          <Skeleton rounded="999px" style={{ height: '1.7rem', width: '7rem' }} />
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} style={{ border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.8rem' }}>
              <Skeleton style={{ height: '0.8rem', width: '65%' }} />
              <Skeleton className="mt-2" style={{ height: '1.4rem', width: '45%' }} />
              <Skeleton className="mt-2" style={{ height: '0.7rem', width: '75%' }} />
            </div>
          ))}
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: '0.75rem', marginTop: '0.9rem', padding: '0.9rem' }}>
          <Skeleton style={{ height: '0.9rem', width: '9rem' }} />
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="mt-2" style={{ height: '0.75rem', width: `${95 - index * 8}%` }} />
          ))}
        </div>

        <p className="mt-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {message}
        </p>
      </div>
    </div>
  )
}

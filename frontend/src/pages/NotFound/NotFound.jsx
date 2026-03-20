import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="text-center">
        <h1 className="mb-4 text-8xl font-bold text-[var(--foreground)]">404</h1>
        <h2 className="mb-4 text-3xl text-[var(--foreground)]">Page Not Found</h2>
        <p className="mb-8 text-lg text-[var(--muted-foreground)]">
          Oops! The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="inline-block rounded-lg bg-[var(--primary)] px-6 py-3 font-semibold text-[var(--primary-foreground)] no-underline"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;

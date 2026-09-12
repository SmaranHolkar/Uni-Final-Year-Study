// Shows a clean 404 page with a link back to the home route.
import React from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';

// Renders a fallback page for unknown routes.
const NotFound = () => {
  useSEO({
    title: "Page Not Found | HydrusLearn",
    description: "The page you're looking for doesn't exist. Head back to HydrusLearn to continue your study sessions.",
    noIndex: true,
  });

  return (
    <div className="flex min-h-[90vh] items-center justify-center p-4 bg-[#121214] text-[#f0f0ee]">
      <div className="card-standard max-w-md w-full text-center py-12 px-8">
        <span className="text-sm font-mono text-[#a1a1a6] block mb-2">Error 404</span>
        <h1 className="mb-3 text-4xl font-normal text-[#f0f0ee] tracking-tight">Page not found</h1>
        <p className="mb-8 text-sm text-[#a1a1a6] leading-relaxed">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <Link
          to="/"
          className="btn-primary"
        >
          <span>Go back home</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;

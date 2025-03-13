import React from 'react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-bg-primary flex justify-center items-center">
      <div className="bg-bg-secondary p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-accent mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-text-primary mb-6">Page Not Found</h2>
        <p className="text-text-secondary mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <a
          href="/"
          className="btn-primary inline-block"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;

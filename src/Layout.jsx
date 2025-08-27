import React from 'react';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body {
          font-family: 'Inter', sans-serif;
        }
      `}</style>
      <main className="w-full max-w-md mx-auto">
        {children}
      </main>
    </div>
  );
}

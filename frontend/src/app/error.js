'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Unhandled Client Exception caught by Error Boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#090c15] text-white">
      <div className="w-full max-w-md p-6 rounded-3xl bg-[#0f172a] border border-cyan-500/30 shadow-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
          ⚠️
        </div>
        <h2 className="text-lg font-bold text-white font-outfit">DonChat Workspace Encountered an Issue</h2>
        <p className="text-xs text-gray-300 font-mono bg-black/40 p-3 rounded-xl border border-white/10 overflow-x-auto max-h-32 text-left">
          {error?.message || 'An unexpected client runtime exception occurred.'}
        </p>
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-lg"
          >
            Retry Action
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') window.location.href = '/login';
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-cyan-300 text-xs font-bold transition border border-white/10"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}

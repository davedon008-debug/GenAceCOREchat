'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090c15] text-white flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full p-6 rounded-3xl bg-[#0f172a] border border-cyan-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-white font-outfit">Workspace System Notice</h2>
          <p className="text-xs text-gray-300 font-mono bg-black/40 p-3 rounded-xl border border-white/10 overflow-x-auto max-h-32 text-left">
            {error?.message || 'A critical application error occurred.'}
          </p>
          <button
            onClick={() => reset()}
            className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-lg"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}

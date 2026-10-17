import React from 'react';

export default function MessageSkeleton() {
  return (
    <div className="flex-1 overflow-hidden p-4 pt-6 md:p-6 md:pt-8 space-y-6 animate-pulse select-none bg-[#090c15]">
      {/* Received message skeleton */}
      <div className="flex items-start gap-3 max-w-[80%] md:max-w-[65%]">
        <div className="w-9 h-9 rounded-full bg-slate-800/80 shrink-0 border border-slate-700/40" />
        <div className="space-y-2 flex-1">
          <div className="h-3 w-24 bg-slate-800/70 rounded-md" />
          <div className="h-14 w-64 bg-slate-800/40 rounded-2xl rounded-tl-sm border border-slate-700/30 backdrop-blur-sm" />
        </div>
      </div>

      {/* Sent message skeleton */}
      <div className="flex items-start justify-end gap-3 ml-auto max-w-[80%] md:max-w-[65%]">
        <div className="space-y-2 flex flex-col items-end flex-1">
          <div className="h-10 w-48 bg-indigo-950/40 rounded-2xl rounded-tr-sm border border-indigo-500/20 backdrop-blur-sm" />
        </div>
      </div>

      {/* Received message skeleton 2 */}
      <div className="flex items-start gap-3 max-w-[80%] md:max-w-[65%]">
        <div className="w-9 h-9 rounded-full bg-slate-800/80 shrink-0 border border-slate-700/40" />
        <div className="space-y-2 flex-1">
          <div className="h-3 w-20 bg-slate-800/70 rounded-md" />
          <div className="h-20 w-72 bg-slate-800/40 rounded-2xl rounded-tl-sm border border-slate-700/30 backdrop-blur-sm" />
        </div>
      </div>

      {/* Sent message skeleton 2 */}
      <div className="flex items-start justify-end gap-3 ml-auto max-w-[80%] md:max-w-[65%]">
        <div className="space-y-2 flex flex-col items-end flex-1">
          <div className="h-14 w-56 bg-indigo-950/40 rounded-2xl rounded-tr-sm border border-indigo-500/20 backdrop-blur-sm" />
        </div>
      </div>
    </div>
  );
}

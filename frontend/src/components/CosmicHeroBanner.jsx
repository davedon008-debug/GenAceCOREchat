'use client';

import { useState } from 'react';
import { Globe, Sparkles, MessageSquare, Zap, Gamepad, Heart, Compass } from 'lucide-react';

export default function CosmicHeroBanner({ title = 'Space Room', memberCount = '0' }) {
  const [activeTag, setActiveTag] = useState('General');

  const tags = [
    { id: 'General', label: 'General', icon: '💬' },
    { id: 'Tech', label: 'Tech', icon: '⚡' },
    { id: 'Gaming', label: 'Gaming', icon: '🎮' },
    { id: 'Life', label: 'Life', icon: '🌿' },
    { id: 'More', label: 'More', icon: '➕' }
  ];

  return (
    <div className="mx-4 my-3 rounded-3xl overflow-hidden relative border border-indigo-500/20 shadow-2xl bg-gradient-to-r from-[#090d1f] via-[#101735] to-[#0d132b]">
      {/* Cosmic Nebula Graphic Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,#4f46e5_0%,transparent_50%)] opacity-30 pointer-events-none" />
      <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

      <div className="relative p-5 sm:p-6 z-10 flex flex-col justify-between space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Globe className="w-4 h-4" />
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white font-outfit tracking-tight">
                {title}
              </h2>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed font-normal pt-1">
              Chat with people from around the world. Share ideas, make friends and be part of something bigger.
            </p>
          </div>
          <span className="hidden sm:inline-block text-[10px] px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold shrink-0">
            {memberCount} members
          </span>
        </div>

        {/* Category Filter Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setActiveTag(tag.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTag === tag.id
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/40'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <span>{tag.icon}</span>
              <span>{tag.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

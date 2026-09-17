'use client';

import React from 'react';
import { MessageSquare, Zap, Users, Settings } from 'lucide-react';

export default function MobileBottomNav({
  activeTab = 'chats',
  onSelectTab,
  unreadChatsCount = 0,
  onlineFriendsCount = 0
}) {
  const tabs = [
    {
      id: 'chats',
      label: 'Chats',
      icon: MessageSquare,
      badge: unreadChatsCount > 0 ? (unreadChatsCount > 99 ? '99+' : unreadChatsCount) : null,
      badgeColor: 'bg-indigo-500'
    },
    {
      id: 'spaces',
      label: 'Spaces',
      icon: Zap,
      badge: null
    },
    {
      id: 'friends',
      label: 'Friends',
      icon: Users,
      badge: onlineFriendsCount > 0 ? onlineFriendsCount : null,
      badgeColor: 'bg-emerald-500'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      badge: null
    }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c101d]/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around shadow-2xl select-none">
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab && onSelectTab(tab.id)}
            className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 active:scale-95 ${
              isActive
                ? 'text-cyan-400 font-bold'
                : 'text-gray-400 hover:text-gray-200 font-medium'
            }`}
          >
            {/* Active Indicator Glow Background */}
            {isActive && (
              <span className="absolute inset-0 bg-cyan-500/10 rounded-2xl border border-cyan-500/30 animate-in fade-in duration-150" />
            )}

            <div className="relative z-10 flex flex-col items-center">
              <div className="relative">
                <IconComponent className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-cyan-400' : 'text-gray-400'}`} />
                {tab.badge && (
                  <span className={`absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-extrabold text-white flex items-center justify-center shadow-md ${tab.badgeColor || 'bg-cyan-500'}`}>
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 font-outfit tracking-tight">
                {tab.label}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
}

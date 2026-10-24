'use client';
import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
          // Check for worker updates
          if (reg.update) {
            reg.update().catch(() => {});
          }
        })
        .catch((err) => {
          console.error('[PWA] Service Worker registration failed:', err);
        });
    }
  }, []);

  return null;
}

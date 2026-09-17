'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  const lastUpdated = 'September 17, 2026';

  return (
    <div className="min-h-screen bg-[#0d0f17] text-slate-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-cyan-900/40 via-purple-900/30 to-slate-900 border border-slate-800 rounded-2xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
                Official Compliance Document
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                DonChat Privacy Policy
              </h1>
              <p className="text-slate-400 text-sm mt-2">
                Last updated: <span className="text-cyan-400 font-medium">{lastUpdated}</span>
              </p>
            </div>

            <Link 
              href="/login" 
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors border border-slate-700 flex items-center gap-2"
            >
              ← Back to App
            </Link>
          </div>
        </div>

        {/* Content Sections */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-10 space-y-8 backdrop-blur-sm shadow-xl">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              1. Introduction & Overview
            </h2>
            <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
              Welcome to <strong>DonChat</strong>. We prioritize your privacy, data sovereignty, and communication security. 
              This Privacy Policy explains how DonChat collects, uses, protects, and handles your personal information 
              and messaging data across our iOS app, Android app, and web client.
            </p>
          </section>

          <hr className="border-slate-800" />

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              2. Information We Collect
            </h2>
            <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
              DonChat is designed with privacy-first principles. We collect only the data necessary to provide seamless, real-time messaging services:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm sm:text-base pl-2">
              <li><strong>Account Credentials:</strong> Email address, encrypted password hash, and optional display name used during registration.</li>
              <li><strong>Persona Profiles:</strong> Custom handles, avatars, and status states created within your account.</li>
              <li><strong>Communication Data:</strong> Text messages, voice note metadata, and media references (stored as encrypted URL paths).</li>
              <li><strong>Technical Diagnostics:</strong> Temporary IP connections and WebSocket identifiers used to facilitate real-time chat delivery and online status indicators.</li>
            </ul>
          </section>

          <hr className="border-slate-800" />

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              3. Media Storage & Data Minimization
            </h2>
            <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
              To ensure data efficiency and prevent bloat:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm sm:text-base pl-2">
              <li><strong>No Raw Base64 Storage:</strong> Uploaded images, documents, and voice recordings are stored as secure, isolated files. Only short URL references are maintained in our database.</li>
              <li><strong>Self-Cleaning Data (TTL):</strong> Disappearing messages and temporary requests automatically delete themselves from our system upon reaching their expiration timestamp using database Time-To-Live indexes.</li>
              <li><strong>Burn Messages:</strong> Once a burn-on-read message is revealed, its content is zeroed out and destroyed.</li>
            </ul>
          </section>

          <hr className="border-slate-800" />

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              4. Data Sharing & Third Parties
            </h2>
            <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
              <strong>We do not sell, rent, or trade your personal data or message content to third parties.</strong>
            </p>
            <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
              Data is transmitted strictly between authorized clients and our secure backend servers over HTTPS/WSS encrypted channels.
            </p>
          </section>

          <hr className="border-slate-800" />

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              5. Account Deletion & Data Erasure
            </h2>
            <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
              You retain full ownership over your account data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm sm:text-base pl-2">
              <li><strong>Account Deletion:</strong> You can delete your account or individual personas at any time through the app settings.</li>
              <li><strong>Instant Cascade Cleanup:</strong> When an account is removed, all associated messages, persona mappings, fluid space memberships, and active socket sessions are permanently deleted in real time.</li>
            </ul>
          </section>

          <hr className="border-slate-800" />

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              6. Contact & Inquiries
            </h2>
            <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
              If you have any questions or requests regarding this Privacy Policy or your personal data, please contact our support team at:
            </p>
            <a
              href="mailto:davedon008@gmail.com"
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 font-mono text-sm inline-block hover:border-cyan-500/40 transition-colors"
            >
              davedon008@gmail.com
            </a>
          </section>

        </div>

        {/* Footer */}
        <div className="text-center text-slate-500 text-xs py-4">
          &copy; {new Date().getFullYear()} DonChat Messaging Platform. All rights reserved.
        </div>

      </div>
    </div>
  );
}

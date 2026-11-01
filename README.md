# GenAce (DONCHAT) — Next-Gen Real-Time Communications & Fluid Spaces

<p align="center">
  <strong>Decentralized Multi-Persona Messaging, P2P WebRTC Calling, Ephemeral Privacy Vectors & Fluid Spaces</strong>
</p>

---

## 🌟 Overview

**GenAce** is a full-featured real-time communications platform built for web, desktop (PWA), and mobile. It provides multi-persona identity decoupling, low-latency Socket.IO messaging, WebRTC peer-to-peer audio/video calls, fluid spaces for collaboration and social games, and comprehensive privacy onboarding.

---

## 🚀 Key Features

- **Multi-Persona Identity Engine**: Switch seamlessly between Personal, Business, Gaming, and Anonymous personas under a single master account.
- **Privacy Onboarding & Discovery Gate**: User-gated privacy configuration (`whoCanFindMe`, `onlineVisibility`, `newAccountAnnouncements`) preventing non-consensual public indexing.
- **Stealth Presence Mode**: Browse privately with real-time presence masking across Socket.IO broadcasts.
- **WebRTC Audio & Video Calling**: P2P high-definition audio/video calls with custom Web Audio API procedural synthesizers, device switching, and persistent Web Push ringing.
- **Fluid Spaces & Collaboration**: Dynamic workspaces combining real-time chats, shared task boards, polls, member roles, and interactive social games (*Secret Lovers*).
- **Self-Service Space Management**: Real-time member administration and voluntary self-removal ("🚪 Leave Space") with zero admin friction.
- **Interactive Demo Showcase Mode**: Instant zero-setup tour account (`demo@donchat.com`) with automated companion guide (`@genace_guide`), locked against credential alterations or space deletion.
- **Voice Notes & Media Upload**: High-fidelity Opus voice notes with waveform audio analyzers and multi-tier file storage (Cloudinary / Local disk).
- **Universal PWA & Mobile App**: Installable Progressive Web App with service worker background calls, plus React Native mobile app (Expo).

---

## 🏗️ Architecture & Documentation

For in-depth code architecture, data models, Socket.IO network events, and WebRTC state machines, refer to:

📖 **[Full Architecture & Implementation Guide](GENACE_FULL_ARCHITECTURE_GUIDE.md)**  
⚖️ **[Web vs. Mobile Feature Parity Matrix](GENACE_FULL_ARCHITECTURE_GUIDE.md#11-platform-feature-parity--gap-analysis-web-vs-mobile)**  
📝 **[Mobile Feature Gaps & Notes](MOBILE_FEATURE_GAPS.md)**  
📱 **[Mobile Publishing Guide](PUBLISHING_GUIDE.md)**

---

## 💻 Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Lucide Icons, Web Audio API, Service Worker WebPush.
- **Backend**: Node.js, Express, Socket.IO, MongoDB & Mongoose.
- **Mobile**: React Native, Expo, React Navigation.
- **Real-Time & Media**: Socket.IO, WebRTC (PeerConnection), VAPID Web Push, Cloudinary.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- MongoDB instance (local or MongoDB Atlas)

### 1. Backend Setup
```bash
cd backend
npm install
# Configure your .env with MONGO_URI, JWT_SECRET, etc.
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) (or configured port) in your browser.

### 3. Mobile Setup
```bash
cd mobile
npm install
npx expo start
```

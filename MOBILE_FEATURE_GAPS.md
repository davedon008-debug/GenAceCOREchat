# 📱 GenAce Mobile App — Feature Gaps & Parity Notes

> **Document Status**: Live & Updated (November 2026)  
> **Target Audience**: Core Developers, Contributors, Product Team  
> **Scope**: Comparison between Web Platform (`frontend`) and Mobile Application (`mobile`)

---

## 🌟 Executive Summary

The GenAce Mobile Application (React Native / Expo) has achieved massive feature parity with the web platform, including:
- ✅ **WhatsApp / Instagram 24-Hour Status & Stories**: Text, image, and video status stories with pause/play toggle, video-completion auto-advance, privacy settings, story rings in DM conversation list & conversation header, and 0ms instant local cache.
- ✅ **Segmented Friends Hub**: 3-tab segmented layout (Suggested with Add/Remove, Contacts with Message/Remove, and Incoming Requests with Accept/Decline).
- ✅ **Contextual Avatar Profile Action Modals**: Dynamic buttons adjusting to contact vs. non-contact state.
- ✅ **Multi-Persona Identity Engine**: Real-time switching between Personal, Business, Gaming, and Anonymous personas.
- ✅ **Passcode Chat Lock**: PIN passcode protection for private DMs and Fluid Spaces.
- ✅ **Real-Time Messaging & Voice Notes**: Instant Socket.IO communication, voice recording, image/document sharing, and ephemeral burn messages.

However, several advanced features and architectural vectors present on the Web Platform (`frontend`) are **not yet implemented or are limited** on Mobile. This document outlines every single gap in detail.

---

## 🔍 Detailed Gap Analysis: Things the Mobile App Doesn't Have Yet

### 1. 🃏 Interactive Secret Lovers Card Game & SFX
- **Web**: Includes an interactive card game built directly into fluid spaces and direct messages. Features real-time turn progression, card flip animations, countdown chimes, and dedicated sound effects synthesized procedurally via `frontend/src/lib/secretLoversSFX.js`.
- **Mobile Gap**: The mobile app has no Secret Lovers game renderer, game invite cards, or game SFX. Tapping or receiving a game message renders as plain text.

---

### 2. 📞 Native WebRTC Video & Audio Streaming (Standalone APK / IPA)
- **Web**: Implements full bidirectional `RTCPeerConnection` with local and remote `<video>` and `<audio>` tracks, device selection (mic/camera switching), and Web Audio synthesis for ringtones.
- **Mobile Gap**: Mobile's `CallModal.js` is currently restricted to web runtime (`Platform.OS === 'web'`). Native iOS/Android builds require bare workflow migration (`npx expo prebuild`) with `react-native-webrtc` native drivers for hardware camera/mic stream capture.

---

### 3. 🎙️ Live Voice Note Decibel Waveform Analyser
- **Web**: `MessageInput.jsx` connects to browser `AudioContext` and `AnalyserNode` during voice note recording, dynamically drawing live dancing frequency decibel bars that react to microphone volume in real time.
- **Mobile Gap**: Mobile records voice notes via `expo-av` displaying only a static elapsed duration timer (`0:05`) without real-time audio waveform frequency visualizers.

---

### 4. 🎵 Custom Ringtone Upload & Client Sound Storage
- **Web**: `SettingsView.jsx` provides a dedicated ringtone studio (`ringtoneManager.js`) where users can upload custom MP3, WAV, or OGG audio files, audition them with live playback, and store them client-side in browser `IndexedDB`.
- **Mobile Gap**: Mobile settings only allow switching between static bundled preset audio files (`expo-av`). There is no custom audio file picker, upload flow, or persistent client sound library.

---

### 5. 👥 Space Members Roster & Inline Space Customizer in Drawer
- **Web**: `RightMembersPanel.jsx` dynamically toggles between:
  - **Space Members Mode**: Displays space member roster, owner/admin badges, 16 preset cosmic space emoji selectors, admin space deletion, member kick actions, and member voluntary self-leave ("🚪 Leave Space").
  - **General Contacts Mode**: Displays real-time online contacts with presence dots and search filtering.
- **Mobile Gap**: `MembersDrawerModal.js` on mobile only displays a general contacts list. When inside a space, it does not display the space member roster, member roles, kick buttons, or voluntary self-leave ("Leave Space") option.

---

### 6. 🛡️ Dedicated Full-Page Admin Dashboard
- **Web**: `AdminView.jsx` provides a full management suite for platform administrators, enabling live inspection of active spaces, platform-wide analytics, user ban management, and one-click space termination.
- **Mobile Gap**: Mobile provides only a compact dialog popup (`AdminModal.js`) with limited quick actions.

---

### 7. 📲 Service Worker Background Call Actions (Push Notification Hooks)
- **Web**: Integrates `public/sw.js` with Web Push notifications. Incoming calls when the browser is closed or minimized trigger persistent system notifications with interactive `📞 Answer` and `✕ Decline` action buttons that invoke backend endpoints without loading the app shell.
- **Mobile Gap**: Mobile relies on Expo Push Notifications, which currently display standard notification banners without background call action button hooks.

---

### 8. ⚡ Zero-Latency In-Memory Message Caching (LRU)
- **Web**: `messageCache.js` caches the last 100 messages for each space and conversation in client memory, enabling instant (0ms) room switching before background revalidation.
- **Mobile Gap**: While Statuses now have instant 0ms `AsyncStorage` caching, chat messages still re-fetch over the network each time a conversation is opened.

---

### 9. ⌨️ Global Hardware Keyboard Shortcuts & File Drag-and-Drop
- **Web**: Supports `Ctrl + K` global search / conversation switcher, `Esc` closing, `Enter` to send, `Shift + Enter` for new line, and drag-and-drop file upload directly onto the chat canvas.
- **Mobile Gap**: Mobile is strictly touch-driven; does not handle hardware keyboard shortcuts or document drag-and-drop.

---

### 10. 📝 Markdown & Code Block Syntax Highlighting in Chat
- **Web**: Renders formatted markdown (bold, italics, bullet lists, blockquotes) and syntax-highlighted code blocks with an inline one-click copy button.
- **Mobile Gap**: Mobile displays raw plain text with URL clickable links.

---

## 🗺️ Recommended Roadmap to Close Remaining Gaps

| Priority | Task | Implementation Path |
| :---: | :--- | :--- |
| **P1** | **Space Members & Voluntary Leave** | Update `MembersDrawerModal.js` to accept `spaceId`, fetch space members, and add "🚪 Leave Space" button. |
| **P2** | **Bare WebRTC Native Drivers** | Run `npx expo prebuild`, configure `react-native-webrtc`, and replace Web-only fallback in `CallModal.js`. |
| **P3** | **Interactive Notification Call Actions** | Configure `expo-notifications` category with `ANSWER_ACTION` and `DECLINE_ACTION` identifiers. |
| **P4** | **Secret Lovers Mobile Card UI** | Port game cards to `SecretLoversCard.js` using `react-native-reanimated` for smooth 3D card flips. |
| **P5** | **Offline Message Caching (MMKV)** | Integrate `react-native-mmkv` for 0ms room and message history rendering. |
| **P6** | **Live Audio Waveform Analyzer** | Integrate audio meter / FFT library to render animated waveform bars during recording. |

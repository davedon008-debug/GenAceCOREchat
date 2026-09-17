# 🚀 DONCHAT Complete Production Publishing & Deployment Guide

This document contains everything required to publish and deploy the **DONCHAT** ecosystem (Backend API, Next.js Web Frontend, and React Native Mobile App for Android & iOS).

---

## 1. 🖥️ Backend API & Socket Server Deployment

The backend runs on **Node.js + Express + Socket.IO + MongoDB Atlas**.

### Recommended Hosting Providers
- **Render** (Free / Cheap - https://render.com)
- **Railway** (https://railway.app)
- **DigitalOcean App Platform / VPS**
- **Heroku**

### Deployment Steps
1. Create a project/web service on your host (e.g. Render / Railway).
2. Connect your GitHub repository and set the root directory to `backend`.
3. Set the build command to `npm install` and start command to `npm start`.
4. Configure Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `5005` (or host default)
   - `MONGODB_URI` = `mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/donchat?retryWrites=true&w=majority`
   - `JWT_SECRET` = `your_strong_production_jwt_secret_key`
   - `CLOUDINARY_CLOUD_NAME` = `genace_core`
   - `CLOUDINARY_API_KEY` = `327321576889753`
   - `CLOUDINARY_API_SECRET` = `0zpPqo40VdU1R3jaWAGZ6LNsKEA`
5. Deploy! Once deployed, note down your production API URL (e.g., `https://donchat-api.onrender.com`).

---

## 2. 🌐 Web Frontend Deployment (Next.js)

The web frontend runs on **Next.js 14**.

### Recommended Hosting Providers
- **Vercel** (Official Next.js host - 1-Click Deploy - https://vercel.com)
- **Netlify**

### Deployment Steps
1. Push your code to GitHub.
2. Import the `frontend` folder into Vercel or Netlify.
3. Configure Environment Variables in the project settings:
   - `NEXT_PUBLIC_API_URL` = `https://donchat-api.onrender.com/api`
   - `NEXT_PUBLIC_SOCKET_URL` = `https://donchat-api.onrender.com`
4. Click **Deploy**. Vercel will build and host your Web App at your custom domain (e.g., `https://donchat.app`).

---

## 3. 📱 Mobile App Publishing (Android & iOS)

The mobile app is pre-configured with **Expo Application Services (EAS)** for 1-command builds.

### Option A: Build Standalone `.apk` File (For Direct Android Download & Testing)
To generate an installable Android `.apk` file that anyone can download and install:

1. Open terminal in `mobile` folder:
   ```bash
   cd mobile
   ```
2. Run the APK build command:
   ```bash
   npm run build:apk
   ```
3. Expo will compile the native code in the cloud and provide a download link for your `.apk` file!

---

### Option B: Publish to Google Play Store (Android `.aab`)
1. Open terminal in `mobile` folder:
   ```bash
   npm run build:android
   ```
2. Download the generated `.aab` file from Expo dashboard.
3. Upload the `.aab` file to your **Google Play Console** account (https://play.google.com/console).

---

### Option C: Publish to Apple App Store (iOS `.ipa`)
1. Open terminal in `mobile` folder:
   ```bash
   npm run build:ios
   ```
2. Expo will generate an `.ipa` package and submit it to **App Store Connect** / **TestFlight**.

---

### 💡 In-App Dynamic Server IP & Production URL Switcher
- The mobile app includes a built-in **Server IP & Production URL Modal**.
- Users can switch between local IP (`192.168.x.x`) or live cloud backend (`https://donchat-api.onrender.com`) directly inside the app without needing to re-compile!

---

## 📋 Pre-Publish Checklist
- [x] Backend CORS and Socket.IO allowed origins configured.
- [x] MongoDB database indexed and Cloudinary media upload enabled.
- [x] Mobile app bundle identifier set (`com.bigdon001.donchat`).
- [x] Mobile camera, microphone, and storage permissions declared in `app.json`.
- [x] Web frontend environment variable fallbacks ready for Vercel/Netlify.

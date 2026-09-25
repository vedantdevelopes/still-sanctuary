# Deployment Guide: Firebase & Vercel for STILL

This guide walks you through setting up **Firebase** for cloud sync and hosting the **STILL** web application on **Vercel**.

---

## 1. Firebase Setup (5 minutes)

### A. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or **Create a project**).
3. Name your project (e.g., `still-sanctuary`).
4. You can enable or disable Google Analytics as you prefer, then click **Create Project**.

### B. Register a Web App
1. On your project overview page, click the Web icon (`</>`) to add a web app.
2. Enter an app nickname (e.g., `still-web`).
3. (Optional) Check "Also set up Firebase Hosting" if you'd like, or leave it unchecked since we are using Vercel.
4. Click **Register app**.
5. Firebase will show your `firebaseConfig` keys. You'll need these values for Vercel and your `.env` file:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

### C. Enable Authentication
1. In the Firebase sidebar, click **Build** > **Authentication** > **Get started**.
2. Under the **Sign-in method** tab:
   - **Google**: Click Google, toggle **Enable**, select a support email, and click **Save**.
   - **Email/Password**: (Optional) Click Email/Password, toggle **Enable**, and click **Save**.
3. Under **Settings** > **Authorized domains**, ensure:
   - `localhost` is present (for local testing).
   - Add your Vercel deployment domain (e.g., `still-sanctuary.vercel.app`) once deployed.

### D. Create Cloud Firestore Database
1. In the sidebar, click **Build** > **Firestore Database** > **Create database**.
2. Choose a location closest to you or your users (e.g., `nam5 (us-central)` or `europe-west`).
3. Choose **Start in production mode** or **test mode**.
4. In the Firestore **Rules** tab, paste the contents of `firestore.rules`:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{allUserPaths=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
5. Click **Publish**.

---

## 2. Testing Locally with Firebase (Optional)

Create a file named `.env.local` in the project root:

```env
VITE_FIREBASE_API_KEY=your_api_key_from_step_1B
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Run the local development server:
```bash
npm run dev
```

---

## 3. Deploying to Vercel

### Method A: Deploy via GitHub (Recommended)
1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** > **Project**.
3. Import your STILL repository.
4. Framework Preset will automatically be detected as **Vite**.
5. Build and Output settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
6. Expand **Environment Variables** and add the 6 variables from your Firebase configuration:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
7. Click **Deploy**.
8. After deployment, copy your Vercel URL (e.g. `https://your-app.vercel.app`) and add it to Firebase Console > **Authentication** > **Settings** > **Authorized domains**.

### Method B: Deploy via Vercel CLI
If you prefer deploying from your terminal:
```bash
# Install Vercel CLI
npm i -g vercel

# Log in and deploy
vercel

# Deploy to production with environment variables
vercel --prod
```

---

## 4. Privacy & Zero-Knowledge Guarantee

Even when connected to Firebase:
- All moments, entries, and future letters are encrypted using **AES-256-GCM** client-side with a key derived from your master password using **PBKDF2 (600,000 iterations)**.
- Cloud Firestore stores **only encrypted ciphertexts and initialization vectors**.
- Neither Firebase nor Vercel ever receives your master password or plaintext thoughts.
- If you use the app without Firebase credentials or offline, it functions 100% locally in your browser's IndexedDB.

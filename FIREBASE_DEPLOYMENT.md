# 🚀 Firebase Deployment Guide for QBill

This guide explains how to deploy QBill to **Firebase Hosting** in just a few minutes.

---

### Step 1: Install Firebase CLI (One-time)
If you haven't installed the Firebase CLI globally yet, open PowerShell or your terminal and run:
```bash
npm install -g firebase-tools
```
*(Alternatively, you can prefix commands with `npx firebase-tools` without installing globally).*

---

### Step 2: Log in to Firebase
Run the login command to authenticate with your Google/Firebase account:
```bash
firebase login
```
A browser window will open asking you to sign in with your Google account. Click **Allow**.

---

### Step 3: Create or Select Your Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **"Add project"** (e.g. `qbill-store` or your preferred name).
2. Back in your terminal, connect the project by running:
```bash
firebase use --add
```
Select the project you created from the list and give it an alias (like `default`).

*(Alternatively, create a file named `.firebaserc` in the project root with:)*
```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

---

### Step 4: Build & Deploy

You can build and deploy with a single command:

#### From the project root:
```bash
npm run build --prefix frontend
firebase deploy --only hosting
```

#### Or from inside the `frontend` folder:
```bash
cd frontend
npm run deploy:firebase
```

---

### 🌐 What Happens After Deployment:
- Firebase provides you with a free, high-speed, secure HTTPS URL:
  `https://<your-project-id>.web.app` or `https://<your-project-id>.firebaseapp.com`
- All SPA routes (`/`, `/billing`, `/products`, etc.) are pre-configured to rewrite to `/index.html` via `firebase.json`.
- The offline store and local caching ensure fast loading on mobile phones and tablets.
- You can also attach your own custom domain for free in Firebase Console > Hosting > "Add custom domain".

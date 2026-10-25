# 🚀 Deployment Guide: QuantumVoice AI Billing

This project is now configured and prepared for **Vercel** deployment.

---

## 📋 What Has Been Prepared

1. **Centralized API Management (`frontend/src/config/api.ts`)**:
   - Replaced all hardcoded `http://127.0.0.1:8000` URLs across the entire frontend.
   - Dynamically reads `VITE_API_BASE_URL` from the environment in production, and automatically falls back to `http://127.0.0.1:8000` during local development.

2. **Vercel Configuration (`frontend/vercel.json` & `vercel.json`)**:
   - Configured Vite build command (`npm run build`) and output directory (`dist/public`).
   - Configured Single Page Application (SPA) client-side routing rewrites so page reloads on routes like `/login` or `/register` work seamlessly.

3. **Backend Deployment Files (`backend/requirements.txt`)**:
   - Clean production dependencies file including Django, Django REST Framework, CORS headers, Google GenAI, Qiskit, and Gunicorn.
   - Configured `ALLOWED_HOSTS = ['*']` and `CORS_ALLOW_ALL_ORIGINS = True` to accept cross-origin requests from `*.vercel.app`.

---

## 🌐 How to Deploy to Vercel

### Method 1: Deploy via Vercel CLI (Quickest)

1. Open PowerShell and navigate to the `frontend` folder:
   ```powershell
   cd frontend
   ```

2. Log into your Vercel account:
   ```powershell
   vercel login
   ```
   *(Follow the prompt in your browser to verify your email / GitHub)*

3. Deploy to Production:
   ```powershell
   vercel --prod
   ```
   - When asked **"Set up and deploy?"**, type `Y`
   - Select your scope/account
   - When asked **"Link to existing project?"**, select `N`
   - Project name: `quantumvoice-billing` (or your choice)
   - In which directory is your code located? `./`
   - Vercel will build and output your live production URL (e.g. `https://quantumvoice-billing.vercel.app`)!

---

### Method 2: Deploy via GitHub (Recommended for automatic updates)

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "QuantumVoice AI Billing ready for Vercel"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new) and log in.
   - Click **Import** next to your GitHub repository.
   - Under **Root Directory**, click **Edit** and select `frontend`.
   - Under **Build and Output Settings**:
     - Framework Preset: **Vite**
     - Build Command: `npm run build`
     - Output Directory: `dist/public`
   - (Optional) Under **Environment Variables**, add:
     - `VITE_API_BASE_URL` = `https://your-backend-url.com`
   - Click **Deploy**!

---

## ⚙️ Backend Deployment (For Live Production API)

Because Python AI workloads (PyTorch, Qiskit, Google GenAI, ReportLab) exceed Vercel's 50MB serverless limit, host the backend container on **Render** or **Railway** (free/standard tier):

### Deploying Backend on Render (Render.com):
1. Create a new **Web Service** on [render.com](https://render.com).
2. Connect your GitHub repository and set **Root Directory** to `backend`.
3. Set:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && python manage.py migrate`
   - **Start Command**: `gunicorn core.wsgi:application`
4. In **Environment Variables**, add:
   - `GEMINI_API_KEY` = your Gemini key
   - `IMAGE_GEMINI_API_KEY` = your Gemini key
5. Copy your Render URL (e.g. `https://quantumvoice-api.onrender.com`) and set it as `VITE_API_BASE_URL` in your Vercel project settings!

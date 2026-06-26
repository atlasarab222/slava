# Slava Dent Admin & Staff Portal

A full-stack dental clinic management system built with React, Express, and Supabase.

## 🚀 Deployment to Bonto.sh

If you are using **Bonto.sh**:

1. **Root Directory**: In Bonto settings, ensure the **Root Directory** (or Base Directory) is set to `/` (the root), **NOT** `/src`.
2. **Build Command**: Set this to:
   ```bash
   npm run build
   ```
3. **Start Command**: Set this to:
   ```bash
   npm start
   ```
4. **Environment Variables**: Add your Supabase credentials in the Bonto panel.

### 🛠️ Troubleshooting Bonto "Module Not Found"
If you see an error like `Cannot find module 'dist/server.cjs'`:
- It means the **Build Command** hasn't run yet. 
- Go to your Bonto panel and click **Build** or **Deploy** manually to trigger `npm run build`.
- Once the `dist` folder is created, the app will start correctly.

## 🌐 Other Deployment Options

This is a **full-stack application** with an Express backend. It cannot be hosted on static sites like GitHub Pages.

### Option 1: Render / Railway / Fly.io
1. Connect your GitHub repository.
2. Set **Build Command**: `npm run build`
3. Set **Start Command**: `npm start`
4. Add your environment variables (from `.env.example`).

### Option 2: Local Development
1. Clone the repository.
2. `npm install`
3. Create a `.env` file with your credentials.
4. `npm run dev`

## 🛠️ Tech Stack
- **Frontend**: React 19, Tailwind CSS, Motion
- **Backend**: Express (Node.js)
- **Database**: Supabase (PostgreSQL)
- **Bundling**: Vite & esbuild

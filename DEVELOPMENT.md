# Development Guide - Artery Capital

## 🚀 Quick Start

### Option 1: Run Both Frontend & Backend Together (Recommended)

```bash
# Install dependencies
npm install
cd api && npm install && cd ..

# Copy environment variables
cp .env.local.example .env.local
# Edit .env.local with your actual values

# Run both frontend and backend concurrently
npm run dev:full
```

Then visit: **http://localhost:5173** (or your Vite port)

### Option 2: Run Separately

**Terminal 1 - Backend Server:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

---

## 📋 Environment Setup

### 1. Install Dependencies

**Root dependencies (Frontend):**
```bash
npm install
```

**API dependencies (Backend):**
```bash
cd api
npm install
```

### 2. Configure Environment Variables

Copy the example file:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values:

```env
# Frontend API endpoint
VITE_API_URL=http://localhost:3001

# Supabase (get from https://supabase.com)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx...

# Resend (get from https://resend.com)
RESEND_API_KEY=re_xxx...
ADMIN_EMAIL=invest@arterycapital.co.za
FROM_EMAIL=Artery Capital <noreply@arterycapital.co.za>

# Admin password
ADMIN_PASSWORD=admin123

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:5173
```

### 3. Set Up Supabase Database

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run the schema from `schema.sql`
4. Copy Project URL and Service Role Key to `.env.local`

### 4. Set Up Resend Email

1. Create account at [resend.com](https://resend.com)
2. Verify your domain or use test mode
3. Create API key
4. Copy API key to `.env.local`

---

## 🛠️ Development Commands

### Frontend (Vite)
```bash
npm run dev          # Start frontend dev server (port 5173)
npm run build        # Build for production
npm run preview      # Preview production build
```

### Backend (Express)
```bash
npm run server       # Start backend API server (port 3001)
```

### Both
```bash
npm run dev:full     # Run frontend + backend concurrently
```

---

## 🌐 Local Development URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/api/health

### API Endpoints:

**Public:**
- `POST /api/applications/submit` - Submit application

**Admin (requires auth):**
- `GET /api/applications/list` - List all applications
- `GET /api/applications/get?id={uuid}` - Get single application

---

## 🧪 Testing the Application

### 1. Test Health Check
```bash
curl http://localhost:3001/api/health
```

Should return:
```json
{
  "success": true,
  "message": "Artery Capital API is running",
  "environment": {
    "supabase": true,
    "resend": true,
    "admin": true
  }
}
```

### 2. Test Application Submission

1. Start both frontend and backend
2. Visit http://localhost:5173
3. Click "Apply for Funding"
4. Fill out the 5-step application form
5. Submit and verify:
   - Success page with AI scoring appears
   - Application saved in Supabase database
   - Confirmation email sent (if configured)
   - Admin notification email sent (if configured)

### 3. Test Admin Dashboard

1. Visit http://localhost:5173/admin
2. Enter admin password (from `.env.local`)
3. Verify applications appear in dashboard
4. Click an application to view details
5. Test print and download functionality

---

## 🏗️ Project Structure

```
artery-capital/
├── src/                          # Frontend source code
│   ├── pages/
│   │   ├── Home.jsx             # Landing page
│   │   ├── Application.jsx      # Application form
│   │   ├── Admin.jsx            # Admin login
│   │   ├── AdminDashboard.jsx   # Admin application list
│   │   └── AdminApplicationDetail.jsx # Admin detail view
│   ├── App.jsx                  # React router setup
│   └── main.jsx                 # React entry point
│
├── api/                          # Backend API (Vercel Functions)
│   ├── applications/
│   │   ├── submit.js            # Submit application endpoint
│   │   ├── list.js              # List applications (admin)
│   │   └── get.js               # Get single application (admin)
│   ├── scoringEngine.cjs        # AI scoring algorithm
│   └── package.json             # API dependencies
│
├── lib/                          # Shared utilities
│   ├── supabase.js              # Supabase client
│   ├── email-service.js         # Email sending
│   └── email-templates.js       # Email HTML templates
│
├── public/                       # Static assets
│   └── logo.svg                 # Artery Capital logo
│
├── server.js                     # Local dev server
├── vercel.json                   # Vercel configuration
├── schema.sql                    # Database schema
├── package.json                  # Frontend dependencies
└── .env.local                    # Local environment variables (DO NOT COMMIT)
```

---

## 🔧 Troubleshooting

### "Unable to connect to server" Error

**Cause**: Backend API server not running

**Fix**:
```bash
# Start the backend server
npm run server

# Or run both frontend and backend
npm run dev:full
```

### "Supabase is not configured" Warning

**Cause**: Missing Supabase environment variables

**Fix**:
1. Check `.env.local` has `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
2. Restart the backend server: `npm run server`

### "Email service not configured" Warning

**Cause**: Missing Resend API key

**Fix**:
1. Add `RESEND_API_KEY` to `.env.local`
2. Restart backend server
3. Application still works, just no emails sent

### Database Connection Error

**Cause**: Wrong Supabase credentials or database not set up

**Fix**:
1. Verify Supabase URL and key in `.env.local`
2. Run `schema.sql` in Supabase SQL Editor
3. Check Supabase project is active

### Port Already in Use

**Frontend (5173):**
```bash
# Kill process using port 5173
lsof -ti:5173 | xargs kill -9

# Or change Vite port in vite.config.js
```

**Backend (3001):**
```bash
# Kill process using port 3001
lsof -ti:3001 | xargs kill -9

# Or set PORT environment variable
PORT=3002 npm run server
```

### Build Errors

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Clean API dependencies
cd api
rm -rf node_modules package-lock.json
npm install
```

---

## 📦 Dependencies

### Frontend (`package.json`)
- **react** - UI library
- **react-router-dom** - Client-side routing
- **vite** - Build tool and dev server
- **express** - Backend server (for local dev)
- **cors** - CORS handling
- **multer** - File upload handling
- **dotenv** - Environment variable loading
- **concurrently** - Run multiple commands

### Backend (`api/package.json`)
- **multer** - File upload middleware
- **@supabase/supabase-js** - Database client
- **resend** - Email service

---

## 🚢 Deployment

### Deploy to Vercel

1. **Push to GitHub:**
```bash
git add .
git commit -m "Ready for deployment"
git push origin your-branch
```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel auto-detects Vite configuration

3. **Set Environment Variables:**
   Go to Vercel Dashboard → Settings → Environment Variables

   Add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `RESEND_API_KEY`
   - `ADMIN_EMAIL`
   - `FROM_EMAIL`
   - `ADMIN_PASSWORD`
   - `NEXT_PUBLIC_APP_URL`

4. **Deploy:**
   - Vercel automatically deploys on push
   - Or manually trigger deployment

5. **Verify:**
   - Visit your deployment URL
   - Test application submission
   - Test admin dashboard
   - Check Vercel function logs

---

## 🔐 Security Notes

### Local Development
- Never commit `.env.local` (already in `.gitignore`)
- Use different passwords for local vs production
- Keep API keys secure

### Production
- Change `ADMIN_PASSWORD` from default
- Use environment-specific API keys
- Enable Supabase Row Level Security
- Monitor Vercel function logs
- Set up rate limiting

---

## 📊 Monitoring

### Vercel Function Logs
1. Go to Vercel Dashboard
2. Click on your deployment
3. Navigate to "Functions" tab
4. View logs for each API endpoint

### Supabase Logs
1. Go to Supabase Dashboard
2. Navigate to "Logs" section
3. Filter by service (Database, Auth, etc.)

### Email Delivery
1. Go to Resend Dashboard
2. View "Emails" section
3. Check delivery status and opens

---

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test locally
4. Commit with clear message
5. Push and create PR

---

## 📞 Support

For development issues:
1. Check this guide first
2. Review PHASE4_IMPLEMENTATION.md
3. Check ADMIN_SYSTEM.md for admin issues
4. Review Vercel/Supabase logs
5. Contact: invest@arterycapital.co.za

---

## 🎯 Common Development Tasks

### Add a New API Endpoint

1. Create file in `api/` directory
2. Export an async function handler
3. Add route in `server.js` for local dev
4. Test locally
5. Deploy to Vercel

### Modify Database Schema

1. Update `schema.sql`
2. Run SQL in Supabase SQL Editor
3. Update `lib/supabase.js` if needed
4. Test with local dev server

### Update Admin Dashboard

1. Modify components in `src/pages/Admin*.jsx`
2. Update API endpoints if needed
3. Test with real data from database
4. Ensure mobile responsive

### Change Email Templates

1. Edit `lib/email-templates.js`
2. Update HTML structure
3. Test with real email sending
4. Verify rendering in email clients

---

**Last Updated**: January 21, 2026
**Version**: 1.0

Happy coding! 🚀

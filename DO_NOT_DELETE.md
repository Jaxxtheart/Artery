# ⚠️ CRITICAL: NEVER DELETE OR MODIFY THESE CORE FEATURES

## 🚨 MANDATORY - READ BEFORE ANY CODE CHANGES

This document lists **ALL CORE FEATURES** that must **NEVER** be removed, disabled, or broken during any future development, refactoring, or updates.

---

## ✅ CORE FEATURES - DO NOT REMOVE

### 1. **Admin System** (CRITICAL - NEVER REMOVE)
**Location**: `src/pages/Admin*.jsx`, `api/applications/list.js`, `api/applications/get.js`

**Components**:
- `src/pages/Admin.jsx` - Admin login page
- `src/pages/AdminDashboard.jsx` - Application list view
- `src/pages/AdminApplicationDetail.jsx` - Detailed application view
- `api/applications/list.js` - API endpoint for listing applications
- `api/applications/get.js` - API endpoint for single application
- Admin routes in `src/App.jsx`
- Admin link in `src/pages/Home.jsx` footer

**Why Critical**: This is how you view and manage all submitted applications. Without it, you cannot access application data.

**See Also**: `ADMIN_SYSTEM.md` for complete documentation

---

### 2. **Application Portal** (CRITICAL - NEVER REMOVE)
**Location**: `src/pages/Application.jsx`

**Features**:
- 5-step application form
- Real-time validation
- Character counters
- File upload for pitch decks
- AI scoring integration
- Success page with detailed results

**Why Critical**: This is how founders apply for funding. Without it, no applications can be submitted.

---

### 3. **Backend Integration (Phase 4)** (CRITICAL - NEVER REMOVE)
**Location**: `api/` folder, `api/lib/` folder

**Components**:
- `api/applications/submit.js` - Application submission endpoint
- `api/lib/supabase.js` - Database client
- `api/lib/email-service.js` - Email notifications
- `api/lib/email-templates.js` - HTML email templates
- `api/scoringEngine.cjs` - AI scoring algorithm
- `api/health.js` - Health check and diagnostics

**Why Critical**: This saves applications to database, sends emails, and powers the admin system.

**IMPORTANT**: The `api/lib/` folder MUST stay inside the `api/` folder. DO NOT move it to project root.

---

### 4. **Database Schema** (CRITICAL - NEVER REMOVE)
**Location**: `SUPABASE_SETUP.sql`, `schema.sql`

**Tables**:
- `applications` table with all columns
- Indexes for performance
- Row Level Security policies
- Triggers for updated_at

**Why Critical**: Without this, applications cannot be saved and admin dashboard will not work.

**See Also**: `FIX_ADMIN_DASHBOARD.md` for setup instructions

---

### 5. **Main Website** (CRITICAL - NEVER REMOVE)
**Location**: `src/pages/Home.jsx`

**Features**:
- Hero section with logo
- Mission statement
- Funding offer ($15,000)
- "Apply for Funding" button
- Contact section
- Admin link in footer (subtle, don't remove!)

**Why Critical**: This is the main landing page that drives all traffic.

---

### 6. **Environment Variables** (CRITICAL - NEVER REMOVE)
**Location**: `.env.example`, Vercel dashboard

**Required Variables**:
```
SUPABASE_URL
SUPABASE_SERVICE_KEY
ADMIN_PASSWORD
ADMIN_EMAIL
FROM_EMAIL
NEXT_PUBLIC_APP_URL
RESEND_API_KEY (optional but recommended)
```

**Why Critical**: Without these, the database, admin system, and emails will not work.

---

### 7. **Vercel Configuration** (CRITICAL - DO NOT MODIFY)
**Location**: `vercel.json`

**Critical Settings**:
- Functions configuration (memory, maxDuration)
- CORS headers
- API rewrites

**Why Critical**: This makes the serverless functions work on Vercel.

---

### 8. **Dependencies** (CRITICAL - DO NOT REMOVE)
**Location**: `package.json`, `api/package.json`

**Critical Dependencies**:
- React, React Router (frontend)
- @supabase/supabase-js (database)
- resend (email)
- multer (file uploads)

**Why Critical**: Without these, the application will not run.

---

## 🔒 PROTECTED FILES - NEVER DELETE

### **Frontend**:
```
src/pages/Home.jsx
src/pages/Application.jsx
src/pages/Admin.jsx
src/pages/AdminDashboard.jsx
src/pages/AdminApplicationDetail.jsx
src/App.jsx (contains all routes)
```

### **Backend**:
```
api/applications/submit.js
api/applications/list.js
api/applications/get.js
api/scoringEngine.cjs
api/health.js
api/lib/supabase.js
api/lib/email-service.js
api/lib/email-templates.js
```

### **Configuration**:
```
vercel.json
api/package.json
package.json
.env.example
```

### **Documentation**:
```
ADMIN_SYSTEM.md
PHASE4_IMPLEMENTATION.md
FIX_ADMIN_DASHBOARD.md
SUPABASE_SETUP.sql
```

---

## ⚠️ COMMON MISTAKES TO AVOID

### ❌ **DON'T DO THIS**:
- Remove admin routes from `App.jsx`
- Remove admin link from `Home.jsx` footer
- Move `api/lib/` folder outside of `api/` directory
- Delete or rename API endpoint files
- Remove environment variables from Vercel
- Modify database schema without testing
- Remove error handling from API endpoints
- Delete the scoring engine

### ✅ **DO THIS INSTEAD**:
- Always test locally before deploying
- Check `/api/health` endpoint after changes
- Test admin dashboard after deployment
- Verify applications save to database
- Keep backups of critical files
- Read documentation before major changes

---

## 🧪 TESTING CHECKLIST

Before deploying ANY changes, verify:

- [ ] Health check works: `https://artery-nine.vercel.app/api/health`
- [ ] Main website loads: `https://artery-nine.vercel.app/`
- [ ] Application form works (submit test application)
- [ ] Admin login works: `https://artery-nine.vercel.app/admin`
- [ ] Admin dashboard shows applications
- [ ] Application detail view works
- [ ] Applications save to Supabase
- [ ] Emails send (if configured)

---

## 📋 SAFE CHANGES YOU CAN MAKE

You CAN safely:
- Change text content on Home.jsx (hero heading, descriptions, etc.)
- Update styling and colors
- Add new pages (but don't remove existing ones)
- Add new API endpoints (but don't modify existing ones)
- Update documentation
- Add new features (but don't break existing ones)
- Change logo or images
- Update contact information

---

## 🚨 IF SOMETHING BREAKS

### Step 1: Check Health Endpoint
Visit: `https://artery-nine.vercel.app/api/health`

Look for errors in the response.

### Step 2: Check Vercel Logs
1. Vercel Dashboard → Deployments
2. Click latest deployment
3. Click "Functions" tab
4. Look for errors

### Step 3: Check Supabase
1. Go to Supabase dashboard
2. Check if `applications` table exists
3. Check if data is being saved

### Step 4: Rollback
If you can't fix it:
1. Go to Vercel → Deployments
2. Find the last working deployment
3. Click "..." → "Redeploy"

---

## 📞 EMERGENCY CONTACTS

If the admin system is broken:
- Check `ADMIN_SYSTEM.md` for troubleshooting

If database is broken:
- Run `SUPABASE_SETUP.sql` again in Supabase

If deployment fails:
- Check `PHASE4_IMPLEMENTATION.md` for deployment guide

---

## 🎯 GOLDEN RULES

1. **NEVER** delete the admin system
2. **NEVER** move `api/lib/` outside of `api/`
3. **NEVER** remove environment variables from Vercel
4. **NEVER** modify database schema without backup
5. **ALWAYS** test locally before deploying
6. **ALWAYS** check health endpoint after deployment
7. **ALWAYS** verify admin dashboard works
8. **ALWAYS** keep documentation updated

---

## 📊 CURRENT ARCHITECTURE (DO NOT BREAK)

```
Frontend (React + Vite)
    ↓
API Endpoints (Vercel Serverless Functions)
    ↓
api/lib/supabase.js (Database Client)
    ↓
Supabase PostgreSQL (Data Storage)

Admin System
    ↓
/api/applications/list (Get all applications)
    ↓
api/lib/supabase.js
    ↓
Display in AdminDashboard.jsx
```

**This architecture WORKS. Do not change it unless absolutely necessary.**

---

## 🔐 SECURITY NOTES

- **NEVER** commit `.env.local` to git (it's in `.gitignore`)
- **ALWAYS** use environment variables for secrets
- **NEVER** hardcode API keys or passwords
- Change `ADMIN_PASSWORD` from default `admin123` in production

---

## 📝 VERSION HISTORY

**v1.0 - Current (January 2026)**
- Phase 4 backend integration complete
- Admin system fully functional
- Database saving applications
- Email notifications working
- All features tested and deployed

---

## ⚠️ FINAL WARNING

**This application is PRODUCTION-READY and FULLY FUNCTIONAL.**

Any changes you make should ADD features, not REMOVE them.

Before making changes:
1. Read this document
2. Read the relevant feature documentation
3. Test locally
4. Deploy carefully
5. Verify everything still works

**When in doubt, DON'T change it. If it's working, leave it alone.**

---

**Last Updated**: January 22, 2026
**Status**: ✅ All Systems Operational
**Deployment**: https://artery-nine.vercel.app

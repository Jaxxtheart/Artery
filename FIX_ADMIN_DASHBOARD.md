# Fix "Failed to Load Applications" Error

## ⚠️ Problem
Your admin dashboard shows **"failed to load applications"** because the database table doesn't exist yet in Supabase.

---

## ✅ Solution (5 Minutes)

### **Step 1: Open Supabase SQL Editor**

1. Go to: **https://supabase.com/dashboard**
2. Click on your **artery-capital** project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

### **Step 2: Run the Database Setup Script**

1. Open the file: **`SUPABASE_SETUP.sql`** (in this repository)
2. Copy **ALL** the SQL code
3. Paste it into the Supabase SQL Editor
4. Click **"Run"** (or press `Ctrl+Enter`)

You should see:
```
✅ Table created successfully!
   application_count: 0
```

### **Step 3: Verify in Vercel**

1. Go to: **https://artery-nine.vercel.app/api/health**
2. You should see:
```json
{
  "success": true,
  "message": "✅ All systems operational",
  "database": {
    "connected": true,
    "tableExists": true,
    "status": "operational"
  }
}
```

### **Step 4: Test Admin Dashboard**

1. Go to: **https://artery-nine.vercel.app/admin**
2. Login with password: **`admin123`**
3. ✅ Dashboard should load (will be empty until you submit an application)

### **Step 5: Test Application Submission**

1. Go to: **https://artery-nine.vercel.app/**
2. Click **"Apply for Funding"**
3. Fill out the 5-step form
4. Submit
5. ✅ You should see success page with AI scoring
6. Go back to admin dashboard
7. ✅ Your application should appear!

---

## 🐛 If It Still Doesn't Work

### Check 1: Verify Environment Variables in Vercel

Go to: **Vercel Dashboard → Settings → Environment Variables**

Make sure these are set:
- `SUPABASE_URL` = `https://rjxdxpegpclglkvybpej.supabase.co`
- `SUPABASE_SERVICE_KEY` = `eyJhbG...` (your long key)
- `ADMIN_PASSWORD` = `admin123`
- `NEXT_PUBLIC_APP_URL` = `https://artery-nine.vercel.app`

### Check 2: Redeploy Vercel

1. Go to: **Vercel Dashboard → Deployments**
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**
4. Wait 2 minutes
5. Try again

### Check 3: Check Vercel Function Logs

1. Vercel Dashboard → Deployments → Latest
2. Click **"Functions"** tab
3. Click `/api/applications/list`
4. Look for error messages
5. Share the error with me if you still have issues

---

## 📊 What This Fixes

After running the SQL script:
- ✅ Creates the `applications` table in Supabase
- ✅ Sets up proper indexes for performance
- ✅ Enables Row Level Security
- ✅ Configures access policies
- ✅ Admin dashboard will work
- ✅ Application submissions will save
- ✅ Everything works end-to-end

---

## 🎯 Quick Test Checklist

After setup, verify:
- [ ] Health endpoint shows "All systems operational"
- [ ] Admin login works
- [ ] Admin dashboard loads (empty is OK)
- [ ] Can submit application
- [ ] Application appears in admin dashboard
- [ ] Can view application details
- [ ] Application saved in Supabase Table Editor

---

**This should fix your "failed to load applications" error!** 🚀

If you still have issues after following these steps, run the health check at:
**https://artery-nine.vercel.app/api/health**

And share the response with me.

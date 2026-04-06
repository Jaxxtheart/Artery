# 🚀 Deploy to Vercel NOW - Step by Step

Your code is **already pushed and ready**. You just need to configure Vercel environment variables.

---

## ✅ Step 1: Go to Vercel Dashboard

Open: **https://vercel.com/dashboard**

Find your **Artery Capital** project and click on it.

---

## ✅ Step 2: Open Environment Variables

Click: **Settings** → **Environment Variables**

---

## ✅ Step 3: Add Variables (Copy-Paste Each One)

Click **"Add New"** for each variable below:

### Variable 1:
- **Key**: `SUPABASE_URL`
- **Value**: `https://rjxdxpegpclglkvybpej.supabase.co`
- **Environment**: ✓ Production
- Click **Save**

### Variable 2:
- **Key**: `SUPABASE_SERVICE_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqeGR4cGVncGNsZ2xrdnlicGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTAyMTYxOSwiZXhwIjoyMDg0NTk3NjE5fQ.PUKIySWqBuWuHvZ6A1H6KE3E1Cn7GC1f_IojtCoWD9k`
- **Environment**: ✓ Production
- Click **Save**

### Variable 3:
- **Key**: `ADMIN_PASSWORD`
- **Value**: `admin123`
- **Environment**: ✓ Production
- Click **Save**
- ⚠️ **Change this later to a secure password!**

### Variable 4:
- **Key**: `ADMIN_EMAIL`
- **Value**: `invest@arterycapital.com`
- **Environment**: ✓ Production
- Click **Save**

### Variable 5:
- **Key**: `FROM_EMAIL`
- **Value**: `Artery Capital <noreply@arterycapital.com>`
- **Environment**: ✓ Production
- Click **Save**

### Variable 6:
- **Key**: `NEXT_PUBLIC_APP_URL`
- **Value**: `https://your-actual-vercel-url.vercel.app`
- **Environment**: ✓ Production
- 📝 **Replace** `your-actual-vercel-url` with your real Vercel domain
- Find your domain at the top of Vercel dashboard (e.g., `artery-capital-xyz.vercel.app`)
- Click **Save**

---

## ✅ Step 4: Trigger Redeploy

After adding all variables:

1. Go to **Deployments** tab in Vercel
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Click **"Redeploy"** again to confirm

**OR** Vercel may automatically redeploy when you save the environment variables.

---

## ✅ Step 5: Wait for Deployment

- Watch the deployment progress in Vercel (usually takes 1-2 minutes)
- You'll see "Building..." then "Deploying..." then "Ready"
- Once it says **"Ready"**, your site is live!

---

## ✅ Step 6: Test Your Live Site

Visit your Vercel URL (shown at top of Vercel dashboard).

### Test Application Submission:
1. Click **"Apply for Funding"**
2. Fill out the 5-step form
3. Submit
4. ✅ Should see success page with AI scoring

### Test Admin Dashboard:
1. Go to: `https://your-url.vercel.app/admin`
2. Login with password: `admin123`
3. ✅ Should see your submitted application

### Check Database:
1. Go to Supabase → Table Editor → applications
2. ✅ Should see the application you just submitted

---

## 🐛 If It Still Doesn't Work

### Check Vercel Function Logs:
1. In Vercel, go to your project
2. Click **Deployments** → Click your latest deployment
3. Click **"Functions"** tab
4. Look for `/api/applications/submit`
5. Check for errors in the logs

### Common Issues:

**"Supabase is not configured"**
- Double-check the environment variables are saved in Vercel
- Make sure you selected **Production** environment
- Redeploy after adding variables

**"Application not saving to database"**
- Verify you ran the `schema.sql` in Supabase SQL Editor
- Check Supabase Table Editor to see if `applications` table exists
- Check Vercel function logs for errors

**"Can't login to admin"**
- Verify `ADMIN_PASSWORD` is set in Vercel environment variables
- Try clearing your browser cache
- Use the exact password: `admin123`

---

## 📞 Need Help?

If you're stuck:
1. Share your Vercel URL
2. Share any error messages from Vercel logs
3. Let me know what step you're on

---

## 🎉 Success Checklist

Once everything works, you should have:

- ✅ Live website at your Vercel URL
- ✅ Working application form
- ✅ Applications saving to Supabase database
- ✅ Admin dashboard accessible
- ✅ AI scoring working
- ✅ All data persisting in database

---

**Your code is ready. Just add the environment variables in Vercel and you're live!** 🚀

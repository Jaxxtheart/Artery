# Vercel Deployment Fix - Multer Upgrade

## Issue
Deployment warning on line 312:
```
npm warn deprecated multer@1.4.5-lts.2: Multer 1.x is impacted by a number of vulnerabilities,
which have been patched in 2.x. You should upgrade to the latest 2.x version
```

## Solution Applied

### 1. Upgraded Multer to 2.x
**Files Updated:**
- `package.json` - Changed `multer: ^1.4.5-lts.1` → `multer: ^2.0.0`
- `backend/package.json` - Changed `multer: ^1.4.5-lts.1` → `multer: ^2.0.0`

**Compatibility:** Multer 2.x is backward compatible with our usage. No code changes required.

### 2. Optimized Vercel Configuration
**File:** `vercel.json`

Added functions configuration:
```json
"functions": {
  "api/**/*.js": {
    "memory": 1024,
    "maxDuration": 10
  }
}
```

This ensures Vercel properly recognizes and configures serverless functions with adequate memory and execution time.

### 3. Improved .vercelignore
**File:** `.vercelignore`

Changes:
- Exclude entire `backend/` directory (not needed for serverless)
- Keep `api/` directory (contains serverless functions)
- Exclude test files (`test-*.js`, `test-*.cjs`)
- Exclude documentation files
- Exclude backup files

## Deployment Checklist

### Pre-Deployment
- [x] Upgrade multer to 2.x
- [x] Configure Vercel functions settings
- [x] Update .vercelignore
- [x] Verify api/ folder structure

### Post-Deployment Verification

1. **Check Build Logs**
```bash
# Should see:
✓ Building...
✓ Compiled successfully
✓ Serverless Functions deployed
```

2. **Test API Health**
```bash
curl https://your-app.vercel.app/api/health
# Expected: {"status":"healthy","timestamp":"..."}
```

3. **Test Application Submission**
```bash
curl -X POST https://your-app.vercel.app/api/applications/submit \
  -F "founderName=Test User" \
  -F "email=test@example.com" \
  -F "phone=+1234567890" \
  -F "companyName=Test Co" \
  -F "country=South Africa" \
  -F "industry=Fintech" \
  -F "stage=MVP" \
  -F "problem=Long problem statement here..." \
  -F "solution=Long solution statement here..." \
  -F "impact=Long impact statement here..." \
  -F "team=2-3" \
  -F "fundingAmount=\$15,000" \
  -F "useOfFunds=Long use of funds statement here..."

# Expected: {"success":true,"scoring":{...}}
```

4. **Test Frontend Form**
- Navigate to `/apply`
- Fill out all 5 steps
- Submit form
- Verify scoring results display

## Common Issues & Solutions

### Issue: "Cannot find module '../scoringEngine.cjs'"
**Solution:** Ensure `api/scoringEngine.cjs` exists and is not in .vercelignore

### Issue: "Function exceeded maximum duration"
**Solution:** Increase maxDuration in vercel.json functions config

### Issue: "Memory limit exceeded"
**Solution:** Increase memory in vercel.json functions config

### Issue: CORS errors
**Solution:** Verify headers configuration in vercel.json

### Issue: Form submission fails
**Solution:** Check that VITE_API_URL is empty or not set (for relative URLs)

## File Structure for Deployment

```
Artery/
├── api/                          ✅ INCLUDED (serverless functions)
│   ├── applications/
│   │   └── submit.js            ✅ Main API endpoint
│   ├── health.js                ✅ Health check
│   └── scoringEngine.cjs        ✅ Scoring engine
├── src/                          ✅ INCLUDED (frontend source)
│   └── pages/
│       └── Application.jsx      ✅ Form with normalization
├── dist/                         ✅ GENERATED (build output)
├── backend/                      ❌ EXCLUDED (not needed)
├── test-*.cjs                    ❌ EXCLUDED (dev only)
├── *.backup                      ❌ EXCLUDED (dev only)
├── package.json                  ✅ INCLUDED (dependencies)
└── vercel.json                   ✅ INCLUDED (config)
```

## Environment Variables

### Local Development
```bash
# .env
VITE_API_URL=http://localhost:3001
```

### Vercel Production
```bash
# Leave empty or don't set
VITE_API_URL=
```

## Monitoring After Deployment

1. **Check Vercel Dashboard**
   - Go to your project
   - Click "Functions" tab
   - Monitor invocations and errors

2. **View Function Logs**
   - Click on a function
   - View real-time logs
   - Check for errors

3. **Monitor Performance**
   - Check execution duration
   - Monitor memory usage
   - Track error rates

## Rollback Plan

If deployment fails:
```bash
# Revert changes
git revert HEAD

# Or rollback on Vercel Dashboard
# Deployments → Previous Deployment → Promote to Production
```

## Success Criteria

✅ Build completes without errors
✅ No deprecation warnings (multer 2.x)
✅ Serverless functions deploy successfully
✅ `/api/health` returns 200
✅ `/api/applications/submit` accepts POST and returns scoring
✅ Frontend form submits successfully
✅ Scoring results display correctly
✅ Valuations calculate properly

## Next Steps After Successful Deployment

1. Test with real application data
2. Monitor error rates for 24 hours
3. Set up alerts for function failures
4. Configure custom domain (optional)
5. Set up analytics tracking
6. Enable Vercel Analytics (optional)

---

**Status:** Ready for deployment
**Last Updated:** 2026-01-17
**Multer Version:** 2.0.0
**Node Version:** 16+ (Vercel default)

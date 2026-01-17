# Deployment Troubleshooting Guide

## Current Status

The application is configured for Vercel deployment but encountered issues. Here's how to diagnose and fix them.

## Common Issues & Solutions

### Issue 1: Multer Deprecation Warning
**Warning Message:**
```
npm warn deprecated multer@1.4.5-lts.2: Multer 1.x is impacted by vulnerabilities
```

**Status:** ⚠️ WARNING (not an error)
- This is a deprecation warning, NOT a deployment failure
- Multer 2.0 doesn't exist yet (as of Jan 2026)
- Using 1.4.5-lts.1 (latest stable version)
- Warning can be ignored for now

**Future Fix:** Wait for multer 2.0 release or migrate to alternative upload library

### Issue 2: Build Failures

**Check:**
```bash
npm run build
```

**Common Causes:**
1. Missing dependencies
2. Syntax errors in code
3. Import path issues

**Solution:**
```bash
# Install dependencies first
npm install

# Then build
npm run build
```

### Issue 3: Serverless Function Errors

**Check Vercel Function Logs:**
1. Go to Vercel Dashboard
2. Click on your deployment
3. Navigate to "Functions" tab
4. Check error logs

**Common Errors:**

#### "Cannot find module"
```
Error: Cannot find module '../scoringEngine.cjs'
```

**Fix:** Ensure api/scoringEngine.cjs exists and is not in .vercelignore

#### "Module exports"
```
ReferenceError: module is not defined
```

**Fix:** Ensure .cjs extension for CommonJS files in api/ folder

#### "Function timeout"
```
Task timed out after 10.00 seconds
```

**Fix:** Increase maxDuration in vercel.json:
```json
"functions": {
  "api/**/*.js": {
    "memory": 1024,
    "maxDuration": 15
  }
}
```

### Issue 4: CORS Errors

**Symptoms:** Frontend can't call API

**Check:** Browser console shows CORS error

**Fix:** Verify vercel.json headers configuration:
```json
"headers": [
  {
    "source": "/api/(.*)",
    "headers": [
      { "key": "Access-Control-Allow-Origin", "value": "*" }
    ]
  }
]
```

### Issue 5: API Returns 404

**Symptoms:** /api/applications/submit returns 404

**Causes:**
1. Function file not deployed
2. Incorrect routing in vercel.json

**Fix:**
1. Verify file structure:
```
api/
├── applications/
│   └── submit.js      ← Must be here
├── health.js
├── scoringEngine.cjs
└── package.json
```

2. Check vercel.json rewrites:
```json
"rewrites": [
  {
    "source": "/api/:path*",
    "destination": "/api/:path*"
  }
]
```

## Deployment Steps

### 1. Pre-Deployment Checklist

- [ ] All files committed to git
- [ ] api/scoringEngine.cjs exists
- [ ] api/package.json has multer dependency
- [ ] vercel.json is configured
- [ ] .vercelignore excludes backend/ but NOT api/

### 2. Deploy to Vercel

**Option A: Via Dashboard**
1. Go to vercel.com/new
2. Import GitHub repository
3. Configure:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Deploy

**Option B: Via CLI**
```bash
vercel --prod
```

### 3. Post-Deployment Verification

**Step 1: Check Build Logs**
Look for:
- ✅ "Build completed successfully"
- ⚠️  Warnings are OK (multer deprecation)
- ❌ Any actual errors

**Step 2: Test Health Endpoint**
```bash
curl https://your-app.vercel.app/api/health
```

Expected:
```json
{"status":"healthy","timestamp":"...","environment":"vercel-serverless","version":"1.0.0"}
```

**Step 3: Test Application Endpoint**
```bash
curl -X POST https://your-app.vercel.app/api/applications/submit \
  -F "founderName=Test" \
  -F "email=test@example.com" \
  -F "phone=123" \
  -F "companyName=Test Co" \
  -F "country=south africa" \
  -F "industry=fintech" \
  -F "stage=mvp" \
  -F "problem=$(printf 'A%.0s' {1..60})" \
  -F "solution=$(printf 'B%.0s' {1..60})" \
  -F "impact=$(printf 'C%.0s' {1..60})" \
  -F "team=2-3" \
  -F "fundingAmount=\$15,000" \
  -F "useOfFunds=$(printf 'D%.0s' {1..60})"
```

Expected: `{"success":true,"scoring":{...}}`

**Step 4: Test Frontend**
1. Navigate to: https://your-app.vercel.app/apply
2. Fill out form
3. Submit
4. Verify scoring results display

## Debug Mode

### Enable Detailed Logging

Add to api/applications/submit.js:
```javascript
console.log('Request received:', {
  method: req.method,
  body: req.body,
  file: req.file
});
```

View logs:
```bash
vercel logs
```

## File Structure Reference

```
Artery/
├── api/                          ✅ Deployed to Vercel
│   ├── applications/
│   │   └── submit.js            ✅ Serverless function
│   ├── health.js                ✅ Health check
│   ├── scoringEngine.cjs        ✅ Scoring logic
│   └── package.json             ✅ API dependencies
├── src/                          ✅ Frontend source
│   └── pages/
│       └── Application.jsx      ✅ Form component
├── dist/                         ✅ Build output (generated)
├── backend/                      ❌ NOT deployed (excluded)
├── package.json                  ✅ Frontend dependencies
├── vercel.json                   ✅ Configuration
└── .vercelignore                 ✅ Exclusion rules
```

## Environment Variables

### Local (.env)
```bash
VITE_API_URL=http://localhost:3001
```

### Vercel Production
```bash
# Leave empty or don't set
VITE_API_URL=
```

To set in Vercel:
1. Go to Project Settings
2. Environment Variables
3. Add: VITE_API_URL = (leave empty)
4. Redeploy

## Still Failing?

### Get More Information

1. **Share the exact error message**
   - Copy full error from Vercel build logs
   - Include line numbers and stack trace

2. **Check specific deployment step that failed**
   - Build phase?
   - Function deployment?
   - Runtime error?

3. **Test locally first**
   ```bash
   # Build locally
   npm install
   npm run build

   # Test serverless function locally (if using vercel dev)
   vercel dev
   ```

### Alternative: Simplified Deployment

If serverless functions continue to fail, we can:
1. Deploy frontend only (static site)
2. Use external API service
3. Use Vercel's built-in API routes differently

## Contact Information

If you need help:
1. Share the Vercel deployment URL
2. Share the build logs (full output)
3. Share the specific error message
4. Share the function logs if runtime error

---

**Last Updated:** 2026-01-17
**Status:** Troubleshooting in progress
**Known Issues:** Multer deprecation warning (non-critical)

# Deployment Guide - Vercel

This guide walks you through deploying Artery Capital to Vercel with both frontend and backend (serverless functions).

## Architecture

The application is deployed as a single Vercel project with:
- **Frontend**: Vite/React SPA (static files)
- **Backend**: Serverless Functions in `/api` directory
- **Routing**: Vercel handles API routes automatically

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Code must be in a GitHub repository
3. **Vercel CLI** (optional): `npm install -g vercel`

## Deployment Options

### Option 1: Deploy via Vercel Dashboard (Recommended)

#### Step 1: Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your GitHub account and repository: `Jaxxtheart/Artery`
4. Click "Import"

#### Step 2: Configure Project

Vercel will auto-detect the Vite framework. Configure:

**Framework Preset**: `Vite`
**Root Directory**: `./` (leave as root)
**Build Command**: `npm run build`
**Output Directory**: `dist`
**Install Command**: `npm install`

#### Step 3: Environment Variables

Click "Environment Variables" and add:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_API_URL` | (leave empty) | Production |

> **Note**: For Vercel deployments, leaving `VITE_API_URL` empty makes the app use relative URLs, which automatically works with Vercel's routing.

#### Step 4: Deploy

1. Click "Deploy"
2. Wait 2-3 minutes for build and deployment
3. Your app will be live at `https://your-app.vercel.app`

### Option 2: Deploy via Vercel CLI

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Login

```bash
vercel login
```

#### Step 3: Deploy

From the project root:

```bash
# For production deployment
vercel --prod

# For preview deployment
vercel
```

Follow the prompts:
- Set up and deploy: `Y`
- Which scope: (select your account)
- Link to existing project: `N`
- Project name: `artery-capital`
- Directory: `./`
- Override settings: `N`

#### Step 4: Set Environment Variables

```bash
vercel env add VITE_API_URL
```

When prompted, leave it empty and set for "Production" environment.

## Post-Deployment Configuration

### Custom Domain (Optional)

1. Go to your project dashboard on Vercel
2. Navigate to "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed

### Environment Variables

Update environment variables:

```bash
# Via CLI
vercel env add VITE_API_URL production

# Via Dashboard
# Go to Settings → Environment Variables → Add
```

For production, you can:
- Leave `VITE_API_URL` empty (uses relative URLs)
- Or set to your Vercel domain: `https://your-app.vercel.app`

## Vercel Configuration Explained

### `vercel.json`

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ]
}
```

- **rewrites**: Routes `/api/*` requests to serverless functions
- **framework**: Optimizes build for Vite
- **headers**: CORS configuration for API endpoints

### API Routes Structure

```
/api
├── health.js              → GET  /api/health
└── applications/
    └── submit.js          → POST /api/applications/submit
```

Each file in `/api` becomes a serverless endpoint automatically.

## Testing Deployment

### Test Frontend

Visit your Vercel URL:
```
https://your-app.vercel.app
```

You should see the Artery Capital home page.

### Test API Endpoints

**Health Check:**
```bash
curl https://your-app.vercel.app/api/health
```

**Submit Application:**
```bash
curl -X POST https://your-app.vercel.app/api/applications/submit \
  -F "founderName=Test User" \
  -F "email=test@example.com" \
  -F "phone=+27123456789" \
  -F "companyName=Test Startup" \
  -F "country=South Africa" \
  -F "industry=Fintech" \
  -F "stage=MVP" \
  -F "problem=Test problem statement that is long enough to meet requirements" \
  -F "solution=Test solution statement that is long enough to meet requirements" \
  -F "impact=Test impact statement that is long enough to meet requirements" \
  -F "team=2-3" \
  -F "fundingAmount=\$15,000" \
  -F "useOfFunds=Test use of funds that is long enough to meet requirements"
```

You should receive a JSON response with scoring results.

### Test Form Submission

1. Navigate to `/apply` on your deployed site
2. Fill out the application form
3. Submit and verify you receive scoring results

## Monitoring & Logs

### View Logs

**Via Dashboard:**
1. Go to your project on Vercel
2. Click "Deployments"
3. Select a deployment
4. Click "Functions" tab to see serverless logs

**Via CLI:**
```bash
vercel logs
```

### Monitor Function Performance

1. Go to "Analytics" in your Vercel dashboard
2. View function execution times, errors, and usage

## Troubleshooting

### Issue: API Calls Failing (CORS Errors)

**Solution**: Ensure CORS headers are set in serverless functions:
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
```

All `/api` functions already have this configured.

### Issue: Build Fails

**Check**:
1. Dependencies are in root `package.json`
2. Build command is `npm run build`
3. Node.js version is compatible (14.x or higher)

**Fix**: Update `package.json`:
```json
{
  "engines": {
    "node": ">=16"
  }
}
```

### Issue: Serverless Function Timeout

Vercel free tier has 10s timeout. Check:
1. Scoring engine is optimized
2. No long-running processes
3. Consider upgrading to Pro for 60s timeout

### Issue: File Uploads Not Working

Vercel serverless functions use **memory storage** (no persistent file system):
- Files are stored in memory during function execution
- File metadata (name) is saved in the application data
- For production, consider cloud storage (AWS S3, Vercel Blob)

### Issue: Environment Variables Not Working

**Verify**:
```bash
vercel env ls
```

**Pull to local**:
```bash
vercel env pull .env.production
```

## Performance Optimization

### 1. Enable Edge Functions (Optional)

Create `vercel.json` in `/api`:
```json
{
  "runtime": "edge"
}
```

### 2. Add Caching Headers

Update `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 3. Optimize Bundle Size

```bash
# Analyze bundle
npm run build -- --mode production

# Check dist/ size
du -sh dist/
```

## Continuous Deployment

Vercel automatically redeploys when you push to GitHub:

1. **Push to main branch** → Production deployment
2. **Push to other branches** → Preview deployment
3. **Pull requests** → Automatic preview URLs

### Configure Branch Deployments

In Vercel dashboard:
1. Go to "Settings" → "Git"
2. Set "Production Branch": `main`
3. Enable "Preview Deployments" for all branches

## Cost Considerations

### Free Tier Includes:
- Unlimited deployments
- 100GB bandwidth/month
- 100 GB-hours serverless function execution
- 6000 build minutes/month

### Monitoring Usage:
1. Go to "Settings" → "Usage"
2. Monitor function invocations
3. Track bandwidth usage

## Advanced Configuration

### Custom Build Settings

Add to `package.json`:
```json
{
  "scripts": {
    "vercel-build": "npm run build"
  }
}
```

### Regional Functions

Deploy functions to specific regions:
```json
{
  "functions": {
    "api/**/*.js": {
      "memory": 1024,
      "maxDuration": 10,
      "regions": ["iad1"]
    }
  }
}
```

### Add Database (Future)

For persistent storage, integrate:
- **Vercel Postgres**: Built-in database
- **MongoDB Atlas**: NoSQL database
- **Supabase**: Backend-as-a-Service
- **PlanetScale**: MySQL database

## Rollback

If deployment fails:

**Via Dashboard:**
1. Go to "Deployments"
2. Find previous working deployment
3. Click "..." → "Promote to Production"

**Via CLI:**
```bash
vercel rollback
```

## Security Best Practices

1. **Rate Limiting**: Add rate limiting to API endpoints
2. **Input Validation**: Already implemented in serverless functions
3. **HTTPS**: Automatic with Vercel
4. **Environment Variables**: Never commit `.env` files
5. **API Keys**: Store in Vercel environment variables

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Vercel Community**: https://github.com/vercel/vercel/discussions
- **Status Page**: https://www.vercel-status.com/

## Summary Checklist

- [ ] GitHub repository connected to Vercel
- [ ] Environment variables configured
- [ ] First deployment successful
- [ ] Frontend loads correctly
- [ ] API endpoints responding
- [ ] Application form submits and returns scores
- [ ] Custom domain configured (optional)
- [ ] Monitoring enabled

---

**Deployment Status**: ✅ Ready for Production

Your Artery Capital application is now deployed and accessible globally via Vercel's CDN!

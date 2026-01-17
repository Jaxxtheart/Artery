# Admin System Documentation

## Overview

The admin system allows authorized users to view and review all submitted applications with their detailed scoring results. Applicants only see a confirmation message after submission, while all scoring details are accessible only to administrators.

## Features

### 1. Applicant-Facing Changes
- Applicants now see only a simple "Thank You" confirmation after submitting their application
- No scoring results, valuations, or evaluation details are shown to applicants
- Clean, professional confirmation message explaining the review process

### 2. Admin Authentication
- Simple password-based authentication
- Default password: `admin123` (configurable via `ADMIN_PASSWORD` environment variable)
- Session-based authentication using browser sessionStorage
- Automatic redirect to dashboard after successful login

### 3. Admin Dashboard
- Overview statistics:
  - Total applications
  - High score applications (75+)
  - Good score applications (65-74)
  - Applications needing review (<65)
- Sortable table showing all applications with:
  - Company name and location
  - Founder name and email
  - Industry and stage
  - Overall score and rating
  - Submission date
  - Link to detailed view

### 4. Application Detail View
- Complete scoring results previously shown to applicants:
  - Overall score and rating
  - Recommendation
  - Current and projected valuations (3-year, 5-year)
  - Category score breakdowns with weights
  - Key strengths
  - Areas for improvement
  - Recommended next steps
- Applicant information display
- Print and download functionality for reports
- Print-optimized layout

## Routes

### Public Routes
- `/` - Home page
- `/apply` - Application form

### Admin Routes
- `/admin` - Admin login page
- `/admin/dashboard` - Application list dashboard (requires authentication)
- `/admin/application/:id` - Individual application detail view (requires authentication)

## API Endpoints

### `/api/applications/submit` (POST)
- Accepts application form data
- Scores the application using the scoring engine
- Stores application with scoring data
- Returns success confirmation to applicant (no scoring data)

### `/api/applications/list` (GET)
- Requires authentication (`Authorization: Bearer {password}`)
- Returns array of all submitted applications
- Includes complete scoring data for each application

### `/api/applications/get` (GET)
- Requires authentication (`Authorization: Bearer {password}`)
- Query parameter: `id` (application ID)
- Returns detailed data for a specific application

### `/api/applications/store` (POST)
- Internal endpoint (not directly called by frontend)
- Stores application data to filesystem (local dev only)

## Data Storage

### Local Development
Applications are stored as JSON files in the `data/applications/` directory:
- Each application is a separate file: `{applicationId}.json`
- Files include applicant info, application data, and scoring results
- Directory is automatically created if it doesn't exist

### Production (Vercel)
**IMPORTANT**: File-based storage does NOT persist on Vercel's serverless infrastructure.

For production deployment, you must configure a persistent database:

#### Recommended Options:

1. **Vercel Postgres** (Recommended)
   - Native Vercel integration
   - Set up at vercel.com/dashboard → Storage → Postgres
   - Use `@vercel/postgres` package

2. **Vercel KV** (Redis)
   - Good for simple key-value storage
   - Set up at vercel.com/dashboard → Storage → KV
   - Use `@vercel/kv` package

3. **Supabase**
   - Free PostgreSQL database
   - Easy to integrate
   - Use `@supabase/supabase-js` package

4. **MongoDB Atlas**
   - Free tier available
   - Document-based storage (similar to JSON files)
   - Use `mongodb` package

5. **PlanetScale**
   - MySQL-compatible serverless database
   - Use `@planetscale/database` package

### Migration Steps (for production):

1. Choose a database provider
2. Set up database credentials as Vercel environment variables
3. Update API endpoints (`store.js`, `list.js`, `get.js`) to use database instead of filesystem
4. Deploy to Vercel

Example database integration (Vercel Postgres):

```javascript
// In api/applications/store.js
import { sql } from '@vercel/postgres';

const { rows } = await sql`
  INSERT INTO applications (id, data, created_at)
  VALUES (${id}, ${JSON.stringify(storedApplication)}, NOW())
  RETURNING *;
`;
```

## Environment Variables

### Required for Production:

```bash
# Admin password (change from default!)
ADMIN_PASSWORD=your-secure-password-here

# Database credentials (example for Vercel Postgres)
POSTGRES_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."
POSTGRES_USER="..."
POSTGRES_HOST="..."
POSTGRES_PASSWORD="..."
POSTGRES_DATABASE="..."
```

Set these in Vercel:
1. Go to your project settings
2. Navigate to Environment Variables
3. Add each variable for Production, Preview, and Development
4. Redeploy

## Security Considerations

### Current Implementation (Demo)
- Simple password authentication
- Password stored in sessionStorage
- No encryption, no rate limiting

### Production Recommendations
1. **Implement proper authentication:**
   - Use NextAuth.js or similar
   - OAuth with Google/GitHub
   - JWT tokens
   - Secure cookie-based sessions

2. **Add authorization levels:**
   - Admin role
   - Reviewer role
   - Read-only role

3. **Secure API endpoints:**
   - API key authentication
   - Rate limiting
   - CORS restrictions

4. **Encrypt sensitive data:**
   - Encrypt passwords in database
   - Use HTTPS only
   - Secure environment variables

5. **Add audit logging:**
   - Track who viewed what application
   - Log all admin actions
   - Monitor for suspicious activity

## File Structure

```
Artery/
├── src/
│   ├── pages/
│   │   ├── Application.jsx           # Applicant form (modified - no scoring shown)
│   │   ├── Admin.jsx                 # Admin login page
│   │   ├── AdminDashboard.jsx        # Application list dashboard
│   │   └── AdminApplicationDetail.jsx # Detailed application view
│   └── App.jsx                        # Updated routing
├── api/
│   └── applications/
│       ├── submit.js                  # Score and store applications
│       ├── list.js                    # List all applications (admin)
│       ├── get.js                     # Get specific application (admin)
│       └── store.js                   # Storage helper (local dev)
├── data/
│   └── applications/                  # Local storage directory
│       └── app-*.json                 # Individual application files
└── ADMIN_SYSTEM.md                    # This file
```

## Testing the Admin System

### Local Development

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Submit a test application:**
   - Navigate to http://localhost:5173/apply
   - Fill out and submit the form
   - Note the confirmation message (no scoring shown)

3. **Access admin panel:**
   - Navigate to http://localhost:5173/admin
   - Enter password: `admin123`
   - View the dashboard with submitted applications
   - Click "View Details" to see full scoring results

4. **Test print/download:**
   - On application detail page, click "Print Results" or "Download Report"

### Production (Vercel)

1. **Deploy to Vercel:**
   ```bash
   git push origin your-branch
   ```
   Or use Vercel CLI:
   ```bash
   vercel --prod
   ```

2. **Set environment variables:**
   - Go to Vercel dashboard → Your Project → Settings → Environment Variables
   - Add `ADMIN_PASSWORD` with your secure password
   - Add database credentials if using persistent storage

3. **Test the flow:**
   - Submit test application via `/apply`
   - Login to admin at `/admin`
   - Verify applications are visible in dashboard

**Note:** Without persistent database on Vercel, applications will only exist during the serverless function's execution and won't persist between deployments.

## Usage Guidelines

### For Applicants
- Submit application via `/apply`
- Receive confirmation message with next steps
- Wait for email follow-up from team

### For Administrators
1. Login at `/admin`
2. View all applications in dashboard
3. Click on any application to see detailed scoring
4. Use filters/sorting to prioritize reviews
5. Print or download reports as needed
6. Follow up with high-scoring applications

## Future Enhancements

Potential improvements for the admin system:

1. **Advanced Features:**
   - Search and filter applications
   - Sort by any column
   - Export to CSV/Excel
   - Bulk actions
   - Application status workflow (New → Reviewing → Accepted/Rejected)
   - Email templates for common responses
   - Notes and comments on applications
   - Application comparison tool

2. **Analytics:**
   - Score distribution charts
   - Industry breakdown
   - Geographic distribution
   - Trend analysis over time
   - Acceptance rate metrics

3. **Collaboration:**
   - Multiple admin users
   - Assign reviewers to applications
   - Internal comments/discussions
   - Review voting system
   - Consensus scoring

4. **Integration:**
   - Email notifications for new applications
   - Slack/Discord webhooks
   - Calendar integration for interviews
   - CRM integration
   - Automated email responses

## Troubleshooting

### "Unauthorized" error in admin dashboard
- Check that `ADMIN_PASSWORD` environment variable is set correctly
- Clear browser sessionStorage and login again
- Verify the password matches in both frontend and backend

### Applications not showing in dashboard
- Check browser console for errors
- Verify `/api/applications/list` endpoint is accessible
- For Vercel: Set up persistent database (filesystem storage doesn't work)
- For local: Check that `data/applications/` directory exists and has files

### Application detail page not loading
- Verify the application ID in the URL is correct
- Check that `/api/applications/get` endpoint is working
- Verify authentication is still valid (session not expired)

### Print layout issues
- Ensure browser print settings are correct
- Use "Print Background Graphics" option
- Try different browsers (Chrome recommended for best results)

---

**Last Updated:** 2026-01-17
**Version:** 1.0.0
**Author:** Artery Capital Development Team

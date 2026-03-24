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
## ⚠️ CRITICAL: READ FIRST

**IMPORTANT**: See [DO_NOT_DELETE.md](./DO_NOT_DELETE.md) for complete list of protected features.

## ⚠️ CRITICAL: NEVER REMOVE THE ADMIN SYSTEM

The admin system is a CORE FEATURE of Artery Capital and must **NEVER** be removed, disabled, or excluded from any deployment. This system is essential for:

- Viewing all submitted applications
- Reviewing founder information and business details
- Analyzing AI-powered scoring and valuations
- Managing application status and workflow
- Accessing historical application data

**Any modifications, refactoring, or deployments MUST preserve the complete admin system.**

---

## 📁 Admin System Files

### **Frontend Components** (DO NOT DELETE)
```
src/
├── pages/
│   ├── Admin.jsx                    # Admin login page
│   ├── AdminDashboard.jsx           # Main dashboard showing all applications
│   └── AdminApplicationDetail.jsx   # Detailed view of individual applications
└── App.jsx                          # Includes admin routes
```

### **Backend API Endpoints** (DO NOT DELETE)
```
api/
└── applications/
    ├── list.js   # GET /api/applications/list - Fetch all applications
    └── get.js    # GET /api/applications/get?id={id} - Fetch single application
```

### **Access Points** (DO NOT REMOVE)
- **Footer Link**: `src/pages/Home.jsx` contains an admin link in the footer
- **Direct URL**: `/admin` - Login page
- **Dashboard URL**: `/admin/dashboard` - Main admin interface
- **Detail URL**: `/admin/application/{id}` - Application detail view

---

## 🔑 Admin Access

### Login Credentials
- **URL**: `https://arterycapital.com/admin`
- **Password**: Set via `ADMIN_PASSWORD` environment variable (default: `admin123`)

### Environment Variables
```env
# REQUIRED for admin system to function
ADMIN_PASSWORD=your-secure-password-here
```

⚠️ **Security Note**: Change the default password in production!

---

## 🎯 Admin Features

### 1. Dashboard (`/admin/dashboard`)

**Statistics Overview:**
- Total applications count
- High score applications (75+)
- Good score applications (65-74)
- Applications needing review (<65)

**Application List:**
- Company name and country
- Founder name and email
- Industry and stage
- AI score (0-100)
- Rating (Exceptional, Strong, Good, Moderate, Needs Development)
- Submission date
- Click any row to view full details

### 2. Application Detail View (`/admin/application/{id}`)

**Comprehensive Information:**
- Overall AI score and rating
- Estimated valuation (current, 3-year, 5-year projections)
- Category-by-category scoring breakdown:
  - Founder Quality
  - Traction & Metrics
  - Product-Market Fit
  - Market Opportunity
  - Innovation
  - African Impact
  - Sustainability
- Key strengths identified by AI
- Areas for improvement
- Recommended next steps
- Complete founder information
- Full business details (problem, solution, impact)
- Traction metrics (revenue, users, growth)
- Funding details

**Actions Available:**
- Print application
- Download as JSON
- Return to dashboard

---

## 🔐 Authentication Flow

1. User visits `/admin`
2. Enters admin password
3. Password validated against `ADMIN_PASSWORD` env variable
4. On success: Redirected to `/admin/dashboard`
5. Session stored in `sessionStorage` (lasts until browser closed)
6. Protected routes check authentication on load
7. Logout clears session and returns to login

---

## 🔗 Integration with Phase 4 Backend

The admin system is **fully integrated** with the Supabase database:

### Database Connection
- **List View**: Fetches all applications from `applications` table via `/api/applications/list`
- **Detail View**: Fetches single application by ID via `/api/applications/get?id={id}`
- **Real-time Scoring**: AI scoring recalculated from stored data on each view
- **Status Tracking**: Application status stored in database (pending, reviewing, etc.)

### Data Flow
```
Admin UI
   ↓
API Endpoint (/api/applications/list or /api/applications/get)
   ↓
Supabase Client (lib/supabase.js)
   ↓
PostgreSQL Database
   ↓
Transform to UI Format
   ↓
Return to Admin UI
```

---

## 🛡️ Security Considerations

### Current Implementation
- Simple password-based authentication
- Session stored in browser sessionStorage
- Password checked against environment variable
- No user management or roles yet

### Production Recommendations
1. **Change Default Password**: Set strong `ADMIN_PASSWORD` in Vercel
2. **Use HTTPS Only**: Admin routes should never be accessed over HTTP
3. **Add IP Whitelisting**: Restrict admin access to specific IP addresses
4. **Implement Rate Limiting**: Prevent brute force attacks
5. **Add Audit Logging**: Track all admin actions
6. **Consider OAuth**: Implement Google/GitHub authentication

### Future Enhancements
- Multiple admin users with different roles
- Two-factor authentication (2FA)
- Session timeout and refresh
- Activity logging and audit trail
- Email notifications for admin actions

---

## 🚀 Deployment Checklist

### Before Every Deployment

- [ ] Verify all admin files exist in codebase
- [ ] Confirm admin routes in `App.jsx`
- [ ] Check admin link in `Home.jsx` footer
- [ ] Ensure API endpoints exist (`list.js`, `get.js`)
- [ ] Set `ADMIN_PASSWORD` environment variable in Vercel
- [ ] Test admin login flow
- [ ] Verify dashboard loads applications
- [ ] Test application detail view
- [ ] Confirm print and download functions work

### After Deployment

- [ ] Access `/admin` on production URL
- [ ] Login with admin password
- [ ] Verify dashboard displays correctly
- [ ] Click on an application to view details
- [ ] Confirm all data loads properly
- [ ] Test logout functionality

---

## 🐛 Troubleshooting

### "Failed to load applications"
**Cause**: Database connection issue or API endpoint missing
**Fix**:
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in Vercel
- Verify `/api/applications/list.js` exists and is deployed
- Check Vercel function logs for errors

### "Invalid credentials" on Login
**Cause**: Wrong password or env variable not set
**Fix**:
- Verify `ADMIN_PASSWORD` is set in Vercel environment variables
- Check that password matches (case-sensitive)
- Clear browser cache and try again

### Applications show no data or "0" scores
**Cause**: Database empty or scoring engine error
**Fix**:
- Verify applications exist in Supabase database
- Check that `scoringEngine.cjs` exists and works
- Look for errors in Vercel function logs

### Admin link not visible in footer
**Cause**: Home.jsx footer was modified
**Fix**:
- Add admin link back to `src/pages/Home.jsx` footer:
```jsx
<Link to="/admin" style={{color: '#4A4A4A', textDecoration: 'none', fontSize: '12px', marginTop: '12px', display: 'inline-block', opacity: 0.5, transition: 'opacity 0.3s'}}>
  Admin
</Link>
```

### Routes not working (404 errors)
**Cause**: Admin routes missing from App.jsx
**Fix**:
- Restore admin routes in `src/App.jsx`:
```jsx
import Admin from './pages/Admin'
import AdminDashboard from './pages/AdminDashboard'
import AdminApplicationDetail from './pages/AdminApplicationDetail'

// In <Routes>:
<Route path="/admin" element={<Admin />} />
<Route path="/admin/dashboard" element={<AdminDashboard />} />
<Route path="/admin/application/:id" element={<AdminApplicationDetail />} />
```

---

## 📊 Admin System Architecture

```
┌─────────────────────────────────────────────────┐
│              USER INTERFACE                      │
├─────────────────────────────────────────────────┤
│  Admin.jsx (Login)                              │
│       ↓                                          │
│  AdminDashboard.jsx (Application List)          │
│       ↓                                          │
│  AdminApplicationDetail.jsx (Full Details)      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│              API ENDPOINTS                       │
├─────────────────────────────────────────────────┤
│  /api/applications/list.js                      │
│  /api/applications/get.js                       │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│           DATABASE LAYER                         │
├─────────────────────────────────────────────────┤
│  lib/supabase.js                                │
│    - getAllApplications()                       │
│    - getApplication(id)                         │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│         SUPABASE DATABASE                        │
├─────────────────────────────────────────────────┤
│  applications table                              │
│    - All founder information                     │
│    - Company details                             │
│    - Business metrics                            │
│    - Timestamps and metadata                     │
└─────────────────────────────────────────────────┘
```

---

## 🎨 Admin UI Features

### Visual Design
- Clean, minimalist interface matching main website
- Artery Capital branding throughout
- Responsive design for desktop and tablet
- Professional table layouts
- Color-coded scoring indicators

### User Experience
- Single-click navigation to application details
- Intuitive statistics dashboard
- Quick visual assessment of application quality
- Print-friendly detail pages
- Download functionality for record keeping

---

## 📝 Maintenance Guidelines

### Monthly Tasks
- [ ] Review all applications
- [ ] Update admin password
- [ ] Check for security updates
- [ ] Verify backup systems working
- [ ] Test admin functionality end-to-end

### Quarterly Tasks
- [ ] Review admin access logs (when implemented)
- [ ] Audit application data
- [ ] Update documentation
- [ ] Plan new admin features
- [ ] Security assessment

### Yearly Tasks
- [ ] Comprehensive security audit
- [ ] Performance optimization
- [ ] Feature enhancements
- [ ] User experience improvements

---

## 📞 Support

For admin system issues:
1. Check this documentation first
2. Review PHASE4_IMPLEMENTATION.md
3. Check Vercel function logs
4. Review Supabase database logs
5. Contact: invest@arterycapital.co.za

---

## ⚠️ REMEMBER

**THE ADMIN SYSTEM IS NOT OPTIONAL**

Every deployment, update, and modification MUST include the complete admin system. This is not a feature that can be "temporarily disabled" or "implemented later". It is a core component of the Artery Capital platform.

---

**Last Updated**: January 21, 2026
**Version**: 1.0
**Status**: ✅ Fully Implemented and Integrated

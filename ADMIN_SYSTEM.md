# Admin System Documentation

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
5. Contact: invest@arterycapital.com

---

## ⚠️ REMEMBER

**THE ADMIN SYSTEM IS NOT OPTIONAL**

Every deployment, update, and modification MUST include the complete admin system. This is not a feature that can be "temporarily disabled" or "implemented later". It is a core component of the Artery Capital platform.

---

**Last Updated**: January 21, 2026
**Version**: 1.0
**Status**: ✅ Fully Implemented and Integrated

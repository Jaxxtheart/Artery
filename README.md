# Artery Capital

**Africa's innovation starts here.** We back exceptional African founders building technology companies with $15,000 funding + strategic business advisory.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier works)
- Resend account (for emails, optional for dev)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd Artery
npm install
cd api && npm install && cd ..
```

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:
- **Supabase**: Get from [supabase.com](https://supabase.com) → Project Settings → API
- **Resend**: Get from [resend.com](https://resend.com) → API Keys
- **Admin Password**: Set your secure password

### 3. Set Up Database

1. Create Supabase project
2. Run SQL from `schema.sql` in Supabase SQL Editor
3. Copy credentials to `.env.local`

### 4. Run Development Server

**Option A - Run Both (Recommended):**
```bash
npm run dev:full
```

**Option B - Run Separately:**

Terminal 1:
```bash
npm run server    # Backend API on :3001
```

Terminal 2:
```bash
npm run dev       # Frontend on :5173
```

### 5. Access the Application

- **Website**: http://localhost:5173
- **Admin**: http://localhost:5173/admin (password from `.env.local`)
- **API Health**: http://localhost:3001/api/health

---

## 📁 Project Structure

```
artery-capital/
├── src/              # Frontend (React + Vite)
│   ├── pages/        # Page components
│   └── App.jsx       # React Router setup
├── api/              # Backend (Vercel Functions)
│   ├── applications/ # Application endpoints
│   └── scoringEngine.cjs # AI scoring algorithm
├── lib/              # Shared libraries
│   ├── supabase.js   # Database client
│   └── email-service.js # Email sending
├── server.js         # Local dev server
└── vercel.json       # Vercel deployment config
```

---

## 🎯 Features

### For Founders
- ✅ 5-step application form with validation
- ✅ AI-powered scoring (0-100)
- ✅ Estimated valuation (current, 3yr, 5yr)
- ✅ Category-by-category evaluation
- ✅ Immediate feedback on strengths/concerns
- ✅ Email confirmation
- ✅ Print and download results

### For Admins
- ✅ Secure admin dashboard
- ✅ View all applications
- ✅ AI scoring insights
- ✅ Detailed application analysis
- ✅ Print and export functionality
- ✅ Email notifications

### Technical
- ✅ Supabase PostgreSQL database
- ✅ Resend email notifications
- ✅ IP address tracking
- ✅ File upload support
- ✅ Responsive design
- ✅ Vercel serverless deployment

---

## 🛠️ Tech Stack

**Frontend:**
- React 18
- React Router 6
- Vite
- Tailwind CSS (utility-first styling)

**Backend:**
- Vercel Serverless Functions
- Supabase (PostgreSQL)
- Resend (Email)
- Node.js + Express (local dev)

**Deployment:**
- Vercel (auto-deployment)
- GitHub (version control)

---

## 📚 Documentation

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Complete development guide
- **[PHASE4_IMPLEMENTATION.md](./PHASE4_IMPLEMENTATION.md)** - Backend integration details
- **[ADMIN_SYSTEM.md](./ADMIN_SYSTEM.md)** - Admin system documentation
- **[schema.sql](./schema.sql)** - Database schema

---

## 🚢 Deployment

### Deploy to Vercel

1. **Push to GitHub**
2. **Import to Vercel**: [vercel.com](https://vercel.com/new)
3. **Add Environment Variables** in Vercel Dashboard:
   ```
   SUPABASE_URL
   SUPABASE_SERVICE_KEY
   RESEND_API_KEY
   ADMIN_EMAIL
   FROM_EMAIL
   ADMIN_PASSWORD
   NEXT_PUBLIC_APP_URL
   ```
4. **Deploy**: Automatic on push

See [PHASE4_IMPLEMENTATION.md](./PHASE4_IMPLEMENTATION.md) for detailed deployment instructions.

---

## 🔐 Environment Variables

Required for production:

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_KEY` | Service role key | Supabase Dashboard → Settings → API |
| `RESEND_API_KEY` | Email API key | Resend Dashboard → API Keys |
| `ADMIN_EMAIL` | Admin notification email | Your email |
| `FROM_EMAIL` | Sender email address | Verified domain in Resend |
| `ADMIN_PASSWORD` | Admin dashboard password | Choose secure password |
| `NEXT_PUBLIC_APP_URL` | Production URL | Your domain |

---

## 🧪 Testing

### Test Application Submission
1. Visit http://localhost:5173
2. Click "Apply for Funding"
3. Complete 5-step form
4. Submit and verify success page
5. Check Supabase for saved application
6. Check email for confirmation

### Test Admin Dashboard
1. Visit http://localhost:5173/admin
2. Login with `ADMIN_PASSWORD`
3. Verify applications list
4. Click application for details
5. Test print/download

---

## 🐛 Troubleshooting

### "Unable to connect to server"
**Fix**: Start backend server with `npm run server`

### "Supabase is not configured"
**Fix**: Add Supabase credentials to `.env.local` and restart server

### "Email service not configured"
**Note**: Application works without email. Add `RESEND_API_KEY` to enable emails.

### Port already in use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or set custom port
PORT=3002 npm run server
```

See [DEVELOPMENT.md](./DEVELOPMENT.md) for more troubleshooting.

---

## 📊 Database Schema

The `applications` table stores:
- Founder information (name, email, phone, LinkedIn)
- Company details (name, country, industry, stage)
- Business plan (problem, solution, impact)
- Traction metrics (revenue, users, growth)
- Funding requirements
- Status tracking
- Metadata (IP, user agent, timestamps)

Run `schema.sql` in Supabase to create all tables, indexes, and policies.

---

## 🎨 Design Philosophy

- **Minimalist**: Following Steve Jobs/Jony Ive principles
- **Accessible**: HCI-compliant (contrast, readability)
- **Professional**: Clean, modern aesthetic
- **African-focused**: Mission-driven design
- **Mobile-first**: Responsive on all devices

---

## 🔒 Security

- Row Level Security (RLS) on Supabase
- Environment variable protection
- IP address tracking
- Session-based admin auth
- CORS configuration
- Input validation
- File upload restrictions

**⚠️ Production Security:**
- Change default admin password
- Use strong database passwords
- Enable Supabase RLS policies
- Set up rate limiting
- Monitor logs regularly

---

## 📈 Roadmap

### Phase 5: Enhancements
- [ ] Multi-admin support
- [ ] 2FA authentication
- [ ] Email sequences for applicants
- [ ] Calendar integration
- [ ] Advanced analytics dashboard
- [ ] Applicant status portal
- [ ] Payment integration
- [ ] Portfolio showcase page

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📞 Support

- **Email**: invest@arterycapital.co.za
- **Issues**: GitHub Issues
- **Documentation**: See documentation files

---

## 📄 License

© 2026 Artery Capital. All rights reserved.

---

## 🙏 Acknowledgments

- Built with Claude AI assistance
- Inspired by African innovation
- Powered by Vercel, Supabase, and Resend

---

**Africa's innovation starts here.** 🚀

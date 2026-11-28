# GetSavDown Health Monitoring - Quick Start Guide

## 🚀 Setup in 5 Minutes

### Step 1: Configure Development Database (IMPORTANT!)

**⚠️ Do NOT use production database for testing!**

1. Create a development database branch in Neon:
   - Go to https://console.neon.tech
   - Select your project
   - Click "Branches" → "Create Branch"
   - Name: `development`
   - Base: `main`
   - Copy the connection URLs

2. Create/update `.env.local`:
   ```env
   # DEVELOPMENT DATABASE (not production!)
   DATABASE_URL="postgresql://[dev-connection-pooled]"
   DIRECT_URL="postgresql://[dev-connection-direct]"
   
   # Copy other variables from .env
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   NEXTAUTH_URL=http://localhost:3000
   # ... etc
   ```

### Step 2: Run Setup Script

```powershell
# In PowerShell (from project root)
.\scripts\setup-health-monitoring.ps1
```

This will:
- Generate Prisma client
- Create database migration
- Add `tool_health` and `tool_health_logs` tables
- Open Prisma Studio for verification

### Step 3: Start Development Server

```bash
npm run dev
```

### Step 4: Test Health Monitoring

```bash
# In another terminal
curl -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw", "tool": "youtube-thumbnail-downloader"}'
```

### Step 5: View Health Dashboard

Open browser:
```
http://localhost:3000/admin/health
```

You should see the dashboard with health data for the tool you just tested!

---

## 🧪 Run Full Testing Suite

```bash
npx tsx scripts/test-all-tools.ts
```

This will test all 76 tools and generate a detailed report.

---

## 📖 Detailed Documentation

All comprehensive guides are in `.agents/tasks/getsavdown-overhaul/`:

- **PHASE1_COMPLETE_REPORT.md** - What was implemented
- **DATABASE_MIGRATION_GUIDE.md** - Detailed migration steps
- **TESTING_GUIDE.md** - Systematic testing procedures
- **IMPLEMENTATION_STATUS.md** - Current progress
- **ACTION_PLAN.md** - Remaining phases (5-8)

---

## ⚠️ Troubleshooting

### "Migration is in a failed state"
```bash
npx prisma migrate resolve --rolled-back [migration-name]
npx prisma migrate dev
```

### "Cannot connect to database"
- Verify `.env.local` has correct DATABASE_URL and DIRECT_URL
- Check Neon database is running
- Ensure using development branch (not production!)

### "Prisma Client does not match schema"
```bash
npx prisma generate
```

### Still having issues?
See detailed troubleshooting in `DATABASE_MIGRATION_GUIDE.md`

---

## ✅ Success Checklist

- [ ] Development database created
- [ ] `.env.local` configured with dev database
- [ ] Migration ran successfully
- [ ] Tables verified in Prisma Studio
- [ ] Dev server started
- [ ] Test request made
- [ ] Health data recorded
- [ ] Dashboard displays data
- [ ] Testing script executed
- [ ] Results documented

---

## 🎯 Next Steps After Setup

1. **Review test results** from `test-results.json`
2. **Update tool statuses** based on what works/fails
3. **Disable broken tools** in admin panel
4. **Continue implementation** with Phases 5-8:
   - Unified processing experience
   - Browser-side processing
   - Hosting evaluation
   - Final QA and deployment

---

## 📞 Need Help?

Refer to detailed guides in `.agents/tasks/getsavdown-overhaul/`


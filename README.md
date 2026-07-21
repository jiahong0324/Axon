# Axon

Axon is a React + Vite student productivity platform with Supabase authentication and cloud sync, Groq-powered AI study help, timetable management, assignment & exam tracking, exercise habit tracking, semester results & CGPA calculator, push notifications, multi-language support, theming, and a public landing site with blog — all deployed on Vercel/Netlify with a serverless API layer.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, Framer Motion |
| Auth & DB | Supabase (Auth, Postgres, Realtime, Edge Functions) |
| AI | Groq API (llama-3.3-70b-versatile + llama-3.2-90b-vision-preview) |
| PDF Export | jsPDF + jspdf-autotable |
| Push Notifications | Web Push (VAPID) via serverless API |
| Deployment | Vercel (primary) / Netlify |
| i18n | Custom LanguageProvider (English, 中文, Bahasa Malaysia) |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env.local`

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GROQ_API_KEY=your_groq_api_key
VITE_GROQ_MODEL=llama-3.3-70b-versatile
VITE_GROQ_VISION_MODEL=llama-3.2-90b-vision-preview
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
```

For the serverless push API (`api/` functions), also add these as environment variables on your hosting platform:

```env
VAPID_PRIVATE_KEY=your_vapid_private_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=your_long_random_cron_secret
# Optional. Defaults to 10 minutes for delayed cron catch-up.
PUSH_MAX_LATE_MINUTES=10
```

### 3. Run Supabase SQL schemas

Run these SQL files in the **Supabase SQL Editor** in order:

| File | Purpose |
|---|---|
| `supabase-manager-schema.sql` | Manager role, profiles, push subscriptions |
| `supabase-exercise-schema.sql` | Exercise logs, XP, badges |
| `supabase-exam-results.sql` | Student semesters & courses (CGPA tracking) |
| `supabase-feedback-schema.sql` | Feedback tickets |
| `supabase-blog-and-feedback-update.sql` | Blog posts & feedback tables |
| `supabase-ai-helper.sql` | AI chat history cloud sync |
| `supabase-exam-time-migration.sql` | Exam time column migration |

The core student tables (`classes`, `assignments`, `exams`, `reminders`) are created automatically by Supabase RLS policies when you first use the app.

---

## Run / Build

```bash
# Development
npm run dev

# Production build
npm run build

# Preview build locally
npm run preview
```

---

## App Structure

```
src/
├── pages/
│   ├── landing/          # Public landing site (Home, Blog, FAQ, Contact, Helo)
│   ├── manager/          # Manager dashboard and tools
│   ├── HomePage.jsx      # Student dashboard (today's classes, announcements, AI tip)
│   ├── TimetablePage.jsx # Weekly timetable with screenshot import
│   ├── AssignmentPage.jsx
│   ├── ExamPage.jsx
│   ├── ExamResultsPage.jsx  # Semester CGPA records + Quick GPA calculator
│   ├── ExercisePage.jsx     # Habit tracker with streaks, XP, badges, AI workout plan
│   ├── AIHelperPage.jsx     # Groq chat with vision + context injection
│   ├── RemindersPage.jsx
│   ├── SettingsPage.jsx     # Profile, appearance, notifications, email digest, data export
│   ├── OnboardingPage.jsx
│   ├── AuthPage.jsx / LoginPage.jsx / RegisterPage.jsx
│   ├── UpdatePasswordPage.jsx
│   └── TermsPage.jsx
├── components/
│   ├── ImageUploadAnalyzer.jsx   # AI screenshot parser (timetable/exam result OCR)
│   ├── NotificationManager.jsx   # Push + in-app reminder scheduling
│   ├── ThemeProvider.jsx         # Dark/light/system + accent color + font settings
│   ├── LanguageProvider.jsx      # i18n context (EN / ZH / BM)
│   ├── ProtectedRoute.jsx        # Role-based auth guard (student / manager)
│   ├── Sidebar.jsx / ManagerSidebar.jsx
│   ├── Toast.jsx, Modal.jsx, ConfirmModal.jsx
│   └── ...
├── lib/
│   ├── groq.js              # Groq chat + vision API calls
│   ├── buildUserContext.js  # Injects student DB data as AI context
│   ├── exerciseUtils.js     # Streak calc, XP, badges, level system
│   ├── tarumtGrading.js     # TAR UMT grading scale + GPA/CGPA calc
│   ├── pushNotifications.js # VAPID Web Push subscription registration
│   ├── preferences.js       # Cloud-synced user preferences
│   ├── manageStudent.js     # Edge Function calls (student CRUD, invites, digest)
│   ├── generateReport.js    # PDF academic report generation
│   ├── i18n/                # Translation files
│   └── utils.js
└── App.jsx                  # React Router routes
```

---

## Student Features

| Feature | Details |
|---|---|
| **Timetable** | Weekly schedule (Lecture / Tutorial / Practical), screenshot OCR import via AI vision, time format (12hr/24hr) |
| **Assignments** | Subject, deadline, priority, status tracking |
| **Exams** | Date, venue, type, countdown badge |
| **Exam Results & CGPA** | Per-semester course grades, CGPA calculator, screenshot import, cloud sync across devices |
| **Exercise Tracker** | Daily check-in (+20 XP), streak protection (freeze), XP levelling, milestone badges, 30-day heatmap, AI workout plan |
| **AI Study Helper** | Groq chat with full DB context injection, image upload, quick-action chips (explain, summarize, quiz, plan, code, etc.), cloud chat history |
| **Reminders** | Custom reminders, push notification support, class/exam start alerts, attendance reminder |
| **Settings** | Profile, avatar color, theme (dark/light/system), accent color, font size & family, compact mode, language, AI style/language, email digest, PDF data export, delete account |
| **Onboarding** | First-login profile setup flow |

---

## Manager Features

Managers are redirected to `/manager` after login. Their role is set by changing `role` to `manager` in the `profiles` table.

| Feature | Details |
|---|---|
| **Dashboard** | Overview cards: student count, recent activity, announcements |
| **Students** | List, search, create, edit, deactivate/reactivate, delete students |
| **Student Detail** | View student's timetable, assignments, exams, activity, exercise, results |
| **Exam Results Entry** | Manager can enter/approve student semester results |
| **Announcements** | Broadcast messages shown on each student's home page |
| **Reports** | PDF academic report generation per student |
| **Activity Logs** | System-wide student activity feed |
| **Blog** | Create/edit/delete blog articles shown on the public landing site |
| **Feedback** | View and manage student feedback tickets |
| **AI Control Center** | Groq chat with full student DB access (summarize feedback, draft announcements, check-in stats, etc.) |
| **Manager Settings** | Separate settings page for manager preferences |

All destructive student operations (password reset, delete, deactivate) are routed through a Supabase Edge Function so the service role key never reaches the browser.

---

## Manager Account Setup

### First-time setup

1. Run `supabase-manager-schema.sql` in the Supabase SQL Editor.
2. Create an account through the app signup page (`/register`).
3. In the Supabase Dashboard, open **Table Editor → `profiles`**.
4. Change that user's `role` from `student` to `manager`.
5. Log out and log back in — managers are redirected to `/manager`.

### Edge Function deploy

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy manage-student --no-verify-jwt
```

Add this secret in **Supabase Dashboard → Edge Functions → Secrets**:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Push Notifications

Push notifications use Web Push (VAPID). The test endpoint lives at `api/send-test-push.js`; scheduled notifications use `api/send-push.js`.

1. Generate VAPID keys:
   ```bash
   node -e "const wp=require('web-push'); const keys=wp.generateVAPIDKeys(); console.log(keys)"
   ```
2. Add `VITE_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` to your environment.
3. On iOS, users must **Add to Home Screen** first (Safari PWA requirement).
4. Students can enable push from **Settings → Notifications**.

### Notification cron job

The scheduled endpoint is `GET https://YOUR_DOMAIN/api/send-push`. Configure your cron provider to call it every minute with this header:

```text
Authorization: Bearer YOUR_CRON_SECRET
```

The endpoint uses Malaysia time (`Asia/Kuala_Lumpur`) and accepts delayed runs for up to `PUSH_MAX_LATE_MINUTES` (10 minutes by default). Each browser/PWA must enable push once from **Settings → Notifications**; on iPhone/iPad, Axon must first be added to the Home Screen.

---

## Landing Site

The public landing site is served at `/` and includes:

| Route | Page |
|---|---|
| `/` | Hero, features, how-it-works, CTA |
| `/blog` | Article listing (content managed by manager) |
| `/blog/:slug` | Full article view |
| `/faq` | Frequently asked questions |
| `/contact` | Contact form |
| `/helo` | Help center / detailed guide |

---

## Email Digest

Students can send a formatted HTML academic report directly to their registered email from **Settings → Email Digest**. Sections are configurable (timetable, assignments, exams, results). This is handled via the `manage-student` Edge Function or a dedicated serverless route.

---

## Deployment

### Vercel (recommended)

Set these environment variables in the Vercel project settings:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GROQ_API_KEY=
VITE_GROQ_MODEL=llama-3.3-70b-versatile
VITE_GROQ_VISION_MODEL=llama-3.2-90b-vision-preview
VITE_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
PUSH_MAX_LATE_MINUTES=10
```

The `api/` directory contains Vercel serverless functions (e.g. push sender). The `vercel.json` configures SPA rewrites.

### Netlify

Use `netlify.toml` for build settings and set the same environment variables in the Netlify dashboard.

---

## Utility Scripts

| Script | Purpose |
|---|---|
| `check_subs.js` | Check active push subscriptions in Supabase |
| `send-announcement.js` | Programmatically send announcements |
| `script.cjs` | Misc utility |
| `START-HERE-deploy-manager.cmd` | Quick-start script for deploy manager |
| `deploy-manager-function.bat` | Deploy Edge Function via CLI |

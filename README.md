# Axon

Axon is a React + Vite student productivity app with Supabase authentication/data, Groq-powered study help, timetable and exam screenshot parsing, reminders, settings, and PWA support.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GROQ_API_KEY=your_groq_api_key
VITE_GROQ_MODEL=llama-3.3-70b-versatile
VITE_GROQ_VISION_MODEL=llama-3.2-90b-vision-preview
```

3. In Supabase, run the SQL schema from the build prompt for `classes`, `assignments`, `exams`, and `reminders`.
4. Get Supabase credentials from Project Settings → API. Use the project URL and anon public key.
5. Get a Groq API key from the Groq console.

## Run

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Manager Account

### First-time setup

1. Run `supabase-manager-schema.sql` in the Supabase SQL Editor.
2. Create an account through the app signup page.
3. In Supabase Dashboard, open Table Editor -> `profiles`.
4. Change that user's `role` from `student` to `manager`.
5. Log out and log back in. Managers are redirected to `/manager`.

### Edge Function setup

Manager account actions are handled by `supabase/functions/manage-student/index.ts` so the service role key never reaches the browser.

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy manage-student --no-verify-jwt
```

Then add this Edge Function secret in Supabase Dashboard:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Manager features

- Separate amber-accented manager dashboard and navigation.
- Student profile, email, password reset, deactivate/reactivate, delete, and create account actions through the Edge Function.
- Read-only access to student timetables, assignments, exams, and activity.
- Exam result entry, with results shown on the student's Exam page.
- Announcements shown on the student Home page.
- PDF academic reports using the existing PDF export stack.

## Deployment

Set these environment variables on Vercel or Netlify:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GROQ_API_KEY=your_groq_api_key
VITE_GROQ_MODEL=llama-3.3-70b-versatile
VITE_GROQ_VISION_MODEL=llama-3.2-90b-vision-preview
```

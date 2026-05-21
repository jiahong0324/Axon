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

## Deployment

Set these environment variables on Vercel or Netlify:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GROQ_API_KEY=your_groq_api_key
VITE_GROQ_MODEL=llama-3.3-70b-versatile
VITE_GROQ_VISION_MODEL=llama-3.2-90b-vision-preview
```

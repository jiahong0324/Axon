# UniMind

UniMind is a React + Vite student productivity app with Supabase authentication/data, Groq-powered study help, timetable and exam screenshot parsing, reminders, settings, and PWA support.

## Setup

1. Create `.env` in the project root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
```

2. Install and run:

```bash
npm install
npm run dev
```

3. In Supabase, run the SQL schema from the build prompt for `classes`, `assignments`, `exams`, and `reminders`.

4. Get Supabase credentials from Project Settings → API. Use the project URL and anon public key.

5. Get a Groq API key at [console.groq.com](https://console.groq.com), then add it to `.env` as `GROQ_API_KEY`. The app calls Groq through `/api/groq` so the key stays server-side on Vercel.

## PWA

Android users can install from the browser prompt. iOS users can tap Share → Add to Home Screen.

## Deploy

Deploy to Vercel and add these environment variables in Project Settings:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
```

The included `vercel.json` routes refreshes back to `index.html` for React Router, and `api/groq.js` handles Groq chat and vision requests.

## Sample Data

After creating a user, add sample rows in Supabase and replace `user_id` with your auth UUID:

- Database Management, Monday, 10:00-12:00, Dr. Chen, Room A201, `L`
- Java Programming Lab, Monday, 14:00-16:00, Mr. Lim, Lab B102, `P`
- Mobile App Development, Wednesday, 09:00-11:00, Ms. Tan, Room C303, `L`
- Software Engineering Tutorial, Thursday, 13:00-15:00, Dr. Kumar, Room A105, `T`

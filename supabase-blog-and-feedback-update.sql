-- 1. Create blog_posts table
create table if not exists public.blog_posts (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  title text not null,
  category text not null,
  description text not null,
  read_time text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  author_id uuid references auth.users(id) on delete set null
);

-- Enable RLS for blog_posts
alter table public.blog_posts enable row level security;

-- Policies for blog_posts
create policy "Anyone can view blog posts."
  on public.blog_posts for select
  using (true);

create policy "Managers can insert blog posts."
  on public.blog_posts for insert
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'manager'));

create policy "Managers can update blog posts."
  on public.blog_posts for update
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'manager'));

create policy "Managers can delete blog posts."
  on public.blog_posts for delete
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'manager'));

-- 2. Update feedback table
alter table public.feedback alter column user_id drop not null;
alter table public.feedback add column if not exists name text;
alter table public.feedback add column if not exists email text;

-- Add policy for anonymous feedback insertion
create policy "Anyone can insert feedback."
  on public.feedback for insert
  with check (true);

-- 3. Insert 9 blog posts (in point form)
insert into public.blog_posts (slug, title, category, description, read_time, content) values
(
  'plan-productive-study-week',
  'How to Plan a Productive Study Week',
  'Study Planning',
  'A simple weekly planning method for balancing class time, assignments, revision, and rest.',
  '5 min read',
  '<h2>The Weekly Sunday Review</h2><ul><li>Set aside 15 minutes every Sunday evening.</li><li>Review your upcoming commitments.</li><li>Block out non-negotiable times (classes, work, society meetings).</li></ul><h2>Prioritize Your Assignments</h2><ul><li>List all tasks and rank them by deadline and difficulty.</li><li>Allocate hardest tasks to your highest-energy periods (usually mornings).</li></ul><h2>Use Time Blocking</h2><ul><li>Don''t just write "study". Write exactly what you will do.</li><li>Example: "Read Chapter 4 of Data Structures".</li><li>Specific goals reduce the friction of getting started.</li></ul><h2>Schedule Your Rest</h2><ul><li>Burnout destroys productivity.</li><li>Schedule deliberate downtime first, then build your work around it.</li><li>Rest is just as important as studying.</li></ul>'
),
(
  'avoid-missing-assignment-deadlines',
  '5 Ways to Avoid Missing Assignment Deadlines',
  'Deadlines',
  'Turn big coursework into smaller checkpoints and keep your progress visible before the due date.',
  '4 min read',
  '<h2>1. Break It Down</h2><ul><li>A 3,000-word essay is intimidating.</li><li>Break it into: "Research sources", "Write outline", "Draft first 500 words", etc.</li><li>Assign a mini-deadline to each smaller step.</li></ul><h2>2. Start Imperfectly</h2><ul><li>Give yourself permission to write a terrible first draft.</li><li>You cannot edit a blank page.</li><li>Just start typing, no matter how bad it sounds.</li></ul><h2>3. Set Artificial Deadlines</h2><ul><li>If it''s due Friday, tell yourself it''s due Wednesday.</li><li>Put Wednesday in your calendar.</li><li>Enjoy a two-day buffer for unexpected emergencies.</li></ul><h2>4. Visual Reminders</h2><ul><li>Keep deadlines visible.</li><li>Use a tool like Axon to see the countdown clearly.</li></ul><h2>5. Avoid the "I''ll Do It Later" Trap</h2><ul><li>Challenge the thought immediately.</li><li>Ask: "Why later? What will be different later?"</li><li>Do a 5-minute piece of the task right now instead.</li></ul>'
),
(
  'prepare-exams-without-stress',
  'How to Prepare for Exams Without Last-Minute Stress',
  'Exam Prep',
  'Use countdowns, topic lists, and focused revision blocks to make exam season more manageable.',
  '6 min read',
  '<h2>Start Early, Revise Often</h2><ul><li>Spaced repetition beats cramming every time.</li><li>Study 1 hour a day for 10 days rather than 10 hours the day before.</li><li>This method dramatically improves long-term retention.</li></ul><h2>Create a Master Topic List</h2><ul><li>List every syllabus topic.</li><li>Grade your confidence: Red (clueless), Yellow (okay), Green (confident).</li><li>Focus initial revision entirely on Red topics.</li></ul><h2>Active Recall > Passive Reading</h2><ul><li>Re-reading notes is an illusion of competence.</li><li>Test yourself using flashcards.</li><li>Try explaining concepts aloud without notes.</li></ul><h2>Simulate Exam Conditions</h2><ul><li>Do past papers under strict, timed conditions.</li><li>No music, no phone, no help.</li><li>This reduces anxiety on the actual exam day.</li></ul>'
),
(
  'mastering-pomodoro-technique',
  'Mastering the Pomodoro Technique',
  'Productivity',
  'Learn how to use short, focused bursts of work to maximize your focus and prevent mental fatigue.',
  '4 min read',
  '<h2>The Basic Structure</h2><ul><li>Work for 25 minutes completely uninterrupted.</li><li>Take a 5-minute break.</li><li>After 4 cycles, take a longer 15-30 minute break.</li></ul><h2>Why It Works</h2><ul><li>It creates a sense of urgency.</li><li>It forces you to take breaks before you get tired.</li><li>It prevents you from getting bogged down in minor details.</li></ul><h2>Common Mistakes</h2><ul><li>Checking your phone during the 25-minute block.</li><li>Skipping breaks because you feel "in the zone".</li><li>Making the work intervals too long (e.g., 90 minutes).</li></ul>'
),
(
  'how-to-take-effective-notes',
  'How to Take Effective Notes in Lectures',
  'Study Skills',
  'Stop transcribing everything the lecturer says. Learn methods to capture the core ideas.',
  '5 min read',
  '<h2>The Cornell Method</h2><ul><li>Divide the page: Notes (right), Cues (left), Summary (bottom).</li><li>Write main points in the Notes section during class.</li><li>Write questions/keywords in the Cues section after class.</li><li>Write a 2-sentence summary at the bottom.</li></ul><h2>Don''t Transcribe</h2><ul><li>Your goal is to understand, not to be a court reporter.</li><li>Listen for concepts, not just words.</li><li>Use your own words wherever possible.</li></ul><h2>Review Within 24 Hours</h2><ul><li>The "forgetting curve" is steep.</li><li>Reviewing your notes on the same day dramatically improves retention.</li></ul>'
),
(
  'overcoming-academic-imposter-syndrome',
  'Overcoming Academic Imposter Syndrome',
  'Mental Health',
  'Feel like you don''t belong in your degree? You are not alone. Here is how to handle it.',
  '6 min read',
  '<h2>Recognize the Symptoms</h2><ul><li>Attributing your success entirely to "luck".</li><li>Fear that you will be "found out" as a fraud.</li><li>Downplaying your achievements and grades.</li></ul><h2>Acknowledge the Facts</h2><ul><li>You were accepted into the program for a reason.</li><li>Your grades are a reflection of your work, not accidents.</li></ul><h2>Talk About It</h2><ul><li>Most high-achieving students experience this.</li><li>Talking to peers often reveals they feel exactly the same way.</li></ul><h2>Focus on Learning, Not Performing</h2><ul><li>Reframe your mindset: you are here to learn, not to prove you already know everything.</li><li>Mistakes are part of the learning process, not proof of inadequacy.</li></ul>'
),
(
  'optimizing-your-sleep-schedule',
  'Optimizing Your Sleep Schedule for Better Grades',
  'Health & Habits',
  'All-nighters do more harm than good. Discover why sleep is your greatest academic weapon.',
  '5 min read',
  '<h2>The Role of Sleep in Memory</h2><ul><li>Your brain consolidates what you learned during sleep.</li><li>Cutting sleep short literally deletes your study efforts.</li></ul><h2>Consistency is Key</h2><ul><li>Go to bed and wake up at the exact same time every day.</li><li>Yes, even on weekends.</li><li>This regulates your circadian rhythm and makes waking up easier.</li></ul><h2>The Wind-Down Routine</h2><ul><li>Stop studying at least 1 hour before bed.</li><li>Avoid blue light (phones/laptops) or use a strong blue-light filter.</li><li>Read a physical book or do light stretching to signal to your brain it''s time to sleep.</li></ul>'
),
(
  'managing-group-projects',
  'How to Manage Group Projects Without Losing Your Mind',
  'Teamwork',
  'Group assignments are notoriously frustrating. Learn how to lead effectively and deal with slackers.',
  '7 min read',
  '<h2>Set Expectations Early</h2><ul><li>Create a group charter in the very first meeting.</li><li>Define roles, deadlines, and preferred communication methods.</li><li>Agree on what happens if someone misses a deadline.</li></ul><h2>Use Collaborative Tools</h2><ul><li>Don''t email Word documents back and forth.</li><li>Use Google Docs, Notion, or Trello to keep everything central.</li></ul><h2>Handle Conflict Professionally</h2><ul><li>If someone isn''t contributing, don''t attack them personally.</li><li>Ask if they are struggling with the material or need help.</li><li>Document everything in case you need to escalate to the professor.</li></ul>'
),
(
  'balancing-part-time-work',
  'Balancing Part-Time Work with Full-Time Studies',
  'Time Management',
  'Working while studying requires military-grade time management. Here are our top tips.',
  '5 min read',
  '<h2>Communicate Your Availability</h2><ul><li>Be extremely clear with your employer about your class schedule.</li><li>Request time off for exam weeks well in advance.</li></ul><h2>Maximize Pockets of Time</h2><ul><li>Got 30 minutes on the bus? Read a chapter.</li><li>Got 1 hour between classes? Do a practice quiz.</li><li>Don''t wait for massive 4-hour blocks of free time to study.</li></ul><h2>Protect Your Days Off</h2><ul><li>Try to schedule at least one full day where you neither work nor study.</li><li>This prevents total burnout mid-semester.</li></ul>'
);

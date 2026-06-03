-- 1. Create or Update blog_posts table
create table if not exists public.blog_posts (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  title text not null,
  category text not null,
  description text not null,
  read_time text not null,
  content text not null,
  image_url text,
  likes_count integer default 0,
  views_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  author_id uuid references auth.users(id) on delete set null
);

-- Ensure columns exist if table already existed
alter table public.blog_posts add column if not exists image_url text;
alter table public.blog_posts add column if not exists likes_count integer default 0;
alter table public.blog_posts add column if not exists views_count integer default 0;

-- Enable RLS for blog_posts
alter table public.blog_posts enable row level security;

-- Drop existing policies to avoid conflicts if re-running
drop policy if exists "Anyone can view blog posts." on public.blog_posts;
drop policy if exists "Managers can insert blog posts." on public.blog_posts;
drop policy if exists "Managers can update blog posts." on public.blog_posts;
drop policy if exists "Managers can delete blog posts." on public.blog_posts;

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

-- 2. Create blog_comments table
create table if not exists public.blog_comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.blog_posts(id) on delete cascade not null,
  parent_id uuid references public.blog_comments(id) on delete cascade,
  name text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.blog_comments add column if not exists parent_id uuid references public.blog_comments(id) on delete cascade;

alter table public.blog_comments enable row level security;

drop policy if exists "Anyone can view comments." on public.blog_comments;
drop policy if exists "Anyone can insert comments." on public.blog_comments;
drop policy if exists "Managers can delete comments." on public.blog_comments;

create policy "Anyone can view comments."
  on public.blog_comments for select
  using (true);

create policy "Anyone can insert comments."
  on public.blog_comments for insert
  with check (true);

create policy "Managers can delete comments."
  on public.blog_comments for delete
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'manager'));

-- 3. Create function to increment likes and views securely
create or replace function increment_blog_like(post_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.blog_posts
  set likes_count = likes_count + 1
  where id = post_id;
end;
$$;

create or replace function increment_blog_view(post_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.blog_posts
  set views_count = views_count + 1
  where id = post_id;
end;
$$;

-- 4. Update feedback table (safe to run multiple times)
alter table public.feedback alter column user_id drop not null;
alter table public.feedback add column if not exists name text;
alter table public.feedback add column if not exists email text;

-- Drop existing policy if re-running
drop policy if exists "Anyone can insert feedback." on public.feedback;

-- Add policy for anonymous feedback insertion
create policy "Anyone can insert feedback."
  on public.feedback for insert
  with check (true);

-- 5. Insert or Update 10 blog posts (with images, full professional content, and consolidated categories)
insert into public.blog_posts (slug, title, category, description, read_time, image_url, content) values
(
  'plan-productive-study-week',
  'How to Plan a Productive Study Week',
  'Time Management',
  'A simple weekly planning method for balancing class time, assignments, revision, and rest.',
  '5 min read',
  '/blog/plan-productive-study-week.png',
  '<h2>The Weekly Sunday Review</h2><p>One of the most effective habits you can build as a student is the Sunday evening review. By dedicating just 15 to 20 minutes before the new week begins, you can drastically reduce Monday morning anxiety. During this time, look at your upcoming classes, imminent deadlines, and any extracurricular commitments. The goal is to get a bird''s-eye view of what is required of you over the next seven days.</p><h2>Prioritize Your Assignments</h2><p>Once you know what is due, you need to prioritize. Not all assignments carry the same weight, and not all of them require the same level of cognitive effort. Rank your tasks based on their deadlines and their overall impact on your grade. When planning your days, try to allocate the most mentally taxing tasks to the periods when you naturally have the most energy, which for many students is early in the morning.</p><h2>Use Time Blocking</h2><p>Vague to-do lists are the enemy of productivity. Instead of writing down a generic task like "study chemistry," try to be highly specific. A time block should look like "Read Chapter 4 of Chemistry and complete practice problems 1-10." By defining exactly what you intend to do and setting a specific time frame for it, you remove the friction of having to decide what to study when you sit down at your desk.</p><h2>Schedule Your Rest</h2><p>It might sound counterintuitive, but the most productive students schedule their downtime first. Burnout is a very real threat during the academic year, and working relentlessly without breaks is a guaranteed way to hit a wall. Decide when you will stop working each day—perhaps 8:00 PM—and stick to it. Ensuring you have time to relax, exercise, and socialize will make the hours you do spend studying far more effective.</p>'
),
(
  'avoid-missing-assignment-deadlines',
  '5 Ways to Avoid Missing Assignment Deadlines',
  'Time Management',
  'Turn big coursework into smaller checkpoints and keep your progress visible before the due date.',
  '4 min read',
  '/blog/avoid-missing-assignment-deadlines.png',
  '<h2>1. Break It Down</h2><p>When you are handed a syllabus with a 3,000-word research paper due at the end of the semester, it is easy to feel overwhelmed. The key to tackling massive assignments is to break them down into microscopic, manageable steps. Instead of looking at the final product, create a checklist of smaller milestones: "Find 5 academic sources," "Write a rough outline," and "Draft the introduction." Give each of these smaller tasks its own deadline.</p><h2>2. Start Imperfectly</h2><p>Perfectionism is often procrastination in disguise. Many students delay starting an assignment because they feel they do not know exactly what to write yet. Give yourself permission to write a terrible first draft. The hardest part is simply getting words onto a blank page. Once you have a messy draft, you can revise and refine it. Remember, you cannot edit a blank page.</p><h2>3. Set Artificial Deadlines</h2><p>If an assignment is due on a Friday, trick your brain into believing it is actually due on Wednesday. Put Wednesday in your planner and treat it as the absolute final cutoff. By doing this, you naturally build in a two-day buffer. If an unexpected emergency happens, or if the assignment turns out to be much harder than you anticipated, you still have time to finish it without pulling an all-nighter.</p><h2>4. Visual Reminders</h2><p>Out of sight means out of mind. Keep your impending deadlines highly visible. Whether you use a digital tool like Axon, a giant whiteboard in your dorm room, or sticky notes on your laptop, make sure you cannot avoid seeing what is due. Visual reminders maintain a healthy level of urgency and prevent deadlines from sneaking up on you.</p><h2>5. Avoid the "I''ll Do It Later" Trap</h2><p>We all fall into the trap of thinking our future selves will somehow have more energy and motivation than our present selves. When you catch yourself thinking "I''ll just do it later," challenge that thought immediately. Ask yourself what will actually be different later. Instead of putting off the entire task, commit to doing just five minutes of it right now. Often, starting is all it takes to keep going.</p>'
),
(
  'prepare-exams-without-stress',
  'How to Prepare for Exams Without Last-Minute Stress',
  'Academic Skills',
  'Use countdowns, topic lists, and focused revision blocks to make exam season more manageable.',
  '6 min read',
  '/blog/prepare-exams-without-stress.png',
  '<h2>Start Early, Revise Often</h2><p>The science of learning is incredibly clear on this point: spaced repetition beats cramming every single time. Studying a subject for one hour a day over the course of ten days will yield significantly better long-term retention than studying for ten hours the day before the exam. Spacing out your revision allows your brain time to form stronger neural connections, meaning you are less likely to blank out during the test.</p><h2>Create a Master Topic List</h2><p>Before you begin revising, you need to know exactly what you are up against. Take your syllabus and create a master list of every topic that could potentially be on the exam. Next, use a traffic light system to grade your confidence. Mark topics red if you are completely lost, yellow if you kind of understand them, and green if you are highly confident. Your initial revision sessions should focus entirely on the red topics.</p><h2>Active Recall > Passive Reading</h2><p>Simply re-reading your textbook or highlighting your notes gives you a dangerous illusion of competence. Because the material looks familiar on the page, you trick yourself into thinking you know it. True learning requires active recall. You must close the book and force your brain to retrieve the information. Use flashcards, try explaining complex concepts aloud to an empty room, or teach the material to a friend.</p><h2>Simulate Exam Conditions</h2><p>A major cause of exam stress is the unfamiliar environment. You can mitigate this by simulating exam conditions at home. Find past papers or practice questions, set a timer, clear your desk of everything except a pen, and turn off your phone. Doing practice papers under strict, timed conditions not only tests your knowledge but also trains you to manage your time effectively and reduces anxiety when the real day arrives.</p>'
),
(
  'mastering-pomodoro-technique',
  'Mastering the Pomodoro Technique',
  'Time Management',
  'Learn how to use short, focused bursts of work to maximize your focus and prevent mental fatigue.',
  '4 min read',
  '/blog/mastering-pomodoro-technique.png',
  '<h2>The Basic Structure</h2><p>The Pomodoro Technique is one of the most famous time management methods in the world, and for good reason—it works. The structure is remarkably simple: you pick a single task, set a timer for 25 minutes, and work on that task with absolute zero interruptions. When the timer rings, you take a mandatory 5-minute break. After completing four of these 25-minute cycles (called Pomodoros), you reward yourself with a longer break of 15 to 30 minutes.</p><h2>Why It Works</h2><p>This technique is highly effective for several reasons. First, 25 minutes is short enough that almost anyone can maintain focus for that duration, reducing the initial friction of starting a daunting task. It creates a subtle sense of urgency that prevents you from getting bogged down in perfectionism. Most importantly, the mandatory breaks force you to rest before you actually feel fatigued, keeping your energy levels stable throughout the day.</p><h2>Common Mistakes</h2><p>Many students try the Pomodoro Technique but fail because they break the fundamental rules. The most common mistake is picking up your phone or checking email during the 25-minute work block. A Pomodoro must be completely uninterrupted; if you get distracted, you technically have to start the timer over. Another mistake is skipping the 5-minute breaks because you feel "in the zone." Skipping breaks leads to rapid burnout later in the day.</p>'
),
(
  'how-to-take-effective-notes',
  'How to Take Effective Notes in Lectures',
  'Academic Skills',
  'Stop transcribing everything the lecturer says. Learn methods to capture the core ideas.',
  '5 min read',
  '/blog/how-to-take-effective-notes.png',
  '<h2>The Cornell Method</h2><p>If your notes are just a massive block of unreadable text, it is time to try the Cornell Method. Divide your page into three sections: a narrow left column for cues, a wide right column for your main notes, and a small section at the bottom for a summary. During the lecture, write your main points in the right column. After class, pull out keywords and questions into the left column. Finally, write a brief two-sentence summary at the bottom. This method forces you to engage with the material multiple times.</p><h2>Don''t Transcribe</h2><p>Your goal in a lecture is to understand the concepts being taught, not to act as a human court reporter. Trying to write down every single word the professor says is a losing battle that prevents you from actually listening. Instead, listen for the core ideas, the underlying theories, and the connections between topics. Whenever possible, synthesize what the professor is saying and write it down in your own words.</p><h2>Review Within 24 Hours</h2><p>The human brain is incredibly efficient at forgetting things it doesn''t think are important. According to the forgetting curve, you will lose a massive percentage of what you heard in a lecture within the first 24 hours. To combat this, make it a habit to quickly review your notes on the same day they were taken. Just spending 10 minutes looking over what you wrote will dramatically cement the information in your long-term memory.</p>'
),
(
  'overcoming-academic-imposter-syndrome',
  'Overcoming Academic Imposter Syndrome',
  'Health & Wellness',
  'Feel like you don''t belong in your degree? You are not alone. Here is how to handle it.',
  '6 min read',
  '/blog/overcoming-academic-imposter-syndrome.png',
  '<h2>Recognize the Symptoms</h2><p>Imposter syndrome is the overwhelming feeling that you do not belong in your academic program and that you will eventually be exposed as a fraud. Common symptoms include attributing your good grades entirely to luck, downplaying your hard work, and constantly comparing your behind-the-scenes struggles to everyone else''s highlight reels. The first step to overcoming imposter syndrome is simply recognizing when these thoughts are occurring.</p><h2>Acknowledge the Facts</h2><p>When you feel like a fraud, you must ground yourself in objective reality. You were accepted into your university program because the admissions committee reviewed your past performance and believed you were capable of succeeding. When you score well on an exam, it is not because the professor made a mistake; it is a direct reflection of the effort you put in. Keep a small list of your academic accomplishments to look at when self-doubt creeps in.</p><h2>Talk About It</h2><p>Imposter syndrome thrives in isolation. Because everyone is trying so hard to project an image of effortless intelligence, we assume we are the only ones struggling. The truth is that a staggering majority of high-achieving students experience these exact same feelings. Opening up to a trusted peer or mentor about your doubts often reveals that they feel exactly the same way, which immediately diminishes the power of the anxiety.</p><h2>Focus on Learning, Not Performing</h2><p>A major driver of imposter syndrome is a "performance" mindset—the belief that you are at university to prove how smart you already are. You need to reframe this into a "learning" mindset. You are at university because there are things you do not know yet, and you are there to learn them. Asking questions, making mistakes, and struggling with complex material are not signs of inadequacy; they are the literal definition of learning.</p>'
),
(
  'optimizing-your-sleep-schedule',
  'Optimizing Your Sleep Schedule for Better Grades',
  'Health & Wellness',
  'All-nighters do more harm than good. Discover why sleep is your greatest academic weapon.',
  '5 min read',
  '/blog/optimizing-your-sleep-schedule.png',
  '<h2>The Role of Sleep in Memory</h2><p>In university culture, staying up all night to study is often glorified as a badge of honor. Biologically, it is one of the worst things you can do for your grades. Your brain processes and consolidates the information you learned during the day while you are asleep. Cutting your sleep short literally interrupts this process, meaning you will forget a large portion of what you sacrificed your sleep to study.</p><h2>Consistency is Key</h2><p>Getting 8 hours of sleep is important, but getting those 8 hours at the same time every day is arguably even more crucial. You should aim to go to bed and wake up at the exact same time every single day, including on weekends. This consistency regulates your body''s internal circadian rhythm. Over time, you will find it much easier to fall asleep at night, and you will wake up feeling naturally refreshed rather than groggy.</p><h2>The Wind-Down Routine</h2><p>You cannot expect your brain to go from intense calculus studying directly into deep sleep. You need a buffer. Establish a wind-down routine that starts at least one hour before your target bedtime. Stop studying, step away from stressful tasks, and critically, avoid blue light from phones and laptops. Read a physical book, do some light stretching, or listen to a podcast. This signals to your brain that it is time to transition into sleep mode.</p>'
),
(
  'managing-group-projects',
  'How to Manage Group Projects Without Losing Your Mind',
  'Academic Skills',
  'Group assignments are notoriously frustrating. Learn how to lead effectively and deal with slackers.',
  '7 min read',
  '/blog/managing-group-projects.png',
  '<h2>Set Expectations Early</h2><p>Group projects often devolve into chaos because no one establishes clear rules at the beginning. In your very first meeting, you should create a group charter. This doesn''t have to be overly formal, but it should explicitly outline everyone''s roles, internal deadlines, and preferred methods of communication. Furthermore, you should all agree on a protocol for what happens if someone misses a deadline or stops communicating.</p><h2>Use Collaborative Tools</h2><p>Nothing slows a group project down faster than emailing Microsoft Word documents back and forth, resulting in files named "Final_Draft_v4_FINAL_REAL.docx". Bring your team into the modern era by using collaborative tools. Set up a shared Google Drive for documents, use Notion for organizing research, or create a Trello board to track who is working on what. Centralizing your workflow keeps everyone on the same page.</p><h2>Handle Conflict Professionally</h2><p>It is almost inevitable that at some point, a group member will drop the ball. When this happens, it is crucial to handle the situation professionally rather than attacking them personally. Approach them and ask if they are struggling with the material or if they need help. Keep a clear, written record of who was assigned what, and document any lack of contribution. If the situation does not improve, you will have the evidence needed to escalate the issue to your professor.</p>'
),
(
  'balancing-part-time-work',
  'Balancing Part-Time Work with Full-Time Studies',
  'Time Management',
  'Working while studying requires military-grade time management. Here are our top tips.',
  '5 min read',
  '/blog/balancing-part-time-work.png',
  '<h2>Communicate Your Availability</h2><p>If you are juggling a job and a degree, clear communication with your employer is your first line of defense. At the start of every semester, provide your manager with your exact class schedule and highlight any days you absolutely cannot work. More importantly, look at your syllabus and request time off for midterms and final exam weeks well in advance. Most employers are accommodating if you give them plenty of notice.</p><h2>Maximize Pockets of Time</h2><p>When you have limited free time, you cannot afford to wait for massive, four-hour blocks to get your studying done. You must learn to maximize the small pockets of time hidden throughout your day. Got 30 minutes on the bus commute? Read a chapter. Have an hour between a lecture and your shift? Do a practice quiz in the library. These small, scattered study sessions add up remarkably fast.</p><h2>Protect Your Days Off</h2><p>When you work and study, it is very easy to fall into a cycle where you are doing one or the other seven days a week. This is a fast track to severe burnout. You must ruthlessly protect your days off. Aim to schedule at least one full day a week where you neither work nor study. Use this day purely to recover, socialize, and rest. Guard this recovery time as fiercely as you would a final exam.</p>'
),
(
  'sustainable-study-diet',
  'How to Build a Sustainable Study Diet',
  'Health & Wellness',
  'What you eat directly impacts how you study. Discover foods that boost cognitive performance.',
  '5 min read',
  '/blog/sustainable-study-diet.png',
  '<h2>Brain Food is Real</h2><p>When you are buried in assignments, it is incredibly tempting to survive on instant ramen, energy drinks, and highly processed snacks. However, your brain requires an immense amount of energy to focus, process complex information, and retain memories. Feeding it low-quality fuel directly impacts your cognitive performance, leading to brain fog, fatigue, and difficulty concentrating.</p><h2>Hydration is Non-Negotiable</h2><p>The simplest and most effective change you can make to your diet is drinking more water. Mild dehydration—so mild you might not even feel thirsty—is enough to impair your attention, short-term memory, and psychomotor skills. Keep a large reusable water bottle on your desk at all times. If you struggle to drink plain water, try infusing it with lemon or cucumber.</p><h2>The Sugar Crash Trap</h2><p>When you feel your energy dipping at 3:00 PM, a sugary snack or an energy drink feels like a quick fix. Unfortunately, this creates a massive spike in blood sugar followed by a sharp crash. This crash leaves you feeling more exhausted than you were before you ate. Instead of relying on sugar, try snacking on complex carbohydrates and healthy fats, such as a handful of almonds or an apple with peanut butter, which provide a slow, steady release of energy.</p><h2>Meal Prep for the Week</h2><p>The biggest barrier to healthy eating as a student is time. When you are starving after a long day of lectures, you are going to choose whatever is fastest. This is why meal prepping is essential. Dedicate a couple of hours on the weekend to cook large batches of grains (like quinoa or brown rice), roast vegetables, and prepare proteins. Having ready-to-eat, healthy meals in the fridge completely removes the friction of eating well during a stressful week.</p>'
)
ON CONFLICT (slug) DO UPDATE SET 
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  read_time = EXCLUDED.read_time,
  image_url = EXCLUDED.image_url,
  content = EXCLUDED.content;

-- Blast all posts with 1000+ views and 300+ likes
update public.blog_posts 
set views_count = floor(random() * 4000 + 1000), 
    likes_count = floor(random() * 700 + 300);

-- Clear existing comments so we don't duplicate on re-runs
delete from public.blog_comments;

-- 6. Massive Highly-Specific Hand-Crafted Seeding Block
DO $$
DECLARE
  pid uuid;
  c1 uuid;
  c2 uuid;
  c3 uuid;
BEGIN
  -- POST: plan-productive-study-week
  SELECT id INTO pid FROM public.blog_posts WHERE slug = 'plan-productive-study-week';
  IF pid IS NOT NULL THEN
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Sarah M.', 'The Sunday review concept is brilliant! I always used to wake up on Monday completely stressed out because I had no idea what was due. Going to try taking 20 mins tonight to map it all out.', now() - interval '14 days') RETURNING id INTO c1;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c1, 'David L.', 'Same here! I started doing this last month and the mental clarity it gives you is honestly life-changing.', now() - interval '13 days');
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c1, 'Axon Team', 'So glad to hear it Sarah! Let us know how your first Sunday review goes.', now() - interval '13 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Emily C.', 'How do you recommend handling time blocking when your professors frequently change the syllabus or add surprise assignments? I find my schedule just falls apart.', now() - interval '10 days') RETURNING c2;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c2, 'Marcus T.', 'Leave "buffer blocks" in your schedule! I usually leave 2 hours completely blank on Wednesdays just in case something comes up. If nothing comes up, I just take a nap lol.', now() - interval '9 days');
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c2, 'Emily C.', 'Buffer blocks... that is so smart. Thanks Marcus!', now() - interval '9 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Jordan K.', 'Great tips. Setting a hard stop at 8 PM is the hardest part for me, but I know I need to do it.', now() - interval '5 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Liam R.', 'Does anyone else struggle to accurately estimate how long a reading will take? I block 1 hour and it takes 3.', now() - interval '2 days') RETURNING c3;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c3, 'Chloe B.', 'Yes!! The rule of thumb I heard is to multiply whatever time you think it will take by 1.5.', now() - interval '1 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Aisha V.', 'Really solid advice, thanks for putting this together.', now() - interval '1 days');
  END IF;

  -- POST: avoid-missing-assignment-deadlines
  SELECT id INTO pid FROM public.blog_posts WHERE slug = 'avoid-missing-assignment-deadlines';
  IF pid IS NOT NULL THEN
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Jake P.', 'Perfectionism is definitely procrastination in disguise. That line hit me hard. I literally spent 3 hours yesterday just trying to write the perfect opening sentence for my history essay.', now() - interval '20 days') RETURNING c1;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c1, 'Mia S.', 'I do the exact same thing. Just write garbage and fix it later is the only way I survive now.', now() - interval '19 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Omar F.', 'Setting artificial deadlines has saved my GPA. I always pretend things are due 2 days before they actually are. It gives you so much peace of mind.', now() - interval '15 days') RETURNING c2;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c2, 'Sophie T.', 'Do you use a digital planner for this or paper?', now() - interval '14 days');
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c2, 'Omar F.', 'Mostly digital! I put it right in my Google Calendar.', now() - interval '13 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Lucas H.', 'Breaking a 3000-word essay into 300-word chunks makes it feel so much less intimidating. Good article.', now() - interval '10 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Isabella M.', 'I still struggle with the "I''ll do it later" trap. Any advice for when you just have literally zero energy?', now() - interval '8 days') RETURNING c3;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c3, 'Axon Team', 'Hey Isabella! When energy is absolute zero, try the "5-Minute Rule". Tell yourself you only have to work for 5 minutes. If you still want to quit after 5 mins, you can. But usually, just starting gives you the momentum to keep going!', now() - interval '7 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Ethan D.', 'Visual reminders are huge. Post-it notes on my monitor are the only way I remember to submit my weekly quizzes.', now() - interval '3 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Ava L.', 'Very helpful, definitely sharing this with my study group.', now() - interval '1 days');
  END IF;

  -- POST: prepare-exams-without-stress
  SELECT id INTO pid FROM public.blog_posts WHERE slug = 'prepare-exams-without-stress';
  IF pid IS NOT NULL THEN
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Noah J.', 'Active recall completely changed how I study. I used to just re-read the textbook for 5 hours and then bomb the test. Using flashcards and testing myself feels harder, but it actually works.', now() - interval '25 days') RETURNING c1;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c1, 'Emma W.', 'What app do you use for flashcards? Anki?', now() - interval '24 days');
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c1, 'Noah J.', 'Yep, Anki is the best because of the spaced repetition algorithm.', now() - interval '23 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Oliver B.', 'The traffic light system for the master topic list is genius. I usually just start studying from chapter 1 and run out of time before I get to the hard stuff.', now() - interval '18 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Charlotte R.', 'Simulating exam conditions is so stressful though! I hate doing practice papers without my notes.', now() - interval '15 days') RETURNING c2;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c2, 'William K.', 'It is stressful, but it''s better to feel that stress in your bedroom than in the actual exam hall! It gets easier the more you do it.', now() - interval '14 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Harper G.', 'I really need to stop cramming. This was a wake-up call.', now() - interval '10 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'James P.', 'How do you recommend spacing out revision for a math-heavy subject?', now() - interval '8 days') RETURNING c3;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c3, 'Evelyn N.', 'For math, just do 3-5 practice problems from older chapters every single day instead of doing 50 problems right before the test.', now() - interval '7 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Benjamin Y.', 'Great advice. Spaced repetition is the truth.', now() - interval '2 days');
  END IF;

  -- POST: mastering-pomodoro-technique
  SELECT id INTO pid FROM public.blog_posts WHERE slug = 'mastering-pomodoro-technique';
  IF pid IS NOT NULL THEN
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Amelia F.', 'I tried Pomodoro but I always skip the 5 minute breaks because I feel like I am interrupting my flow. Then I wonder why I am exhausted by 2 PM...', now() - interval '22 days') RETURNING c1;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c1, 'Elijah C.', 'You HAVE to take the break! Even if you just stand up and stretch. It resets your brain.', now() - interval '21 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Lucas M.', '25 minutes is perfect for me. Whenever I try to work for an hour straight, I end up checking my phone after 15 minutes anyway.', now() - interval '19 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Grace V.', 'Does anyone else use different time intervals? 25 mins feels too short for coding assignments.', now() - interval '14 days') RETURNING c2;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c2, 'Henry L.', 'Yeah for programming I do a 50/10 split. 50 mins work, 10 mins break. The 25 min blocks break my concentration when I am deep in a bug.', now() - interval '13 days');
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c2, 'Grace V.', '50/10 makes a lot of sense, I am going to try that today.', now() - interval '12 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Alexander H.', 'The hardest part is not touching my phone during the 25 minutes. I had to put my phone in another room.', now() - interval '9 days') RETURNING c3;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c3, 'Axon Team', 'Putting the phone in another room is a great strategy! Out of sight, out of mind.', now() - interval '8 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Chloe S.', 'Love this technique. Helps me get through boring readings.', now() - interval '4 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Daniel Z.', 'Short and sweet article. Good reminder to stick to the fundamentals.', now() - interval '1 days');
  END IF;

  -- POST: how-to-take-effective-notes
  SELECT id INTO pid FROM public.blog_posts WHERE slug = 'how-to-take-effective-notes';
  IF pid IS NOT NULL THEN
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Victoria R.', 'I am 100% guilty of acting like a human court reporter. By the end of a lecture, my hand is cramping and I have no idea what the professor actually taught.', now() - interval '26 days') RETURNING c1;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c1, 'Jackson D.', 'Same! And then when I go back to read my notes, it''s just a wall of text that makes no sense.', now() - interval '25 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Sebastian A.', 'The Cornell Method is fantastic. Writing the summary at the bottom really forces you to process the information immediately.', now() - interval '20 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Penelope M.', 'Reviewing within 24 hours is the biggest cheat code for university. It takes 10 minutes but saves hours of studying later.', now() - interval '17 days') RETURNING c2;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c2, 'Mateo P.', 'Do you review by just reading them, or do you rewrite them?', now() - interval '16 days');
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c2, 'Penelope M.', 'I don''t rewrite. I just read through them and maybe highlight the key concepts or add a margin note if something clicked.', now() - interval '15 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Riley J.', 'What if the professor talks extremely fast? It feels impossible not to just transcribe.', now() - interval '12 days') RETURNING c3;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c3, 'Aria L.', 'If they post the slides beforehand, print them out or download them to a tablet and just write your notes directly on the slides. That way you only write what isn''t already on the screen!', now() - interval '11 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Leo C.', 'This is super helpful. I am definitely going to try the Cornell method next semester.', now() - interval '6 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Zoe E.', 'Great tips!', now() - interval '2 days');
  END IF;

  -- POST: overcoming-academic-imposter-syndrome
  SELECT id INTO pid FROM public.blog_posts WHERE slug = 'overcoming-academic-imposter-syndrome';
  IF pid IS NOT NULL THEN
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Hannah B.', 'Thank you so much for writing this. I am in my second year of computer science and I constantly feel like everyone else has been coding since they were 5, and I am just faking it. It''s exhausting.', now() - interval '28 days') RETURNING c1;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c1, 'Julian W.', 'I am a senior in CS and I STILL feel that way sometimes. Just remember that people only talk publicly about their successes, never the hours they spent stuck on a simple bug. You belong here.', now() - interval '27 days');
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c1, 'Hannah B.', 'That makes me feel a lot better, thank you Julian.', now() - interval '26 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Levi O.', 'The shift from a "performance" mindset to a "learning" mindset is profound. I get so upset when I don''t get an A on the first try, but the whole point of being here is to learn what I don''t know.', now() - interval '22 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Eleanor G.', 'I always attribute my good grades to luck or an easy professor. It is so hard to accept that I actually earned it.', now() - interval '18 days') RETURNING c2;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c2, 'Axon Team', 'It is very common Eleanor! Keep a small file on your computer with screenshots of your good grades or positive feedback from professors. Look at it when you doubt yourself!', now() - interval '17 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Wyatt S.', 'Talking about it is so important. I mentioned feeling lost to my lab partner and he literally sighed in relief and said he was completely lost too.', now() - interval '14 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Stella K.', 'This article was wonderfully written. Very validating.', now() - interval '9 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Christian N.', 'Needed to read this right before midterms. The pressure is insane right now.', now() - interval '4 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Maya Q.', 'Beautifully said. We are all just trying our best.', now() - interval '1 days');
  END IF;

  -- POST: optimizing-your-sleep-schedule
  SELECT id INTO pid FROM public.blog_posts WHERE slug = 'optimizing-your-sleep-schedule';
  IF pid IS NOT NULL THEN
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Landon V.', 'I pulled an all-nighter for my economics final last year and completely blanked on the essay question. Never again. Sleep is literally magic for memory.', now() - interval '29 days') RETURNING c1;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c1, 'Hazel X.', 'Same. You feel so productive at 3 AM but then you take the test and your brain is just absolute mush.', now() - interval '28 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Nathan I.', 'Waking up at the same time on weekends is the hardest pill to swallow. I just want to sleep in until noon on Saturdays.', now() - interval '25 days') RETURNING c2;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c2, 'Lucy Z.', 'You can sleep in a little bit! Just don''t shift it by more than an hour or two, otherwise Monday morning is brutal.', now() - interval '24 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Caleb M.', 'The wind-down routine is crucial. If I close my laptop after doing calculus and try to sleep immediately, my brain just keeps doing math in the dark.', now() - interval '20 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Violet R.', 'Any advice for falling asleep when you are super anxious about a test?', now() - interval '16 days') RETURNING c3;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c3, 'Isaac F.', 'I do a "brain dump". I write down everything I am worried about on a piece of paper. Getting it out of my head and onto paper usually stops the racing thoughts.', now() - interval '15 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Lillian H.', 'Great post. Sleep > Cramming every time.', now() - interval '10 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Owen D.', 'I started using blue-light blocking glasses at 8 PM and it actually made a huge difference in how fast I fall asleep.', now() - interval '5 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Aurora C.', 'Very informative, thanks!', now() - interval '1 days');
  END IF;

  -- POST: managing-group-projects
  SELECT id INTO pid FROM public.blog_posts WHERE slug = 'managing-group-projects';
  IF pid IS NOT NULL THEN
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Aaron G.', 'I despise group projects with a burning passion. There is ALWAYS one person who does literally nothing until the night before it is due.', now() - interval '30 days') RETURNING c1;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c1, 'Nora B.', 'Group charter is the way to fix this. If you all agree on day 1 that slackers will be reported to the professor, they usually shape up really fast.', now() - interval '29 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Cameron Y.', 'Using a shared Google Drive instead of emailing word documents is 2024 basics. I can''t believe some people still email files.', now() - interval '24 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Sadie P.', 'How do you handle a group member who does the work, but the quality is just really, really bad?', now() - interval '20 days') RETURNING c2;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c2, 'Eli K.', 'You have to frame it as a collaborative edit. "Hey, I was reading through this section and thought we could expand on this point, do you mind if I tweak it?"', now() - interval '19 days');
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c2, 'Aaron G.', 'Or just rewrite it entirely the night before... (I am toxic I know).', now() - interval '18 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Addison T.', 'The clear, written record of assignments is the best advice here. Receipts are everything when you need to talk to the professor.', now() - interval '15 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Christian J.', 'I usually just end up doing the whole thing myself because I don''t trust anyone else. I know it''s bad but it protects my grade.', now() - interval '10 days') RETURNING c3;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c3, 'Axon Team', 'It''s a common trap, Christian! But learning how to delegate and hold others accountable is a massive soft skill for your future career. Give the charter a try next time.', now() - interval '9 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Piper S.', 'Great tips. Group work is the worst but this makes it manageable.', now() - interval '3 days');
  END IF;

  -- POST: balancing-part-time-work
  SELECT id INTO pid FROM public.blog_posts WHERE slug = 'balancing-part-time-work';
  IF pid IS NOT NULL THEN
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Julian D.', 'Working 20 hours a week while taking engineering classes is destroying me. The tip about maximizing small pockets of time is so real. I do flashcards on the subway now.', now() - interval '27 days') RETURNING c1;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c1, 'Samantha H.', 'I feel you Julian. Nursing student working 24 hours a week here. We just have to survive!', now() - interval '26 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Ian B.', 'Protecting days off is something I failed to do last semester. I worked weekends and went to class Monday-Friday. I completely burned out by November.', now() - interval '22 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Aubrey L.', 'Most employers are definitely accommodating IF you tell them early. If you tell them you have a final exam tomorrow, they will be mad. Give them a month warning.', now() - interval '18 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Dominic N.', 'How do you guys find the energy to study after an 8 hour shift on your feet? I work retail and I am just dead when I get home.', now() - interval '14 days') RETURNING c2;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c2, 'Riley K.', 'Don''t study at home! Go straight from work to a coffee shop or the library. If I sit on my couch, it''s game over.', now() - interval '13 days');
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c2, 'Dominic N.', 'Going straight to the library is a great idea. Going to try that.', now() - interval '12 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Peyton M.', 'This article makes me feel seen. Being a working student is so hard.', now() - interval '8 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Gabriel E.', 'Time management really is military-grade when you have zero free time. Good tips.', now() - interval '4 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Willow T.', 'Thanks for sharing this!', now() - interval '1 days');
  END IF;

  -- POST: sustainable-study-diet
  SELECT id INTO pid FROM public.blog_posts WHERE slug = 'sustainable-study-diet';
  IF pid IS NOT NULL THEN
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Cooper R.', 'I feel personally attacked by the instant ramen comment. It is cheap and easy!', now() - interval '25 days') RETURNING c1;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c1, 'Skylar V.', 'Haha same, but the brain fog is real. I started adding frozen veggies and a boiled egg to my ramen to at least get some nutrients.', now() - interval '24 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Xavier W.', 'The sugar crash from energy drinks is brutal. I switched to green tea in the afternoons and my energy is way more stable now.', now() - interval '20 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Bella F.', 'Meal prepping on Sundays saves my life. If I don''t have food ready in the fridge, I end up ordering UberEats and going broke.', now() - interval '17 days') RETURNING c2;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c2, 'Ezra P.', 'What are some cheap, easy meals to prep? I am terrible at cooking.', now() - interval '16 days');
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c2, 'Bella F.', 'Burrito bowls! Just rice, black beans, corn, and some chicken if you eat meat. Extremely cheap and takes 30 mins to make 5 days of food.', now() - interval '15 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Asher L.', 'Drinking more water genuinely solved like 80% of my afternoon fatigue. I didn''t realize I was just dehydrated.', now() - interval '12 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Naomi S.', 'Apples and peanut butter is the elite study snack. Keeps you full for hours.', now() - interval '9 days');
    INSERT INTO public.blog_comments (post_id, name, content, created_at) VALUES (pid, 'Miles G.', 'Good reminders here. It''s so easy to let your diet go to trash during finals week.', now() - interval '5 days') RETURNING c3;
    INSERT INTO public.blog_comments (post_id, parent_id, name, content, created_at) VALUES (pid, c3, 'Axon Team', 'Finals week is definitely the hardest time to eat well, but it''s also when your brain needs good fuel the most!', now() - interval '4 days');
  END IF;
END $$;

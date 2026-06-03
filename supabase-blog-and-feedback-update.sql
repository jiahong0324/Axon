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
  name text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

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

-- 6. Magic Seeding Block (Fake Engagement)
-- Blast all posts with 1000+ views and 300+ likes
update public.blog_posts 
set views_count = floor(random() * 4000 + 1000), 
    likes_count = floor(random() * 700 + 300);

-- Clear existing comments so we don't duplicate on re-runs
delete from public.blog_comments;

-- Insert 10 fake comments for every post using a cross join
insert into public.blog_comments (post_id, name, content, created_at)
select 
  p.id, 
  (array['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Morgan', 'Avery', 'Quinn', 'Skyler', 'Jamie', 'Charlie'])[floor(random() * 12 + 1)],
  (array['This article really helped me out! Thanks.', 'I needed this today.', 'Very helpful tips for my exams.', 'Will definitely try this out next week.', 'So true, I completely agree!', 'Thanks for sharing this.', 'This changed my perspective on studying.', 'Bookmarking this for later.', 'Couldn''t agree more.', 'Well written and very practical.', 'Just what I was looking for!', 'Great read, thanks for the advice.'])[floor(random() * 12 + 1)],
  now() - (random() * interval '30 days')
from public.blog_posts p cross join generate_series(1, 10);

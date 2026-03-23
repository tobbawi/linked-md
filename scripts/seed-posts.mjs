/**
 * Seed script: creates realistic demo posts for screenshots.
 * Usage: node scripts/seed-posts.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://afyafeugoflxfwxrrhnn.supabase.co'
const SERVICE_KEY = 'REDACTED_SERVICE_KEY'

const sb = createClient(SUPABASE_URL, SERVICE_KEY)

// Profile IDs
const WIM_ID = 'c6f1ce64-7998-4acf-aa75-435add9bf45c'
const VALERIE_ID = '70e4b3ba-366b-4590-9a5d-f12273e473bd'

const posts = [
  {
    profile_id: WIM_ID,
    slug: 'before-ai-10-unfinished-projects',
    title: 'Before AI: 10 unfinished projects. After AI: 140+.',
    tags: ['AI', 'buildinpublic', 'linkedmd'],
    markdown_content: `Before AI: 10 unfinished projects.
After AI: 140+.

This weekend I started a new one.

I wanted to test gstack — Garry Tan's (CEO of YCombinator) open-source AI development toolkit built on top of Claude Code, Anthropic's CLI.

It gives Claude a set of specialized "skills" — and this is where it gets interesting. \`/plan-ceo-review\` challenges you to find the "10-star product" (Garry's YC-style forcing question: what would make this a 10-star experience?). \`/qa\` runs automated QA testing. \`/ship\` handles the full deploy workflow. \`/design-review\` does visual audits. \`/investigate\` walks through systematic debugging. These aren't just code helpers — they're product thinking baked into your terminal.

My experiment: an open professional network where every profile, post, and company is a \`.md\` file.
Open. Portable. AI-readable.

Every profile and company gets its own \`llm.txt\` and \`llm-full.txt\`.

Imagine a platform where humans and AI agents can exchange professional information in a format both sides actually understand.
No scraping. No parsing walls.
Just clean, structured, readable data.

The project is called **linked.md**

Built the first working version in a weekend.
Next.js, Supabase, markdown all the way down.
Profiles render as pages for humans and as structured text for machines — same URL, different content negotiation.

That's the part that got me. We keep building platforms that lock data behind authentication walls and proprietary formats. What if professional identity was just... a file? One that any LLM could read without an API key?

Thanks to Garry Tan for building gstack and open-sourcing it. Tools like this make weekend experiments actually ship instead of sitting in a half-finished repo forever. 🫡

If you want to see the source code, drop **REPO** in the comments and I'll DM you the link.`,
  },
  {
    profile_id: WIM_ID,
    slug: 'your-profile-is-just-a-file',
    title: 'Your professional profile is just a file.',
    tags: ['opendata', 'AI', 'futureofwork'],
    markdown_content: `Your professional profile is just a file.

That's the premise of [[linked.md]].

Every profile: \`/wim-tobback.md\`
Every post: \`/wim-tobback/posts/your-profile-is-just-a-file.md\`
Every company: \`/company/acme.md\`

No lock-in. No proprietary format. No API key required to read it.

We've spent 20 years building platforms that make data impossible to move. Your LinkedIn connections. Your Twitter history. Your work experience scattered across seven different systems.

What if we just... didn't?

Markdown is readable by humans, parseable by machines, and portable forever.
Add an \`llm.txt\` and suddenly every AI agent on the internet knows who you are and what you do — without having to scrape, hallucinate, or reverse-engineer an API.

That's the bet.

Open professional identity. Markdown all the way down.`,
  },
  {
    profile_id: WIM_ID,
    slug: 'what-is-an-aigeneer',
    title: 'What is an AIGENEER?',
    tags: ['AIGENEER', 'AI', 'entrepreneurship'],
    markdown_content: `What is an AIGENEER?

Not a developer. Not a prompt engineer. Something in between.

An AIGENEER is someone who:
- Understands enough about AI to direct it precisely
- Understands enough about business to know what to build
- Ships things that actually work

I've been calling myself this for a while now. It feels right.

The old model: you had an idea → you hired developers → maybe something shipped 6 months later.

The new model: you have an idea → you open a terminal → something ships this weekend.

The gap between "I want to build X" and "X exists" has never been smaller. But only if you understand how to think with AI, not just talk to it.

That's the skill worth developing right now.`,
  },
  {
    profile_id: WIM_ID,
    slug: 'llm-txt-the-robots-txt-for-your-professional-identity',
    title: 'llm.txt — the robots.txt for your professional identity',
    tags: ['llmtxt', 'AI', 'opendata', 'buildinpublic'],
    markdown_content: `There's a quiet standard emerging on the web: \`llm.txt\`

Same idea as \`robots.txt\` — a file at a known URL that tells software how to interact with your site.

Except \`llm.txt\` is for AI agents.

On [[linked.md]], every profile gets two:

**\`/wim-tobback/llm.txt\`** — a compact summary. Name, title, bio, recent posts. Designed to fit in a context window.

**\`/wim-tobback/llm-full.txt\`** — the full export. Every post, every experience entry, every connection. For deep research.

Why does this matter?

Because AI agents are already crawling the web looking for information about people and companies. Right now they're scraping, guessing, and hallucinating because the data isn't structured for them.

Give them a clean file and they'll give you accurate answers.

This is the version of professional identity that makes sense in 2026.`,
  },
  {
    profile_id: WIM_ID,
    slug: 'three-roles-one-goal',
    title: 'Three roles, one goal',
    tags: ['entrepreneurship', 'venturebuild', 'innovation'],
    markdown_content: `I operate in three modes.

**Managing Partner** — I support the companies in our ecosystem. Not just capital. Hands-on guidance, introductions, pressure-testing assumptions.

**Venture Builder** — I spot opportunity, assemble teams, and help bring ideas to life from zero. The most chaotic and most satisfying work I do.

**Innovation Manager** — I make sure the organisations I work with don't fall asleep. New tools, new methods, new thinking. Especially now with AI changing what's possible every few months.

Three different hats. But the goal underneath them is always the same:

Build things that matter. Ship them. Learn. Repeat.

If you're building something at the intersection of AI and professional tools — I want to hear about it.`,
  },
  {
    profile_id: VALERIE_ID,
    slug: 'working-with-ai-as-a-freelancer',
    title: 'Working with AI as a freelancer changed everything',
    tags: ['freelance', 'AI', 'productivity'],
    markdown_content: `Six months ago I was spending 3 hours writing a proposal.

Now it takes 20 minutes.

Not because AI writes it for me. Because AI helps me think faster.

The draft is mine. The structure is mine. The arguments are mine.
But the blank page problem? Gone.

Working for [[Wim Tobback]] introduced me to a different way of using AI — not as a shortcut, but as a thinking partner.

Ask it hard questions. Challenge its answers. Use it to stress-test your own ideas.

That's the version of AI collaboration that actually makes you better at your job.

The freelancers who figure this out early are going to be very hard to compete with.`,
  },
]

async function seed() {
  console.log(`Seeding ${posts.length} posts...\n`)

  for (const post of posts) {
    const { data, error } = await sb
      .from('posts')
      .upsert(
        {
          profile_id: post.profile_id,
          slug: post.slug,
          title: post.title,
          markdown_content: post.markdown_content,
          tags: post.tags,
          outbound_links: [],
        },
        { onConflict: 'profile_id,slug' }
      )
      .select('id, slug')
      .single()

    if (error) {
      console.error(`❌ ${post.slug}:`, error.message)
    } else {
      console.log(`✅ ${post.slug}`)
    }
  }

  console.log('\nDone.')
}

seed()

/**
 * Synthetic data seed script for linked.md
 *
 * Creates: 1000 profiles, 200 companies, 5000 posts, plus experience,
 * education, skills, follows, likes, comments, and job listings.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/seed-synthetic.mjs
 *
 * Idempotent: checks for existing data before creating. Safe to re-run.
 * Uses service role key to bypass RLS and create auth users.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ── Config ───────────────────────────────────────────────────────────────────

const NUM_PROFILES = 1000
const NUM_COMPANIES = 200
const NUM_POSTS = 5000
const BATCH_SIZE = 50
const SEED_EMAIL_DOMAIN = 'seed.linked.md'
const SEED_PASSWORD = 'SeedUser2026!'

// ── Data pools ───────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Emma','Liam','Olivia','Noah','Ava','Elijah','Sophia','James','Isabella','William',
  'Mia','Benjamin','Charlotte','Lucas','Amelia','Henry','Harper','Alexander','Evelyn','Daniel',
  'Luna','Michael','Ella','Sebastian','Elizabeth','Jack','Sofia','Owen','Avery','Ethan',
  'Scarlett','Aiden','Grace','Matthew','Chloe','Joseph','Victoria','Leo','Riley','David',
  'Yuki','Hiroshi','Mei','Wei','Jing','Raj','Priya','Arjun','Aisha','Omar',
  'Fatima','Hassan','Leila','Kai','Sakura','Min','Soo','Ravi','Deepa','Ananya',
  'Santiago','Valentina','Mateo','Camila','Diego','Lucia','Carlos','Maria','Pablo','Elena',
  'Lars','Ingrid','Erik','Freya','Sven','Astrid','Magnus','Sigrid','Bjorn','Linnea',
  'Marcel','Sophie','Pierre','Chloe','Antoine','Amelie','Louis','Manon','Jules','Lea',
  'Tobias','Hannah','Felix','Lena','Maximilian','Anna','Lukas','Clara','Jonas','Mila',
  'Marco','Giulia','Luca','Chiara','Alessandro','Francesca','Andrea','Sara','Matteo','Elena',
  'Arthur','Zara','Finn','Iris','Oscar','Noor','Hugo','Daan','Eva','Thijs',
  'Robin','Kim','Sam','Alex','Jordan','Taylor','Morgan','Casey','Riley','Quinn',
  'Nadia','Viktor','Katya','Ivan','Olga','Dimitri','Ana','Pavel','Marta','Nikola',
  'Chen','Lin','Yun','Hao','Xin','Tao','Ling','Fang','Jun','Hong',
  'Akira','Hana','Kenji','Yui','Ren','Saki','Tomo','Miku','Shun','Riko',
  'Adaeze','Kwame','Amara','Kofi','Zuri','Nia','Jabari','Chioma','Taiwo','Amina',
  'Isla','Rowan','Sage','Ember','Atlas','Willow','Orion','Ivy','Phoenix','Jade',
  'River','Aspen','Skye','Reed','Wren','Blake','Ash','Briar','Storm','Sage',
  'Ada','Grace','Ruth','Eve','Mae','Joy','Hope','Faith','Rose','Pearl'
]

const LAST_NAMES = [
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
  'Anderson','Taylor','Thomas','Hernandez','Moore','Martin','Jackson','Thompson','White','Lopez',
  'Lee','Gonzalez','Harris','Clark','Lewis','Robinson','Walker','Perez','Hall','Young',
  'Tanaka','Yamamoto','Suzuki','Watanabe','Nakamura','Kobayashi','Saito','Takahashi','Ito','Kato',
  'Wang','Li','Zhang','Liu','Chen','Yang','Huang','Wu','Zhou','Sun',
  'Kim','Park','Choi','Jung','Kang','Cho','Yoon','Jang','Lim','Han',
  'Kumar','Sharma','Patel','Singh','Gupta','Mehta','Verma','Jain','Shah','Reddy',
  'Muller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann',
  'Johansson','Lindberg','Eriksson','Larsson','Olsson','Persson','Svensson','Karlsson','Nilsson','Gustafsson',
  'Dubois','Moreau','Laurent','Simon','Michel','Leroy','Roux','David','Bertrand','Robert',
  'Rossi','Russo','Ferrari','Esposito','Bianchi','Romano','Colombo','Ricci','Marino','Greco',
  'De Vries','Van Dijk','Bakker','Janssen','Visser','Smit','Dekker','Meijer','Groot','Mulder',
  'Santos','Oliveira','Souza','Lima','Costa','Ferreira','Almeida','Ribeiro','Gomes','Cardoso',
  'Okafor','Adeyemi','Mensah','Diop','Ndiaye','Mwangi','Kimani','Osei','Balogun','Traore',
  'Al-Hassan','Ibrahim','Ali','Mohammed','Ahmed','Khalil','Abbas','Youssef','Haddad','Mansour',
  'Novak','Horvat','Kovacs','Popov','Ivanov','Petrov','Sokolov','Kuznetsov','Volkov','Morozov',
  'OBrien','Murphy','Kelly','Sullivan','Walsh','Byrne','Ryan','Murray','Doyle','Lynch',
  'Fernandez','Torres','Ramirez','Castillo','Vargas','Mendez','Reyes','Cruz','Ortiz','Guerrero',
  'Andersen','Nielsen','Pedersen','Christensen','Jensen','Hansen','Larsen','Madsen','Sorensen','Rasmussen',
  'Berg','Strand','Bakke','Haugen','Lund','Dahl','Solberg','Moe','Vik','Nygaard'
]

const LOCATIONS = [
  'San Francisco, CA','New York, NY','London, UK','Berlin, Germany','Amsterdam, Netherlands',
  'Paris, France','Tokyo, Japan','Singapore','Sydney, Australia','Toronto, Canada',
  'Austin, TX','Seattle, WA','Portland, OR','Denver, CO','Chicago, IL',
  'Barcelona, Spain','Stockholm, Sweden','Copenhagen, Denmark','Dublin, Ireland','Zurich, Switzerland',
  'Lisbon, Portugal','Milan, Italy','Seoul, South Korea','Bangalore, India','Tel Aviv, Israel',
  'Lagos, Nigeria','Nairobi, Kenya','Cape Town, South Africa','Dubai, UAE','Melbourne, Australia',
  'Vancouver, Canada','Boston, MA','Miami, FL','Los Angeles, CA','Brussels, Belgium',
  'Helsinki, Finland','Oslo, Norway','Warsaw, Poland','Prague, Czech Republic','Budapest, Hungary'
]

const TITLES = [
  'Software Engineer','Senior Software Engineer','Staff Engineer','Principal Engineer',
  'Engineering Manager','VP of Engineering','CTO','Tech Lead','Full Stack Developer',
  'Frontend Engineer','Backend Engineer','DevOps Engineer','SRE','Data Engineer',
  'ML Engineer','AI Engineer','Product Manager','Senior Product Manager','VP of Product',
  'Designer','Senior Designer','Design Lead','Head of Design','UX Researcher',
  'Data Scientist','Data Analyst','Solutions Architect','Cloud Architect','Security Engineer',
  'Founder & CEO','Co-founder','Managing Partner','Venture Partner','Investor',
  'Marketing Lead','Growth Engineer','Developer Advocate','Community Manager',
  'Freelance Developer','Independent Consultant','AIGENEER','Startup Advisor'
]

const SKILLS_POOL = [
  'JavaScript','TypeScript','Python','Go','Rust','Java','C++','Ruby','Swift','Kotlin',
  'React','Next.js','Vue','Angular','Svelte','Node.js','Django','FastAPI','Rails','Spring',
  'PostgreSQL','MongoDB','Redis','Elasticsearch','GraphQL','REST APIs','gRPC','Kafka',
  'AWS','GCP','Azure','Docker','Kubernetes','Terraform','CI/CD','Linux',
  'Machine Learning','Deep Learning','NLP','Computer Vision','LLMs','Prompt Engineering',
  'Product Management','Agile','Scrum','Figma','Design Systems','UI/UX','Accessibility',
  'System Design','Distributed Systems','Microservices','Event-Driven Architecture'
]

const SCHOOLS = [
  'MIT','Stanford University','UC Berkeley','Carnegie Mellon','Harvard University',
  'University of Oxford','University of Cambridge','ETH Zurich','TU Munich','Delft University',
  'University of Tokyo','National University of Singapore','IIT Bombay','Tsinghua University',
  'University of Toronto','Georgia Tech','University of Michigan','UCLA','Columbia University',
  'Imperial College London','EPFL','KU Leuven','University of Amsterdam','Aalto University',
  'University of Melbourne','University of Waterloo','KAIST','Peking University','NTU Singapore',
  'University of Edinburgh','Technical University of Berlin','Politecnico di Milano'
]

const DEGREES = ['B.S.','B.A.','M.S.','M.A.','MBA','Ph.D.','B.Eng.','M.Eng.']
const FIELDS = [
  'Computer Science','Software Engineering','Data Science','Artificial Intelligence',
  'Electrical Engineering','Mathematics','Physics','Business Administration',
  'Information Systems','Human-Computer Interaction','Design','Economics',
  'Mechanical Engineering','Bioengineering','Statistics','Cognitive Science'
]

const COMPANY_PREFIXES = [
  'Neo','Arc','Flux','Vox','Apex','Nova','Zeta','Core','Hive','Mesh',
  'Quark','Synth','Pulse','Drift','Forge','Bloom','Crisp','Scope','Shift','Scale',
  'Bright','Clear','Swift','Sharp','Bold','Prime','True','Open','Deep','Fair'
]

const COMPANY_SUFFIXES = [
  'Labs','AI','Tech','Systems','Cloud','Data','Works','IO','Dev','HQ',
  'Logic','Ware','Craft','Studio','Ops','Hub','Stack','Base','Flow','Mind'
]

const COMPANY_TAGLINES = [
  'Building the future of work','AI-native infrastructure','Developer tools that scale',
  'Making data accessible','Open source everything','Cloud-native solutions',
  'The platform for modern teams','Simplifying complex systems','Privacy-first technology',
  'Connecting people and data','Automating the mundane','Empowering creators',
  'Real-time analytics for everyone','The API for everything','Next-gen developer experience',
  'Security without compromise','Sustainable tech solutions','Democratizing AI',
  'Infrastructure as code','The future is open'
]

const JOB_TYPES = ['full-time','part-time','contract','internship']

const TAG_POOL = [
  'AI','machinelearning','webdev','opensource','startup','product','design',
  'engineering','devops','cloud','data','security','career','leadership',
  'typescript','python','react','nextjs','rust','golang','kubernetes',
  'saas','buildinpublic','remotework','productivity','futureofwork',
  'llm','agentic','markdown','linkedmd'
]

const POST_TITLES = [
  'Why I switched from {tech1} to {tech2}',
  'The case for {topic} in modern development',
  'Lessons learned building {thing}',
  'How we reduced our deploy time by {percent}%',
  '{topic}: what nobody tells you',
  'A practical guide to {topic}',
  'My journey from {role1} to {role2}',
  'The future of {topic} is {adjective}',
  'Why {topic} matters more than you think',
  'Building in public: week {num}',
  'What I learned from {num} interviews',
  'The {adjective} way to think about {topic}',
  'Stop doing {thing}. Start doing {other_thing}.',
  '{topic} is dead. Long live {other_topic}.',
  'How {company_type} companies are using {topic}',
  'From zero to {metric} in {timeframe}',
  'The {num} tools I use every day',
  'Rethinking {topic} for the AI era',
  'Why your {thing} strategy is wrong',
  'An honest review of {topic} after {timeframe}'
]

const POST_BODIES = [
  `I've been working with {topic} for the past {timeframe}, and I want to share what I've learned.

The biggest misconception is that it's just about {misconception}. In reality, the value comes from {actual_value}.

Here are three things I wish someone had told me:

1. **Start small.** Don't try to do everything at once. Pick one workflow and optimize it.
2. **Measure everything.** If you can't measure the improvement, you can't justify the investment.
3. **Talk to your users.** The best technical solution is the one that solves a real problem.

The hardest part wasn't the technology. It was getting buy-in from the team. But once they saw the results, adoption was organic.`,

  `Hot take: {hot_take}.

I know this is controversial. Let me explain.

Most people in our industry treat {topic} as a solved problem. Just use {conventional_solution} and move on. But I've seen too many teams struggle with this approach because {reason}.

The alternative? {alternative}. It's not perfect, but it addresses the root cause instead of the symptoms.

Would love to hear your thoughts. Am I wrong?`,

  `This week I shipped {feature}. Here's how it went.

**The good:**
- Users responded immediately. We got {num} signups in the first {timeframe}.
- The architecture held up. No performance issues even under load.

**The bad:**
- Mobile experience needs work. Touch targets are too small.
- Onboarding drop-off at step 3 is higher than expected.

**What's next:**
- A/B test two different onboarding flows
- Add {feature2} based on user feedback
- Write more documentation

Building in public means sharing the messy parts too.`,

  `A thread on {topic} for people who are just getting started.

{topic} isn't as complicated as it seems. The core idea is simple: {simple_explanation}.

The reason it feels overwhelming is that the ecosystem has grown huge. You don't need all of it. Here's what matters:

**Essential:** {essential_tools}
**Nice to have:** {nice_tools}
**Skip for now:** {skip_tools}

Start with the essentials. You can always add more later. The worst thing you can do is try to learn everything at once.

I'm happy to answer questions. DM me or comment below.`,

  `After {timeframe} of working remotely, here's my honest assessment.

The freedom is real. I work better in the mornings, so I start at 6am and finish by 2pm. The afternoons are mine.

But the isolation is also real. I've had to be intentional about:
- Weekly video calls with my team (cameras on, no exceptions)
- A coworking space twice a week
- Physical exercise every day (non-negotiable)

The tools that actually matter: a good camera, a standing desk, and noise-canceling headphones. Everything else is optional.

Remote work isn't for everyone. And that's fine. But for me, it's been transformative.`
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(n, arr.length))
}
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function toSlug(name) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }

function generateName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
}

function generateCompanyName() {
  return `${pick(COMPANY_PREFIXES)}${pick(COMPANY_SUFFIXES)}`
}

function generateBio(name, title) {
  const templates = [
    `${title} passionate about building great products. Always learning.`,
    `Building things at the intersection of technology and people.`,
    `${title}. Previously at ${pick(COMPANY_PREFIXES)}${pick(COMPANY_SUFFIXES)}. Open to interesting conversations.`,
    `Helping teams ship faster. ${title} by day, open source contributor by night.`,
    `${title} focused on ${pick(SKILLS_POOL)} and ${pick(SKILLS_POOL)}. Based in ${pick(LOCATIONS).split(',')[0]}.`,
    `Maker. Builder. Occasional writer. Currently exploring ${pick(SKILLS_POOL)}.`,
    `${title} with a passion for clean code and clear thinking.`,
    `Building the future, one commit at a time. ${pick(SKILLS_POOL)} enthusiast.`,
  ]
  return pick(templates)
}

function generatePostTitle() {
  const template = pick(POST_TITLES)
  return template
    .replace('{tech1}', pick(SKILLS_POOL))
    .replace('{tech2}', pick(SKILLS_POOL))
    .replace('{topic}', pick(SKILLS_POOL))
    .replace('{thing}', pick(['microservices','monoliths','sprints','standups','code reviews']))
    .replace('{other_thing}', pick(['async communication','pair programming','design docs','prototyping']))
    .replace('{other_topic}', pick(SKILLS_POOL))
    .replace('{percent}', String(randInt(30, 90)))
    .replace('{role1}', pick(TITLES))
    .replace('{role2}', pick(TITLES))
    .replace('{adjective}', pick(['open','distributed','async','composable','modular']))
    .replace('{num}', String(randInt(3, 50)))
    .replace('{metric}', pick(['10K users','$1M ARR','100 contributors','1000 stars']))
    .replace('{timeframe}', pick(['3 months','6 months','1 year','2 years']))
    .replace('{company_type}', pick(['Series A','enterprise','bootstrapped','AI-native']))
}

function generatePostBody() {
  const template = pick(POST_BODIES)
  return template
    .replace(/{topic}/g, pick(SKILLS_POOL))
    .replace('{timeframe}', pick(['3 months','6 months','1 year','2 years']))
    .replace('{misconception}', pick(['speed','scale','automation','complexity']))
    .replace('{actual_value}', pick(['developer experience','maintainability','team velocity','user trust']))
    .replace('{hot_take}', pick([
      `${pick(SKILLS_POOL)} is overrated for most teams`,
      'You don\'t need microservices',
      'Most AI features are just search',
      'Remote work makes better engineers',
      'Code reviews slow you down more than they help'
    ]))
    .replace('{conventional_solution}', pick(SKILLS_POOL))
    .replace('{reason}', pick(['it doesn\'t scale','it\'s too complex','it ignores the human factor']))
    .replace('{alternative}', pick(['Start simpler','Use boring technology','Talk to users first']))
    .replace('{feature}', pick(['dark mode','search','notifications','real-time sync']))
    .replace('{feature2}', pick(['export to PDF','team workspaces','API access','mobile app']))
    .replace('{num}', String(randInt(5, 100)))
    .replace('{simple_explanation}', pick(['it connects things','it automates decisions','it reduces friction']))
    .replace('{essential_tools}', pickN(SKILLS_POOL, 3).join(', '))
    .replace('{nice_tools}', pickN(SKILLS_POOL, 2).join(', '))
    .replace('{skip_tools}', pickN(SKILLS_POOL, 2).join(', '))
}

// ── Progress logging ─────────────────────────────────────────────────────────

function log(phase, msg) {
  console.log(`[${phase}] ${msg}`)
}

// ── Phase 1: Auth users + profiles ───────────────────────────────────────────

async function seedProfiles() {
  log('Phase 1', `Creating ${NUM_PROFILES} auth users + profiles...`)

  // Check existing
  const { count: existingCount } = await sb.from('profiles').select('*', { count: 'exact', head: true }).like('slug', '%-seed-%')
  if (existingCount > 100) {
    log('Phase 1', `Found ${existingCount} seed profiles already. Skipping.`)
    const { data } = await sb.from('profiles').select('id, slug, user_id').order('slug')
    return data || []
  }

  const profiles = []

  for (let i = 0; i < NUM_PROFILES; i += BATCH_SIZE) {
    const batch = []
    const end = Math.min(i + BATCH_SIZE, NUM_PROFILES)

    for (let j = i; j < end; j++) {
      const num = String(j + 1).padStart(4, '0')
      const email = `user-${num}@${SEED_EMAIL_DOMAIN}`
      const name = generateName()
      const slug = `${toSlug(name)}-seed-${num}`
      const title = pick(TITLES)
      const location = pick(LOCATIONS)
      const bio = generateBio(name, title)

      // Create auth user
      const { data: authUser, error: authErr } = await sb.auth.admin.createUser({
        email,
        password: SEED_PASSWORD,
        email_confirm: true,
      })

      if (authErr) {
        // User might already exist
        if (authErr.message?.includes('already')) {
          const { data: { users } } = await sb.auth.admin.listUsers({ filter: email })
          if (users?.[0]) {
            batch.push({
              user_id: users[0].id,
              slug,
              display_name: name,
              title,
              location,
              bio,
              markdown_content: `# ${name}\n\n${bio}\n\nConnect with me on linked.md.`,
              outbound_links: [],
              company_links: [],
            })
          }
          continue
        }
        console.error(`Auth error for ${email}:`, authErr.message)
        continue
      }

      batch.push({
        user_id: authUser.user.id,
        slug,
        display_name: name,
        title,
        location,
        bio,
        markdown_content: `# ${name}\n\n${bio}\n\nConnect with me on linked.md.`,
        outbound_links: [],
        company_links: [],
      })
    }

    if (batch.length > 0) {
      const { error } = await sb.from('profiles').upsert(batch, { onConflict: 'user_id' })
      if (error) console.error('Profile insert error:', error.message)
    }

    profiles.push(...batch)
    log('Phase 1', `${Math.min(end, NUM_PROFILES)}/${NUM_PROFILES} profiles`)
  }

  // Fetch all profiles (including pre-existing)
  const { data: allProfiles } = await sb.from('profiles').select('id, slug, user_id').order('slug')
  return allProfiles || []
}

// ── Phase 2: Companies + admin links ─────────────────────────────────────────

async function seedCompanies(profiles) {
  log('Phase 2', `Creating ${NUM_COMPANIES} companies...`)

  const { count: existingCount } = await sb.from('companies').select('*', { count: 'exact', head: true }).like('slug', '%-seed-%')
  if (existingCount > 50) {
    log('Phase 2', `Found ${existingCount} seed companies already. Skipping.`)
    const { data } = await sb.from('companies').select('id, slug, user_id').order('slug')
    return data || []
  }

  const companies = []
  const usedNames = new Set()

  for (let i = 0; i < NUM_COMPANIES; i++) {
    let name
    do { name = generateCompanyName() } while (usedNames.has(name))
    usedNames.add(name)

    const num = String(i + 1).padStart(3, '0')
    const creator = profiles[i % profiles.length]
    const slug = `${toSlug(name)}-seed-${num}`

    companies.push({
      user_id: creator.user_id,
      slug,
      name,
      tagline: pick(COMPANY_TAGLINES),
      bio: `${name} is building the future of ${pick(['technology','work','data','communication','infrastructure'])}.`,
      markdown_content: `# ${name}\n\n${pick(COMPANY_TAGLINES)}\n\nWe're hiring! Check out our open roles.`,
      outbound_links: [],
    })
  }

  // Insert in batches
  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE)
    const { error } = await sb.from('companies').upsert(batch, { onConflict: 'slug' })
    if (error) console.error('Company insert error:', error.message)
  }

  // Fetch all with IDs
  const { data: allCompanies } = await sb.from('companies').select('id, slug, user_id').order('slug')

  // Add admin links
  log('Phase 2', 'Adding company admins...')
  const adminLinks = []
  for (const company of (allCompanies || [])) {
    // Creator is always first admin
    const creatorProfile = profiles.find(p => p.user_id === company.user_id)
    if (creatorProfile) {
      adminLinks.push({ company_id: company.id, profile_id: creatorProfile.id, role: 'admin' })
    }
    // Add 0-2 additional admins
    const extraAdmins = randInt(0, 2)
    for (let j = 0; j < extraAdmins; j++) {
      const admin = pick(profiles)
      if (admin.id !== creatorProfile?.id) {
        adminLinks.push({ company_id: company.id, profile_id: admin.id, role: 'admin' })
      }
    }
  }

  for (let i = 0; i < adminLinks.length; i += BATCH_SIZE) {
    const batch = adminLinks.slice(i, i + BATCH_SIZE)
    const { error } = await sb.from('company_members').upsert(batch, { onConflict: 'company_id,profile_id', ignoreDuplicates: true })
    if (error && !error.message.includes('duplicate')) console.error('Admin link error:', error.message)
  }

  log('Phase 2', `${allCompanies?.length || 0} companies + ${adminLinks.length} admin links`)
  return allCompanies || []
}

// ── Phase 3: Experience + Education + Skills ─────────────────────────────────

async function seedProfileData(profiles, companies) {
  log('Phase 3', 'Creating experience, education, and skills...')

  const experiences = []
  const education = []
  const skills = []

  for (const profile of profiles) {
    // Experience: 1-4 entries
    const numExp = randInt(1, 4)
    let currentYear = 2026
    for (let e = 0; e < numExp; e++) {
      const isCurrent = e === 0
      const startYear = currentYear - randInt(1, 4)
      const company = pick(companies)
      experiences.push({
        profile_id: profile.id,
        company_name: company ? company.slug.replace(/-seed-\d+$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : pick(COMPANY_PREFIXES) + pick(COMPANY_SUFFIXES),
        company_slug: company ? company.slug : null,
        title: pick(TITLES),
        start_year: startYear,
        start_month: randInt(1, 12),
        end_year: isCurrent ? null : currentYear,
        end_month: isCurrent ? null : randInt(1, 12),
        is_current: isCurrent,
        sort_order: e,
      })
      currentYear = startYear - 1
    }

    // Education: 0-2 entries
    const numEdu = randInt(0, 2)
    for (let e = 0; e < numEdu; e++) {
      const startYear = randInt(2005, 2022)
      education.push({
        profile_id: profile.id,
        school: pick(SCHOOLS),
        degree: pick(DEGREES),
        field_of_study: pick(FIELDS),
        start_year: startYear,
        end_year: startYear + randInt(2, 5),
        is_current: false,
        sort_order: e,
      })
    }

    // Skills: 2-6
    const numSkills = randInt(2, 6)
    const profileSkills = pickN(SKILLS_POOL, numSkills)
    profileSkills.forEach((skill, idx) => {
      skills.push({
        profile_id: profile.id,
        name: skill,
        sort_order: idx,
      })
    })
  }

  // Insert experiences
  for (let i = 0; i < experiences.length; i += BATCH_SIZE) {
    const { error } = await sb.from('experience').insert(experiences.slice(i, i + BATCH_SIZE))
    if (error && !error.message.includes('duplicate')) console.error('Experience error:', error.message)
  }
  log('Phase 3', `${experiences.length} experience entries`)

  // Insert education
  for (let i = 0; i < education.length; i += BATCH_SIZE) {
    const { error } = await sb.from('education_entries').insert(education.slice(i, i + BATCH_SIZE))
    if (error && !error.message.includes('duplicate')) console.error('Education error:', error.message)
  }
  log('Phase 3', `${education.length} education entries`)

  // Insert skills
  for (let i = 0; i < skills.length; i += BATCH_SIZE) {
    const { error } = await sb.from('profile_skills').insert(skills.slice(i, i + BATCH_SIZE))
    if (error && !error.message.includes('duplicate')) console.error('Skills error:', error.message)
  }
  log('Phase 3', `${skills.length} skills`)
}

// ── Phase 4: Posts ───────────────────────────────────────────────────────────

async function seedPosts(profiles) {
  log('Phase 4', `Creating ${NUM_POSTS} posts...`)

  const { count: existingCount } = await sb.from('posts').select('*', { count: 'exact', head: true }).like('slug', '%-seed-%')
  if (existingCount > 1000) {
    log('Phase 4', `Found ${existingCount} seed posts already. Skipping.`)
    const { data } = await sb.from('posts').select('id, profile_id').limit(5000)
    return data || []
  }

  const posts = []
  let postNum = 0

  // Distribute posts across profiles (3-8 per profile, up to NUM_POSTS total)
  for (const profile of profiles) {
    if (postNum >= NUM_POSTS) break
    const numPosts = randInt(3, 8)

    for (let p = 0; p < numPosts && postNum < NUM_POSTS; p++) {
      postNum++
      const num = String(postNum).padStart(5, '0')
      const title = generatePostTitle()
      const slug = `${toSlug(title).slice(0, 40)}-seed-${num}`
      const tags = pickN(TAG_POOL, randInt(1, 4))
      const daysAgo = randInt(1, 180)
      const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString()

      posts.push({
        profile_id: profile.id,
        slug,
        title,
        markdown_content: generatePostBody(),
        tags,
        outbound_links: [],
        created_at: createdAt,
      })
    }
  }

  // Insert in batches
  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE)
    const { error } = await sb.from('posts').upsert(batch, { onConflict: 'profile_id,slug', ignoreDuplicates: true })
    if (error) console.error('Post insert error:', error.message)
    if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= posts.length) {
      log('Phase 4', `${Math.min(i + BATCH_SIZE, posts.length)}/${posts.length} posts`)
    }
  }

  const { data: allPosts } = await sb.from('posts').select('id, profile_id').limit(NUM_POSTS)
  return allPosts || []
}

// ── Phase 5: Social graph ────────────────────────────────────────────────────

async function seedSocialGraph(profiles, posts) {
  log('Phase 5', 'Creating social graph (follows, likes, comments, jobs)...')

  // Follows: avg 5 per profile
  const follows = []
  for (const profile of profiles) {
    const numFollows = randInt(2, 10)
    const targets = pickN(profiles.filter(p => p.id !== profile.id), numFollows)
    for (const target of targets) {
      follows.push({ follower_id: profile.id, followee_id: target.id })
    }
  }

  for (let i = 0; i < follows.length; i += BATCH_SIZE) {
    const { error } = await sb.from('follows').upsert(follows.slice(i, i + BATCH_SIZE), { onConflict: 'follower_id,followee_id', ignoreDuplicates: true })
    if (error && !error.message.includes('duplicate')) console.error('Follow error:', error.message)
  }
  log('Phase 5', `${follows.length} follows`)

  // Reactions (likes): ~8000
  const reactions = []
  const postsSubset = posts.slice(0, 3000)
  for (const post of postsSubset) {
    const numLikes = randInt(0, 5)
    const likers = pickN(profiles, numLikes)
    for (const liker of likers) {
      if (liker.id !== post.profile_id) {
        reactions.push({ profile_id: liker.id, post_id: post.id, type: 'like' })
      }
    }
  }

  for (let i = 0; i < reactions.length; i += BATCH_SIZE) {
    const { error } = await sb.from('reactions').upsert(reactions.slice(i, i + BATCH_SIZE), { onConflict: 'profile_id,post_id,type', ignoreDuplicates: true })
    if (error && !error.message.includes('duplicate')) console.error('Reaction error:', error.message)
  }
  log('Phase 5', `${reactions.length} reactions`)

  // Comments: ~2000
  const commentBodies = [
    'Great insight! Thanks for sharing.',
    'This resonates with my experience. We faced the same challenge.',
    'Interesting perspective. Have you considered the opposite approach?',
    'Bookmarking this for later. Really valuable.',
    'I disagree on point 2, but the overall direction is solid.',
    'We implemented something similar last quarter. Happy to compare notes.',
    'This is exactly what I needed to read today.',
    'Strong take. Would love to see a follow-up post on implementation details.',
    'Can you elaborate on the metrics you mentioned?',
    'Just shared this with my team. Thanks!',
  ]

  const comments = []
  for (let c = 0; c < 2000; c++) {
    const post = pick(postsSubset)
    const commenter = pick(profiles)
    if (commenter.id !== post.profile_id) {
      comments.push({
        post_id: post.id,
        profile_id: commenter.id,
        body: pick(commentBodies),
      })
    }
  }

  for (let i = 0; i < comments.length; i += BATCH_SIZE) {
    const { error } = await sb.from('comments').insert(comments.slice(i, i + BATCH_SIZE))
    if (error && !error.message.includes('duplicate')) console.error('Comment error:', error.message)
  }
  log('Phase 5', `${comments.length} comments`)

  // Job listings: 0-3 per company (via companies table)
  const { data: companies } = await sb.from('companies').select('id')
  const jobs = []
  for (const company of (companies || [])) {
    const numJobs = randInt(0, 3)
    for (let j = 0; j < numJobs; j++) {
      jobs.push({
        company_id: company.id,
        title: `${pick(['Senior','Staff','Lead','Junior','Principal'])} ${pick(['Software Engineer','Product Manager','Designer','Data Scientist','DevOps Engineer'])}`,
        location: pick(LOCATIONS),
        type: pick(JOB_TYPES),
        description_md: `We're looking for a passionate professional to join our team. You'll work on ${pick(SKILLS_POOL)} and ${pick(SKILLS_POOL)} projects.`,
        active: Math.random() > 0.2,
      })
    }
  }

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const { error } = await sb.from('job_listings').insert(jobs.slice(i, i + BATCH_SIZE))
    if (error && !error.message.includes('duplicate')) console.error('Job error:', error.message)
  }
  log('Phase 5', `${jobs.length} job listings`)
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== linked.md Synthetic Data Seed ===')
  console.log(`Target: ${NUM_PROFILES} profiles, ${NUM_COMPANIES} companies, ${NUM_POSTS} posts`)
  console.log('')

  const start = Date.now()

  const profiles = await seedProfiles()
  const companies = await seedCompanies(profiles)
  await seedProfileData(profiles, companies)
  const posts = await seedPosts(profiles)
  await seedSocialGraph(profiles, posts)

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log('')
  console.log(`=== Done in ${elapsed}s ===`)
  console.log(`Profiles: ${profiles.length}`)
  console.log(`Companies: ${companies.length}`)
  console.log(`Posts: ${posts.length}`)
}

main().catch(console.error)

// generate_final_resume.js
// Polished developer resume layout — improved typography & spacing.
// Usage: node generate_final_resume.js
require('dotenv').config();
const mongoose = require('mongoose');
const puppeteer = require('puppeteer');

const MONGO_URI = process.env.MONGO_URI;
const RESUME_NAME = process.env.RESUME_NAME || 'Barani Tharan';
const OUTPUT_FILE = process.env.OUTPUT_FILE || 'resume.pdf';

if (!MONGO_URI) {
  console.error('Missing MONGO_URI in .env — add your Atlas connection string.');
  process.exit(1);
}

const resumeSchema = new mongoose.Schema({}, { strict: false });
const Resume = mongoose.model('Resume_for_final', resumeSchema, 'resumes');

const finalResume = {
  name: "Barani Tharan",
  title: "Web Developer | Frontend Developer",
  phone: "+91 7806968106",
  email: "baranitharantamilsalvam@gmail.com",
 github: "https://github.com/barani123-tharan",
linkedin: "https://www.linkedin.com/in/barani-tharan-938b0632b?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app",
 address: "58/B North Street, Melakkupam, Ammeri (Post), Virudhachalam (Taluk), 607802",
  portfolio: "",
  aboutMe:
    "Motivated CSE student focused on frontend development. Skilled in HTML, CSS, JavaScript and modern UI patterns. Building responsive web interfaces with attention to accessibility and performance.",
  interests: ["Web Development", "UI Design", "Learning new technologies"],
  skills: {
    programming: ["HTML", "CSS", "JavaScript", "React.js", "Angular.js"],
    backend: ["Node.js"],
    database: ["MongoDB"],
    cloud: ["AWS"],
    languages: ["Java"],
    tools: ["VS Code", "GitHub"]
  },
  projects: [
    {
      title: "Personal Portfolio Website",
      description: "Responsive portfolio to showcase projects. Mobile-first layout, fast load and accessible UI.",
      techStack: ["HTML", "CSS", "JavaScript"]
    },
    {
      title: "E-Commerce Landing Page",
      description: "Designed responsive product grid, clear CTAs and simple checkout funnel.",
      techStack: ["HTML", "CSS", "JavaScript"]
    },
    {
      title: "Login Page UI",
      description: "Modern login/registration interface with subtle CSS micro-interactions.",
      techStack: ["HTML", "CSS"]
    }
  ],
  education: [
    { yearRange: "1st – 12th", course: "Jawahar Matric Higher Secondary School", institute: "Block 17, Neyveli" },
    { yearRange: "2024 – 2028", course: "B.E – Computer Science and Engineering", institute: "Dhanalakshmi Srinivasan College of Engineering and Technology" }
  ],
  certifications: [{ title: "Web Development – Course Completion", issuer: "Rinex Company" }],
  languages: ["English", "Tamil"],
  hobbies: ["Research new technologies", "Coding", "Playing Android games"]
};

function esc(s) {
  if (s === undefined || s === null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function listToUL(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  return `<ul>${arr.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
}
function projectsHtml(projects = []) {
  if (!Array.isArray(projects) || projects.length === 0) return '<div class="empty">—</div>';
  return projects.map(p => `
    <div class="proj">
      <div class="proj-title">${esc(p.title)}</div>
      ${p.description ? `<div class="proj-desc">${esc(p.description)}</div>` : ''}
      ${Array.isArray(p.techStack) && p.techStack.length ? `<div class="proj-tech">Tech: ${esc(p.techStack.join(', '))}</div>` : ''}
    </div>
  `).join('');
}
function educationHtml(ed = []) {
  if (!Array.isArray(ed) || ed.length === 0) return '<div class="empty">—</div>';
  return ed.map(e => `
    <div class="edu-item">
      <div class="edu-left">${esc(e.yearRange || '')}</div>
      <div class="edu-right">
        <div class="edu-degree">${esc(e.course || '')}</div>
        <div class="edu-inst">${esc(e.institute || '')}</div>
      </div>
    </div>
  `).join('');
}

function buildHTML(doc) {
  const data = Object.assign({}, finalResume, doc || {});
  const mail = data.email ? `mailto:${data.email}` : '';
  const tel = data.phone ? `tel:${data.phone.replace(/\s+/g,'')}` : '';
  const portfolio = data.portfolio || '';

  const css = `
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color:#0f172a; font-size:11px; line-height:1.2; margin:0; }
    .wrap { max-width:900px; margin:0 auto; padding:6px; }
    header { text-align:center; padding-top:6px; padding-bottom:6px; }
    header h1 { margin:0; font-size:32px; letter-spacing:-0.6px; font-weight:800; color:#0b1220; }
    header h2 { margin:6px 0 0; font-size:13px; font-weight:600; color:#334155; }
    .contact { display:flex; gap:18px; justify-content:center; flex-wrap:wrap; margin-top:8px; font-size:11px; color:#334155; }
    .contact a { color:#1d4ed8; text-decoration:none; }
    .divider { height:1px; background:#e6eef8; margin:12px 0; }

    .grid { display:grid; grid-template-columns: 1fr 2fr; gap:22px; align-items:start; }
    .panel { background: #ffffff; }

    /* Left column */
    .left { padding:4px 8px 4px 4px; border-right:1px solid #eef2f7; min-width:170px; }
    .left h3 { margin:8px 0 8px; font-size:12px; color:#0369a1; border-bottom:1px solid #eef2f7; padding-bottom:6px; font-weight:700; }
    .skills-list ul { margin:6px 0 10px 16px; padding:0; }
    .skills-list li { margin-bottom:6px; font-size:11px; color:#0b1220; }
    .small-list { margin:6px 0 10px 16px; }

    /* Right column */
    .right { padding:0 4px 4px 8px; }
    .section-title { display:flex; justify-content:space-between; align-items:center; }
    .right h3 { margin:4px 0 8px; font-size:13px; color:#0b5ed7; border-bottom:1px solid #eef2f7; padding-bottom:6px; font-weight:800; }
    .summary { margin-bottom:8px; font-size:11px; color:#0b1220; text-align:justify; }
    .proj { margin-bottom:10px; }
    .proj-title { font-weight:700; font-size:12.2px; color:#0b1220; }
    .proj-desc { margin:4px 0 6px; font-size:11px; color:#111827; }
    .proj-tech { font-size:11px; color:#334155; margin-bottom:6px; }

    .edu-item { display:flex; margin-bottom:8px; }
    .edu-left { width:100px; font-weight:700; color:#334155; font-size:11px; }
    .edu-right { flex:1; font-size:11px; color:#0b1220; }

    .meta { font-size:10.5px; color:#64748b; margin-top:6px; }

    /* responsive-ish for printing */
    @media print {
      .wrap { padding:0; }
      header h1 { font-size:30px; }
    }
  `;

  const html = `
  <!doctype html>
  <html>
  <head><meta charset="utf-8"/><title>${esc(data.name)} — Resume</title><style>${css}</style></head>
  <body>
    <div class="wrap">
      <header>
        <h1>${esc(data.name)}</h1>
        <h2>${esc(data.title)}</h2>
        <div class="contact">
          ${ mail ? `<div><a href="${esc(mail)}">${esc(data.email)}</a></div>` : '' }
          ${ tel ? `<div><a href="${esc(tel)}">${esc(data.phone)}</a></div>` : '' }
          ${ data.address ? `<div>${esc(data.address)}</div>` : '' }
          ${ data.linkedin ? `<div><a href="${esc(data.linkedin)}">LinkedIn</a></div>` : '' }
          ${ data.github ? `<div><a href="${esc(data.github)}">GitHub</a></div>` : '' }
          ${ portfolio ? `<div><a href="${esc(portfolio)}">Portfolio</a></div>` : '' }
        </div>
      </header>

      <div class="divider"></div>

      <div class="grid">
        <div class="left panel">
          <h3>SKILLS</h3>
          <div class="skills-list">${listToUL(data.skills.programming || [])}</div>

          <h3>CERTIFICATIONS</h3>
          <div class="small-list">${listToUL((data.certifications || []).map(c=>c.title || c))}</div>

          <h3>LANGUAGES</h3>
          <div class="small-list">${listToUL(data.languages || [])}</div>

          <h3>HOBBIES</h3>
          <div class="small-list">${listToUL(data.hobbies || [])}</div>
        </div>

        <div class="right panel">
          <h3>SUMMARY</h3>
          <div class="summary">${esc(data.aboutMe)}</div>

          <h3>PROJECTS</h3>
          <div class="projects">${projectsHtml(data.projects || [])}</div>

          <h3>EDUCATION</h3>
          <div class="education">${educationHtml(data.education || [])}</div>

          <h3>INTERESTS</h3>
          <div class="meta">${listToUL(data.interests || []).replace(/<ul>|<\/ul>/g,'')}</div>
        </div>
      </div>

      <!-- footer intentionally removed for clean print -->
    </div>
  </body>
  </html>
  `;
  return html;
}

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB');

    const upsertResult = await Resume.findOneAndUpdate(
      { name: RESUME_NAME },
      finalResume,
      { upsert: true, new: true }
    );
    console.log('Resume data upserted (id):', upsertResult._id);

    const doc = await Resume.findOne({ name: RESUME_NAME }).lean();
    const html = buildHTML(doc || finalResume);

    console.log('Launching headless browser (Puppeteer)...');
    const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    await page.pdf({ path: OUTPUT_FILE, format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' } });

    await browser.close();
    await mongoose.disconnect();

    console.log('PDF created successfully:', OUTPUT_FILE);
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();

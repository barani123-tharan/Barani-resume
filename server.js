// server.js — Express web server to generate resume PDF on Render
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const RESUME_NAME = process.env.RESUME_NAME || 'Barani Tharan';

if (!MONGO_URI) {
  console.error('Missing MONGO_URI in environment.');
  process.exit(1);
}

// Flexible schema
const resumeSchema = new mongoose.Schema({}, { strict: false });
const Resume = mongoose.model('Resume_for_render', resumeSchema, 'resumes');

// Helpers
function esc(s) {
  if (s === undefined || s === null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function listToUL(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  return `<ul>${arr.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`;
}
function projectsHtml(projects = []) {
  if (!Array.isArray(projects) || projects.length === 0) return '<div class="empty">—</div>';
  return projects.map(p => `
    <div class="proj">
      <div class="proj-title">${esc(p.title || '')}</div>
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
function buildHTML(data) {
  // minimal CSS — kept compact and printer-friendly
  const css = `
    @page { size: A4; margin: 12mm; }
    body { font-family: "Segoe UI", Roboto, Arial, sans-serif; color:#0f172a; font-size:11px; line-height:1.18; }
    .wrap { max-width:900px; margin:0 auto; padding:6px; }
    header { text-align:center; }
    header h1 { margin:0; font-size:30px; font-weight:800; }
    header h2 { margin:6px 0; font-size:13px; font-weight:600; color:#334155; }
    .contact { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; font-size:11px; color:#334155; margin-bottom:8px;}
    .grid { display:grid; grid-template-columns: 1fr 2fr; gap:20px; }
    .left { padding-right:6px; border-right:1px solid #eef2f7; min-width:150px; }
    .left h3, .right h3 { font-size:12.5px; color:#0b5ed7; margin-bottom:6px; margin-top:6px; }
    .skills-list ul { margin:6px 0 8px 16px; }
    .proj { margin-bottom:8px; }
    .proj-title { font-weight:700; }
    .edu-item { display:flex; margin-bottom:6px; }
    .edu-left { width:90px; font-weight:700; color:#334155; }
    .summary { margin-bottom:8px; text-align:justify; }
  `;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(data.name)} — Resume</title><style>${css}</style></head><body>
    <div class="wrap">
      <header>
        <h1>${esc(data.name)}</h1>
        <h2>${esc(data.title)}</h2>
        <div class="contact">
          ${data.email ? `<div><a href="mailto:${esc(data.email)}">${esc(data.email)}</a></div>` : ''}
          ${data.phone ? `<div><a href="tel:${esc(data.phone.replace(/\s+/g,''))}">${esc(data.phone)}</a></div>` : ''}
          ${data.address ? `<div>${esc(data.address)}</div>` : ''}
          ${data.linkedin ? `<div><a href="${esc(data.linkedin)}">LinkedIn</a></div>` : ''}
          ${data.github ? `<div><a href="${esc(data.github)}">GitHub</a></div>` : ''}
        </div>
      </header>
      <div class="grid">
        <div class="left">
          <h3>Skills</h3>
          <div class="skills-list">${listToUL(data.skills?.programming || [])}</div>
          <h3>Certs</h3>
          <div>${listToUL((data.certifications || []).map(c=>c.title || c))}</div>
          <h3>Languages</h3>
          <div>${listToUL(data.languages || [])}</div>
          <h3>Hobbies</h3>
          <div>${listToUL(data.hobbies || [])}</div>
        </div>
        <div class="right">
          <h3>Summary</h3>
          <div class="summary">${esc(data.aboutMe || '')}</div>
          <h3>Projects</h3>
          <div>${projectsHtml(data.projects || [])}</div>
          <h3>Education</h3>
          <div>${educationHtml(data.education || [])}</div>
        </div>
      </div>
    </div>
  </body></html>`;
}

app.get('/', (req, res) => {
  res.send(`<h3>Resume Generator</h3>
    <p>GET <a href="/generate">/generate</a> to create and download the PDF.</p>`);
});

app.get('/generate', async (req, res) => {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    const doc = await Resume.findOne({ name: RESUME_NAME }).lean();
    const data = doc || {
      name: 'Barani Tharan',
      title: 'Web Developer',
      // fallback: minimal fields
    };

    const html = buildHTML(data);

    // Launch Puppeteer (Chromium). Use --no-sandbox on Render.
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' } });

    await browser.close();
    await mongoose.disconnect();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="resume.pdf"',
      'Content-Length': pdfBuffer.length
    });
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating PDF:', err);
    return res.status(500).send('Error generating PDF: ' + (err.message || err));
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

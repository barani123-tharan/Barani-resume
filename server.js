// server.js — Express web server to generate resume PDF on Render
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;
const RESUME_NAME = process.env.RESUME_NAME || "Barani Tharan";

// 🔴 IMPORTANT: exact Chrome path on Render
const CHROME_PATH =
  "/opt/render/.cache/puppeteer/chrome/linux-143.0.7499.42/chrome-linux64/chrome";

if (!MONGO_URI) {
  console.error("Missing MONGO_URI in environment.");
  process.exit(1);
}

// Flexible schema
const resumeSchema = new mongoose.Schema({}, { strict: false });
const Resume = mongoose.model("Resume_for_render", resumeSchema, "resumes");

// Helpers
function esc(s) {
  if (s === undefined || s === null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function listToUL(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  return `<ul>${arr.map(i => `<li>${esc(i)}</li>`).join("")}</ul>`;
}

function projectsHtml(projects = []) {
  if (!Array.isArray(projects) || projects.length === 0)
    return "<div class='empty'>—</div>";

  return projects.map(p => `
    <div class="proj">
      <div class="proj-title">${esc(p.title || "")}</div>
      ${p.description ? `<div class="proj-desc">${esc(p.description)}</div>` : ""}
      ${
        Array.isArray(p.techStack) && p.techStack.length
          ? `<div class="proj-tech">Tech: ${esc(p.techStack.join(", "))}</div>`
          : ""
      }
    </div>
  `).join("");
}

function educationHtml(ed = []) {
  if (!Array.isArray(ed) || ed.length === 0)
    return "<div class='empty'>—</div>";

  return ed.map(e => `
    <div class="edu-item">
      <div class="edu-left">${esc(e.yearRange || "")}</div>
      <div class="edu-right">
        <div class="edu-degree">${esc(e.course || "")}</div>
        <div class="edu-inst">${esc(e.institute || "")}</div>
      </div>
    </div>
  `).join("");
}

function buildHTML(data) {
  const css = `
    @page { size: A4; margin: 12mm; }
    body { font-family: Arial, sans-serif; font-size:11px; color:#0f172a; }
    header { text-align:center; }
    header h1 { font-size:30px; margin:0; }
    header h2 { font-size:13px; margin:6px 0; color:#334155; }
    .contact { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
    .grid { display:grid; grid-template-columns:1fr 2fr; gap:20px; }
    h3 { color:#0b5ed7; margin:8px 0 4px; }
    ul { margin-left:16px; }
  `;

  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(data.name)} - Resume</title>
<style>${css}</style>
</head>
<body>
<header>
  <h1>${esc(data.name)}</h1>
  <h2>${esc(data.title || "")}</h2>
  <div class="contact">
    ${data.email ? `<span>${esc(data.email)}</span>` : ""}
    ${data.phone ? `<span>${esc(data.phone)}</span>` : ""}
    ${data.linkedin ? `<span>${esc(data.linkedin)}</span>` : ""}
  </div>
</header>

<div class="grid">
  <div>
    <h3>Skills</h3>
    ${listToUL(data.skills?.programming || [])}
    <h3>Languages</h3>
    ${listToUL(data.languages || [])}
  </div>

  <div>
    <h3>Summary</h3>
    <p>${esc(data.aboutMe || "")}</p>

    <h3>Projects</h3>
    ${projectsHtml(data.projects || [])}

    <h3>Education</h3>
    ${educationHtml(data.education || [])}
  </div>
</div>
</body>
</html>
`;
}

app.get("/", (req, res) => {
  res.send(`<h3>Resume Generator</h3>
  <p>Open <a href="/generate">/generate</a> to download PDF</p>`);
});

app.get("/generate", async (req, res) => {
  let browser;
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });

    const doc = await Resume.findOne({ name: RESUME_NAME }).lean();
    const data = doc || { name: RESUME_NAME, title: "Web Developer" };

    const html = buildHTML(data);

    // ✅ FIXED Puppeteer launch for Render
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ],
      headless: true
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=resume.pdf",
      "Content-Length": pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error("Error generating PDF:", err);
    res.status(500).send("Error generating PDF: " + err.message);
  } finally {
    if (browser) await browser.close();
    await mongoose.disconnect();
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

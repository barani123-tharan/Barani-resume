// server.js — Express web server to generate resume PDF on Render

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 10000;

// 🔹 MongoDB URI (must exist in Render env / env group)
const MONGO_URI = process.env.MONGO_URI;
const RESUME_NAME = process.env.RESUME_NAME || "Barani Tharan";

// 🚨 Stop app if Mongo URI missing
if (!MONGO_URI) {
  console.error("Missing MONGO_URI in environment.");
  process.exit(1);
}

// 🔹 Let Puppeteer decide correct Chrome path (BEST PRACTICE)
const CHROME_PATH = puppeteer.executablePath();

// ---------- MongoDB Model ----------
const resumeSchema = new mongoose.Schema({}, { strict: false });
const Resume = mongoose.model(
  "Resume_for_render",
  resumeSchema,
  "resumes"
);

// ---------- Helper Functions ----------
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
    return "<div>—</div>";

  return projects.map(p => `
    <div style="margin-bottom:8px">
      <strong>${esc(p.title || "")}</strong><br/>
      ${p.description ? esc(p.description) + "<br/>" : ""}
      ${Array.isArray(p.techStack) ? "Tech: " + esc(p.techStack.join(", ")) : ""}
    </div>
  `).join("");
}

function educationHtml(ed = []) {
  if (!Array.isArray(ed) || ed.length === 0)
    return "<div>—</div>";

  return ed.map(e => `
    <div style="margin-bottom:6px">
      <strong>${esc(e.course || "")}</strong> — ${esc(e.institute || "")}
      <div>${esc(e.yearRange || "")}</div>
    </div>
  `).join("");
}

function buildHTML(data) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${esc(data.name)} - Resume</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color:#0f172a; }
  h1 { font-size: 26px; margin-bottom: 4px; }
  h2 { font-size: 14px; color: #475569; }
  h3 { color: #0b5ed7; margin-top: 12px; }
  ul { margin-left: 16px; }
</style>
</head>
<body>
  <h1>${esc(data.name)}</h1>
  <h2>${esc(data.title || "")}</h2>

  <h3>Summary</h3>
  <p>${esc(data.aboutMe || "")}</p>

  <h3>Skills</h3>
  ${listToUL(data.skills?.programming || [])}

  <h3>Projects</h3>
  ${projectsHtml(data.projects || [])}

  <h3>Education</h3>
  ${educationHtml(data.education || [])}
</body>
</html>`;
}

// ---------- Routes ----------
app.get("/", (req, res) => {
  res.send(`
    <h3>Resume Generator</h3>
    <p>Open <a href="/generate">/generate</a> to download the PDF.</p>
  `);
});

app.get("/generate", async (req, res) => {
  let browser;

  try {
    // 🔹 Connect MongoDB
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });

    const doc = await Resume.findOne({ name: RESUME_NAME }).lean();
    const data = doc || {
      name: RESUME_NAME,
      title: "Web Developer"
    };

    const html = buildHTML(data);

    // 🔹 Launch Puppeteer (Render-safe)
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ]
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="resume.pdf"',
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

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

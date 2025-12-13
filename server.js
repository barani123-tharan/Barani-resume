// server.js — Express web server to generate resume PDF on Render
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;
const RESUME_NAME = process.env.RESUME_NAME || "Barani Tharan";

if (!MONGO_URI) {
  console.error("Missing MONGO_URI in environment.");
  process.exit(1);
}

// Flexible schema
const resumeSchema = new mongoose.Schema({}, { strict: false });
const Resume = mongoose.model("Resume_for_render", resumeSchema, "resumes");

// ---------- Helpers ----------
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
  if (!Array.isArray(projects) || projects.length === 0) return "—";
  return projects.map(p => `
    <div>
      <strong>${esc(p.title || "")}</strong><br/>
      ${esc(p.description || "")}
    </div>
  `).join("");
}

function educationHtml(ed = []) {
  if (!Array.isArray(ed) || ed.length === 0) return "—";
  return ed.map(e => `
    <div>
      <strong>${esc(e.course || "")}</strong> — ${esc(e.institute || "")}
      <div>${esc(e.yearRange || "")}</div>
    </div>
  `).join("");
}

function buildHTML(data) {
  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(data.name)} - Resume</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; }
  h1 { font-size: 26px; margin-bottom: 4px; }
  h2 { font-size: 14px; color: #444; }
  h3 { color: #0b5ed7; margin-top: 12px; }
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
  res.send(`<h3>Resume Generator</h3><a href="/generate">Generate PDF</a>`);
});

app.get("/generate", async (req, res) => {
  let browser;
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });

    const doc = await Resume.findOne({ name: RESUME_NAME }).lean();
    const data = doc || { name: RESUME_NAME, title: "Web Developer" };

    const html = buildHTML(data);

    // ✅ FINAL & CORRECT Puppeteer launch (Render-safe)
    browser = await puppeteer.launch({
      executablePath: puppeteer.executablePath(),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ],
      headless: true
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="resume.pdf"',
      "Content-Length": pdf.length
    });

    res.send(pdf);
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

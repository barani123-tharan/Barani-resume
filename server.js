// server.js — FINAL STABLE Render setup (NO executablePath)

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

// Mongo model
const resumeSchema = new mongoose.Schema({}, { strict: false });
const Resume = mongoose.model("Resume_for_render", resumeSchema, "resumes");

// Helpers
function esc(s) {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHTML(data) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${esc(data.name)}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; }
  h1 { font-size: 26px; margin-bottom: 4px; }
  h2 { font-size: 14px; color: #555; }
</style>
</head>
<body>
  <h1>${esc(data.name)}</h1>
  <h2>${esc(data.title || "")}</h2>
  <p>${esc(data.aboutMe || "")}</p>
</body>
</html>`;
}

// Routes
app.get("/", (req, res) => {
  res.send(`<h3>Resume Generator</h3>
  <p>Open <a href="/generate">/generate</a></p>`);
});

app.get("/generate", async (req, res) => {
  let browser;

  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });

    const doc = await Resume.findOne({ name: RESUME_NAME }).lean();
    const data = doc || {
      name: RESUME_NAME,
      title: "Web Developer",
      aboutMe: "Resume generated successfully"
    };

    const html = buildHTML(data);

    // ✅ DO NOT set executablePath on Render
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ]
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

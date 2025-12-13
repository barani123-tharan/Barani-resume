require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const puppeteer = require("puppeteer-core");

const app = express();
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("Missing MONGO_URI");
  process.exit(1);
}

const resumeSchema = new mongoose.Schema({}, { strict: false });
const Resume = mongoose.model("Resume", resumeSchema, "resumes");

function esc(s) {
  return s ? String(s).replace(/[&<>"]/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[m])) : "";
}

function html(data) {
  return `
  <html>
    <body style="font-family:Arial;font-size:11px">
      <h1>${esc(data.name)}</h1>
      <p>${esc(data.aboutMe || "")}</p>
    </body>
  </html>`;
}

app.get("/generate", async (req, res) => {
  let browser;
  try {
    await mongoose.connect(MONGO_URI);

    const data = await Resume.findOne({}).lean() || {
      name: "Barani Tharan",
      aboutMe: "Resume generated successfully"
    };

    browser = await puppeteer.launch({
      executablePath: puppeteer.executablePath(),
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ]
    });

    const page = await browser.newPage();
    await page.setContent(html(data), { waitUntil: "networkidle0" });

    const pdf = await page.pdf({ format: "A4" });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=resume.pdf"
    });

    res.send(pdf);
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message);
  } finally {
    if (browser) await browser.close();
    await mongoose.disconnect();
  }
});

app.listen(PORT, () =>
  console.log("Server running on port", PORT)
);

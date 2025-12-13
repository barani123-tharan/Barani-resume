require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("Missing MONGO_URI");
  process.exit(1);
}

// Mongo model
const resumeSchema = new mongoose.Schema({}, { strict: false });
const Resume = mongoose.model("Resume", resumeSchema, "resumes");

// ✅ HOME ROUTE (FIXES "Cannot GET /")
app.get("/", (req, res) => {
  res.send(`
    <h2>Resume Generator</h2>
    <p>Your service is running successfully.</p>
    <a href="/generate">Generate Resume PDF</a>
  `);
});

// HTML template
function html(data) {
  return `
    <html>
      <body style="font-family:Arial;font-size:12px">
        <h1>${data.name}</h1>
        <p>${data.aboutMe || ""}</p>
      </body>
    </html>
  `;
}

// PDF route
app.get("/generate", async (req, res) => {
  let browser;
  try {
    await mongoose.connect(MONGO_URI);

    const data =
      (await Resume.findOne({}).lean()) || {
        name: "Barani Tharan",
        aboutMe: "Resume generated successfully"
      };

    browser = await puppeteer.launch({
      headless: "new",
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
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  } finally {
    if (browser) await browser.close();
    await mongoose.disconnect();
  }
});

app.listen(PORT, () => console.log("Server running on", PORT));

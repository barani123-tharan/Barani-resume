const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  links: {
    linkedin: String,
    github: String,
    portfolio: String
  },

  aboutMe: String,

  education: [
    {
      yearRange: String,
      course: String,
      institute: String,
      boardOrUniversity: String,
      score: String
    }
  ],

  skills: {
    programming: [String],
    codingTools: [String],
    designTools: [String],
    professional: [String]
  },

  projects: [
    {
      title: String,
      description: String,
      techStack: [String]
    }
  ],

  internships: [
    {
      title: String,
      company: String,
      description: String,
      duration: String
    }
  ],

  certifications: [
    {
      title: String,
      issuer: String
    }
  ]
});

module.exports = mongoose.model("Resume", resumeSchema);

const mongoose = require("mongoose");
const Resume = require("./models/resume");

async function main() {
  // Your Atlas Connection String
  await mongoose.connect("mongodb+srv://barani:Barani123@cluster0.8hlrarj.mongodb.net/resumeDB");

  console.log("Connected to MongoDB Atlas ✔");

  const resumeData = {
    name: "Barani",
    phone: "+91 XXXXXXXXXX",
    email: "yourmail@gmail.com",
    links: {
      linkedin: "https://linkedin.com/in/yourprofile",
      github: "https://github.com/yourusername",
      portfolio: "https://yourportfolio.com"
    },

    aboutMe:
      "Bachelor of Engineering in Computer Science. Specialized in Web Development, Software Engineering, and Database Systems.",

    education: [
      {
        yearRange: "2024 – Present",
        course: "B.E. – Computer Science and Engineering",
        institute:
          "Dhanalakshmi Srinivasan College of Engineering and Technology",
        boardOrUniversity: "Anna University",
        score: "CGPA: 7.2"
      },
      {
        yearRange: "2022",
        course: "SSLC",
        institute: "Govt. Higher Secondary School",
        score: "60.00%"
      },
      {
        yearRange: "2024",
        course: "HSC",
        institute: "Govt. Higher Secondary School",
        score: "67.20%"
      }
    ],

    skills: {
      programming: ["Java", "HTML", "CSS", "JavaScript", "SQL"],
      codingTools: ["IntelliJ IDEA", "VS Code"],
      designTools: ["Figma", "Miro"],
      professional: ["Problem Solving", "Communication", "Time Management"]
    },

    projects: [
      {
        title: "Gamified Environmental Education Platform",
        description:
          "Developed an interactive web & mobile platform promoting eco-learning with quizzes, badges, AR/VR modules, and environment challenges.",
        techStack: ["ReactJS", "Flutter", "Java Spring Boot", "MySQL", "AWS", "Azure"]
      }
    ],

    internships: [
      {
        title: "Web Development Internship",
        company: "RENIX",
        description:
          "Completed a 4-week internship focused on Web development concepts and hands-on learning.",
        duration: "4 Weeks"
      }
    ],

    certifications: [
      { title: "Java Programming – Basic Certification", issuer: "GreatLearning" },
      { title: "Introduction to Career Skills in Software Development", issuer: "LinkedIn Learning" },
      { title: "Data Structures & Algorithms in Java", issuer: "Rinex" }
    ]
  };

  // Insert or update
  const savedResume = await Resume.findOneAndUpdate(
    { name: "Barani" },
    resumeData,
    { upsert: true, new: true }
  );

  console.log("Resume Saved/Updated ✔");
  console.log(savedResume);

  mongoose.disconnect();
}

main().catch((err) => console.log(err));

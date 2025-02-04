const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
const port = 3000;

const collection = require("./mongo");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "http://localhost:5173", 
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.send("hello");
});

app.post("/", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await collection.findOne({ email: email });

    if (user) {
      if (user.password === password) {
        res.json("exist");
      } else {
        res.json("incorrect");
      }
    } else {
      res.json("notexist");
    }
  } catch (e) {
    res.json("error");
  }
});

app.get("/signup", (req, res) => {
  res.send("signup page");
});

app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  const data = {
    email: email,
    password: password,
  };

  try {
    const check = await collection.findOne({ email: email });

    if (check) {
      res.json("exist");
    } else {
      await collection.insertMany([data]);
      res.json("notexist");
    }
  } catch (e) {
    res.json("notexist");
  }
});


app.post("/resume", async (req, res) => {
  const { email, name, contact, experience, projects, skills, achievements, certifications } = req.body;

  try {
    const user = await collection.findOneAndUpdate(
      { email: email },
      {
        $set: {
          name: name || "",
          contact: contact || "",
          experience: Array.isArray(experience) ? experience : [experience],
          projects: Array.isArray(projects) ? projects : [projects],
          skills: Array.isArray(skills) ? skills : [skills],
          achievements: achievements || "",
          certifications: Array.isArray(certifications) ? certifications : [certifications],
        },
      },
      { new: true, upsert: true } 
    );

    if (user) {
      res.json({ status: "success", user });
    } else {
      res.json({ status: "user_not_found" });
    }
  } catch (e) {
    res.json({ status: "error", message: e.message });
  }
});

app.get("/resume", async (req, res) => {
  const { email } = req.query;

  try {
    const user = await collection.findOne({ email: email });
    if (user) {
      res.json({ status: "success", user });
    } else {
      res.json({ status: "user_not_found" });
    }
  } catch (e) {
    res.json({ status: "error", message: e.message });
  }
});


app.post("/extract-skills", async (req, res) => {
  const { jobTitle } = req.body;

  try {
    const response = await axios.post('http://localhost:5000/extract_skills', {
      job_title: jobTitle
    });

    res.json({ skills: response.data.skills });
  } catch (error) {
     res.status(500).json({ error: 'Failed to extract skills' });
   }
 });

// Update skill level

// app.post("/updateSkillLevel", async (req, res) => {
//   const { email, skill, level } = req.body;

//   try {
//     const user = await collection.findOneAndUpdate(
//       { email: email },
//       { $set: { [`skillLevels.${skill}`]: level } },
//       { new: true }
//     );

//     if (user) {
//       res.json({ status: "success", skillLevels: user.skillLevels });
//     } else {
//       res.json({ status: "user_not_found" });
//     }
//   } catch (e) {
//     res.json({ status: "error", message: e.message });
//   }
// });

app.post("/updateSkillLevel", async (req, res) => {
  const { email, skill, level } = req.body;

  try {
    const user = await collection.findOneAndUpdate(
      { email: email },
      { $set: { [`skillLevels.${skill}`]: level } },
      { new: true }
    );

    if (user) {
      res.json({ status: "success", skillLevels: user.skillLevels });
    } else {
      res.json({ status: "user_not_found" });
    }
  } catch (e) {
    res.json({ status: "error", message: e.message });
  }
});


const jobTitles = {
  "frontend developer": [0, 1, 2, 4, 5],
  "backend developer": [1, 6, 7, 8, 9, 10],
  "software developer": [1, 2, 6, 7, 8, 9],
  "data scientist": [16, 17, 18, 19],
  "ui/ux developer": [0, 2, 4, 5, 23],
  // Add more titles and corresponding skill indices here
};


app.post("/match-job-title", async (req, res) => {
  const { skills, email } = req.body; // Add email to the request body

  try {
    let bestMatch = null;

    for (const [title, requiredSkills] of Object.entries(jobTitles)) {
      const matchedSkills = skills.filter(skill => requiredSkills.includes(skill));
      if (!bestMatch || matchedSkills.length > bestMatch.matchedSkills.length) {
        bestMatch = { title, matchedSkills };
      }
    }

    // Update the user's matchedJobTitle in the database
    if (bestMatch) {
      await collection.findOneAndUpdate(
        { email: email },
        { $set: { matchedJobTitle: bestMatch.title } },
        { new: true }
      );
    }

    res.json({ status: "success", matchingTitle: bestMatch });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});


app.post('/storeJobTitle', async (req, res) => {
  const { email, jobTitle } = req.body;
  try {
    // Update user's job title in the database
    await User.updateOne({ email }, { matchedJobTitle: jobTitle });
    res.status(200).send({ message: 'Job title stored successfully' });
  } catch (error) {
    res.status(500).send({ error: 'Failed to store job title' });
  }
});

app.get('/getJobTitle', async (req, res) => {
  const { email } = req.query;
  try {
    const user = await User.findOne({ email });
    res.status(200).send({ matchedJobTitle: user.matchedJobTitle });
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch job title' });
  }
});



app.listen(port, () => {
  console.log("app running ");
});
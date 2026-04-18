const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { execFile } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json()); // Support JSON bodies

/* ---------- FILE UPLOAD SETUP ---------- */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const rootPath = path.resolve(__dirname, "..");
    cb(null, rootPath); 
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

/* ---------- COMMAND RUNNER ---------- */
function runGitLite(args, res) {
  const rootPath = path.resolve(__dirname, "..");
  const exePath = path.join(rootPath, "gitlite.exe");
  
  execFile(exePath, args, { cwd: rootPath }, (err, stdout, stderr) => {
    if (err) {
      // Return stderr if available, otherwise the error message
      res.status(200).send(stderr || err.message); 
      return;
    }
    res.send(stdout || "Command executed successfully.");
  });
}

/* ---------- API ROUTES ---------- */

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded.");
  // Automatically run 'add' for the uploaded file
  runGitLite(["add", req.file.originalname], res);
});

app.get("/init", (req, res) => {
  runGitLite(["init"], res);
});

app.get("/status", (req, res) => {
  runGitLite(["status"], res);
});

app.get("/log", (req, res) => {
  runGitLite(["log"], res);
});

app.get("/graph", (req, res) => {
  runGitLite(["graph"], res);
});

app.get("/gc", (req, res) => {
  runGitLite(["gc"], res);
});

// Parameterized routes (using query strings)
app.get("/commit", (req, res) => {
  const message = req.query.msg || "Manual commit from UI";
  runGitLite(["commit", message], res);
});

app.get("/search", (req, res) => {
  const keyword = req.query.q;
  if (!keyword) return res.status(400).send("Search keyword is required.");
  runGitLite(["search", keyword], res);
});

app.get("/add", (req, res) => {
    const file = req.query.file;
    if (!file) return res.status(400).send("File name is required.");
    runGitLite(["add", file], res);
});

app.get("/restore", (req, res) => {
    const { commitID, file } = req.query;
    if (!commitID || !file) return res.status(400).send("Both commitID and file are required.");
    runGitLite(["restore", commitID, file], res);
});

app.get("/diff-history", (req, res) => {
    const { commitID, file } = req.query;
    if (!commitID || !file) return res.status(400).send("Both commitID and file are required.");
    runGitLite(["diff-commit", commitID, file], res);
});

/* ---------- SERVER ---------- */
app.listen(5000, () => {
  console.log("GitLite API Server running on port 5000");
});
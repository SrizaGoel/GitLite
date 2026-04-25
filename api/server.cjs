const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { execFile } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json()); // Support JSON bodies
const fs = require("fs");
const repoPath = path.resolve(__dirname, "..");

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
  const message = req.query.msg || req.query.message || "Manual commit from UI";
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

app.get("/branch", (req, res) => {
    const name = req.query.name;
    if (!name) return res.status(400).send("Branch name is required.");
    runGitLite(["branch", name], res);
});

app.get("/checkout", (req, res) => {
    const name = req.query.name;
    if (!name) return res.status(400).send("Branch/Commit name is required.");
    runGitLite(["checkout", name], res);
});

app.get("/current-branch", (req, res) => {
    const fs = require("fs");
    const headPath = path.join(__dirname, "..", ".gitlite", "HEAD");
    if (!fs.existsSync(headPath)) return res.send("main");
    const branch = fs.readFileSync(headPath, "utf-8").trim();
    res.send(branch);
});

app.get("/diff-history", (req, res) => {
    const { commitID, file } = req.query;
    if (!commitID || !file) return res.status(400).send("Both commitID and file are required.");
    runGitLite(["diff-commit", commitID, file], res);
});

app.get("/file-history", (req, res) => {
    const fs = require("fs");
    const commitsDir = path.join(__dirname, "..", ".gitlite", "commits");
    let commits = [];

    if (!fs.existsSync(commitsDir)) {
        return res.json({});
    }

    const dirs = fs.readdirSync(commitsDir);
    for (const dir of dirs) {
        const dirPath = path.join(commitsDir, dir);
        if (!fs.statSync(dirPath).isDirectory()) continue;

        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const content = fs.readFileSync(path.join(dirPath, file), "utf-8");
            const lines = content.split(/\r?\n/);
            let id, timestamp;
            let tree = [];
            let inTree = false;

            for (let line of lines) {
                line = line.trim();
                if (line.startsWith("id ")) id = line.split(" ")[1];
                else if (line.startsWith("timestamp ")) timestamp = line.substring(10);
                else if (line === "tree") inTree = true;
                else if (inTree && line) {
                    tree.push(line.split(" ")[0]);
                }
            }
            if (id) {
                commits.push({ id, timestamp, files: tree });
            }
        }
    }

    commits.sort((a, b) => {
        const d1 = new Date(a.timestamp.replace(" ", "T"));
        const d2 = new Date(b.timestamp.replace(" ", "T"));
        return d2 - d1;
    });

    const fileHistory = {};
    for (const c of commits) {
        for (const f of c.files) {
            if (!fileHistory[f]) fileHistory[f] = [];
            fileHistory[f].push({ id: c.id, timestamp: c.timestamp });
        }
    }

    res.json(fileHistory);
});

app.get("/commit-graph", (req, res) => {
    const fs = require("fs");
    const graphPath = path.join(__dirname, "..", ".gitlite", "commit_graph");
    const commitsDir = path.join(__dirname, "..", ".gitlite", "commits");
    const branchDir = path.join(__dirname, "..", ".gitlite", "branches");
    
    if (!fs.existsSync(graphPath)) {
        return res.json([]);
    }

    // Load branch heads
    const branchMap = {};
    if (fs.existsSync(branchDir)) {
        const branchFiles = fs.readdirSync(branchDir);
        for (const bfile of branchFiles) {
            const head = fs.readFileSync(path.join(branchDir, bfile), "utf-8").trim();
            if (!branchMap[head]) branchMap[head] = [];
            branchMap[head].push(bfile);
        }
    }

    const graphData = fs.readFileSync(graphPath, "utf-8").split(/\r?\n/).filter(line => line.trim());
    const nodes = [];

    for (const line of graphData) {
        const [id, parent] = line.split(" ");
        
        let message = "No message";
        let timestamp = "Unknown";
        let files = [];
        
        const ab = id.substr(0, 2);
        const rest = id.substr(2);
        const commitPath = path.join(commitsDir, ab, rest);
        
        if (fs.existsSync(commitPath)) {
            const content = fs.readFileSync(commitPath, "utf-8");
            const clines = content.split(/\r?\n/);
            let inTree = false;
            for (let cline of clines) {
                cline = cline.trim();
                if (cline.startsWith("message ")) message = cline.substring(8);
                if (cline.startsWith("timestamp ")) timestamp = cline.substring(10);
                if (cline === "tree") inTree = true;
                else if (inTree && cline) {
                    files.push(cline.split(" ")[0]);
                }
            }
        }

        nodes.push({
            id,
            parent: parent === "NONE" ? null : parent,
            message,
            timestamp,
            files,
            branches: branchMap[id] || []
        });
    }

    res.json(nodes);
});

// List only tracked files (those present in any commit)
app.get("/list-files", async (req, res) => {
    const commitsDir = path.join(repoPath, ".gitlite", "commits");
    if (!fs.existsSync(commitsDir)) return res.json([]);
    
    const trackedFiles = new Set();
    const dirs = fs.readdirSync(commitsDir);
    for (const dir of dirs) {
        const dirPath = path.join(commitsDir, dir);
        if (!fs.statSync(dirPath).isDirectory()) continue;
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const content = fs.readFileSync(path.join(dirPath, file), "utf-8");
            const clines = content.split(/\r?\n/);
            let inTree = false;
            for (let cline of clines) {
                cline = cline.trim();
                if (cline === "tree") inTree = true;
                else if (inTree && cline) {
                    trackedFiles.add(cline.split(" ")[0]);
                }
            }
        }
    }
    res.json([...trackedFiles].sort());
});

// Read file content
app.get("/file-content", async (req, res) => {
    const { filename } = req.query;
    if (!filename) return res.status(400).send("Filename required");
    try {
        const content = fs.readFileSync(path.join(repoPath, filename), "utf-8");
        res.send(content);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Save file content
app.post("/save-file", async (req, res) => {
    const { filename, content } = req.body;
    if (!filename) return res.status(400).send("Filename required");
    try {
        fs.writeFileSync(path.join(repoPath, filename), content);
        res.send("File saved");
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Branch from a specific commit
app.post("/branch-from", (req, res) => {
    const { name, commitID } = req.body;
    if (!name || !commitID) return res.status(400).send("Name and Commit ID required");
    // gitlite branch <name> <commitID>
    execFile(path.join(repoPath, "gitlite.exe"), ["branch", name, commitID], { cwd: repoPath }, (error, stdout, stderr) => {
        if (error) return res.status(500).send(stderr || stdout);
        res.send(stdout);
    });
});

// Diff with a specific commit
app.get("/diff-commit", (req, res) => {
    const { commitID, filename } = req.query;
    if (!commitID || !filename) return res.status(400).send("Commit ID and Filename required");
    // gitlite diff-commit <commitID> <filename>
    execFile(path.join(repoPath, "gitlite.exe"), ["diff-commit", commitID, filename], { cwd: repoPath }, (error, stdout, stderr) => {
        if (error) return res.status(500).send(stderr || stdout);
        res.send(stdout);
    });
});

/* ---------- SERVER ---------- */
app.listen(5000, () => {
  console.log("GitLite API Server running on port 5000");
});
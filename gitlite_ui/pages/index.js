import { useState, useEffect } from "react";

export default function Home() {
  const [output, setOutput] = useState("System ready. Run a command to begin.");
  const [file, setFile] = useState(null);
  const [commitMsg, setCommitMsg] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const [resCommitID, setResCommitID] = useState("");
  const [resFileName, setResFileName] = useState("");
  
  const [diffLines, setDiffLines] = useState([]);
  const [recentIDs, setRecentIDs] = useState([]);

  const runCommand = async (route, params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `http://localhost:5000/${route}${queryString ? "?" + queryString : ""}`;
      
      setOutput(`> Executing ${route}...`);
      const res = await fetch(url);
      const data = await res.text();
      
      if (!res.ok) {
        setOutput(`Error (${res.status}): ${data}`);
      } else {
        setOutput(data);
        extractCommitIDs(data);
        if (route === "diff-history") {
            parseDiff(data);
        }
      }
    } catch (err) {
      setOutput(`Network Error: ${err.message}. Check if API is running.`);
    }
  };

  const extractCommitIDs = (text) => {
    // Regex to find 40-char SHA-1 hashes
    const matches = text.match(/[a-f0-9]{40}/g);
    if (matches) {
       // Keep unique IDs, max 5, and prepend new ones
       setRecentIDs(prev => {
           const combined = [...new Set([...matches, ...prev])];
           return combined.slice(0, 5);
       });
    }
  };

  const parseDiff = (rawText) => {
    const lines = rawText.split("\n").filter(line => !line.startsWith("Diff check:") && !line.startsWith("Patch"));
    setDiffLines(lines);
  };

  const uploadFile = async () => {
    if (!file) {
      setOutput("Please select a file to stage.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    try {
      setOutput(`Staging ${file.name}...`);
      const res = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.text();
      setOutput(data);
    } catch (err) {
      setOutput(`Upload failed: ${err.message}`);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={contentWrapper}>
        
        <header style={headerStyle}>
          <div style={brandBox}>
            <h1 style={logoStyle}>GitLite<span style={dotStyle}>.</span></h1>
            <p style={taglineStyle}>CORE DASHBOARD</p>
          </div>
          <div style={statusBadge}>
            ACTIVE
          </div>
        </header>

        <main style={gridStyle}>
          
          {/* Workspace Card */}
          <section style={cardStyle}>
            <h2 style={cardTitle}>Workspace</h2>
            <p style={cardDesc}>Stage files and commit snapshots.</p>
            
            <div style={uploadZone}>
              <label style={fileInputLabel}>
                {file ? file.name : "Select File"}
                <input type="file" style={{display:'none'}} onChange={e => setFile(e.target.files[0])} />
              </label>
              <button style={uploadBtn} onClick={uploadFile}>Add</button>
            </div>

            <div style={inputWithBtn}>
              <input 
                style={glassInput} 
                placeholder="Commit message" 
                value={commitMsg}
                onChange={e => setCommitMsg(e.target.value)}
              />
              <button style={primaryBtn} onClick={() => runCommand("commit", { msg: commitMsg })}>Commit</button>
            </div>
          </section>

          {/* History Card */}
          <section style={cardStyle}>
            <h2 style={cardTitle}>History</h2>
            <p style={cardDesc}>Monitor status and log.</p>
            <div style={btnGrid}>
              <button style={secBtn} onClick={() => runCommand("status")}>Status</button>
              <button style={secBtn} onClick={() => runCommand("log")}>Log</button>
              <button style={secBtn} onClick={() => runCommand("graph")}>Graph</button>
              <button style={secBtn} onClick={() => runCommand("gc")}>Clean</button>
            </div>

            <div style={inputWithBtn}>
              <input 
                style={glassInput} 
                placeholder="Search index" 
                value={searchKey}
                onChange={e => setSearchKey(e.target.value)}
              />
              <button style={accentBtn} onClick={() => runCommand("search", { q: searchKey })}>Search</button>
            </div>
          </section>

          {/* Recovery Card */}
          <section style={cardStyle}>
            <h2 style={cardTitle}>Recovery</h2>
            <p style={cardDesc}>Restore surgical file versions.</p>
            <div style={formVertical}>
               <input 
                  style={glassInput} 
                  placeholder="Paste Commit ID" 
                  value={resCommitID}
                  onChange={e => setResCommitID(e.target.value)}
               />
               <input 
                  style={glassInput} 
                  placeholder="Target Filename" 
                  value={resFileName}
                  onChange={e => setResFileName(e.target.value)}
               />
               <div style={{display:'flex', gap: '8px'}}>
                 <button 
                    style={{...warningBtn, flex: 1}} 
                    onClick={() => runCommand("restore", { commitID: resCommitID, file: resFileName })}
                 >
                   Restore
                 </button>
                 <button 
                    style={{...accentBtn, flex: 1}} 
                    onClick={() => runCommand("diff-history", { commitID: resCommitID, file: resFileName })}
                 >
                   Diff
                 </button>
               </div>
            </div>
            
            {recentIDs.length > 0 && (
                <div style={idPickerArea}>
                    <p style={pickerLabel}>Recent IDs (Click to use):</p>
                    <div style={idList}>
                        {recentIDs.map(id => (
                            <button 
                                key={id} 
                                style={idTag} 
                                onClick={() => setResCommitID(id)}
                            >
                                {id.substr(0, 8)}...
                            </button>
                        ))}
                    </div>
                </div>
            )}
          </section>

          {/* Diff Viewer Card */}
          {diffLines.length > 0 && (
            <section style={{...cardStyle, gridColumn: "1 / -1"}}>
              <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
                  <h2 style={cardTitle}>File Changes</h2>
                  <button style={miniBtn} onClick={() => setDiffLines([])}>Hide</button>
              </header>

              <div style={diffContainer}>
                  {diffLines.map((line, i) => {
                      let bgColor = "transparent";
                      let color = "#e2e8f0";
                      if (line.startsWith("+")) { bgColor = "rgba(16, 185, 129, 0.1)"; color = "#10b981"; }
                      else if (line.startsWith("-")) { bgColor = "rgba(239, 68, 68, 0.1)"; color = "#f87171"; }
                      
                      return (
                          <div key={i} style={{...diffLineStyle, backgroundColor: bgColor, color: color}}>
                              <span style={lineNo}>{i + 1}</span>
                              <span style={lineContent}>{line}</span>
                          </div>
                      );
                  })}
              </div>
            </section>
          )}

          {/* Output Card */}
          <section style={consoleCard}>
            <div style={consoleTop}>
              <span style={consoleLabel}>System Console</span>
              <button style={miniBtn} onClick={() => {setOutput("Waiting..."); setDiffLines([]);}}>Clear</button>
            </div>
            <div style={consoleBody}>
               <pre style={preStyle}>{output}</pre>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  padding: "40px 20px",
  background: "#020617",
  color: "#f8fafc",
  fontFamily: "Inter, sans-serif",
  display: "flex",
  justifyContent: "center",
};

const contentWrapper = { width: "100%", maxWidth: "1100px" };

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "40px"
};

const logoStyle = {
  fontSize: "28px",
  fontWeight: "900",
  letterSpacing: "-1px",
  margin: 0
};

const dotStyle = { color: "#3b82f6" };

const taglineStyle = {
  color: "#334155",
  fontSize: "11px",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "2px",
  marginTop: "2px"
};

const statusBadge = {
  background: "rgba(15, 23, 42, 0.8)",
  border: "1px solid #1e293b",
  padding: "4px 12px",
  borderRadius: "6px",
  fontSize: "10px",
  fontWeight: "900",
  color: "#10b981"
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "20px"
};

const cardStyle = {
  background: "#0a0f1e",
  border: "1px solid #1e293b",
  borderRadius: "12px",
  padding: "24px"
};

const cardTitle = { fontSize: "16px", fontWeight: "700", margin: "0 0 4px 0" };

const cardDesc = { fontSize: "12px", color: "#475569", marginBottom: "20px" };

const uploadZone = { display: "flex", gap: "10px", marginBottom: "12px" };

const fileInputLabel = {
  flex: 1,
  background: "#020617",
  border: "1px solid #1e293b",
  borderRadius: "6px",
  padding: "10px",
  fontSize: "11px",
  textAlign: "center",
  cursor: "pointer",
  color: "#64748b"
};

const uploadBtn = {
  background: "#1e293b",
  color: "white",
  border: "1px solid #334155",
  borderRadius: "6px",
  padding: "0 16px",
  fontWeight: "700",
  cursor: "pointer",
  fontSize: "11px"
};

const inputWithBtn = { display: "flex", gap: "8px" };

const glassInput = {
  flex: 1,
  background: "#020617",
  border: "1px solid #1e293b",
  borderRadius: "6px",
  padding: "10px 12px",
  color: "white",
  fontSize: "13px",
  outline: "none"
};

const primaryBtn = {
  background: "#3b82f6",
  color: "white",
  border: "none",
  borderRadius: "6px",
  padding: "0 16px",
  fontWeight: "800",
  cursor: "pointer",
  fontSize: "11px"
};

const secBtn = {
  background: "#0a0f1e",
  color: "#64748b",
  border: "1px solid #1e293b",
  borderRadius: "6px",
  padding: "10px",
  fontSize: "11px",
  fontWeight: "700",
  cursor: "pointer"
};

const accentBtn = {
  background: "#1e293b",
  color: "#94a3b8",
  border: "1px solid #334155",
  borderRadius: "6px",
  padding: "8px 14px",
  fontWeight: "800",
  cursor: "pointer",
  fontSize: "11px"
};

const btnGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
  marginBottom: "16px"
};

const formVertical = { display: "flex", flexDirection: "column", gap: "10px" };

const warningBtn = {
  background: "#ef4444",
  color: "white",
  border: "none",
  borderRadius: "6px",
  padding: "10px",
  fontWeight: "800",
  cursor: "pointer",
  fontSize: "11px"
};

const divider = { height: "1px", background: "#1e293b", margin: "16px 0" };

const ghostBtn = {
  background: "transparent",
  color: "#1e293b",
  border: "none",
  fontSize: "10px",
  fontWeight: "800",
  cursor: "pointer",
  padding: "4px 0"
};

const consoleCard = {
  gridColumn: "1 / -1",
  background: "#000",
  borderRadius: "12px",
  border: "1px solid #1e293b",
  minHeight: "180px",
  display: "flex",
  flexDirection: "column"
};

const consoleTop = {
  background: "#0a0f1e",
  padding: "8px 20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid #1e293b"
};

const consoleLabel = {
  fontSize: "9px",
  textTransform: "uppercase",
  letterSpacing: "1px",
  fontWeight: "800",
  color: "#334155"
};

const miniBtn = {
  background: "transparent",
  border: "1px solid #1e293b",
  color: "#334155",
  borderRadius: "4px",
  fontSize: "8px",
  padding: "2px 6px",
  cursor: "pointer"
};

const consoleBody = { padding: "16px", flex: 1, overflowY: "auto" };

const preStyle = {
  margin: 0,
  color: "#10b981",
  fontFamily: "JetBrains Mono, monospace",
  fontSize: "13px",
  lineHeight: "1.6",
  whiteSpace: "pre-wrap"
};

const idPickerArea = { marginTop: "20px" };
const pickerLabel = { fontSize: "10px", color: "#334155", fontWeight: "800", marginBottom: "8px", textTransform: "uppercase" };
const idList = { display: "flex", gap: "6px", flexWrap: "wrap" };
const idTag = {
  background: "#1e293b",
  color: "#94a3b8",
  border: "1px solid #334155",
  borderRadius: "4px",
  padding: "4px 8px",
  fontSize: "10px",
  cursor: "pointer",
  fontWeight: "600"
};

const diffContainer = {
  background: "#000",
  padding: "16px",
  borderRadius: "8px",
  maxHeight: "300px",
  overflowY: "auto"
};

const diffLineStyle = {
  fontFamily: "JetBrains Mono, monospace",
  fontSize: "12px",
  padding: "1px 4px",
  display: "flex",
  gap: "8px"
};

const lineNo = { color: "#1e293b", width: "20px", textAlign: "right" };
const lineContent = { whiteSpace: "pre-wrap" };
const brandBox = {};
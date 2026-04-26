import { useState, useEffect, useRef } from "react";
import DiffVisualizer from "../components/DiffVisualizer";
import HashVisualizer from "../components/HashVisualizer";
import ObjectStoreVisualizer from "../components/ObjectStoreVisualizer";
import DeltaChainVisualizer from "../components/DeltaChainVisualizer";

export default function Home() {
  const [viewMode, setViewMode] = useState("start"); // 'start' or 'editor'
  const [repoFiles, setRepoFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState("");
  const [fileContent, setFileContent] = useState("");
  
  const [logs, setLogs] = useState([{ type: 'info', text: 'System ready. Connected to local GitLite engine.' }]);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isHashModalOpen,        setIsHashModalOpen]        = useState(false);
  const [isObjectStoreModalOpen, setIsObjectStoreModalOpen] = useState(false);
  const [isDeltaChainModalOpen,  setIsDeltaChainModalOpen]  = useState(false);
  const [hashCommitData,         setHashCommitData]         = useState(null);
  const [graphData, setGraphData] = useState([]);
  const [currentBranch, setCurrentBranch] = useState("main");
  
  const [diffParams, setDiffParams] = useState({ commitID: "" });
  const [diffLines, setDiffLines] = useState([]);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const [isVisualizing, setIsVisualizing] = useState(false);
  const [visualizeOldContent, setVisualizeOldContent] = useState("");
  const [visualizeNewContent, setVisualizeNewContent] = useState("");

  const consoleEndRef = useRef(null);

  useEffect(() => {
    fetchCurrentBranch();
    fetchRepoFiles();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const scrollToBottom = () => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addLog = (text, type = 'info') => {
    setLogs(prev => [...prev, { type, text, time: new Date().toLocaleTimeString() }]);
  };

  const fetchRepoFiles = async () => {
    try {
      const res = await fetch("http://localhost:5000/list-files");
      const data = await res.json();
      setRepoFiles(data);
    } catch(err) {}
  };

  const fetchCurrentBranch = async () => {
    try {
      const res = await fetch("http://localhost:5000/current-branch");
      const branch = await res.text();
      setCurrentBranch(branch);
    } catch(err) {}
  };

  const openFile = async (filename) => {
    if (!filename) return;
    try {
      if (!repoFiles.includes(filename)) {
        await runCommand("checkout", { name: "main" });
      }

      const res = await fetch(`http://localhost:5000/file-content?filename=${filename}`);
      if (res.ok) {
        const content = await res.text();
        setFileContent(content);
        setCurrentFile(filename);
        setViewMode("editor");
        addLog(`Opened file: ${filename}`, 'success');
      } else {
        addLog(`Error opening file: ${await res.text()}`, 'error');
      }
    } catch(err) {
      addLog(`Failed to open: ${err.message}`, 'error');
    }
  };

  const handleUpload = async (e) => {
    const fileObj = e.target.files[0];
    if (!fileObj) return;

    const formData = new FormData();
    formData.append("file", fileObj);
    try {
      const res = await fetch("http://localhost:5000/upload", { method: "POST", body: formData });
      if (res.ok) {
        addLog(`Uploaded and imported ${fileObj.name}`, 'success');
        fetchRepoFiles();
        openFile(fileObj.name);
      } else {
        addLog("Upload failed.", 'error');
      }
    } catch(err) {
      addLog(err.message, 'error');
    }
  };

  const autoSave = async () => {
    await fetch("http://localhost:5000/save-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: currentFile, content: fileContent })
    });
  };

  const runCommand = async (route, params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `http://localhost:5000/${route}${queryString ? "?" + queryString : ""}`;
      const res = await fetch(url);
      const data = await res.text();
      
      const isError = res.status >= 400 || data.toLowerCase().includes("error") || data.toLowerCase().includes("not found");
      addLog(`> gitlite ${route} ${queryString}`, 'info');
      addLog(data, isError ? 'error' : 'success');

      if (route === "checkout" || route === "branch" || route === "branch-from") {
        await fetchCurrentBranch();
        if (isGraphModalOpen) await fetchGraph();
      }
      
      if (route === "diff-history" || route === "diff-commit") {
        const lines = data.split("\n").filter(line => !line.startsWith("Diff check") && !line.startsWith("Patch"));
        setDiffLines(lines);
        setIsDiffModalOpen(true);
      }

      if ((route === "restore" || route === "checkout") && currentFile) {
        const fres = await fetch(`http://localhost:5000/file-content?filename=${currentFile}`);
        if (fres.ok) setFileContent(await fres.text());
      }
    } catch (err) {
      addLog(`Command failed: ${err.message}`, 'error');
    }
  };

  const handleCommit = async () => {
    const msg = prompt("Commit Message:");
    if (!msg) return;
    
    addLog("Saving workspace...", 'info');
    await autoSave();
    await fetch(`http://localhost:5000/add?file=${currentFile}`);
    
    // Grab last commit ID for parent
    let parentId = '0000000000000000000000000000000000000000';
    try {
      const graphRes = await fetch("http://localhost:5000/commit-graph");
      const graph = await graphRes.json();
      const branchRes = await fetch("http://localhost:5000/current-branch");
      const branch = await branchRes.text();
      parentId = graph.find(n => n.branches.includes(branch.trim()))?.id || parentId;
    } catch(e) {}

    const ts = new Date().toISOString().slice(0,19).replace('T',' ');
    const commitData = {
      message: msg,
      parent: parentId,
      timestamp: ts,
      fileName: currentFile,
      fileContent: fileContent,
    };

    await runCommand("commit", { message: msg });
    fetchRepoFiles();

    // Open hash visualizer with real commit data
    setHashCommitData(commitData);
    setIsHashModalOpen(true);
  };

  const handleStatus = async () => {
    addLog("Analyzing workspace status...", 'info');
    await autoSave();
    
    try {
      const branchRes = await fetch("http://localhost:5000/current-branch");
      const branch = await branchRes.text();
      
      const graphRes = await fetch("http://localhost:5000/commit-graph");
      const graph = await graphRes.json();
      const lastCommit = graph.filter(n => n.branches.includes(branch))[0]?.id || "None";

      addLog(`STATUS REPORT:`, 'success');
      addLog(`• Target File: ${currentFile || 'None selected'}`, 'info');
      addLog(`• Active Branch: ${branch}`, 'info');
      addLog(`• Head Commit: ${lastCommit}`, 'info');
      
      // Call actual gitlite status for staged info
      const res = await fetch("http://localhost:5000/status");
      const data = await res.text();
      addLog(`SYSTEM STATUS: ${data}`, 'info');
    } catch (err) {
      addLog(`Status check failed: ${err.message}`, 'error');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const fetchGraph = async () => {
    try {
      const res = await fetch("http://localhost:5000/commit-graph");
      const data = await res.json();
      setGraphData(data);
      setIsGraphModalOpen(true);
    } catch(err) {
      addLog(err.message, 'error');
    }
  };

  // --- RENDERING ---

  if (viewMode === "start") {
    return (
      <div style={startPageStyle}>
        <div style={meshGradient}></div>
        <div style={glassCard}>
          <div style={accentOrb}></div>
          <h1 style={heroTitle}>GITLITE</h1>
          <p style={heroSub}>Professional version control for modern systems</p>
          
          <div style={startActionsGrid}>
            <div style={startActionBlock}>
              <h2 style={blockTitle}>MANAGED FILES</h2>
              <div style={scrollList}>
                {repoFiles.length === 0 ? (
                  <p style={emptyState}>No tracked files found.</p>
                ) : (
                  repoFiles.map(f => (
                    <div key={f} style={fileRow} onClick={() => openFile(f)}>
                      <span style={fileIcon}>📄</span>
                      {f}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={actionDivider}></div>

            <div style={startActionBlock}>
              <h2 style={blockTitle}>EXTERNAL SOURCE</h2>
              <label style={uploadDropzone}>
                <input type="file" style={{display: 'none'}} onChange={handleUpload} />
                <div style={uploadCircle}>
                   <div style={uploadArrow}>↑</div>
                </div>
                <span>Import File</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={workspacePage}>
      <div style={workspaceMesh}></div>
      
      <header style={glassHeader}>
        <div style={headerLeft}>
          <div style={logoCircle} onClick={() => setViewMode("start")}>G</div>
          <span style={headerLogoText} onClick={() => setViewMode("start")}>GitLite Workspace</span>
          <div style={activeFileBadge}>{currentFile}</div>
        </div>
        <div style={branchIndicator}>
          <span style={branchDot}></span>
          {currentBranch}
        </div>
      </header>

      <main style={workspaceContent}>
        <section style={editorWrapper}>
          <div style={editorToolbar}>
             <div style={toolbarLabel}>EDITOR SOURCE</div>
             <div style={toolbarActions}>
               <span style={charCount}>{fileContent.length} chars</span>
             </div>
          </div>
          <textarea 
            style={editorGlass} 
            value={fileContent} 
            onChange={(e) => setFileContent(e.target.value)}
            spellCheck="false"
          />
          <div style={consoleGlass}>
             <div style={consoleHeader}>CONSOLE OUTPUT</div>
             <div style={consoleScroll}>
                {logs.map((log, i) => (
                  <div key={i} style={{
                    ...logItem,
                    color: log.type === 'error' ? '#f87171' : log.type === 'success' ? '#10b981' : '#94a3b8'
                  }}>
                    <span style={logTime}>[{log.time}]</span> {log.text}
                  </div>
                ))}
                <div ref={consoleEndRef} />
             </div>
          </div>
        </section>

        <aside style={sidebarWrapper}>
          <div style={sidebarSection}>
            <h3 style={sidebarTitle}>COMMANDS</h3>
            <div style={sidebarGrid}>
              <button style={actionGlowBtn} onClick={handleStatus}>
                STATUS
              </button>
              <button style={actionGlowBtn} onClick={fetchGraph}>
                GRAPH
              </button>
              <button style={{...actionGlowBtn, background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)'}} onClick={async () => { 
                await autoSave(); 
                runCommand("add", { file: currentFile }); 
              }}>
                STAGE
              </button>
              <button style={actionGlowBtn} onClick={() => setIsDiffModalOpen(true)}>
                DIFF
              </button>
              <button style={{...actionGlowBtn, borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', gridColumn: 'span 2'}} onClick={() => runCommand("gc")}>
                CLEAN
              </button>
            </div>
          </div>

          <div style={sidebarSection}>
            <h3 style={sidebarTitle}>PUBLISH</h3>
            <button style={mainCommitBtn} onClick={handleCommit}>
              COMMIT VERSION
            </button>
            <button style={{...mainCommitBtn, marginTop: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', boxShadow: '0 0 15px rgba(16, 185, 129, 0.1)'}} onClick={() => setIsHashModalOpen(true)}>
              VISUALIZE HASHES
            </button>
            <button style={{...mainCommitBtn, marginTop: '10px', background: 'rgba(88, 166, 255, 0.1)', color: '#58a6ff', border: '1px solid rgba(88, 166, 255, 0.3)', boxShadow: '0 0 15px rgba(88, 166, 255, 0.1)'}} onClick={async () => {
              try {
                const res = await fetch("http://localhost:5000/commit-graph");
                const data = await res.json();
                setGraphData(data);
                setIsObjectStoreModalOpen(true);
              } catch(err) {
                addLog(err.message, 'error');
              }
            }}>
              OBJECT STORE
            </button>
            <button style={{...mainCommitBtn, marginTop: '10px', background: 'rgba(240, 136, 62, 0.1)', color: '#f0883e', border: '1px solid rgba(240, 136, 62, 0.3)', boxShadow: '0 0 15px rgba(240, 136, 62, 0.1)'}} onClick={() => setIsDeltaChainModalOpen(true)}>
              DELTA CHAIN
            </button>
          </div>

          <div style={footerNote}>
            GitLite Core v1.0.5<br/>
            Engine Status: Operational
          </div>
        </aside>
      </main>

      {/* --- MODALS --- */}
      {isGraphModalOpen && (
        <div style={modalBackdrop} onClick={() => setIsGraphModalOpen(false)}>
          <div style={modalWindowLarge} onClick={e => e.stopPropagation()}>
            <header style={modalTitleBar}>
              <span>HISTORY GRAPH: {currentFile}</span>
              <button style={iconBtn} onClick={() => setIsGraphModalOpen(false)}>✕</button>
            </header>
            <div style={graphViewport}>
              <svg width={Math.max(1400, graphData.length * 250)} height={1200} style={{background: 'transparent'}}>
                <defs>
                   <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{stopColor: '#3b82f6', stopOpacity: 0.8}} />
                      <stop offset="100%" style={{stopColor: '#1d4ed8', stopOpacity: 0.4}} />
                   </linearGradient>
                </defs>
                {(() => {
                  const filtered = graphData.filter(n => n.files.includes(currentFile));
                  const nodePos = {};
                  const childrenMap = {};
                  
                  const findVisibleParent = (nodeId) => {
                    const node = graphData.find(n => n.id === nodeId);
                    if (!node || !node.parent || node.parent === "NONE") return null;
                    const parentInFiltered = filtered.find(n => n.id === node.parent);
                    if (parentInFiltered) return parentInFiltered.id;
                    return findVisibleParent(node.parent);
                  };

                  filtered.forEach(node => {
                    const vParent = findVisibleParent(node.id);
                    if (vParent) {
                      if (!childrenMap[vParent]) childrenMap[vParent] = [];
                      childrenMap[vParent].push(node.id);
                    }
                  });

                  const roots = filtered.filter(n => !findVisibleParent(n.id));
                  let maxDepth = 0;
                  const layout = (id, depth, xStart, xEnd) => {
                    const x = (xStart + xEnd) / 2;
                    const y = depth * 260 + 100;
                    if (depth > maxDepth) maxDepth = depth;
                    nodePos[id] = { x, y };
                    const children = childrenMap[id] || [];
                    const step = (xEnd - xStart) / Math.max(1, children.length);
                    children.forEach((cid, i) => layout(cid, depth + 1, xStart + i * step, xStart + (i + 1) * step));
                  };

                  const seg = 1400 / roots.length;
                  roots.forEach((r, i) => layout(r.id, 0, i * seg, (i + 1) * seg));

                  return filtered.map(node => {
                    const pos = nodePos[node.id];
                    const pId = findVisibleParent(node.id);
                    const pPos = pId ? nodePos[pId] : null;
                    if (!pos) return null;

                    return (
                      <g key={node.id}>
                        {pPos && (
                          <path 
                            d={`M ${pPos.x} ${pPos.y + 110} C ${pPos.x} ${pPos.y + 180}, ${pos.x} ${pos.y - 180}, ${pos.x} ${pos.y - 110}`} 
                            stroke="rgba(59, 130, 246, 0.4)" 
                            strokeWidth="3" 
                            fill="none" 
                          />
                        )}
                        <foreignObject x={pos.x - 150} y={pos.y - 110} width="300" height="220">
                          <div style={techNodeCard}>
                             <div style={nodeHeaderTech}>
                               <span style={nodeHashTech}>#{node.id.substr(0, 8)}</span>
                               <span style={nodeTimeTech}>{node.timestamp.split(" ")[1] || node.timestamp}</span>
                             </div>
                             <div style={nodeMsgTech} title={node.msg || node.message}>{node.msg || node.message}</div>
                             <div style={nodeMetaTech}>PARENT: {node.parent ? node.parent.substr(0, 8) : "INITIAL"}</div>
                             <div style={nodeBadgeBox}>
                               {(node.branches || []).map(b => (
                                 <span key={b} style={techBranchTag}>{b}</span>
                               ))}
                               {pos.y === 100 && <span style={techRootPill}>ROOT ORIGIN</span>}
                             </div>
                             <div style={nodeBtnGrid}>
                               <button style={techMiniBtn} onClick={() => copyToClipboard(node.id)}>
                                 {copyFeedback ? "DONE" : "COPY"}
                               </button>
                               <button style={techMiniBtn} onClick={async () => {
                                  const bname = prompt("New Branch Name:");
                                  if (bname) {
                                    fetch("http://localhost:5000/branch-from", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ name: bname, commitID: node.id })
                                    }).then(() => runCommand("checkout", { name: bname }));
                                  }
                               }}>NEW</button>
                               <button style={{...techMiniBtn, background: '#3b82f6', color: 'white', borderColor: '#3b82f6'}} onClick={() => {
                                  runCommand("restore", { commitID: node.id, file: currentFile });
                                  setIsGraphModalOpen(false);
                               }}>RESTORE</button>
                             </div>
                          </div>
                        </foreignObject>
                      </g>
                    );
                  });
                })()}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* --- DIFF MODAL --- */}
      {isDiffModalOpen && (
        <div style={modalBackdrop} onClick={() => setIsDiffModalOpen(false)}>
          <div style={modalWindowSmall} onClick={e => e.stopPropagation()}>
             <header style={modalTitleBar}>
               <span>COMPARE VERSIONS</span>
               <button style={iconBtn} onClick={() => setIsDiffModalOpen(false)}>✕</button>
             </header>
             <div style={{padding: '32px'}}>
               <div style={diffInputGroup}>
                 <input 
                   style={techInput} 
                   placeholder="Enter Reference Commit ID" 
                   value={diffParams.commitID}
                   onChange={e => setDiffParams({ commitID: e.target.value })}
                 />
                 <button style={mainCommitBtn} onClick={() => runCommand("diff-commit", { commitID: diffParams.commitID, filename: currentFile })}>RUN COMPARISON</button>
                 <button 
                   style={{...mainCommitBtn, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', boxShadow: 'none'}} 
                   onClick={async () => {
                     if (!diffParams.commitID) {
                       addLog("Please enter a Commit ID to visualize.", 'error');
                       return;
                     }
                     try {
                       addLog("Preparing visualization data...", 'info');
                       const res = await fetch(`http://localhost:5000/file-content-at-commit?commitID=${diffParams.commitID}&filename=${currentFile}`);
                       if (res.ok) {
                         const oldContent = await res.text();
                         setVisualizeOldContent(oldContent);
                         setVisualizeNewContent(fileContent);
                         setIsVisualizing(true);
                       } else {
                         addLog(`Error fetching base content: ${await res.text()}`, 'error');
                       }
                     } catch(err) {
                       addLog(err.message, 'error');
                     }
                   }}
                 >
                   VISUALIZE
                 </button>
               </div>
               <div style={diffViewScroll}>
                 {diffLines.length === 0 ? (
                   <div style={diffPlaceholder}>Ready for analysis. Enter a reference ID above.</div>
                 ) : (
                   (() => {
                      let oLine = 1;
                      let nLine = 1;
                      return diffLines.map((line, i) => {
                         if (line.startsWith("@@")) {
                            const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
                            if (match) {
                               oLine = parseInt(match[1], 10);
                               nLine = parseInt(match[2], 10);
                            }
                            return <div key={i} style={{ color: '#8b949e', padding: '6px 16px', background: 'rgba(56, 139, 253, 0.15)', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>{line}</div>;
                         }
                         if (line.startsWith("---") || line.startsWith("+++")) {
                            return <div key={i} style={{ color: '#8b949e', padding: '6px 16px', fontWeight: 'bold', borderBottom: '1px solid #30363d', background: '#010409', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>{line}</div>;
                         }

                         let currO = "";
                         let currN = "";
                         if (line.startsWith("+")) {
                            currN = nLine++;
                         } else if (line.startsWith("-")) {
                            currO = oLine++;
                         } else {
                            currO = oLine++;
                            currN = nLine++;
                         }
                         
                         return (
                           <div key={i} style={{
                             display: 'flex',
                             fontFamily: 'JetBrains Mono, monospace',
                             fontSize: '12px',
                             background: line.startsWith("+") ? '#163321' : line.startsWith("-") ? '#3d1619' : 'transparent',
                             color: line.startsWith("+") ? '#46f882' : line.startsWith("-") ? '#ff7b72' : '#c9d1d9',
                             borderLeft: line.startsWith("+") ? '3px solid #2ea043' : line.startsWith("-") ? '3px solid #da3633' : '3px solid transparent',
                             width: '100%',
                             boxSizing: 'border-box'
                           }}>
                             <div style={{ width: '45px', flexShrink: 0, padding: '2px 8px', textAlign: 'right', color: '#6e7681', userSelect: 'none', background: line.startsWith("+") ? '#1e3d29' : line.startsWith("-") ? '#4c1e20' : 'rgba(255,255,255,0.02)' }}>
                               {currO}
                             </div>
                             <div style={{ width: '45px', flexShrink: 0, padding: '2px 8px', textAlign: 'right', color: '#6e7681', userSelect: 'none', background: line.startsWith("+") ? '#1e3d29' : line.startsWith("-") ? '#4c1e20' : 'rgba(255,255,255,0.02)', borderRight: '1px solid #30363d' }}>
                               {currN}
                             </div>
                             <div style={{ padding: '2px 16px', whiteSpace: 'pre', width: '100%' }}>
                               <span style={{ display: 'inline-block', width: '20px', userSelect: 'none' }}>{line.startsWith("+") ? '+' : line.startsWith("-") ? '-' : ' '}</span>
                               {line.startsWith("+") || line.startsWith("-") ? line.substring(1) : line}
                             </div>
                           </div>
                         );
                      });
                   })()
                 )}
               </div>
             </div>
          </div>
        </div>
      )}
      {isVisualizing && (
        <DiffVisualizer 
          oldContent={visualizeOldContent} 
          newContent={visualizeNewContent} 
          onClose={() => setIsVisualizing(false)} 
        />
      )}
      {isHashModalOpen && (
        <HashVisualizer 
          commitData={hashCommitData}
          fileContent={fileContent} 
          fileName={currentFile}
          onClose={() => { setIsHashModalOpen(false); setHashCommitData(null); }} 
        />
      )}
      {isObjectStoreModalOpen && (
        <ObjectStoreVisualizer
          commits={graphData}
          fileName={currentFile}
          onClose={() => setIsObjectStoreModalOpen(false)}
        />
      )}
      {isDeltaChainModalOpen && (
        <DeltaChainVisualizer
          fileContent={fileContent}
          fileName={currentFile}
          onClose={() => setIsDeltaChainModalOpen(false)}
        />
      )}
    </div>
  );
}

// --- STYLING SYSTEM ---

const meshGradient = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, background: "radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)", overflow: "hidden" };
const accentOrb = { position: "absolute", top: "-100px", right: "-100px", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)", filter: "blur(60px)", zIndex: -1 };
const startPageStyle = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", perspective: "1000px" };
const glassCard = { background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(20px)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "40px", padding: "80px", maxWidth: "1000px", width: "90%", boxShadow: "0 50px 100px -20px rgba(0, 0, 0, 0.5)", position: "relative" };
const heroTitle = { fontSize: "64px", fontWeight: "900", color: "white", letterSpacing: "8px", marginBottom: "8px" };
const heroSub = { color: "#64748b", fontSize: "18px", fontWeight: "500", marginBottom: "60px", letterSpacing: "1px" };
const startActionsGrid = { display: "flex", gap: "60px", alignItems: "stretch" };
const startActionBlock = { flex: 1, display: "flex", flexDirection: "column", gap: "24px" };
const blockTitle = { fontSize: "11px", fontWeight: "900", color: "#334155", letterSpacing: "3px", textAlign: "left" };
const scrollList = { background: "rgba(2, 6, 23, 0.5)", borderRadius: "20px", height: "300px", overflowY: "auto", padding: "10px", border: "1px solid rgba(255, 255, 255, 0.03)" };
const fileRow = { padding: "16px 20px", borderRadius: "12px", color: "#94a3b8", fontSize: "14px", fontWeight: "600", cursor: "pointer", transition: "all 0.3s ease", display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" };
const emptyState = { color: "#475569", fontSize: "13px", padding: "10px" };
const fileIcon = { opacity: 0.5 };
const actionDivider = { width: "1px", background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.05), transparent)" };
const uploadDropzone = { flex: 1, border: "2px dashed rgba(59, 130, 246, 0.2)", borderRadius: "20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px", color: "#3b82f6", fontWeight: "800", cursor: "pointer", transition: "all 0.3s ease" };
const uploadCircle = { width: "60px", height: "60px", borderRadius: "50%", background: "rgba(59, 130, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" };
const uploadArrow = { fontSize: "24px" };
const workspacePage = { minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" };
const workspaceMesh = { position: "fixed", inset: 0, zIndex: -1, background: "radial-gradient(circle at top right, #0a0f1e, #020617)" };
const glassHeader = { height: "80px", background: "rgba(10, 15, 30, 0.4)", backdropFilter: "blur(15px)", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 40px", zIndex: 10 };
const headerLeft = { display: "flex", alignItems: "center", gap: "24px" };
const logoCircle = { width: "36px", height: "36px", background: "#3b82f6", color: "white", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", cursor: "pointer" };
const headerLogoText = { color: "white", fontWeight: "800", fontSize: "16px", cursor: "pointer" };
const activeFileBadge = { background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "6px 16px", borderRadius: "8px", fontSize: "12px", color: "#64748b" };
const branchIndicator = { display: "flex", alignItems: "center", gap: "10px", color: "#10b981", fontSize: "13px", fontWeight: "800", background: "rgba(16, 185, 129, 0.05)", padding: "8px 16px", borderRadius: "30px", border: "1px solid rgba(16, 185, 129, 0.2)" };
const branchDot = { width: "8px", height: "8px", background: "#10b981", borderRadius: "50%", boxShadow: "0 0 10px #10b981" };
const workspaceContent = { flex: 1, display: "flex", gap: "40px", padding: "40px" };
const editorWrapper = { flex: 1, display: "flex", flexDirection: "column", gap: "24px" };
const editorToolbar = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const toolbarLabel = { fontSize: "10px", fontWeight: "900", color: "#334155", letterSpacing: "3px" };
const toolbarActions = { display: "flex", gap: "10px", alignItems: "center" };
const charCount = { fontSize: "11px", color: "#475569" };
const editorGlass = { flex: 1, background: "rgba(10, 15, 30, 0.6)", backdropFilter: "blur(10px)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "24px", padding: "40px", color: "white", fontFamily: "JetBrains Mono, monospace", fontSize: "15px", lineHeight: "1.8", outline: "none", resize: "none", boxShadow: "inset 0 10px 40px rgba(0,0,0,0.3)" };
const consoleGlass = { background: "rgba(2, 6, 23, 0.8)", borderRadius: "16px", padding: "20px", border: "1px solid rgba(255, 255, 255, 0.02)", display: "flex", flexDirection: "column", height: "180px", overflow: "hidden" };
const consoleHeader = { fontSize: "9px", fontWeight: "900", color: "#334155", marginBottom: "12px", letterSpacing: "2px", flexShrink: 0 };
const consoleScroll = { flex: 1, overflowY: "auto", fontFamily: "JetBrains Mono, monospace", fontSize: "12px", lineHeight: "1.6" };
const logItem = { marginBottom: "6px", whiteSpace: "pre-wrap" };
const logTime = { color: "#334155", marginRight: "8px", fontSize: "10px" };
const sidebarWrapper = { width: "340px", display: "flex", flexDirection: "column", gap: "40px" };
const sidebarSection = { display: "flex", flexDirection: "column", gap: "20px" };
const sidebarTitle = { fontSize: "11px", fontWeight: "900", color: "#334155", letterSpacing: "3px" };
const sidebarGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" };
const actionGlowBtn = { padding: "20px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "16px", color: "white", fontSize: "12px", fontWeight: "800", cursor: "pointer", transition: "all 0.3s ease" };
const mainCommitBtn = { width: "100%", padding: "24px", background: "linear-gradient(to bottom right, #3b82f6, #1d4ed8)", color: "white", border: "none", borderRadius: "16px", fontSize: "14px", fontWeight: "900", cursor: "pointer", boxShadow: "0 20px 40px -10px rgba(59, 130, 246, 0.4)", transition: "all 0.3s ease" };
const footerNote = { marginTop: "auto", color: "#334155", fontSize: "11px", fontWeight: "600", lineHeight: "1.8" };
const modalBackdrop = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const modalWindowLarge = { background: "#020617", width: "95vw", height: "92vh", borderRadius: "32px", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid rgba(255, 255, 255, 0.05)" };
const modalTitleBar = { padding: "24px 40px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", color: "white", fontSize: "14px", fontWeight: "900", letterSpacing: "2px" };
const iconBtn = { background: "rgba(255,255,255,0.05)", color: "white", border: "none", width: "40px", height: "40px", borderRadius: "10px", cursor: "pointer" };
const graphViewport = { flex: 1, overflow: "auto", background: "radial-gradient(circle at center, #0a0f1e, #020617)" };
const techNodeCard = { background: "rgba(10, 15, 30, 0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: "20px", padding: "24px", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "0 15px 40px rgba(0, 0, 0, 0.6)", height: "100%", boxSizing: "border-box" };
const nodeHeaderTech = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" };
const nodeHashTech = { color: "#3b82f6", fontFamily: "JetBrains Mono, monospace", fontSize: "12px", fontWeight: "800" };
const nodeTimeTech = { color: "#334155", fontSize: "10px", fontWeight: "800" };
const nodeMsgTech = { color: "white", fontSize: "16px", fontWeight: "900", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const nodeMetaTech = { fontSize: "10px", fontWeight: "900", color: "#475569", letterSpacing: "1px" };
const nodeBadgeBox = { display: "flex", gap: "6px" };
const techBranchTag = { background: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "2px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: "900" };
const techRootPill = { background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", border: "1px solid rgba(59, 130, 246, 0.3)", padding: "2px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: "900" };
const nodeBtnGrid = { display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: "8px", marginTop: "auto" };
const techMiniBtn = { padding: "10px 4px", background: "rgba(255, 255, 255, 0.03)", color: "#94a3b8", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", fontSize: "10px", fontWeight: "900", cursor: "pointer", transition: "all 0.2s ease", textAlign: "center" };
const modalWindowSmall = { background: "#0a0f1e", width: "800px", borderRadius: "32px", overflow: "hidden", border: "1px solid rgba(255, 255, 255, 0.05)" };
const diffInputGroup = { display: "flex", gap: "16px", marginBottom: "32px" };
const techInput = { flex: 1, background: "rgba(2, 6, 23, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "16px", padding: "18px 24px", color: "white", outline: "none", fontSize: "14px" };
const diffViewScroll = { height: "450px", overflowY: "auto", background: "#020617", borderRadius: "20px", padding: "20px" };
const diffPlaceholder = { color: "#334155", textAlign: "center", padding: "100px", fontSize: "14px", fontWeight: "600" };
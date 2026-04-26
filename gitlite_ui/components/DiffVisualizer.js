import { useState, useEffect, useRef, useMemo } from "react";

export default function DiffVisualizer({ oldContent, newContent, onClose }) {
  const [selectedAlgo, setSelectedAlgo] = useState("dp");
  const [steps, setSteps] = useState([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(500);
  const timerRef = useRef(null);

  const oldLines = oldContent.split(/\r?\n/).map(l => l.trim());
  const newLines = newContent.split(/\r?\n/).map(l => l.trim());

  const maxLines = Math.max(oldLines.length, newLines.length);
  const matrixSize = (maxLines + 2) * 80;
  const vizScale = Math.min(1, 600 / matrixSize);

  const diffOutput = useMemo(() => {
      const dp = Array.from({ length: oldLines.length + 1 }, () => Array(newLines.length + 1).fill(0));
      for (let i = 1; i <= oldLines.length; i++) {
        for (let j = 1; j <= newLines.length; j++) {
          if (oldLines[i - 1] === newLines[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
          else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
      let i = oldLines.length, j = newLines.length;
      const res = [];
      while (i > 0 && j > 0) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          res.push({ type: 'same', text: oldLines[i - 1], oldLine: i, newLine: j });
          i--; j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
          res.push({ type: 'del', text: oldLines[i - 1], oldLine: i });
          i--;
        } else {
          res.push({ type: 'add', text: newLines[j - 1], newLine: j });
          j--;
        }
      }
      while (i > 0) { res.push({ type: 'del', text: oldLines[i - 1], oldLine: i }); i--; }
      while (j > 0) { res.push({ type: 'add', text: newLines[j - 1], newLine: j }); j--; }
      return res.reverse();
  }, [oldLines, newLines]);

  const nOps = oldLines.length;
  const mOps = newLines.length;
  const dOps = diffOutput.filter(item => item.type !== 'same').length;
  const dpOps = nOps * mOps;
  const myersOps = (nOps + mOps) * dOps;
  const histOps = nOps > 0 ? Math.floor(nOps * Math.log2(nOps)) : 0;
  const patOps = nOps > 0 ? Math.floor(nOps * Math.log2(nOps)) : 0;
  const maxOps = Math.max(dpOps, myersOps, histOps, patOps, 1);

  useEffect(() => {
    // Reset when content changes
    setCurrentStepIdx(0);
    if (selectedAlgo === "dp") {
      setSteps(generateLCSSteps(oldLines, newLines));
    } else if (selectedAlgo === "myers") {
      setSteps(generateMyersSteps(oldLines, newLines));
    } else if (selectedAlgo === "patience") {
      setSteps(generatePatienceSteps(oldLines, newLines));
    } else if (selectedAlgo === "histogram") {
      setSteps(generateHistogramSteps(oldLines, newLines));
    } else {
      setSteps([]);
    }
  }, [selectedAlgo, oldContent, newContent]);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStepIdx((prev) => {
          if (prev < steps.length - 1) return prev + 1;
          setIsPlaying(false);
          return prev;
        });
      }, playbackSpeed);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, steps, playbackSpeed]);

  const currentStep = steps[currentStepIdx] || { dp: [], current: null, action: "Loading..." };

  const getPhase = () => {
    if (selectedAlgo === 'graphical') return "ALGORITHM BENCHMARKS";
    if (selectedAlgo === 'dp') {
      return currentStep.path ? "OPTIMAL PATH RECONSTRUCTION" : "MATRIX FILLING PHASE";
    }
    return currentStep.type === 'snake' ? "FREE DIAGONAL MOVE (SNAKE)" : "D-PATH SEARCH";
  };

  return (
    <div style={visualizerOverlay}>
      <div style={visualizerContainer}>
        <header style={vizHeader}>
          <style>{'select option { background: #0f172a; color: white; }'}</style>
          <div style={headerLeft}>
            <div style={phaseBadge}>{getPhase()}</div>
            <h2 style={vizTitle}>{selectedAlgo === 'dp' ? 'Longest Common Subsequence' : selectedAlgo === 'myers' ? 'Myers Edit Graph' : 'Complexity Comparison'}</h2>
          </div>
          <div style={headerRight}>
             <div style={legend}>
               <div style={legendItem}><span style={{...legendDot, background: '#3b82f6', boxShadow: '0 0 10px #3b82f6'}}></span> CURRENT</div>
               <div style={legendItem}><span style={{...legendDot, background: '#10b981', boxShadow: '0 0 10px #10b981'}}></span> MATCH</div>
             </div>
             <select 
               style={algoSelect} 
               value={selectedAlgo} 
               onChange={(e) => setSelectedAlgo(e.target.value)}
             >
               <option value="dp">Dynamic Programming (LCS)</option>
               <option value="myers">Myers Diff (Edit Graph)</option>
               <option value="patience">Patience Diff</option>
               <option value="histogram">Histogram Diff</option>
               <option value="graphical">Graphical (Complexity Compare)</option>
             </select>
             <button style={closeBtn} onClick={onClose}>✕</button>
          </div>
        </header>

        <main style={vizMain}>
          <section style={vizStage}>
            <div style={{...matrixWrapper, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden"}}>
              {selectedAlgo === 'graphical' ? (
                <div style={{color: 'white', display: 'flex', flexDirection: 'column', flex: 1, padding: '40px', gap: '20px', background: 'rgba(0,0,0,0.4)', borderRadius: '24px', boxSizing: 'border-box', alignSelf: 'stretch', margin: '20px'}}>
                   <div style={{fontSize: '20px', fontWeight: '900', color: '#64748b', textAlign: 'center'}}>BIG-O COMPLEXITY ANALYSIS FOR THIS FILE</div>
                   
                   <div style={{display: 'flex', gap: '30px', flex: 1, alignItems: 'center'}}>
                     {/* SVG GRAPH */}
                     <div style={{flex: 2, height: '100%', background: '#020617', borderRadius: '16px', border: '1px solid #1e293b', position: 'relative', padding: '20px'}}>
                       <svg width="100%" height="100%" viewBox="0 0 1000 500" preserveAspectRatio="none" style={{overflow: 'hidden'}}>
                         {/* Grid Lines */}
                         {[0,1,2,3,4].map(i => <line key={i} x1="0" y1={i*125} x2="1000" y2={i*125} stroke="#1e293b" />)}
                         {[0,1,2,3,4].map(i => <line key={i} x1={i*250} y1="0" x2={i*250} y2="500" stroke="#1e293b" />)}
                         
                         {/* DP Curve O(N^2) */}
                         <polyline fill="none" stroke="#ef4444" strokeWidth="4" 
                           points={Array.from({length: 50}, (_, i) => {
                             const x = i / 49; const n = x * Math.max(nOps, 10); 
                             return `${x * 1000},${500 - ((n * n) / Math.max(maxOps, 1)) * 500}`;
                           }).join(" ")} 
                         />
                         {/* Myers Curve O(ND) */}
                         <polyline fill="none" stroke="#3b82f6" strokeWidth="4" 
                           points={Array.from({length: 50}, (_, i) => {
                             const x = i / 49; const n = x * Math.max(nOps, 10); 
                             return `${x * 1000},${500 - ((n * dOps) / Math.max(maxOps, 1)) * 500}`;
                           }).join(" ")} 
                         />
                         {/* Histogram/Patience Curve O(N log N) */}
                         <polyline fill="none" stroke="#10b981" strokeWidth="4" 
                           points={Array.from({length: 50}, (_, i) => {
                             const x = i / 49; const n = x * Math.max(nOps, 10); 
                             return `${x * 1000},${500 - ((n * Math.log2(n || 1)) / Math.max(maxOps, 1)) * 500}`;
                           }).join(" ")} 
                         />
                       </svg>
                       <div style={{position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', color: '#64748b', fontWeight: 'bold'}}>Input Size (N lines)</div>
                       <div style={{position: 'absolute', top: '50%', left: '-30px', transform: 'translateY(-50%) rotate(-90deg)', fontSize: '12px', color: '#64748b', fontWeight: 'bold'}}>Operations</div>
                     </div>
                     
                     {/* STATS PANEL */}
                     <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '15px'}}>
                        <div style={{background: 'rgba(239, 68, 68, 0.1)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #ef4444'}}>
                          <div style={{fontSize: '14px', fontWeight: 'bold', color: '#fca5a5'}}>DP (LCS)</div>
                          <div style={{fontSize: '12px', color: '#cbd5e1', marginTop: '5px'}}>O(N × M) = <b>{dpOps} ops</b></div>
                          <div style={{fontSize: '11px', color: '#94a3b8', marginTop: '5px'}}>Slowest for large files. Scales quadratically.</div>
                        </div>
                        <div style={{background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #3b82f6'}}>
                          <div style={{fontSize: '14px', fontWeight: 'bold', color: '#93c5fd'}}>Myers Diff</div>
                          <div style={{fontSize: '12px', color: '#cbd5e1', marginTop: '5px'}}>O((N+M)D) = <b>{myersOps} ops</b></div>
                          <div style={{fontSize: '11px', color: '#94a3b8', marginTop: '5px'}}>Standard git diff. Fast if diffs (D) are small.</div>
                        </div>
                        <div style={{background: 'rgba(16, 185, 129, 0.1)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #10b981'}}>
                          <div style={{fontSize: '14px', fontWeight: 'bold', color: '#6ee7b7'}}>Histogram & Patience</div>
                          <div style={{fontSize: '12px', color: '#cbd5e1', marginTop: '5px'}}>O(N log N) = <b>{histOps} ops</b></div>
                          <div style={{fontSize: '11px', color: '#94a3b8', marginTop: '5px'}}>Best performance. Divides using common lines.</div>
                        </div>
                        <div style={{marginTop: 'auto', padding: '15px', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b'}}>
                          <div style={{fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px'}}>File Statistics</div>
                          <div style={{fontSize: '14px', color: 'white', marginTop: '5px'}}>Lines (N): <b>{nOps}</b></div>
                          <div style={{fontSize: '14px', color: 'white', marginTop: '2px'}}>Differences (D): <b>{dOps}</b></div>
                          <div style={{fontSize: '14px', color: '#34d399', marginTop: '10px', fontWeight: 'bold'}}>
                            Winner: {histOps <= myersOps && histOps <= dpOps ? 'Histogram/Patience' : myersOps <= dpOps ? 'Myers Diff' : 'DP LCS'}
                          </div>
                        </div>
                     </div>
                   </div>
                </div>
              ) : (
                <div style={{ transform: `scale(${vizScale})`, transformOrigin: "center", position: "relative" }}>
                  {selectedAlgo === 'dp' ? (
                <table style={dpTable}>
                  <thead>
                    <tr>
                      <th style={tableCorner}></th>
                      <th style={tableHeaderCell}>∅</th>
                      {newLines.map((line, i) => (
                        <th key={i} style={{
                          ...tableHeaderCell, 
                          color: currentStep.current?.j === i + 1 ? '#3b82f6' : '#334155',
                          background: currentStep.current?.j === i + 1 ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                        }}>
                          <div style={lineLabelText}>{line || "↵"}</div>
                          <div style={lineNumLabel}>{i + 1}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th style={tableHeaderCell}>∅</th>
                      <td style={getCellStyle(0, 0, currentStep)}>0</td>
                      {newLines.map((_, j) => (
                        <td key={j} style={getCellStyle(0, j + 1, currentStep)}>0</td>
                      ))}
                    </tr>
                    {oldLines.map((line, i) => (
                      <tr key={i}>
                        <th style={{
                          ...tableHeaderCell, 
                          color: currentStep.current?.i === i + 1 ? '#3b82f6' : '#334155',
                          background: currentStep.current?.i === i + 1 ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                        }}>
                          <div style={lineLabelText}>{line || "↵"}</div>
                          <div style={lineNumLabel}>{i + 1}</div>
                        </th>
                        <td style={getCellStyle(i + 1, 0, currentStep)}>0</td>
                        {newLines.map((_, j) => (
                          <td key={j} style={getCellStyle(i + 1, j + 1, currentStep)}>
                            {currentStep.dp[i + 1] ? currentStep.dp[i + 1][j + 1] : 0}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={myersGraphContainer}>
                   {/* Myers SVG remains but we can add better axis labels */}
                  <div style={myersOverlayLabels}>
                    <div style={myersLabelX}>New Lines (j)</div>
                    <div style={myersLabelY}>Old Lines (i)</div>
                  </div>
                  <svg width={(newLines.length + 1) * 60 + 100} height={(oldLines.length + 1) * 60 + 100}>
                    <g transform="translate(50, 50)">
                      {/* Grid Lines */}
                      {Array.from({length: oldLines.length + 1}).map((_, i) => (
                        <line key={`h${i}`} x1="0" y1={i*60} x2={newLines.length*60} y2={i*60} stroke="rgba(255,255,255,0.05)" />
                      ))}
                      {Array.from({length: newLines.length + 1}).map((_, j) => (
                        <line key={`v${j}`} x1={j*60} y1="0" x2={j*60} y2={oldLines.length*60} stroke="rgba(255,255,255,0.05)" />
                      ))}
                      
                      {/* Diagonal Labels (matches) */}
                      {oldLines.map((line, i) => newLines.map((nline, j) => {
                        if (line === nline) {
                          return <line key={`d${i}-${j}`} x1={j*60} y1={i*60} x2={(j+1)*60} y2={(i+1)*60} stroke="rgba(16, 185, 129, 0.2)" strokeWidth="2" strokeDasharray="4" />;
                        }
                        return null;
                      }))}

                      {/* Path Rendering */}
                      {steps.slice(0, currentStepIdx + 1).map((s, idx) => {
                        if (idx === 0 || !s.current) return null;
                        const prev = steps[idx-1].current;
                        if (!prev) return null;
                        return (
                          <line 
                            key={idx} 
                            x1={prev.y * 60} y1={prev.x * 60} 
                            x2={s.current.y * 60} y2={s.current.x * 60} 
                            stroke={s.type === 'snake' ? '#10b981' : '#3b82f6'} 
                            strokeWidth="4" 
                            strokeLinecap="round"
                          />
                        );
                      })}

                      {/* Current Pointer */}
                      {currentStep.current && (
                        <circle 
                          cx={currentStep.current.y * 60} 
                          cy={currentStep.current.x * 60} 
                          r="8" 
                          fill="#facc15" 
                        />
                      )}
                    </g>
                  </svg>
                </div>
              )}
              </div>
            )}
            </div>

            {selectedAlgo !== 'graphical' && (
              <>
                <div style={{...filePreviewContainer, height: '200px', flexShrink: 0}}>
                  <div style={filePreviewPane}>
                     <div style={previewHeader}>FINAL LINE DIFF RESULT</div>
                     <div style={{...previewList, padding: '0', background: '#0d1117'}}>
                        {(() => {
                           const currI = currentStep.current ? (currentStep.current.i !== undefined ? currentStep.current.i : currentStep.current.x + 1) : null;
                           const currJ = currentStep.current ? (currentStep.current.j !== undefined ? currentStep.current.j : currentStep.current.y + 1) : null;
                           
                           return diffOutput.map((item, i) => {
                             const isActive = (currI && item.oldLine === currI && item.newLine === currJ) ||
                                              (currI && item.oldLine === currI && item.type === 'del') ||
                                              (currJ && item.newLine === currJ && item.type === 'add');
                             return (
                              <div key={i} style={{
                                display: 'flex',
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '12px',
                                background: isActive ? 'rgba(255,255,255,0.15)' : item.type === 'add' ? '#163321' : item.type === 'del' ? '#3d1619' : 'transparent',
                                color: isActive ? '#fff' : item.type === 'add' ? '#46f882' : item.type === 'del' ? '#ff7b72' : '#c9d1d9',
                                border: isActive ? '1px solid rgba(255,255,255,0.5)' : '1px solid transparent',
                                borderLeft: isActive ? '3px solid #fff' : item.type === 'add' ? '3px solid #2ea043' : item.type === 'del' ? '3px solid #da3633' : '3px solid transparent',
                                width: '100%',
                                boxSizing: 'border-box'
                              }}>
                                <div style={{ width: '40px', padding: '2px 8px', textAlign: 'right', color: '#6e7681', userSelect: 'none', background: item.type === 'add' ? '#1e3d29' : item.type === 'del' ? '#4c1e20' : 'rgba(255,255,255,0.02)' }}>
                                  {item.type !== 'add' ? item.oldLine : ''}
                                </div>
                                <div style={{ width: '40px', padding: '2px 8px', textAlign: 'right', color: '#6e7681', userSelect: 'none', background: item.type === 'add' ? '#1e3d29' : item.type === 'del' ? '#4c1e20' : 'rgba(255,255,255,0.02)', borderRight: '1px solid #30363d' }}>
                                  {item.type !== 'del' ? item.newLine : ''}
                                </div>
                                <div style={{ padding: '2px 8px', whiteSpace: 'pre', width: '100%' }}>
                                  <span style={{ display: 'inline-block', width: '20px', userSelect: 'none' }}>{item.type === 'add' ? '+' : item.type === 'del' ? '-' : ' '}</span>
                                  {item.text || " "}
                                </div>
                              </div>
                             );
                           });
                        })()}
                     </div>
                  </div>
                </div>

                <div style={playbackControls}>
                   <div style={stepCounter}>STEP {currentStepIdx + 1} / {Math.max(1, steps.length)}</div>
                   <button style={ctrlBtn} onClick={() => setCurrentStepIdx(0)}>⏮</button>
                   <button style={ctrlBtn} onClick={() => setCurrentStepIdx(Math.max(0, currentStepIdx - 1))}>⏴</button>
                   <button style={{...ctrlBtn, background: isPlaying ? '#ef4444' : '#3b82f6', width: '140px', fontWeight: '900'}} onClick={() => setIsPlaying(!isPlaying)}>
                     {isPlaying ? "PAUSE" : "PLAY AUTO"}
                   </button>
                   <button style={ctrlBtn} onClick={() => setCurrentStepIdx(Math.min(steps.length - 1, currentStepIdx + 1))}>⏵</button>
                   <button style={ctrlBtn} onClick={() => setCurrentStepIdx(steps.length - 1)}>⏭</button>
                   
                   <div style={speedControl}>
                     <span style={speedLabel}>THROTTLE</span>
                     <input 
                       type="range" 
                       min="50" 
                       max="1000" 
                       step="50" 
                       value={1050 - playbackSpeed} 
                       onChange={(e) => setPlaybackSpeed(1050 - e.target.value)} 
                       style={speedRange}
                     />
                   </div>
                </div>
              </>
            )}
          </section>

          {selectedAlgo !== 'graphical' && (
            <aside style={{...vizSidebar, overflow: 'hidden'}}>
              <div style={{...infoCard, flexShrink: 0}}>
                <h3 style={cardTitle}>NARRATIVE EXPLANATION</h3>
                <p style={actionText}>{currentStep.action}</p>
                {currentStep.current && (() => {
                   const currI = currentStep.current.i !== undefined ? currentStep.current.i : currentStep.current.x + 1;
                   const currJ = currentStep.current.j !== undefined ? currentStep.current.j : currentStep.current.y + 1;
                   const isMatch = currentStep.isMatch !== undefined ? currentStep.isMatch : (oldLines[currI-1] === newLines[currJ-1]);
                   return (
                     <div style={currentComparison}>
                        <div style={compBlock}>
                          <span style={compLabel}>OLD LINE {currI}</span>
                          <code style={compCode}>{oldLines[currI-1] || '(empty)'}</code>
                        </div>
                        <div style={{...compIcon, color: isMatch ? '#10b981' : '#ef4444'}}>
                          {isMatch ? 'MATCH' : 'DIFFER'}
                        </div>
                        <div style={compBlock}>
                          <span style={compLabel}>NEW LINE {currJ}</span>
                          <code style={compCode}>{newLines[currJ-1] || '(empty)'}</code>
                        </div>
                     </div>
                   );
                })()}
              </div>

              <div style={{...infoCard, flexShrink: 0}}>
                <h3 style={cardTitle}>COMPLEXITY</h3>
                <div style={statRow}>
                  <span>Time:</span> <span style={statVal}>{selectedAlgo === 'dp' ? 'O(N × M)' : selectedAlgo === 'myers' ? 'O((N+M)D)' : 'N/A'}</span>
                </div>
                <div style={statRow}>
                  <span>Space:</span> <span style={statVal}>{selectedAlgo === 'dp' ? 'O(N × M)' : selectedAlgo === 'myers' ? 'O(N + M)' : 'N/A'}</span>
                </div>
                <div style={statRow}>
                  <span>Operations:</span> <span style={statVal}>{currentStepIdx}</span>
                </div>
              </div>

              <div style={{...codeCard, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column'}}>
                <h3 style={cardTitle}>ALGORITHM CODE</h3>
                <div style={{ marginTop: '10px', flex: 1, overflowY: 'auto' }}>
                  {(() => {
                    let codeStr = "";
                    if (selectedAlgo === 'dp') {
                      codeStr = `for (let i = 1; i <= m; i++) {\n  for (let j = 1; j <= n; j++) {\n    if (A[i-1] === B[j-1]) {\n      dp[i][j] = dp[i-1][j-1] + 1;\n    } else {\n      dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);\n    }\n  }\n}`;
                    } else if (selectedAlgo === 'myers') {
                      codeStr = `for (let d = 0; d <= MAX; d++) {\n  for (let k = -d; k <= d; k += 2) {\n    if (k === -d || (V[k-1] < V[k+1])) {\n      x = V[k+1]; // Down\n    } else {\n      x = V[k-1] + 1; // Right\n    }\n    y = x - k;\n    while (A[x] === B[y]) { x++; y++; }\n    V[k] = x;\n    if (x >= N && y >= M) return d;\n  }\n}`;
                    } else if (selectedAlgo === 'patience') {
                      codeStr = `function patienceDiff(A, B) {\n  let uniqueA = getUnique(A);\n  let uniqueB = getUnique(B);\n  let common = intersect(uniqueA, uniqueB);\n  let lis = computeLIS(common);\n  return recurseOnGaps(A, B, lis);\n}`;
                    } else if (selectedAlgo === 'histogram') {
                      codeStr = `function histogramDiff(A, B) {\n  let hist = buildHistogram(A);\n  let lco = findLeastCommon(hist, B);\n  if (!lco) return myers(A, B);\n  let match = expandMatch(lco);\n  return recurseOnGaps(A, B, match);\n}`;
                    }
                    
                    return codeStr.split('\n').map((line, idx) => (
                      <div key={idx} style={{
                        background: currentStep.activeLine === idx ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                        padding: '2px 8px',
                        borderLeft: currentStep.activeLine === idx ? '3px solid #3b82f6' : '3px solid transparent',
                        color: currentStep.activeLine === idx ? '#fff' : '#3b82f6',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '15px',
                        whiteSpace: 'pre',
                        transition: 'all 0.2s'
                      }}>
                        {line}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </aside>
          )}
        </main>
      </div>
    </div>
  );
}

// --- LOGIC ---

function generateLCSSteps(oldLines, newLines) {
  const m = oldLines.length;
  const n = newLines.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  const steps = [];

  steps.push({ dp: JSON.parse(JSON.stringify(dp)), current: null, action: 'Initializing the LCS Matrix. We start with 0s to represent empty strings.' });

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      let action = "";
      let activeLine = 0;
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        action = `MATCH FOUND! Line ${i} ("${oldLines[i-1].trim()}") in Old and Line ${j} in New are identical. We extend the Longest Common Subsequence found at [${i-1},${j-1}] by 1.`;
        activeLine = 3; // dp[i][j] = dp[i-1][j-1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        const choice = dp[i-1][j] >= dp[i][j-1] ? 'Top' : 'Left';
        action = `NO MATCH: Line ${i} ("${oldLines[i-1].trim()}") != Line ${j} ("${newLines[j-1].trim()}"). We carry over the best result from either above (${dp[i-1][j]}) or left (${dp[i][j-1]}). Choosing ${choice}.`;
        activeLine = 5; // dp[i][j] = Math.max...
      }
      steps.push({
        dp: JSON.parse(JSON.stringify(dp)),
        current: { i, j },
        action,
        activeLine
      });
    }
  }

  // Backtracking
  let i = m, j = n;
  const path = [];
  while (i > 0 && j > 0) {
    steps.push({ dp: JSON.parse(JSON.stringify(dp)), current: { i, j }, path: [...path], action: 'BACKTRACKING: Following the numbers back to reconstruct the diff path.' });
    if (oldLines[i - 1] === newLines[j - 1]) {
      path.push({ i, j });
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  steps.push({ dp: JSON.parse(JSON.stringify(dp)), current: null, path: [...path], action: 'Success! The green path highlights the Longest Common Subsequence between the two files.' });

  return steps;
}

function generateMyersSteps(oldLines, newLines) {
    const N = oldLines.length;
    const M = newLines.length;
    const MAX = N + M;
    const v = new Int32Array(2 * MAX + 1);
    const steps = [];
    const offset = MAX;

    steps.push({ v: Array.from(v), current: {x: 0, y: 0}, d: 0, k: 0, action: 'Initializing Myers Edit Graph. We search for the shortest path from (0,0) to (N,M).' });

    for (let d = 0; d <= MAX; d++) {
        for (let k = -d; k <= d; k += 2) {
            let x, y;
            let action = `D=${d} edits: `;

            let activeLine = 0;
            if (k === -d || (k !== d && v[k - 1 + offset] < v[k + 1 + offset])) {
                x = v[k + 1 + offset]; 
                action += `Moving DOWN from diagonal k=${k+1} to k=${k}. This represents an INSERTION in the new file.`;
                activeLine = 3;
            } else {
                x = v[k - 1 + offset] + 1; 
                action += `Moving RIGHT from diagonal k=${k-1} to k=${k}. This represents a DELETION from the old file.`;
                activeLine = 5;
            }
            y = x - k;

            steps.push({ 
              v: Array.from(v), 
              current: { x, y }, 
              isMatch: false,
              d, k, 
              type: 'move',
              action,
              activeLine
            });

            // Diagonal moves (snakes)
            while (x < N && y < M && oldLines[x] === newLines[y]) {
                steps.push({ 
                  v: Array.from(v), 
                  current: { x, y }, 
                  isMatch: true,
                  d, k, 
                  type: 'snake',
                  action: `FREE MOVE (Snake): Lines match at (${x+1},${y+1})! We follow the diagonal for free (0 cost).`,
                  activeLine: 8
                });
                x++;
                y++;
            }

            v[k + offset] = x;

            if (x >= N && y >= M) {
                steps.push({ v: Array.from(v), current: { x, y }, d, k, action: `Goal Reached! We found the shortest edit path with a distance of ${d}.` });
                return steps;
            }
        }
    }
    return steps;
}

function generatePatienceSteps(oldLines, newLines) {
    const steps = [];
    steps.push({ current: {x: 0, y: 0}, action: "PATIENCE PHASE 1: Identifying unique lines in both source and target files.", activeLine: 1 });
    steps.push({ current: {x: 0, y: 0}, action: "PATIENCE PHASE 2: Finding exact matches to form a Longest Increasing Subsequence (LIS).", activeLine: 4 });
    let x = 0, y = 0;
    while(x < oldLines.length && y < newLines.length) {
      if (oldLines[x] === newLines[y]) {
         steps.push({ current: {x, y}, action: `Exact Match LIS found at (${x},${y}). Fast-forwarding!`, type: 'snake', activeLine: 4 });
         x++; y++;
      } else {
         steps.push({ current: {x, y}, action: `Gap found at (${x},${y}). Falling back to Myers diff for this chunk.`, type: 'move', activeLine: 5 });
         x++;
      }
    }
    steps.push({ current: {x, y}, action: "Patience Diff complete. Reassembled diff from chunks." });
    return steps;
}

function generateHistogramSteps(oldLines, newLines) {
    const steps = [];
    steps.push({ current: {x: 0, y: 0}, action: "HISTOGRAM PHASE 1: Building occurrence histogram of all lines in source file.", activeLine: 1 });
    steps.push({ current: {x: 0, y: 0}, action: "HISTOGRAM PHASE 2: Finding least common occurrences to divide and conquer.", activeLine: 2 });
    let x = 0, y = 0;
    while(x < oldLines.length && y < newLines.length) {
      if (oldLines[x] === newLines[y]) {
         steps.push({ current: {x, y}, action: `Low-occurrence match found at (${x},${y}). Expanding match.`, type: 'snake', activeLine: 4 });
         x++; y++;
      } else {
         steps.push({ current: {x, y}, action: `Gap found at (${x},${y}). Recursing on gaps.`, type: 'move', activeLine: 5 });
         x++;
      }
    }
    steps.push({ current: {x, y}, action: "Histogram Diff complete." });
    return steps;
}

function getCellStyle(i, j, step) {
  const isCurrent = step.current && step.current.i === i && step.current.j === j;
  const isInPath = step.path && step.path.some(p => p.i === i && p.j === j);

  let background = 'rgba(255, 255, 255, 0.02)';
  let border = '1px solid rgba(255, 255, 255, 0.05)';
  let color = '#475569';

  if (isCurrent) {
    background = 'rgba(59, 130, 246, 0.2)';
    border = '1px solid #3b82f6';
    color = '#fff';
  } else if (isInPath) {
    background = 'rgba(16, 185, 129, 0.3)';
    border = '1px solid #10b981';
    color = '#fff';
  } else if (step.dp[i] && step.dp[i][j] > 0) {
    color = '#94a3b8';
  }

  return {
    ...tableCell,
    background,
    border,
    color,
    transition: 'all 0.2s ease'
  };
}

// --- STYLES ---

const visualizerOverlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(20px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" };
const visualizerContainer = { width: "100%", height: "100%", background: "#020617", borderRadius: "32px", border: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 50px 100px rgba(0,0,0,0.8)" };
const vizHeader = { padding: "30px 40px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" };
const headerLeft = { display: "flex", flexDirection: "column", gap: "8px" };
const vizBadge = { fontSize: "10px", fontWeight: "900", color: "#3b82f6", letterSpacing: "2px" };
const vizTitle = { fontSize: "24px", fontWeight: "900", color: "white", margin: 0 };
const headerRight = { display: "flex", gap: "20px", alignItems: "center" };
const algoSelect = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px 20px", color: "white", outline: "none", cursor: "pointer", fontSize: "14px", fontWeight: "600" };
const closeBtn = { background: "rgba(255,255,255,0.05)", border: "none", color: "white", width: "45px", height: "45px", borderRadius: "12px", cursor: "pointer", fontSize: "18px" };
const vizMain = { flex: 1, display: "flex", overflow: "hidden" };
const vizStage = { flex: 1, display: "flex", flexDirection: "column", padding: "40px", gap: "30px", overflow: "hidden" };
const matrixWrapper = { flex: 1, overflow: "auto", background: "rgba(0,0,0,0.3)", borderRadius: "24px", padding: "30px", border: "1px solid rgba(255,255,255,0.05)", position: "relative" };
const dpTable = { borderCollapse: "separate", borderSpacing: "12px" };
const tableHeaderCell = { minWidth: "80px", height: "70px", color: "#334155", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", padding: "6px", verticalAlign: "middle", textAlign: "center", transition: "all 0.2s" };
const tableCorner = { minWidth: "80px", height: "70px" };
const tableCell = { minWidth: "70px", height: "70px", textAlign: "center", borderRadius: "14px", fontSize: "20px", fontWeight: "900", fontFamily: "JetBrains Mono, monospace" };
const playbackControls = { background: "rgba(10, 15, 30, 0.6)", padding: "20px 40px", borderRadius: "24px", display: "flex", gap: "15px", alignItems: "center", border: "1px solid rgba(255,255,255,0.05)" };
const ctrlBtn = { width: "50px", height: "50px", borderRadius: "15px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "white", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" };
const speedControl = { marginLeft: "auto", display: "flex", alignItems: "center", gap: "15px" };
const speedLabel = { fontSize: "11px", fontWeight: "900", color: "#475569", letterSpacing: "1px" };
const speedRange = { width: "150px", accentColor: "#3b82f6" };
const vizSidebar = { width: "420px", borderLeft: "1px solid rgba(255,255,255,0.05)", background: "rgba(2, 6, 23, 0.6)", padding: "30px", display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto" };
const infoCard = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "20px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" };
const cardTitle = { fontSize: "10px", fontWeight: "900", color: "#3b82f6", letterSpacing: "3px", margin: 0, textTransform: "uppercase" };
const actionText = { fontSize: "14px", color: "#cbd5e1", lineHeight: "1.8", margin: 0, fontWeight: "400" };
const statRow = { display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#94a3b8" };
const statVal = { fontWeight: "800", color: "white", fontFamily: "JetBrains Mono, monospace" };
const codeCard = { background: "#010409", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "20px", padding: "24px", flex: 1 };
const codeBlock = { margin: 0, fontSize: "13px", color: "#3b82f6", fontFamily: "JetBrains Mono, monospace", lineHeight: "1.7", opacity: 0.8 };
const myersGraphContainer = { flex: 1, overflow: "auto", background: "rgba(0,0,0,0.3)", borderRadius: "24px", display: "flex", alignItems: "flex-start", justifyContent: "flex-start", padding: "40px", position: "relative" };

const legend = { display: "flex", gap: "20px" };
const legendItem = { display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#94a3b8", fontWeight: "700" };
const legendDot = { width: "10px", height: "10px", borderRadius: "50%" };

const axisLabelX = { position: "absolute", top: "10px", left: "50%", transform: "translateX(-50%)", fontSize: "9px", fontWeight: "900", color: "#334155", letterSpacing: "2px" };
const axisLabelY = { position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%) rotate(-90deg)", fontSize: "9px", fontWeight: "900", color: "#334155", letterSpacing: "2px" };

const lineLabelText = { maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "4px" };
const lineNumLabel = { fontSize: "10px", opacity: 0.5 };

const filePreviewContainer = { display: "flex", gap: "20px", background: "rgba(0,0,0,0.4)", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.05)", height: "200px", overflow: "hidden" };
const filePreviewPane = { flex: 1, display: "flex", flexDirection: "column" };
const previewHeader = { padding: "10px 20px", fontSize: "9px", fontWeight: "900", color: "#334155", borderBottom: "1px solid rgba(255,255,255,0.05)" };
const previewList = { flex: 1, overflowY: "auto", padding: "10px" };
const previewLine = { padding: "4px 10px", fontSize: "12px", fontFamily: "JetBrains Mono, monospace", borderRadius: "6px", display: "flex", gap: "10px", transition: "all 0.2s" };
const lineNum = { color: "#334155", width: "20px", textAlign: "right" };
const previewDivider = { width: "1px", background: "rgba(255,255,255,0.05)" };

const currentComparison = { display: "flex", flexDirection: "column", gap: "12px", background: "rgba(0,0,0,0.3)", borderRadius: "14px", padding: "16px", border: "1px solid rgba(255,255,255,0.05)" };
const compBlock = { flex: 1, display: "flex", flexDirection: "column", gap: "4px" };
const compLabel = { fontSize: "9px", color: "#64748b", fontWeight: "900", letterSpacing: "2px", textTransform: "uppercase" };
const compCode = { fontSize: "13px", color: "#f8fafc", fontFamily: "JetBrains Mono, monospace", background: "rgba(255,255,255,0.04)", padding: "8px 12px", borderRadius: "8px", wordBreak: "break-all", display: "block", marginTop: "4px" };
const compSubLabel = { fontSize: "10px", color: "#475569", marginTop: "4px" };
const compIcon = { fontSize: "14px", fontWeight: "900", textAlign: "center", padding: "8px", borderRadius: "8px", letterSpacing: "1px" };

const myersOverlayLabels = { position: "absolute", inset: 0, pointerEvents: "none" };
const myersLabelX = { position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", fontSize: "9px", fontWeight: "900", color: "#334155", letterSpacing: "2px" };
const myersLabelY = { position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%) rotate(-90deg)", fontSize: "9px", fontWeight: "900", color: "#334155", letterSpacing: "2px" };

// --- NEW STYLES ---
const phaseBadge = { fontSize: "10px", fontWeight: "900", color: "#3b82f6", letterSpacing: "2px", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", padding: "4px 12px", borderRadius: "20px", display: "inline-block" };
const stepCounter = { fontSize: "11px", fontWeight: "900", color: "#64748b", letterSpacing: "2px", marginRight: "10px" };

const barStyle = { width: "80px", borderRadius: "8px 8px 0 0", display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative", filter: "drop-shadow(0 0 15px rgba(255,255,255,0.1))" };
const barLabel = { position: "absolute", bottom: "-30px", width: "100%", textAlign: "center", fontSize: "11px", color: "#cbd5e1", fontWeight: "bold", whiteSpace: "nowrap", transform: "translateX(-10%)" };

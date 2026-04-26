import React, { useState, useEffect, useRef } from 'react';

const S = {
  overlay: { position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',backdropFilter:'blur(14px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Inter,sans-serif' },
  box:     { width:'98vw',height:'96vh',background:'#0d1117',border:'1px solid #30363d',borderRadius:'20px',display:'flex',flexDirection:'column',overflow:'hidden' },
  hdr:     { padding:'26px 48px',borderBottom:'1px solid #30363d',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#010409',flexShrink:0 },
  body:    { flex:1,padding:'48px 60px',overflowY:'auto',display:'flex',flexDirection:'column',gap:'44px' },
  card:    (b='#30363d',bg='#161b22')=>({ background:bg,border:`1px solid ${b}`,borderRadius:'16px',padding:'32px' }),
  mono:    { fontFamily:'JetBrains Mono,monospace',fontSize:'14px' },
  close:   { background:'transparent',border:'none',color:'#8b949e',fontSize:'26px',cursor:'pointer' },
};

// Deterministic fake hash from string
function fakeHash(s, len=8) {
  let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h)+s.charCodeAt(i); return Math.abs(h).toString(16).padStart(len,'0').slice(0,len);
}

export default function ObjectStoreVisualizer({ commits=[], fileName='', onClose }) {
  const [step, setStep]   = useState(0);
  const [saved, setSaved] = useState(0);

  // Build demo data from real commits or fallback
  const demo = commits.length >= 1 ? buildFromCommits(commits, fileName) : buildDemo();

  const { nodes, arrows, totalNaive, totalActual } = demo;
  const pct = totalActual>0 ? Math.round((1 - totalActual/totalNaive)*100) : 0;

  useEffect(()=>{
    const t = setTimeout(()=>{ if(step < arrows.length) setStep(s=>s+1); }, 700);
    return ()=>clearTimeout(t);
  }, [step, arrows.length]);

  return (
    <div style={S.overlay}>
      <div style={S.box}>
        <header style={S.hdr}>
          <div>
            <div style={{fontSize:'26px',fontWeight:'900',color:'#f0f6fc'}}>Object Store Visualizer</div>
            <div style={{fontSize:'16px',color:'#8b949e',marginTop:'4px'}}>How GitLite deduplicates content across commits</div>
          </div>
          <button style={S.close} onClick={onClose}>x</button>
        </header>
        <main style={S.body}>
          {/* Header explanation */}
          <div style={{display:'flex',gap:'32px'}}>
            <div style={{...S.card('#30363d','#0d1117'),flex:1,textAlign:'center'}}>
              <div style={{fontSize:'14px',color:'#8b949e',marginBottom:'8px',fontWeight:'700',letterSpacing:'2px'}}>WHAT YOU THINK IS STORED</div>
              <div style={{fontSize:'42px',fontWeight:'900',color:'#ef4444'}}>{totalNaive}</div>
              <div style={{color:'#8b949e',fontSize:'14px',marginTop:'4px'}}>total file copies</div>
            </div>
            <div style={{...S.card('#30363d','#0d1117'),flex:1,textAlign:'center'}}>
              <div style={{fontSize:'14px',color:'#8b949e',marginBottom:'8px',fontWeight:'700',letterSpacing:'2px'}}>WHAT ACTUALLY IS STORED</div>
              <div style={{fontSize:'42px',fontWeight:'900',color:'#3fb950'}}>{totalActual}</div>
              <div style={{color:'#8b949e',fontSize:'14px',marginTop:'4px'}}>unique blob objects</div>
            </div>
            <div style={{...S.card('rgba(63,185,80,0.4)','rgba(63,185,80,0.08)'),flex:1,textAlign:'center'}}>
              <div style={{fontSize:'14px',color:'#8b949e',marginBottom:'8px',fontWeight:'700',letterSpacing:'2px'}}>STORAGE SAVED</div>
              <div style={{fontSize:'42px',fontWeight:'900',color:'#3fb950'}}>{pct}%</div>
              <div style={{color:'#8b949e',fontSize:'14px',marginTop:'4px'}}>via content addressing</div>
            </div>
          </div>

          {/* Main diagram */}
          <div style={{display:'flex',gap:'0',alignItems:'stretch',position:'relative'}}>
            {/* Commits col */}
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:'16px'}}>
              <div style={{fontSize:'13px',color:'#64748b',fontWeight:'700',letterSpacing:'2px',marginBottom:'8px'}}>COMMITS</div>
              {nodes.commits.map((c,ci)=>(
                <div key={ci} style={{...S.card(),padding:'20px 24px'}}>
                  <div style={{fontSize:'12px',color:'#58a6ff',fontWeight:'700',...S.mono}}>{c.id}</div>
                  <div style={{fontSize:'15px',fontWeight:'700',color:'white',marginTop:'4px'}}>{c.msg}</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginTop:'10px'}}>
                    {c.files.map(f=>(
                      <span key={f} style={{background:'#21262d',border:'1px solid #30363d',padding:'3px 10px',borderRadius:'6px',fontSize:'12px',color:'#8b949e',...S.mono}}>{f}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Arrows SVG */}
            <div style={{width:'180px',flexShrink:0,position:'relative'}}>
              <svg width="180" height="100%" style={{position:'absolute',top:0,left:0,overflow:'visible'}}>
                {arrows.slice(0,step).map((a,i)=>(
                  <g key={i}>
                    <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke={a.color} strokeWidth="2" strokeDasharray="5 3" opacity="0.7"/>
                    <circle cx={a.x2} cy={a.y2} r="4" fill={a.color}/>
                  </g>
                ))}
              </svg>
            </div>

            {/* Objects col */}
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:'12px'}}>
              <div style={{fontSize:'13px',color:'#64748b',fontWeight:'700',letterSpacing:'2px',marginBottom:'8px'}}>OBJECT STORE (objects/)</div>
              {nodes.objects.map((o,oi)=>(
                <div key={oi} style={{...S.card(o.color+'55'),padding:'16px 22px',borderLeft:`4px solid ${o.color}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{...S.mono,fontSize:'13px',color:o.color}}>{o.hash}</div>
                    <div style={{fontSize:'14px',color:'#c9d1d9',marginTop:'4px'}}>{o.label}</div>
                    <div style={{fontSize:'12px',color:'#8b949e',marginTop:'4px'}}>Used by: {o.usedBy.join(', ')}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    {o.usedBy.length > 1 && <div style={{background:'rgba(63,185,80,0.15)',border:'1px solid #3fb950',color:'#3fb950',padding:'4px 10px',borderRadius:'8px',fontSize:'12px',fontWeight:'700'}}>SHARED</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reset / replay button */}
          <div style={{textAlign:'center'}}>
            <button onClick={()=>setStep(0)} style={{padding:'14px 36px',background:'transparent',border:'1px solid #30363d',color:'#8b949e',borderRadius:'10px',cursor:'pointer',fontSize:'15px',fontWeight:'700'}}>
              Replay Animation
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

function buildDemo() {
  const commits = [
    { id: fakeHash('c1')+'...', msg: 'Initial commit',   files: ['hello.txt','readme.md'] },
    { id: fakeHash('c2')+'...', msg: 'Update readme',    files: ['hello.txt','readme.md'] },
    { id: fakeHash('c3')+'...', msg: 'Add new feature',  files: ['hello.txt','readme.md','new.txt'] },
  ];
  const objects = [
    { hash: fakeHash('helloworld'), label: '"Hello World" — hello.txt v1', color:'#58a6ff', usedBy:['Commit 1','Commit 2','Commit 3'] },
    { hash: fakeHash('hellogit'),   label: '"Hello GitLite" — hello.txt v2', color:'#f0883e', usedBy:['Commit 3'] },
    { hash: fakeHash('readme'),     label: 'readme.md content', color:'#d2a8ff', usedBy:['Commit 1','Commit 2','Commit 3'] },
    { hash: fakeHash('newtxt'),     label: 'new.txt content',   color:'#3fb950', usedBy:['Commit 3'] },
  ];
  // naive: c1=2 c2=2 c3=3 = 7
  const arrows = [
    {x1:10,y1:80, x2:170,y2:60,  color:'#58a6ff'},
    {x1:10,y1:80, x2:170,y2:180, color:'#d2a8ff'},
    {x1:10,y1:200,x2:170,y2:60,  color:'#58a6ff'},
    {x1:10,y1:200,x2:170,y2:180, color:'#d2a8ff'},
    {x1:10,y1:320,x2:170,y2:60,  color:'#58a6ff'},
    {x1:10,y1:320,x2:170,y2:180, color:'#d2a8ff'},
    {x1:10,y1:320,x2:170,y2:290, color:'#3fb950'},
  ];
  return { nodes:{commits,objects}, arrows, totalNaive:7, totalActual:4 };
}

function buildFromCommits(commits, targetFile) {
  if (!commits || commits.length === 0) return buildDemo();
  
  // If targetFile is provided, only show commits that contain it to keep the visualization focused.
  let filteredCommits = targetFile ? commits.filter(c => c.files && c.files.includes(targetFile)) : commits;
  if (filteredCommits.length === 0) filteredCommits = commits; // fallback if file never committed
  
  // Sort commits by timestamp (oldest first)
  const sortedCommits = [...filteredCommits].sort((a, b) => {
    const d1 = new Date(a.timestamp.replace(" ", "T")).getTime();
    const d2 = new Date(b.timestamp.replace(" ", "T")).getTime();
    return d1 - d2; // Oldest first
  });

  // Take the most recent 6 commits
  const subset = sortedCommits.slice(-6); 
  
  const formattedCommits = [];
  const objectsMap = {}; 
  const arrows = [];
  let totalNaive = 0;
  let objectCounter = 0;
  const colors = ['#58a6ff', '#3fb950', '#d2a8ff', '#f0883e', '#ef4444', '#a5d6ff', '#ff7b72'];

  subset.forEach((c, ci) => {
    // Only display the target file if it exists, otherwise show up to 2 files to keep UI clean
    let displayFiles = targetFile && c.files.includes(targetFile) ? [targetFile] : (c.files || []).slice(0, 2);
    
    formattedCommits.push({
      id: c.id.slice(0, 8),
      msg: c.message,
      files: displayFiles
    });
    
    // If the backend has treeEntries, use them for true deduplication!
    const entries = c.treeEntries || (c.files || []).map(f => ({ name: f, hash: fakeHash(f + c.id) }));
    
    // Only map the displayed files to objects
    const relevantEntries = entries.filter(e => displayFiles.includes(e.name));

    relevantEntries.forEach((entry) => {
      totalNaive++;
      
      const objKey = entry.hash; // Real blob hash
      const f = entry.name;
      
      if (!objectsMap[objKey]) {
        objectsMap[objKey] = {
          hash: objKey.slice(0, 8),
          label: f,
          color: colors[objectCounter % colors.length],
          usedBy: []
        };
        objectCounter++;
      }
      
      objectsMap[objKey].usedBy.push(c.id.slice(0,6));
      arrows.push({ cIndex: ci, oKey: objKey, color: objectsMap[objKey].color });
    });
  });
  
  const objects = Object.values(objectsMap);
  
  const finalArrows = arrows.map(a => {
    const oIndex = Object.keys(objectsMap).indexOf(a.oKey);
    const cCardHeight = 90; 
    const oCardHeight = 80;
    return {
      x1: 10,
      y1: 40 + a.cIndex * (cCardHeight + 16),
      x2: 170,
      y2: 40 + oIndex * (oCardHeight + 12),
      color: a.color
    };
  });
  
  return { nodes: { commits: formattedCommits, objects }, arrows: finalArrows, totalNaive, totalActual: objects.length };
}

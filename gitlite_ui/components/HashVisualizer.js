import React, { useState, useEffect, useRef } from 'react';

// ── pure helpers ──────────────────────────────────────────────────
async function sha1hex(str) {
  const buf = new TextEncoder().encode(str);
  const h   = await crypto.subtle.digest('SHA-1', buf);
  return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function sha256hex(str) {
  const buf = new TextEncoder().encode(str);
  const h   = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function polyHash(str) {
  let h=0;
  for(let i=0;i<str.length;i++) h=(Math.imul(31,h)+str.charCodeAt(i))|0;
  return (h>>>0).toString(16).padStart(8,'0');
}
function hexToBin(hex){
  return hex.split('').map(c=>parseInt(c,16).toString(2).padStart(4,'0')).join('');
}
function buildCommitString({ message, parent, timestamp, fileName, fileContent }) {
  const blobId = polyHash(fileContent || '');
  return `parent ${parent}\nmessage ${message}\ntimestamp ${timestamp}\ntree\n${fileName} ${blobId}\n`;
}

// ── styles ────────────────────────────────────────────────────────
const S = {
  overlay:   { position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(14px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Inter,sans-serif' },
  box:       { width:'98vw',height:'96vh',background:'#0d1117',border:'1px solid #30363d',borderRadius:'20px',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 40px 80px rgba(0,0,0,0.8)' },
  hdr:       { padding:'28px 48px',borderBottom:'1px solid #30363d',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#010409',flexShrink:0 },
  tabBar:    { display:'flex',borderBottom:'1px solid #30363d',background:'#010409',flexShrink:0 },
  body:      { flex:1,padding:'48px 60px',overflowY:'auto',display:'flex',flexDirection:'column',gap:'48px' },
  closeBtn:  { background:'transparent',border:'none',color:'#8b949e',fontSize:'28px',cursor:'pointer' },
  card:      (accent='#30363d',bg='#161b22')=>({ background:bg,border:`1px solid ${accent}`,borderRadius:'16px',padding:'36px' }),
  mono:      { fontFamily:'JetBrains Mono,monospace',fontSize:'16px' },
  label:     { fontSize:'13px',fontWeight:'700',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'14px' },
  tabBtn:    (active)=>({ padding:'20px 40px',background:active?'#0d1117':'transparent',color:active?'#58a6ff':'#8b949e',borderBottom:active?'3px solid #58a6ff':'3px solid transparent',cursor:'pointer',fontWeight:'700',fontSize:'16px',transition:'all 0.2s',flexShrink:0 }),
};

// ── main component ────────────────────────────────────────────────
export default function HashVisualizer({ commitData, fileContent='', fileName='file.txt', onClose }) {
  const [tab, setTab]           = useState('birth');
  const [birthStep, setBirthStep] = useState(-1);

  // derived from real commitData or fallback
  const data = commitData || {
    message: 'Initial commit',
    parent:  '0000000000000000000000000000000000000000',
    timestamp: new Date().toISOString().slice(0,19).replace('T',' '),
    fileName,
    fileContent,
  };
  const commitStr = buildCommitString(data);

  const [blobHash,   setBlobHash]   = useState('computing...');
  const [commitHash, setCommitHash] = useState('computing...');
  const [poly256,    setPoly256]    = useState('');

  useEffect(()=>{
    sha1hex(data.fileContent||'').then(setBlobHash);
    sha1hex(commitStr).then(setCommitHash);
    sha256hex(commitStr).then(setPoly256);
  },[commitStr]);

  // birth animation
  useEffect(()=>{
    if(tab!=='birth'){setBirthStep(-1);return;}
    setBirthStep(0);
    const t=[1800,3600,5400].map((d,i)=>setTimeout(()=>setBirthStep(i+1),d));
    return()=>t.forEach(clearTimeout);
  },[tab]);

  // avalanche
  const [avaIn,   setAvaIn]   = useState(data.message);
  const [avaHash, setAvaHash] = useState('');
  const [avaBin,  setAvaBin]  = useState('');
  const [prevBin, setPrevBin] = useState('');
  const [flips,   setFlips]   = useState(0);

  useEffect(()=>{
    let ok=true;
    sha1hex(avaIn).then(h=>{
      if(!ok) return;
      const bin=hexToBin(h);
      if(avaBin&&avaBin!==bin){
        let d=0; for(let i=0;i<bin.length;i++) if(bin[i]!==avaBin[i]) d++;
        setFlips(d); setPrevBin(avaBin);
      } else if(!avaBin) setPrevBin(bin);
      setAvaHash(h); setAvaBin(bin);
    });
    return()=>{ok=false;};
  },[avaIn]);

  // dedup
  const [file2,  setFile2]  = useState(data.fileContent||'');
  const [hash1D, setHash1D] = useState('');
  const [hash2D, setHash2D] = useState('');
  useEffect(()=>{ sha1hex(data.fileContent||'').then(setHash1D); },[data.fileContent]);
  useEffect(()=>{ sha1hex(file2).then(setHash2D); },[file2]);

  const TABS=[['birth','Commit ID Birth'],['ava','Avalanche Effect'],['algo','Algorithm Compare'],['dedup','Deduplication']];

  return (
    <div style={S.overlay}>
      <div style={S.box}>
        <header style={S.hdr}>
          <div>
            <div style={{fontSize:'26px',fontWeight:'900',color:'#f0f6fc'}}>Cryptographic Hashing Visualizer</div>
            <div style={{fontSize:'16px',color:'#8b949e',marginTop:'6px'}}>{commitData ? `Commit: "${data.message}"` : `File: ${fileName}`}</div>
          </div>
          <button style={S.closeBtn} onClick={onClose}>x</button>
        </header>

        <div style={S.tabBar}>
          {TABS.map(([id,label])=>(
            <div key={id} style={S.tabBtn(tab===id)} onClick={()=>setTab(id)}>{label}</div>
          ))}
        </div>

        <main style={S.body}>
          {tab==='birth' && <BirthTab step={birthStep} data={data} commitStr={commitStr} commitHash={commitHash} blobHash={blobHash} />}
          {tab==='ava'   && <AvaTab avaIn={avaIn} setAvaIn={setAvaIn} avaHash={avaHash} avaBin={avaBin} prevBin={prevBin} flips={flips} />}
          {tab==='algo'  && <AlgoTab commitStr={commitStr} bytes={new TextEncoder().encode(commitStr).length} sha1H={commitHash} sha256H={poly256} polyH={polyHash(commitStr)} />}
          {tab==='dedup' && <DedupTab fileName={fileName} fileContent={data.fileContent||''} hash1={hash1D} file2={file2} setFile2={setFile2} hash2={hash2D} />}
        </main>
      </div>
    </div>
  );
}

// ── Birth Tab ─────────────────────────────────────────────────────
function BirthTab({ step, data, commitStr, commitHash, blobHash }) {
  const steps = [
    { color:'#58a6ff', title:'Build Commit Object', content:(
      <div style={{...S.mono,fontSize:'15px',color:'#79c0ff',lineHeight:'2.2'}}>
        <div><span style={{color:'#ff7b72'}}>message:</span>   "{data.message}"</div>
        <div><span style={{color:'#ff7b72'}}>parent:</span>    {data.parent.slice(0,16)}...</div>
        <div><span style={{color:'#ff7b72'}}>timestamp:</span> {data.timestamp}</div>
        <div><span style={{color:'#ff7b72'}}>tree:</span></div>
        <div>&nbsp;&nbsp;{data.fileName} {polyHash(data.fileContent||'').slice(0,8)}...</div>
      </div>
    )},
    { color:'#d2a8ff', title:'Serialize to String', content:(
      <div style={{...S.mono,fontSize:'14px',color:'#a5d6ff',whiteSpace:'pre-wrap',lineHeight:'2',maxHeight:'200px',overflowY:'auto',background:'#0d1117',padding:'18px',borderRadius:'10px'}}>
        {commitStr}
      </div>
    )},
    { color:'#3fb950', title:'SHA-1: 80-Round Engine', content:(
      <div>
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'20px'}}>
          {Array.from({length:20},(_,i)=>(
            <div key={i} style={{width:'18px',height:'44px',borderRadius:'5px',background:step>=2?'#3fb950':'#21262d',opacity:step>=2?0.4+i*0.03:0.2,transition:`background 0.3s ${i*0.07}s`}} />
          ))}
        </div>
        <div style={{fontSize:'15px',color:'#8b949e',lineHeight:'2'}}>
          1. Pad input to multiple of 512 bits<br/>
          2. Split into 512-bit (64-byte) blocks<br/>
          3. Run 80 rounds of bitwise ops per block<br/>
          4. Add block result into 5 registers (h0..h4)
        </div>
      </div>
    )},
    { color:'#f0883e', title:'Commit ID Born', content:(
      <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
        <div style={{background:'rgba(240,136,62,0.08)',border:'1px solid rgba(240,136,62,0.4)',borderRadius:'12px',padding:'28px',textAlign:'center'}}>
          <div style={{fontSize:'13px',color:'#f0883e',fontWeight:'700',letterSpacing:'2px',marginBottom:'12px'}}>COMMIT ID</div>
          <div style={{...S.mono,fontSize:'18px',color:'white',wordBreak:'break-all',lineHeight:'1.8'}}>{commitHash}</div>
        </div>
        <div style={{...S.mono,fontSize:'14px',color:'#8b949e'}}>Blob hash (file content): {blobHash.slice(0,20)}...</div>
        <div style={{fontSize:'15px',color:'#8b949e',lineHeight:'1.7'}}>Any change to the message, parent, timestamp, or file will produce a completely different ID.</div>
      </div>
    )},
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'44px'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'30px',fontWeight:'900',color:'#f0f6fc'}}>How a Commit Gets Its ID</div>
        <div style={{color:'#8b949e',marginTop:'10px',fontSize:'18px'}}>Watch the real commit object being serialized and hashed</div>
      </div>
      <div style={{display:'flex',gap:'24px',alignItems:'stretch'}}>
        {steps.map((s,i)=>(
          <React.Fragment key={i}>
            <div style={{flex:1,background: step>=i?'#161b22':'#0b0f17',border:`2px solid ${step>=i?s.color:'#21262d'}`,borderRadius:'18px',padding:'32px',transition:'all 0.5s',opacity:step>=i?1:0.35,display:'flex',flexDirection:'column'}}>
              <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'24px'}}>
                <div style={{width:'38px',height:'38px',borderRadius:'50%',background:step>=i?s.color:'#21262d',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:'900',color:'white',flexShrink:0}}>{i+1}</div>
                <div style={{fontWeight:'700',color:step>=i?s.color:'#8b949e',fontSize:'18px'}}>{s.title}</div>
              </div>
              <div style={{flex:1}}>{s.content}</div>
            </div>
            {i<3 && <div style={{color:'#30363d',fontSize:'44px',display:'flex',alignItems:'center',flexShrink:0}}>›</div>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── Avalanche Tab ─────────────────────────────────────────────────
function AvaTab({ avaIn, setAvaIn, avaHash, avaBin, prevBin, flips }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'44px',width:'100%'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'30px',fontWeight:'900',color:'#f0f6fc'}}>The Avalanche Effect</div>
        <div style={{color:'#8b949e',fontSize:'18px',marginTop:'10px'}}>Change a single character — watch ~50% of the 160 hash bits flip immediately.</div>
      </div>
      <div style={S.card()}>
        <div style={{...S.label,color:'#58a6ff',fontSize:'14px'}}>Input String (edit below)</div>
        <input
          value={avaIn} onChange={e=>setAvaIn(e.target.value)}
          style={{width:'100%',background:'#0d1117',border:'1px solid #30363d',color:'white',padding:'22px',borderRadius:'12px',fontSize:'20px',...S.mono,outline:'none',boxSizing:'border-box'}}
        />
      </div>
      <div style={S.card()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
          <div style={{...S.label,color:'#3fb950',margin:0,fontSize:'14px'}}>SHA-1 Output (160 bits = 40 hex chars)</div>
          {flips>0 && <div style={{fontWeight:'700',fontSize:'18px',color: flips>70?'#3fb950':'#f0883e'}}>{flips}/160 bits flipped — {(flips/160*100).toFixed(1)}%</div>}
        </div>
        <div style={{...S.mono,fontSize:'24px',color:'#f0f6fc',wordBreak:'break-all',background:'#0d1117',padding:'24px',borderRadius:'12px',marginBottom:'28px',letterSpacing:'3px'}}>{avaHash}</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
          {avaBin.split('').map((bit,i)=>{
            const flipped = prevBin && prevBin[i]!==bit;
            return (
              <div key={i} style={{width:'22px',height:'22px',borderRadius:'4px',background:flipped?'#ef4444':bit==='1'?'#3fb950':'#21262d',fontSize:'11px',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,0.8)',transition:'background 0.25s'}}>
                {bit}
              </div>
            );
          })}
        </div>
        {flips>0 && (
          <div style={{marginTop:'24px',padding:'20px',background:'rgba(63,185,80,0.07)',border:'1px solid rgba(63,185,80,0.25)',borderRadius:'12px',fontSize:'16px',color:'#8b949e',lineHeight:'1.8'}}>
            A well-designed hash flips ~50% of bits for any input change, making it impossible to reverse-engineer the original content from the hash.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Algorithm Compare Tab ─────────────────────────────────────────
function AlgoTab({ bytes, sha1H, sha256H, polyH }) {
  const n = Math.max(bytes, 10);
  const W = 700, H = 380;

  // We plot curves up to 2n so we can see the shape
  const maxN = n * 2;
  const polyMax  = maxN;            // O(N)
  const sha1Max  = maxN * 80;       // O(80N)
  const sha256Max= maxN * 64;       // O(64N)
  const yMax     = sha1Max;

  const pts = (fn) =>
    Array.from({length:80},(_,i)=>{
      const x = i/79, nn = x * maxN;
      const y = H - Math.min(fn(nn)/yMax, 1) * H;
      return `${x*W},${y}`;
    }).join(' ');

  const polyPts   = pts(nn => nn);
  const sha256Pts = pts(nn => nn*64);
  const sha1Pts   = pts(nn => nn*80);

  // Label positions at x=1 (right edge)
  const yAtEnd = (fn) => H - Math.min(fn(maxN)/yMax,1)*H;

  const curves = [
    { pts:polyPts,   color:'#3fb950', label:'O(N) — Polynomial', ops: n,    note:'One pass through all bytes. Linear time, but high collision risk.' },
    { pts:sha256Pts, color:'#d2a8ff', label:'O(64N) — SHA-256',  ops: n*64, note:'64 compression rounds per 512-bit block. Stronger than SHA-1.' },
    { pts:sha1Pts,   color:'#ef4444', label:'O(80N) — SHA-1',    ops: n*80, note:'80 compression rounds per 512-bit block. Used by GitLite.' },
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'44px'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'30px',fontWeight:'900',color:'#f0f6fc'}}>Algorithm Complexity Comparison</div>
        <div style={{color:'#8b949e',fontSize:'18px',marginTop:'10px'}}>Computed for this commit string — {bytes} bytes</div>
      </div>
      {/* Winner Banner */}
      <div style={{background:'rgba(63,185,80,0.08)',border:'1px solid rgba(63,185,80,0.35)',borderRadius:'14px',padding:'24px 36px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:'13px',color:'#64748b',fontWeight:'700',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'6px'}}>Most Efficient for This Commit</div>
          <div style={{fontSize:'24px',fontWeight:'900',color:'#3fb950'}}>O(N) Polynomial Rolling Hash</div>
          <div style={{fontSize:'15px',color:'#8b949e',marginTop:'6px'}}>Only {n.toLocaleString()} operations — {Math.round(n*80/n)}x faster than SHA-1 for this input</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:'13px',color:'#64748b',marginBottom:'6px'}}>SHA-1 (used by GitLite)</div>
          <div style={{fontSize:'18px',color:'#ef4444',fontWeight:'700'}}>{(n*80).toLocaleString()} ops</div>
          <div style={{fontSize:'13px',color:'#64748b',marginTop:'10px',marginBottom:'6px'}}>Polynomial</div>
          <div style={{fontSize:'18px',color:'#3fb950',fontWeight:'700'}}>{n.toLocaleString()} ops</div>
        </div>
      </div>
      <div style={{display:'flex',gap:'36px',alignItems:'stretch'}}>
        {/* SVG Graph */}
        <div style={{flex:2,background:'#020617',border:'1px solid #21262d',borderRadius:'16px',padding:'28px',position:'relative',display:'flex',flexDirection:'column'}}>
          <div style={{...S.label,color:'#64748b',marginBottom:'20px'}}>Operations vs Input Size</div>
          <div style={{flex:1}}>
            <svg width="100%" height="100%" viewBox={`0 0 ${W+100} ${H+40}`} style={{display:'block',overflow:'visible'}}>
              {/* Axes */}
              <line x1="0" y1={H} x2={W} y2={H} stroke="#334155" strokeWidth="1.5"/>
              <line x1="0" y1="0" x2="0" y2={H} stroke="#334155" strokeWidth="1.5"/>
              {/* Grid */}
              {[1,2,3,4].map(i=>(
                <React.Fragment key={i}>
                  <line x1="0" y1={H-i*H/4} x2={W} y2={H-i*H/4} stroke="#1e293b" strokeDasharray="4 4"/>
                  <line x1={i*W/4} y1="0" x2={i*W/4} y2={H} stroke="#1e293b" strokeDasharray="4 4"/>
                </React.Fragment>
              ))}
              {/* Curves */}
              {curves.map(c=>(
                <polyline key={c.label} fill="none" stroke={c.color} strokeWidth="3" strokeLinejoin="round" points={c.pts}/>
              ))}
              {/* End-of-curve labels */}
              {curves.map((c,i)=>{
                const fn = i===0?nn=>nn : i===1?nn=>nn*64 : nn=>nn*80;
                const y = yAtEnd(fn);
                return (
                  <text key={c.label} x={W+8} y={y+4} fill={c.color} fontSize="13" fontWeight="700" fontFamily="JetBrains Mono,monospace">{c.label.split('—')[0].trim()}</text>
                );
              })}
              {/* Axis labels */}
              <text x={W/2} y={H+34} fill="#64748b" fontSize="13" textAnchor="middle">Input bytes (N)</text>
              <text x="-10" y="-8" fill="#64748b" fontSize="13" textAnchor="middle">Ops</text>
              {/* Current file marker */}
              <line x1={W/2} y1="0" x2={W/2} y2={H} stroke="#f0883e" strokeWidth="2" strokeDasharray="6 3"/>
              <text x={W/2+6} y="20" fill="#f0883e" fontSize="13" fontWeight="700">this file</text>
            </svg>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:'22px'}}>
          {curves.map(c=>(
            <div key={c.label} style={{...S.card(`${c.color}55`),borderLeft:`6px solid ${c.color}`,flex:1}}>
              <div style={{fontWeight:'700',color:c.color,fontSize:'18px',marginBottom:'10px'}}>{c.label}</div>
              <div style={{color:'#c9d1d9',fontSize:'16px',marginBottom:'10px'}}>{c.ops.toLocaleString()} ops for {bytes} bytes</div>
              <div style={{color:'#8b949e',fontSize:'14px',lineHeight:'1.7'}}>{c.note}</div>
            </div>
          ))}
          <div style={S.card('#21262d','#0d1117')}>
            <div style={{...S.label,color:'#64748b',fontSize:'13px'}}>Hash Outputs for This Commit</div>
            <div style={{fontSize:'14px',color:'#8b949e',marginBottom:'6px'}}>Polynomial (32-bit)</div>
            <div style={{...S.mono,fontSize:'14px',color:'#3fb950',wordBreak:'break-all',marginBottom:'14px'}}>{polyH}</div>
            <div style={{fontSize:'14px',color:'#8b949e',marginBottom:'6px'}}>SHA-1 (160-bit)</div>
            <div style={{...S.mono,fontSize:'13px',color:'#ef4444',wordBreak:'break-all',marginBottom:'14px'}}>{sha1H}</div>
            <div style={{fontSize:'14px',color:'#8b949e',marginBottom:'6px'}}>SHA-256 (256-bit)</div>
            <div style={{...S.mono,fontSize:'13px',color:'#d2a8ff',wordBreak:'break-all'}}>{sha256H}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dedup Tab ──────────────────────────────────────────────────────
function DedupTab({ fileName, fileContent, hash1, file2, setFile2, hash2 }) {
  const same = hash1===hash2 && hash1!=='';
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'44px',width:'100%'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'30px',fontWeight:'900',color:'#f0f6fc'}}>Content Deduplication</div>
        <div style={{color:'#8b949e',fontSize:'18px',marginTop:'10px'}}>Identical file content produces identical blob hashes, so GitLite stores the data only once.</div>
      </div>
      <div style={{display:'flex',gap:'32px',alignItems:'stretch'}}>
        {/* Left col */}
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:'20px'}}>
          <div style={{...S.card(),flex:1,display:'flex',flexDirection:'column'}}>
            <div style={{...S.label,color:'#58a6ff'}}>{fileName}</div>
            <div style={{...S.mono,fontSize:'14px',color:'#c9d1d9',background:'#0d1117',padding:'18px',borderRadius:'10px',flex:1,overflowY:'auto',whiteSpace:'pre-wrap',lineHeight:'1.7'}}>
              {(fileContent||'(empty)').slice(0,500)}{fileContent.length>500?'\n...(truncated)':''}
            </div>
            <div style={{marginTop:'16px',fontSize:'15px',color:'#58a6ff'}}>Blob ID: <span style={{...S.mono,fontSize:'14px'}}>{hash1.slice(0,24)}...</span></div>
          </div>
          <div style={{...S.card(),flex:1,display:'flex',flexDirection:'column'}}>
            <div style={{...S.label,color:'#d2a8ff'}}>Compare File (paste any content)</div>
            <textarea value={file2} onChange={e=>setFile2(e.target.value)}
              style={{flex:1,minHeight:'140px',background:'#0d1117',border:'1px solid #30363d',color:'white',padding:'18px',borderRadius:'10px',...S.mono,fontSize:'14px',outline:'none',resize:'none',boxSizing:'border-box',lineHeight:'1.7'}}
            />
            <div style={{marginTop:'16px',fontSize:'15px',color:'#d2a8ff'}}>Blob ID: <span style={{...S.mono,fontSize:'14px'}}>{hash2.slice(0,24)}...</span></div>
          </div>
        </div>
        {/* Right col */}
        <div style={{flex:1,background:'#0d1117',border:`2px solid ${same?'#3fb950':'#30363d'}`,borderRadius:'18px',padding:'44px',display:'flex',flexDirection:'column',gap:'28px',alignItems:'center',justifyContent:'center',textAlign:'center',transition:'border 0.4s'}}>
          <div style={{fontSize:'22px',fontWeight:'900',color:'white'}}>GitLite Object Store</div>
          {same ? (
            <>
              <div style={{background:'rgba(63,185,80,0.1)',border:'2px solid #3fb950',padding:'28px 36px',borderRadius:'14px',width:'100%'}}>
                <div style={{fontSize:'13px',color:'#3fb950',fontWeight:'700',letterSpacing:'2px',marginBottom:'12px'}}>DEDUPLICATED BLOB</div>
                <div style={{...S.mono,color:'#3fb950',fontSize:'16px',wordBreak:'break-all'}}>{hash1}</div>
                <div style={{color:'#8b949e',fontSize:'15px',marginTop:'14px'}}>Stored exactly ONCE. Both files point to this single object.</div>
              </div>
              <div style={{fontSize:'22px',fontWeight:'900',color:'#3fb950'}}>50% storage saved</div>
            </>
          ) : (
            <>
              <div style={{background:'#161b22',border:'1px solid #30363d',padding:'22px 28px',borderRadius:'14px',width:'100%'}}>
                <div style={{fontSize:'12px',color:'#58a6ff',fontWeight:'700',letterSpacing:'2px',marginBottom:'8px'}}>BLOB 1</div>
                <div style={{...S.mono,color:'#58a6ff',fontSize:'15px',wordBreak:'break-all'}}>{hash1.slice(0,24)}...</div>
                <div style={{color:'#8b949e',fontSize:'13px',marginTop:'8px'}}>{fileName}</div>
              </div>
              <div style={{color:'#8b949e',fontSize:'20px'}}>vs</div>
              <div style={{background:'#161b22',border:'1px solid #30363d',padding:'22px 28px',borderRadius:'14px',width:'100%'}}>
                <div style={{fontSize:'12px',color:'#d2a8ff',fontWeight:'700',letterSpacing:'2px',marginBottom:'8px'}}>BLOB 2</div>
                <div style={{...S.mono,color:'#d2a8ff',fontSize:'15px',wordBreak:'break-all'}}>{hash2.slice(0,24)}...</div>
                <div style={{color:'#8b949e',fontSize:'13px',marginTop:'8px'}}>compare file</div>
              </div>
              <div style={{color:'#8b949e',fontSize:'15px',lineHeight:'1.7'}}>Different content — stored as two separate blob objects. No deduplication.</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

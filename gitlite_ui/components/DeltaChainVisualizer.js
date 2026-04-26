import React, { useState, useEffect } from 'react';

const S = {
  overlay: { position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',backdropFilter:'blur(14px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Inter,sans-serif' },
  box:     { width:'98vw',height:'96vh',background:'#0d1117',border:'1px solid #30363d',borderRadius:'20px',display:'flex',flexDirection:'column',overflow:'hidden' },
  hdr:     { padding:'26px 48px',borderBottom:'1px solid #30363d',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#010409',flexShrink:0 },
  body:    { flex:1,padding:'48px 60px',overflowY:'auto',display:'flex',flexDirection:'column',gap:'44px' },
  card:    (b='#30363d',bg='#161b22')=>({ background:bg,border:`1px solid ${b}`,borderRadius:'16px',padding:'32px' }),
  mono:    { fontFamily:'JetBrains Mono,monospace',fontSize:'14px' },
  close:   { background:'transparent',border:'none',color:'#8b949e',fontSize:'26px',cursor:'pointer' },
};

const RECONSTRUCTION = [
  { step:'Load v1 (FULL)',   ok:true,  note:'Read base snapshot (v1) directly from object store into memory.' },
  { step:'Apply v2 patch',   ok:true,  note:'Apply v2 delta patch onto the memory buffer.' },
  { step:'Apply v3 patch',   ok:true,  note:'Apply v3 delta patch onto the memory buffer.' },
  { step:'Return v3 result', ok:true,  note:'Final reconstructed content delivered to user.' },
];

export default function DeltaChainVisualizer({ fileContent='', fileName='file.txt', onClose }) {
  const [texts, setTexts] = useState([
    fileContent || "function hello() {\n  console.log('v1');\n}",
    (fileContent || "function hello() {\n  console.log('v1');\n}") + "\n// modified v2",
    (fileContent || "function hello() {\n  console.log('v1');\n}") + "\n// modified v3",
    (fileContent || "function hello() {\n  console.log('v1');\n}") + "\n// modified v4"
  ]);

  useEffect(() => {
    if (!fileName) return;
    fetch(`http://localhost:5000/file-versions?file=${encodeURIComponent(fileName)}`)
      .then(res => res.json())
      .then(versions => {
        if (versions && versions.length > 0) {
          const newTexts = [...texts];
          for (let i = 0; i < versions.length && i < 4; i++) {
            newTexts[i] = versions[i] || newTexts[i];
          }
          setTexts(newTexts);
        }
      })
      .catch(console.error);
  }, [fileName]);

  const [storStep,   setStorStep]   = useState(-1);
  const [reconStep,  setReconStep]  = useState(-1);
  const [animating,  setAnimating]  = useState(false);
  const [reconPlay,  setReconPlay]  = useState(false);

  // Dynamic sizes based on input lengths
  const len = texts.map(t => Math.max(t.length, 10)); // minimum 10 bytes to avoid zero-division
  const s1 = len[0];
  const s2 = Math.floor(Math.abs(len[1] - len[0]) + Math.min(len[1], len[0]) * 0.15 + 10); // estimate delta
  const s3 = Math.floor(Math.abs(len[2] - len[1]) + Math.min(len[2], len[1]) * 0.15 + 10);
  const s4 = len[3]; // Reset to FULL

  const VERSIONS = [
    { v:'v1', type:'FULL',  pct:100, size:s1, note:'First version — always stored as FULL snapshot', color:'#58a6ff' },
    { v:'v2', type:'DELTA', pct:Math.round((s2/s1)*100), size:s2, note:`Only ${Math.round((s2/s1)*100)}% the size of v1 — patch stored`, color:'#3fb950' },
    { v:'v3', type:'DELTA', pct:Math.round((s3/len[1])*100), size:s3, note:`Only ${Math.round((s3/len[1])*100)}% the size of v2 — patch stored`, color:'#3fb950' },
    { v:'v4', type:'FULL',  pct:100, size:s4, note:'Chain depth limit reached — reset to FULL', color:'#f0883e' },
  ];

  const totalNaive  = len.reduce((a,v)=>a+v, 0); // Size if all 4 were FULL
  const totalActual = VERSIONS.reduce((a,v)=>a+v.size, 0);
  const savedPct    = Math.round((1-totalActual/totalNaive)*100) || 0;

  // Storage animation
  useEffect(()=>{
    if (!animating) return;
    if (storStep >= VERSIONS.length-1) { setAnimating(false); return; }
    const t = setTimeout(()=>setStorStep(s=>s+1), 600);
    return ()=>clearTimeout(t);
  }, [animating, storStep]);

  // Reconstruction animation
  useEffect(()=>{
    if (!reconPlay) return;
    if (reconStep >= RECONSTRUCTION.length-1) { setReconPlay(false); return; }
    const t = setTimeout(()=>setReconStep(s=>s+1), 800);
    return ()=>clearTimeout(t);
  }, [reconPlay, reconStep]);

  const startStorage = () => { setStorStep(0); setAnimating(true); };
  const startRecon   = () => { setReconStep(0); setReconPlay(true); };
  const reset        = () => { setStorStep(-1); setReconStep(-1); setAnimating(false); setReconPlay(false); };

  return (
    <div style={S.overlay}>
      <div style={S.box}>
        <header style={S.hdr}>
          <div>
            <div style={{fontSize:'26px',fontWeight:'900',color:'#f0f6fc'}}>Delta Chain Visualizer</div>
            <div style={{fontSize:'16px',color:'#8b949e',marginTop:'4px'}}>How GitLite decides FULL vs DELTA storage for each version</div>
          </div>
          <button style={S.close} onClick={onClose}>x</button>
        </header>

        <main style={S.body}>
          {/* Input textareas */}
          <div style={S.card()}>
            <div style={{fontSize:'20px',fontWeight:'900',color:'white',marginBottom:'20px'}}>1. Upload 4 Versions of a File</div>
            <div style={{display:'flex',gap:'16px'}}>
              {texts.map((t, i) => (
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column',gap:'8px'}}>
                  <div style={{...S.mono,color: VERSIONS[i].color,fontWeight:'700'}}>Version {i+1}</div>
                  <textarea 
                    value={t}
                    onChange={(e) => {
                      const newTexts = [...texts];
                      newTexts[i] = e.target.value;
                      setTexts(newTexts);
                    }}
                    style={{width:'100%',height:'100px',background:'#0d1117',border:`1px solid ${VERSIONS[i].color}44`,color:'white',padding:'12px',borderRadius:'8px',...S.mono,fontSize:'12px',outline:'none',resize:'none',boxSizing:'border-box'}}
                  />
                  <div style={{fontSize:'12px',color:'#8b949e',textAlign:'right'}}>{t.length} bytes</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div style={{display:'flex',gap:'28px'}}>
            <div style={{...S.card('#30363d','#0d1117'),flex:1,textAlign:'center'}}>
              <div style={{fontSize:'13px',color:'#8b949e',fontWeight:'700',letterSpacing:'2px',marginBottom:'8px'}}>IF ALL FULL</div>
              <div style={{fontSize:'38px',fontWeight:'900',color:'#ef4444'}}>{totalNaive}B</div>
              <div style={{fontSize:'14px',color:'#8b949e',marginTop:'4px'}}>4 uncompressed snapshots</div>
            </div>
            <div style={{...S.card('#30363d','#0d1117'),flex:1,textAlign:'center'}}>
              <div style={{fontSize:'13px',color:'#8b949e',fontWeight:'700',letterSpacing:'2px',marginBottom:'8px'}}>DELTA CHAIN</div>
              <div style={{fontSize:'38px',fontWeight:'900',color:'#3fb950'}}>{totalActual}B</div>
              <div style={{fontSize:'14px',color:'#8b949e',marginTop:'4px'}}>2 full + 2 deltas</div>
            </div>
            <div style={{...S.card('rgba(63,185,80,0.4)','rgba(63,185,80,0.08)'),flex:1,textAlign:'center'}}>
              <div style={{fontSize:'13px',color:'#8b949e',fontWeight:'700',letterSpacing:'2px',marginBottom:'8px'}}>STORAGE SAVED</div>
              <div style={{fontSize:'38px',fontWeight:'900',color:'#3fb950'}}>{savedPct}%</div>
              <div style={{fontSize:'14px',color:'#8b949e',marginTop:'4px'}}>via delta compression</div>
            </div>
          </div>

          {/* Storage Decision */}
          <div style={S.card()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'28px'}}>
              <div style={{fontSize:'20px',fontWeight:'900',color:'white'}}>Storage Decision Per Version</div>
              <div style={{display:'flex',gap:'12px'}}>
                <button onClick={startStorage} style={{padding:'10px 24px',background:'rgba(88,166,255,0.1)',border:'1px solid #58a6ff',color:'#58a6ff',borderRadius:'10px',cursor:'pointer',fontSize:'14px',fontWeight:'700'}}>Play</button>
                <button onClick={reset}        style={{padding:'10px 24px',background:'transparent',border:'1px solid #30363d',color:'#8b949e',borderRadius:'10px',cursor:'pointer',fontSize:'14px',fontWeight:'700'}}>Reset</button>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
              {VERSIONS.map((v,i)=>{
                const shown = storStep >= i;
                return (
                  <div key={v.v} style={{display:'flex',gap:'24px',alignItems:'center',opacity: shown?1:0.2,transition:'opacity 0.4s',transitionDelay:`${i*0.05}s`}}>
                    {/* Version label */}
                    <div style={{width:'36px',height:'36px',borderRadius:'50%',background:v.color,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'900',fontSize:'13px',color:'white',flexShrink:0}}>{v.v}</div>
                    {/* Type badge */}
                    <div style={{width:'80px',padding:'6px 12px',borderRadius:'8px',textAlign:'center',fontWeight:'900',fontSize:'13px',color:'white',background:v.type==='FULL'?'rgba(88,166,255,0.2)':'rgba(63,185,80,0.2)',border:`1px solid ${v.type==='FULL'?'#58a6ff':'#3fb950'}`,flexShrink:0}}>
                      {v.type}
                    </div>
                    {/* Bar */}
                    <div style={{flex:1,background:'#21262d',borderRadius:'8px',height:'28px',overflow:'hidden',position:'relative'}}>
                      <div style={{width: shown?`${v.pct}%`:'0%',height:'100%',background:v.color,borderRadius:'8px',transition:'width 0.8s ease',transitionDelay:`${i*0.1}s`,display:'flex',alignItems:'center',paddingLeft:'10px'}}>
                        {v.pct>=20 && <span style={{fontSize:'13px',fontWeight:'700',color:'white',...S.mono}}>{v.pct}%</span>}
                      </div>
                      {v.pct<20 && shown && <span style={{position:'absolute',left:'calc('+v.pct+'% + 8px)',top:'50%',transform:'translateY(-50%)',fontSize:'13px',fontWeight:'700',color:v.color,...S.mono}}>{v.pct}%</span>}
                    </div>
                    {/* Size */}
                    <div style={{width:'80px',textAlign:'right',fontSize:'14px',color:'#8b949e',...S.mono,flexShrink:0}}>{v.size}B</div>
                    {/* Note */}
                    <div style={{width:'300px',fontSize:'13px',color:'#8b949e',lineHeight:'1.5',flexShrink:0}}>{v.note}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reconstruction */}
          <div style={S.card()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'28px'}}>
              <div>
                <div style={{fontSize:'20px',fontWeight:'900',color:'white'}}>Reconstructing v3 on Checkout</div>
                <div style={{fontSize:'15px',color:'#8b949e',marginTop:'6px'}}>GitLite cannot just read "v3" from disk. It must dynamically rebuild it by applying patches in sequence.</div>
              </div>
              <button onClick={startRecon} style={{padding:'10px 24px',background:'rgba(240,136,62,0.1)',border:'1px solid #f0883e',color:'#f0883e',borderRadius:'10px',cursor:'pointer',fontSize:'14px',fontWeight:'700'}}>
                Reconstruct v3
              </button>
            </div>

            <div style={{display:'flex',gap:'36px',alignItems:'stretch'}}>
              <div style={{flex:1,display:'flex',flexDirection:'column',gap:'16px'}}>
                {RECONSTRUCTION.map((r,i)=>{
                  const shown = reconStep >= i;
                  return (
                    <div key={i} style={{display:'flex',gap:'20px',alignItems:'flex-start',opacity:shown?1:0.2,transition:'opacity 0.4s'}}>
                      <div style={{width:'28px',height:'28px',borderRadius:'50%',background:shown?'#3fb950':'#21262d',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',color:'white',fontWeight:'900',flexShrink:0,transition:'background 0.3s'}}>
                        {shown ? '✓' : (i+1)}
                      </div>
                      <div style={{flex:1,background:'#0d1117',border:`1px solid ${shown?'#3fb950':'#30363d'}`,borderRadius:'10px',padding:'16px 20px',transition:'border 0.3s'}}>
                        <div style={{fontSize:'16px',fontWeight:'700',color: shown?'white':'#8b949e',...S.mono}}>{r.step}</div>
                        <div style={{fontSize:'13px',color:'#8b949e',marginTop:'6px'}}>{r.note}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div style={{flex:1,background:'#020617',border:'1px solid #21262d',borderRadius:'14px',padding:'24px',display:'flex',flexDirection:'column',minHeight:'320px'}}>
                <div style={{fontSize:'14px',color:'#58a6ff',fontWeight:'700',letterSpacing:'2px',marginBottom:'16px',display:'flex',justifyContent:'space-between'}}>
                  <span>IN-MEMORY BUFFER</span>
                  <span style={{color:'#8b949e',fontSize:'12px',fontWeight:'normal'}}>
                    {reconStep < 0 ? 'Empty' : ['v1 FULL loaded', 'v2 DELTA applied', 'v3 DELTA applied', 'v3 DELTA applied'][reconStep]}
                  </span>
                </div>
                <div style={{...S.mono,fontSize:'14px',color:'#c9d1d9',whiteSpace:'pre-wrap',overflowY:'auto',flex:1,opacity:reconStep>=0?1:0,transition:'opacity 0.3s'}}>
                  {reconStep >= 0 ? texts[Math.min(reconStep, 2)] : ''}
                </div>
                {reconStep >= 3 && (
                  <div style={{marginTop:'20px',padding:'16px',background:'rgba(63,185,80,0.08)',border:'1px solid #3fb950',borderRadius:'10px',textAlign:'center'}}>
                    <div style={{fontSize:'16px',fontWeight:'900',color:'#3fb950'}}>v3 Successfully Reconstructed</div>
                    <div style={{fontSize:'13px',color:'#8b949e',marginTop:'4px'}}>1 FULL read + 2 DELTA patches = {savedPct}% less storage used</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

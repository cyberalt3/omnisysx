// ----- Portfolio Dashboard -----
function PortfolioDashboard(){
  const r = OBSERVER_REPORT;
  const totalChain = Object.values(r.portfolio.chainBreakdown).reduce((a,b)=>a+b,0);
  const chainEntries = Object.entries(r.portfolio.chainBreakdown).sort((a,b)=>b[1]-a[1]);
  const chainColors = {Ethereum:"#627eea", Base:"#2962ef", Arbitrum:"#28a0f0", Optimism:"#ff5a5a", Polygon:"#8b5cf6"};

  const topPositions = r.positions.slice(0,5);
  const totalTop = topPositions.reduce((a,p)=>a+p.valueUsd,0);
  const [showAll, setShowAll] = useState(false);

  return (
    <section id="dashboard" style={{padding:"40px 32px"}}>
      <div style={{maxWidth:1280, margin:"0 auto"}}>
        <Section>
          <SectionHeader
            eyebrow="01 · Observe"
            title="Portfolio"
            sub={"Last sync " + r.timestamp.replace("T"," ").replace("Z"," UTC")}
          />

          {/* Hero KPI */}
          <Card padding={32} style={{marginBottom:16, position:"relative", overflow:"hidden"}}>
            <div aria-hidden style={{
              position:"absolute", right:-120, top:-120, width:420, height:420, borderRadius:999,
              background:"radial-gradient(circle, rgba(41,98,239,0.18) 0%, transparent 60%)",
              pointerEvents:"none",
            }}/>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:24, position:"relative"}}>
              <div>
                <div style={{fontSize:13, color:"var(--muted)", fontWeight:500, marginBottom:12}}>Total balance · {Object.keys(r.portfolio.chainBreakdown).length} chains</div>
                <div className="tnum" style={{fontSize:"clamp(48px, 6vw, 72px)", fontWeight:700, letterSpacing:-0.04, lineHeight:1}}>
                  {fmtUsd(r.portfolio.totalValueUsd)}
                </div>
                <div style={{display:"flex", gap:10, marginTop:20, flexWrap:"wrap"}}>
                  <Pill tone="green">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M7 14l5-5 5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span className="tnum">+{r.portfolio.change24hPercent.toFixed(2)}% · +{fmtUsd(r.portfolio.change24hUsd)}</span>
                    <span style={{color:"var(--muted)", fontWeight:400}}>24h</span>
                  </Pill>
                  <Pill tone="neutral">Gas reserve · <span style={{color:"#34d399"}}>SAFE</span> · <span className="mono">{r.portfolio.ethBalanceNative} ETH</span></Pill>
                  <Pill tone="muted"><span className="mono">{SHORT_WALLET}</span></Pill>
                </div>
              </div>
              <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:12}}>
                <Sparkline/>
                <div style={{fontSize:12, color:"var(--muted)"}}>7-day · indicative</div>
              </div>
            </div>
          </Card>

          {/* Two-column grid */}
          <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:16}}>
            {/* Top positions */}
            <Card padding={0}>
              <div style={{padding:"22px 24px 16px", borderBottom:"1px solid var(--line)", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <div>
                  <div style={{fontSize:16, fontWeight:600}}>Top positions</div>
                  <div style={{fontSize:13, color:"var(--muted)", marginTop:2}}>{r.positions.length} assets across {Object.keys(r.portfolio.chainBreakdown).length} chains</div>
                </div>
                <button onClick={()=>setShowAll(true)} style={{background:"none",border:"none",padding:0,cursor:"pointer"}}>
                  <Pill tone="muted" style={{cursor:"pointer",transition:"border-color .2s, color .2s"}}>View all →</Pill>
                </button>
              </div>
              <div>
                {topPositions.map((p,i)=>{
                  const pct = (p.valueUsd / totalTop) * 100;
                  return (
                    <div key={p.symbol} style={{
                      padding:"16px 24px",
                      borderBottom: i<topPositions.length-1 ? "1px solid var(--line)" : "none",
                      display:"grid",
                      gridTemplateColumns:"auto 1fr 1.2fr auto",
                      alignItems:"center", gap:20,
                      transition:"background .15s",
                    }}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.015)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    >
                      <TokenAvatar sym={p.symbol} color={p.color}/>
                      <div>
                        <div style={{fontSize:15, fontWeight:600}}>{p.symbol}</div>
                        <div style={{fontSize:12, color:"var(--muted)", marginTop:2, display:"flex", gap:8, alignItems:"center"}}>
                          <span>{p.name}</span>
                          <span>·</span>
                          <ChainBadge chain={p.chain}/>
                        </div>
                      </div>
                      <div>
                        <div style={{display:"flex", justifyContent:"space-between", marginBottom:6}}>
                          <span className="tnum mono" style={{fontSize:12, color:"var(--muted)"}}>{fmtNum(p.quantity)} {p.symbol}</span>
                          <span className="tnum" style={{fontSize:12, color:"var(--muted)"}}>{pct.toFixed(1)}%</span>
                        </div>
                        <Bar pct={pct}/>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div className="tnum" style={{fontSize:15, fontWeight:600}}>{fmtUsd(p.valueUsd)}</div>
                        <div className="tnum mono" style={{fontSize:11, color:"var(--muted)", marginTop:2}}>${fmtNum(p.price,2)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Right column stack */}
            <div style={{display:"flex", flexDirection:"column", gap:16}}>
              <Card padding={20}>
                <div style={{fontSize:14, fontWeight:600, marginBottom:14}}>Chain distribution</div>
                {chainEntries.map(([name,val])=>{
                  const pct = (val/totalChain)*100;
                  return (
                    <div key={name} style={{marginBottom:10}}>
                      <div style={{display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:12}}>
                        <span style={{display:"inline-flex", alignItems:"center", gap:7, color:"var(--text)"}}>
                          <span style={{width:7,height:7,borderRadius:999,background:chainColors[name]}}/>
                          {name}
                        </span>
                        <span className="tnum" style={{color:"var(--muted)"}}>{pct.toFixed(1)}%</span>
                      </div>
                      <Bar pct={pct} color={chainColors[name]} height={3}/>
                    </div>
                  );
                })}
              </Card>

              <Card padding={20}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
                  <div style={{fontSize:14, fontWeight:600}}>Active alerts</div>
                  <span style={{fontSize:11, color:"var(--muted)"}} className="mono">{r.alerts.length}</span>
                </div>
                {r.alerts.map(a=>{
                  const tone = a.severity==="warning" ? "amber" : a.severity==="ok" ? "green" : "blue";
                  const dotColor = a.severity==="warning"?"#f59e0b":a.severity==="ok"?"#10b981":"#5b9eff";
                  return (
                    <div key={a.id} style={{display:"flex", gap:10, padding:"10px 0", borderTop:"1px solid var(--line)"}}>
                      <span style={{width:6,height:6,borderRadius:999,background:dotColor,marginTop:7,flexShrink:0}}/>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{display:"flex", justifyContent:"space-between", gap:8}}>
                          <span style={{fontSize:13, fontWeight:500}}>{a.title}</span>
                          <span className="mono" style={{fontSize:11, color:"var(--muted-2)", flexShrink:0}}>{a.timestamp}</span>
                        </div>
                        <div style={{fontSize:12, color:"var(--muted)", marginTop:2, lineHeight:1.4}}>{a.message}</div>
                      </div>
                    </div>
                  );
                })}
              </Card>

              <Card padding={20}>
                <div style={{fontSize:14, fontWeight:600, marginBottom:14}}>DeFi positions</div>
                {r.defiPositions.map((d,i)=>(
                  <div key={i} style={{
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                    padding:"10px 0", borderTop: i>0 ? "1px solid var(--line)" : "none",
                  }}>
                    <div>
                      <div style={{fontSize:13, fontWeight:500}}>{d.protocol}</div>
                      <div style={{fontSize:11, color:"var(--muted)", marginTop:2}}>{d.type} · {d.chain}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div className="tnum" style={{fontSize:13, fontWeight:500}}>{fmtUsd(d.valueUsd, {compact:true})}</div>
                      {d.apy && <div className="tnum" style={{fontSize:11, color:"#34d399", marginTop:2}}>{d.apy.toFixed(2)}% APY</div>}
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </Section>
      </div>
      {showAll && <AllAssetsOverlay onClose={()=>setShowAll(false)} />}
    </section>
  );
}

function SectionHeader({eyebrow, title, sub, right}){
  return (
    <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:24, gap:24, flexWrap:"wrap"}}>
      <div>
        <div className="mono" style={{fontSize:12, color:"var(--blue-2)", fontWeight:500, marginBottom:10, textTransform:"uppercase", letterSpacing:0.1}}>{eyebrow}</div>
        <h2 style={{margin:0, fontSize:44, fontWeight:700, letterSpacing:-0.03, lineHeight:1}}>{title}</h2>
        {sub && <div style={{marginTop:10, fontSize:14, color:"var(--muted)"}}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function Sparkline(){
  // Subtle indicative spark
  const points = [40,42,38,45,48,46,52,49,55,58,54,60,63,68,66,72];
  const w=220, h=64, max=Math.max(...points), min=Math.min(...points);
  const path = points.map((p,i)=>{
    const x = (i/(points.length-1))*w;
    const y = h - ((p-min)/(max-min))*h;
    return (i===0?"M":"L")+x.toFixed(1)+","+y.toFixed(1);
  }).join(" ");
  const area = path + ` L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5b9eff" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#2962ef" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkFill)"/>
      <path d={path} fill="none" stroke="#5b9eff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function AllAssetsOverlay({ onClose }) {
  const r = OBSERVER_REPORT;
  const [tab, setTab] = useState("tokens");
  const [chainFilter, setChainFilter] = useState("All");
  const chainColors = {Ethereum:"#627eea", Base:"#2962ef", Arbitrum:"#28a0f0", Optimism:"#ff5a5a", Polygon:"#8b5cf6"};
  const chains = ["All", ...Object.keys(r.portfolio.chainBreakdown)];
  const totalVal = r.positions.reduce((a,p)=>a+p.valueUsd,0);

  const filtered = chainFilter === "All"
    ? r.positions
    : r.positions.filter(p => p.chain === chainFilter);

  const filteredDefi = chainFilter === "All"
    ? r.defiPositions
    : r.defiPositions.filter(d => d.chain === chainFilter);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const overlayStyle = {
    position:"fixed", inset:0, zIndex:90,
    background:"rgba(0,0,0,0.75)", backdropFilter:"blur(12px)",
    display:"flex", justifyContent:"center", alignItems:"flex-start",
    padding:"40px 20px", overflowY:"auto",
    animation:"slideIn .3s cubic-bezier(.2,.7,.2,1) both",
  };
  const panelStyle = {
    width:"100%", maxWidth:960, background:"var(--surface)",
    border:"1px solid var(--line-strong)", borderRadius:28,
    overflow:"hidden", position:"relative",
    boxShadow:"0 32px 80px -24px rgba(0,0,0,0.8)",
  };

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panelStyle} className="slide-in">
        {/* Header */}
        <div style={{
          padding:"28px 32px 0", display:"flex", justifyContent:"space-between",
          alignItems:"flex-start", gap:16,
        }}>
          <div>
            <div className="mono" style={{fontSize:11, color:"var(--blue-2)", textTransform:"uppercase", letterSpacing:0.1, fontWeight:600, marginBottom:8}}>
              Portfolio · All Assets
            </div>
            <h2 style={{margin:0, fontSize:32, fontWeight:700, letterSpacing:-0.03}}>
              {fmtUsd(r.portfolio.totalValueUsd)}
            </h2>
            <div style={{fontSize:13, color:"var(--muted)", marginTop:6}}>
              {r.positions.length} tokens · {r.defiPositions.length} DeFi positions · {Object.keys(r.portfolio.chainBreakdown).length} chains
            </div>
          </div>
          <button onClick={onClose} style={{
            width:40, height:40, borderRadius:12, background:"rgba(255,255,255,0.04)",
            border:"1px solid var(--line)", display:"grid", placeItems:"center",
            cursor:"pointer", color:"var(--muted)", transition:"color .15s, background .15s",
            flexShrink:0,
          }}
          onMouseEnter={e=>{e.currentTarget.style.color="var(--text)";e.currentTarget.style.background="rgba(255,255,255,0.08)";}}
          onMouseLeave={e=>{e.currentTarget.style.color="var(--muted)";e.currentTarget.style.background="rgba(255,255,255,0.04)";}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Tabs + Chain filter */}
        <div style={{padding:"20px 32px 0", display:"flex", justifyContent:"space-between", alignItems:"center", gap:16, flexWrap:"wrap"}}>
          <div style={{display:"flex", gap:4, background:"rgba(255,255,255,0.03)", borderRadius:12, padding:3, border:"1px solid var(--line)"}}>
            {["tokens","defi"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{
                padding:"8px 18px", borderRadius:10, fontSize:13, fontWeight:600,
                background: tab===t ? "rgba(41,98,239,0.18)" : "transparent",
                color: tab===t ? "#8ab4ff" : "var(--muted)",
                border: tab===t ? "1px solid rgba(91,158,255,0.3)" : "1px solid transparent",
                cursor:"pointer", transition:"all .2s",
              }}>
                {t==="tokens" ? `Tokens (${r.positions.length})` : `DeFi (${r.defiPositions.length})`}
              </button>
            ))}
          </div>
          <div style={{display:"flex", gap:4, flexWrap:"wrap"}}>
            {chains.map(c=>(
              <button key={c} onClick={()=>setChainFilter(c)} style={{
                padding:"6px 12px", borderRadius:999, fontSize:11, fontWeight:500,
                background: chainFilter===c ? "rgba(255,255,255,0.08)" : "transparent",
                color: chainFilter===c ? "var(--text)" : "var(--muted)",
                border: chainFilter===c ? "1px solid var(--line-strong)" : "1px solid var(--line)",
                cursor:"pointer", transition:"all .2s",
                display:"flex", alignItems:"center", gap:5,
              }}>
                {c!=="All" && <span style={{width:6,height:6,borderRadius:999,background:chainColors[c]}}/>}
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{padding:"16px 32px 32px", maxHeight:"60vh", overflowY:"auto"}}>
          {tab === "tokens" && (
            <>
              {/* Table header */}
              <div style={{
                display:"grid", gridTemplateColumns:"auto 1.2fr 1fr 0.6fr auto",
                padding:"12px 16px", gap:20, fontSize:10.5, color:"var(--muted-2)",
                textTransform:"uppercase", letterSpacing:0.1, fontWeight:600,
                borderBottom:"1px solid var(--line)",
              }}>
                <div style={{width:36}}></div>
                <div>Asset</div>
                <div>Balance</div>
                <div>Chain</div>
                <div style={{textAlign:"right"}}>Value</div>
              </div>
              {filtered.length === 0 && (
                <div style={{padding:"40px 0", textAlign:"center", color:"var(--muted)"}}>No tokens on this chain</div>
              )}
              {filtered.map((p,i)=>{
                const pct = (p.valueUsd / totalVal) * 100;
                return (
                  <div key={p.symbol+p.chain} style={{
                    display:"grid", gridTemplateColumns:"auto 1.2fr 1fr 0.6fr auto",
                    padding:"14px 16px", gap:20, alignItems:"center",
                    borderBottom: i<filtered.length-1 ? "1px solid var(--line)" : "none",
                    transition:"background .15s", borderRadius:i===0?"12px 12px 0 0":i===filtered.length-1?"0 0 12px 12px":"0",
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <TokenAvatar sym={p.symbol} color={p.color} size={40}/>
                    <div>
                      <div style={{fontSize:15, fontWeight:600}}>{p.symbol}</div>
                      <div style={{fontSize:12, color:"var(--muted)", marginTop:2}}>{p.name}</div>
                    </div>
                    <div>
                      <div className="tnum mono" style={{fontSize:13}}>{fmtNum(p.quantity)} {p.symbol}</div>
                      <div style={{display:"flex", alignItems:"center", gap:8, marginTop:6}}>
                        <Bar pct={pct} height={3}/>
                        <span className="tnum" style={{fontSize:11, color:"var(--muted)", flexShrink:0}}>{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div>
                      <ChainBadge chain={p.chain}/>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div className="tnum" style={{fontSize:15, fontWeight:600}}>{fmtUsd(p.valueUsd)}</div>
                      <div className="tnum mono" style={{fontSize:11, color:"var(--muted)", marginTop:2}}>${fmtNum(p.price,2)}</div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {tab === "defi" && (
            <>
              <div style={{
                display:"grid", gridTemplateColumns:"1.2fr 0.6fr 0.5fr 0.5fr auto",
                padding:"12px 16px", gap:20, fontSize:10.5, color:"var(--muted-2)",
                textTransform:"uppercase", letterSpacing:0.1, fontWeight:600,
                borderBottom:"1px solid var(--line)",
              }}>
                <div>Protocol</div>
                <div>Type</div>
                <div>Chain</div>
                <div>APY</div>
                <div style={{textAlign:"right"}}>Value</div>
              </div>
              {filteredDefi.length === 0 && (
                <div style={{padding:"40px 0", textAlign:"center", color:"var(--muted)"}}>No DeFi positions on this chain</div>
              )}
              {filteredDefi.map((d,i)=>(
                <div key={d.protocol+d.chain} style={{
                  display:"grid", gridTemplateColumns:"1.2fr 0.6fr 0.5fr 0.5fr auto",
                  padding:"16px 16px", gap:20, alignItems:"center",
                  borderBottom: i<filteredDefi.length-1 ? "1px solid var(--line)" : "none",
                  transition:"background .15s",
                }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div>
                    <div style={{fontSize:14, fontWeight:600}}>{d.protocol}</div>
                    {d.healthFactor && <div style={{fontSize:11, color:"var(--muted)", marginTop:2}}>Health: {d.healthFactor.toFixed(2)}</div>}
                  </div>
                  <div><Pill tone="muted" style={{fontSize:11, padding:"3px 8px"}}>{d.type}</Pill></div>
                  <div><ChainBadge chain={d.chain}/></div>
                  <div className="tnum" style={{fontSize:13, color:"#34d399", fontWeight:500}}>{d.apy ? d.apy.toFixed(2)+"%" : "—"}</div>
                  <div className="tnum" style={{fontSize:15, fontWeight:600, textAlign:"right"}}>{fmtUsd(d.valueUsd, {compact:true})}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PortfolioDashboard, SectionHeader, Sparkline, AllAssetsOverlay });

// ----- Root app + pipeline orchestration -----
function App(){
  // Initial pipeline state: stages keyed by id -> "idle" | "active" | "done" | "failed"
  const initialStages = () => Object.fromEntries(PIPELINE_STAGES.map(s=>[s.id,"idle"]));

  const [pipelineState, setPipelineState] = useState({
    stages: initialStages(),
    currentStage: null,
    log: [],
    runId: null,
    status: "idle", // idle | running | done | failed
  });
  const [pdrItems, setPdrItems] = useState(PDR_QUEUE);
  const [toast, setToast] = useState(null);

  const showToast = (text, tone="blue") => {
    setToast({text, tone, id: Date.now()});
    setTimeout(()=>setToast(t => (t && t.text===text ? null : t)), 3200);
  };

  const stamp = () => {
    const d = new Date();
    return d.toTimeString().slice(0,8);
  };

  const triggerPipeline = useCallback(async ()=>{
    if(pipelineState.status==="running") return;
    const runId = "run_"+Math.random().toString(36).slice(2,10).toUpperCase();
    setPipelineState({
      stages: initialStages(),
      currentStage: null,
      log: [{ts:stamp(), tag:"[orch]", msg:`pipeline ${runId} armed`, kind:"ok"}],
      runId,
      status: "running",
    });
    showToast(`Pipeline ${runId} started`, "blue");

    // Simulate SSE stream
    const events = [
      { stage:"observe",   ms:600,  msg:"observation:start  · zerion-cli snapshot", tag:"[obs]" },
      { stage:"observe",   ms:1100, msg:"observation:complete · 7 positions, 5 chains", tag:"[obs]", done:true, kind:"ok" },
      { stage:"reason",    ms:600,  msg:"reasoning:start  · context window 18.4k tok", tag:"[orch]" },
      { stage:"reason",    ms:1300, msg:"reasoning:complete · 2 candidate strategies", tag:"[orch]", done:true, kind:"ok" },
      { stage:"plan",      ms:700,  msg:"plan:start  · drafting Tx Intent Schema", tag:"[task]" },
      { stage:"plan",      ms:1200, msg:"plan:complete · TIS tis_8e1b07 emitted", tag:"[task]", done:true, kind:"ok" },
      { stage:"authorize", ms:600,  msg:"authorize:start · policy review", tag:"[auditor]" },
      { stage:"authorize", ms:1400, msg:"pdr:pending  · PDR pdr_4f9c2a awaiting human", tag:"[auditor]", done:true, kind:"ok" },
      { stage:"execute",   ms:700,  msg:"execute:start  · awaiting signed bundle", tag:"[orch]" },
      { stage:"execute",   ms:1500, msg:"execute:complete · tx 0x9f…ac21 included blk 19204812", tag:"[orch]", done:true, kind:"ok" },
      { stage:"verify",    ms:600,  msg:"verify:start · receipt diff + invariants", tag:"[obs]" },
      { stage:"verify",    ms:1200, msg:"verify:complete · gas reserve 4.181 ETH (SAFE)", tag:"[obs]", done:true, kind:"ok" },
    ];

    let cancelled = false;
    let i = 0;
    const tick = () => {
      if(cancelled) return;
      if(i >= events.length){
        setPipelineState(s=>({...s, status:"done", currentStage:null, log:[...s.log, {ts:stamp(), tag:"[orch]", msg:`pipeline ${runId} complete · 9.8s`, kind:"ok"}]}));
        showToast("Pipeline completed", "green");
        return;
      }
      const ev = events[i++];
      setPipelineState(s=>{
        const stages = {...s.stages};
        if(!ev.done) stages[ev.stage] = "active";
        else stages[ev.stage] = "done";
        return {
          ...s,
          stages,
          currentStage: ev.done ? s.currentStage : ev.stage,
          log: [...s.log, {ts:stamp(), tag:ev.tag, msg:ev.msg, kind:ev.kind||"info"}].slice(-60),
        };
      });
      setTimeout(tick, ev.ms);
    };
    setTimeout(tick, 400);
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[pipelineState.status]);

  const onPdrAction = (pdrId, action) => {
    setPdrItems(items => items.filter(p=>p.pdrId!==pdrId));
    setPipelineState(s=>({...s, log:[...s.log, {ts:stamp(), tag:"[auditor]", msg:`${pdrId} → ${action.toUpperCase()}`, kind: action==="approve"?"ok":"err"}]}));
    showToast(`PDR ${action==="approve"?"approved":"rejected"} · ${pdrId}`, action==="approve"?"green":"red");
  };

  return (
    <>
      <InteractiveBackground/>
      <div style={{position:"relative", zIndex:1}}>
        <Header onTriggerPipeline={triggerPipeline}/>
        <main>
          <Hero onTrigger={triggerPipeline}/>
          <WalletVerification/>
          <PortfolioDashboard/>
          <PipelineControl
            pipelineState={pipelineState}
            onTriggerRun={triggerPipeline}
            pdrItems={pdrItems}
            onPdrAction={onPdrAction}
          />
          <OperationsConsole/>
          <CtaSection/>
        </main>
        <Footer/>
      </div>
      <Toast toast={toast}/>
    </>
  );
}

function Toast({toast}){
  if(!toast) return null;
  const tones = {
    blue:{bg:"rgba(41,98,239,0.95)", color:"white"},
    green:{bg:"rgba(16,185,129,0.95)", color:"white"},
    red:{bg:"rgba(239,68,68,0.95)", color:"white"},
  };
  const t = tones[toast.tone] || tones.blue;
  return (
    <div className="slide-in" style={{
      position:"fixed", bottom:24, right:24, zIndex:100,
      padding:"12px 18px", borderRadius:14,
      background:t.bg, color:t.color,
      fontSize:14, fontWeight:500,
      boxShadow:"0 18px 48px -16px rgba(0,0,0,0.6)",
      backdropFilter:"blur(8px)",
    }}>{toast.text}</div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);

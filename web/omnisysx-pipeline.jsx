// ----- Pipeline Control + PDR Queue -----
function PipelineControl({ pipelineState, onTriggerRun, pdrItems, onPdrAction }) {
  return (
    <section id="pipeline" style={{ padding: "40px 32px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Section>
          <SectionHeader
            eyebrow="02 · Coordinate"
            title="Pipeline control"
            sub="Six stages, three agents, one wallet"
            right={
            <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="ghost" style={{ padding: "10px 16px", fontSize: 13 }}>Dry-run</Btn>
                <Btn variant="primary" onClick={onTriggerRun} style={{ padding: "10px 18px", fontSize: 13 }}>
                  <span style={{ display: "inline-flex", width: 8, height: 8, borderRadius: 999, background: "white" }} />
                  Trigger run
                </Btn>
              </div>
            } />
          

          <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
            <PipelineCard pipelineState={pipelineState} />
            <PdrQueue items={pdrItems} onAction={onPdrAction} />
          </div>
        </Section>
      </div>
    </section>);

}

function PipelineCard({ pipelineState }) {
  const { stages, currentStage, log, runId, status } = pipelineState;
  return (
    <Card padding={0} style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>PipelineX

            </span>
            <span style={{ color: "var(--muted-2)" }}>·</span>
            <span className="mono" style={{ fontSize: 13, color: "var(--muted)" }}>
</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }} className="mono">{runId || "no active run"}</div>
        </div>
        <Pill tone={status === "running" ? "blue" : status === "done" ? "green" : status === "failed" ? "red" : "muted"} dot={status === "running"}>
          {status === "running" ? "Running" : status === "done" ? "Completed" : status === "failed" ? "Failed" : "Idle"}
        </Pill>
      </div>

      <div style={{ padding: "8px 0" }}>
        {PIPELINE_STAGES.map((s, i) => {const st = stages[s.id];const isActive = st === "active";const isDone = st === "done";
          const isFail = st === "failed";
          const pct = isDone ? 100 : isActive ? 65 : isFail ? 40 : 0;
          const pillTone = isDone ? "green" : isActive ? "blue" : isFail ? "red" : "muted";
          return (
            <div key={s.id} style={{
              padding: "16px 24px",
              display: "grid", gridTemplateColumns: "36px 1fr 200px 90px",
              gap: 18, alignItems: "center",
              opacity: !isDone && !isActive && !isFail && currentStage && i > PIPELINE_STAGES.findIndex((x) => x.id === currentStage) ? 0.6 : 1,
              transition: "opacity .3s"
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                display: "grid", placeItems: "center",
                background: isDone ? "rgba(16,185,129,0.12)" : isActive ? "rgba(41,98,239,0.15)" : isFail ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)",
                border: "1px solid " + (isDone ? "rgba(16,185,129,0.3)" : isActive ? "rgba(91,158,255,0.35)" : isFail ? "rgba(239,68,68,0.3)" : "var(--line)"),
                fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace",
                color: isDone ? "#34d399" : isActive ? "#8ab4ff" : isFail ? "#f87171" : "var(--muted)"
              }}>
                {isDone ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg> :
                isActive ? <span className="spin" style={{ width: 14, height: 14, borderRadius: 999, border: "2px solid currentColor", borderTopColor: "transparent", display: "block" }} /> :
                s.n}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</span>
                  <span style={{ fontSize: 11, color: "var(--muted-2)", padding: "2px 7px", border: "1px solid var(--line)", borderRadius: 6 }}>{s.agent}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{s.desc}</div>
              </div>
              <div>
                <Bar pct={pct} color={isDone ? "#10b981" : isFail ? "#ef4444" : "var(--blue)"} height={3} />
              </div>
              <div style={{ textAlign: "right" }}>
                <Pill tone={pillTone} style={{ fontSize: 11, padding: "4px 10px" }}>{isDone ? "done" : isActive ? "active" : isFail ? "failed" : "idle"}</Pill>
              </div>
            </div>);

        })}
      </div>

      {/* Live log */}
      <div style={{
        margin: 16, padding: "14px 16px", borderRadius: 14,
        background: "#000", border: "1px solid var(--line)",
        maxHeight: 160, overflow: "auto"
      }}>
        <div style={{ fontSize: 11, color: "var(--muted-2)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.1, fontWeight: 600 }}>Live log</div>
        {log.length === 0 ?
        <div className="mono" style={{ fontSize: 12, color: "var(--muted-2)" }}>// awaiting trigger</div> :
        log.map((l, i) =>
        <div key={i} className="mono slide-in" style={{ fontSize: 12, color: l.kind === "err" ? "#f87171" : l.kind === "ok" ? "#34d399" : "var(--muted)", lineHeight: 1.7 }}>
            <span style={{ color: "var(--muted-2)" }}>{l.ts}</span>{"  "}<span style={{ color: "var(--blue-2)" }}>{l.tag}</span>{"  "}{l.msg}
          </div>
        )}
      </div>
    </Card>);

}

function PdrQueue({ items, onAction }) {
  return (
    <Card padding={0}>
      <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Human-in-the-loop</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>PDR review queue</div>
        </div>
        <Pill tone="amber" dot>{items.length} pending</Pill>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, maxHeight: 560, overflow: "auto" }}>
        {items.length === 0 &&
        <div style={{ padding: "40px 16px", textAlign: "center" }}>
            <div style={{
            width: 48, height: 48, borderRadius: 14, margin: "0 auto 14px",
            background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
            display: "grid", placeItems: "center"
          }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Queue clear</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>All policy decisions resolved.</div>
          </div>
        }
        {items.map((p) =>
        <div key={p.pdrId} className="slide-in" style={{
          border: "1px solid rgba(245,158,11,0.25)",
          borderLeft: "3px solid #f59e0b",
          background: "linear-gradient(180deg, rgba(245,158,11,0.04), transparent 60%)",
          borderRadius: 14, padding: 16
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{p.title}</div>
              <Pill tone="amber" style={{ fontSize: 10, padding: "3px 8px" }}>{p.severity}</Pill>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>{p.reason}</div>
            <div style={{
            marginTop: 12, padding: "10px 12px", borderRadius: 10,
            background: "rgba(255,255,255,0.025)", border: "1px solid var(--line)",
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11.5
          }}>
              <div><span style={{ color: "var(--muted-2)" }}>From</span><div className="mono" style={{ marginTop: 2 }}>{p.impact.from}</div></div>
              <div><span style={{ color: "var(--muted-2)" }}>To</span><div className="mono" style={{ marginTop: 2 }}>{p.impact.to}</div></div>
              <div><span style={{ color: "var(--muted-2)" }}>Chain</span><div style={{ marginTop: 2 }}><ChainBadge chain={p.impact.chain} /></div></div>
              <div><span style={{ color: "var(--muted-2)" }}>Slippage</span><div className="mono" style={{ marginTop: 2 }}>{p.impact.slippage}</div></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 8, fontSize: 11 }}>
              <div className="mono" style={{ color: "var(--muted-2)" }}>
                {p.pdrId} <span style={{ color: "var(--muted-2)" }}>·</span> {p.tisId} <span style={{ color: "var(--muted-2)" }}>·</span> {p.timestamp}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Btn variant="green" onClick={() => onAction(p.pdrId, "approve")} style={{ flex: 1, padding: "10px 14px", fontSize: 13 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Approve
              </Btn>
              <Btn variant="red" onClick={() => onAction(p.pdrId, "reject")} style={{ flex: 1, padding: "10px 14px", fontSize: 13 }}>Reject</Btn>
            </div>
          </div>
        )}
      </div>
    </Card>);

}

Object.assign(window, { PipelineControl });
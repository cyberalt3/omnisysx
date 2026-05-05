// ----- Operations Console: Chat + Runs History -----
function OperationsConsole() {
  return (
    <section id="ops" style={{ padding: "40px 32px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Section>
          <SectionHeader
            eyebrow="03 · Operate"
            title="Operations console"
            sub="Talk to the Orchestrator. Audit every run." />
          
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16 }}>
            <ChatCard />
            <RunsHistory />
          </div>
        </Section>
      </div>
    </section>);

}

function ChatCard() {
  const [messages, setMessages] = useState([
  { role: "agent", text: "Trinity online. Wallet snapshot fresh as of 14:22 UTC. Ask anything about the portfolio, or queue a plan.", ts: "14:22" }]
  );
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  const send = useCallback(async (textOverride) => {
    const text = (textOverride || input).trim();
    if (!text || thinking) return;
    setInput("");
    const ts = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    setMessages((m) => [...m, { role: "user", text, ts }]);
    setThinking(true);
    try {
      const sys = "You are the OmnisysX Orchestrator agent. Answer briefly (1-3 sentences) about a DeFi portfolio: total $248,391; ETH 4.182 ($14k); WBTC 1.04 ($71k); USDC 48k on Base; stETH 8.91 on Ethereum; gas reserve SAFE; last run run_01HZQ9X7. Be terse, technical, and action-oriented.";
      const reply = await window.claude.complete({
        messages: [
        { role: "user", content: sys + "\n\nUser: " + text }]

      });
      const ts2 = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
      setMessages((m) => [...m, { role: "agent", text: reply.trim(), ts: ts2 }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "agent", text: "Connection to model dropped. Retry queued.", ts: "" }]);
    } finally {
      setThinking(false);
    }
  }, [input, thinking]);

  return (
    <Card padding={0} style={{ display: "flex", flexDirection: "column", height: 560 }}>
      <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Logo size={28} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Orchestrator</div>
            <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "#10b981", animation: "pulseDot 1.6s infinite" }} />
              Claude Opus 4.7 · context 18.4k tok
            </div>
          </div>
        </div>
        <Pill tone="muted">Session #4f9c</Pill>
      </div>

      <div ref={scrollRef} style={{ flex: 1, padding: 22, overflow: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.map((m, i) =>
        <Bubble key={i} m={m} />
        )}
        {thinking &&
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <Logo size={24} />
            <div style={{
            background: "var(--raised)", padding: "12px 16px", borderRadius: "18px 18px 18px 4px",
            display: "flex", gap: 5, alignItems: "center", border: "1px solid var(--line)"
          }}>
              {[0, 1, 2].map((d) =>
            <span key={d} style={{
              width: 6, height: 6, borderRadius: 999, background: "var(--muted)",
              animation: `pulseDot 1.2s ${d * 0.18}s infinite`
            }} />
            )}
            </div>
          </div>
        }
      </div>

      <div style={{ padding: "14px 22px", borderTop: "1px solid var(--line)" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {SUGGESTIONS.map((s, i) =>
          <button key={i} onClick={() => send(s)} style={{
            padding: "6px 12px", fontSize: 12, color: "var(--muted)",
            background: "rgba(255,255,255,0.025)", border: "1px solid var(--line)",
            borderRadius: 999, transition: "color .2s, background .2s"
          }}
          onMouseEnter={(e) => {e.currentTarget.style.color = "var(--text)";e.currentTarget.style.background = "rgba(255,255,255,0.05)";}}
          onMouseLeave={(e) => {e.currentTarget.style.color = "var(--muted)";e.currentTarget.style.background = "rgba(255,255,255,0.025)";}}>
            {s}</button>
          )}
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--raised)", border: "1px solid var(--line-strong)",
          borderRadius: 14, padding: "6px 6px 6px 16px"
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {if (e.key === "Enter") send();}}
            placeholder="Message the Orchestrator…"
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontSize: 14, padding: "10px 0", color: "var(--text)"
            }} />
          
          <button onClick={() => send()} style={{
            width: 36, height: 36, borderRadius: 10,
            background: input.trim() ? "linear-gradient(180deg,#3b75ff 0%,#2962ef 100%)" : "rgba(255,255,255,0.06)",
            display: "grid", placeItems: "center",
            transition: "background .2s",
            color: input.trim() ? "white" : "var(--muted)"
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
    </Card>);

}

function Bubble({ m }) {
  const isUser = m.role === "user";
  return (
    <div className="slide-in" style={{ display: "flex", gap: 10, alignItems: "flex-end", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      {!isUser && <Logo size={24} />}
      <div style={{ maxWidth: "78%" }}>
        <div style={{
          background: isUser ? "linear-gradient(180deg,#3b75ff 0%,#2962ef 100%)" : "var(--raised)",
          color: isUser ? "white" : "var(--text)",
          padding: "12px 16px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          fontSize: 14, lineHeight: 1.5,
          border: isUser ? "none" : "1px solid var(--line)",
          boxShadow: isUser ? "0 8px 24px -12px rgba(41,98,239,0.5)" : "none",
          whiteSpace: "pre-wrap"
        }}>{m.text}</div>
        {m.ts && <div className="mono" style={{
          fontSize: 10, color: "var(--muted-2)", marginTop: 5,
          textAlign: isUser ? "right" : "left", padding: "0 4px"
        }}>{m.ts}</div>}
      </div>
    </div>);

}

function RunsHistory() {
  return (
    <Card padding={0} style={{ height: 560, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Operations log</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, opacity: "1225" }}>Pipeline runs </div>
        </div>
        <Pill tone="muted">{RUNS_HISTORY.length} runs</Pill>
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "auto 1fr auto auto",
        padding: "10px 22px", borderBottom: "1px solid var(--line)",
        fontSize: 10.5, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: 0.1, fontWeight: 600,
        gap: 14
      }}>
        <div>Status</div><div>Run ID</div><div style={{ textAlign: "right" }}>Started</div><div style={{ textAlign: "right" }}>Duration</div>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {RUNS_HISTORY.map((r, i) => {
          const ok = !r.hasError;
          return (
            <React.Fragment key={r.runId}>
              {(i === 0 || RUNS_HISTORY[i - 1].date !== r.date) &&
              <div style={{ padding: "10px 22px 6px", fontSize: 11, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: 0.1, fontWeight: 600, background: "rgba(255,255,255,0.012)" }}>{r.date}</div>
              }
              <div style={{
                display: "grid", gridTemplateColumns: "auto 1fr auto auto",
                padding: "12px 22px", gap: 14, alignItems: "center",
                borderBottom: "1px solid var(--line)",
                transition: "background .15s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.015)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                
                <Pill tone={ok ? "green" : "red"} style={{ fontSize: 10, padding: "3px 8px" }}>
                  {ok ? <span>✓ {r.finalStage}</span> : <span>✕ {r.finalStage}</span>}
                </Pill>
                <div className="mono" style={{ fontSize: 12.5 }}>{r.runId}</div>
                <div className="mono tnum" style={{ fontSize: 12, color: "var(--muted)", textAlign: "right" }}>{r.startedAt}</div>
                <div className="mono tnum" style={{ fontSize: 12, color: "var(--text)", textAlign: "right" }}>{r.duration}</div>
              </div>
            </React.Fragment>);

        })}
      </div>
    </Card>);

}

function CtaSection() {
  return (
    <section style={{ padding: "100px 32px 80px", position: "relative" }}>
      <div aria-hidden style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(60% 60% at 50% 50%, rgba(41,98,239,0.18) 0%, transparent 70%)",
        pointerEvents: "none"
      }} />
      <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center", position: "relative" }}>
        <Section>
          <h2 style={{
            margin: 0, fontSize: "clamp(40px, 6vw, 76px)", fontWeight: 700,
            letterSpacing: -0.04, lineHeight: 1
          }}>
            Fork it.
            <div style={{
              background: "linear-gradient(180deg,#5b9eff 0%,#2962ef 100%)",
              WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent"
            }}>Run your own Trinity.</div>
          </h2>
          <p style={{ margin: "28px auto 0", fontSize: 18, color: "var(--muted)", maxWidth: 560, lineHeight: 1.5 }}>
            Open source. Three agents, six stages, one Golden Rule. Wire it to your wallet
            and let the Auditor keep you safe.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 36, flexWrap: "wrap" }}>
            <Btn variant="white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5 3.3 9.3 7.8 10.8.6.1.8-.2.8-.5v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2 1-.3 2-.4 3-.4s2 .1 3 .4c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5 4.5-1.5 7.8-5.8 7.8-10.8C23.5 5.7 18.3.5 12 .5z" /></svg>
              Fork on GitHub
            </Btn>
            <Btn variant="ghost">Read the docs</Btn>
          </div>
        </Section>
      </div>
    </section>);

}

function Footer() {
  return (
    <footer style={{ padding: "48px 32px 56px", borderTop: "1px solid var(--line)", marginTop: 24 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 32, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Logo size={28} />
            <div style={{ fontSize: 15, fontWeight: 700 }}>OmnisysX</div>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 14, maxWidth: 320, lineHeight: 1.5 }}>
            Multi-agent autonomous DeFi pipeline. MIT licensed.
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "auto", gap: "14px 56px" }}>
          {[
          { h: "Agents", links: ["Observer", "Task Manager", "Auditor"] }].
          map((c) =>
          <div key={c.h}>
              <div style={{ fontSize: 11, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: 0.1, fontWeight: 600, marginBottom: 10 }}>{c.h}</div>
              {c.links.map((l) =>
            <div key={l} style={{ fontSize: 13, color: "var(--muted)", padding: "3px 0", cursor: "pointer", transition: "color .15s" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "var(--text)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--muted)"}>
              {l}</div>
            )}
            </div>
          )}
        </div>
      </div>
      <div style={{ maxWidth: 1280, margin: "32px auto 0", paddingTop: 24, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted-2)", flexWrap: "wrap", gap: 12 }}>
        <div>© 2026 OmnisysX · Trinity protocol</div>
        <div className="mono">build 0.4.2 · {new Date().toISOString().slice(0, 10)}</div>
      </div>
    </footer>);

}

Object.assign(window, { OperationsConsole, CtaSection, Footer });
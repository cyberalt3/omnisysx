// ----- Trinity Wallet Verification -----

const SAMPLE_WALLETS = [
  {
    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    label: "vitalik.eth",
    chain: "Ethereum",
    balance: 248391.42,
    tokens: 7,
    chains: 5,
    riskScore: 12,
    riskLevel: "low",
    gasReserve: "SAFE",
    ethBalance: 4.182,
    alerts: 1,
    defiExposure: 42.1,
    topHolding: { symbol: "WBTC", pct: 28.7 },
    agentNotes: {
      observer: "Portfolio diversified across 5 chains. Gas reserve healthy at 4.182 ETH (2090× headroom). 1 active price alert on WBTC.",
      taskManager: "Suggest rotating Pendle PT-eETH before maturity in 6d. USDC concentration on Base (19.4%) — consider partial bridge to Ethereum for Aave yield.",
      auditor: "All positions within policy bounds. No slippage violations. Gas reserve SAFE. Recommend: APPROVED for autonomous operation."
    }
  },
  {
    address: "0x1234567890abcdef1234567890abcdef12345678",
    label: "agent-wallet.eth",
    chain: "Base",
    balance: 15420.88,
    tokens: 3,
    chains: 2,
    riskScore: 34,
    riskLevel: "medium",
    gasReserve: "WARN",
    ethBalance: 0.012,
    alerts: 2,
    defiExposure: 68.3,
    topHolding: { symbol: "USDC", pct: 52.1 },
    agentNotes: {
      observer: "Wallet concentrated on 2 chains (Base + Ethereum). Gas reserve low at 0.012 ETH — approaching Golden Rule threshold. 2 alerts active.",
      taskManager: "URGENT: Top up ETH to maintain gas reserve above 0.002. High USDC concentration — consider diversification into yield-bearing positions.",
      auditor: "WARNING: Gas reserve at 6× threshold (minimum 2090× recommended). DeFi exposure at 68.3% exceeds conservative threshold. Recommend: NEEDS_REVIEW."
    }
  }
];

function WalletVerification() {
  const [wallets, setWallets] = useState(SAMPLE_WALLETS);
  const [inputAddr, setInputAddr] = useState("");
  const [verifying, setVerifying] = useState(null); // address being verified
  const [verifyStage, setVerifyStage] = useState(0);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const riskColors = { low: "#10b981", medium: "#f59e0b", high: "#ef4444", critical: "#dc2626" };
  const riskLabels = { low: "Low Risk", medium: "Medium Risk", high: "High Risk", critical: "Critical" };

  const shortAddr = (addr) => addr.slice(0, 6) + "…" + addr.slice(-4);

  const simulateVerification = useCallback(async (address) => {
    setVerifying(address);
    setVerifyStage(0);

    const stages = [
      { stage: 1, label: "Observer scanning...", ms: 1200 },
      { stage: 2, label: "Task Manager analyzing...", ms: 1500 },
      { stage: 3, label: "Auditor reviewing...", ms: 1800 },
    ];

    for (const s of stages) {
      setVerifyStage(s.stage);
      await new Promise(r => setTimeout(r, s.ms));
    }

    // Generate mock result for new wallet
    const isKnown = wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
    if (!isKnown) {
      const riskScore = Math.floor(Math.random() * 60) + 5;
      const riskLevel = riskScore < 20 ? "low" : riskScore < 45 ? "medium" : riskScore < 70 ? "high" : "critical";
      const balance = Math.floor(Math.random() * 200000) + 500;
      const tokens = Math.floor(Math.random() * 12) + 1;
      const chains = Math.floor(Math.random() * 5) + 1;
      const ethBal = +(Math.random() * 5).toFixed(3);
      const gasOk = ethBal > 0.05;

      const newWallet = {
        address,
        label: shortAddr(address),
        chain: ["Ethereum","Base","Arbitrum","Optimism"][Math.floor(Math.random()*4)],
        balance, tokens, chains, riskScore, riskLevel,
        gasReserve: gasOk ? "SAFE" : "WARN",
        ethBalance: ethBal,
        alerts: Math.floor(Math.random() * 4),
        defiExposure: +(Math.random() * 80).toFixed(1),
        topHolding: { symbol: ["ETH","USDC","WBTC","stETH"][Math.floor(Math.random()*4)], pct: +(Math.random()*60+10).toFixed(1) },
        agentNotes: {
          observer: `Wallet scanned across ${chains} chain${chains>1?"s":""}. ${tokens} token positions found. Total value: $${balance.toLocaleString()}. Gas reserve: ${ethBal} ETH (${gasOk?"healthy":"low"}).`,
          taskManager: gasOk
            ? `Portfolio appears ${riskLevel === "low" ? "well-balanced" : "concentrated"}. ${riskScore < 30 ? "No immediate action required." : "Consider rebalancing to reduce risk exposure."}`
            : "URGENT: Gas reserve critically low. Recommend immediate ETH top-up before any operations.",
          auditor: `Risk score: ${riskScore}/100. ${riskLevel === "low" ? "All positions within policy bounds. APPROVED." : riskLevel === "medium" ? "Some concentration detected. APPROVED with monitoring." : "Multiple policy violations detected. NEEDS_REVIEW."}`
        }
      };
      setWallets(prev => [newWallet, ...prev]);
    }

    setVerifyStage(4); // done
    await new Promise(r => setTimeout(r, 600));
    setVerifying(null);
    setVerifyStage(0);
  }, [wallets]);

  const handleSubmit = (e) => {
    e && e.preventDefault();
    const addr = inputAddr.trim();
    if (!addr || verifying) return;
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) return;
    setInputAddr("");
    simulateVerification(addr);
  };

  const openDetail = (wallet) => {
    setSelectedWallet(wallet);
    setShowDetail(true);
  };

  return (
    <section id="wallets" style={{ padding: "40px 32px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Section>
          <SectionHeader
            eyebrow="00 · Verify"
            title="Wallet Scanner"
            sub="Paste any wallet address — the Trinity will verify it"
          />

          {/* Input bar */}
          <Card padding={0} style={{ marginBottom: 24 }}>
            <form onSubmit={handleSubmit} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 12px 12px 24px",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: "var(--muted)" }}>
                <path d="M21 21l-5.2-5.2M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                value={inputAddr}
                onChange={e => setInputAddr(e.target.value)}
                placeholder="0x... paste wallet address"
                className="mono"
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  fontSize: 14, padding: "12px 0", color: "var(--text)",
                }}
              />
              <Btn variant="primary" onClick={handleSubmit} style={{
                padding: "10px 20px", fontSize: 13, borderRadius: 12,
                opacity: inputAddr.trim() && /^0x[a-fA-F0-9]{40}$/.test(inputAddr.trim()) ? 1 : 0.4,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Verify
              </Btn>
            </form>
          </Card>

          {/* Verification in progress */}
          {verifying && (
            <Card padding={20} style={{ marginBottom: 16, border: "1px solid rgba(41,98,239,0.3)", background: "linear-gradient(180deg, rgba(41,98,239,0.06), var(--surface) 60%)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <span className="spin" style={{ width: 18, height: 18, borderRadius: 999, border: "2px solid #5b9eff", borderTopColor: "transparent", display: "block" }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Verifying <span className="mono">{shortAddr(verifying)}</span></div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Trinity scanning wallet…</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[
                  { n: 1, label: "Observer", desc: "Scanning positions" },
                  { n: 2, label: "Task Manager", desc: "Analyzing strategy" },
                  { n: 3, label: "Auditor", desc: "Reviewing policy" },
                ].map(a => {
                  const done = verifyStage > a.n;
                  const active = verifyStage === a.n;
                  return (
                    <div key={a.n} style={{
                      padding: "14px 16px", borderRadius: 14,
                      background: done ? "rgba(16,185,129,0.06)" : active ? "rgba(41,98,239,0.08)" : "rgba(255,255,255,0.02)",
                      border: "1px solid " + (done ? "rgba(16,185,129,0.25)" : active ? "rgba(91,158,255,0.3)" : "var(--line)"),
                      transition: "all .4s",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        {done ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        ) : active ? (
                          <span className="spin" style={{ width: 14, height: 14, borderRadius: 999, border: "2px solid #5b9eff", borderTopColor: "transparent", display: "block" }} />
                        ) : (
                          <span style={{ width: 14, height: 14, borderRadius: 999, background: "rgba(255,255,255,0.06)", display: "block" }} />
                        )}
                        <span style={{ fontSize: 13, fontWeight: 600, color: done ? "#34d399" : active ? "#8ab4ff" : "var(--muted)" }}>{a.label}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{done ? "Complete" : active ? a.desc : "Waiting…"}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Wallet grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 14 }}>
            {wallets.map(w => (
              <Card key={w.address} padding={0} style={{ cursor: "pointer", transition: "border-color .2s, transform .2s" }}
                onClick={() => openDetail(w)}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(91,158,255,0.3)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.transform = "none"; }}
              >
                <div style={{ padding: "20px 22px 16px" }}>
                  {/* Top row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 14,
                        background: `linear-gradient(135deg, ${riskColors[w.riskLevel]}22, ${riskColors[w.riskLevel]}08)`,
                        border: `1px solid ${riskColors[w.riskLevel]}44`,
                        display: "grid", placeItems: "center",
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2z" stroke={riskColors[w.riskLevel]} strokeWidth="1.5"/>
                          <path d="M12 8v4M12 16h.01" stroke={riskColors[w.riskLevel]} strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{w.label}</div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{shortAddr(w.address)}</div>
                      </div>
                    </div>
                    <Pill tone={w.riskLevel === "low" ? "green" : w.riskLevel === "medium" ? "amber" : "red"} style={{ fontSize: 10, padding: "3px 8px" }}>
                      {riskLabels[w.riskLevel]}
                    </Pill>
                  </div>

                  {/* Balance */}
                  <div className="tnum" style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.03, marginBottom: 4 }}>
                    {fmtUsd(w.balance)}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
                    {w.tokens} tokens · {w.chains} chain{w.chains > 1 ? "s" : ""} · Top: {w.topHolding.symbol} ({w.topHolding.pct}%)
                  </div>

                  {/* Risk bar */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 11 }}>
                      <span style={{ color: "var(--muted)" }}>Risk score</span>
                      <span className="tnum" style={{ color: riskColors[w.riskLevel], fontWeight: 600 }}>{w.riskScore}/100</span>
                    </div>
                    <Bar pct={w.riskScore} color={riskColors[w.riskLevel]} height={4} />
                  </div>

                  {/* Bottom pills */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Pill tone={w.gasReserve === "SAFE" ? "green" : "amber"} style={{ fontSize: 10, padding: "3px 8px" }}>
                      Gas: {w.gasReserve}
                    </Pill>
                    <Pill tone="muted" style={{ fontSize: 10, padding: "3px 8px" }}>
                      DeFi: {w.defiExposure}%
                    </Pill>
                    {w.alerts > 0 && (
                      <Pill tone="amber" style={{ fontSize: 10, padding: "3px 8px" }}>
                        {w.alerts} alert{w.alerts > 1 ? "s" : ""}
                      </Pill>
                    )}
                  </div>
                </div>

                {/* Trinity status bar */}
                <div style={{
                  padding: "10px 22px", borderTop: "1px solid var(--line)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "rgba(255,255,255,0.01)",
                }}>
                  <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                    {["Observer", "Task Manager", "Auditor"].map(a => (
                      <span key={a} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--muted)" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {a}
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--blue-2)" }}>Details →</span>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      </div>

      {/* Detail overlay */}
      {showDetail && selectedWallet && (
        <WalletDetailOverlay wallet={selectedWallet} onClose={() => setShowDetail(false)} />
      )}
    </section>
  );
}

function WalletDetailOverlay({ wallet, onClose }) {
  const w = wallet;
  const riskColors = { low: "#10b981", medium: "#f59e0b", high: "#ef4444", critical: "#dc2626" };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const shortAddr = (addr) => addr.slice(0, 6) + "…" + addr.slice(-4);

  const agents = [
    { name: "Observer", icon: "👁", tone: "blue", note: w.agentNotes.observer },
    { name: "Task Manager", icon: "📋", tone: "amber", note: w.agentNotes.taskManager },
    { name: "Auditor", icon: "🛡", tone: "green", note: w.agentNotes.auditor },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 90,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)",
      display: "flex", justifyContent: "center", alignItems: "flex-start",
      padding: "40px 20px", overflowY: "auto",
      animation: "slideIn .3s cubic-bezier(.2,.7,.2,1) both",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="slide-in" style={{
        width: "100%", maxWidth: 800, background: "var(--surface)",
        border: "1px solid var(--line-strong)", borderRadius: 28,
        overflow: "hidden", boxShadow: "0 32px 80px -24px rgba(0,0,0,0.8)",
      }}>
        {/* Header */}
        <div style={{ padding: "28px 32px 20px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="mono" style={{ fontSize: 11, color: "var(--blue-2)", textTransform: "uppercase", letterSpacing: 0.1, fontWeight: 600, marginBottom: 8 }}>
                Trinity Verification Report
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: -0.03 }}>{w.label}</h2>
                <Pill tone={w.riskLevel === "low" ? "green" : w.riskLevel === "medium" ? "amber" : "red"}>
                  {w.riskLevel === "low" ? "Low Risk" : w.riskLevel === "medium" ? "Medium Risk" : "High Risk"}
                </Pill>
              </div>
              <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{w.address}</div>
            </div>
            <button onClick={onClose} style={{
              width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--line)", display: "grid", placeItems: "center",
              cursor: "pointer", color: "var(--muted)", transition: "color .15s", flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: "1px solid var(--line)" }}>
          {[
            { label: "Total Value", value: fmtUsd(w.balance) },
            { label: "Risk Score", value: w.riskScore + "/100", color: riskColors[w.riskLevel] },
            { label: "Gas Reserve", value: w.ethBalance + " ETH", color: w.gasReserve === "SAFE" ? "#10b981" : "#f59e0b" },
            { label: "DeFi Exposure", value: w.defiExposure + "%" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "20px 24px", borderLeft: i > 0 ? "1px solid var(--line)" : "none" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.08, fontWeight: 600 }}>{s.label}</div>
              <div className="tnum" style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: s.color || "var(--text)" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Agent reports */}
        <div style={{ padding: "24px 32px 32px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Agent Reports</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {agents.map(a => (
              <div key={a.name} style={{
                padding: "18px 20px", borderRadius: 16,
                background: "rgba(255,255,255,0.015)",
                border: "1px solid var(--line)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>{a.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginLeft: "auto" }}>
                    <path d="M5 12l5 5 9-11" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{a.note}</div>
              </div>
            ))}
          </div>

          {/* Summary pills */}
          <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
            <Pill tone="muted" style={{ fontSize: 11 }}>{w.tokens} tokens</Pill>
            <Pill tone="muted" style={{ fontSize: 11 }}>{w.chains} chain{w.chains > 1 ? "s" : ""}</Pill>
            <Pill tone="muted" style={{ fontSize: 11 }}>Top: {w.topHolding.symbol} ({w.topHolding.pct}%)</Pill>
            <Pill tone={w.gasReserve === "SAFE" ? "green" : "amber"} style={{ fontSize: 11 }}>Gas: {w.gasReserve}</Pill>
            {w.alerts > 0 && <Pill tone="amber" style={{ fontSize: 11 }}>{w.alerts} alert{w.alerts > 1 ? "s" : ""}</Pill>}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WalletVerification, WalletDetailOverlay });

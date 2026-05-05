// ----- Header + Hero -----
function Header({ onTriggerPipeline }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const links = [
    { label: "Wallets",   href: "#wallets"   },
    { label: "Dashboard", href: "#dashboard" },
    { label: "Pipeline",  href: "#pipeline"  },
    { label: "Docs",      href: "docs.html"  },
  ];
  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      padding: "20px 24px 0",
      transition: "padding .3s",
      pointerEvents: "none"
    }}>
      <div style={{
        position: "relative",
        maxWidth: open ? 1280 : 220,
        margin: "0 auto",
        display: "flex", alignItems: "center", gap: 16,
        padding: "10px 14px 10px 22px",
        borderRadius: 999,
        background: "rgba(15, 26, 58, 0.80)",
        border: "1px solid rgba(91,158,255,0.18)",
        backdropFilter: "blur(22px) saturate(160%)",
        WebkitBackdropFilter: "blur(22px) saturate(160%)",
        boxShadow: scrolled ?
        "0 14px 40px -16px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)" :
        "0 8px 28px -14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
        transition: "max-width .55s cubic-bezier(.65,.05,.35,1), box-shadow .3s",
        fontFamily: "Inter",
        overflow: "hidden", opacity: "0.75",
        pointerEvents: "auto"
      }}>
        {/* Brand left */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          opacity: open ? 1 : 0,
          transform: open ? "translateX(0)" : "translateX(-12px)",
          transition: "opacity .35s ease, transform .45s cubic-bezier(.2,.7,.2,1)",
          transitionDelay: open ? "0.18s" : "0s",
          whiteSpace: "nowrap"
        }}>
          <Logo size={28} />
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.02 }}>OmnisysX</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Centered nav (absolutely centered inside the pill) */}
        <nav style={{
          position: "absolute", left: "50%", top: "50%",
          transform: open ? "translate(-50%, -50%)" : "translate(-50%, calc(-50% - 6px))",
          display: "flex", gap: 4,
          opacity: open ? 1 : 0,
          transition: "opacity .35s ease, transform .45s cubic-bezier(.2,.7,.2,1)",
          transitionDelay: open ? "0.25s" : "0s",
          pointerEvents: open ? "auto" : "none"
        }}>
          {links.map((l, i) =>
          <a key={i} href={l.href} style={{
            padding: "8px 16px", fontSize: 14, fontWeight: 500,
            color: i === 0 ? "var(--text)" : "rgba(230,235,245,0.7)",
            borderRadius: 999, transition: "color .2s, background .2s",
            whiteSpace: "nowrap"
          }}
          onMouseEnter={(e) => {e.currentTarget.style.color = "var(--text)";e.currentTarget.style.background = "rgba(91,158,255,0.10)";}}
          onMouseLeave={(e) => {e.currentTarget.style.color = i === 0 ? "var(--text)" : "rgba(230,235,245,0.7)";e.currentTarget.style.background = "transparent";}}>
              {l.label}
            </a>
          )}
        </nav>

        <div style={{ flex: 1 }} />
      </div>
    </header>);

}

function Hero({ onTrigger }) {
  return (
    <section style={{ position: "relative", padding: "96px 32px 80px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative" }}>
        <Section>
          {/* Mascot hero centerpiece */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28, position: "relative" }}>
            <MascotButton />
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "8px 8px 8px 14px",
              border: "1px solid var(--line-strong)",
              borderRadius: 999,
              background: "rgba(255,255,255,0.025)",
              fontSize: 13, color: "var(--muted)"
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: 999, background: "#10b981",
                animation: "pulseDot 1.6s infinite"
              }} />
              <span style={{ color: "var(--text)" }}>Trinity online</span>
              <span style={{ color: "var(--muted-2)" }}>·</span>
              <span>Pipeline armed</span>
              <span style={{
                marginLeft: 6, padding: "3px 10px", borderRadius: 999,
                background: "rgba(41,98,239,0.18)", color: "#8ab4ff",
                fontSize: 11, fontWeight: 600
              }} className="mono">v0.4.2</span>
            </div>
          </div>

          <h1 style={{
            margin: 0, textAlign: "center",
            fontSize: "clamp(48px, 8vw, 96px)",
            lineHeight: 0.98, letterSpacing: -0.04, fontWeight: 700
          }}>
            <div>Browse onchain.</div>
            <div style={{
              background: "linear-gradient(180deg,#5b9eff 0%,#2962ef 100%)",
              WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent"
            }}>Act autonomously.</div>
          </h1>

          <p style={{
            margin: "32px auto 0", maxWidth: 680, textAlign: "center",
            fontSize: 18, lineHeight: 1.5, color: "var(--muted)", fontWeight: 400
          }}>
            A three-agent autonomous DeFi pipeline. Observer reads your wallet, Task Manager
            drafts intents, Auditor reviews policy. You sign off. Six stages, one wallet, zero
            footguns.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 40, flexWrap: "wrap" }}>
            <Btn variant="primary" onClick={onTrigger}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 3l14 9-14 9V3z" fill="currentColor" /></svg>
              Trigger Pipeline
            </Btn>
            <a href="docs.html" style={{textDecoration:"none"}}>
              <Btn variant="ghost">Read the Docs</Btn>
            </a>
            <Btn variant="ghost">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5 3.3 9.3 7.8 10.8.6.1.8-.2.8-.5v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2 1-.3 2-.4 3-.4s2 .1 3 .4c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5 4.5-1.5 7.8-5.8 7.8-10.8C23.5 5.7 18.3.5 12 .5z" /></svg>
              Fork on GitHub
            </Btn>
          </div>

          {/* Stat strip */}
          <div style={{
            marginTop: 80, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0,
            border: "1px solid var(--line)", borderRadius: 24,
            background: "rgba(255,255,255,0.015)",
            backdropFilter: "blur(8px)"
          }}>
            {[
            { label: "Agents", v: "3", sub: "Observer · TM · Auditor" },
            { label: "Stages", v: "6", sub: "Six-stage flow" },
            { label: "Min gas", v: "0.002", sub: "ETH · Golden Rule" },
            { label: "Cost / call", v: "0.01", sub: "USDC · per pipeline" }].
            map((s, i) =>
            <div key={i} style={{
              padding: "28px 28px",
              borderLeft: i > 0 ? "1px solid var(--line)" : "none"
            }}>
                <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.08, fontWeight: 600 }}>{s.label}</div>
                <div className="tnum" style={{ fontSize: 40, fontWeight: 700, marginTop: 8, letterSpacing: -0.03 }}>{s.v}</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{s.sub}</div>
              </div>
            )}
          </div>
        </Section>
      </div>
    </section>);

}

function MascotButton() {
  const [burst, setBurst] = useState(0);
  const onClick = () => setBurst((b) => b + 1);
  return (
    <button onClick={onClick} aria-label="OmnisysX mascot"
    style={{
      position: "relative", width: 140, height: 140,
      background: "transparent", border: "none", padding: 0, cursor: "pointer"
    }}>
      {/* Persistent halo */}
      <div aria-hidden style={{
        position: "absolute", inset: -30,
        background: "radial-gradient(circle, rgba(91,158,255,0.45) 0%, rgba(41,98,239,0.15) 40%, transparent 70%)",
        filter: "blur(8px)"
      }} />
      {/* Click burst halo (re-mounts every click) */}
      {burst > 0 &&
      <div key={burst} aria-hidden style={{
        position: "absolute", inset: -60, pointerEvents: "none",
        background: "radial-gradient(circle, rgba(140,190,255,0.95) 0%, rgba(91,158,255,0.55) 25%, rgba(41,98,239,0.15) 55%, transparent 75%)",
        filter: "blur(6px)",
        animation: "mascotBurst 900ms cubic-bezier(.2,.7,.2,1) forwards"
      }} />
      }
      {/* Expanding ring */}
      {burst > 0 &&
      <div key={"r" + burst} aria-hidden style={{
        position: "absolute", inset: 10, borderRadius: 999,
        border: "2px solid rgba(140,190,255,0.8)",
        animation: "mascotRing 800ms cubic-bezier(.2,.7,.2,1) forwards",
        pointerEvents: "none"
      }} />
      }
      <img src="assets/omnisysx-mascot.png" alt="OmnisysX mascot"
      key={"img" + burst}
      style={{
        position: "relative", width: "100%", height: "100%", objectFit: "contain",
        filter: burst > 0 ?
        "drop-shadow(0 0 28px rgba(140,190,255,0.95)) drop-shadow(0 12px 32px rgba(91,158,255,0.7))" :
        "drop-shadow(0 12px 32px rgba(91,158,255,0.55))",
        animation: "floatY 6s ease-in-out infinite, mascotPunch 600ms cubic-bezier(.2,.7,.2,1)",
        transition: "filter .3s"
      }} />
    </button>);

}

Object.assign(window, { Header, Hero });
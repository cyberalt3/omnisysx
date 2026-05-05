// ----- Reusable atoms -----
const { useState, useEffect, useRef, useMemo, useCallback } = React;

function Section({ children, style, id, className = "" }) {
  return <section id={id} className={className} style={style}>{children}</section>;
}

function Logo({ size = 28, plain = false }) {
  // OmnisysX mascot — translucent purple star
  if (plain) {
    return (
      <img src="assets/omnisysx-mascot.png" alt="OmnisysX" width={size} height={size}
      style={{ display: "block", objectFit: "contain", flexShrink: 0 }} />);

  }
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: "linear-gradient(135deg, rgba(41,98,239,0.9) 0%, rgba(91,158,255,0.9) 100%)",
      display: "grid", placeItems: "center",
      boxShadow: "0 8px 24px -8px rgba(41,98,239,0.6), inset 0 1px 0 rgba(255,255,255,0.25)",
      flexShrink: 0, overflow: "hidden", position: "relative"
    }}>
      <img src="assets/omnisysx-mascot.png" alt="OmnisysX"
      width={size * 0.92} height={size * 0.92}
      style={{
        display: "block",
        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))", borderStyle: "solid", borderWidth: "0px", borderRadius: "0px", margin: "0px", padding: "0px", objectFit: "cover"
      }} />
    </div>);

}

function Pill({ children, tone = "neutral", style, dot = false }) {
  const tones = {
    neutral: { bg: "rgba(255,255,255,0.04)", border: "var(--line)", color: "var(--text)" },
    muted: { bg: "rgba(255,255,255,0.03)", border: "var(--line)", color: "var(--muted)" },
    green: { bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.25)", color: "#34d399" },
    red: { bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.30)", color: "#f87171" },
    amber: { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)", color: "#fbbf24" },
    blue: { bg: "rgba(41,98,239,0.12)", border: "rgba(91,158,255,0.30)", color: "#8ab4ff" }
  };
  const t = tones[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "6px 12px", fontSize: 12, fontWeight: 500,
      borderRadius: 999, background: t.bg, border: "1px solid " + t.border, color: t.color,
      ...style
    }}>
      {dot && <span style={{
        width: 6, height: 6, borderRadius: 999, background: "currentColor",
        animation: tone === "green" ? "pulseDot 1.6s infinite" : undefined
      }} />}
      {children}
    </span>);

}

function Btn({ children, variant = "primary", style, ...rest }) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "14px 22px", borderRadius: 14, fontSize: 15, fontWeight: 600,
    transition: "transform .15s, background .2s, border-color .2s, box-shadow .2s",
    whiteSpace: "nowrap"
  };
  const variants = {
    primary: {
      background: "linear-gradient(180deg,#3b75ff 0%,#2962ef 100%)",
      color: "white",
      boxShadow: "0 12px 36px -12px rgba(41,98,239,0.8), inset 0 1px 0 rgba(255,255,255,0.25)"
    },
    ghost: {
      background: "rgba(255,255,255,0.03)",
      border: "1px solid var(--line-strong)",
      color: "var(--text)"
    },
    white: {
      background: "#fff", color: "#000",
      boxShadow: "0 12px 36px -12px rgba(255,255,255,0.4)"
    },
    green: {
      background: "linear-gradient(180deg,#22c98a 0%,#10b981 100%)",
      color: "white",
      boxShadow: "0 8px 24px -10px rgba(16,185,129,0.6)"
    },
    red: {
      background: "rgba(239,68,68,0.06)",
      border: "1px solid rgba(239,68,68,0.30)",
      color: "#f87171"
    },
    icon: {
      width: 40, height: 40, padding: 0, borderRadius: 12,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid var(--line)",
      color: "var(--text)"
    }
  };
  return (
    <button {...rest} style={{ ...base, ...variants[variant], ...style }}
    onMouseEnter={(e) => {e.currentTarget.style.transform = "translateY(-1px)";}}
    onMouseLeave={(e) => {e.currentTarget.style.transform = "none";}}>
      {children}</button>);

}

function Card({ children, style, padding = 24, ...rest }) {
  return <div {...rest} style={{
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 24,
    padding,
    ...style
  }}>{children}</div>;
}

// Token logo URLs — coingecko's CDN serves these reliably by id.
const TOKEN_LOGOS = {
  ETH: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  WBTC: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png",
  USDC: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  stETH: "https://assets.coingecko.com/coins/images/13442/small/steth_logo.png",
  ARB: "https://assets.coingecko.com/coins/images/16547/small/arb.jpg",
  OP: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
  AERO: "https://assets.coingecko.com/coins/images/31745/small/token.png"
};

function TokenAvatar({ sym, color, size = 36 }) {
  const [errored, setErrored] = useState(false);
  const url = TOKEN_LOGOS[sym];
  if (url && !errored) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 999,
        background: "#0b0d10",
        display: "grid", placeItems: "center",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06), 0 4px 12px -4px rgba(0,0,0,0.6)",
        flexShrink: 0, overflow: "hidden"
      }}>
        <img src={url} alt={sym} width={size} height={size}
        onError={() => setErrored(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>);

  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      background: `linear-gradient(135deg, ${color} 0%, ${color}88 100%)`,
      display: "grid", placeItems: "center",
      fontSize: size * 0.32, fontWeight: 700, color: "white",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 12px -4px rgba(0,0,0,0.6)",
      letterSpacing: 0,
      flexShrink: 0
    }}>{sym.slice(0, Math.min(4, sym.length))}</div>);

}

function Bar({ pct, color = "var(--blue)", height = 4 }) {
  return (
    <div style={{ height, width: "100%", background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: Math.max(0, Math.min(100, pct)) + "%",
        background: color === "var(--blue)" ? "linear-gradient(90deg,#2962ef,#5b9eff)" : color,
        borderRadius: 999, transition: "width .6s cubic-bezier(.2,.7,.2,1)"
      }} />
    </div>);

}

function ChainBadge({ chain }) {
  const colors = {
    Ethereum: "#627eea", Base: "#2962ef", Arbitrum: "#28a0f0", Optimism: "#ff5a5a", Polygon: "#8b5cf6"
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontSize: 11, color: "var(--muted)", fontWeight: 500
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: colors[chain] || "#777" }} />
      {chain}
    </span>);

}

Object.assign(window, { Section, Logo, Pill, Btn, Card, TokenAvatar, Bar, ChainBadge });
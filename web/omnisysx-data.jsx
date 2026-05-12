// ----- Mock data + types modeled after the API contract -----
const WALLET = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const SHORT_WALLET = "0xd8dA…6045";

const OBSERVER_REPORT = {
  id: "obs_01HZQ9X7E2K8M",
  timestamp: "2026-04-28T14:22:08Z",
  walletAddress: WALLET,
  portfolio: {
    totalValueUsd: 254812.42,
    change24hPercent: 3.12,
    change24hUsd: 7721.17,
    ethBalanceNative: 4.182,
    gasReserveStatus: "SAFE",
    chainBreakdown: {
      Ethereum: 138420.11,
      Base: 52140.88,
      Solana: 12421.55,
      Arbitrum: 31900.42,
      Optimism: 18230.04,
      Polygon: 7700.00,
    },
  },
  positions: [
    { symbol:"ETH",   name:"Ether",          chain:"Ethereum", quantity:4.182,   valueUsd:14021.48, price:3353.21, color:"#627eea" },
    { symbol:"SOL",   name:"Solana",         chain:"Solana",   quantity:45.21,   valueUsd:6421.42,  price:142.01,  color:"#14f195" },
    { symbol:"WBTC",  name:"Wrapped Bitcoin",chain:"Ethereum", quantity:1.04,    valueUsd:71204.30, price:68465.67,color:"#f7931a" },
    { symbol:"USDC",  name:"USD Coin",       chain:"Base",     quantity:48210.21,valueUsd:48210.21, price:1.00,    color:"#2775ca" },
    { symbol:"JUP",   name:"Jupiter",        chain:"Solana",   quantity:2400,    valueUsd:2842.12,  price:1.18,    color:"#22d3ee" },
    { symbol:"stETH", name:"Lido stETH",     chain:"Ethereum", quantity:8.91,    valueUsd:29942.12, price:3360.06, color:"#00a3ff" },
    { symbol:"PYTH",  name:"Pyth Network",   chain:"Solana",   quantity:3142,    valueUsd:1421.18,  price:0.45,    color:"#9333ea" },
    { symbol:"ARB",   name:"Arbitrum",       chain:"Arbitrum", quantity:14820,   valueUsd:18421.84, price:1.243,   color:"#28a0f0" },
    { symbol:"OP",    name:"Optimism",       chain:"Optimism", quantity:6402,    valueUsd:14821.42, price:2.314,   color:"#ff0420" },
    { symbol:"AERO",  name:"Aerodrome",      chain:"Base",     quantity:9821,    valueUsd:9420.18,  price:0.959,   color:"#1f3a8a" },
  ],
  defiPositions: [
    { protocol:"Kamino",       chain:"Solana",   type:"Lending",   valueUsd:4200.55, apy:12.4 },
    { protocol:"Aave v3",      chain:"Ethereum", type:"Lending",   valueUsd:42000, apy:3.42, healthFactor:2.41 },
    { protocol:"Uniswap v4",   chain:"Base",     type:"LP",        valueUsd:18221, apy:8.91 },
    { protocol:"Pendle",       chain:"Arbitrum", type:"Yield",     valueUsd:9210,  apy:14.20 },
    { protocol:"Lido",         chain:"Ethereum", type:"Staking",   valueUsd:29942, apy:3.10 },
  ],
  alerts: [
    { id:"a1", type:"price",   severity:"warning",  title:"WBTC −3.1% in 1h",    message:"Position now $71,204 (was $73,492). Watch list.", timestamp:"14:18" },
    { id:"a2", type:"yield",   severity:"info",     title:"Pendle PT-eETH matures in 6d", message:"Plan rollover. APY rotation candidate.", timestamp:"13:02" },
    { id:"a3", type:"gas",     severity:"ok",       title:"Gas reserve SAFE",    message:"Multi-chain reserves monitored (ETH & SOL).", timestamp:"14:22" },
  ],
};

const PIPELINE_STAGES = [
  { id:"observe",   n:1, name:"Observe",   desc:"Zerion CLI · Multi-chain (EVM/SOL)", agent:"Observer" },
  { id:"reason",    n:2, name:"Reason",    desc:"Claude 3.5 Haiku · strategy analysis", agent:"Orchestrator" },
  { id:"plan",      n:3, name:"Plan",      desc:"Task Manager · TIS Construction", agent:"Task Manager" },
  { id:"authorize", n:4, name:"Authorize", desc:"Auditor · Policy Enforcement", agent:"Auditor" },
  { id:"execute",   n:5, name:"Execute",   desc:"LI.FI + Zerion CLI · Atomic Execution", agent:"Orchestrator" },
  { id:"verify",    n:6, name:"Verify",    desc:"On-chain receipt diffing", agent:"Observer" },
];

const PDR_QUEUE = [
  {
    pdrId:"pdr_4f9c2a",
    tisId:"tis_8e1b07",
    title:"Rebalance: USDC → stETH (Base)",
    reason:"TIS would rotate $12,000 USDC to stETH via 0x router. Slippage budget 0.30% within policy, but counterparty (0xRouter) freshness < 7d — outside default trust window.",
    impact:{ from:"12,000 USDC", to:"~3.57 stETH", chain:"Base", slippage:"0.30%" },
    timestamp:"14:21:46",
    severity:"medium",
  },
  {
    pdrId:"pdr_71be3d",
    tisId:"tis_a2c554",
    title:"Pendle rollover: PT-eETH → new market",
    reason:"Maturity in 6 days. Auto-rollover to Pendle PT-eETH-Jul. APY delta +1.2pp. Policy passes; surfaced for human signoff per quarterly governance rule.",
    impact:{ from:"5,200 PT-eETH", to:"5,200 PT-eETH-Jul", chain:"Arbitrum", slippage:"0.05%" },
    timestamp:"14:09:12",
    severity:"low",
  },
];

const RUNS_HISTORY = [
  { runId:"run_01HZQ9X7", finalStage:"verify",    duration:"42.1s", startedAt:"14:21",  hasError:false, date:"Today" },
  { runId:"run_01HZQ8K2", finalStage:"verify",    duration:"38.7s", startedAt:"13:48",  hasError:false, date:"Today" },
  { runId:"run_01HZQ7F1", finalStage:"authorize", duration:"19.2s", startedAt:"12:31",  hasError:true,  date:"Today" },
  { runId:"run_01HZQ6A9", finalStage:"verify",    duration:"40.0s", startedAt:"11:02",  hasError:false, date:"Today" },
  { runId:"run_01HZPRE4", finalStage:"verify",    duration:"44.3s", startedAt:"22:14",  hasError:false, date:"Yesterday" },
  { runId:"run_01HZPNB7", finalStage:"plan",      duration:"11.8s", startedAt:"19:48",  hasError:true,  date:"Yesterday" },
  { runId:"run_01HZPK22", finalStage:"verify",    duration:"39.9s", startedAt:"17:02",  hasError:false, date:"Yesterday" },
];

const SUGGESTIONS = [
  "Why is WBTC down today?",
  "Plan a $5k USDC → ETH on Base",
  "Show last failed PDR reason",
  "Trigger a dry-run pipeline",
];

function fmtUsd(n, opts={}){
  const { compact=false, dollars=true } = opts;
  if(compact && n>=1000){
    if(n>=1e6) return (dollars?"$":"")+(n/1e6).toFixed(2)+"M";
    if(n>=1e3) return (dollars?"$":"")+(n/1e3).toFixed(1)+"K";
  }
  return (dollars?"$":"")+n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
}
function fmtNum(n,d=4){ return Number(n).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:d}); }

Object.assign(window, {
  WALLET, SHORT_WALLET, OBSERVER_REPORT, PIPELINE_STAGES, PDR_QUEUE, RUNS_HISTORY, SUGGESTIONS,
  fmtUsd, fmtNum,
});

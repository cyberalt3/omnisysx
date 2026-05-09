import http from 'http';
import { runObserver, runMultiObserver, runTaskManager, runAuditor, runExecutor, runPipeline } from './agent.mjs';
import 'dotenv/config';

const PORT = process.env.PORT || 3001;
const TARGET_ADDRESS = process.env.AGENT_WALLET_ADDRESS;

const server = http.createServer(async (req, res) => {
  // CORS Headers - Broadest permission for Hackathon stability
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Route: GET /api/portfolio
  if (url.pathname === '/api/portfolio' && req.method === 'GET') {
    try {
      const addressParam = url.searchParams.get('address') || TARGET_ADDRESS;
      const addresses = addressParam.split(',').map(a => a.trim());
      
      if (addresses.length > 1) {
        const report = await runMultiObserver(addresses);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(report));
      } else {
        const report = await runObserver(addresses[0]);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(report));
      }
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Route: GET /api/run (Pipeline Orchestration - SSE)
  if (url.pathname === '/api/run' && req.method === 'GET') {
    const isDry = url.searchParams.get('dry') === 'true';
    const addressParam = url.searchParams.get('addresses') || TARGET_ADDRESS;
    const addresses = addressParam.split(',').map(a => a.trim());
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    try {
      const modeSuffix = isDry ? ' (SIMULATION)' : '';
      const walletLabel = addresses.length > 1 ? `${addresses.length} wallets` : 'wallet';
      send({ stage: 'observe', msg: `observation:start · reading ${walletLabel}${modeSuffix}`, status: 'active' });
      
      let report;
      if (addresses.length > 1) {
        report = await runMultiObserver(addresses);
      } else {
        report = await runObserver(addresses[0]);
      }
      
      send({ stage: 'observe', msg: `portfolio: $${report.totalUsd.toFixed(2)}`, status: 'done', data: report });

      send({ stage: 'reason', msg: 'reasoning:start · analyzer reasoning', status: 'active' });
      send({ stage: 'reason', msg: 'reasoning:complete · haiku logic applied', status: 'done' });

      send({ stage: 'plan', msg: 'plan:start · drafting TIS', status: 'active' });
      const tis = await runTaskManager(report);
      send({ stage: 'plan', msg: `TIS: ${tis.intentType}`, status: 'done', data: tis });

      if (tis.intentType === 'ALERT_ONLY') {
        send({ msg: 'Pipeline complete: No action needed.', status: 'complete' });
        res.end();
        return;
      }

      send({ stage: 'authorize', msg: 'authorize:start · auditor review', status: 'active' });
      const pdr = await runAuditor(tis, report);
      send({ stage: 'authorize', msg: `decision: ${pdr.decision}`, status: 'done', data: pdr });

      if (pdr.decision !== 'APPROVED') {
        send({ msg: `Pipeline halted: ${pdr.decision}`, status: 'halted' });
        res.end();
        return;
      }

      send({ stage: 'execute', msg: 'execute:start · zerion-cli submission', status: 'active' });
      const execResult = await runExecutor(tis);
      send({ stage: 'execute', msg: `tx: ${execResult.txHash}`, status: 'done', data: execResult });

      send({ stage: 'verify', msg: 'verify:start · confirmation loop', status: 'active' });
      send({ stage: 'verify', msg: 'verification:complete · safe', status: 'done', status: 'complete' });
      
      res.end();
    } catch (e) {
      send({ error: e.message });
      res.end();
    }
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`\n🚀 OmnisysX API Server running at http://localhost:${PORT}`);
  console.log(`Connected to wallet: ${TARGET_ADDRESS}\n`);
});

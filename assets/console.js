// TIDE console: create the launchpad, claim, fill each coin's reserve, defend a coin under its support line. Every transaction is signed in the visitor's wallet.
(() => {
  const $ = s => document.querySelector(s); const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = { wallet: null, p: null, plan: null }; const short = a => a ? a.slice(0, 4) + '…' + a.slice(-4) : '';
  const JUP = 'https://lite-api.jup.ag', SOL = 'So11111111111111111111111111111111111111112';
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3200); };
  const stat = id => (m, c = '') => { const el = $(id); el.className = 'stat ' + c; el.innerHTML = m; };
  async function api(a, body, q = '') { const r = await fetch('/api/tide?a=' + a + q, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}); const j = await r.json().catch(() => ({ error: 'bad response' })); if (!r.ok || j.error) throw new Error(j.error || r.statusText); return j; }
  const providers = () => [['Phantom', window.phantom && window.phantom.solana], ['Solflare', window.solflare && window.solflare.isSolflare && window.solflare], ['Backpack', window.backpack]].filter(([, p]) => p);
  async function connect() { if (S.wallet) return S.wallet; const ps = providers(); if (!ps.length) { toast('no Solana wallet found: open this page in Phantom, Solflare or Backpack'); throw new Error('no wallet'); }
    const [name, p] = ps[0]; const r = await p.connect(); S.wallet = ((r && r.publicKey) || p.publicKey).toString(); S.p = p; $('#connect').textContent = name + ' · ' + short(S.wallet); refresh(); return S.wallet; }
  $('#connect').onclick = () => connect().catch(() => {});
  const b64 = u => { let s = ''; u.forEach(c => s += String.fromCharCode(c)); return btoa(s); }, unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function signSend(list, st, versioned) { const W = solanaWeb3; const txs = list.map(t => versioned ? W.VersionedTransaction.deserialize(unb64(t)) : W.Transaction.from(unb64(t)));
    st('check your wallet…'); const signed = S.p.signAllTransactions ? await S.p.signAllTransactions(txs) : [await S.p.signTransaction(txs[0])];
    st('sending…'); return api('send', { txs: signed.map(t => b64(t.serialize())) }); }
  const tx = sig => `<a href="https://solscan.io/tx/${sig}" target="_blank" rel="noopener">${short(sig)} ↗</a>`;
  async function refresh() { if (!S.wallet) return; try { const p = await api('pad', null, '&admin=' + S.wallet);
      $('#padInfo').textContent = p.exists ? `launchpad ${short(p.id)} · ${p.feePct}% fee · LP ${p.lp.burn}% burned` : 'no launchpad on this wallet yet';
      $('#vaultInfo').textContent = p.exists ? `${p.unclaimedSol.toFixed(4)} SOL waiting in LaunchLab's vault` : ''; S.pad = p.exists ? p.id : null; } catch (e) { $('#padInfo').textContent = e.message; } }
  $('#padBtn').onclick = async () => { const st = stat('#padStat'); try { await connect(); st('building the LaunchLab transaction…');
      const r = await api('buildPad', { wallet: S.wallet, feePct: 1, burnPct: 50, web: location.origin, img: location.origin + '/coin.png' }); const s = await signSend(r.txs, st);
      st(`the TIDE launchpad is live: <b>${esc(r.pad)}</b>\ntransaction ${tx(s.sigs[0])}\nsend this launchpad address over so the site can pin it.`, 'ok'); setTimeout(refresh, 2500); } catch (e) { st(esc(e.message), 'err'); } };
  $('#claimBtn').onclick = async () => { const st = stat('#claimStat'); try { await connect(); st('building the claim…'); const r = await api('claim', { wallet: S.wallet }); const s = await signSend(r.txs, st); st(`claimed. ${tx(s.sigs[0])}`, 'ok'); setTimeout(refresh, 2500); } catch (e) { st(esc(e.message), 'err'); } };
  // buy a coin's hedge: spend SOL across its hedge, by the weights in its metadata link
  S.coins = []; S.hedges = [];
  async function loadCoins() { try { const [c, b] = await Promise.all([api('coins'), api('basket')]); S.coins = c.coins || []; S.hedges = b.hedges || [];
      fillDefend(); $('#coinSel').innerHTML = S.coins.length ? S.coins.map(k => `<option value="${k.mint}">$${esc(k.symbol)} · ${(k.hedge || []).map(p => p.w + '% ' + p.code).join(' ') || 'no hedge'}${k.volumeUsd ? ' · fees ≈ $' + (k.volumeUsd * .01).toFixed(2) : ''}</option>`).join('') : `<option value="">${c.open ? 'no coins on the launchpad yet' : 'the launchpad is not pinned on the site yet'}</option>`; } catch (e) { $('#coinSel').innerHTML = `<option value="">${esc(e.message)}</option>`; } }
  loadCoins();

  // defend a coin: under its support line, sell a slice of its hedge into the coin, then burn what was bought
  const D = { plan: null };
  const GT = 'https://api.geckoterminal.com/api/v2/networks/solana';
  function fillDefend() { $('#dCoin').innerHTML = S.coins.length ? S.coins.map(k => `<option value="${k.mint}">$${esc(k.symbol)} · ${(k.hedge || []).map(p => p.w + '% ' + p.code).join(' ') || 'no reserve mix'}</option>`).join('') : '<option value="">no coins on the launchpad yet</option>'; }
  const coinOf = () => S.coins.find(x => x.mint === $('#dCoin').value);
  $('#dCheck').onclick = async () => { const st = stat('#dStat'); try { const k = coinOf(); if (!k) throw new Error('pick a coin'); if (!k.pool) throw new Error('no pool id for this coin');
      st('reading 24 hours of prices…'); const o = await fetch(`${GT}/pools/${k.pool}/ohlcv/hour?aggregate=1&limit=24&currency=usd&token=${k.mint}`).then(r => r.json());
      const L = (o.data && o.data.attributes && o.data.attributes.ohlcv_list) || []; if (!L.length) throw new Error('GeckoTerminal has no candles for this pool yet');
      const hi = Math.max(...L.map(r => +r[2])), last = +L.sort((a, b) => b[0] - a[0])[0][4], line = hi * .7, under = last < line;
      $('#dInfo').innerHTML = `<span>24h high</span><b>$${hi.toPrecision(4)}</b><span>support line</span><b>$${line.toPrecision(4)} (30% under)</b><span>last price</span><b>$${last.toPrecision(4)} · ${((last / hi - 1) * 100).toFixed(1)}% from the high</b><span>status</span><b>${under ? 'UNDER the line: a buyback is allowed' : 'above the line: no buyback'}</b>`;
      st(under ? 'under the line. plan a buyback.' : 'above the line. the rule says wait.', under ? 'ok' : ''); } catch (e) { st(esc(e.message), 'err'); } };
  $('#dPlan').onclick = async () => { const st = stat('#dStat'); try { await connect(); const k = coinOf(); if (!k) throw new Error('pick a coin'); if (!(k.hedge || []).length) throw new Error('this coin has no reserve mix in its metadata');
      const pctv = Math.max(1, Math.min(20, +$('#dPct').value || 0)); st('reading the reserve…'); const h = await api('holdings', null, '&wallet=' + S.wallet);
      D.plan = k.hedge.map(p => { const x = (h.holdings || []).find(y => y.code === p.code); const raw = x ? BigInt(x.raw || '0') * BigInt(Math.round(pctv * 100)) / 10000n : 0n; return { code: p.code, sym: x ? x.symbol : p.code, mint: x && x.mint, raw, ui: x ? x.amount * pctv / 100 : 0, usd: x ? x.usd * pctv / 100 : 0 }; }).filter(x => x.mint && x.raw > 0n);
      $('#dPlanList').innerHTML = D.plan.map(x => `<div><b>${esc(x.sym)}</b><span>sell ${x.ui.toPrecision(4)}</span><span>≈ $${x.usd.toFixed(2)}</span><span>→ $${esc(k.symbol)}</span></div>`).join('');
      $('#dBuy').disabled = !D.plan.length; st(D.plan.length ? `ready: ${D.plan.length} swap${D.plan.length > 1 ? 's' : ''} into $${esc(k.symbol)} through Jupiter.` : 'the reserve holds none of this coin\'s hedge yet. fill it first (step 03).'); } catch (e) { st(esc(e.message), 'err'); } };
  $('#dBuy').onclick = async () => { const st = stat('#dStat'); try { await connect(); const k = coinOf(); if (!D.plan || !D.plan.length || !k) throw new Error('plan first'); st('getting Jupiter routes…'); const list = [];
      for (const x of D.plan) { const q = await fetch(`${JUP}/swap/v1/quote?inputMint=${x.mint}&outputMint=${k.mint}&amount=${x.raw.toString()}&slippageBps=300`).then(r => r.json()); if (!q.outAmount) throw new Error('no Jupiter route from ' + x.sym + ' into the coin right now');
        const s = await fetch(`${JUP}/swap/v1/swap`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ quoteResponse: q, userPublicKey: S.wallet, wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: { priorityLevelWithMaxLamports: { maxLamports: 300000, priorityLevel: 'high' } } }) }).then(r => r.json());
        if (!s.swapTransaction) throw new Error('Jupiter returned no swap for ' + x.sym); list.push(s.swapTransaction); }
      const r = await signSend(list, st, true); st(`bought back. ${r.sigs.map(tx).join(' · ')}\nnow burn what the reserve bought.`, 'ok'); $('#dBuy').disabled = true; } catch (e) { st(esc(e.message), 'err'); } };
  $('#dBurn').onclick = async () => { const st = stat('#dStat'); try { await connect(); const k = coinOf(); if (!k) throw new Error('pick a coin'); st('reading the reserve\'s balance of the coin…');
      const b = await api('bal', null, `&wallet=${S.wallet}&mint=${k.mint}`), accs = (b.accounts || []).filter(a => BigInt(a.raw) > 0n); if (!accs.length) throw new Error('the reserve holds none of $' + k.symbol);
      const W = solanaWeb3, owner = new W.PublicKey(S.wallet), mint = new W.PublicKey(k.mint), t = new W.Transaction();
      for (const a of accs) { const data = new Uint8Array(9); data[0] = 8; new DataView(data.buffer).setBigUint64(1, BigInt(a.raw), true);
        t.add(new W.TransactionInstruction({ programId: new W.PublicKey(a.program), keys: [{ pubkey: new W.PublicKey(a.address), isSigner: false, isWritable: true }, { pubkey: mint, isSigner: false, isWritable: true }, { pubkey: owner, isSigner: true, isWritable: false }], data })); }
      const bh = await api('bh'); t.recentBlockhash = bh.blockhash; t.feePayer = owner; st('check your wallet…'); const sg = await S.p.signTransaction(t);
      st('sending…'); const r = await api('send', { txs: [b64(sg.serialize())] }); st(`burned. ${tx(r.sigs[0])}`, 'ok'); } catch (e) { st(esc(e.message), 'err'); } };
  $('#planBtn').onclick = async () => { const st = stat('#buyStat'); try { await connect(); const k = S.coins.find(x => x.mint === $('#coinSel').value); if (!k) throw new Error('pick a coin'); if (!(k.hedge || []).length) throw new Error('this coin has no hedge in its metadata');
      st('reading this wallet…'); const h = await api('holdings', null, '&wallet=' + S.wallet); const spend = Math.min(+$('#spendSol').value || 0, Math.max(0, h.sol - .05)); if (spend < .01) throw new Error(`not enough SOL: this wallet has ${h.sol.toFixed(3)} SOL and keeps 0.05 for fees`);
      S.plan = k.hedge.map(p => ({ m: S.hedges.find(x => x.code === p.code), sol: spend * p.w / 100, w: p.w })).filter(x => x.m && x.sol >= .005);
      $('#plan').innerHTML = S.plan.map(x => `<div><b>${esc(x.m.symbol)}</b><span>${esc(x.m.name)}</span><span>${x.w}%</span><span>buy ${x.sol.toFixed(4)} SOL</span></div>`).join('');
      $('#buyBtn').disabled = !S.plan.length; st(S.plan.length ? `ready: ${S.plan.length} swap${S.plan.length > 1 ? 's' : ''} through Jupiter for $${esc(k.symbol)}.` : 'nothing to buy.'); } catch (e) { st(esc(e.message), 'err'); } };
  $('#buyBtn').onclick = async () => { const st = stat('#buyStat'); try { await connect(); if (!S.plan || !S.plan.length) throw new Error('plan first'); st('getting Jupiter routes…'); const list = [];
      for (const x of S.plan) { const lam = Math.floor(x.sol * 1e9); const q = await fetch(`${JUP}/swap/v1/quote?inputMint=${SOL}&outputMint=${x.m.mint}&amount=${lam}&slippageBps=150`).then(r => r.json()); if (!q.outAmount) throw new Error('no Jupiter route for ' + x.m.symbol + ' right now');
        const s = await fetch(`${JUP}/swap/v1/swap`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ quoteResponse: q, userPublicKey: S.wallet, wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: { priorityLevelWithMaxLamports: { maxLamports: 300000, priorityLevel: 'high' } } }) }).then(r => r.json());
        if (!s.swapTransaction) throw new Error('Jupiter returned no swap for ' + x.m.symbol); list.push(s.swapTransaction); }
      const r = await signSend(list, st, true); st(`bought the hedge. ${r.sigs.map(tx).join(' · ')}`, 'ok'); $('#buyBtn').disabled = true; } catch (e) { st(esc(e.message), 'err'); } };
  const ps = providers(); if (ps.length && ps[0][1].connect) ps[0][1].connect({ onlyIfTrusted: true }).then(r => { if (r && r.publicKey) { S.wallet = r.publicKey.toString(); S.p = ps[0][1]; $('#connect').textContent = ps[0][0] + ' · ' + short(S.wallet); refresh(); } }).catch(() => {});
})();

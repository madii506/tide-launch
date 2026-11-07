// TIDE: every coin gets a support line. Live data from /api/tide (Dexscreener prices, Raydium's launch index, the reserve wallet).
(() => {
  const $ = (s, e = document) => e.querySelector(s), $$ = (s, e = document) => [...e.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches, DPR = Math.min(2, devicePixelRatio || 1);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const usd = (x, d) => x == null || !isFinite(x) ? '—' : '$' + Math.abs(+x).toLocaleString('en-US', { minimumFractionDigits: d ?? (Math.abs(x) >= 1 ? 2 : 4), maximumFractionDigits: d ?? (Math.abs(x) >= 1 ? 2 : 4) });
  const big = x => x == null || !isFinite(x) ? '—' : x >= 1e6 ? '$' + (x / 1e6).toFixed(2) + 'M' : x >= 1e3 ? '$' + (x / 1e3).toFixed(1) + 'K' : usd(x, 0);
  const spct = x => x == null || !isFinite(x) ? '—' : (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(2) + '%', cls = x => x == null ? '' : x < 0 ? 'dn' : 'up';
  const short = a => a ? a.slice(0, 4) + '…' + a.slice(-4) : '';
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const HCOL = { G: '#f5c542', P: '#e8a93a', X: '#d4913a', S: '#c3cee0', Q: '#5b8cff', V: '#4fd1c5', U: '#22d1f8', T: '#3fe6a6', E: '#8fa8ff' };
  const MONO = { G: 'Au', P: 'PX', X: 'XT', S: 'Ag', Q: 'SQ', V: 'VX', U: '$', T: '₮', E: '€' };
  const badge = c => `<span class="mb" style="--c:${HCOL[c]}">${MONO[c] || c}</span>`;
  const S = { b: null, coins: null, tre: null };
  const HG = () => (S.b && S.b.hedges) || [], HBY = c => HG().find(h => h.code === c);
  const mixOf = h => { const o = {}; [...String(h || '').matchAll(/([A-Z])(\d+)/g)].forEach(m => o[m[1]] = +m[2]); return o; };
  const presets = () => (S.b && S.b.presets) || [];
  const equalSplit = codes => { const n = codes.length, base = Math.floor(100 / n), o = {}; codes.forEach((c, i) => o[c] = base + (i < 100 - base * n ? 1 : 0)); return o; };
  const setT = (sel, v, c) => { const el = $(sel); if (!el) return; el.textContent = v; if (c !== undefined) el.className = c; };
  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 3400); }
  async function api(a, q = '') { const r = await fetch('/api/tide?a=' + a + q); const j = await r.json().catch(() => ({ error: 'bad response' })); if (!r.ok || j.error) throw new Error(j.error || r.statusText); return j; }
  async function apiPost(a, body) { const r = await fetch('/api/tide?a=' + a, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({ error: 'bad response' })); if (!r.ok || j.error) throw new Error(j.error || r.statusText); return j; }

  // ---------------------------------------------------------------- the sea: silk lines that breathe, the tide rises as you scroll
  function sea() { const c = $('#sea'), g = c.getContext('2d'); let W, H, t0 = performance.now(), skip = false; const LO = innerWidth < 700;
    const size = () => { W = innerWidth; H = innerHeight; c.width = W * DPR; c.height = H * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0); }; size(); addEventListener('resize', size);
    const R = [{ n: LO ? 34 : 64, y: .86, lift: .26, sig: .22, w: 100, f: 1.1, ph: .6, tw: 2.6, a: 18, f2: 1.6, sp: .09, col: [150, 220, 255], al: .07 }, { n: LO ? 26 : 50, y: .96, lift: .18, sig: .34, w: 80, f: .8, ph: 2.4, tw: 2.8, a: 24, f2: 1.2, sp: -.06, col: [90, 160, 245], al: .06 }, { n: LO ? 20 : 36, y: .78, lift: .1, sig: .5, w: 60, f: 1.6, ph: 4.1, tw: 1.6, a: 14, f2: 2.1, sp: .05, col: [170, 230, 255], al: .045 }];
    function frame(now) { requestAnimationFrame(frame); if (document.hidden || (skip = !skip)) return; const t = RM ? 8 : (now - t0) / 1000, tide = clamp(scrollY / (document.documentElement.scrollHeight - innerHeight || 1)) * .16;
      g.clearRect(0, 0, W, H); const bg = g.createRadialGradient(W / 2, H * .3, 10, W / 2, H * .5, Math.max(W, H) * .8); bg.addColorStop(0, '#0d2036'); bg.addColorStop(.5, '#07121f'); bg.addColorStop(1, '#03070e'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      for (const o of R) for (let i = 0; i < o.n; i++) { const k = i / (o.n - 1); g.beginPath();
        for (let x = -20; x <= W + 20; x += LO ? 10 : 7) { const u = x / W, lift = H * o.lift * Math.exp(-Math.pow((u - .5) / o.sig, 2)), tw = Math.sin(u * o.f * 6.283 + o.ph + k * o.tw + t * o.sp * 2), y = H * (o.y - tide) - lift + (k - .5) * o.w * (.35 + .65 * Math.abs(tw)) + o.a * Math.sin(u * o.f2 * 6.283 + t * o.sp * 3 + k * .9); x < -19 ? g.moveTo(x, y) : g.lineTo(x, y); }
        g.strokeStyle = `rgba(${o.col.join(',')},${o.al * (.4 + .6 * Math.sin(k * Math.PI))})`; g.lineWidth = .8; g.stroke(); }
      g.globalCompositeOperation = 'source-over'; }
    requestAnimationFrame(frame); }

  // ---------------------------------------------------------------- the support line, as an illustration you can push around
  function sim() { const c = $('#simCv'); if (!c) return; const g = c.getContext('2d'); let vis = false; new IntersectionObserver(e => vis = e[0].isIntersecting).observe(c);
    const N = 220, WIN = 90; let P, R, buys, burn, cool, mode, crashT, marks;
    const reset = () => { P = [100]; for (let i = 1; i < N; i++) P.push(P[i - 1] * Math.exp(.0006 + .006 * gauss())); R = 40; buys = 0; burn = 0; cool = 0; mode = 'calm'; crashT = 0; marks = []; setMode('calm'); };
    function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * v); }
    function setMode(m) { mode = m; if (m === 'crash') crashT = 70; $$('.sim-bar .chip').forEach(b => b.classList.toggle('on', b.dataset.m === m)); }
    $$('.sim-bar .chip').forEach(b => b.addEventListener('click', () => { if (b.dataset.m === 'reset') return reset(); setMode(b.dataset.m); }));
    reset(); let last = 0;
    function step() { const crash = mode === 'crash' && crashT-- > 0; if (mode === 'crash' && crashT <= 0) setMode('calm');
      let p = P[P.length - 1] * Math.exp(crash ? -.012 + .014 * gauss() : .0006 + .0065 * gauss()); R = Math.min(100, R + (crash ? .5 : .32));
      const hi = Math.max(...P.slice(-WIN)), line = hi * .7; cool = Math.max(0, cool - 1);
      if (p < line && R > 4 && cool === 0) { const spend = R * .2; R -= spend; buys++; burn += spend * 1.7; p *= 1 + spend * .006; cool = 22; marks.push({ i: P.length, p }); }
      P.push(p); if (P.length > N) { P.shift(); marks.forEach(m => m.i--); marks = marks.filter(m => m.i >= 0); }
      return { hi, line, p }; }
    function draw(now) { requestAnimationFrame(draw); if (!vis || document.hidden || now - last < 70) return; last = now; const st = step();
      const w = c.clientWidth, h = c.clientHeight; if (c.width !== w * DPR) { c.width = w * DPR; c.height = h * DPR; } g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, w, h);
      const lo = Math.min(...P, st.line) * .96, hi = Math.max(...P) * 1.03, X = i => i / (N - 1) * (w - 64), Y = v => 10 + (h - 30) * (1 - (v - lo) / (hi - lo));
      g.strokeStyle = 'rgba(168,230,255,.06)'; g.lineWidth = 1; for (let k = 1; k < 4; k++) { const y = 10 + (h - 30) * k / 4; g.beginPath(); g.moveTo(0, y); g.lineTo(w - 64, y); g.stroke(); }
      const ly = Y(st.line); g.fillStyle = 'rgba(255,107,129,.06)'; g.fillRect(0, ly, w - 64, h - 20 - ly);
      g.setLineDash([7, 7]); g.strokeStyle = 'rgba(168,230,255,.85)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, ly); g.lineTo(w - 64, ly); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#a8e6ff'; g.font = '600 11.5px IN, sans-serif'; g.fillText('support line', 6, ly - 7);
      const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#a8e6ff'); gr.addColorStop(1, '#3d8ff0');
      g.save(); g.shadowColor = 'rgba(98,194,246,.6)'; g.shadowBlur = 12; g.strokeStyle = gr; g.lineWidth = 2.6; g.lineJoin = 'round'; g.beginPath(); P.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); g.stroke(); g.restore();
      for (const m of marks) { const x = X(m.i), y = Y(m.p); g.beginPath(); g.arc(x, y, 5.5, 0, 6.3); g.fillStyle = '#a8e6ff'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#040a14'; g.stroke(); g.fillStyle = 'rgba(168,230,255,.9)'; g.font = '700 10.5px IN, sans-serif'; g.fillText('buy', x - 9, y + 19); }
      const lx = X(P.length - 1), lyy = Y(st.p); g.beginPath(); g.arc(lx, lyy, 4.5, 0, 6.3); g.fillStyle = st.p < st.line ? '#ff6b81' : '#46e3b0'; g.fill();
      g.font = '700 12px JB, monospace'; g.fillStyle = st.p < st.line ? '#ff6b81' : '#e9f5ff'; g.fillText(st.p.toFixed(1), lx + 10, lyy + 4);
      $('#vessel').style.setProperty('--lvl', R.toFixed(0) + '%'); setT('#vLvl', R.toFixed(0) + '%'); setT('#vLine', st.line.toFixed(1)); setT('#vPx', st.p.toFixed(1)); setT('#vBuys', buys); setT('#vBurn', burn.toFixed(0) + ' coins');
      const s = $('#vStat'), under = st.p < st.line; s.classList.toggle('under', under); s.textContent = under ? (cool > 0 ? 'under the line · reserve bought, cooling' : 'under the line · reserve buying') : 'above the line · reserve filling'; }
    requestAnimationFrame(draw); }

  // ---------------------------------------------------------------- donuts
  function donut(svg, mix, label) { if (!svg) return; const r = 92, C = 2 * Math.PI * r, codes = Object.keys(mix), tot = codes.reduce((a, c) => a + mix[c], 0) || 1; let off = 0;
    if (!svg.dataset.on) { svg.dataset.on = 1; svg.innerHTML = `<circle cx="120" cy="120" r="${r}" stroke="rgba(168,230,255,.07)"></circle>` + [0, 1, 2, 3].map(() => `<circle cx="120" cy="120" r="${r}" transform="rotate(-90 120 120)" stroke-dasharray="0 ${C}"></circle>`).join('') + `<text x="120" y="116" text-anchor="middle" fill="#e9f5ff" style="font:700 30px ID,sans-serif;letter-spacing:-1px"></text><text x="120" y="142" text-anchor="middle" fill="#8297b1" style="font:500 12px IN,sans-serif">assets</text>`; }
    $$('circle', svg).slice(1).forEach((el, i) => { const c = codes[i], len = c ? mix[c] / tot * C : 0; el.setAttribute('stroke', c ? HCOL[c] : 'transparent'); el.setAttribute('stroke-dasharray', `${Math.max(0, len - 3)} ${C}`); el.setAttribute('stroke-dashoffset', -off); off += len; });
    const t = $$('text', svg); t[0].textContent = label ?? codes.length; }
  const mixText = mix => Object.keys(mix).map(c => `${mix[c]}% ${HBY(c) ? HBY(c).name.toLowerCase() : c}`).join(' · ');

  // ---------------------------------------------------------------- the story: steps follow the panels
  function story() { const panels = $$('.panel'), steps = $$('.step'); const on = i => { panels.forEach(p => p.classList.toggle('on', +p.dataset.i === i)); steps.forEach(s => s.classList.toggle('on', +s.dataset.i === i)); };
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) on(+e.target.dataset.i); }), { rootMargin: '-45% 0px -45% 0px' }); panels.forEach(p => io.observe(p));
    steps.forEach(s => s.addEventListener('click', () => panels[+s.dataset.i].scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' })));
    let k = 0; setInterval(() => { if (!S.b || document.hidden) return; const p = presets(); if (!p.length) return; k = (k + 1) % p.length; const m = mixOf(p[k].h); donut($('#howDonut'), m); setT('#howMix', p[k].name); setT('#howTxt', mixText(m)); }, 2600); }

  // ---------------------------------------------------------------- live numbers
  function renderLive() { const b = S.b, spy = b.benchmark && b.benchmark.price; if (spy) setT('#lSpy', spct(spy.ch24), cls(spy.ch24));
    const st = (b.stocks || []).filter(x => x.price && x.price.ch24 != null); if (st.length) setT('#lDn', `${st.filter(x => x.price.ch24 < 0).length} of ${st.length}`);
    const m = mixOf((presets().find(p => p.id === 'shield') || {}).h); let s = 0, n = 0; for (const [c, w] of Object.entries(m)) { const h = HBY(c), v = h && h.price && h.price.ch24; if (v == null) continue; s += w * v; n += w; } if (n) setT('#lStorm', spct(s / n), cls(s / n));
    if (!$('#howDonut').dataset.on) { const p = presets()[0]; if (p) { donut($('#howDonut'), mixOf(p.h)); setT('#howMix', p.name); setT('#howTxt', mixText(mixOf(p.h))); } } }

  // ---------------------------------------------------------------- the wallet
  const WL = { pk: null, p: null, name: '' };
  const providers = () => [['Phantom', window.phantom && window.phantom.solana], ['Solflare', window.solflare && window.solflare.isSolflare && window.solflare], ['Backpack', window.backpack]].filter(([, p]) => p);
  const walletUi = () => { $('#wallet').textContent = WL.pk ? short(WL.pk) : 'Connect wallet'; launchBtn(); };
  async function connect() { if (WL.pk) return WL.pk; const ps = providers(); if (!ps.length) { toast('No Solana wallet found. Open this page in Phantom, Solflare or Backpack.'); throw new Error('no wallet'); }
    const [name, p] = ps[0]; const r = await p.connect(); WL.pk = ((r && r.publicKey) || p.publicKey).toString(); WL.p = p; WL.name = name; walletUi(); return WL.pk; }
  function walletInit() { $('#wallet').addEventListener('click', async () => { if (WL.pk) { try { await WL.p.disconnect(); } catch (e) { } WL.pk = null; walletUi(); toast('Wallet disconnected.'); return; } try { await connect(); toast('Connected ' + WL.name + ' · ' + short(WL.pk)); } catch (e) { } });
    const ps = providers(); if (ps.length && ps[0][1].connect) ps[0][1].connect({ onlyIfTrusted: true }).then(r => { if (r && r.publicKey) { WL.pk = r.publicKey.toString(); WL.p = ps[0][1]; WL.name = ps[0][0]; walletUi(); } }).catch(() => { }); }
  let w3 = null; const web3 = () => w3 || (w3 = new Promise((ok, no) => { if (window.solanaWeb3) return ok(window.solanaWeb3); const s = document.createElement('script'); s.src = '/assets/web3.min.js'; s.onload = () => ok(window.solanaWeb3); s.onerror = () => no(new Error('could not load the signer')); document.head.append(s); }));
  const b64 = u => { let s = ''; u.forEach(c => s += String.fromCharCode(c)); return btoa(s); }, unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  // ---------------------------------------------------------------- the launcher
  const LN = { preset: 'classic', sel: { G: 25, Q: 25, V: 25, U: 25 }, img: '1', busy: false, on: false };
  const hedgeStr = () => Object.entries(LN.sel).map(([c, w]) => c + w).join('');
  function launchInit() { if (LN.on || !HG().length) return; LN.on = true;
    $('#presets').innerHTML = presets().map(p => `<button class="chip" data-p="${p.id}">${esc(p.name)}</button>`).join('') + '<button class="chip" data-p="custom">Custom</button>';
    $('#presets').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; LN.preset = b.dataset.p; if (LN.preset !== 'custom') LN.sel = mixOf(presets().find(p => p.id === LN.preset).h); renderLauncher(); });
    $('#assets').innerHTML = HG().map(h => `<button class="asset" data-c="${h.code}" style="--c:${HCOL[h.code]}">${badge(h.code)}<span><b>${esc(h.symbol)}</b><small>${esc(h.name)}</small></span><span class="p"><span class="px"></span><small class="ch"></small></span></button>`).join('');
    $('#assets').addEventListener('click', e => { const b = e.target.closest('.asset'); if (!b) return; const c = b.dataset.c, codes = Object.keys(LN.sel); const next = codes.includes(c) ? codes.filter(x => x !== c) : [...codes, c]; if (!next.length) return; if (next.length > 4) { toast('Up to four assets per reserve.'); return; } LN.preset = 'custom'; LN.sel = equalSplit(next); renderLauncher(); });
    $('#imgs').innerHTML = [1, 2, 3, 4, 5, 6].map(i => `<button data-i="${i}" aria-label="image ${i}"><img src="/coins/${i}.png" alt=""></button>`).join('');
    $('#imgs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; LN.img = b.dataset.i; $('#cImg').value = ''; renderLauncher(); });
    ['#cName', '#cSym', '#cImg', '#cBuy'].forEach(id => $(id).addEventListener('input', () => { if (id === '#cSym') $(id).value = $(id).value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (id === '#cImg') LN.img = $('#cImg').value.trim() || '1'; renderLauncher(); }));
    $('#launchBtn').addEventListener('click', doLaunch); renderLauncher(); }
  function renderPrices() { HG().forEach(h => { const b = $(`.asset[data-c="${h.code}"]`); if (!b) return; const p = h.price || {}; $('.px', b).textContent = usd(p.usd); const c = $('.ch', b); c.textContent = spct(p.ch24); c.className = 'ch ' + cls(p.ch24); }); }
  function renderLauncher() { $$('#presets .chip').forEach(b => b.classList.toggle('on', b.dataset.p === LN.preset)); const codes = Object.keys(LN.sel);
    $$('.asset').forEach(b => { const on = codes.includes(b.dataset.c); b.classList.toggle('on', on); b.disabled = !on && codes.length >= 4; });
    donut($('#mixDonut'), LN.sel); setT('#splitTxt', mixText(LN.sel));
    const custom = /^https:\/\//.test(LN.img); $$('#imgs button').forEach(b => b.classList.toggle('on', !custom && b.dataset.i === LN.img));
    const name = $('#cName').value.trim() || 'Your coin', sym = $('#cSym').value.trim() || 'TICKER', src = custom ? LN.img : `/coins/${/^[1-6]$/.test(LN.img) ? LN.img : 1}.png`;
    $('#prev').innerHTML = `<img src="${esc(src)}" alt="" onerror="this.src='/coins/1.png'"><b>${esc(name)}</b><small>$${esc(sym)} · support line 30% under the 24h high</small><div class="mix">${codes.map(c => `<span style="--c:${HCOL[c]}">${LN.sel[c]}% ${esc(HBY(c) ? HBY(c).symbol : c)}</span>`).join('')}</div>`;
    launchBtn(); }
  function launchBtn() { const b = $('#launchBtn'), open = S.b && S.b.pad, ps = $('#padSt'); if (!b) return;
    if (ps && S.b) { ps.className = 'padst' + (open ? ' open' : ''); ps.innerHTML = `<i></i>${open ? 'launchpad open · ' + short(S.b.pad) : 'launchpad opening soon'}`; }
    if (LN.busy) return; if (!WL.pk) { b.textContent = 'Connect wallet'; b.disabled = false; return; } b.textContent = open ? 'Launch on Raydium →' : 'Launchpad opening soon'; b.disabled = !open; }
  async function doLaunch() { const st = (m, c = '') => { const el = $('#lstat'); el.className = 'lstat ' + c; el.innerHTML = m; };
    if (LN.busy) return; try { if (!WL.pk) { await connect(); return; }
      if (!(S.b && S.b.pad)) { st('The TIDE launchpad isn’t open yet. This button lights up the moment it is.'); return; }
      const name = $('#cName').value.trim(), symbol = $('#cSym').value.trim(); if (name.length < 2) throw new Error('Give your coin a name.'); if (symbol.length < 2) throw new Error('Give your coin a ticker.');
      LN.busy = true; $('#launchBtn').disabled = true; st('building your launch on Raydium LaunchLab…');
      const r = await apiPost('buildLaunch', { wallet: WL.pk, pad: S.b.pad, name, symbol, image: LN.img, hedge: hedgeStr(), buySol: +$('#cBuy').value || 0 });
      const W = await web3(); const txs = r.txs.map(t => W.Transaction.from(unb64(t))); st('check your wallet…');
      const signed = WL.p.signAllTransactions ? await WL.p.signAllTransactions(txs) : [await WL.p.signTransaction(txs[0])]; st('sending…');
      const s = await apiPost('send', { txs: signed.map(t => b64(t.serialize())) });
      st(`$${esc(symbol)} is live with its support line.\nmint <b>${esc(r.mint)}</b>\n<a href="https://raydium.io/launchpad/token/?mint=${r.mint}" target="_blank" rel="noopener">open it on Raydium ↗</a> · <a href="https://solscan.io/tx/${s.sigs[0]}" target="_blank" rel="noopener">transaction ↗</a>`, 'ok'); setTimeout(loadCoins, 4000);
    } catch (e) { if (e.message !== 'no wallet') st(esc(e.message || String(e)), 'err'); } finally { LN.busy = false; launchBtn(); } }

  // ---------------------------------------------------------------- coins, the 1%, the reserve
  async function loadCoins() { const el = $('#coinGrid'); try { const c = await api('coins'); S.coins = c;
      if (!c.open) { el.innerHTML = '<div class="empty">The TIDE launchpad opens soon. The first coin with a support line shows up here.</div>'; return; }
      if (!c.coins.length) { el.innerHTML = '<div class="empty">No coins yet. The first one launched here shows up on this board.</div>'; return; }
      el.innerHTML = c.coins.map(k => `<a class="card coin" href="https://raydium.io/launchpad/token/?mint=${k.mint}" target="_blank" rel="noopener"><img src="${esc(k.image || '/coins/1.png')}" alt="" onerror="this.src='/coins/1.png'"><b>${esc(k.name)}</b><span class="mc">${big(k.mcapUsd)}</span><small>$${esc(k.symbol)}</small><span></span><div class="mix">${(k.hedge || []).map(p => `<span>${p.w}% ${esc(HBY(p.code) ? HBY(p.code).symbol : p.code)}</span>`).join(' · ')}</div><div class="bar"><i style="width:${clamp((k.progress || 0) * (k.progress > 1 ? .01 : 1)) * 100}%"></i></div></a>`).join('');
    } catch (e) { el.innerHTML = `<div class="empty">The launchpad index is busy. Retrying shortly.</div>`; } }
  const CALC = { mix: 'classic', v: 541 }, volOf = v => { const x = Math.pow(5000, v / 1000); return x < 10 ? Math.round(x * 10) / 10 : x < 100 ? Math.round(x) : x < 1000 ? Math.round(x / 10) * 10 : Math.round(x / 100) * 100; };
  const sol = x => (x >= 100 ? x.toFixed(0) : x >= 1 ? x.toFixed(2) : x >= .01 ? x.toFixed(3) : x.toFixed(4)) + ' SOL';
  function calc() { const r = $('#cRange'), vol = volOf(CALC.v), fee = vol * .01, m = mixOf((presets().find(p => p.id === CALC.mix) || {}).h), tot = Object.values(m).reduce((a, b) => a + b, 0) || 1, px = S.b && S.b.sol && S.b.sol.usd;
    r.style.setProperty('--f', (CALC.v / 10).toFixed(1) + '%'); setT('#cVol', vol.toLocaleString('en-US') + ' SOL'); setT('#cOut', sol(fee)); setT('#cUsd', px ? `≈ ${usd(fee * px, 2)} into its reserve` : 'into its reserve');
    $('#cRows').innerHTML = Object.entries(m).map(([c, w]) => `<div>${badge(c)}<span>${esc(HBY(c) ? HBY(c).name : c)} <small class="split">${w}%</small></span><b>${sol(fee * w / tot)}</b></div>`).join(''); }
  function calcInit() { if ($('#cMix').dataset.on || !presets().length) return; $('#cMix').dataset.on = 1; $('#cMix').innerHTML = presets().map((p, i) => `<button class="chip${i ? '' : ' on'}" data-p="${p.id}">${esc(p.name)}</button>`).join('');
    $('#cMix').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; CALC.mix = b.dataset.p; $$('#cMix .chip').forEach(x => x.classList.toggle('on', x === b)); calc(); });
    $('#cRange').addEventListener('input', e => { CALC.v = +e.target.value; calc(); }); calc(); }
  async function loadReserve() { try { S.tre = await api('treasury'); } catch (e) { S.tre = { live: false, error: true }; } const t = S.tre, live = t && t.live;
    $('#resGrid').innerHTML = HG().map(h => { const x = live ? (t.holdings || []).find(y => y.mint === h.mint) : null; return `<div class="card hold">${badge(h.code)}<span><b>${esc(h.name)}</b><small>${esc(h.symbol)}</small></span><span class="v">${x ? usd(x.usd, 2) : '$0.00'}</span></div>`; }).join('');
    $('#resSum').innerHTML = live ? `<span>held <b>${usd(t.basketUsd || 0, 2)}</b></span><span>fees waiting to be claimed <b>${(+t.unclaimedSol || 0).toFixed(3)} SOL</b></span><span><a href="https://solscan.io/account/${t.wallet}" target="_blank" rel="noopener">reserve ${short(t.wallet)} ↗</a></span>` : '<span>The reserve wallet shows here once the TIDE launchpad is open. Until then it holds nothing.</span>'; }

  // ---------------------------------------------------------------- glue
  async function loadBasket() { try { S.b = await api('basket'); renderLive(); launchInit(); renderPrices(); launchBtn(); calcInit(); if (!S.tre) loadReserve(); } catch (e) { setT('#lSpy', 'busy'); } }
  function reveals() { if (RM) { $$('.rv').forEach(e => e.classList.add('in')); return; } const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' }); $$('.rv').forEach(e => io.observe(e)); }
  function nav() { const top = $('#top'), links = $$('#links a[href^="#"]'); const f = () => { top.classList.toggle('sc', scrollY > 20); let on = -1; links.forEach((a, i) => { const s = $(a.getAttribute('href')); if (s && s.getBoundingClientRect().top < innerHeight * .35) on = i; }); links.forEach((a, i) => a.classList.toggle('on', i === on)); }; addEventListener('scroll', f, { passive: true }); f(); }
  sea(); reveals(); nav(); sim(); story(); walletInit(); loadBasket(); loadCoins(); setInterval(loadBasket, 45000); setInterval(() => { loadCoins(); loadReserve(); }, 60000);
})();

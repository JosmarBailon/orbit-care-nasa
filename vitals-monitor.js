/**
 * ORBIT CARE // VITAL SIGNS MONITOR
 * Heart Rate (ECG) + Respiratory Rate Monitor with:
 *   - Live biometric vest feed (Astroskin, offline simulation)
 *   - Guided manual tap measurement (15 s pulse / 30 s breathing)
 *   - Preset demo scenarios (Rest, Acute stress, Fatigue / low mood)
 * Requires orbit-core.js loaded beforehand.
 */
const OrbitVitals = (() => {
  const CSS = `
  .ov-wrap { display:flex; flex-direction:column; gap:0.75rem; position:relative; }
  .ov-toolbar { display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap; font-size:0.7rem; }
  .ov-source { display:flex; align-items:center; gap:6px; color:var(--green-mid,#28c76f); letter-spacing:1px; text-transform:uppercase; }
  .ov-live-dot { width:8px; height:8px; border-radius:50%; background:#ef4444; box-shadow:0 0 8px #ef4444; animation:ovBlink 1.2s infinite; }
  .ov-live-dot.off { background:#64748b; box-shadow:none; animation:none; }
  @keyframes ovBlink { 0%,100%{opacity:1} 50%{opacity:0.25} }
  .ov-scen { display:flex; gap:4px; flex-wrap:wrap; }
  .ov-chip { background:var(--bg-panel-alt,#06190e); border:1px solid var(--green-border,#1b6b3e); color:var(--green-mid,#28c76f);
    font-size:0.64rem; padding:3px 7px; cursor:pointer; text-transform:uppercase; letter-spacing:0.6px; }
  .ov-chip.active { border-color:var(--green-bright,#68ff9b); color:var(--green-bright,#68ff9b); font-weight:700; }
  .ov-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; }
  .ov-panel { border:1px solid var(--green-border,#1b6b3e); background:var(--bg-panel-alt,#06190e); padding:0.6rem 0.7rem;
    display:flex; flex-direction:column; gap:0.4rem; position:relative; transition:border-color .25s; }
  .ov-panel.lvl-precaucion { border-color:#fbbf24; }
  .ov-panel.lvl-accion { border-color:#f87171; }
  .ov-head { display:flex; justify-content:space-between; align-items:center; font-size:0.68rem; letter-spacing:1.1px; text-transform:uppercase; color:var(--green-mid,#28c76f); }
  .ov-pill { font-size:0.62rem; font-weight:700; padding:1px 6px; border:1px solid currentColor; }
  .ov-pill.optimo { color:#22c55e; } .ov-pill.precaucion { color:#f59e0b; } .ov-pill.accion { color:#ef4444; }
  .ov-reading { display:flex; align-items:baseline; gap:8px; }
  .ov-value { font-size:2.1rem; font-weight:700; line-height:1; color:var(--green-bright,#68ff9b); text-shadow:var(--text-shadow-glow,none); min-width:2.6ch; }
  .ov-unit { font-size:0.72rem; color:var(--green-mid,#28c76f); }
  .ov-icon { margin-left:auto; font-size:1.5rem; transition:transform .12s ease; display:inline-block; }
  .ov-icon.beat { transform:scale(1.35); }
  .ov-breath-label { margin-left:auto; font-size:0.7rem; letter-spacing:1px; color:var(--privacy-accent,#38bdf8); }
  .ov-canvas { width:100%; height:70px; display:block; background:
      linear-gradient(var(--grid-line,rgba(40,199,111,.05)) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid-line,rgba(40,199,111,.05)) 1px, transparent 1px);
    background-size:12px 12px; border:1px solid var(--green-border,#1b6b3e); }
  .ov-range { font-size:0.62rem; color:var(--green-mid,#28c76f); }
  .ov-mini { display:grid; grid-template-columns:repeat(2,1fr); gap:0.5rem; }
  .ov-mini-box { border:1px solid var(--green-border,#1b6b3e); background:var(--bg-panel-alt,#06190e); padding:0.4rem 0.6rem; display:flex; justify-content:space-between; align-items:center; font-size:0.72rem; }
  .ov-mini-box strong { font-size:0.95rem; color:var(--green-bright,#68ff9b); }
  .ov-actions { display:flex; gap:0.45rem; flex-wrap:wrap; justify-content:flex-end; }
  .ov-btn { background:var(--bg-panel-alt,#06190e); border:1px solid var(--green-bright,#68ff9b); color:var(--green-bright,#68ff9b);
    padding:0.42rem 0.75rem; font-size:0.7rem; letter-spacing:1px; text-transform:uppercase; cursor:pointer; transition:all .2s; }
  .ov-btn:hover { background:rgba(104,255,155,.16); box-shadow:var(--glow-soft,none); }
  .ov-btn.alt { border-color:var(--privacy-accent,#38bdf8); color:var(--privacy-accent,#38bdf8); }
  .ov-btn:disabled { opacity:.45; cursor:not-allowed; }
  .ov-feedback { font-size:0.7rem; color:var(--green-mid,#28c76f); min-height:1em; }
  .ov-modal { position:absolute; inset:0; background:rgba(2,7,4,.94); border:1px solid var(--privacy-accent,#38bdf8); z-index:20;
    display:none; flex-direction:column; align-items:center; justify-content:center; gap:0.8rem; padding:1rem; text-align:center; }
  body.light-mode .ov-modal { background:rgba(244,251,247,.97); }
  .ov-modal.open { display:flex; }
  .ov-modal h4 { font-size:0.85rem; letter-spacing:1.4px; text-transform:uppercase; color:var(--privacy-accent,#38bdf8); }
  .ov-modal p { font-size:0.74rem; line-height:1.45; max-width:440px; color:var(--green-bright,#68ff9b); }
  .ov-tap { width:130px; height:130px; border-radius:50%; border:2px solid var(--privacy-accent,#38bdf8); background:var(--privacy-bg,rgba(56,189,248,.12));
    color:var(--privacy-accent,#38bdf8); font-size:0.78rem; font-weight:700; letter-spacing:1px; cursor:pointer; user-select:none; transition:transform .08s; }
  .ov-tap:active, .ov-tap.hit { transform:scale(0.92); box-shadow:0 0 18px var(--privacy-accent,#38bdf8); }
  .ov-timer { font-size:1.4rem; font-weight:700; color:var(--green-bright,#68ff9b); }
  .ov-progress { width:100%; max-width:320px; height:6px; border:1px solid var(--green-border,#1b6b3e); }
  .ov-progress > div { height:100%; width:0; background:var(--privacy-accent,#38bdf8); transition:width .2s linear; }
  @media (max-width: 680px) { .ov-grid { grid-template-columns:1fr; } }
  `;

  const SCENARIOS = {
    reposo:  { label: 'Rest',               hr: null, rr: null, hrv: null, spo2: 98 },
    estres:  { label: 'Acute stress',       hr: 104,  rr: 23,   hrv: 36,   spo2: 97 },
    fatiga:  { label: 'Fatigue / low mood', hr: 82,   rr: 18,   hrv: 41,   spo2: 97 }
  };

  function injectCSS() {
    if (document.getElementById('orbitVitalsCSS')) return;
    const s = document.createElement('style');
    s.id = 'orbitVitalsCSS';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // Forma de onda PQRST sintética a partir de la fase del latido (0–1)
  function ecgWave(f) {
    const g = (c, w, a) => a * Math.exp(-Math.pow((f - c) / w, 2));
    return g(0.10, 0.025, 0.12) + g(0.20, 0.008, -0.12) + g(0.22, 0.010, 1.0) + g(0.245, 0.010, -0.28) + g(0.42, 0.040, 0.3);
  }

  function mount(container, opts = {}) {
    injectCSS();
    const st = OrbitCore.getState();
    const base = {
      hr: st.latestMetrics.hr,
      rr: st.latestMetrics.respRate,
      hrv: st.latestMetrics.hrv,
      spo2: st.latestMetrics.spo2
    };
    const target = { ...base };
    const cur = { ...base };
    let live = true;
    let source = 'Astroskin Vest (simulated stream)';
    let scenario = 'reposo';

    container.innerHTML = `
      <div class="ov-wrap">
        <div class="ov-toolbar">
          <span class="ov-source"><span class="ov-live-dot" data-ov="dot"></span><span data-ov="source"></span></span>
          <div class="ov-scen" data-ov="scen">
            ${Object.entries(SCENARIOS).map(([k, s]) => `<button type="button" class="ov-chip${k === 'reposo' ? ' active' : ''}" data-scen="${k}">${s.label}</button>`).join('')}
          </div>
        </div>

        <div class="ov-grid">
          <div class="ov-panel" data-ov="hrPanel">
            <div class="ov-head"><span>Heart Rate (ECG)</span><span class="ov-pill optimo" data-ov="hrPill">NORMAL</span></div>
            <div class="ov-reading">
              <span class="ov-value" data-ov="hrVal">--</span><span class="ov-unit">BPM</span>
              <span class="ov-icon" data-ov="heart">❤</span>
            </div>
            <canvas class="ov-canvas" data-ov="ecg"></canvas>
            <span class="ov-range">Normal rest: 50–100 bpm · Personal baseline: ${st.profile.baseHr} bpm</span>
          </div>

          <div class="ov-panel" data-ov="rrPanel">
            <div class="ov-head"><span>Respiratory Rate</span><span class="ov-pill optimo" data-ov="rrPill">NORMAL</span></div>
            <div class="ov-reading">
              <span class="ov-value" data-ov="rrVal">--</span><span class="ov-unit">BRPM</span>
              <span class="ov-breath-label" data-ov="breath">INHALE</span>
            </div>
            <canvas class="ov-canvas" data-ov="resp"></canvas>
            <span class="ov-range">Normal rest: 12–20 breaths/min · Baseline: ${st.profile.baseRr} brpm</span>
          </div>
        </div>

        <div class="ov-mini">
          <div class="ov-mini-box"><span>HRV (stress)</span><strong data-ov="hrvVal">--</strong></div>
          <div class="ov-mini-box"><span>SpO₂ (oxygen)</span><strong data-ov="spo2Val">--</strong></div>
        </div>

        <div class="ov-toolbar">
          <span class="ov-feedback" data-ov="feedback"></span>
          <div class="ov-actions">
            <button type="button" class="ov-btn alt" data-ov="liveBtn">⏸ Pause sensor</button>
            <button type="button" class="ov-btn alt" data-ov="tapHr">👆 Measure pulse (15 s)</button>
            <button type="button" class="ov-btn alt" data-ov="tapRr">🫁 Measure breathing (30 s)</button>
            ${opts.hideSave ? '' : '<button type="button" class="ov-btn" data-ov="saveBtn">Log reading</button>'}
          </div>
        </div>
        <div style="font-size:0.65rem; color:var(--privacy-accent,#38bdf8); border-top:1px dashed var(--green-border,#1b6b3e); padding-top:4px;">
          🖐️ <strong>Manual / Gestures:</strong> 👆 <em>Manual:</em> tap per beat or inhale · ✌️ <em>Two-finger gesture:</em> 10 s touchless capture · ✊ <em>Fist:</em> log reading · 🖐️ <em>Open palm:</em> pause sensor.
        </div>

        <div class="ov-modal" data-ov="modal">
          <h4 data-ov="mTitle"></h4>
          <p data-ov="mText"></p>
          <div class="ov-timer" data-ov="mTimer"></div>
          <div class="ov-progress"><div data-ov="mBar"></div></div>
          <button type="button" class="ov-tap" data-ov="mTap">TAP</button>
          <div class="ov-feedback" data-ov="mInfo">You can also press the spacebar.</div>
          <button type="button" class="ov-btn" data-ov="mCancel" style="border-color:#ef4444;color:#ef4444;">Cancel</button>
        </div>
      </div>`;

    const $ = (k) => container.querySelector(`[data-ov="${k}"]`);
    const ecgCanvas = $('ecg');
    const respCanvas = $('resp');
    const ecgCtx = ecgCanvas.getContext('2d');
    const respCtx = respCanvas.getContext('2d');
    let ecgBuf = [], respBuf = [];
    let beatPhase = 0, breathPhase = 0;
    let lastT = performance.now();
    let rafId = null;
    const SPEED = 70; // px/s

    function resize() {
      if (ecgCanvas.clientWidth === 0 && ecgBuf.length > 0) return;
      const dpr = window.devicePixelRatio || 1;
      [ecgCanvas, respCanvas].forEach(c => {
        const w = Math.max(120, c.clientWidth);
        c.width = Math.round(w * dpr);
        c.height = Math.round(70 * dpr);
        c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
      });
      const w = Math.max(120, ecgCanvas.clientWidth);
      ecgBuf = new Array(w).fill(0);
      respBuf = new Array(w).fill(0);
    }

    function cssVar(name, fb) {
      const v = getComputedStyle(container).getPropertyValue(name).trim();
      return v || fb;
    }

    function levelColor(level, fallback) {
      return level === 'accion' ? '#ef4444' : level === 'precaucion' ? '#f59e0b' : fallback;
    }

    function drawLine(ctx, buf, color, scaleY, offsetY) {
      const w = buf.length;
      ctx.clearRect(0, 0, w, 70);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const y = offsetY - buf[x] * scaleY;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Cabezal de barrido
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(w - 2, offsetY - buf[w - 1] * scaleY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    function frame(t) {
      const dt = Math.min(0.1, (t - lastT) / 1000);
      lastT = t;
      const n = Math.max(1, Math.round(dt * SPEED));
      const heart = $('heart');
      for (let i = 0; i < n; i++) {
        const prevBeat = beatPhase;
        beatPhase += (1 / SPEED) * (cur.hr / 60);
        breathPhase += (1 / SPEED) * (cur.rr / 60);
        if (Math.floor(beatPhase) !== Math.floor(prevBeat) && heart) {
          heart.classList.add('beat');
          setTimeout(() => heart.classList.remove('beat'), 120);
        }
        ecgBuf.push(ecgWave(beatPhase % 1) + (Math.random() - 0.5) * 0.03);
        ecgBuf.shift();
        respBuf.push(Math.sin(2 * Math.PI * breathPhase));
        respBuf.shift();
      }
      const hrLvl = OrbitCore.classifyVital('hr', cur.hr).level;
      const rrLvl = OrbitCore.classifyVital('rr', cur.rr).level;
      drawLine(ecgCtx, ecgBuf, levelColor(hrLvl, cssVar('--green-bright', '#68ff9b')), 40, 52);
      drawLine(respCtx, respBuf, levelColor(rrLvl, cssVar('--privacy-accent', '#38bdf8')), 24, 35);
      const br = $('breath');
      if (br) br.textContent = Math.cos(2 * Math.PI * breathPhase) > 0 ? 'INHALE ▲' : 'EXHALE ▼';
      rafId = requestAnimationFrame(frame);
    }

    function renderReadings() {
      const hr = Math.round(cur.hr), rr = Math.round(cur.rr);
      $('hrVal').textContent = hr;
      $('rrVal').textContent = rr;
      $('hrvVal').textContent = `${Math.round(cur.hrv)} ms`;
      $('spo2Val').textContent = `${Math.round(cur.spo2)}%`;
      const ch = OrbitCore.classifyVital('hr', hr);
      const cr = OrbitCore.classifyVital('rr', rr);
      $('hrPill').className = `ov-pill ${ch.level}`; $('hrPill').textContent = ch.label;
      $('rrPill').className = `ov-pill ${cr.level}`; $('rrPill').textContent = cr.label;
      $('hrPanel').className = `ov-panel lvl-${ch.level}`;
      $('rrPanel').className = `ov-panel lvl-${cr.level}`;
      $('source').textContent = live ? `LIVE // ${source}` : `PAUSED // ${source}`;
      $('dot').classList.toggle('off', !live);
      $('liveBtn').textContent = live ? '⏸ Pause sensor' : '▶ Resume sensor';
      if (opts.onChange) opts.onChange(getReadings());
    }

    // Simulated sensor stream: smooth drift toward target + physiological noise
    const liveTimer = setInterval(() => {
      if (!live) return;
      cur.hr += (target.hr - cur.hr) * 0.35 + (Math.random() - 0.5) * 2.2;
      cur.rr += (target.rr - cur.rr) * 0.35 + (Math.random() - 0.5) * 0.8;
      cur.hrv += (target.hrv - cur.hrv) * 0.35 + (Math.random() - 0.5) * 2;
      cur.spo2 += (target.spo2 - cur.spo2) * 0.4 + (Math.random() - 0.5) * 0.4;
      cur.spo2 = Math.min(100, cur.spo2);
      renderReadings();
    }, 1000);

    function setScenario(key) {
      const s = SCENARIOS[key];
      if (!s) return;
      scenario = key;
      container.querySelectorAll('.ov-chip').forEach(b => b.classList.toggle('active', b.dataset.scen === key));
      target.hr = s.hr ?? base.hr;
      target.rr = s.rr ?? base.rr;
      target.hrv = s.hrv ?? base.hrv;
      target.spo2 = s.spo2 ?? base.spo2;
      live = true;
      source = 'Astroskin Vest (simulated stream)';
      feedback(`Scenario "${s.label}" applied to sensor.`);
      renderReadings();
    }

    function feedback(msg) {
      $('feedback').textContent = msg;
    }

    function getReadings() {
      return {
        hr: Math.round(cur.hr),
        rr: Math.round(cur.rr),
        hrv: Math.round(cur.hrv),
        spo2: Math.round(cur.spo2),
        source, scenario
      };
    }

    function save() {
      const r = getReadings();
      OrbitCore.updateState(s => {
        s.latestMetrics.hr = r.hr;
        s.latestMetrics.respRate = r.rr;
        s.latestMetrics.hrv = r.hrv;
        s.latestMetrics.spo2 = r.spo2;
        s.segmentHealth['ts'] = (r.hr > 120 || r.rr >= 25 || r.spo2 < 90) ? 76
          : (r.hr > 100 || r.rr > 20 || r.spo2 < 95) ? 86 : 100;
        return s;
      });
      feedback(`✔ Logged: ${r.hr} bpm · ${r.rr} brpm · HRV ${r.hrv} ms · SpO₂ ${r.spo2}%`);
      if (opts.onSave) opts.onSave(r);
      return r;
    }

    /** Averaged capture over N seconds (for daily mood check-in). */
    function capture(seconds = 10, onProgress) {
      return new Promise(resolve => {
        if (!live) { live = true; renderReadings(); }
        const samples = [];
        let elapsed = 0;
        const t = setInterval(() => {
          samples.push(getReadings());
          elapsed++;
          if (onProgress) onProgress(elapsed / seconds);
          if (elapsed >= seconds) {
            clearInterval(t);
            const avg = k => Math.round(samples.reduce((a, s) => a + s[k], 0) / samples.length);
            resolve({ hr: avg('hr'), rr: avg('rr'), hrv: avg('hrv'), spo2: avg('spo2'), source });
          }
        }, 1000);
      });
    }

    // ---------- Manual tap measurement ----------
    let tapSession = null;
    function openTap(kind) {
      const isHr = kind === 'hr';
      const dur = isHr ? 15 : 30;
      tapSession = { kind, dur, taps: [], start: null, timer: null };
      $('mTitle').textContent = isHr ? 'Manual pulse measurement' : 'Manual breathing measurement';
      $('mText').innerHTML = isHr
        ? 'Place two fingers (index and middle) on your wrist below your thumb, or gently along the side of your neck. <strong>Tap the circle each time you feel a beat</strong>. The 15 s timer begins on your first tap.'
        : 'Breathe naturally without forcing your pace. <strong>Tap the circle each time you start to inhale</strong> (as your chest rises). The 30 s timer begins on your first tap.';
      $('mTimer').textContent = `${dur}.0 s`;
      $('mBar').style.width = '0%';
      $('mTap').textContent = isHr ? 'BEAT' : 'INHALE';
      $('mInfo').textContent = 'Taps: 0 · You can also press the spacebar.';
      $('modal').classList.add('open');
    }

    function tapHit() {
      if (!tapSession) return;
      const now = performance.now();
      const btn = $('mTap');
      btn.classList.add('hit');
      setTimeout(() => btn.classList.remove('hit'), 90);
      if (!tapSession.start) {
        tapSession.start = now;
        tapSession.timer = setInterval(() => {
          const el = (performance.now() - tapSession.start) / 1000;
          const left = Math.max(0, tapSession.dur - el);
          $('mTimer').textContent = `${left.toFixed(1)} s`;
          $('mBar').style.width = `${Math.min(100, (el / tapSession.dur) * 100)}%`;
          if (left <= 0) finishTap();
        }, 100);
      }
      tapSession.taps.push(now);
      $('mInfo').textContent = `Taps: ${tapSession.taps.length}`;
    }

    function finishTap() {
      if (!tapSession) return;
      clearInterval(tapSession.timer);
      const { taps, kind } = tapSession;
      const minTaps = kind === 'hr' ? 5 : 3;
      $('modal').classList.remove('open');
      if (taps.length < minTaps) {
        feedback(`✖ Too few taps (${taps.length}). Repeat the measurement.`);
        tapSession = null;
        return;
      }
      const spanS = (taps[taps.length - 1] - taps[0]) / 1000;
      const rate = Math.round(((taps.length - 1) / spanS) * 60);
      live = false;
      source = 'Manual tap measurement';
      if (kind === 'hr') { cur.hr = rate; target.hr = rate; }
      else { cur.rr = rate; target.rr = rate; }
      feedback(kind === 'hr' ? `✔ Pulse measured: ${rate} bpm (${taps.length} beats).` : `✔ Breathing measured: ${rate} brpm (${taps.length} cycles).`);
      tapSession = null;
      renderReadings();
    }

    function cancelTap() {
      if (tapSession) clearInterval(tapSession.timer);
      tapSession = null;
      $('modal').classList.remove('open');
      feedback('Measurement canceled.');
    }

    const keyHandler = (e) => {
      if (tapSession && e.code === 'Space') { e.preventDefault(); tapHit(); }
    };
    document.addEventListener('keydown', keyHandler);

    // ---------- Events ----------
    container.querySelectorAll('.ov-chip').forEach(b => b.addEventListener('click', () => setScenario(b.dataset.scen)));
    $('liveBtn').addEventListener('click', () => { live = !live; if (live) source = 'Astroskin Vest (simulated stream)'; renderReadings(); });
    $('tapHr').addEventListener('click', () => openTap('hr'));
    $('tapRr').addEventListener('click', () => openTap('rr'));
    $('mTap').addEventListener('click', tapHit);
    $('mCancel').addEventListener('click', cancelTap);
    if ($('saveBtn')) $('saveBtn').addEventListener('click', save);
    window.addEventListener('resize', resize);

    resize();
    renderReadings();
    rafId = requestAnimationFrame(frame);

    return {
      getReadings,
      capture,
      save,
      setScenario,
      resize,
      destroy() {
        cancelAnimationFrame(rafId);
        clearInterval(liveTimer);
        document.removeEventListener('keydown', keyHandler);
        window.removeEventListener('resize', resize);
      }
    };
  }

  return { mount, SCENARIOS };
})();


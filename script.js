(function () {
  // ===== Fonte de canais (preview > publicado) =====
  const RAW_CHANNELS = (() => {
    try {
      const ov = localStorage.getItem('CHANNELS_OVERRIDE');
      if (ov) {
        const arr = JSON.parse(ov);
        if (Array.isArray(arr)) return arr;
      }
    } catch(e){}
    return (typeof CHANNELS !== 'undefined' && Array.isArray(CHANNELS)) ? CHANNELS : [];
  })();

  // ===== Config de API (pode ser sobrescrita via window.* no index.html) =====
  const DEFAULT_BASE = 'https://api.reidoscanais.io'; // ajuste se seu conector usar outro host
  const API_BASE = (typeof window !== 'undefined' && window.SPORTS_API_BASE) || DEFAULT_BASE;

  // Gera possíveis endpoints (inclui variações comuns e formato por data)
  function buildCandidateEndpoints() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    const ymd = `${yyyy}-${mm}-${dd}`;
    const dmy = `${dd}-${mm}-${yyyy}`;

    const defaults = [
      `${API_BASE}/sports?status=live`,
      `${API_BASE}/sports?status=upcoming`,
      `${API_BASE}/sports`,
      `${API_BASE}/events?status=live`,
      `${API_BASE}/events?status=upcoming`,
      `${API_BASE}/events`,
      // formato "por data" (APIs que exigem date)
      `${API_BASE}/api/demo?date=${ymd}`,
      `${API_BASE}/api/demo?date=${dmy}`
    ];

    // Permite substituir toda a lista via window.SPORTS_API_ENDPOINTS
    if (typeof window !== 'undefined' && Array.isArray(window.SPORTS_API_ENDPOINTS) && window.SPORTS_API_ENDPOINTS.length) {
      return window.SPORTS_API_ENDPOINTS;
    }
    return defaults;
  }

  // ===== Estado =====
  let selectedIndex = 0;
  let activeCategory = 'ALL'; // Todos os canais

  const TAB_TO_CATEGORY = {
    'TODOS OS CANAIS': 'ALL',
    'JOGOS AO VIVO': 'LIVE_GAMES',   // <— nova aba especial
    'ABERTOS': 'Abertos',
    'ESPORTES': 'Esportes',          // mantém o comportamento atual
    'VARIEDADES': 'Variedades',
    'KIDS': 'Kids',
    'DESTAQUES': 'Destaque'
  };

  const normalize = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();

  function getVisibleChannels() {
    if (activeCategory === 'ALL') return RAW_CHANNELS || [];
    if (activeCategory === 'LIVE_GAMES') return []; // renderizado pela view especial
    return (RAW_CHANNELS || []).filter(ch => normalize(ch.category) === normalize(activeCategory));
  }

  // ===== Play Shield (primeiro clique) =====
  const PLAY_GATE_KEY = 'playGateDone';
  function showPlayShield(){ const el=document.getElementById('playShield'); if(el) el.style.display='flex'; }
  function hidePlayShield(){ const el=document.getElementById('playShield'); if(el) el.style.display='none'; }
  function initPlayShield(){
    const shield = document.getElementById('playShield');
    const btn = document.getElementById('playBtn');
    const used = localStorage.getItem(PLAY_GATE_KEY) === '1';
    if(!shield) return;
    if(used){ hidePlayShield(); return; }
    const accept = () => { localStorage.setItem(PLAY_GATE_KEY,'1'); hidePlayShield(); };
    shield.addEventListener('click', accept);
    if(btn) btn.addEventListener('click', (e)=>{ e.stopPropagation(); accept(); });
  }

  // ===== Render lista de Canais =====
  function renderList() {
    const listEl = document.getElementById('channelList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const visible = getVisibleChannels();
    if (!visible.length) {
      const empty = document.createElement('div');
      empty.textContent = activeCategory === 'LIVE_GAMES' ? 'Carregando jogos…' : 'Nenhum canal nesta categoria.';
      empty.style.opacity = '.8';
      listEl.appendChild(empty);
      return;
    }

    visible.forEach((ch, idx) => {
      const btn = document.createElement('button');
      btn.className = 'channel-item';
      if (idx === selectedIndex) btn.classList.add('active');

      const logoWrap = document.createElement('div');
      logoWrap.className = 'channel-logo';
      if (ch.logoUrl) {
        const img = document.createElement('img');
        img.src = ch.logoUrl;
        img.alt = ch.name || 'Canal';
        img.loading = 'lazy';
        logoWrap.appendChild(img);
      } else {
        const fallback = document.createElement('div');
        fallback.textContent = (ch.name || '?').charAt(0).toUpperCase();
        fallback.className = 'channel-logo-fallback';
        logoWrap.appendChild(fallback);
      }

      const textWrap = document.createElement('div');
      textWrap.className = 'channel-texts';

      const titleRow = document.createElement('div');
      titleRow.className = 'channel-title-row';

      const num = document.createElement('span');
      num.className = 'channel-number';
      num.textContent = ch.number != null ? ch.number : '—';

      const name = document.createElement('span');
      name.className = 'channel-name';
      name.textContent = ch.name || 'Sem nome';

      const badge = document.createElement('span');
      badge.className = 'channel-badge';
      badge.textContent = ch.quality || '';

      titleRow.append(num, name, badge);

      const cat = document.createElement('div');
      cat.className = 'channel-category';
      cat.textContent = ch.category || '';

      textWrap.append(titleRow, cat);

      btn.append(logoWrap, textWrap);

      if (ch.live) {
        const live = document.createElement('span');
        live.className = 'channel-live';
        live.textContent = 'AO VIVO';
        btn.appendChild(live);
      }

      btn.addEventListener('click', () => selectChannel(idx));
      listEl.appendChild(btn);
    });
  }

  // ===== Player & Info =====
  const player = () => document.getElementById('player');
  const infoTitle = () => document.getElementById('infoTitle');
  const infoSubtitle = () => document.getElementById('infoSubtitle');

  // Normaliza URLs para formato de embed (ex.: YouTube)
  function normalizeEmbedUrl(url) {
    if (!url) return url;
    try {
      const u = new URL(url, location.href);
      // YouTube
      if (u.hostname.includes('youtube.com')) {
        const v = u.searchParams.get('v');
        if (v) return `https://www.youtube.com/embed/${v}`;
      }
      if (u.hostname === 'youtu.be') {
        return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
      }
      return u.toString();
    } catch { return url; }
  }

  // Tenta achar a PRIMEIRA URL tocável dentro de um objeto de evento
  function firstUrlFrom(obj) {
    const urls = [];
    const seen = new Set();
    const push = (v) => {
      if (typeof v === 'string' && /^https?:\/\//i.test(v)) urls.push(v);
    };
    const walk = (val, depth=0) => {
      if (!val || depth > 3) return;
      if (seen.has(val)) return;
      if (typeof val === 'string') { push(val); return; }
      if (Array.isArray(val)) { val.forEach(v => walk(v, depth+1)); return; }
      if (typeof val === 'object') {
        seen.add(val);
        // campos comuns primeiro (prioridade)
        const preferredKeys = ['streamUrl','player','embed','iframe','watch','url','link','play'];
        for (const k of preferredKeys) if (k in val) walk(val[k], depth+1);
        // arrays comuns: players, links, streams, sources
        if ('players' in val) walk(val.players, depth+1);
        if ('links'   in val) walk(val.links, depth+1);
        if ('streams' in val) walk(val.streams, depth+1);
        if ('sources' in val) walk(val.sources, depth+1);
        // demais chaves
        for (const k in val) if (!preferredKeys.includes(k)) walk(val[k], depth+1);
      }
    };
    walk(obj, 0);
    return urls[0] || '';
  }

  // Extrai dados padronizados do evento vindo de formatos diferentes
  function normalizeEvent(ev) {
    const title = ev.title ?? ev.name ?? `${ev.team1 || ev.homeTeam?.name || ev.home || '?'} x ${ev.team2 || ev.awayTeam?.name || ev.away || '?'}`;
    const category = ev.category ?? ev.sport ?? ev.league ?? ev.competition ?? 'Esporte';

    // status
    const rawStatus = String(
      ev.status ??
      (ev.is_live ? 'live' : '') ??
      (ev.live ? 'live' : '')
    ).toLowerCase();

    // horário (aceita ISO, unix s, unix ms, nested time.start)
    let start = ev.start ?? ev.date ?? ev.time ?? ev.kickoff ?? ev.start_time ?? ev.startAt ?? ev.start_at ?? ev.begin;
    if (ev?.time?.start) start = ev.time.start; // unix (documentação de exemplo)
    let startMs = null;
    if (typeof start === 'number') {
      startMs = start > 2_000_000_000 ? start : start * 1000; // heurística s→ms
    } else if (typeof start === 'string') {
      const n = Number(start);
      if (!Number.isNaN(n) && n > 0) startMs = n > 2_000_000_000 ? n : n * 1000;
      else {
        const d = new Date(start);
        if (!isNaN(d)) startMs = d.getTime();
      }
    }

    // id
    const id =
      ev.id ?? ev.slug ?? ev._id ??
      `${title}-${startMs || ''}`.replace(/\s+/g,'-').toLowerCase();

    // URL tocável (procura em múltiplos campos/níveis)
    const streamUrl =
      ev.streamUrl ?? ev.player ?? ev.embed ?? ev.iframe ?? ev.url ?? ev.link ?? ev.watch ??
      (Array.isArray(ev.players) && ev.players[0]) ??
      (Array.isArray(ev.links)   && (ev.links[0]?.url || ev.links[0]?.href)) ??
      (Array.isArray(ev.streams) && (ev.streams[0]?.url || ev.streams[0]?.src)) ??
      firstUrlFrom(ev);

    return {
      id,
      title,
      category,
      start: startMs,
      status: rawStatus,
      streamUrl
    };
  }

  // Define a fonte do player com fallbacks (misto/iframe bloqueado/sem fonte)
  function setPlayerSource(rawUrl) {
    const iframe = player();
    const notice = document.getElementById('playerNotice');
    const open = document.getElementById('playerOpen');
    const url = normalizeEmbedUrl(rawUrl);

    const show = (msg, href) => {
      if (notice) { notice.textContent = msg; notice.style.display = ''; }
      if (open) {
        if (href) { open.href = href; open.style.display = ''; } else { open.style.display = 'none'; }
      }
    };
    const hide = () => {
      if (notice) notice.style.display = 'none';
      if (open) open.style.display = 'none';
    };

    hide();

    if (!url) {
      if (iframe) iframe.src = 'about:blank';
      show('Fonte indisponível para este evento.', null);
      return;
    }

    if (location.protocol === 'https:' && url.startsWith('http:')) {
      if (iframe) iframe.src = 'about:blank';
      show('Este vídeo usa HTTP e foi bloqueado pelo navegador (conteúdo misto). Abra em nova aba.', url);
      return;
    }

    // tenta carregar
    if (iframe) iframe.src = url;
    let ok = false;
    const onLoad = () => { ok = true; if (iframe) iframe.removeEventListener('load', onLoad); };
    if (iframe) iframe.addEventListener('load', onLoad, { once: true });
    setTimeout(() => {
      if (!ok) {
        show('O site do vídeo não permite incorporação. Abra em nova aba.', url);
      }
    }, 3000);
  }

  function selectChannel(idx) {
    const visible = getVisibleChannels();
    if (!visible.length) return;

    selectedIndex = Math.max(0, Math.min(idx, visible.length - 1));
    const ch = visible[selectedIndex];

    setPlayerSource(ch.streamUrl || '');

    const t = infoTitle();
    const s = infoSubtitle();
    if (t) t.textContent = ch.name || '—';
    if (s) s.textContent = ch.category || '—';

    if (localStorage.getItem('playGateDone') !== '1') showPlayShield();

    renderList();
  }

  // ====== JOGOS AO VIVO (API externa) ========================================
  let sportsCache = { items: [], ts: 0 };
  let sportsTimer = null;

  async function fetchLiveAndUpcoming() {
    const now = Date.now();
    if ((now - sportsCache.ts) < 60_000 && sportsCache.items.length) return sportsCache.items;

    const endpoints = buildCandidateEndpoints();
    let collected = [];

    for (const u of endpoints) {
      try {
        const r = await fetch(u, { cache: 'no-store' });
        if (!r.ok) continue;
        const j = await r.json();

        // aceita array direto ou {data: []} / {events: []}
        const arr = Array.isArray(j) ? j
                  : Array.isArray(j?.data) ? j.data
                  : Array.isArray(j?.events) ? j.events
                  : [];

        // normaliza itens
        const normalized = arr.map(normalizeEvent);
        collected = collected.concat(normalized);
      } catch(_) {}
    }

    // filtra fora eventos finalizados/passados (exibimos ao vivo e próximos)
    const items = collected.filter(ev => {
      const s = (ev.status || '').toLowerCase();
      if (s.includes('end') || ['finished','concluded','ended','finalizado','encerrado'].includes(s)) return false;
      if (ev.start && ev.start < Date.now() && !s.includes('live')) return false;
      return !!(ev.title && (ev.streamUrl || true)); // mantém mesmo sem streamUrl para permitir fallback "Abrir em nova aba" via detalhe
    });

    // de-dup por id/título
    const seen = new Set(); const uniq = [];
    for (const ev of items) {
      const k = ev.id || ev.title;
      if (!seen.has(k)) { seen.add(k); uniq.push(ev); }
    }

    sportsCache = { items: uniq, ts: now };
    return uniq;
  }

  async function fetchEventDetail(id) {
    // tenta endpoints de detalhe comuns
    const bases = [ `${API_BASE}/sports/`, `${API_BASE}/events/`, `${API_BASE}/api/events/` ];
    for (const b of bases) {
      try {
        const r = await fetch(`${b}${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (!r.ok) continue;
        const d = await r.json();
        const n = normalizeEvent(d);
        if (n.streamUrl) return n;
        // tenta em {data:{}}
        if (d?.data) {
          const n2 = normalizeEvent(d.data);
          if (n2.streamUrl) return n2;
        }
      } catch(_) {}
    }
    return null;
  }

  async function renderLiveGamesList() {
    const listEl = document.getElementById('channelList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const events = await fetchLiveAndUpcoming();
    if (!events.length) {
      const empty = document.createElement('div');
      empty.textContent = 'Nenhum jogo ao vivo ou próximo.';
      empty.style.opacity = '.8';
      listEl.appendChild(empty);
      return;
    }

    events.forEach((ev) => {
      const btn = document.createElement('button');
      btn.className = 'channel-item';

      const logoWrap = document.createElement('div');
      logoWrap.className = 'channel-logo';
      const fallback = document.createElement('div');
      fallback.textContent = (ev.title || '?').charAt(0).toUpperCase();
      fallback.className = 'channel-logo-fallback';
      logoWrap.appendChild(fallback);

      const textWrap = document.createElement('div');
      textWrap.className = 'channel-texts';

      const titleRow = document.createElement('div');
      titleRow.className = 'channel-title-row';

      const name = document.createElement('span');
      name.className = 'channel-name';
      name.textContent = ev.title || 'Evento';

      const badge = document.createElement('span');
      badge.className = 'channel-badge';
      badge.textContent = (String(ev.status).includes('live') ? 'AO VIVO' : 'PRÓXIMO');

      titleRow.append(name, badge);

      const cat = document.createElement('div');
      cat.className = 'channel-category';
      const dateLabel = ev.start ? new Date(ev.start).toLocaleString() : '';
      cat.textContent = [ev.category, dateLabel].filter(Boolean).join(' • ');

      textWrap.append(titleRow, cat);
      btn.append(logoWrap, textWrap);

      btn.addEventListener('click', async () => {
        let url = ev.streamUrl;
        // se não vier stream direto, tenta detalhe
        if (!url) {
          const det = await fetchEventDetail(ev.id);
          url = det?.streamUrl || firstUrlFrom(det || {}) || '';
        }
        setPlayerSource(url);

        const t = infoTitle();
        const s = infoSubtitle();
        if (t) t.textContent = ev.title || '—';
        if (s) s.textContent = ev.category || '—';

        if (localStorage.getItem('playGateDone') !== '1') showPlayShield();
      });

      listEl.appendChild(btn);
    });
  }

  // ===== Abas =====
  function initTabs() {
    const btns = Array.from(document.querySelectorAll('header nav.menu button'));
    if (!btns.length) return;

    const setActiveTabUI = (activeBtn) => btns.forEach(b => b.classList.toggle('active', b === activeBtn));

    btns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault?.();
        const key = normalize(btn.dataset.tab || btn.textContent);
        const mapped = TAB_TO_CATEGORY[key] || 'ALL';

        if (mapped === 'LIVE_GAMES') {
          activeCategory = 'LIVE_GAMES';
          setActiveTabUI(btn);
          renderLiveGamesList();
          if (sportsTimer) clearInterval(sportsTimer);
          sportsTimer = setInterval(() => {
            if (activeCategory === 'LIVE_GAMES') renderLiveGamesList();
          }, 60_000); // atualiza a cada 60s (jogos que já passaram somem)
          return;
        }

        // comportamento padrão (lista de canais)
        const prev = getVisibleChannels()[selectedIndex];
        activeCategory = mapped;

        const nowList = getVisibleChannels();
        const keepIdx = prev ? nowList.findIndex(c => c.id === prev.id) : -1;
        selectedIndex = keepIdx >= 0 ? keepIdx : 0;

        setActiveTabUI(btn);
        renderList();
        selectChannel(selectedIndex);
      });
    });

    const initial = btns.find(b => normalize(b.dataset.tab || b.textContent) === 'TODOS OS CANAIS') || btns[0];
    if (initial) initial.click();
  }

  // ===== Teclado =====
  function initKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (activeCategory === 'LIVE_GAMES') return; // navegação por setas vale só para canais
      const visible = getVisibleChannels();
      if (!visible.length) return;

      if (e.key === 'ArrowDown') { e.preventDefault(); selectChannel(selectedIndex + 1); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); selectChannel(selectedIndex - 1); }
      if (e.key === 'Enter')     { e.preventDefault(); }
    });
  }

  // ===== Relógio =====
  function initClock() {
    const el = document.getElementById('clock');
    if (!el) return;
    const tick = () => {
      const now = new Date();
      el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    };
    tick(); setInterval(tick, 1000);
  }

  // ===== Fullscreen =====
  function initFullscreen() {
    const btn = document.getElementById('btnFullscreen');
    const container = document.getElementById('playerContainer');
    const infoBar = document.getElementById('infoBar');
    if (!btn || !container) return;

    function updateInfoBarVisibility() {
      const isFS = !!document.fullscreenElement;
      if (infoBar) infoBar.style.display = isFS ? 'none' : '';
    }
    btn.addEventListener('click', async () => {
      if (document.fullscreenElement) await document.exitFullscreen();
      else { updateInfoBarVisibility(); await container.requestFullscreen?.(); }
    });
    document.addEventListener('fullscreenchange', updateInfoBarVisibility);
  }

  // ===== Init =====
  function init() {
    if (!Array.isArray(RAW_CHANNELS)) { console.error('Nenhuma lista de canais disponível.'); return; }
    initTabs();
    renderList();
    if (getVisibleChannels().length) selectChannel(0);
    initKeyboard();
    initClock();
    initFullscreen();
    initPlayShield();
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();

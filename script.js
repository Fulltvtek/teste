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
  const DEFAULT_BASE = 'https://api.reidoscanais.io';
  const API_BASE = (typeof window !== 'undefined' && window.SPORTS_API_BASE) || DEFAULT_BASE;

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
      `${API_BASE}/api/demo?date=${ymd}`,
      `${API_BASE}/api/demo?date=${dmy}`
    ];
    if (typeof window !== 'undefined' && Array.isArray(window.SPORTS_API_ENDPOINTS) && window.SPORTS_API_ENDPOINTS.length) {
      return window.SPORTS_API_ENDPOINTS;
    }
    return defaults;
  }

  // ===== Estado =====
  let selectedIndex = 0;
  let activeCategory = 'ALL';

  const TAB_TO_CATEGORY = {
    'TODOS OS CANAIS': 'ALL',
    'JOGOS AO VIVO': 'LIVE_GAMES',
    'ABERTOS': 'Abertos',
    'ESPORTES': 'Esportes',
    'VARIEDADES': 'Variedades',
    'KIDS': 'Kids',
    'DESTAQUES': 'Destaque'
  };

  const normalize = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();

  function getVisibleChannels() {
    if (activeCategory === 'ALL') return RAW_CHANNELS || [];
    if (activeCategory === 'LIVE_GAMES') return [];
    return (RAW_CHANNELS || []).filter(ch => normalize(ch.category) === normalize(activeCategory));
  }

  // ===== Play Shield =====
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

  // Normaliza URLs para formato de embed (YouTube, etc.)
  function normalizeEmbedUrl(url) {
    if (!url) return url;
    try {
      const u = new URL(url, location.href);
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

  // -------- PRIORIDADE: SEMPRE O PRIMEIRO embed_url ----------
  function getPrimaryEmbedUrl(ev) {
    if (Array.isArray(ev.embeds) && ev.embeds.length) {
      // encontra o primeiro objeto com embed_url; se vier string, usa direto
      for (const it of ev.embeds) {
        if (typeof it === 'string') return it;
        if (it && typeof it.embed_url === 'string') return it.embed_url;
        if (it && typeof it.url === 'string') return it.url; // fallback
      }
    }
    return null;
  }

  // Busca recursiva de outras URLs possíveis (fallbacks genéricos)
  function firstUrlFrom(obj) {
    const urls = [];
    const seen = new Set();
    const push = (v) => { if (typeof v === 'string' && /^https?:\/\//i.test(v)) urls.push(v); };
    const prefKeys = ['streamUrl','player','embed','iframe','watch','url','link','play','hls','m3u8','file','src'];
    const arrayKeys = ['players','links','streams','sources','playlist','manifests','videos'];

    const walk = (val, depth=0) => {
      if (!val || depth > 8) return;
      if (typeof val === 'string') { push(val); return; }
      if (typeof val !== 'object') return;
      if (seen.has(val)) return;
      seen.add(val);

      if (Array.isArray(val)) { for (const v of val) walk(v, depth+1); return; }
      for (const k of ['embeds', ...arrayKeys]) if (k in val) walk(val[k], depth+1);
      for (const k of prefKeys) if (k in val) walk(val[k], depth+1);
      for (const k in val) if (!prefKeys.includes(k) && !arrayKeys.includes(k) && k!=='embeds') walk(val[k], depth+1);
    };
    walk(obj, 0);
    return urls[0] || '';
  }

  // Normaliza o evento (inclui poster e prioridade ao embed_url)
  function normalizeEvent(ev) {
    const title = ev.title ?? ev.name ?? `${ev.team1 || ev.homeTeam?.name || ev.home || '?'} x ${ev.team2 || ev.awayTeam?.name || ev.away || '?'}`;
    const category = ev.category ?? ev.sport ?? ev.league ?? ev.competition ?? 'Esporte';

    const rawStatus = String(
      ev.status ??
      (ev.is_live ? 'live' : '') ??
      (ev.live ? 'live' : '')
    ).toLowerCase();

    let start = ev.start ?? ev.start_time ?? ev.date ?? ev.time ?? ev.kickoff ?? ev.startAt ?? ev.start_at ?? ev.begin;
    if (ev?.time?.start) start = ev.time.start;
    let startMs = null;
    if (typeof start === 'number') startMs = start > 2_000_000_000 ? start : start * 1000;
    else if (typeof start === 'string') {
      const n = Number(start);
      if (!Number.isNaN(n) && n > 0) startMs = n > 2_000_000_000 ? n : n * 1000;
      else { const d = new Date(start.replace(' ', 'T')); if (!isNaN(d)) startMs = d.getTime(); }
    }

    const id = ev.id ?? ev.slug ?? ev._id ??
               `${title}-${startMs || ''}`.replace(/\s+/g,'-').toLowerCase();

    // >>> PRIORIDADE ao primeiro embed_url
    const primary = getPrimaryEmbedUrl(ev);

    // Fallbacks
    const streamUrl =
      primary ||
      ev.streamUrl || ev.player || ev.embed || ev.iframe || ev.url || ev.link || ev.watch ||
      (Array.isArray(ev.players) && (ev.players[0]?.url || ev.players[0])) ||
      (Array.isArray(ev.links)   && (ev.links[0]?.url || ev.links[0]?.href)) ||
      (Array.isArray(ev.streams) && (ev.streams[0]?.file || ev.streams[0]?.url || ev.streams[0]?.src)) ||
      (Array.isArray(ev.sources) && (ev.sources[0]?.file || ev.sources[0]?.src || ev.sources[0]?.url)) ||
      firstUrlFrom(ev);

    const poster = ev.poster || ev.image || ev.thumbnail || ev.thumb || null;
    const detailLink = `${API_BASE}/sports/${encodeURIComponent(id)}`;

    return { id, title, category, start: startMs, status: rawStatus, streamUrl, poster, detailLink };
  }

  // Define a fonte do player com fallbacks
  function setPlayerSource(rawUrl, fallbackHrefIfNoUrl) {
    const iframe = player();
    const notice = document.getElementById('playerNotice');
    const open = document.getElementById('playerOpen');
    const url = normalizeEmbedUrl(rawUrl);

    const show = (msg, href, openLabel='Abrir em nova aba ↗') => {
      if (notice) { notice.textContent = msg; notice.style.display = ''; }
      if (open) {
        if (href) { open.href = href; open.textContent = openLabel; open.style.display = ''; }
        else { open.style.display = 'none'; }
      }
    };
    const hide = () => {
      if (notice) notice.style.display = 'none';
      if (open) open.style.display = 'none';
    };

    hide();

    if (!url) {
      if (iframe) iframe.src = 'about:blank';
      const href = fallbackHrefIfNoUrl || '#';
      show('Fonte indisponível para este evento.', href, 'Abrir detalhes do evento (JSON) ↗');
      return;
    }

    if (location.protocol === 'https:' && url.startsWith('http:')) {
      if (iframe) iframe.src = 'about:blank';
      show('Este vídeo usa HTTP e foi bloqueado pelo navegador (conteúdo misto).', url);
      return;
    }

    if (iframe) iframe.src = url;
    let ok = false;
    const onLoad = () => { ok = true; if (iframe) iframe.removeEventListener('load', onLoad); };
    if (iframe) iframe.addEventListener('load', onLoad, { once: true });
    setTimeout(() => {
      if (!ok) {
        show('O site do vídeo não permite incorporação.', url);
      }
    }, 3000);
  }

  function selectChannel(idx) {
    const visible = getVisibleChannels();
    if (!visible.length) return;

    selectedIndex = Math.max(0, Math.min(idx, visible.length - 1));
    const ch = visible[selectedIndex];

    setPlayerSource(ch.streamUrl || '', null);

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

        const arr = Array.isArray(j) ? j
                  : Array.isArray(j?.data) ? j.data
                  : Array.isArray(j?.events) ? j.events
                  : [];

        const normalized = arr.map(normalizeEvent);
        collected = collected.concat(normalized);
      } catch(_) {}
    }

    const items = collected.filter(ev => {
      const s = (ev.status || '').toLowerCase();
      if (s.includes('end') || ['finished','concluded','ended','finalizado','encerrado'].includes(s)) return false;
      if (ev.start && ev.start < Date.now() && !s.includes('live')) return false;
      return !!ev.title;
    });

    const seen = new Set(); const uniq = [];
    for (const ev of items) {
      const k = ev.id || ev.title;
      if (!seen.has(k)) { seen.add(k); uniq.push(ev); }
    }

    sportsCache = { items: uniq, ts: now };
    return uniq;
  }

  async function fetchEventDetail(id) {
    const bases = [ `${API_BASE}/sports/`, `${API_BASE}/events/`, `${API_BASE}/api/events/` ];
    for (const b of bases) {
      try {
        const r = await fetch(`${b}${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (!r.ok) continue;
        const d = await r.json();

        // prioridade: primeiro embed_url do detalhe também
        const primary = getPrimaryEmbedUrl(d) || (d?.data && getPrimaryEmbedUrl(d.data));
        if (primary) return normalizeEvent({ ...d, streamUrl: primary });

        const n = normalizeEvent(d);
        if (n.streamUrl) return n;

        if (d?.data) {
          const n2 = normalizeEvent(d.data);
          if (n2.streamUrl) return n2;
        }

        const any = firstUrlFrom(d);
        if (any) return normalizeEvent({ ...d, streamUrl: any });
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
      if (ev.poster) {
        const img = document.createElement('img');
        img.src = ev.poster;
        img.alt = ev.title || 'Evento';
        img.loading = 'lazy';
        logoWrap.appendChild(img);
      } else {
        const fallback = document.createElement('div');
        fallback.textContent = (ev.title || '?').charAt(0).toU

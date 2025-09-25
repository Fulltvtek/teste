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
  const SPORTS_API = 'https://api.reidoscanais.io/sports';
  let sportsCache = { items: [], ts: 0 };
  let sportsTimer = null;

  async function fetchLiveAndUpcoming() {
    const now = Date.now();
    if ((now - sportsCache.ts) < 60_000 && sportsCache.items.length) return sportsCache.items;

    const urls = [`${SPORTS_API}?status=live`, `${SPORTS_API}?status=upcoming`];
    let all = [];
    for (const u of urls) {
      try {
        const r = await fetch(u, { cache: 'no-store' });
        if (!r.ok) continue;
        const j = await r.json();
        const arr = Array.isArray(j) ? j : (Array.isArray(j?.data) ? j.data : []);
        all = all.concat(arr);
      } catch(_) {}
    }

    const mapEvent = (ev) => ({
      id: ev.id ?? ev.slug ?? ev._id ?? `${ev.homeTeam?.name || ev.home || ''}-${ev.awayTeam?.name || ev.away || ''}-${ev.start || ev.time || ''}`,
      title: ev.title ?? ev.name ?? `${ev.homeTeam?.name || ev.home || '?'} x ${ev.awayTeam?.name || ev.away || '?'}`,
      category: ev.category ?? ev.sport ?? ev.league ?? 'Esporte',
      start: ev.start ?? ev.date ?? ev.time ?? ev.kickoff ?? ev.start_time ?? null,
      status: String(ev.status ?? '').toLowerCase(),
      streamUrl: ev.streamUrl ?? ev.url ?? ev.embed ?? ev.link ?? null
    });

    // filtra fora eventos finalizados/passados (exibimos ao vivo e próximos)
    const items = all.map(mapEvent).filter(ev => {
      const s = ev.status;
      if (s.includes('end') || ['finished','concluded','ended','finalizado','encerrado'].includes(s)) return false;
      const dt = ev.start ? new Date(ev.start) : null;
      if (dt && !isNaN(dt) && dt.getTime() < Date.now() && !s.includes('live')) return false;
      return true;
    });

    // de-dup
    const seen = new Set(); const uniq = [];
    for (const ev of items) {
      const k = ev.id || ev.title;
      if (!seen.has(k)) { seen.add(k); uniq.push(ev); }
    }

    sportsCache = { items: uniq, ts: now };
    return uniq;
  }

  async function fetchEventDetail(id) {
    try {
      const r = await fetch(`${SPORTS_API}/${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (!r.ok) return null;
      return await r.json();
    } catch(_) { return null; }
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
      badge.textContent = (ev.status?.includes('live') ? 'AO VIVO' : 'PRÓXIMO');

      titleRow.append(name, badge);

      const cat = document.createElement('div');
      cat.className = 'channel-category';
      const dateLabel = ev.start ? new Date(ev.start).toLocaleString() : '';
      cat.textContent = [ev.category, dateLabel].filter(Boolean).join(' • ');

      textWrap.append(titleRow, cat);
      btn.append(logoWrap, textWrap);

      btn.addEventListener('click', async () => {
        let url = ev.streamUrl;
        if (!url) {
          const det = await fetchEventDetail(ev.id);
          url = det?.streamUrl ?? det?.url ?? det?.embed ?? null;
        }
        setPlayerSource(url || '');

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

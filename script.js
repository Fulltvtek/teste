(function () {
  // ===== Estado =====
  let selectedIndex = 0;
  let activeCategory = 'ALL'; // Todos os canais

  const TAB_TO_CATEGORY = {
    'TODOS OS CANAIS': 'ALL',
    'ABERTOS': 'Abertos',
    'ESPORTES': 'Esportes',
    'VARIEDADES': 'Variedades',
    'KIDS': 'Kids',
    'DESTAQUES': 'Destaque'
  };

  const normalize = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();

  function getVisibleChannels() {
    if (activeCategory === 'ALL') return CHANNELS || [];
    return (CHANNELS || []).filter(ch => normalize(ch.category) === normalize(activeCategory));
  }

  // ===== Render lista =====
  function renderList() {
    const listEl = document.getElementById('channelList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const visible = getVisibleChannels();
    if (!visible.length) {
      const empty = document.createElement('div');
      empty.textContent = 'Nenhum canal nesta categoria.';
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

  // ===== Player =====
  const player = () => document.getElementById('player');
  const infoTitle = () => document.getElementById('infoTitle');
  const infoSubtitle = () => document.getElementById('infoSubtitle');

  function selectChannel(idx) {
    const visible = getVisibleChannels();
    if (!visible.length) return;

    selectedIndex = Math.max(0, Math.min(idx, visible.length - 1));
    const ch = visible[selectedIndex];

    const iframe = player();
    if (iframe) iframe.src = ch.streamUrl || 'about:blank';

    const t = infoTitle();
    const s = infoSubtitle();
    if (t) t.textContent = ch.name || '—';
    if (s) s.textContent = ch.category || '—';

    renderList();
  }

  // ===== Abas =====
  function initTabs() {
    const btns = Array.from(document.querySelectorAll('header nav.menu button'));
    if (!btns.length) return;

    function setActiveTabUI(activeBtn) {
      btns.forEach(b => b.classList.toggle('active', b === activeBtn));
    }

    btns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault?.();
        const key = normalize(btn.dataset.tab || btn.textContent);
        const mapped = TAB_TO_CATEGORY[key] || 'ALL';

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

    // Estado inicial
    const initial = btns.find(b => normalize(b.dataset.tab || b.textContent) === 'TODOS OS CANAIS') || btns[0];
    if (initial) initial.click();
  }

  // ===== Teclado =====
  function initKeyboard() {
    window.addEventListener('keydown', (e) => {
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
    if (!Array.isArray(CHANNELS)) { console.error('channels.js não carregado.'); return; }
    initTabs();
    renderList();
    if (getVisibleChannels().length) selectChannel(0);
    initKeyboard();
    initClock();
    initFullscreen();
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();

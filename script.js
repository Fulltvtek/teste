/* script.js
 * Requer: channels.js (expõe const CHANNELS)
 */

(function () {
  // ====== Estado ======
  let selectedIndex = 0;      // índice na lista visível/filtrada
  let activeCategory = 'ALL'; // "Todos os canais"

  // ====== Mapeamento de abas -> categoria ======
  const TAB_TO_CATEGORY = {
    'TODOS OS CANAIS': 'ALL',
    'ABERTOS': 'Abertos',
    'ESPORTES': 'Esportes',
    'VARIEDADES': 'Variedades',
    'KIDS': 'Kids',
    'DESTAQUES': 'Destaque',

    // compatibilidade (caso alguém mude o HTML)
    'TV': 'Abertos',
    'EXPLORAR': 'ALL',
    'FILMES': 'Esportes',
    'SÉRIES': 'Variedades',
    'SERIES': 'Variedades'
  };

  // ====== Util ======
  const normalize = (s) =>
    (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();

  function getVisibleChannels() {
    if (activeCategory === 'ALL') return CHANNELS || [];
    return (CHANNELS || []).filter(ch => normalize(ch.category) === normalize(activeCategory));
  }

  // ====== Render da lista lateral ======
  function renderList() {
    const listEl = document.getElementById('channelList');
    if (!listEl) return;

    listEl.innerHTML = '';
    const visible = getVisibleChannels();

    if (!visible.length) {
      const empty = document.createElement('div');
      empty.textContent = 'Nenhum canal nesta categoria.';
      empty.style.opacity = '0.8';
      listEl.appendChild(empty);
      return;
    }

    visible.forEach((ch, idx) => {
      const btn = document.createElement('button');
      btn.className = 'channel-item';
      // destaque visual do item ativo (se quiser, defina .channel-item.active no style.css)
      if (idx === selectedIndex) btn.classList.add('active');

      // bloco do logo
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

      // textos
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

  // ====== Player / seleção ======
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

    renderList(); // atualiza destaque na lista
  }

  // ====== Abas do topo ======
  function initTabs() {
    const btns = Array.from(document.querySelectorAll('header nav button'));
    if (!btns.length) return;

    function setActiveTabUI(activeBtn) {
      btns.forEach(b => {
        const isActive = b === activeBtn;
        // Se usa Tailwind no HTML, isso já dá um visual legal:
        b.classList.toggle('text-white', isActive);
        b.classList.toggle('font-semibold', isActive);
        b.classList.toggle('text-white/60', !isActive);
      });
    }

    btns.forEach(btn => {
      // garante dataset.tab em MAIÚSCULAS
      if (!btn.dataset.tab) btn.dataset.tab = normalize(btn.textContent);

      btn.addEventListener('click', (e) => {
        e.preventDefault?.();

        const key = normalize(btn.dataset.tab || btn.textContent);
        const mapped = TAB_TO_CATEGORY[key] || 'ALL';

        // tenta preservar o canal ao trocar de aba
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

    // Estado inicial: "Todos os canais"
    const initial = btns.find(b => normalize(b.dataset.tab || b.textContent) === 'TODOS OS CANAIS') || btns[0];
    if (initial) initial.click();
  }

  // ====== Teclado ======
  function initKeyboard() {
    window.addEventListener('keydown', (e) => {
      const visible = getVisibleChannels();
      if (!visible.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectChannel(selectedIndex + 1);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectChannel(selectedIndex - 1);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        // já está selecionado -> nada a fazer
      }
    });
  }

  // ====== Relógio (opcional) ======
  function initClock() {
    const el = document.getElementById('clock');
    if (!el) return;
    const tick = () => {
      const now = new Date();
      el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    };
    tick();
    setInterval(tick, 1000);
  }

  // ====== Fullscreen (opcional, só se tiver botão/ids no HTML) ======
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
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        updateInfoBarVisibility(); // esconde já ao entrar
        await container.requestFullscreen?.();
      }
    });
    document.addEventListener('fullscreenchange', updateInfoBarVisibility);
  }

  // ====== Inicialização ======
  function init() {
    if (!Array.isArray(CHANNELS)) {
      console.error('channels.js não carregado ou CHANNELS inválido.');
      return;
    }
    initTabs();
    renderList();
    if (getVisibleChannels().length) selectChannel(0);
    initKeyboard();
    initClock();
    initFullscreen(); // só ativa se existir no HTML
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

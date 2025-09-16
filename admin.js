/* admin.js — Painel Fulltv (com ID estável, excluir/renumerar, inserir deslocando) */
(function(){
  // Carrega a lista publicada (channels.js)
  let channels = Array.isArray(CHANNELS) ? JSON.parse(JSON.stringify(CHANNELS)) : [];
  let editIndex = null; // índice atual (na lista ordenada)

  // DOM helpers
  const $ = (id) => document.getElementById(id);
  const tbody = $('tbody');

  // ===== Utilidades =====
  const genId = () => (crypto?.randomUUID?.() || ('id_' + Date.now().toString(36) + Math.random().toString(36).slice(2,9)));
  const toInt = (v, d=1) => { const n = parseInt(v,10); return Number.isNaN(n) ? d : n; };
  const compare = (a,b) => (toInt(a.number)-toInt(b.number)) || (a.name||'').localeCompare(b.name||'');

  function sortByNumber(){ channels.sort(compare); }

  function clampForAdd(n){
    const max = channels.length + 1;
    return Math.min(Math.max(1, n), max);
  }

  function clampForEdit(n){
    // durante edição removemos 1 item → posição válida ainda é [1..len+1]
    const max = channels.length + 1;
    return Math.min(Math.max(1, n), max);
  }

  function shiftUpFrom(n){
    // empurra  n, n+1, n+2, ...  =>  +1
    channels.forEach(c => { if (toInt(c.number) >= n) c.number = toInt(c.number)+1; });
  }

  function shiftDownFrom(n){
    // puxa    (n+1)->n, (n+2)->(n+1), ...
    channels.forEach(c => { if (toInt(c.number) > n) c.number = toInt(c.number)-1; });
  }

  function ensureIds(){
    // garante ID único
    const seen = new Set();
    channels.forEach(c=>{
      if(!c.id || seen.has(c.id)) c.id = genId();
      seen.add(c.id);
    });
  }

  function readForm(){
    const data = {
      number:   toInt(($('fNumber').value||'').trim(), NaN),
      name:     ($('fName').value||'').trim(),
      category: ($('fCategory').value||'').trim() || 'Abertos',
      quality:  ($('fQuality').value||'').trim() || 'HD',
      logoUrl:  ($('fLogo').value||'').trim(),
      streamUrl:($('fStream').value||'').trim(),
      live:     $('fLive').checked
    };
    if (!data.name) throw new Error('Informe o nome do canal');
    if (!data.streamUrl) throw new Error('Informe o link do player (streamUrl)');
    if (Number.isNaN(data.number)) throw new Error('Informe o número do canal');
    return data;
  }

  function fillForm(ch){
    $('fNumber').value = ch.number ?? '';
    $('fName').value = ch.name ?? '';
    $('fCategory').value = ch.category ?? 'Abertos';
    $('fQuality').value = ch.quality ?? 'HD';
    $('fLogo').value = ch.logoUrl ?? '';
    $('fStream').value = ch.streamUrl ?? '';
    $('fLive').checked = !!ch.live;
  }

  function resetForm(){
    editIndex = null;
    $('fNumber').value = '';
    $('fName').value = '';
    $('fCategory').value = 'Abertos';
    $('fQuality').value = 'HD';
    $('fLogo').value = '';
    $('fStream').value = '';
    $('fLive').checked = true;
  }

  // ===== CRUD com regras de numeração =====
  function addNew(data){
    sortByNumber();
    ensureIds();
    const n = clampForAdd(toInt(data.number));
    shiftUpFrom(n); // abre espaço
    channels.push({ id: genId(), ...data, number: n });
    sortByNumber();
    renderTable();
    resetForm();
  }

  function updateExisting(idx, data){
    sortByNumber();
    ensureIds();

    const current = channels[idx];
    if (!current) return;

    const oldN = toInt(current.number);
    const newN = clampForEdit(toInt(data.number));

    // Remove primeiro
    const keptId = current.id || genId();
    channels.splice(idx, 1);

    // Fecha o buraco do número antigo
    shiftDownFrom(oldN);

    // Insere no novo número, abrindo espaço
    shiftUpFrom(newN);
    channels.push({ id: keptId, ...data, number: newN });

    sortByNumber();
    renderTable();
    resetForm();
  }

  function deleteAt(idx){
    sortByNumber();
    const removed = channels[idx];
    if (!removed) return;
    const n = toInt(removed.number);
    channels.splice(idx,1);
    // renumera puxando os seguintes
    shiftDownFrom(n);
    sortByNumber();
    renderTable();
  }

  // ===== Tabela =====
  function renderTable(){
    sortByNumber();
    tbody.innerHTML = '';
    channels.forEach((ch, idx) => {
      const tr = document.createElement('tr');

      const tdNum = document.createElement('td'); tdNum.textContent = ch.number ?? '';
      const tdName= document.createElement('td'); tdName.textContent = ch.name ?? '';
      const tdCat = document.createElement('td'); tdCat.textContent = ch.category ?? '';
      const tdQl  = document.createElement('td'); tdQl.textContent = ch.quality ?? '';
      const tdLv  = document.createElement('td'); tdLv.textContent = ch.live ? 'Sim':'Não';
      const tdLo  = document.createElement('td'); tdLo.innerHTML = ch.logoUrl ? `<a href="${ch.logoUrl}" target="_blank">logo</a>` : '—';
      const tdSt  = document.createElement('td'); tdSt.innerHTML = ch.streamUrl ? `<a href="${ch.streamUrl}" target="_blank">abrir</a>` : '—';

      const tdAct = document.createElement('td'); tdAct.className = 'td-actions';
      const bEdit = document.createElement('button'); bEdit.className='btn'; bEdit.textContent='Editar';
      const bDel  = document.createElement('button'); bDel.className='btn danger'; bDel.textContent='Excluir';
      const bUp   = document.createElement('button'); bUp.className='btn'; bUp.textContent='↑';
      const bDown = document.createElement('button'); bDown.className='btn'; bDown.textContent='↓';

      bEdit.onclick = () => { editIndex = idx; fillForm(ch); window.scrollTo({top:0,behavior:'smooth'}); };
      bDel.onclick  = () => { if(confirm(`Excluir "${ch.name}" (nº ${ch.number})?`)){ deleteAt(idx); } };
      bUp.onclick   = () => {
        if (idx > 0) {
          // troca números com o anterior
          const prev = channels[idx-1];
          const t = prev.number; prev.number = ch.number; ch.number = t;
          sortByNumber(); renderTable();
        }
      };
      bDown.onclick = () => {
        if (idx < channels.length-1) {
          const next = channels[idx+1];
          const t = next.number; next.number = ch.number; ch.number = t;
          sortByNumber(); renderTable();
        }
      };

      tdAct.append(bEdit,bDel,bUp,bDown);
      tr.append(tdNum,tdName,tdCat,tdQl,tdLv,tdLo,tdSt,tdAct);
      tbody.appendChild(tr);
    });
  }

  // ===== Export/Import/Preview =====
  function download(filename, text){
    const blob = new Blob([text], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function exportJS(){
    sortByNumber(); ensureIds();
    const header = '// channels.js — gerado pelo painel Fulltv\n';
    const body = 'const CHANNELS = ' + JSON.stringify(channels, null, 2) + ';\n';
    download('channels.js', header + body);
  }

  function exportJSON(){
    sortByNumber(); ensureIds();
    download('channels.json', JSON.stringify(channels, null, 2));
  }

  function savePreview(){
    sortByNumber(); ensureIds();
    localStorage.setItem('CHANNELS_OVERRIDE', JSON.stringify(channels));
    alert('Pré-visualização salva! Abra o index.html para testar (sem publicar).');
  }

  function clearPreview(){
    localStorage.removeItem('CHANNELS_OVERRIDE');
    alert('Pré-visualização removida. O site volta a usar o channels.js publicado.');
  }

  function importFile(file){
    const reader = new FileReader();
    reader.onload = () => {
      const txt = reader.result;
      try {
        let data;
        if (/const\s+CHANNELS\s*=/.test(txt)) {
          const jsonPart = txt.slice(txt.indexOf('['), txt.lastIndexOf(']')+1);
          data = JSON.parse(jsonPart);
        } else {
          data = JSON.parse(txt);
        }
        if (!Array.isArray(data)) throw new Error('Arquivo não contém uma lista de canais válida.');

        // normaliza e assegura IDs
        channels = data.map((c)=>({
          id: c.id || genId(),
          number: toInt(c.number),
          name: c.name || '',
          category: c.category || 'Abertos',
          quality: c.quality || 'HD',
          logoUrl: c.logoUrl || '',
          live: !!c.live,
          streamUrl: c.streamUrl || ''
        }));
        sortByNumber();
        renderTable();
        alert('Importado com sucesso!');
      } catch(e){
        alert('Falha ao importar: ' + (e.message || String(e)));
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  // ===== Eventos =====
  $('btnAdd').onclick = () => {
    try{
      const data = readForm();
      if (editIndex === null) addNew(data);
      else updateExisting(editIndex, data);
    }catch(err){ alert(err.message || String(err)); }
  };
  $('btnResetForm').onclick = resetForm;
  $('btnExportJS').onclick = exportJS;
  $('btnExportJSON').onclick = exportJSON;
  $('btnSavePreview').onclick = savePreview;
  $('btnClearPreview').onclick = clearPreview;
  $('fileImport').addEventListener('change', (e)=>{
    const f = e.target.files?.[0];
    if (f) importFile(f);
    e.target.value = '';
  });

  // Init
  sortByNumber(); ensureIds(); renderTable();
})();

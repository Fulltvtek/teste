/* admin.js */
(function(){
  // Carrega a lista atual do arquivo channels.js
  let channels = Array.isArray(CHANNELS) ? JSON.parse(JSON.stringify(CHANNELS)) : [];

  // Estado de edição (índice na tabela ou null)
  let editIndex = null;

  // Referências
  const $ = (id) => document.getElementById(id);
  const tbody = $('tbody');

  // Helpers
  function uid() {
    // id simples e estável se possível
    return Math.floor(Date.now() + Math.random() * 1000);
  }

  function toBool(v){ return !!v; }

  function readForm(){
    const number   = parseInt(($('fNumber').value||'').trim(), 10);
    const name     = ($('fName').value||'').trim();
    const category = ($('fCategory').value||'').trim();
    const quality  = ($('fQuality').value||'').trim();
    const logoUrl  = ($('fLogo').value||'').trim();
    const streamUrl= ($('fStream').value||'').trim();
    const live     = $('fLive').checked;

    if (!name) throw new Error('Informe o nome do canal');
    if (!streamUrl) throw new Error('Informe o link do player (streamUrl)');
    if (Number.isNaN(number)) throw new Error('Informe o número do canal');

    return { number, name, category, quality, logoUrl, live: toBool(live), streamUrl };
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

  function renderTable(){
    tbody.innerHTML = '';
    channels
      .sort((a,b)=> (a.number??0)-(b.number??0) || (a.name||'').localeCompare(b.name||''))
      .forEach((ch, idx) => {
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
        bDel.onclick  = () => { if(confirm(`Excluir "${ch.name}"?`)){ channels.splice(idx,1); renderTable(); } };
        bUp.onclick   = () => { if(idx>0){ const [item] = channels.splice(idx,1); channels.splice(idx-1,0,item); renderTable(); } };
        bDown.onclick = () => { if(idx<channels.length-1){ const [item] = channels.splice(idx,1); channels.splice(idx+1,0,item); renderTable(); } };

        tdAct.append(bEdit,bDel,bUp,bDown);
        tr.append(tdNum,tdName,tdCat,tdQl,tdLv,tdLo,tdSt,tdAct);
        tbody.appendChild(tr);
      });
  }

  function addOrUpdate(){
    try{
      const data = readForm();
      if (editIndex === null){
        // novo
        channels.push({
          id: uid(),
          ...data
        });
      } else {
        // atualizar (preserva id)
        const old = channels[editIndex];
        channels[editIndex] = { id: old?.id ?? uid(), ...data };
      }
      resetForm();
      renderTable();
    } catch(err){
      alert(err.message || String(err));
    }
  }

  function download(filename, text){
    const blob = new Blob([text], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function exportJS(){
    const header = '// channels.js — gerado pelo painel Fulltv\n';
    const body = 'const CHANNELS = ' + JSON.stringify(channels, null, 2) + ';\n';
    download('channels.js', header + body);
  }

  function exportJSON(){
    download('channels.json', JSON.stringify(channels, null, 2));
  }

  function savePreview(){
    localStorage.setItem('CHANNELS_OVERRIDE', JSON.stringify(channels));
    alert('Pré-visualização salva! Abra o index.html para testar (sem publicar).');
  }

  function clearPreview(){
    localStorage.removeItem('CHANNELS_OVERRIDE');
    alert('Pré-visualização removida. O site voltará a usar o channels.js publicado.');
  }

  function importFile(file){
    const reader = new FileReader();
    reader.onload = () => {
      const txt = reader.result;
      try {
        let data;
        if (/const\s+CHANNELS\s*=/.test(txt)) {
          // arquivo .js — tenta extrair o array
          const jsonPart = txt.slice(txt.indexOf('['), txt.lastIndexOf(']')+1);
          data = JSON.parse(jsonPart);
        } else {
          data = JSON.parse(txt);
        }
        if (!Array.isArray(data)) throw new Error('Arquivo não contém uma lista de canais válida.');
        // normaliza itens mínimos
        channels = data.map((c)=>({
          id: c.id ?? uid(),
          number: c.number ?? 0,
          name: c.name ?? '',
          category: c.category ?? 'Abertos',
          quality: c.quality ?? 'HD',
          logoUrl: c.logoUrl ?? '',
          live: !!c.live,
          streamUrl: c.streamUrl ?? ''
        }));
        renderTable();
        alert('Importado com sucesso!');
      } catch(e){
        alert('Falha ao importar: ' + (e.message || String(e)));
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  // Eventos
  $('btnAdd').onclick = addOrUpdate;
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

  // Inicializa
  renderTable();
})();

// explore.js — modo "Explorar"
// Mostra uma grade com 3 cartões altos e 1 pequeno à direita.
// (Deixei suporte para um 2º pequeno, caso queira no futuro.)
export function mount({ host, placeholderImage, onOpenReality, onOpenMV, onOpenSports, onOpenAdult }) {
  if (!host) return { destroy(){} };

  // cria grade
  const grid = document.createElement('div');
  grid.className = 'explore-grid';

  const mkTile = (label, size, onClick) => {
    const el = document.createElement('div');
    el.className = `tile ${size}`;
    const img = document.createElement('img');
    img.src = placeholderImage;   // a mesma imagem temporária em todas
    img.alt = label;
    img.loading = 'lazy';
    const tag = document.createElement('div');
    tag.className = 'label';
    tag.textContent = label;
    el.append(img, tag);
    if (typeof onClick === 'function') el.addEventListener('click', onClick);
    return el;
  };

  // Layout: [BIG, BIG, BIG, SMALL(+ opcional outro SMALL embaixo)]
  const tReality = mkTile('Reality Show', 'big', onOpenReality);
  const tMV      = mkTile('MV',            'big', onOpenMV);
  const tSports  = mkTile('Sports',        'big', onOpenSports);
  const tAdult   = mkTile('Adulto',        'small', onOpenAdult);

  grid.append(tReality, tMV, tSports, tAdult);

  // Se quiser mostrar um 2º pequeno, descomente:
  // const tSmall2 = mkTile('Em breve', 'small', null);
  // grid.append(tSmall2);

  host.replaceChildren(grid);

  return {
    destroy(){ if (host && host.firstChild === grid) host.removeChild(grid); }
  };
}

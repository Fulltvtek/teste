// explore.js — tela "Explorar" com cartões (Reality Show, MV, Sports, Adulto)
export function mount({ listEl, placeholderImage, onOpenReality, onOpenMV, onOpenSports, onOpenAdult }) {
  const root = document.createElement('div');
  root.className = 'explore-grid';

  const cards = [
    { key: 'reality', label: 'Reality Show', onClick: onOpenReality },
    { key: 'mv',      label: 'MV',           onClick: onOpenMV },
    { key: 'sports',  label: 'Sports',       onClick: onOpenSports },
    { key: 'adult',   label: 'Adulto',       onClick: onOpenAdult }
  ];

  const mkCard = ({ label, onClick }) => {
    const card = document.createElement('div');
    card.className = 'explore-card';
    const img = document.createElement('img');
    img.src = placeholderImage;   // mesma imagem provisória para todas
    img.alt = label;
    img.loading = 'lazy';
    const tag = document.createElement('div');
    tag.className = 'label';
    tag.textContent = label;
    card.append(img, tag);
    card.addEventListener('click', () => { if (typeof onClick === 'function') onClick(); });
    return card;
  };

  root.replaceChildren(...cards.map(mkCard));
  if (listEl) listEl.replaceChildren(root);

  return {
    destroy() { if (root && root.parentNode) root.parentNode.removeChild(root); }
  };
}

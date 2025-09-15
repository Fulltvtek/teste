let selectedIndex = 0;
let activeCategory = "ALL";

function getVisibleChannels() {
  if (activeCategory === "ALL") return CHANNELS;
  return CHANNELS.filter(ch => ch.category.toUpperCase() === activeCategory);
}

function renderList() {
  const list = document.getElementById("channelList");
  list.innerHTML = "";
  getVisibleChannels().forEach((ch, idx) => {
    const btn = document.createElement("button");
    btn.textContent = `${ch.number} - ${ch.name} (${ch.category})`;
    btn.onclick = () => selectChannel(idx);
    list.appendChild(btn);
  });
}

function selectChannel(idx) {
  const ch = getVisibleChannels()[idx];
  document.getElementById("player").src = ch.streamUrl;
  document.getElementById("infoTitle").textContent = ch.name;
  document.getElementById("infoSubtitle").textContent = ch.category;
  selectedIndex = idx;
}

function initTabs() {
  document.querySelectorAll("nav button").forEach(btn => {
    btn.onclick = () => {
      activeCategory = btn.dataset.tab;
      renderList();
      if (getVisibleChannels().length) selectChannel(0);
    };
  });
}

// Inicia ao carregar
window.onload = () => {
  initTabs();
  renderList();
  if (CHANNELS.length) selectChannel(0);
};

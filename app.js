// Lighting Designer 2D - PWA, vanilla JS

// Model danych

const ELEMENT_TYPES = [
  {
    id: "spot",
    name: "Spot",
    color: "#facc15",
    width: 40,
    height: 40
  },
  {
    id: "wash",
    name: "Wash",
    color: "#fb923c",
    width: 50,
    height: 50
  },
  {
    id: "beam",
    name: "Beam",
    color: "#38bdf8",
    width: 30,
    height: 60
  },
  {
    id: "bar",
    name: "LED bar",
    color: "#22c55e",
    width: 80,
    height: 20
  }
];

const STORAGE_KEY = "lighting_designer_projects_v1";

let projects = [];
let currentProjectId = null;
let selectedElementId = null;

// Canvas / scena

const canvas = document.getElementById("stageCanvas");
const ctx = canvas.getContext("2d");

let canvasRect = canvas.getBoundingClientRect();

function resizeCanvas() {
  const wrapper = document.querySelector(".canvas-wrapper");
  const w = wrapper.clientWidth;
  const h = wrapper.clientHeight;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  canvasRect = canvas.getBoundingClientRect();
  renderScene();
}

window.addEventListener("resize", resizeCanvas);

// Projekty / localStorage

function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      projects = [];
      return;
    }
    projects = JSON.parse(raw);
  } catch (e) {
    console.error("Błąd odczytu projektów", e);
    projects = [];
  }
}

function saveProjects() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function createProject(name = "Nowy projekt") {
  const project = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    elements: []
  };
  projects.unshift(project);
  currentProjectId = project.id;
  selectedElementId = null;
  saveProjects();
  refreshProjectsList();
  renderScene();
}

function getCurrentProject() {
  return projects.find(p => p.id === currentProjectId) || null;
}

// UI: lista projektów

const projectsListEl = document.getElementById("projectsList");

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function refreshProjectsList() {
  projectsListEl.innerHTML = "";

  if (projects.length === 0) {
    const p = document.createElement("p");
    p.textContent = "Brak projektów. Kliknij „Nowy projekt”.";
    p.style.fontSize = "0.8rem";
    p.style.color = "#9ca3af";
    projectsListEl.appendChild(p);
    return;
  }

  for (const project of projects) {
    const div = document.createElement("div");
    div.className =
      "project-item" +
      (project.id === currentProjectId ? " active" : "");

    const nameEl = document.createElement("div");
    nameEl.className = "project-item-name";
    nameEl.textContent = project.name;

    const metaEl = document.createElement("div");
    metaEl.className = "project-item-meta";
    metaEl.textContent = `${formatDate(project.createdAt)} · ${project.elements.length} elem.`;

    div.appendChild(nameEl);
    div.appendChild(metaEl);

    div.addEventListener("click", () => {
      currentProjectId = project.id;
      selectedElementId = null;
      refreshProjectsList();
      updatePropertiesPanel();
      renderScene();
    });

    projectsListEl.appendChild(div);
  }
}

// UI: paleta

const paletteEl = document.getElementById("palette");

function setupPalette() {
  ELEMENT_TYPES.forEach(t => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "palette-item";

    const icon = document.createElement("div");
    icon.className = "palette-icon";
    icon.style.background = t.color;

    const label = document.createElement("div");
    label.className = "palette-label";
    label.textContent = t.name;

    item.appendChild(icon);
    item.appendChild(label);

    item.addEventListener("click", () => {
      addElementOfType(t.id);
    });

    paletteEl.appendChild(item);
  });
}

function addElementOfType(typeId) {
  const project = getCurrentProject();
  if (!project) {
    alert("Najpierw utwórz projekt.");
    return;
  }
  const type = ELEMENT_TYPES.find(t => t.id === typeId);
  if (!type) return;

  const el = {
    id: crypto.randomUUID(),
    typeId,
    x: 0.5,
    y: 0.5,
    scale: 1,
    color: type.color
  };

  project.elements.push(el);
  selectedElementId = el.id;
  saveProjects();
  refreshProjectsList();
  updatePropertiesPanel();
  renderScene();
}

// Canvas: rysowanie sceny

function renderScene() {
  const project = getCurrentProject();
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);

  ctx.clearRect(0, 0, w, h);

  // tło
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, "#020617");
  grd.addColorStop(0.5, "#111827");
  grd.addColorStop(1, "#020617");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  // scena - prostokąt "widok od frontu"
  const stageHeight = h * 0.6;
  const stageY = h * 0.15;
  const stageMargin = w * 0.1;

  ctx.fillStyle = "#020617";
  ctx.fillRect(stageMargin, stageY, w - stageMargin * 2, stageHeight);

  // kratka
  ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
  ctx.lineWidth = 0.5;
  const rows = 8;
  const cols = 10;
  for (let i = 0; i <= rows; i++) {
    const y = stageY + (stageHeight * i) / rows;
    ctx.beginPath();
    ctx.moveTo(stageMargin, y);
    ctx.lineTo(w - stageMargin, y);
    ctx.stroke();
  }
  for (let j = 0; j <= cols; j++) {
    const x = stageMargin + ((w - stageMargin * 2) * j) / cols;
    ctx.beginPath();
    ctx.moveTo(x, stageY);
    ctx.lineTo(x, stageY + stageHeight);
    ctx.stroke();
  }

  // podest
  const platformH = h * 0.08;
  ctx.fillStyle = "#020617";
  ctx.fillRect(stageMargin * 0.5, stageY + stageHeight + 6, w - stageMargin, platformH);

  if (!project) return;

  for (const el of project.elements) {
    drawElement(el, w, h);
  }
}

function drawElement(el, w, h) {
  const type = ELEMENT_TYPES.find(t => t.id === el.typeId);
  if (!type) return;

  const stageHeight = h * 0.6;
  const stageY = h * 0.15;
  const stageMargin = w * 0.1;

  const baseW = type.width * el.scale;
  const baseH = type.height * el.scale;

  const minX = stageMargin;
  const maxX = w - stageMargin;
  const minY = stageY;
  const maxY = stageY + stageHeight;

  const x = minX + (maxX - minX) * el.x;
  const y = minY + (maxY - minY) * el.y;

  const isSelected = el.id === selectedElementId;

  // "obudowa" reflektora
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.roundRect(-baseW / 2 - 4, -baseH / 2 - 4, baseW + 8, baseH + 8, 6);
  ctx.fill();

  // źródło światła
  ctx.fillStyle = el.color || type.color;
  ctx.beginPath();
  ctx.roundRect(-baseW / 2, -baseH / 2, baseW, baseH, 4);
  ctx.fill();

  // ekstra poświata
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, baseH * 1.4);
  grad.addColorStop(0, hexToRgba(el.color || type.color, 0.75));
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.ellipse(0, baseH, baseW * 1.6, baseH * 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // obrys zaznaczenia
  if (isSelected) {
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(-baseW / 2 - 6, -baseH / 2 - 6, baseW + 12, baseH + 12);
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function hexToRgba(hex, alpha) {
  const c = hex.replace("#", "");
  const bigint = parseInt(c, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Interakcja: zaznaczanie / przeciąganie

let isDragging = false;
let dragOffset = { x: 0, y: 0 };

function getPointerPos(evt) {
  const rect = canvasRect;
  const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
  const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

function hitTestElement(px, py) {
  const project = getCurrentProject();
  if (!project) return null;

  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);

  const stageHeight = h * 0.6;
  const stageY = h * 0.15;
  const stageMargin = w * 0.1;

  const minX = stageMargin;
  const maxX = w - stageMargin;
  const minY = stageY;
  const maxY = stageY + stageHeight;

  // od góry (ostatni = najwyższy)
  for (let i = project.elements.length - 1; i >= 0; i--) {
    const el = project.elements[i];
    const type = ELEMENT_TYPES.find(t => t.id === el.typeId);
    if (!type) continue;
    const baseW = type.width * el.scale;
    const baseH = type.height * el.scale;
    const x = minX + (maxX - minX) * el.x;
    const y = minY + (maxY - minY) * el.y;

    const left = x - baseW / 2;
    const right = x + baseW / 2;
    const top = y - baseH / 2;
    const bottom = y + baseH / 2;

    if (px >= left && px <= right && py >= top && py <= bottom) {
      return { el, x, y, baseW, baseH };
    }
  }

  return null;
}

canvas.addEventListener("pointerdown", e => {
  const pos = getPointerPos(e);
  const hit = hitTestElement(pos.x, pos.y);

  if (hit) {
    selectedElementId = hit.el.id;
    isDragging = true;
    dragOffset.x = pos.x - hit.x;
    dragOffset.y = pos.y - hit.y;
    updatePropertiesPanel();
    renderScene();
  } else {
    selectedElementId = null;
    isDragging = false;
    updatePropertiesPanel();
    renderScene();
  }
});

canvas.addEventListener("pointermove", e => {
  if (!isDragging) return;
  const project = getCurrentProject();
  if (!project) return;
  const el = project.elements.find(e => e.id === selectedElementId);
  if (!el) return;

  const pos = getPointerPos(e);

  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);

  const stageHeight = h * 0.6;
  const stageY = h * 0.15;
  const stageMargin = w * 0.1;

  const minX = stageMargin;
  const maxX = w - stageMargin;
  const minY = stageY;
  const maxY = stageY + stageHeight;

  const newX = pos.x - dragOffset.x;
  const newY = pos.y - dragOffset.y;

  el.x = (newX - minX) / (maxX - minX);
  el.y = (newY - minY) / (maxY - minY);

  el.x = Math.min(0.98, Math.max(0.02, el.x));
  el.y = Math.min(0.98, Math.max(0.02, el.y));

  saveProjects();
  renderScene();
});

canvas.addEventListener("pointerup", () => {
  isDragging = false;
});
canvas.addEventListener("pointercancel", () => {
  isDragging = false;
});

// Panel właściwości

const noSelectionTextEl = document.getElementById("noSelectionText");
const propertiesPanelEl = document.getElementById("propertiesPanel");
const propTypeEl = document.getElementById("propType");
const propScaleEl = document.getElementById("propScale");
const propColorEl = document.getElementById("propColor");
const deleteElementBtn = document.getElementById("deleteElementBtn");

function updatePropertiesPanel() {
  const project = getCurrentProject();
  if (!project) {
    noSelectionTextEl.textContent = "Brak projektu";
    propertiesPanelEl.classList.add("hidden");
    return;
  }

  const el = project.elements.find(e => e.id === selectedElementId);
  if (!el) {
    noSelectionTextEl.textContent = "Brak zaznaczonego elementu";
    propertiesPanelEl.classList.add("hidden");
    return;
  }

  const type = ELEMENT_TYPES.find(t => t.id === el.typeId);
  propTypeEl.textContent = type ? type.name : el.typeId;
  propScaleEl.value = el.scale.toFixed(2);
  propColorEl.value = el.color || (type ? type.color : "#ffffff");

  noSelectionTextEl.textContent = "";
  propertiesPanelEl.classList.remove("hidden");
}

propScaleEl.addEventListener("input", () => {
  const project = getCurrentProject();
  if (!project) return;
  const el = project.elements.find(e => e.id === selectedElementId);
  if (!el) return;
  el.scale = parseFloat(propScaleEl.value) || 1;
  saveProjects();
  renderScene();
});

propColorEl.addEventListener("input", () => {
  const project = getCurrentProject();
  if (!project) return;
  const el = project.elements.find(e => e.id === selectedElementId);
  if (!el) return;
  el.color = propColorEl.value;
  saveProjects();
  renderScene();
});

deleteElementBtn.addEventListener("click", () => {
  const project = getCurrentProject();
  if (!project) return;
  project.elements = project.elements.filter(e => e.id !== selectedElementId);
  selectedElementId = null;
  saveProjects();
  updatePropertiesPanel();
  renderScene();
});

// Eksport sceny do PNG

document.getElementById("exportBtn").addEventListener("click", () => {
  const project = getCurrentProject();
  if (!project) {
    alert("Najpierw utwórz projekt.");
    return;
  }

  const wrapper = document.querySelector(".canvas-wrapper");
  const w = wrapper.clientWidth;
  const h = wrapper.clientHeight;
  const exportCanvas = document.createElement("canvas");
  const dpr = 2;
  exportCanvas.width = w * dpr;
  exportCanvas.height = h * dpr;
  const exportCtx = exportCanvas.getContext("2d");
  exportCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // narysuj scenę na offscreen canvasie
  const backupCanvas = canvas;
  const backupCtx = ctx;

  // tymczasowo podmień globalne zmienne na potrzeby renderScene
  window._tmpCtx = ctx;
  window._tmpCanvas = canvas;
  // ale zamiast kombinować – skopiujemy logikę:
  drawExportScene(exportCtx, w, h, project);

  const url = exportCanvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = (project.name || "scene") + ".png";
  a.click();
});

function drawExportScene(context, w, h, project) {
  // bardzo podobne do renderScene, tylko na innym kontekście
  const grd = context.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, "#020617");
  grd.addColorStop(0.5, "#111827");
  grd.addColorStop(1, "#020617");
  context.fillStyle = grd;
  context.fillRect(0, 0, w, h);

  const stageHeight = h * 0.6;
  const stageY = h * 0.15;
  const stageMargin = w * 0.1;

  context.fillStyle = "#020617";
  context.fillRect(stageMargin, stageY, w - stageMargin * 2, stageHeight);

  context.strokeStyle = "rgba(148, 163, 184, 0.2)";
  context.lineWidth = 0.5;
  const rows = 8;
  const cols = 10;
  for (let i = 0; i <= rows; i++) {
    const y = stageY + (stageHeight * i) / rows;
    context.beginPath();
    context.moveTo(stageMargin, y);
    context.lineTo(w - stageMargin, y);
    context.stroke();
  }
  for (let j = 0; j <= cols; j++) {
    const x = stageMargin + ((w - stageMargin * 2) * j) / cols;
    context.beginPath();
    context.moveTo(x, stageY);
    context.lineTo(x, stageY + stageHeight);
    context.stroke();
  }

  const platformH = h * 0.08;
  context.fillStyle = "#020617";
  context.fillRect(stageMargin * 0.5, stageY + stageHeight + 6, w - stageMargin, platformH);

  const stageHeightInner = stageHeight;
  const stageYInner = stageY;
  const stageMarginInner = stageMargin;

  for (const el of project.elements) {
    const type = ELEMENT_TYPES.find(t => t.id === el.typeId);
    if (!type) continue;

    const baseW = type.width * el.scale;
    const baseH = type.height * el.scale;

    const minX = stageMarginInner;
    const maxX = w - stageMarginInner;
    const minY = stageYInner;
    const maxY = stageYInner + stageHeightInner;

    const x = minX + (maxX - minX) * el.x;
    const y = minY + (maxY - minY) * el.y;

    context.save();
    context.translate(x, y);

    context.fillStyle = "#0f172a";
    context.beginPath();
    context.roundRect(-baseW / 2 - 4, -baseH / 2 - 4, baseW + 8, baseH + 8, 6);
    context.fill();

    context.fillStyle = el.color || type.color;
    context.beginPath();
    context.roundRect(-baseW / 2, -baseH / 2, baseW, baseH, 4);
    context.fill();

    const grad = context.createRadialGradient(0, 0, 0, 0, 0, baseH * 1.4);
    grad.addColorStop(0, hexToRgba(el.color || type.color, 0.75));
    grad.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = grad;
    context.globalAlpha = 0.6;
    context.beginPath();
    context.ellipse(0, baseH, baseW * 1.6, baseH * 2.2, 0, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;

    context.restore();
  }
}

// Nowy projekt

document.getElementById("newProjectBtn").addEventListener("click", () => {
  const name = prompt("Nazwa nowego projektu:", "Scena " + (projects.length + 1));
  createProject(name || "Nowy projekt");
});

// Init

function init() {
  loadProjects();
  setupPalette();

  if (projects.length === 0) {
    createProject("Pierwszy projekt");
  } else {
    currentProjectId = projects[0].id;
    refreshProjectsList();
  }

  updatePropertiesPanel();
  resizeCanvas();
}

window.addEventListener("load", () => {
  init();
  // PWA service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("sw.js")
      .catch(err => console.warn("SW registration failed", err));
  }
});
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
  },
  {
    id: "profile",
    name: "Profil",
    color: "#e5e7eb",
    width: 36,
    height: 60
  },
  {
    id: "fresnel",
    name: "Fresnel",
    color: "#fed7aa",
    width: 44,
    height: 44
  },
  {
    id: "par",
    name: "PAR",
    color: "#bbf7d0",
    width: 32,
    height: 32
  },
  {
    id: "strobe",
    name: "Strobe",
    color: "#f9fafb",
    width: 30,
    height: 24
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
  const wrapper = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;

  const width = wrapper.clientWidth;
  const height = wrapper.clientHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  canvasRect = canvas.getBoundingClientRect();
  renderScene();
}

window.addEventListener("resize", resizeCanvas);

// Projekty

function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      projects = JSON.parse(raw);
    } else {
      projects = [];
    }
  } catch (err) {
    console.error("Błąd wczytywania projektów", err);
    projects = [];
  }

  if (projects.length === 0) {
    const defaultProject = {
      id: crypto.randomUUID(),
      name: "Domyślny projekt",
      stageWidth: 10,
      stageDepth: 6,
      elements: []
    };
    projects.push(defaultProject);
    currentProjectId = defaultProject.id;
    saveProjects();
  } else {
    if (!currentProjectId) {
      currentProjectId = projects[0].id;
    }
  }
}

function saveProjects() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (err) {
    console.error("Błąd zapisu projektów", err);
  }

  populateProjectSelect();
}

function getCurrentProject() {
  return projects.find(p => p.id === currentProjectId) || null;
}

// UI: lista projektów

const projectSelectEl = document.getElementById("projectSelect");
const newProjectBtn = document.getElementById("newProjectBtn");
const deleteProjectBtn = document.getElementById("deleteProjectBtn");

function populateProjectSelect() {
  projectSelectEl.innerHTML = "";
  for (const p of projects) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    projectSelectEl.appendChild(opt);
  }
  projectSelectEl.value = currentProjectId || "";
}

projectSelectEl.addEventListener("change", () => {
  currentProjectId = projectSelectEl.value;
  selectedElementId = null;
  updateStageInputs();
  updatePropertiesPanel();
  renderScene();
});

newProjectBtn.addEventListener("click", () => {
  const name = prompt("Nazwa nowego projektu:");
  if (!name) return;

  const project = {
    id: crypto.randomUUID(),
    name,
    stageWidth: 10,
    stageDepth: 6,
    elements: []
  };
  projects.push(project);
  currentProjectId = project.id;
  saveProjects();
  updateStageInputs();
  updatePropertiesPanel();
  renderScene();
});

deleteProjectBtn.addEventListener("click", () => {
  if (!currentProjectId) return;
  if (projects.length <= 1) {
    alert("Musi pozostać przynajmniej jeden projekt.");
    return;
  }

  const project = getCurrentProject();
  const ok = confirm(`Na pewno usunąć projekt "${project.name}"?`);
  if (!ok) return;

  projects = projects.filter(p => p.id !== currentProjectId);
  currentProjectId = projects[0]?.id || null;
  saveProjects();
  updateStageInputs();
  updatePropertiesPanel();
  renderScene();
});

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
    typeId: typeId,
    x: 0.5,
    y: 0.2,
    scale: 1,
    color: type.color
  };

  project.elements.push(el);
  selectedElementId = el.id;
  saveProjects();
  updatePropertiesPanel();
  renderScene();
}

// UI: scena (rysowanie)

function renderScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  // tło
  const gradBg = ctx.createLinearGradient(0, 0, 0, h);
  gradBg.addColorStop(0, "#020617");
  gradBg.addColorStop(0.4, "#020617");
  gradBg.addColorStop(1, "#000000");
  ctx.fillStyle = gradBg;
  ctx.fillRect(0, 0, w, h);

  const project = getCurrentProject();
  if (!project) return;

  // scena
  const stageWidth = project.stageWidth || 10;
  const stageDepth = project.stageDepth || 6;

  const stageHeight = h * 0.6;
  const stageY = h * 0.15;
  const stageMargin = w * 0.1;

  ctx.save();
  ctx.translate(0, 0);
  ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
  ctx.lineWidth = 1;

  // zewnętrzna rama sceny
  ctx.strokeRect(
    stageMargin,
    stageY,
    w - stageMargin * 2,
    stageHeight
  );

  // kratka
  const rows = 6;
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

  ctx.restore();

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

  const x = minX + el.x * (maxX - minX);
  const y = minY + el.y * (maxY - minY);

  ctx.save();
  ctx.translate(x, y);

  // wiązka światła
  const beamLength = h * 0.3 * el.scale;
  const beamWidth = baseW * 2;

  const grad = ctx.createLinearGradient(0, 0, 0, beamLength);
  grad.addColorStop(0, hexToRgba(el.color || type.color, 0.9));
  grad.addColorStop(0.4, hexToRgba(el.color || type.color, 0.4));
  grad.addColorStop(1, hexToRgba(el.color || type.color, 0.0));

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-beamWidth / 2, 0);
  ctx.lineTo(beamWidth / 2, 0);
  ctx.lineTo(beamWidth * 0.8, beamLength);
  ctx.lineTo(-beamWidth * 0.8, beamLength);
  ctx.closePath();
  ctx.fill();

  // źródło światła
  ctx.fillStyle = el.color || type.color;
  ctx.beginPath();
  ctx.roundRect(-baseW / 2, -baseH / 2, baseW, baseH, 4);
  ctx.fill();

  // ekstra poświata
  const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, baseH * 1.4);
  glowGrad.addColorStop(0, hexToRgba(el.color || type.color, 0.75));
  glowGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glowGrad;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.ellipse(0, baseH, baseW * 1.6, baseH * 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // obrys zaznaczonego
  if (el.id === selectedElementId) {
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.strokeRect(-baseW / 2 - 3, -baseH / 2 - 3, baseW + 6, baseH + 6);
  }

  ctx.restore();
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
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

    const x = minX + el.x * (maxX - minX);
    const y = minY + el.y * (maxY - minY);

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

// Interakcja: przeciąganie (desktop + mobile, również iOS)
canvas.addEventListener("pointerdown", e => {
  // blokujemy domyślne przewijanie strony na mobilkach
  e.preventDefault();

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

  // przechwytujemy wskaźnik (na desktopie)
  if (typeof canvas.setPointerCapture === "function") {
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {
      // ignore
    }
  }
}, { passive: false });

canvas.addEventListener("pointermove", e => {
  if (!isDragging) return;

  // znowu blokujemy domyślne zachowania (scroll, pinch-zoom itp.)
  e.preventDefault();

  const project = getCurrentProject();
  if (!project) return;
  const el = project.elements.find(el => el.id === selectedElementId);
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
}, { passive: false });

function endPointerDrag(e) {
  if (typeof canvas.releasePointerCapture === "function" && e && e.pointerId != null) {
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (err) {
      // ignore
    }
  }
  isDragging = false;
}

canvas.addEventListener("pointerup", e => {
  endPointerDrag(e);
});

canvas.addEventListener("pointercancel", e => {
  endPointerDrag(e);
});

// Panel właściwości

const noSelectionTextEl = document.getElementById("noSelectionText");
const propertiesContentEl = document.getElementById("propertiesContent");
const propertiesPanelEl = document.getElementById("propertiesPanel");
const propTypeEl = document.getElementById("propType");
const propScaleEl = document.getElementById("propScale");
const propColorEl = document.getElementById("propColor");
const deleteElementBtn = document.getElementById("deleteElementBtn");

function updatePropertiesPanel() {
  const project = getCurrentProject();
  if (!project || !selectedElementId) {
    noSelectionTextEl.textContent = "Brak zaznaczonego elementu.";
    propertiesContentEl.classList.add("hidden");
    propertiesPanelEl.classList.remove("hidden");
    return;
  }

  const el = project.elements.find(e => e.id === selectedElementId);
  if (!el) {
    noSelectionTextEl.textContent = "Brak zaznaczonego elementu.";
    propertiesContentEl.classList.add("hidden");
    propertiesPanelEl.classList.remove("hidden");
    return;
  }

  const type = ELEMENT_TYPES.find(t => t.id === el.typeId);
  propTypeEl.textContent = type ? type.name : el.typeId;
  propScaleEl.value = el.scale.toFixed(2);
  propColorEl.value = el.color || (type ? type.color : "#ffffff");

  noSelectionTextEl.textContent = "";
  propertiesContentEl.classList.remove("hidden");
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
  if (!selectedElementId) return;

  project.elements = project.elements.filter(e => e.id !== selectedElementId);
  selectedElementId = null;
  saveProjects();
  updatePropertiesPanel();
  renderScene();
});

// Ustawienia sceny

const stageWidthInput = document.getElementById("stageWidth");
const stageDepthInput = document.getElementById("stageDepth");

function updateStageInputs() {
  const project = getCurrentProject();
  if (!project) return;
  stageWidthInput.value = project.stageWidth ?? 10;
  stageDepthInput.value = project.stageDepth ?? 6;
}

stageWidthInput.addEventListener("input", () => {
  const project = getCurrentProject();
  if (!project) return;
  const val = parseFloat(stageWidthInput.value);
  if (isNaN(val)) return;
  project.stageWidth = val;
  saveProjects();
  renderScene();
});

stageDepthInput.addEventListener("input", () => {
  const project = getCurrentProject();
  if (!project) return;
  const val = parseFloat(stageDepthInput.value);
  if (isNaN(val)) return;
  project.stageDepth = val;
  saveProjects();
  renderScene();
});

// Inicjalizacja

function init() {
  loadProjects();
  populateProjectSelect();
  setupPalette();
  updateStageInputs();
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
// Lighting Designer 2D - PWA, vanilla JS
// PRO: realistyczne typy świateł + haze + blending, BEZ tilt/dodatków w profile/bar
// + przycisk "Powiel" w panelu wybranego światła
// + legenda typów świateł na dole sceny (miniatury), widoczna też w eksporcie

// ===== Konfiguracja świateł =====

const ELEMENT_TYPES = [
  { id: "spot",    name: "Spot",    color: "#facc15", width: 40, height: 40 },
  { id: "wash",    name: "Wash",    color: "#fb923c", width: 50, height: 50 },
  { id: "beam",    name: "Beam",    color: "#38bdf8", width: 30, height: 60 },
  { id: "bar",     name: "LED bar", color: "#22c55e", width: 80, height: 20 },
  { id: "profile", name: "Profil",  color: "#e5e7eb", width: 36, height: 60 },
  { id: "fresnel", name: "Fresnel", color: "#fed7aa", width: 44, height: 44 },
  { id: "par",     name: "PAR",     color: "#bbf7d0", width: 32, height: 32 },
  { id: "strobe",  name: "Strobe",  color: "#f9fafb", width: 30, height: 24 }
];

const STORAGE_KEY = "lighting_designer_projects_v1";

// ===== Stan aplikacji =====

let projects = [];
let currentProjectId = null;
let selectedElementId = null;

// ===== Canvas =====

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

// ===== Projekty =====

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
  } else if (!currentProjectId) {
    currentProjectId = projects[0].id;
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

// ===== UI: projekty + eksport =====

const projectSelectEl = document.getElementById("projectSelect");
const newProjectBtn = document.getElementById("newProjectBtn");
const deleteProjectBtn = document.getElementById("deleteProjectBtn");
const exportImageBtn = document.getElementById("exportImageBtn");

function populateProjectSelect() {
  if (!projectSelectEl) return;
  projectSelectEl.innerHTML = "";
  projects.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    projectSelectEl.appendChild(opt);
  });
  if (currentProjectId) {
    projectSelectEl.value = currentProjectId;
  }
}

if (projectSelectEl) {
  projectSelectEl.addEventListener("change", () => {
    currentProjectId = projectSelectEl.value;
    selectedElementId = null;
    updatePropertiesPanel();
    renderScene();
  });
}

if (newProjectBtn) {
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
    selectedElementId = null;
    updatePropertiesPanel();
    renderScene();
  });
}

if (deleteProjectBtn) {
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
    selectedElementId = null;
    updatePropertiesPanel();
    renderScene();
  });
}

if (exportImageBtn) {
  exportImageBtn.addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = "lighting-scene.png";
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  });
}

// ===== Paleta =====

const elementSelectEl = document.getElementById("elementSelect");
const addElementBtn = document.getElementById("addElementBtn");

function setupElementSelect() {
  if (!elementSelectEl) return;
  elementSelectEl.innerHTML = "";
  ELEMENT_TYPES.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    elementSelectEl.appendChild(opt);
  });
}

if (addElementBtn) {
  addElementBtn.addEventListener("click", () => {
    if (!elementSelectEl) return;
    const typeId = elementSelectEl.value;
    addElementOfType(typeId);
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

// ===== Rysowanie sceny =====

function renderScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  const gradBg = ctx.createLinearGradient(0, 0, 0, h);
  gradBg.addColorStop(0, "#020617");
  gradBg.addColorStop(0.4, "#020617");
  gradBg.addColorStop(1, "#000000");
  ctx.fillStyle = gradBg;
  ctx.fillRect(0, 0, w, h);

  const project = getCurrentProject();
  if (!project) return;

  const stageHeight = h * 0.6;
  const stageY = h * 0.15;
  const stageMargin = w * 0.1;

  ctx.save();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
  ctx.lineWidth = 1;

  ctx.strokeRect(stageMargin, stageY, w - stageMargin * 2, stageHeight);

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

  const platformH = h * 0.08;
  ctx.fillStyle = "#020617";
  ctx.fillRect(stageMargin * 0.5, stageY + stageHeight + 6, w - stageMargin, platformH);

  ctx.restore();

  for (const el of project.elements) {
    drawElement(el, w, h);
  }

  drawLegend(project, w, h);
}

// ===== Legenda typów świateł (miniatury, 1–2 rzędy) =====
function drawLegend(project, w, h) {
  if (!project || !project.elements || project.elements.length === 0) return;

  const typeIds = Array.from(new Set(project.elements.map(el => el.typeId).filter(Boolean)));
  if (!typeIds.length) return;

  const marginX = 12;
  const marginY = 6;
  const legendHeight = 30;
  const bottomOffset = 18; // odstęp od dolnej krawędzi / paska home na iPhonie

  // Ile ikon w jednym rzędzie w zależności od szerokości ekranu
  let maxPerRow;
  if (w <= 430) {
    // bardzo wąskie ekrany – max 5 ikon w rzędzie
    maxPerRow = 5;
  } else if (w <= 768) {
    // typowy iPhone w pionie – max 6 ikon
    maxPerRow = 6;
  } else {
    // desktop – wszystko w jednym rzędzie (w razie czego i tak wejdzie w 2 rzędy)
    maxPerRow = typeIds.length;
  }

  const totalRows = Math.min(2, Math.ceil(typeIds.length / maxPerRow));
  const rowHeight = legendHeight + 4;
  const bottomRowCenterY = h - marginY - legendHeight / 2 - bottomOffset;

  ctx.save();
  ctx.font = "10px system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  for (let row = 0; row < totalRows; row++) {
    const startIndex = row * maxPerRow;
    const endIndex = Math.min(startIndex + maxPerRow, typeIds.length);
    const itemsInRow = endIndex - startIndex;
    if (!itemsInRow) continue;

    const availableWidth = w - marginX * 2;
    const step = Math.min(120, availableWidth / itemsInRow);
    const rowCenterY = bottomRowCenterY - (totalRows - 1 - row) * rowHeight;

    for (let i = 0; i < itemsInRow; i++) {
      const typeId = typeIds[startIndex + i];
      const type = ELEMENT_TYPES.find(t => t.id === typeId);
      if (!type) continue;

      const centerX = marginX + step * (i + 0.5);

      // szerokość pigułki zależna od typu (szersze światła = szersza ikonka)
      let pillWidth = 56;
      if (["wash", "bar", "fresnel"].includes(typeId)) pillWidth = 68;
      if (step - 10 < pillWidth) pillWidth = step - 10; // żeby nie wyjechało poza krok

      const pillHeight = legendHeight;
      const pillX = centerX - pillWidth / 2;
      const pillY = rowCenterY - pillHeight / 2;

      // tło pigułki
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 10);
      } else {
        ctx.rect(pillX, pillY, pillWidth, pillHeight);
      }
      ctx.fill();

      // mini-ikonka – ta sama geometria co na scenie, tylko skrócona wiązka
      const iconCenterX = pillX + 10;
      const iconCenterY = rowCenterY - 2;
      const iconMaxHeight = legendHeight * 0.7;
      drawLegendIcon(type, iconCenterX, iconCenterY, iconMaxHeight);

      // podpis typu
      ctx.fillStyle = "#e5e7eb";
      ctx.fillText(type.name, pillX + 20, rowCenterY + 0.5);
    }
  }

  ctx.restore();
}

// miniatury bazujące na tych samych kształtach co na scenie (tylko krótsze wiązki)
function drawLegendIcon(type, cx, cy, maxHeight) {
  ctx.save();
  ctx.translate(cx, cy);

  const color = type.color;
  const id = type.id;

  // skalujemy w dół względem pełnych wymiarów
  const scale = 0.35;
  const baseW = type.width * scale;
  const baseH = type.height * scale;

  // parametry wiązki takie jak w drawElement, ale krótsze
  let beamShape = "cone";
  let beamLenFactor = 1.8;
  let topWidthFactor = 1.0;
  let bottomWidthFactor = 1.6;

  switch (id) {
    case "spot":
      beamShape = "cone";
      beamLenFactor = 1.6;
      topWidthFactor = 0.6;
      bottomWidthFactor = 1.4;
      break;
    case "wash":
      beamShape = "cone";
      beamLenFactor = 1.6;
      topWidthFactor = 1.0;
      bottomWidthFactor = 2.0;
      break;
    case "beam":
      beamShape = "cone";
      beamLenFactor = 2.0;
      topWidthFactor = 0.3;
      bottomWidthFactor = 0.9;
      break;
    case "bar":
      beamShape = "bar";
      break;
    case "profile":
      beamShape = "rect";
      beamLenFactor = 1.6;
      break;
    case "fresnel":
      beamShape = "fresnel";
      break;
    case "par":
      beamShape = "par";
      break;
    case "strobe":
      beamShape = "strobe";
      break;
    default:
      beamShape = "cone";
  }

  const maxBeamLength = maxHeight; // żeby się zmieściło w pigułce

  // wiązka (bez haze, tylko kształt)
  ctx.fillStyle = color;

  if (beamShape === "cone") {
    let beamLength = baseH * beamLenFactor;
    beamLength = Math.min(beamLength, maxBeamLength);
    const topWidth = baseW * topWidthFactor;
    const bottomWidth = baseW * bottomWidthFactor;

    ctx.beginPath();
    ctx.moveTo(-topWidth / 2, 0);
    ctx.lineTo(topWidth / 2, 0);
    ctx.lineTo(bottomWidth / 2, beamLength);
    ctx.lineTo(-bottomWidth / 2, beamLength);
    ctx.closePath();
    ctx.fill();
  } else if (beamShape === "rect") {
    let beamLength = baseH * beamLenFactor;
    beamLength = Math.min(beamLength, maxBeamLength);
    const width = baseW * 1.1;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-width / 2, 0, width, beamLength, 3);
    } else {
      ctx.rect(-width / 2, 0, width, beamLength);
    }
    ctx.fill();
  } else if (beamShape === "bar") {
    const barWidth = baseW * 2.3;
    const barHeight = Math.min(baseH * 0.8, maxBeamLength * 0.5);
    if (ctx.roundRect) {
      ctx.roundRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, 4);
    } else {
      ctx.rect(-barWidth / 2, -barHeight / 2, barWidth, barHeight);
    }
    ctx.fill();
  } else if (beamShape === "fresnel" || beamShape === "par") {
    const radius = Math.min(baseH * (beamShape === "fresnel" ? 1.3 : 1.0), maxBeamLength * 0.6);
    const radiusX = radius * (beamShape === "fresnel" ? 1.4 : 1.2);
    const radiusY = radius;

    ctx.save();
    ctx.translate(0, radius * 0.2);
    ctx.scale(radiusX / radius, radiusY / radius);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (beamShape === "strobe") {
    const radius = Math.min(baseH, maxBeamLength * 0.6);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // fixture – mały prostokącik nad początkiem wiązki (tam, gdzie na scenie)
  const fixtureH = baseH * 0.7;
  const fixtureW = baseW;
  ctx.fillStyle = color;
  if (ctx.roundRect) {
    ctx.roundRect(-fixtureW / 2, -fixtureH, fixtureW, fixtureH, 3);
  } else {
    ctx.rect(-fixtureW / 2, -fixtureH, fixtureW, fixtureH);
  }
  ctx.fill();

  ctx.restore();
}

// ===== Rysowanie pojedynczego światła (pełny kształt) =====

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

  const color = el.color || type.color;
  const id = type.id;

  let beamShape = "cone"; // cone, rect, bar, fresnel, par, strobe
  let beamLenFactor = 0.3;
  let topWidthFactor = 1.0;
  let bottomWidthFactor = 1.6;
  let startAlpha = 0.9;
  let midAlpha = 0.4;
  let endAlpha = 0.0;
  let intensity = 1.0;

  switch (id) {
    case "spot":
      beamShape = "cone";
      beamLenFactor = 0.45;
      topWidthFactor = 0.6;
      bottomWidthFactor = 1.5;
      startAlpha = 0.95;
      midAlpha = 0.5;
      endAlpha = 0.0;
      intensity = 0.9;
      break;
    case "wash":
      beamShape = "cone";
      beamLenFactor = 0.5;
      topWidthFactor = 1.2;
      bottomWidthFactor = 2.4;
      startAlpha = 0.75;
      midAlpha = 0.35;
      endAlpha = 0.0;
      intensity = 0.8;
      break;
    case "beam":
      beamShape = "cone";
      beamLenFactor = 0.7;
      topWidthFactor = 0.25;
      bottomWidthFactor = 0.9;
      startAlpha = 1.0;
      midAlpha = 0.5;
      endAlpha = 0.05;
      intensity = 1.0;
      break;
    case "bar":
      beamShape = "bar";
      intensity = 0.85;
      break;
    case "profile":
      beamShape = "rect";
      beamLenFactor = 0.55;
      startAlpha = 0.95;
      midAlpha = 0.6;
      endAlpha = 0.15;
      intensity = 0.9;
      break;
    case "fresnel":
      beamShape = "fresnel";
      intensity = 0.75;
      break;
    case "par":
      beamShape = "par";
      intensity = 0.9;
      break;
    case "strobe":
      beamShape = "strobe";
      intensity = 1.0;
      break;
    default:
      beamShape = "cone";
  }

  const sA = startAlpha * intensity;
  const mA = midAlpha * intensity;
  const eA = endAlpha * intensity;

  // BEAMS & HAZE (additive)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (beamShape === "cone") {
    const beamLength = h * beamLenFactor * el.scale;
    const topWidth = baseW * topWidthFactor;
    const bottomWidth = baseW * bottomWidthFactor;

    const grad = ctx.createLinearGradient(0, 0, 0, beamLength);
    grad.addColorStop(0,  hexToRgba(color, sA));
    grad.addColorStop(0.4, hexToRgba(color, mA));
    grad.addColorStop(1,  hexToRgba(color, eA));

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-topWidth / 2, 0);
    ctx.lineTo(topWidth / 2, 0);
    ctx.lineTo(bottomWidth / 2, beamLength);
    ctx.lineTo(-bottomWidth / 2, beamLength);
    ctx.closePath();
    ctx.fill();

    const hazeRadius = beamLength * 0.6;
    const hazeCenterY = beamLength * 0.45;
    const hazeGrad = ctx.createRadialGradient(
      0, hazeCenterY, 0,
      0, hazeCenterY, hazeRadius
    );
    hazeGrad.addColorStop(0, hexToRgba(color, 0.12 * intensity));
    hazeGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hazeGrad;
    ctx.beginPath();
    ctx.arc(0, hazeCenterY, hazeRadius, 0, Math.PI * 2);
    ctx.fill();

  } else if (beamShape === "rect") {
    const beamLength = h * beamLenFactor * el.scale;
    const width = baseW * 1.1;

    const grad = ctx.createLinearGradient(0, 0, 0, beamLength);
    grad.addColorStop(0, hexToRgba(color, sA));
    grad.addColorStop(0.7, hexToRgba(color, mA));
    grad.addColorStop(1, hexToRgba(color, eA));

    ctx.fillStyle = grad;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-width / 2, 0, width, beamLength, 4);
    } else {
      ctx.rect(-width / 2, 0, width, beamLength);
    }
    ctx.fill();

  } else if (beamShape === "bar") {
    const barWidth = baseW * 3.2;
    const barHeight = baseH * 0.4;

    const grad = ctx.createLinearGradient(0, 0, 0, barHeight * 5);
    grad.addColorStop(0, hexToRgba(color, 0.85 * intensity));
    grad.addColorStop(0.4, hexToRgba(color, 0.45 * intensity));
    grad.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-barWidth / 2, 0, barWidth, barHeight * 5, 6);
    } else {
      ctx.rect(-barWidth / 2, 0, barWidth, barHeight * 5);
    }
    ctx.fill();

  } else if (beamShape === "fresnel" || beamShape === "par") {
    const radiusBase = beamShape === "fresnel" ? baseH * 2.2 : baseH * 1.6;
    const radiusX = radiusBase * (beamShape === "fresnel" ? 1.5 : 1.3);
    const radiusY = radiusBase;

    const grad = ctx.createRadialGradient(
      0, 0, 0,
      0, 0, radiusBase
    );
    const alphaCenter = beamShape === "fresnel" ? 0.8 : 0.9;
    grad.addColorStop(0, hexToRgba(color, alphaCenter * intensity));
    grad.addColorStop(0.6, hexToRgba(color, 0.45 * intensity));
    grad.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = grad;
    ctx.save();
    ctx.translate(0, baseH * 1.3);
    ctx.scale(radiusX / radiusBase, radiusY / radiusBase);
    ctx.beginPath();
    ctx.arc(0, 0, radiusBase, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

  } else if (beamShape === "strobe") {
    const radius = baseH * 1.8;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    grad.addColorStop(0, hexToRgba("#ffffff", 1.0));
    grad.addColorStop(0.4, hexToRgba(color, 0.9));
    grad.addColorStop(1, "rgba(0,0,0,0)");

    ctx.save();
    ctx.translate(0, baseH * 0.7);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const beamLength = h * 0.45 * el.scale;
    const beamGrad = ctx.createLinearGradient(0, 0, 0, beamLength);
    beamGrad.addColorStop(0, hexToRgba("#ffffff", 0.95));
    beamGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-baseW * 0.35, 0, baseW * 0.7, beamLength, 6);
    } else {
      ctx.rect(-baseW * 0.35, 0, baseW * 0.7, beamLength);
    }
    ctx.fill();
  }

  ctx.restore(); // beams + haze

  // FIXTURE & GLOW
  ctx.fillStyle = color;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(-baseW / 2, -baseH / 2, baseW, baseH, 4);
  } else {
    ctx.rect(-baseW / 2, -baseH / 2, baseW, baseH);
  }
  ctx.fill();

  const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, baseH * 1.4);
  glowGrad.addColorStop(0, hexToRgba(color, 0.75));
  glowGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glowGrad;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.ellipse(0, baseH, baseW * 1.6, baseH * 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

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

// ===== Drag & drop =====

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
      return { el, x, y };
    }
  }

  return null;
}

canvas.addEventListener("pointerdown", e => {
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

  if (typeof canvas.setPointerCapture === "function" && e.pointerId != null) {
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {}
  }
});

canvas.addEventListener("pointermove", e => {
  if (!isDragging) return;
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
});

function endPointerDrag(e) {
  if (typeof canvas.releasePointerCapture === "function" && e && e.pointerId != null) {
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (err) {}
  }
  isDragging = false;
}

canvas.addEventListener("pointerup", endPointerDrag);
canvas.addEventListener("pointercancel", endPointerDrag);

// ===== Panel właściwości + Powiel =====

const propertiesPanelEl = document.getElementById("propertiesPanel");
const propTypeEl = document.getElementById("propType");
const propScaleEl = document.getElementById("propScale");
const propColorEl = document.getElementById("propColor");
const deleteElementBtn = document.getElementById("deleteElementBtn");
const duplicateElementBtn = document.getElementById("duplicateElementBtn");

function updatePropertiesPanel() {
  const project = getCurrentProject();
  const el = project && selectedElementId
    ? project.elements.find(e => e.id === selectedElementId)
    : null;

  if (!el) {
    if (propTypeEl) propTypeEl.textContent = "–";
    if (propScaleEl) {
      propScaleEl.value = 1;
      propScaleEl.disabled = true;
    }
    if (propColorEl) {
      propColorEl.value = "#ffffff";
      propColorEl.disabled = true;
    }
    if (deleteElementBtn) deleteElementBtn.disabled = true;
    if (duplicateElementBtn) duplicateElementBtn.disabled = true;
    return;
  }

  const type = ELEMENT_TYPES.find(t => t.id === el.typeId);

  if (propTypeEl) propTypeEl.textContent = type ? type.name : el.typeId;
  if (propScaleEl) {
    propScaleEl.disabled = false;
    propScaleEl.value = el.scale.toFixed(2);
  }
  if (propColorEl) {
    propColorEl.disabled = false;
    propColorEl.value = el.color || (type ? type.color : "#ffffff");
  }
  if (deleteElementBtn) deleteElementBtn.disabled = false;
  if (duplicateElementBtn) duplicateElementBtn.disabled = false;
}

if (propScaleEl) {
  propScaleEl.addEventListener("input", () => {
    const project = getCurrentProject();
    if (!project) return;
    const el = project.elements.find(e => e.id === selectedElementId);
    if (!el) return;
    el.scale = parseFloat(propScaleEl.value) || 1;
    saveProjects();
    renderScene();
  });
}

if (propColorEl) {
  propColorEl.addEventListener("input", () => {
    const project = getCurrentProject();
    if (!project) return;
    const el = project.elements.find(e => e.id === selectedElementId);
    if (!el) return;
    el.color = propColorEl.value;
    saveProjects();
    renderScene();
  });
}

if (deleteElementBtn) {
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
}

if (duplicateElementBtn) {
  duplicateElementBtn.addEventListener("click", () => {
    const project = getCurrentProject();
    if (!project) return;
    if (!selectedElementId) return;

    const original = project.elements.find(e => e.id === selectedElementId);
    if (!original) return;

    const clone = {
      ...original,
      id: crypto.randomUUID(),
      x: Math.min(0.98, original.x + 0.04),
      y: Math.min(0.98, original.y + 0.02)
    };

    project.elements.push(clone);
    selectedElementId = clone.id;
    saveProjects();
    updatePropertiesPanel();
    renderScene();
  });
}

// ===== Inicjalizacja =====

function init() {
  loadProjects();
  populateProjectSelect();
  setupElementSelect();
  updatePropertiesPanel();
  resizeCanvas();
}

window.addEventListener("load", () => {
  init();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("sw.js")
      .catch(err => console.warn("SW registration failed", err));
  }
});

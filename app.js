let dataUpdatedAt = "2026-06-09T05:40:00+09:00";
let baseTime = new Date("2026-06-09T12:00:00+09:00"); // サンプルデータ用の基準時刻。APIデータ読込後は現在時刻へ更新。
let activeQuakes = [];

const PERIODS = {
  realtime: { label: "リアルタイム", hours: 1, majorOnlyDefault: false },
  "12h": { label: "12時間", hours: 12 },
  "24h": { label: "24時間", hours: 24 },
  "7d": { label: "1週間", hours: 24 * 7 },
  "1m": { label: "1ヶ月", hours: 24 * 30 },
  "3m": { label: "3ヶ月", hours: 24 * 90 },
  "1y": { label: "1年", hours: 24 * 365 },
  all: { label: "全て", hours: Infinity }
};

const PLATE_LINES = [
  {
    id: "japan_trench",
    name: "日本海溝",
    type: "海溝",
    riskBase: 70,
    color: "#45d6ff",
    description: "太平洋プレートが沈み込む海溝型地震リスクの高いエリア。",
    coords: [[41.5, 145.2], [39.5, 144.0], [37.8, 143.2], [36.0, 142.4], [34.7, 141.5]]
  },
  {
    id: "kuril_trench",
    name: "千島海溝",
    type: "海溝",
    riskBase: 72,
    color: "#8b5cf6",
    description: "北海道東方沖の海溝型地震・津波リスクを確認したいエリア。",
    coords: [[45.0, 148.0], [43.7, 147.1], [42.5, 146.0], [41.6, 145.1]]
  },
  {
    id: "sagami_trough",
    name: "相模トラフ",
    type: "トラフ",
    riskBase: 68,
    color: "#f59e0b",
    description: "関東南方のプレート境界。首都圏の長期防災リスクと合わせて確認。",
    coords: [[35.5, 140.5], [34.9, 140.1], [34.3, 139.6], [33.9, 138.9]]
  },
  {
    id: "nankai_trough",
    name: "南海トラフ",
    type: "トラフ",
    riskBase: 78,
    color: "#ef4444",
    description: "東海〜四国〜九州沖に連なる巨大地震リスクの代表的エリア。",
    coords: [[34.0, 138.5], [33.4, 137.0], [32.8, 135.2], [32.5, 133.5], [32.0, 132.0], [31.2, 130.8]]
  },
  {
    id: "ryukyu_trench",
    name: "南西諸島海溝",
    type: "海溝",
    riskBase: 60,
    color: "#22c55e",
    description: "南西諸島沿いの地震・津波リスクを確認するエリア。",
    coords: [[30.8, 130.6], [28.8, 129.3], [26.8, 128.0], [24.7, 126.0]]
  },
  {
    id: "japan_sea_east",
    name: "日本海東縁部",
    type: "ひずみ集中帯",
    riskBase: 58,
    color: "#f97316",
    description: "日本海側の地震・津波リスクを確認するエリア。",
    coords: [[45.0, 140.6], [42.5, 139.5], [40.3, 138.9], [38.2, 138.2], [36.8, 137.2]]
  }
];

const ZONES = [
  { id: "hokkaido_east", name: "北海道東方沖", center: [43.7, 146.0], radiusKm: 180, longTerm: 74, tsunami: true },
  { id: "tohoku_offshore", name: "東北沖・日本海溝", center: [38.2, 143.2], radiusKm: 250, longTerm: 76, tsunami: true },
  { id: "noto", name: "能登半島周辺", center: [37.3, 137.1], radiusKm: 130, longTerm: 62, tsunami: true },
  { id: "kanto_south", name: "関東南方・相模トラフ", center: [34.9, 139.7], radiusKm: 170, longTerm: 70, tsunami: true },
  { id: "nankai", name: "南海トラフ周辺", center: [32.9, 134.7], radiusKm: 310, longTerm: 82, tsunami: true },
  { id: "kyushu", name: "九州・日向灘周辺", center: [31.8, 131.7], radiusKm: 180, longTerm: 66, tsunami: true },
  { id: "inland", name: "内陸直下型注意エリア", center: [36.0, 138.0], radiusKm: 220, longTerm: 56, tsunami: false }
];

const SAMPLE_QUAKES = [
  { time: "2026-06-09T11:42:00+09:00", lat: 38.2, lon: 142.3, mag: 4.7, depth: 40, intensity: 3, area: "宮城県沖", zoneHint: "tohoku_offshore" },
  { time: "2026-06-09T10:18:00+09:00", lat: 37.4, lon: 137.2, mag: 3.2, depth: 12, intensity: 2, area: "能登半島沖", zoneHint: "noto" },
  { time: "2026-06-09T06:15:00+09:00", lat: 32.7, lon: 132.1, mag: 3.9, depth: 30, intensity: 2, area: "日向灘", zoneHint: "kyushu" },
  { time: "2026-06-08T23:25:00+09:00", lat: 41.7, lon: 144.8, mag: 5.1, depth: 50, intensity: 4, area: "釧路沖", zoneHint: "hokkaido_east" },
  { time: "2026-06-08T18:05:00+09:00", lat: 34.4, lon: 139.2, mag: 4.4, depth: 80, intensity: 3, area: "伊豆諸島近海", zoneHint: "kanto_south" },
  { time: "2026-06-07T15:30:00+09:00", lat: 33.2, lon: 135.4, mag: 3.7, depth: 35, intensity: 2, area: "紀伊水道", zoneHint: "nankai" },
  { time: "2026-06-06T08:12:00+09:00", lat: 36.5, lon: 138.4, mag: 2.8, depth: 10, intensity: 1, area: "長野県北部", zoneHint: "inland" },
  { time: "2026-06-03T21:45:00+09:00", lat: 38.8, lon: 143.0, mag: 5.6, depth: 30, intensity: 4, area: "三陸沖", zoneHint: "tohoku_offshore" },
  { time: "2026-05-24T03:14:00+09:00", lat: 37.1, lon: 136.8, mag: 4.9, depth: 14, intensity: 4, area: "石川県能登地方", zoneHint: "noto" },
  { time: "2026-04-22T14:12:00+09:00", lat: 31.9, lon: 131.9, mag: 5.4, depth: 25, intensity: 4, area: "日向灘", zoneHint: "kyushu" },
  { time: "2026-03-18T09:08:00+09:00", lat: 32.7, lon: 134.5, mag: 4.8, depth: 35, intensity: 3, area: "四国沖", zoneHint: "nankai" },
  { time: "2025-12-10T11:30:00+09:00", lat: 35.2, lon: 140.4, mag: 5.2, depth: 70, intensity: 4, area: "千葉県東方沖", zoneHint: "kanto_south" },
  { time: "2025-08-02T04:55:00+09:00", lat: 42.8, lon: 145.6, mag: 5.8, depth: 45, intensity: 5, area: "根室半島南東沖", zoneHint: "hokkaido_east" },
  { time: "2024-01-01T16:10:00+09:00", lat: 37.5, lon: 137.2, mag: 7.6, depth: 16, intensity: 7, area: "能登半島地震", zoneHint: "noto", majorHistorical: true },
  { time: "2011-03-11T14:46:00+09:00", lat: 38.1, lon: 142.9, mag: 9.0, depth: 24, intensity: 7, area: "東北地方太平洋沖地震", zoneHint: "tohoku_offshore", majorHistorical: true },
  { time: "1995-01-17T05:46:00+09:00", lat: 34.6, lon: 135.0, mag: 7.3, depth: 16, intensity: 7, area: "兵庫県南部地震", zoneHint: "inland", majorHistorical: true }
];

let map;
let quakeLayer = L.layerGroup();
let plateLayer = L.layerGroup();
let zoneLayer = L.layerGroup();
let currentPeriod = "realtime";

async function init() {
  activeQuakes = SAMPLE_QUAKES;
  await loadEarthquakeData();
  document.getElementById("updatedAt").textContent = `データ更新 ${formatDateTime(dataUpdatedAt)}`;

  map = L.map("map", { zoomControl: true }).setView([37.8, 138.5], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 10,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  quakeLayer.addTo(map);
  plateLayer.addTo(map);
  zoneLayer.addTo(map);

  renderPlates();
  renderZones();
  bindControls();
  updateView();
}

async function loadEarthquakeData() {
  try {
    const response = await fetch("data/latest-earthquakes.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const quakes = Array.isArray(payload) ? payload : payload.earthquakes;
    if (!Array.isArray(quakes) || quakes.length === 0) throw new Error("no earthquake data");

    activeQuakes = quakes.map(q => ({
      ...q,
      mag: Number(q.mag ?? q.magnitude ?? 0),
      lat: Number(q.lat),
      lon: Number(q.lon),
      depth: Number(q.depth ?? 0),
      intensity: Number(q.intensity ?? 0)
    })).filter(q => Number.isFinite(q.lat) && Number.isFinite(q.lon) && Number.isFinite(q.mag));

    dataUpdatedAt = payload.updated_at || payload.fetched_at || activeQuakes[0]?.time || dataUpdatedAt;
    baseTime = new Date();
    console.info(`loaded earthquake API data: ${activeQuakes.length} items`);
  } catch (error) {
    console.warn("latest-earthquakes.json を読み込めないため、サンプルデータで表示します。", error);
    activeQuakes = SAMPLE_QUAKES;
  }
}

function bindControls() {
  document.querySelectorAll(".period-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".period-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentPeriod = btn.dataset.period;
      updateView();
    });
  });

  ["toggleQuakes", "togglePlates", "toggleZones", "toggleMajorOnly"].forEach(id => {
    document.getElementById(id).addEventListener("change", updateView);
  });
}

function renderPlates() {
  plateLayer.clearLayers();
  PLATE_LINES.forEach(line => {
    const polyline = L.polyline(line.coords, {
      color: line.color,
      weight: 4,
      opacity: .88,
      dashArray: line.type === "トラフ" ? "8 7" : null
    }).addTo(plateLayer);

    polyline.bindPopup(`<strong>${line.name}</strong><br>${line.description}<br><small>※概略表示</small>`);
    polyline.on("click", () => renderSelectedPlate(line));

    const mid = line.coords[Math.floor(line.coords.length / 2)];
    L.marker(mid, {
      icon: L.divIcon({ className: "zone-label", html: line.name, iconSize: [120, 18] })
    }).addTo(plateLayer);
  });
}

function renderZones() {
  zoneLayer.clearLayers();
  ZONES.forEach(zone => {
    const score = calculateZoneRisk(zone, getFilteredQuakes());
    const circle = L.circle(zone.center, {
      radius: zone.radiusKm * 1000,
      color: riskColor(score),
      fillColor: riskColor(score),
      fillOpacity: .12,
      weight: 2,
      opacity: .55
    }).addTo(zoneLayer);

    circle.bindPopup(`<strong>${zone.name}</strong><br>危険度 ${score}/100<br>${riskLabel(score)}`);
    circle.on("click", () => renderSelectedZone(zone, score));
  });
}

function updateView() {
  const showQuakes = document.getElementById("toggleQuakes").checked;
  const showPlates = document.getElementById("togglePlates").checked;
  const showZones = document.getElementById("toggleZones").checked;

  if (showPlates && !map.hasLayer(plateLayer)) map.addLayer(plateLayer);
  if (!showPlates && map.hasLayer(plateLayer)) map.removeLayer(plateLayer);

  if (showZones && !map.hasLayer(zoneLayer)) map.addLayer(zoneLayer);
  if (!showZones && map.hasLayer(zoneLayer)) map.removeLayer(zoneLayer);

  quakeLayer.clearLayers();
  if (showQuakes) renderQuakes();

  renderZones();
  renderStats();
  renderQuakeList();
  renderOverallRisk();
}

function getFilteredQuakes() {
  const period = PERIODS[currentPeriod];
  const majorOnly = document.getElementById("toggleMajorOnly")?.checked;
  return activeQuakes.filter(q => {
    if (currentPeriod !== "all") {
      const diffHours = (baseTime - new Date(q.time)) / 36e5;
      if (diffHours < 0 || diffHours > period.hours) return false;
    }
    if (currentPeriod === "all" && !q.majorHistorical && q.mag < 5) return false;
    if (majorOnly && q.mag < 5) return false;
    return true;
  }).sort((a, b) => new Date(b.time) - new Date(a.time));
}

function renderQuakes() {
  const quakes = getFilteredQuakes();
  quakes.forEach(q => {
    const marker = L.circleMarker([q.lat, q.lon], {
      radius: quakeRadius(q),
      fillColor: quakeColor(q),
      color: "#fff",
      weight: q.mag >= 5 ? 1.5 : .8,
      opacity: .9,
      fillOpacity: .78
    }).addTo(quakeLayer);

    marker.bindPopup(`
      <strong>${q.area}</strong><br>
      ${formatDateTime(q.time)}<br>
      M${q.mag.toFixed(1)} / 最大震度 ${q.intensityLabel || q.intensity}<br>
      深さ ${q.depth}km
    `);
  });
}

function renderStats() {
  const quakes = getFilteredQuakes();
  const maxM = quakes.length ? Math.max(...quakes.map(q => q.mag)) : null;
  const maxI = quakes.length ? Math.max(...quakes.map(q => q.intensity)) : null;
  const major = quakes.filter(q => q.mag >= 5).length;
  document.getElementById("statCount").textContent = quakes.length;
  document.getElementById("statMaxM").textContent = maxM ? maxM.toFixed(1) : "-";
  document.getElementById("statMaxI").textContent = maxI ?? "-";
  document.getElementById("statMajor").textContent = major;
}

function renderQuakeList() {
  const list = document.getElementById("quakeList");
  const quakes = getFilteredQuakes().slice(0, 10);
  if (!quakes.length) {
    list.innerHTML = `<p class="notice">この期間の表示対象データはありません。</p>`;
    return;
  }
  list.innerHTML = quakes.map(q => `
    <div class="quake-item">
      <strong>${q.area} / M${q.mag.toFixed(1)}</strong>
      <span>${formatDateTime(q.time)}　最大震度 ${q.intensityLabel || q.intensity}　深さ ${q.depth}km</span>
    </div>
  `).join("");
}

function renderOverallRisk() {
  const quakes = getFilteredQuakes();
  const avg = Math.round(ZONES.reduce((sum, z) => sum + calculateZoneRisk(z, quakes), 0) / ZONES.length);
  const pill = document.getElementById("overallRiskPill");
  pill.textContent = `総合リスク ${avg}/100 ${riskLabel(avg)}`;
  pill.style.borderColor = riskColor(avg);
}

function renderSelectedZone(zone, score) {
  const quakes = getFilteredQuakes().filter(q => distanceKm(zone.center[0], zone.center[1], q.lat, q.lon) <= zone.radiusKm);
  const maxM = quakes.length ? Math.max(...quakes.map(q => q.mag)) : null;
  const major = quakes.filter(q => q.mag >= 5).length;
  document.getElementById("selectedCard").innerHTML = `
    <p class="eyebrow">Risk Area</p>
    <h2>${zone.name}</h2>
    <div class="risk-pill" style="display:inline-block;border-color:${riskColor(score)}">危険度 ${score}/100 ${riskLabel(score)}</div>
    <p style="margin-top:12px">${zone.tsunami ? "沿岸・津波リスクも確認推奨。" : "内陸直下型の揺れ・土砂災害などを確認推奨。"}</p>
    <ul class="clean-list">
      <li>表示期間：${PERIODS[currentPeriod].label}</li>
      <li>対象地震数：${quakes.length}</li>
      <li>最大M：${maxM ? maxM.toFixed(1) : "-"}</li>
      <li>M5以上：${major}件</li>
      <li>長期リスク基準：${zone.longTerm}/100</li>
    </ul>
    <p class="notice">※地震の発生日を予測するものではありません。防災確認の目安です。</p>
  `;
}

function renderSelectedPlate(line) {
  const quakes = getFilteredQuakes().filter(q => nearestLineDistanceKm(q, line.coords) <= 170);
  const dynamic = Math.min(25, quakes.length * 4 + quakes.filter(q => q.mag >= 5).length * 8);
  const score = Math.min(100, Math.round(line.riskBase * .75 + dynamic));
  document.getElementById("selectedCard").innerHTML = `
    <p class="eyebrow">Plate / Trench</p>
    <h2>${line.name}</h2>
    <div class="risk-pill" style="display:inline-block;border-color:${line.color}">${riskLabel(score)} ${score}/100</div>
    <p style="margin-top:12px">${line.description}</p>
    <ul class="clean-list">
      <li>種別：${line.type}</li>
      <li>表示期間：${PERIODS[currentPeriod].label}</li>
      <li>近傍の表示地震：${quakes.length}件</li>
      <li>M5以上：${quakes.filter(q => q.mag >= 5).length}件</li>
    </ul>
    <p class="notice">※プレート線は概略表示です。本格版ではGeoJSONを精密化します。</p>
  `;
}

function calculateZoneRisk(zone, quakes) {
  const nearby = quakes.filter(q => distanceKm(zone.center[0], zone.center[1], q.lat, q.lon) <= zone.radiusKm);
  const countScore = Math.min(18, nearby.length * 4);
  const majorScore = Math.min(20, nearby.filter(q => q.mag >= 5).length * 10 + nearby.filter(q => q.mag >= 6).length * 12);
  const maxM = nearby.length ? Math.max(...nearby.map(q => q.mag)) : 0;
  const maxIScore = nearby.length ? Math.min(14, Math.max(...nearby.map(q => q.intensity)) * 2) : 0;
  const magScore = maxM >= 7 ? 20 : maxM >= 6 ? 14 : maxM >= 5 ? 9 : maxM >= 4 ? 5 : 0;
  const longScore = zone.longTerm * .32;
  const tsunamiScore = zone.tsunami ? 5 : 0;
  return Math.min(100, Math.round(longScore + countScore + majorScore + maxIScore + magScore + tsunamiScore));
}

function quakeRadius(q) {
  if (q.mag >= 8) return 18;
  if (q.mag >= 7) return 15;
  if (q.mag >= 6) return 12;
  if (q.mag >= 5) return 10;
  return 5 + q.mag;
}

function quakeColor(q) {
  if (q.intensity >= 6 || q.mag >= 7) return "#ef4444";
  if (q.intensity >= 4 || q.mag >= 5) return "#f59e0b";
  if (q.intensity >= 2) return "#45d6ff";
  return "#2dd4bf";
}

function riskColor(score) {
  if (score >= 70) return "#ef4444";
  if (score >= 40) return "#f59e0b";
  return "#2dd4bf";
}

function riskLabel(score) {
  if (score >= 70) return "高い";
  if (score >= 40) return "注意";
  return "通常";
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestLineDistanceKm(q, coords) {
  return Math.min(...coords.map(c => distanceKm(q.lat, q.lon, c[0], c[1])));
}

document.addEventListener("DOMContentLoaded", init);

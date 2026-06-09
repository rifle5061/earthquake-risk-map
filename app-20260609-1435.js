let dataUpdatedAt = "2026-06-09T05:40:00+09:00";
let baseTime = new Date("2026-06-09T12:00:00+09:00"); // サンプルデータ用の基準時刻。APIデータ読込後は現在時刻へ更新。
let activeQuakes = [];
let activeNews = [];
let areaDictionary = [];
let latestTsunami = { active: false, alerts: [], updated_at: null, source: "未取得" };
let tsunamiZoneGeoJson = null;


const DEFAULT_AREA_DICTIONARY = [
  { keywords: ["南海トラフ", "東海地震", "東南海地震", "南海地震"], name: "南海トラフ", lat: 32.8, lon: 136.2, zoom: 6 },
  { keywords: ["日本海溝", "三陸沖", "東北沖"], name: "日本海溝・東北沖", lat: 38.6, lon: 143.0, zoom: 5 },
  { keywords: ["千島海溝", "根室沖", "釧路沖", "十勝沖", "北海道東方沖"], name: "千島海溝・北海道東方沖", lat: 43.4, lon: 146.4, zoom: 5 },
  { keywords: ["相模トラフ", "首都直下", "関東地震", "関東大震災"], name: "相模トラフ・関東南方", lat: 34.9, lon: 139.6, zoom: 7 },
  { keywords: ["日向灘", "宮崎県沖"], name: "日向灘", lat: 31.8, lon: 132.0, zoom: 7 },
  { keywords: ["南西諸島海溝", "琉球海溝", "沖縄本島近海", "奄美大島近海", "台湾付近"], name: "南西諸島海溝", lat: 27.0, lon: 128.2, zoom: 5 },
  { keywords: ["日本海東縁", "日本海東縁部", "山形県沖", "秋田県沖", "新潟県沖", "北海道西方沖"], name: "日本海東縁部", lat: 39.8, lon: 138.8, zoom: 5 },
  { keywords: ["能登半島", "石川県能登", "能登地方", "能登半島沖"], name: "能登半島周辺", lat: 37.35, lon: 136.9, zoom: 8 },
  { keywords: ["宮城県沖", "福島県沖", "茨城県沖", "岩手県沖", "青森県東方沖"], name: "東北〜関東沖", lat: 37.8, lon: 142.0, zoom: 6 },
  { keywords: ["東京湾", "千葉県東方沖", "茨城県南部", "千葉県北西部", "東京都", "神奈川県"], name: "首都圏周辺", lat: 35.55, lon: 139.8, zoom: 8 },
  { keywords: ["伊豆諸島", "伊豆大島", "新島", "神津島", "八丈島", "鳥島近海"], name: "伊豆諸島周辺", lat: 33.8, lon: 139.5, zoom: 6 },
  { keywords: ["紀伊水道", "和歌山県南方沖", "四国沖", "土佐湾", "豊後水道"], name: "紀伊水道〜四国沖", lat: 33.0, lon: 134.3, zoom: 7 },
  { keywords: ["熊本地震", "熊本県", "阿蘇", "大分県中部", "鹿児島湾", "薩摩半島西方沖"], name: "九州内陸・周辺", lat: 32.3, lon: 130.9, zoom: 7 },
  { keywords: ["長野県北部", "長野県中部", "岐阜県飛騨", "飛騨地方", "糸魚川静岡構造線"], name: "中部内陸", lat: 36.3, lon: 137.8, zoom: 7 },
  { keywords: ["大阪府北部", "兵庫県南部", "京都府南部", "淡路島", "有馬高槻断層"], name: "近畿内陸", lat: 34.8, lon: 135.3, zoom: 8 },
  { keywords: ["北海道", "札幌", "胆振", "石狩", "日高地方"], name: "北海道周辺", lat: 43.2, lon: 142.8, zoom: 6 },
  { keywords: ["青森", "岩手", "宮城", "秋田", "山形", "福島"], name: "東北地方", lat: 39.2, lon: 140.8, zoom: 6 },
  { keywords: ["新潟", "富山", "石川", "福井"], name: "北陸地方", lat: 37.0, lon: 137.2, zoom: 7 },
  { keywords: ["静岡", "愛知", "三重", "和歌山", "高知", "徳島", "愛媛", "大分", "宮崎"], name: "太平洋側・南海トラフ想定域", lat: 33.2, lon: 134.5, zoom: 6 },
  { keywords: ["沖縄", "奄美", "宮古島", "石垣島", "八重山"], name: "沖縄・南西諸島", lat: 25.7, lon: 127.8, zoom: 6 }
];

const DEFAULT_TSUNAMI_ZONES = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { id: "hokkaido_pacific_east", name: "北海道太平洋沿岸東部", keywords: ["北海道太平洋沿岸東部", "釧路", "根室", "十勝", "北海道東方沖"] },
      geometry: { type: "LineString", coordinates: [[145.8,43.4],[145.2,43.1],[144.3,42.9],[143.3,42.5],[142.4,42.1]] }
    },
    {
      type: "Feature",
      properties: { id: "hokkaido_pacific_west", name: "北海道太平洋沿岸西部", keywords: ["北海道太平洋沿岸西部", "日高", "胆振", "渡島"] },
      geometry: { type: "LineString", coordinates: [[142.4,42.1],[141.5,42.3],[140.8,41.9],[140.3,41.6]] }
    },
    {
      type: "Feature",
      properties: { id: "tohoku_pacific", name: "東北太平洋沿岸", keywords: ["青森県太平洋沿岸", "岩手県", "宮城県", "福島県", "三陸", "宮城県沖", "福島県沖"] },
      geometry: { type: "LineString", coordinates: [[141.4,41.2],[141.8,40.4],[141.9,39.6],[141.7,38.7],[141.4,37.8],[141.0,37.0]] }
    },
    {
      type: "Feature",
      properties: { id: "kanto_pacific", name: "関東太平洋沿岸", keywords: ["茨城県", "千葉県九十九里", "千葉県内房", "東京湾", "伊豆諸島", "茨城県沖", "千葉県東方沖"] },
      geometry: { type: "LineString", coordinates: [[140.8,36.8],[140.7,36.0],[140.3,35.4],[139.9,35.1],[139.6,34.7],[139.3,34.0]] }
    },
    {
      type: "Feature",
      properties: { id: "tokai", name: "東海沿岸", keywords: ["相模湾", "静岡県", "愛知県外海", "伊勢湾", "東海", "駿河湾"] },
      geometry: { type: "LineString", coordinates: [[139.2,35.1],[138.8,35.0],[138.4,34.8],[137.7,34.6],[137.0,34.7],[136.5,34.6]] }
    },
    {
      type: "Feature",
      properties: { id: "kii_shikoku", name: "紀伊半島〜四国沿岸", keywords: ["三重県南部", "和歌山県", "徳島県", "高知県", "愛媛県宇和海沿岸", "紀伊水道", "四国沖"] },
      geometry: { type: "LineString", coordinates: [[136.5,34.3],[136.0,33.8],[135.4,33.5],[134.6,33.5],[133.5,33.3],[132.8,32.9],[132.4,32.7]] }
    },
    {
      type: "Feature",
      properties: { id: "kyushu_pacific", name: "九州太平洋沿岸", keywords: ["大分県瀬戸内海沿岸", "大分県豊後水道沿岸", "宮崎県", "鹿児島県東部", "日向灘", "種子島", "屋久島"] },
      geometry: { type: "LineString", coordinates: [[132.2,32.7],[131.8,32.2],[131.6,31.8],[131.2,31.4],[130.8,31.0],[130.4,30.5]] }
    },
    {
      type: "Feature",
      properties: { id: "ryukyu", name: "奄美・沖縄・先島諸島", keywords: ["奄美群島", "沖縄本島地方", "宮古島", "八重山", "大東島", "南西諸島", "沖縄", "台湾付近"] },
      geometry: { type: "LineString", coordinates: [[130.0,28.3],[128.5,27.0],[127.7,26.2],[125.3,24.8],[123.8,24.3]] }
    },
    {
      type: "Feature",
      properties: { id: "hokuriku_noto", name: "北陸・能登沿岸", keywords: ["新潟県上中下越", "佐渡", "富山県", "石川県能登", "石川県加賀", "福井県", "能登半島"] },
      geometry: { type: "LineString", coordinates: [[139.2,38.3],[138.4,37.9],[137.5,37.4],[136.7,37.2],[136.0,36.6],[135.7,35.8]] }
    },
    {
      type: "Feature",
      properties: { id: "japan_sea_north", name: "日本海北部沿岸", keywords: ["北海道日本海沿岸", "青森県日本海沿岸", "秋田県", "山形県", "日本海東縁"] },
      geometry: { type: "LineString", coordinates: [[141.0,45.1],[140.5,43.8],[140.2,42.6],[140.1,41.2],[139.8,40.2],[139.7,39.0],[139.4,38.5]] }
    },
    {
      type: "Feature",
      properties: { id: "sanin_kyushu_west", name: "山陰〜九州西岸", keywords: ["京都府", "兵庫県北部", "鳥取県", "島根県", "山口県日本海沿岸", "福岡県日本海沿岸", "佐賀県北部", "長崎県西方", "熊本県天草灘沿岸", "鹿児島県西部"] },
      geometry: { type: "LineString", coordinates: [[135.6,35.7],[134.2,35.6],[132.9,35.5],[131.7,34.6],[130.4,33.8],[129.6,33.2],[129.3,32.6],[130.0,31.5]] }
    },
    {
      type: "Feature",
      properties: { id: "seto_inland", name: "瀬戸内海沿岸", keywords: ["瀬戸内海沿岸", "大阪府", "兵庫県瀬戸内海沿岸", "岡山県", "広島県", "山口県瀬戸内海沿岸", "香川県", "愛媛県瀬戸内海沿岸"] },
      geometry: { type: "LineString", coordinates: [[135.2,34.5],[134.4,34.3],[133.5,34.3],[132.5,34.1],[131.7,33.9]] }
    }
  ]
};


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
let highlightLayer = L.layerGroup();
let tsunamiLayer = L.layerGroup();
let currentPeriod = "24h";

async function init() {
  activeQuakes = SAMPLE_QUAKES;
  await loadEarthquakeData();
  await loadAreaDictionary();
  await loadEarthquakeNews();
  if (!activeNews.length) activeNews = buildNewsFromQuakes(activeQuakes);
  await loadTsunamiZones();
  await loadTsunamiData();
  document.getElementById("updatedAt").textContent = `データ更新 ${formatDateTime(dataUpdatedAt)}`;

  // 日本周辺に表示範囲を制限しつつ、ズーム操作は可能にする。
  // 世界の反対側まで横移動しないようにするための bounds で、拡大表示は止めない。
  const japanBounds = L.latLngBounds(
    [20.0, 120.0], // 南西：沖縄・南西諸島の外側まで含める
    [46.8, 155.5]  // 北東：北海道・千島側の外側まで含める
  );

  map = L.map("map", {
    zoomControl: true,
    preferCanvas: true,
    minZoom: 4,
    maxZoom: 12,
    maxBounds: japanBounds,
    maxBoundsViscosity: 0.85
  }).setView([37.8, 138.5], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 12,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  quakeLayer.addTo(map);
  plateLayer.addTo(map);
  zoneLayer.addTo(map);
  highlightLayer.addTo(map);
  tsunamiLayer.addTo(map);

  renderPlates();
  renderZones();
  bindControls();
  updateView();

  // スマホ表示・GitHub Pages読み込み直後に地図サイズ計算がずれることがあるため再計算する。
  setTimeout(() => map.invalidateSize(), 150);
  setTimeout(() => map.invalidateSize(), 600);
  window.addEventListener("resize", () => map.invalidateSize());
}


async function loadTsunamiZones() {
  tsunamiZoneGeoJson = DEFAULT_TSUNAMI_ZONES;
  try {
    const response = await fetch("data/tsunami-zones.geojson", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (payload && payload.type === "FeatureCollection" && Array.isArray(payload.features)) {
      tsunamiZoneGeoJson = payload;
    }
  } catch (error) {
    console.info("tsunami-zones.geojson がないため、内蔵の概略沿岸データを使います。", error);
  }
}

async function loadTsunamiData() {
  latestTsunami = { active: false, alerts: [], updated_at: null, source: "未取得" };
  try {
    const response = await fetch("data/latest-tsunami.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const alerts = Array.isArray(payload.alerts) ? payload.alerts.map(normalizeTsunamiAlert).filter(Boolean) : [];
    latestTsunami = {
      ...payload,
      active: Boolean(payload.active || alerts.some(a => ["major", "warning", "advisory"].includes(a.level))),
      alerts,
      updated_at: payload.updated_at || payload.fetched_at || null,
      source: payload.source || "津波情報"
    };
  } catch (error) {
    console.info("latest-tsunami.json がないため、津波表示は発表なしで表示します。", error);
  }
}

function normalizeTsunamiAlert(alert) {
  if (!alert) return null;
  const area = String(alert.area || alert.name || alert.forecast_area || "").trim();
  if (!area) return null;
  const status = String(alert.status || alert.kind || alert.category || alert.name || "").trim();
  const level = normalizeTsunamiLevel(alert.level || status);
  return {
    ...alert,
    area,
    status: status || tsunamiLevelLabel(level),
    level,
    height: alert.height || alert.max_height || alert.maxHeight || "不明",
    arrival: alert.arrival || alert.arrival_time || alert.firstHeightArrivalTime || "不明",
    issued_at: alert.issued_at || alert.time || latestTsunami.updated_at || "",
    lat: alert.lat === undefined || alert.lat === null || alert.lat === "" ? null : Number(alert.lat),
    lon: alert.lon === undefined || alert.lon === null || alert.lon === "" ? null : Number(alert.lon),
    zoom: alert.zoom ? Number(alert.zoom) : 7,
    keywords: Array.isArray(alert.keywords) ? alert.keywords.map(String) : [area]
  };
}

function normalizeTsunamiLevel(value) {
  const text = String(value || "");
  if (text.includes("大津波") || text === "major") return "major";
  if (text.includes("津波警報") || text === "warning") return "warning";
  if (text.includes("津波注意報") || text === "advisory") return "advisory";
  if (text.includes("若干") || text.includes("津波予報") || text === "forecast") return "forecast";
  if (text.includes("解除") || text.includes("なし") || text === "none" || text === "cleared") return "none";
  return "none";
}

function tsunamiLevelLabel(level) {
  return {
    major: "大津波警報",
    warning: "津波警報",
    advisory: "津波注意報",
    forecast: "津波予報",
    none: "発表なし"
  }[level] || "発表なし";
}

function tsunamiColor(level) {
  return {
    major: "#a855f7",
    warning: "#ef4444",
    advisory: "#facc15",
    forecast: "#38bdf8",
    none: "#64748b"
  }[level] || "#64748b";
}

function findTsunamiAlertForFeature(feature) {
  const props = feature.properties || {};
  const keywords = Array.isArray(props.keywords) ? props.keywords.map(String) : [String(props.name || "")];
  return latestTsunami.alerts.find(alert => {
    const alertWords = [alert.area, alert.status, ...(alert.keywords || [])].filter(Boolean).join(" ");
    return keywords.some(k => alertWords.includes(k)) || keywords.some(k => alert.area.includes(k)) || alert.area.includes(props.name || "");
  }) || null;
}

function renderTsunamiLayer() {
  tsunamiLayer.clearLayers();
  if (!tsunamiZoneGeoJson || !Array.isArray(tsunamiZoneGeoJson.features)) return;

  tsunamiZoneGeoJson.features.forEach(feature => {
    const alert = findTsunamiAlertForFeature(feature);
    if (!alert || !["major", "warning", "advisory", "forecast"].includes(alert.level)) return;
    const color = tsunamiColor(alert.level);
    const layer = L.geoJSON(feature, {
      style: {
        color,
        weight: alert.level === "major" ? 12 : alert.level === "warning" ? 10 : 8,
        opacity: alert.level === "forecast" ? 0.75 : 0.95,
        lineCap: "round",
        lineJoin: "round"
      }
    }).addTo(tsunamiLayer);

    layer.bindPopup(`
      <strong>${escapeHtml(alert.area)}</strong><br>
      ${escapeHtml(tsunamiLevelLabel(alert.level))}<br>
      予想高さ：${escapeHtml(alert.height || "不明")}<br>
      到達予想：${escapeHtml(alert.arrival || "不明")}
    `);
    layer.on("click", () => renderSelectedTsunami(alert, feature));
  });
}

function renderTsunamiCard() {
  const card = document.getElementById("tsunamiCard");
  if (!card) return;
  const activeAlerts = latestTsunami.alerts.filter(a => ["major", "warning", "advisory", "forecast"].includes(a.level));
  const strongest = activeAlerts.find(a => a.level === "major") || activeAlerts.find(a => a.level === "warning") || activeAlerts.find(a => a.level === "advisory") || activeAlerts.find(a => a.level === "forecast");
  const statusClass = strongest ? strongest.level : "none";
  const statusText = strongest ? tsunamiLevelLabel(strongest.level) : "発表なし";

  if (!activeAlerts.length) {
    card.innerHTML = `
      <div class="card-title-row">
        <h2>津波警報・注意報</h2>
        <span class="tsunami-status none">${statusText}</span>
      </div>
      <p class="notice">現在、表示対象の津波警報・注意報はありません。発表時は沿岸部を色分け表示します。</p>
      <div class="tsunami-legend"><span><i class="major"></i>大津波警報</span><span><i class="warning"></i>津波警報</span><span><i class="advisory"></i>津波注意報</span></div>
    `;
    return;
  }

  card.innerHTML = `
    <div class="card-title-row">
      <h2>津波警報・注意報</h2>
      <span class="tsunami-status ${statusClass}">${statusText}</span>
    </div>
    <p class="notice">発表中の沿岸部を地図上に色分け表示しています。詳細は必ず気象庁・自治体の公式情報を確認してください。</p>
    <div class="tsunami-list">
      ${activeAlerts.slice(0, 8).map((alert, index) => `
        <div class="tsunami-item" data-tsunami-index="${index}">
          <strong>${escapeHtml(alert.area)} / ${escapeHtml(tsunamiLevelLabel(alert.level))}</strong>
          <span>予想高さ：${escapeHtml(alert.height || "不明")}　到達予想：${escapeHtml(alert.arrival || "不明")}</span>
        </div>
      `).join("")}
    </div>
    <div class="tsunami-legend"><span><i class="major"></i>大津波警報</span><span><i class="warning"></i>津波警報</span><span><i class="advisory"></i>津波注意報</span></div>
  `;

  card.querySelectorAll("[data-tsunami-index]").forEach(el => {
    el.addEventListener("click", () => {
      const alert = activeAlerts[Number(el.dataset.tsunamiIndex)];
      const feature = tsunamiZoneGeoJson.features.find(f => findTsunamiAlertForFeature(f) === alert);
      renderSelectedTsunami(alert, feature);
    });
  });
}

function renderSelectedTsunami(alert, feature) {
  const center = getFeatureCenter(feature) || [alert.lat, alert.lon];
  if (center && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
    map.flyTo([center[0], center[1]], alert.zoom || 7, { duration: 0.8 });
  }
  document.getElementById("selectedCard").innerHTML = `
    <p class="eyebrow">Tsunami Information</p>
    <h2>${escapeHtml(alert.area)}</h2>
    <div class="tsunami-status ${escapeHtml(alert.level)}">${escapeHtml(tsunamiLevelLabel(alert.level))}</div>
    <ul class="clean-list" style="margin-top:12px">
      <li>予想高さ：${escapeHtml(alert.height || "不明")}</li>
      <li>到達予想：${escapeHtml(alert.arrival || "不明")}</li>
      <li>情報源：${escapeHtml(latestTsunami.source || "津波情報")}</li>
      ${latestTsunami.updated_at ? `<li>更新：${formatDateTime(latestTsunami.updated_at)}</li>` : ""}
    </ul>
    <p class="notice">※避難判断は必ず気象庁・自治体・防災機関の公式情報を確認してください。</p>
  `;
}

function getFeatureCenter(feature) {
  if (!feature || !feature.geometry) return null;
  let coords = [];
  const g = feature.geometry;
  if (g.type === "LineString") coords = g.coordinates || [];
  if (g.type === "MultiLineString") coords = (g.coordinates || []).flat();
  if (g.type === "Polygon") coords = (g.coordinates || []).flat();
  if (!coords.length) return null;
  const avg = coords.reduce((acc, c) => [acc[0] + Number(c[1]), acc[1] + Number(c[0])], [0, 0]);
  return [avg[0] / coords.length, avg[1] / coords.length];
}

function filterAdCarousel(category) {
  const selected = category || "all";
  const slides = Array.from(document.querySelectorAll(".ad-slide"));
  let visibleCount = 0;

  slides.forEach(slide => {
    const slideCategory = slide.getAttribute("data-ad-category") || slide.getAttribute("data-category") || "";
    const match = selected === "all" || slideCategory === selected;

    if (match) {
      slide.hidden = false;
      slide.classList.remove("hidden", "is-filtered-out", "ad-hidden-hard");
      slide.removeAttribute("aria-hidden");
      slide.style.setProperty("display", "block", "important");
      visibleCount += 1;
    } else {
      slide.hidden = true;
      slide.classList.add("hidden", "is-filtered-out", "ad-hidden-hard");
      slide.setAttribute("aria-hidden", "true");
      slide.style.setProperty("display", "none", "important");
    }
  });

  const carousel = document.getElementById("adCarousel");
  if (carousel) {
    carousel.dataset.activeCategory = selected;
    try { carousel.scrollTo({ left: 0, behavior: "instant" }); }
    catch (e) { carousel.scrollLeft = 0; }
  }

  const empty = document.getElementById("adEmptyMessage");
  if (empty) empty.hidden = visibleCount !== 0;
}

async function fetchJsonFromCandidates(paths) {
  let lastError = null;
  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("no candidate json loaded");
}

async function loadAreaDictionary() {
  areaDictionary = DEFAULT_AREA_DICTIONARY.map(normalizeAreaEntry).filter(Boolean);
  try {
    const response = await fetch("data/area-dictionary.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const entries = Array.isArray(payload) ? payload : payload.areas;
    if (!Array.isArray(entries) || entries.length === 0) throw new Error("no area dictionary");
    const normalized = entries.map(normalizeAreaEntry).filter(Boolean);
    if (normalized.length) areaDictionary = normalized;
  } catch (error) {
    console.info("area-dictionary.json がないため、内蔵辞書でニュース地域ズームを行います。", error);
  }
  areaDictionary.sort((a, b) => b.priority - a.priority);
}

function normalizeAreaEntry(entry) {
  if (!entry) return null;
  const keywords = Array.isArray(entry.keywords)
    ? entry.keywords.map(String).filter(Boolean)
    : [entry.name, entry.keyword].map(v => v ? String(v) : "").filter(Boolean);
  const lat = Number(entry.lat);
  const lon = Number(entry.lon);
  if (!keywords.length || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const name = String(entry.name || keywords[0]);
  const zoom = Number(entry.zoom || 7);
  const priority = Number(entry.priority || Math.max(...keywords.map(k => k.length)));
  return { ...entry, name, keywords, lat, lon, zoom, priority };
}

function findAreaTarget(item) {
  const haystack = [item.title, item.area, item.summary, item.source].filter(Boolean).join(" ");
  if (!haystack) return null;
  return areaDictionary.find(entry => entry.keywords.some(keyword => haystack.includes(keyword))) || null;
}

function applyAreaDictionary(item) {
  if (Number.isFinite(item.lat) && Number.isFinite(item.lon)) {
    item.zoomable = true;
    item.zoomSource = "exact";
    return item;
  }
  const target = findAreaTarget(item);
  if (!target) {
    item.zoomable = false;
    item.zoomSource = "none";
    return item;
  }
  item.lat = target.lat;
  item.lon = target.lon;
  item.zoom = target.zoom;
  item.area = item.area || target.name;
  item.matchedArea = target.name;
  item.zoomable = true;
  item.zoomSource = "dictionary";
  return item;
}

async function loadEarthquakeNews() {
  try {
    const payload = await fetchJsonFromCandidates([
      "data/earthquake-news.json",
      "data/地震ニュース.json"
    ]);
    const news = Array.isArray(payload) ? payload : payload.news;
    if (!Array.isArray(news) || news.length === 0) throw new Error("no news data");

    activeNews = news.map(normalizeNewsItem).filter(item => item.title);
  } catch (error) {
    console.warn("earthquake-news.json を読み込めないため、最新地震データからニュース欄を作ります。", error);
    activeNews = buildNewsFromQuakes(activeQuakes);
  }
}

function normalizeNewsItem(item) {
  const normalized = {
    title: String(item.title || ""),
    source: String(item.source || item.publisher || "地震関連"),
    time: item.time || item.published_at || item.pubDate || null,
    url: item.url || item.link || "",
    type: item.type || "news",
    area: item.area || "",
    summary: item.summary || item.description || "",
    lat: item.lat === null || item.lat === undefined || item.lat === "" ? null : Number(item.lat),
    lon: item.lon === null || item.lon === undefined || item.lon === "" ? null : Number(item.lon),
    zoom: item.zoom ? Number(item.zoom) : 7,
    zoomable: Boolean(item.zoomable || (Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)))),
    matchedArea: item.matchedArea || "",
    zoomSource: item.zoomSource || ""
  };
  return applyAreaDictionary(normalized);
}

function buildNewsFromQuakes(quakes) {
  return quakes
    .slice()
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 8)
    .map(q => ({
      title: `【地震情報】${q.area} M${Number(q.mag).toFixed(1)} 最大震度${q.intensityLabel || q.intensity}`,
      source: "地震情報",
      time: q.time,
      type: "earthquake",
      area: q.area,
      summary: `震源の深さ ${q.depth}km。クリックで震源付近へ移動します。`,
      lat: q.lat,
      lon: q.lon,
      zoom: Number(q.mag) >= 6 ? 7 : 8,
      zoomable: true
    }));
}

async function loadEarthquakeData() {
  try {
    const payload = await fetchJsonFromCandidates([
      "data/latest-earthquakes.json",
      "data/最新の地震情報.json",
      "data/最新地震情報.json"
    ]);
    const quakes = Array.isArray(payload) ? payload : payload.earthquakes;
    if (!Array.isArray(quakes) || quakes.length === 0) throw new Error("no earthquake data");

    activeQuakes = quakes.map(q => ({
      ...q,
      mag: Number(q.mag ?? q.magnitude ?? 0),
      lat: Number(q.lat),
      lon: Number(q.lon),
      depth: Number(q.depth ?? 0),
      intensity: Number(q.intensity ?? 0),
      intensityLabel: q.intensityLabel ?? q.maxScale ?? q.intensity ?? "-",
      area: q.area || q.hypocenter || q.name || "震源地不明"
    })).filter(q =>
      Number.isFinite(q.lat) && Number.isFinite(q.lon) &&
      q.lat >= 20 && q.lat <= 47 && q.lon >= 120 && q.lon <= 156 &&
      Number.isFinite(q.mag) && q.mag >= 0
    );

    if (!activeQuakes.length) throw new Error("no valid earthquake coordinates");

    dataUpdatedAt = payload.updated_at || payload.fetched_at || activeQuakes[0]?.time || dataUpdatedAt;
    // 端末時刻やテストデータの年ズレで全件非表示にならないよう、データ内の最新時刻を基準にする。
    const latestTime = activeQuakes
      .map(q => new Date(q.time))
      .filter(d => !Number.isNaN(d.getTime()))
      .sort((a, b) => b - a)[0];
    baseTime = latestTime || new Date(dataUpdatedAt) || new Date();
    console.info(`loaded earthquake API data: ${activeQuakes.length} valid items`, { baseTime });
  } catch (error) {
    console.warn("latest-earthquakes.json を読み込めないため、サンプルデータで表示します。", error);
    activeQuakes = SAMPLE_QUAKES;
    baseTime = new Date(SAMPLE_QUAKES[0].time);
  }
}

function applyPeriodFilter(period, shouldUpdate = true) {
  const selected = period || "24h";
  currentPeriod = selected;

  document.querySelectorAll(".period-btn").forEach(btn => {
    const active = btn.dataset.period === selected;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });

  if (shouldUpdate) updateView();
}

function bindControls() {
  document.querySelectorAll(".period-btn").forEach(btn => {
    btn.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      applyPeriodFilter(btn.dataset.period || "24h");
    });
  });
  window.applyPeriodFilter = applyPeriodFilter;
  applyPeriodFilter(currentPeriod, false);

  ["toggleQuakes", "togglePlates", "toggleZones", "toggleTsunami", "toggleMajorOnly"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", updateView);
  });

  document.querySelectorAll(".ad-tab").forEach(tab => {
    tab.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const category = tab.dataset.adCategory || "all";
      document.querySelectorAll(".ad-tab").forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-pressed", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-pressed", "true");
      filterAdCarousel(category);
    });
  });
  filterAdCarousel("all");
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
  const showQuakes = document.getElementById("toggleQuakes")?.checked ?? true;
  const showPlates = document.getElementById("togglePlates")?.checked ?? true;
  const showZones = document.getElementById("toggleZones")?.checked ?? true;
  const showTsunami = document.getElementById("toggleTsunami")?.checked ?? true;

  if (showPlates && !map.hasLayer(plateLayer)) map.addLayer(plateLayer);
  if (!showPlates && map.hasLayer(plateLayer)) map.removeLayer(plateLayer);

  if (showZones && !map.hasLayer(zoneLayer)) map.addLayer(zoneLayer);
  if (!showZones && map.hasLayer(zoneLayer)) map.removeLayer(zoneLayer);

  if (showTsunami && !map.hasLayer(tsunamiLayer)) map.addLayer(tsunamiLayer);
  if (!showTsunami && map.hasLayer(tsunamiLayer)) map.removeLayer(tsunamiLayer);

  quakeLayer.clearLayers();
  if (showQuakes) renderQuakes();

  renderZones();
  renderTsunamiLayer();
  renderStats();
  renderQuakeList();
  renderNewsList();
  renderTsunamiCard();
  renderOverallRisk();
}

function getFilteredQuakes() {
  const period = PERIODS[currentPeriod] || PERIODS["24h"];
  const majorOnly = document.getElementById("toggleMajorOnly")?.checked;
  const sorted = activeQuakes
    .filter(q =>
      Number.isFinite(q.lat) && Number.isFinite(q.lon) &&
      q.lat >= 20 && q.lat <= 47 && q.lon >= 120 && q.lon <= 156
    )
    .sort((a, b) => new Date(b.time) - new Date(a.time));

  let filtered;

  // 「リアルタイム」は、データ取得時点の最新地震を表示するモード。
  // API更新間隔や端末時刻差で1時間以内が0件にならないよう、最新10件を出す。
  if (currentPeriod === "realtime") {
    filtered = sorted.slice(0, 10);
  } else if (currentPeriod === "all") {
    filtered = sorted;
  } else {
    filtered = sorted.filter(q => {
      const quakeTime = new Date(q.time);
      if (Number.isNaN(quakeTime.getTime())) return false;
      const diffHours = (baseTime - quakeTime) / 36e5;
      return diffHours >= -1 && diffHours <= period.hours;
    });
  }

  if (majorOnly) filtered = filtered.filter(q => q.mag >= 5);

  // 期間フィルターで空になった場合でも、地図が真っ白にならないよう最新10件を表示する。
  if (!filtered.length && !majorOnly && sorted.length) {
    filtered = sorted.slice(0, 10);
  }

  return filtered;
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

    marker.bindPopup(compactPopupHtml({
      title: q.area,
      time: q.time,
      detail: `M${q.mag.toFixed(1)} / 深さ${q.depth}km`
    }), compactPopupOptions());

    marker.on("click", () => {
      updateFocusCard({
        lat: q.lat,
        lon: q.lon,
        title: q.area,
        detail: `M${q.mag.toFixed(1)} / 最大震度 ${q.intensityLabel || q.intensity} / 深さ ${q.depth}km`,
        time: q.time,
        type: "earthquake"
      }, "地図選択中");
    });
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
  list.innerHTML = quakes.map((q, index) => `
    <button class="quake-item clickable" type="button" data-quake-index="${index}">
      <strong>${escapeHtml(q.area)} / M${q.mag.toFixed(1)}</strong>
      <span>${formatDateTime(q.time)}　最大震度 ${escapeHtml(q.intensityLabel || q.intensity)}　深さ ${escapeHtml(q.depth)}km</span>
      <small>クリックで震源へ移動</small>
    </button>
  `).join("");

  list.querySelectorAll("[data-quake-index]").forEach(button => {
    button.addEventListener("click", () => {
      const q = quakes[Number(button.dataset.quakeIndex)];
      focusMapItem({
        lat: q.lat,
        lon: q.lon,
        zoom: q.mag >= 6 ? 7 : 8,
        title: q.area,
        detail: `M${q.mag.toFixed(1)} / 最大震度 ${q.intensityLabel || q.intensity} / 深さ ${q.depth}km`,
        popupDetail: `M${q.mag.toFixed(1)} / 深さ${q.depth}km`,
        time: q.time,
        type: "earthquake"
      });
    });
  });
}

function renderNewsList() {
  const list = document.getElementById("newsList");
  if (!list) return;

  const news = activeNews.slice(0, 10);
  if (!news.length) {
    list.innerHTML = `<p class="notice">表示できる地震関連ニュースはまだありません。</p>`;
    return;
  }

  list.innerHTML = news.map((item, index) => {
    const canZoom = Number.isFinite(item.lat) && Number.isFinite(item.lon);
    const isDictionaryZoom = canZoom && item.zoomSource === "dictionary";
    const time = item.time ? formatDateTime(item.time) : "日時不明";
    const source = escapeHtml(item.source || "地震関連");
    const title = escapeHtml(item.title);
    const summary = item.summary ? `<p>${escapeHtml(item.summary)}</p>` : "";
    const matched = item.matchedArea ? `<p class="matched-area">推定エリア：${escapeHtml(item.matchedArea)}</p>` : "";
    const link = item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">記事を開く</a>` : "";
    const zoomBadge = canZoom ? `<span class="zoom-badge">${isDictionaryZoom ? "地域ズーム" : "地図へ移動"}</span>` : `<span class="zoom-badge disabled">リンクのみ</span>`;

    return `
      <div class="news-item ${canZoom ? "clickable" : ""}" data-news-index="${index}">
        <div class="news-meta"><span>${source}</span><span>${time}</span>${zoomBadge}</div>
        <strong>${title}</strong>
        ${summary}
        ${matched}
        ${link}
      </div>
    `;
  }).join("");

  list.querySelectorAll(".news-item.clickable").forEach(itemEl => {
    itemEl.addEventListener("click", event => {
      if (event.target.tagName.toLowerCase() === "a") return;
      const item = news[Number(itemEl.dataset.newsIndex)];
      focusMapItem({
        lat: item.lat,
        lon: item.lon,
        zoom: item.zoom || 7,
        title: item.area || item.title,
        detail: item.matchedArea ? `${item.summary || item.title}（推定エリア：${item.matchedArea}）` : (item.summary || item.title),
        popupDetail: item.matchedArea ? `推定：${item.matchedArea}` : "地震関連ニュース",
        time: item.time,
        type: item.type || "news"
      });
    });
  });
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

function compactPopupOptions() {
  return {
    className: "compact-map-popup",
    maxWidth: 190,
    minWidth: 130,
    autoPan: true,
    keepInView: true,
    closeButton: true
  };
}

function compactText(text, max = 42) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function compactPopupHtml(item) {
  const title = compactText(item.title || "地震関連地点", 16);
  const detail = compactText(item.popupDetail || item.detail || "", 36);
  return `
    <div class="mini-map-popup">
      <strong>${escapeHtml(title)}</strong>
      ${item.time ? `<span>${formatDateTime(item.time)}</span>` : ""}
      ${detail ? `<small>${escapeHtml(detail)}</small>` : ""}
    </div>
  `;
}

function updateFocusCard(item, label = "地図移動済み") {
  document.getElementById("selectedCard").innerHTML = `
    <p class="eyebrow">Map Focus</p>
    <h2>${escapeHtml(item.title || "地震関連地点")}</h2>
    <div class="risk-pill" style="display:inline-block;border-color:#facc15">${escapeHtml(label)}</div>
    <p style="margin-top:12px">${escapeHtml(item.detail || "位置情報がある項目をクリックしたため、地図を該当地点へ移動しました。")}</p>
    <ul class="clean-list">
      <li>種別：${escapeHtml(item.type || "news")}</li>
      ${item.time ? `<li>時刻：${formatDateTime(item.time)}</li>` : ""}
      <li>緯度：${Number(item.lat).toFixed(3)}</li>
      <li>経度：${Number(item.lon).toFixed(3)}</li>
    </ul>
    <p class="notice">※ニュース由来の位置は、記事内の地名・辞書から推定している場合があります。</p>
  `;
}

function focusMapItem(item) {
  if (!Number.isFinite(item.lat) || !Number.isFinite(item.lon)) return;

  const zoom = item.zoom || 7;
  map.flyTo([item.lat, item.lon], zoom, { duration: 0.8 });
  highlightLayer.clearLayers();

  const marker = L.circleMarker([item.lat, item.lon], {
    radius: 15,
    color: "#ffffff",
    weight: 2,
    fillColor: "#facc15",
    fillOpacity: 0.32,
    opacity: 0.95
  }).addTo(highlightLayer);

  marker.bindPopup(compactPopupHtml(item), compactPopupOptions()).openPopup();
  updateFocusCard(item);
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

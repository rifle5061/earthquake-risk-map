#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
地震危険度マップ用：地震データ自動更新スクリプト

取得元：
- P2P地震情報 JSON API v2
- history code=551（地震情報）

出力：
- data/earthquakes.json

GitHub Actions から定期実行する想定。
"""

from __future__ import annotations

import json
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "earthquakes.json"

JST = timezone(timedelta(hours=9))

ENDPOINT = "https://api.p2pquake.net/v2/history?codes=551&limit=100&offset=0"


INTENSITY_LABELS = {
    -1: "不明",
    0: "0",
    10: "1",
    20: "2",
    30: "3",
    40: "4",
    45: "5弱",
    50: "5強",
    55: "6弱",
    60: "6強",
    70: "7",
}


def now_jst_iso() -> str:
    return datetime.now(JST).isoformat(timespec="seconds")


def fetch_json(url: str) -> Any:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "earthquake-risk-map/1.0 (+https://github.com/)",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=20) as res:
        return json.loads(res.read().decode("utf-8"))


def as_float(value: Any, default: float | None = None) -> float | None:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except Exception:
        return default


def as_int(value: Any, default: int | None = None) -> int | None:
    try:
        if value is None or value == "":
            return default
        return int(value)
    except Exception:
        return default


def intensity_label(max_scale: Any) -> str:
    scale = as_int(max_scale, -1)
    return INTENSITY_LABELS.get(scale, str(scale) if scale is not None else "不明")


def zone_hint(area: str, lat: float | None, lon: float | None) -> str:
    text = area or ""

    if "北海道" in text:
        return "hokkaido"
    if any(k in text for k in ["青森", "岩手", "宮城", "秋田", "山形", "福島", "三陸", "東北"]):
        return "tohoku"
    if any(k in text for k in ["茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川", "関東"]):
        return "kanto"
    if any(k in text for k in ["新潟", "長野", "山梨", "静岡", "愛知", "岐阜", "三重", "東海", "中部"]):
        return "chubu"
    if any(k in text for k in ["大阪", "京都", "兵庫", "奈良", "滋賀", "和歌山", "近畿"]):
        return "kansai"
    if any(k in text for k in ["鳥取", "島根", "岡山", "広島", "山口", "中国"]):
        return "chugoku"
    if any(k in text for k in ["徳島", "香川", "愛媛", "高知", "四国"]):
        return "shikoku"
    if any(k in text for k in ["福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "九州"]):
        return "kyushu"
    if "沖縄" in text:
        return "okinawa"

    # 座標のざっくり補助
    if lat is not None and lon is not None:
        if lat >= 41:
            return "hokkaido"
        if lat >= 37 and lon >= 139:
            return "tohoku"
        if 34 <= lat < 37 and 138 <= lon <= 141:
            return "kanto"
        if lat < 30:
            return "okinawa"

    return "unknown"


def normalize_item(raw: dict[str, Any]) -> dict[str, Any] | None:
    eq = raw.get("earthquake") or {}
    hypo = eq.get("hypocenter") or {}

    area = hypo.get("name") or raw.get("area") or "不明"
    lat = as_float(hypo.get("latitude"))
    lon = as_float(hypo.get("longitude"))
    mag = as_float(hypo.get("magnitude"))
    depth = as_int(hypo.get("depth"))
    max_scale = as_int(eq.get("maxScale"), -1)

    # 座標がない地震は地図表示できないので残しつつ map:false
    map_ok = isinstance(lat, float) and isinstance(lon, float)

    item = {
        "id": raw.get("id") or f"{eq.get('time','')}-{area}",
        "code": raw.get("code"),
        "time": eq.get("time") or raw.get("time"),
        "received_at": raw.get("time"),
        "lat": lat,
        "lon": lon,
        "mag": mag,
        "depth": depth,
        "maxScale": max_scale,
        "intensityLabel": intensity_label(max_scale),
        "area": area,
        "domesticTsunami": eq.get("domesticTsunami", "Unknown"),
        "foreignTsunami": eq.get("foreignTsunami", "Unknown"),
        "zoneHint": zone_hint(area, lat, lon),
        "source": "P2P地震情報",
        "map": map_ok,
    }

    return item


def main() -> None:
    data = fetch_json(ENDPOINT)
    if not isinstance(data, list):
        raise ValueError("P2P response is not list")

    items = []
    for raw in data:
        item = normalize_item(raw)
        if item:
            items.append(item)

    latest_time = items[0]["time"] if items else None

    out = {
        "source": "P2P地震情報 JSON API v2 / 履歴コード551",
        "endpoint": ENDPOINT,
        "fetched_at": now_jst_iso(),
        "updated_at": latest_time,
        "count": len(items),
        "items": items,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {OUT} ({len(items)} items)")


if __name__ == "__main__":
    main()

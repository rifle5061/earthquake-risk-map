#!/usr/bin/env python3
"""P2P地震情報 APIから最新地震データを取得してサイト用JSONへ変換する。

使い方:
  python scripts/update_earthquake_data.py
  python scripts/update_earthquake_data.py --limit 100 --output data/latest-earthquakes.json

出力形式は app.js が読み込む以下の形:
{
  "source": "P2P地震情報 JSON API v2",
  "endpoint": "https://api.p2pquake.net/v2/history?codes=551&limit=100",
  "fetched_at": "2026-06-09T12:00:00+09:00",
  "updated_at": "2026-06-09T11:58:00+09:00",
  "count": 10,
  "earthquakes": [
    {"time":"...+09:00", "lat":38.2, "lon":142.3, "mag":4.7, "depth":40, "intensity":3, "area":"宮城県沖"}
  ]
}

注意:
- このスクリプトは地震の発生を予知するものではありません。
- P2P地震情報 API のレート制限に配慮し、GitHub Actionsでは数分〜数十分間隔程度での実行を想定します。
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Iterable

JST = timezone(timedelta(hours=9))
DEFAULT_BASE_URL = "https://api.p2pquake.net/v2"
DEFAULT_OUTPUT = Path("data/latest-earthquakes.json")

# app.js 側の概略ゾーンと合わせた簡易分類。精密な判定は後でGeoJSON化する。
ZONES = [
    {"id": "hokkaido_east", "name": "北海道東方沖", "lat": 43.7, "lon": 146.0},
    {"id": "tohoku_offshore", "name": "東北沖・日本海溝", "lat": 38.2, "lon": 143.2},
    {"id": "noto", "name": "能登半島周辺", "lat": 37.3, "lon": 137.1},
    {"id": "kanto_south", "name": "関東南方・相模トラフ", "lat": 34.9, "lon": 139.7},
    {"id": "nankai", "name": "南海トラフ周辺", "lat": 32.9, "lon": 134.7},
    {"id": "kyushu", "name": "九州・日向灘周辺", "lat": 31.8, "lon": 131.7},
    {"id": "inland", "name": "内陸直下型注意エリア", "lat": 36.0, "lon": 138.0},
]

SCALE_TO_INTENSITY = {
    -1: None,
    0: 0,
    10: 1,
    20: 2,
    30: 3,
    40: 4,
    45: 5,  # 震度5弱。画面上は数値5扱い。
    50: 5,  # 震度5強。
    55: 6,  # 震度6弱。
    60: 6,  # 震度6強。
    70: 7,
}

SCALE_LABELS = {
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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="P2P地震情報APIから最新地震データを取得します。")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="API base URL。通常は変更不要。")
    parser.add_argument("--limit", type=int, default=100, help="取得件数。1〜100。")
    parser.add_argument("--offset", type=int, default=0, help="読み飛ばす件数。")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="出力JSONパス。")
    parser.add_argument("--timeout", type=int, default=20, help="HTTPタイムアウト秒数。")
    parser.add_argument("--retries", type=int, default=2, help="失敗時のリトライ回数。")
    parser.add_argument("--pretty", action="store_true", help="JSONを整形して保存します。")
    return parser.parse_args()


def build_history_url(base_url: str, limit: int, offset: int) -> str:
    limit = max(1, min(100, limit))
    query = urllib.parse.urlencode({"codes": 551, "limit": limit, "offset": max(0, offset)})
    return f"{base_url.rstrip('/')}/history?{query}"


def fetch_json(url: str, timeout: int, retries: int) -> Any:
    last_error: Exception | None = None
    headers = {
        "User-Agent": "earthquake-risk-map/0.1 (+https://github.com/rifle5061/earthquake-risk-map)",
        "Accept": "application/json",
    }
    request = urllib.request.Request(url, headers=headers)

    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                charset = response.headers.get_content_charset() or "utf-8"
                return json.loads(response.read().decode(charset))
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(1.5 * (attempt + 1))

    raise RuntimeError(f"API取得に失敗しました: {last_error}")


def to_iso_jst(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip()
    # P2P APIは "YYYY/MM/DD HH:MM:SS" またはミリ秒付き。
    for fmt in ("%Y/%m/%d %H:%M:%S.%f", "%Y/%m/%d %H:%M:%S"):
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=JST).isoformat()
        except ValueError:
            pass
    # 既にISOに近い場合の保険。
    try:
        return datetime.fromisoformat(value).astimezone(JST).isoformat()
    except ValueError:
        return None


def safe_float(value: Any) -> float | None:
    if value in (None, "", "不明"):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def safe_int(value: Any) -> int | None:
    if value in (None, "", "不明"):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def scale_to_intensity(scale: Any) -> int:
    raw = safe_int(scale)
    if raw is None:
        return 0
    return SCALE_TO_INTENSITY.get(raw, 0) or 0


def scale_label(scale: Any) -> str:
    raw = safe_int(scale)
    if raw is None:
        return "不明"
    return SCALE_LABELS.get(raw, str(raw))


def distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    import math

    r = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def nearest_zone_hint(lat: float | None, lon: float | None) -> str | None:
    if lat is None or lon is None:
        return None
    nearest = min(ZONES, key=lambda z: distance_km(lat, lon, z["lat"], z["lon"]))
    return nearest["id"]


def normalize_quake(item: dict[str, Any]) -> dict[str, Any] | None:
    if item.get("code") != 551:
        return None

    earthquake = item.get("earthquake") or {}
    hypocenter = earthquake.get("hypocenter") or {}

    lat = safe_float(hypocenter.get("latitude"))
    lon = safe_float(hypocenter.get("longitude"))
    mag = safe_float(hypocenter.get("magnitude"))
    depth = safe_int(hypocenter.get("depth"))
    scale = earthquake.get("maxScale")
    occurred_at = to_iso_jst(earthquake.get("time")) or to_iso_jst(item.get("time"))

    # 震源・震度速報など、震央やMがない情報は地図に置けないので除外。
    if occurred_at is None or lat is None or lon is None or mag is None:
        return None

    area = hypocenter.get("name") or "震源地不明"
    quake = {
        "id": item.get("id"),
        "time": occurred_at,
        "lat": lat,
        "lon": lon,
        "mag": mag,
        "depth": depth if depth is not None else 0,
        "intensity": scale_to_intensity(scale),
        "intensityLabel": scale_label(scale),
        "area": area,
        "zoneHint": nearest_zone_hint(lat, lon),
        "issueType": (item.get("issue") or {}).get("type"),
        "domesticTsunami": earthquake.get("domesticTsunami"),
        "foreignTsunami": earthquake.get("foreignTsunami"),
        "source": "P2P地震情報/気象庁",
    }
    return quake


def dedupe_quakes(quakes: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    # 同じ地震が「震源に関する情報」「震度・震源に関する情報」「各地の震度」などで複数来ることがあるため、
    # 時刻・震央・M・座標で重複をまとめる。後から来た詳細情報の震度が大きければ反映。
    merged: dict[tuple[Any, ...], dict[str, Any]] = {}
    for q in quakes:
        key = (
            q.get("time"),
            round(float(q.get("lat", 0)), 2),
            round(float(q.get("lon", 0)), 2),
            q.get("area"),
            round(float(q.get("mag", 0)), 1),
        )
        existing = merged.get(key)
        if existing is None:
            merged[key] = q
            continue
        if q.get("intensity", 0) > existing.get("intensity", 0):
            existing["intensity"] = q.get("intensity", 0)
            existing["intensityLabel"] = q.get("intensityLabel", existing.get("intensityLabel"))
    return sorted(merged.values(), key=lambda q: q["time"], reverse=True)


def build_output(raw_items: list[dict[str, Any]], endpoint: str) -> dict[str, Any]:
    quakes = dedupe_quakes(q for item in raw_items if (q := normalize_quake(item)) is not None)
    now = datetime.now(JST).isoformat(timespec="seconds")
    latest_time = quakes[0]["time"] if quakes else now
    return {
        "source": "P2P地震情報 JSON API v2 /history codes=551",
        "endpoint": endpoint,
        "fetched_at": now,
        "updated_at": latest_time,
        "count": len(quakes),
        "earthquakes": quakes,
        "notice": "このデータは地震予知ではなく、公開地震情報の表示用です。",
    }


def main() -> int:
    args = parse_args()
    url = build_history_url(args.base_url, args.limit, args.offset)
    try:
        raw = fetch_json(url, timeout=args.timeout, retries=args.retries)
        if not isinstance(raw, list):
            raise RuntimeError("APIレスポンスが配列ではありません。")
        output = build_output(raw, endpoint=url)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    args.output.parent.mkdir(parents=True, exist_ok=True)
    indent = 2 if args.pretty else None
    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=indent), encoding="utf-8")
    print(f"saved: {args.output} ({output['count']} earthquakes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

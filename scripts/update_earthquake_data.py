#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
地震危険度マップ用：地震データ自動更新スクリプト v3

出力：
- data/latest-earthquakes.json  : 地震一覧フルデータ
- data/earthquake-status.json   : 確認用の短いステータス
"""

from __future__ import annotations

import argparse
import json
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
FULL_OUT = DATA_DIR / "latest-earthquakes.json"
STATUS_OUT = DATA_DIR / "earthquake-status.json"

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
            "User-Agent": "earthquake-risk-map/1.0 (+https://github.com/rifle5061)",
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


def normalize_item(raw: dict[str, Any]) -> dict[str, Any]:
    eq = raw.get("earthquake") or {}
    hypo = eq.get("hypocenter") or {}

    area = hypo.get("name") or "不明"
    lat = as_float(hypo.get("latitude"))
    lon = as_float(hypo.get("longitude"))
    mag = as_float(hypo.get("magnitude"))
    depth = as_int(hypo.get("depth"))
    max_scale = as_int(eq.get("maxScale"), -1)

    return {
        "id": raw.get("id") or f"{eq.get('time','')}-{area}",
        "code": raw.get("code"),
        "time": eq.get("time") or raw.get("time"),
        "received_at": raw.get("time"),
        "area": area,
        "lat": lat,
        "lon": lon,
        "magnitude": mag,
        "mag": mag,
        "depth": depth,
        "maxScale": max_scale,
        "intensityLabel": intensity_label(max_scale),
        "domesticTsunami": eq.get("domesticTsunami", "Unknown"),
        "foreignTsunami": eq.get("foreignTsunami", "Unknown"),
        "source": "P2P地震情報",
        "map": isinstance(lat, float) and isinstance(lon, float),
    }


def make_status(items: list[dict[str, Any]], fetched_at: str) -> dict[str, Any]:
    latest = items[0] if items else None

    return {
        "status": "ok" if items else "empty",
        "fetched_at": fetched_at,
        "count": len(items),
        "latest": {
            "time": latest.get("time"),
            "area": latest.get("area"),
            "magnitude": latest.get("magnitude"),
            "depth": latest.get("depth"),
            "maxScale": latest.get("maxScale"),
            "intensityLabel": latest.get("intensityLabel"),
            "domesticTsunami": latest.get("domesticTsunami"),
        } if latest else None,
        "check": "このファイルは確認用です。フルデータは data/latest-earthquakes.json を確認してください。",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pretty", action="store_true", help="pretty print JSON")
    args = parser.parse_args()

    raw_data = fetch_json(ENDPOINT)
    if not isinstance(raw_data, list):
        raise ValueError("P2P response is not a list")

    items = [normalize_item(raw) for raw in raw_data]
    fetched_at = now_jst_iso()

    full = {
        "source": "P2P地震情報 JSON API v2 / 履歴コード551",
        "endpoint": ENDPOINT,
        "fetched_at": fetched_at,
        "updated_at": items[0]["time"] if items else None,
        "count": len(items),
        "items": items,
    }

    status = make_status(items, fetched_at)

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if args.pretty:
        FULL_OUT.write_text(json.dumps(full, ensure_ascii=False, indent=2), encoding="utf-8")
        STATUS_OUT.write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding="utf-8")
    else:
        FULL_OUT.write_text(json.dumps(full, ensure_ascii=False), encoding="utf-8")
        STATUS_OUT.write_text(json.dumps(status, ensure_ascii=False), encoding="utf-8")

    print(f"saved: {FULL_OUT} ({len(items)} earthquakes)")
    print(f"saved: {STATUS_OUT}")
    if items:
        latest = items[0]
        print(f"latest: {latest.get('time')} {latest.get('area')} M{latest.get('magnitude')} 最大震度{latest.get('intensityLabel')}")


if __name__ == "__main__":
    main()

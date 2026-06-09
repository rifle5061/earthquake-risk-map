#!/usr/bin/env python3
"""P2P地震情報APIから津波警報・注意報データを取得してサイト用JSONへ変換する。

出力: data/latest-tsunami.json

注意:
- このスクリプトは津波を予測するものではありません。
- 公式に発表された津波警報・注意報・予報の表示用データを作るためのものです。
- APIレスポンス構造の変化に備えて、複数形式を緩く解析します。
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
from typing import Any

JST = timezone(timedelta(hours=9))
ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "data" / "latest-tsunami.json"
DEFAULT_BASE_URL = "https://api.p2pquake.net/v2"

TSUNAMI_CODE = 552

LEVEL_KEYWORDS = [
    ("major", ["大津波警報"]),
    ("warning", ["津波警報"]),
    ("advisory", ["津波注意報"]),
    ("forecast", ["津波予報", "若干の海面変動"]),
    ("none", ["解除", "津波なし", "なし"]),
]


def now_iso() -> str:
    return datetime.now(JST).replace(microsecond=0).isoformat()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="P2P地震情報APIから津波情報を取得します。")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--timeout", type=int, default=20)
    parser.add_argument("--retries", type=int, default=2)
    parser.add_argument("--pretty", action="store_true")
    return parser.parse_args()


def build_url(base_url: str, limit: int) -> str:
    query = urllib.parse.urlencode({"codes": TSUNAMI_CODE, "limit": max(1, min(100, limit))})
    return f"{base_url.rstrip('/')}/history?{query}"


def fetch_json(url: str, timeout: int, retries: int) -> Any:
    headers = {
        "User-Agent": "earthquake-risk-map/0.1 (+https://github.com/rifle5061/earthquake-risk-map)",
        "Accept": "application/json",
    }
    req = urllib.request.Request(url, headers=headers)
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                charset = response.headers.get_content_charset() or "utf-8"
                return json.loads(response.read().decode(charset))
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"API取得に失敗しました: {last_error}")


def to_iso_jst(value: Any) -> str | None:
    if not value:
        return None
    value = str(value).strip()
    for fmt in ("%Y/%m/%d %H:%M:%S.%f", "%Y/%m/%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S%z"):
        try:
            dt = datetime.strptime(value, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=JST)
            return dt.astimezone(JST).replace(microsecond=0).isoformat()
        except ValueError:
            pass
    try:
        return datetime.fromisoformat(value).astimezone(JST).replace(microsecond=0).isoformat()
    except Exception:
        return None


def normalize_level(text: Any) -> str:
    s = str(text or "")
    for level, words in LEVEL_KEYWORDS:
        if any(w in s for w in words):
            return level
    return "none"


def is_active_level(level: str) -> bool:
    return level in {"major", "warning", "advisory", "forecast"}


def find_text(obj: Any, keys: tuple[str, ...]) -> str | None:
    if not isinstance(obj, dict):
        return None
    for key in keys:
        value = obj.get(key)
        if value not in (None, ""):
            return str(value)
    return None


def walk_dicts(obj: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    if isinstance(obj, dict):
        out.append(obj)
        for value in obj.values():
            out.extend(walk_dicts(value))
    elif isinstance(obj, list):
        for value in obj:
            out.extend(walk_dicts(value))
    return out


def extract_alerts(report: dict[str, Any]) -> list[dict[str, Any]]:
    alerts: list[dict[str, Any]] = []
    issue_time = to_iso_jst(report.get("time")) or now_iso()

    for d in walk_dicts(report):
        area = find_text(d, ("area", "name", "areaName", "forecastArea", "forecast_area"))
        status = find_text(d, ("status", "kind", "category", "warning", "warningType", "type", "name"))
        # P2PやXML変換由来の階層では Kind.Name / Category.Kind.Name のように名前だけが来ることがある。
        level = normalize_level(" ".join(str(x) for x in [status, d.get("code"), d.get("kindCode")] if x))
        if not area or not is_active_level(level):
            continue

        height = find_text(d, ("height", "maxHeight", "max_height", "firstHeight", "first_height")) or "不明"
        arrival = find_text(d, ("arrival", "arrivalTime", "arrival_time", "firstHeightArrivalTime", "first_height_arrival_time")) or "不明"
        alert = {
            "area": area,
            "status": status or level,
            "level": level,
            "height": height,
            "arrival": arrival,
            "issued_at": issue_time,
            "keywords": [area],
        }
        # 似た形式の重複を削る
        key = (alert["area"], alert["level"], alert["height"], alert["arrival"])
        if key not in {(a["area"], a["level"], a["height"], a["arrival"]) for a in alerts}:
            alerts.append(alert)

    return alerts


def normalize_payload(items: Any, endpoint: str) -> dict[str, Any]:
    if not isinstance(items, list):
        items = []
    reports = [item for item in items if isinstance(item, dict) and item.get("code") in (None, TSUNAMI_CODE)]
    alerts: list[dict[str, Any]] = []
    updated_at = None
    latest_report_id = None

    for report in reports:
        report_alerts = extract_alerts(report)
        if report_alerts:
            alerts.extend(report_alerts)
            updated_at = to_iso_jst(report.get("time")) or updated_at
            latest_report_id = report.get("id") or latest_report_id
            break

    # area + level の重複を除外
    deduped: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for alert in alerts:
        key = (alert["area"], alert["level"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(alert)

    return {
        "source": "P2P地震情報/気象庁",
        "endpoint": endpoint,
        "fetched_at": now_iso(),
        "updated_at": updated_at,
        "latest_report_id": latest_report_id,
        "active": any(is_active_level(a.get("level", "")) for a in deduped),
        "alerts": deduped,
        "note": "津波警報・注意報・予報がある場合のみalertsに表示対象が入ります。避難判断は必ず気象庁・自治体の公式情報を確認してください。",
    }


def main() -> int:
    args = parse_args()
    url = build_url(args.base_url, args.limit)
    args.output.parent.mkdir(parents=True, exist_ok=True)

    try:
        items = fetch_json(url, args.timeout, args.retries)
        payload = normalize_payload(items, url)
    except Exception as exc:
        print(f"ERROR: tsunami data update failed: {exc}", file=sys.stderr)
        payload = {
            "source": "P2P地震情報/気象庁",
            "endpoint": url,
            "fetched_at": now_iso(),
            "updated_at": None,
            "active": False,
            "alerts": [],
            "error": str(exc),
            "note": "取得失敗時は安全側として発表なし表示にします。公式情報を確認してください。",
        }

    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2 if args.pretty else None) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {args.output} alerts={len(payload.get('alerts', []))} active={payload.get('active')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""地震関連ニュースJSONを生成するスクリプト。

基本方針:
- data/latest-earthquakes.json があれば、位置情報つきの「地震情報ニュース」を作る
- Google News RSSから地震・防災関連ニュースのリンクを取得する
- 一般ニュースは地域名辞書で可能な範囲だけlat/lonを付与してズーム対応する
"""
from __future__ import annotations

import argparse
import email.utils
import json
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
LATEST_QUAKES_PATH = ROOT / "data" / "latest-earthquakes.json"
OUT_PATH = ROOT / "data" / "earthquake-news.json"
AREA_DICT_PATH = ROOT / "data" / "area-dictionary.json"
JST = timezone(timedelta(hours=9))

KEYWORDS = [
    "地震", "震度", "津波", "余震", "防災", "避難", "南海トラフ", "日本海溝", "千島海溝", "能登半島"
]


def now_iso() -> str:
    return datetime.now(JST).replace(microsecond=0).isoformat()


def parse_time(value: str | None) -> str | None:
    if not value:
        return None
    try:
        dt = email.utils.parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(JST).replace(microsecond=0).isoformat()
    except Exception:
        return value


def load_latest_quakes(limit: int = 8) -> list[dict[str, Any]]:
    if not LATEST_QUAKES_PATH.exists():
        return []

    try:
        payload = json.loads(LATEST_QUAKES_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"WARN: latest-earthquakes.json read failed: {exc}", file=sys.stderr)
        return []

    quakes = payload.get("earthquakes", payload if isinstance(payload, list) else [])
    if not isinstance(quakes, list):
        return []

    def sort_key(q: dict[str, Any]) -> str:
        return str(q.get("time") or "")

    items: list[dict[str, Any]] = []
    for q in sorted(quakes, key=sort_key, reverse=True)[:limit]:
        try:
            mag = float(q.get("mag", q.get("magnitude", 0)) or 0)
            lat = float(q.get("lat"))
            lon = float(q.get("lon"))
        except Exception:
            continue

        area = str(q.get("area") or q.get("hypocenter") or "震源地不明")
        intensity = q.get("intensityLabel", q.get("intensity", "-"))
        depth = q.get("depth", "-")
        items.append({
            "title": f"【地震情報】{area} M{mag:.1f} 最大震度{intensity}",
            "source": "地震情報",
            "time": q.get("time"),
            "type": "earthquake",
            "area": area,
            "summary": f"震源の深さ {depth}km。クリックで震源付近へ移動します。",
            "lat": lat,
            "lon": lon,
            "zoom": 7 if mag >= 6 else 8,
            "zoomable": True,
            "zoomSource": "exact",
        })
    return items



def load_area_dictionary() -> list[dict[str, Any]]:
    if not AREA_DICT_PATH.exists():
        return []
    try:
        payload = json.loads(AREA_DICT_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"WARN: area-dictionary.json read failed: {exc}", file=sys.stderr)
        return []

    entries = payload.get("areas", payload if isinstance(payload, list) else [])
    if not isinstance(entries, list):
        return []

    normalized: list[dict[str, Any]] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        keywords = entry.get("keywords") or [entry.get("name")]
        if not isinstance(keywords, list):
            keywords = [str(keywords)]
        try:
            lat = float(entry.get("lat"))
            lon = float(entry.get("lon"))
        except Exception:
            continue
        keywords = [str(k) for k in keywords if k]
        if not keywords:
            continue
        priority = float(entry.get("priority") or max(len(k) for k in keywords))
        normalized.append({
            "name": str(entry.get("name") or keywords[0]),
            "keywords": keywords,
            "lat": lat,
            "lon": lon,
            "zoom": int(entry.get("zoom") or 7),
            "priority": priority,
        })
    normalized.sort(key=lambda x: x["priority"], reverse=True)
    return normalized


def apply_area_dictionary(item: dict[str, Any], dictionary: list[dict[str, Any]]) -> dict[str, Any]:
    if item.get("lat") is not None and item.get("lon") is not None:
        item["zoomable"] = True
        item["zoomSource"] = "exact"
        return item

    haystack = " ".join(str(item.get(k) or "") for k in ["title", "area", "summary", "source"])
    for area in dictionary:
        if any(keyword in haystack for keyword in area["keywords"]):
            item["lat"] = area["lat"]
            item["lon"] = area["lon"]
            item["zoom"] = area["zoom"]
            item["area"] = item.get("area") or area["name"]
            item["matchedArea"] = area["name"]
            item["zoomable"] = True
            item["zoomSource"] = "dictionary"
            if item.get("summary"):
                item["summary"] = str(item["summary"]).replace("位置情報辞書を追加するまではリンク表示のみです。", "地域名辞書により推定エリアへズームできます。")
            else:
                item["summary"] = "地域名辞書により推定エリアへズームできます。"
            return item

    item["zoomable"] = False
    item["zoomSource"] = "none"
    return item

def fetch_google_news(limit: int = 8) -> list[dict[str, Any]]:
    query = " OR ".join(KEYWORDS)
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode({
        "q": f"({query}) when:7d",
        "hl": "ja",
        "gl": "JP",
        "ceid": "JP:ja",
    })

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 earthquake-risk-map/1.0"},
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            xml_bytes = res.read()
    except Exception as exc:
        print(f"WARN: Google News RSS fetch failed: {exc}", file=sys.stderr)
        return []

    try:
        root = ET.fromstring(xml_bytes)
    except Exception as exc:
        print(f"WARN: RSS parse failed: {exc}", file=sys.stderr)
        return []

    items: list[dict[str, Any]] = []
    for item in root.findall("./channel/item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub = parse_time(item.findtext("pubDate"))
        source_node = item.find("source")
        source = source_node.text.strip() if source_node is not None and source_node.text else "Google News"

        if not title:
            continue
        if not any(k in title for k in KEYWORDS):
            continue

        items.append({
            "title": title,
            "source": source,
            "time": pub,
            "url": link,
            "type": "news",
            "area": "",
            "summary": "一般ニュースです。地域名辞書に該当する場合は推定エリアへズームできます。",
            "lat": None,
            "lon": None,
            "zoom": 6,
            "zoomable": False,
        })
        if len(items) >= limit:
            break
    return items


def dedupe(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for item in items:
        key = (item.get("title") or "").strip()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pretty", action="store_true", help="読みやすいJSONで保存")
    parser.add_argument("--no-rss", action="store_true", help="RSS取得をせず、地震情報だけでニュースJSONを作る")
    args = parser.parse_args()

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    dictionary = load_area_dictionary()

    items = load_latest_quakes(limit=8)
    if not args.no_rss:
        items.extend(fetch_google_news(limit=8))

    items = [apply_area_dictionary(item, dictionary) for item in items]

    payload = {
        "updated_at": now_iso(),
        "note": "位置情報つきの項目はクリックで地図ズーム可能。一般ニュースは地域名辞書で推定エリアにズームします。",
        "news": dedupe(items)[:16],
    }

    if not payload["news"]:
        payload["news"] = [{
            "title": "地震関連ニュースを取得できませんでした",
            "source": "system",
            "time": now_iso(),
            "type": "system",
            "summary": "次回の自動更新で再取得します。",
            "lat": None,
            "lon": None,
            "zoomable": False,
        }]

    OUT_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2 if args.pretty else None),
        encoding="utf-8",
    )
    print(f"wrote {OUT_PATH} ({len(payload['news'])} items)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

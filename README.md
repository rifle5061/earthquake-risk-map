# 地震危険度マップ β版

日本周辺の直近地震・地震関連ニュース・プレート/海溝エリア・津波警報/注意報レイヤーを表示する防災リスク可視化サイトです。

## 追加機能

- 地震データ自動更新: `scripts/update_earthquake_data.py`
- 地震関連ニュース自動更新: `scripts/update_earthquake_news.py`
- 津波警報/注意報レイヤー: `scripts/update_tsunami_data.py`
- 沿岸部GeoJSON: `data/tsunami-zones.geojson`
- 防災用品広告: 横スクロール式カルーセル、カテゴリ切替対応

## GitHub Actions

以下の3つを `.github/workflows/` に置きます。

- `update-earthquake.yml`
- `update-earthquake-news.yml`
- `update-tsunami.yml`

## 注意

このサイトは地震の発生日・場所・規模を予測または断定するものではありません。公開情報をもとに防災上の注意度を整理するβ版です。津波警報・注意報が表示された場合でも、避難判断は必ず気象庁・自治体・防災機関の公式情報を確認してください。

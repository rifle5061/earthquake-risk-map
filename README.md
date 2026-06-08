# 地震危険度マップ β版

日本地図上に、直近地震・プレート/海溝・危険度エリア・地震関連ニュースを表示する防災リスク可視化サイトです。

## 今回の追加

- 地震関連ニュース欄
- ニュースクリックで地図ズーム
- 地域名辞書による推定ズーム
- 防災リュック/非常食広告HTMLの差し込み
- ポータブル電源広告枠
- GitHub Actionsによる地震データ/ニュース自動更新

## ファイル構成

```text
index.html
style.css
app.js
data/
  area-dictionary.json
  earthquake-news.json
scripts/
  update_earthquake_data.py
  update_earthquake_news.py
.github/workflows/
  update-earthquake.yml
  update-earthquake-news.yml
```

## 地域名辞書

`data/area-dictionary.json` に、ニュースタイトルや概要から推定する地域名・座標・ズーム値を入れています。

例：

```json
{ "name": "南海トラフ", "keywords": ["南海トラフ"], "lat": 32.8, "lon": 136.2, "zoom": 6 }
```

## 自動更新

GitHub Actionsで以下を実行します。

- `Update earthquake data`：15分ごとに地震情報を更新
- `Update earthquake news`：30分ごとにニュースJSONを更新

## 注意

このサイトは地震の発生日・場所・規模を断定するものではありません。公開データから防災上の注意度を整理するβ版です。


## 更新メモ
- 地域名辞書によるニュースクリックズーム対応
- 防災リュック・非常食・ポータブル電源広告HTML反映済み

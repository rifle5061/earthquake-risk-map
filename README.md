# 地震危険度マップ v1

日本地図にプレート・海溝ライン、地震発生地点、期間切替、危険度カードを表示するMVPです。

## 内容

- `index.html`：画面本体
- `style.css`：デザイン
- `app.js`：地図・期間切替・地震データ読込・リスク計算
- `scripts/update_earthquake_data.py`：P2P地震情報APIから最新地震データを取得し、`data/latest-earthquakes.json` を生成

## 現在の仕様

- `data/latest-earthquakes.json` が存在する場合は、そのAPI取得データを表示します。
- `data/latest-earthquakes.json` が存在しない場合や読み込みに失敗した場合は、`app.js` 内のサンプルデータで表示します。
- プレート/海溝ラインは概略です。
- リスクスコアはβ版の仮計算です。
- 地震の発生日・場所・規模を予測するものではありません。

## P2P地震情報APIデータ取得

Python標準ライブラリだけで動きます。

```bash
python scripts/update_earthquake_data.py --pretty
```

出力先はデフォルトで以下です。

```text
data/latest-earthquakes.json
```

取得件数を変える場合：

```bash
python scripts/update_earthquake_data.py --limit 100 --pretty
```

使用API：

```text
https://api.p2pquake.net/v2/history?codes=551&limit=100
```

`codes=551` は気象庁の地震情報です。取得したデータは、サイト側が使いやすいように以下へ正規化します。

```json
{
  "time": "2026-06-09T11:58:00+09:00",
  "lat": 38.2,
  "lon": 142.3,
  "mag": 4.7,
  "depth": 40,
  "intensity": 3,
  "intensityLabel": "3",
  "area": "宮城県沖"
}
```

## 次にやること

1. GitHub Actionsで自動更新
2. プレート境界/海溝エリアをGeoJSON化
3. 期間別のJSON分割、または1年分・全期間用データの別管理
4. J-SHISなどの長期ハザードデータを追加
5. 防災リュック・非常食・ポータブル電源の広告HTMLを実装

## GitHub Pages公開

このフォルダの中身をリポジトリに置き、GitHub Pagesを有効化すると公開できます。

GitHub Pages上では、定期取得済みの `data/latest-earthquakes.json` を `app.js` が読み込んで表示します。

# scratch3-tello

Scratch 3.0でTelloドローンを操作できるようにする拡張機能つきアプリです。

## リリース

### 使い方

1. バイナリをダウンロードします。
2. TelloのWi-Fiに接続します。
3. アプリを起動します。
4. Tello拡張機能を有効化します。

**注意:**

- Telloへの接続がうまくいかない場合は、アプリを終了し、Telloを再起動してからアプリを起動し直してください。
- アプリを起動する前にTelloへ接続してください。アプリ起動後にTelloへ接続すると、拡張機能からTelloへコマンドを送信できなくなります。
- `takeoff`コマンドを送信してもドローンが離陸しない場合は、`clear command queue`ブロックを使用してください。

## 対応言語

- English
- 日本語
- にほんご
- Ру́сский (Thanks to [@cirodil](https://github.com/cirodil))
- Français (Thanks to Ryan Perry)
- Deutsch (Thanks to [@DiWoWet](https://github.com/DiWoWet))
- Български (Thanks to [@aladzhov](https://github.com/aladzhov))
- 繁體中文 (Thanks to James Huang)
- Italian (Thank to [@Haldosax](https://github.com/Haldosax))
- Latvian (Thank to [@berserks03](https://github.com/berserks03))
- Українська (Thanks to [@MaxVolobuev](https://github.com/MaxVolobuev))
- Português do Brasil (Thanks to [@matheusyanr](https://github.com/matheusyanr))

対応言語を追加するプルリクエストを歓迎します。

## 前提条件

ビルドには[Git](https://git-scm.com/)と[mise](https://mise.jdx.dev/)（Node.jsのバージョン管理ツール）が必要です。本リポジトリの[mise.toml](mise.toml)でNode.js 16.20.2を使用するよう指定しています。

### macOS

- Git（`brew install git`などで導入できます）
- mise（`brew install mise`などで導入できます）

### Windows

- [Git for Windows](https://gitforwindows.org/)（Git Bashを含みます。以下のビルド手順はGit Bash上で実行してください）
- [mise](https://mise.jdx.dev/)（Windows版のインストーラーを利用してください）

## ビルド方法

Git Bash（Windows）またはターミナル（macOS）で以下を実行します。

```bash
mkdir scratch3-tello
cd scratch3-tello
mise use node@16.20.2
curl -fsSLo build.sh https://raw.githubusercontent.com/naoji3x/scratch3-tello/master/build.sh
chmod +x build.sh
./build.sh
```

## 起動方法

```bash
cd scratch-desktop
npm start
```

Tello拡張機能の読み込みに失敗する場合は、`scratch-vm`・`scratch-gui`・`scratch-desktop`ディレクトリを削除したうえで、`build.sh`をもう一度実行してください。

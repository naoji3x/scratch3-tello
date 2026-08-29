#!/bin/bash
set -eu

git clone --depth 1 -b 0.2.0-prerelease.20220222132735 https://github.com/scratchfoundation/scratch-vm.git
git clone --depth 1 -b scratch-desktop-v3.29.0 https://github.com/scratchfoundation/scratch-gui.git
git clone --depth 1 -b v3.29.1 https://github.com/scratchfoundation/scratch-desktop.git

rm -rf scratch-vm/.git scratch-gui/.git scratch-desktop/.git

# scratch3-tello本体は--depth 1にせず、履歴を保持したままトップレベルへ展開する。
# これにより、build.shを実行した端末上でそのまま開発・コミット・pushができる。
# npm installより前に上書きすることで、Tello拡張が追加した依存関係
# (ffmpeg-static, pngjsなど)がnpm installで確実にインストールされるようにする。
git clone https://github.com/naoji3x/scratch3-tello
cp -r scratch3-tello/. ./
rm -rf scratch3-tello/

cd scratch-vm
npm install --legacy-peer-deps
npm link
cd ..

cd scratch-gui
npm install --legacy-peer-deps
npm link scratch-vm --legacy-peer-deps
npm link
cd ..

cd scratch-desktop
npm install --legacy-peer-deps
cd node_modules
rm -rf scratch-gui
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    # symlinkは管理者権限/開発者モードが必要なため、権限不要なジャンクションを使う
    # MSYS_NO_PATHCONVがないとGit Bashのパス自動変換で/Jオプションが壊れてmklinkが失敗する
    MSYS_NO_PATHCONV=1 cmd //c mklink /J scratch-gui "$(cd ../../scratch-gui && pwd -W)"
    ;;
  *)
    ln -s ../../scratch-gui scratch-gui
    ;;
esac
cd ../../

#!/bin/bash
set -eu

git clone --depth 1 -b 0.2.0-prerelease.20220222132735 https://github.com/scratchfoundation/scratch-vm.git
git clone --depth 1 -b scratch-desktop-v3.29.0 https://github.com/scratchfoundation/scratch-gui.git
git clone --depth 1 -b v3.29.1 https://github.com/scratchfoundation/scratch-desktop.git

rm -rf scratch-vm/.git scratch-gui/.git scratch-desktop/.git

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
ln -s ../../scratch-gui scratch-gui
cd ../../

git clone --depth 1 https://github.com/naoji3x/scratch3-tello
cp -r scratch3-tello/. ./
rm -rf scratch3-tello/

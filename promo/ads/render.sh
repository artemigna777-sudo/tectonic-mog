#!/bin/sh
# Рендер ролика: sh promo/ads/render.sh 01-polinezija → promo/ads/mp4/geobot-ad-<id>.mp4 (и копия без звука).
# Музыка — promo/ads/music/plan.wav (не кладём в репозиторий); без неё ролик немой, звук выбирается в TikTok.
set -e
cd "$(dirname "$0")"
id="$1"
../node_modules/.bin/tsx -e "
import { writeVideo4 } from './engine4.ts';
import('./videos/v$id.ts').then((mod) => writeVideo4(Object.values(mod)[0]));
"
mkdir -p mp4
# без музыки — тишина той же длины, иначе HyperFrames откажется рендерить
[ -f "out/$id/music.wav" ] || ffmpeg -y -loglevel error -f lavfi -i anullsrc=r=44100:cl=stereo -t 20.067 "out/$id/music.wav"
(cd "out/$id" && npx -y hyperframes@0.8.119 render . --fps 30 --crf 20 --video-frame-format png -o raw.mp4 >/dev/null 2>&1)
ffmpeg -y -loglevel error -i "out/$id/raw.mp4" -c:v libx264 -preset slow -crf 23 -maxrate 9M -bufsize 18M -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 44100 -movflags +faststart "mp4/geobot-ad-$id.mp4"
ffmpeg -y -loglevel error -i "mp4/geobot-ad-$id.mp4" -c:v copy -an "mp4/geobot-ad-$id-bez-zvuka.mp4"
echo "mp4/geobot-ad-$id.mp4"

#!/bin/sh
# Рендер «живого» ролика: sh promo/ads/render6.sh 02-koordinaty → promo/ads/mp4/geobot-ad-<id>.mp4 (и без звука).
# Музыка — promo/ads/music/<id>.wav, если есть (в репозиторий не кладём); иначе ролик немой.
set -e
cd "$(dirname "$0")"
id="$1"
../node_modules/.bin/tsx -e "
import { writeVideo6 } from './engine6.ts';
import('./videos/v$id.ts').then((mod) => writeVideo6(Object.values(mod)[0]));
"
mkdir -p mp4
dur=$(cat "out/$id/duration.txt")
if [ -f "music/$id.wav" ]; then cp "music/$id.wav" "out/$id/music.wav"; else
  ffmpeg -y -loglevel error -f lavfi -i anullsrc=r=44100:cl=stereo -t "$dur" "out/$id/music.wav"; fi
(cd "out/$id" && npx -y hyperframes@0.8.119 render . --fps 30 --crf 20 --video-frame-format png -o raw.mp4 >/dev/null 2>&1)
ffmpeg -y -loglevel error -i "out/$id/raw.mp4" -c:v libx264 -preset slow -crf 23 -maxrate 9M -bufsize 18M -pix_fmt yuv420p \
  -af "loudnorm=I=-14:TP=-1:LRA=11" -c:a aac -b:a 192k -ar 44100 -movflags +faststart "mp4/geobot-ad-$id.mp4"
ffmpeg -y -loglevel error -i "mp4/geobot-ad-$id.mp4" -c:v copy -an "mp4/geobot-ad-$id-bez-zvuka.mp4"
echo "mp4/geobot-ad-$id.mp4"

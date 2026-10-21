#!/bin/sh
# Картинки профиля бота → promo/bot/out/: welcome.gif и welcome.png (640×360), avatar.png (640×640).
set -e
cd "$(dirname "$0")"
python3 build.py
mkdir -p out
(cd welcome && npx -y hyperframes@0.8.119 render . --fps 30 --crf 12 --video-frame-format png -o raw.mp4 >/dev/null 2>&1)
# 960×540 (самый большой размер, который принимает Telegram), 25 кадров/с, полная палитра без шумного сглаживания
ffmpeg -y -loglevel error -i welcome/raw.mp4 -vf "fps=25,scale=960:540:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle" -loop 0 out/welcome.gif
ffmpeg -y -loglevel error -i welcome/raw.mp4 -vf "fps=25,scale=640:360:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle" -loop 0 out/welcome-640.gif
(cd welcome && npx -y hyperframes@0.8.119 snapshot . --at 5.0 >/dev/null 2>&1)
ffmpeg -y -loglevel error -i welcome/snapshots/frame-00-at-5s.png -vf scale=960:540:flags=lanczos out/welcome.png
(cd avatar && npx -y hyperframes@0.8.119 snapshot . --at 0.5 >/dev/null 2>&1)
ffmpeg -y -loglevel error -i avatar/snapshots/frame-00-at-0.5s.png -vf scale=640:640:flags=lanczos out/avatar.png
ls -la out

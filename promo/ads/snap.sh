#!/bin/sh
# Снимки кадров для проверки: sh promo/ads/snap.sh 01-polinezija → out/<id>/snapshots/ (моменты — AT=1,5,9).
set -e
cd "$(dirname "$0")"
id="$1"
../node_modules/.bin/tsx -e "
import { writeVideo4 } from './engine4.ts';
import('./videos/v$id.ts').then((mod) => writeVideo4(Object.values(mod)[0]));
"
cd "out/$id" && npx -y hyperframes@0.8.119 snapshot . --at "${AT:-1,3.5,5.5,7.5,9.2,10.3,11,11.7,12.4,13.5,14.9,16.5,19}"

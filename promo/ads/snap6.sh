#!/bin/sh
# Снимки кадров «живого» ролика (engine6.ts): AT=1,5,9 sh promo/ads/snap6.sh 02-koordinaty
set -e
cd "$(dirname "$0")"
id="$1"
../node_modules/.bin/tsx -e "
import { writeVideo6 } from './engine6.ts';
import('./videos/v$id.ts').then((mod) => writeVideo6(Object.values(mod)[0]));
"
cd "out/$id" && npx -y hyperframes@0.8.119 snapshot . --at "${AT:-0.5,1.8,3,5,6.5,8,9.7,11.5,14.5,17.2,19,22,23.6,25,27,28.8,30.5,32,34}"

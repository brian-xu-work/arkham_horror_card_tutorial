#!/usr/bin/env bash
#
# Downloads the public-domain imagery used by the tutorial into assets/img/.
# Every source is Wikimedia Commons (PD / CC0 / CC-BY). See CREDITS.md.
#
# Usage:  ./scripts/fetch-assets.sh [--force]
#
set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/assets/img"
UA="arkham-tutorial/1.0 (educational static site; contact: local)"
FORCE="${1:-}"

mkdir -p "$DIR"

# name|url
MANIFEST="
hero.jpg|https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Arnold_B%C3%B6cklin_-_Die_Toteninsel_III_%28Alte_Nationalgalerie%2C_Berlin%29.jpg/1920px-Arnold_B%C3%B6cklin_-_Die_Toteninsel_III_%28Alte_Nationalgalerie%2C_Berlin%29.jpg
enemy-anemone.jpg|https://upload.wikimedia.org/wikipedia/commons/a/a9/Haeckel_Actiniae.jpg
enemy-jellyfish.jpg|https://upload.wikimedia.org/wikipedia/commons/d/de/Haeckel_Discomedusae_8.jpg
location-bank.jpg|https://upload.wikimedia.org/wikipedia/commons/9/9c/Islandora_21104-Citizens_Savings_Bank%2C_Providence%2C_Rhode_Island_OBJ.jpg
location-arsenal.jpg|https://upload.wikimedia.org/wikipedia/commons/e/eb/State_Arsenal%2C_Providence_Rhode_Island.jpg
setup-desk.jpg|https://upload.wikimedia.org/wikipedia/commons/e/e9/John_Goodnow%2C_half-length_portrait%2C_seated_at_desk_in_office_or_study%2C_facing_right_LCCN89709537.jpg
portrait-roland.jpg|https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Self-portrait_of_the_artist_as_a_young_man_by_Edward_Radford.jpg/1280px-Self-portrait_of_the_artist_as_a_young_man_by_Edward_Radford.jpg
portrait-daisy.jpg|https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Woman_with_a_Hat_%281920s%29%2C_by_Carlos_V%C3%A1zquez.jpg/1280px-Woman_with_a_Hat_%281920s%29%2C_by_Carlos_V%C3%A1zquez.jpg
portrait-agnes.jpg|https://upload.wikimedia.org/wikipedia/commons/2/29/Woman_from_Bretagne_by_B.Grigoriev_%281920s%29.jpg
portrait-wendy.jpg|https://upload.wikimedia.org/wikipedia/commons/5/54/Portrait_of_a_Woman%2C_by_Arnold_Blanch.jpg
"

ok=0
fail=0

printf '%s\n' "$MANIFEST" | while IFS='|' read -r name url; do
  [ -z "$name" ] && continue
  out="$DIR/$name"

  if [ -s "$out" ] && [ "$FORCE" != "--force" ]; then
    printf 'skip  %s (exists)\n' "$name"
    continue
  fi

  if curl -fsSL -A "$UA" --retry 2 --max-time 60 -o "$out" "$url"; then
    size=$(wc -c < "$out" | tr -d ' ')
    if [ "$size" -lt 5000 ]; then
      printf 'WARN  %s looks too small (%s bytes)\n' "$name" "$size"
      rm -f "$out"
    else
      printf 'ok    %s (%s bytes)\n' "$name" "$size"
    fi
  else
    printf 'FAIL  %s\n' "$name"
    rm -f "$out"
  fi
done

# Downscale + recompress for the web (macOS only; skipped elsewhere).
if command -v sips >/dev/null 2>&1; then
  for f in "$DIR"/*.jpg; do
    [ -e "$f" ] || continue
    sips -Z 1600 -s format jpeg -s formatOptions 80 "$f" >/dev/null 2>&1
  done
  printf 'optimized images with sips\n'
fi

printf '\nDone. Files in %s\n' "$DIR"

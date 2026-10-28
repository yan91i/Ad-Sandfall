# Sandfall - Saturated Trucks / Five Slots

## Run
Extract the complete archive and open index.html. No installation or network connection is required. Keep all relative asset paths. The interface remains English.

## Changes
- 24 separate directional truck sprites, six saturated hues with white trim, windows and tires. Runtime sprites have been hue-normalized to remove contrasting accent colors and dark tire surfaces.
- Corrected atlas slicing: side views use their actual wider bounds instead of equal-width cells. Transparent safety borders are retained.
- Sprite rendering uses aspect-ratio-preserving contain sizing, without cropping or stretching. Four independent views remain; no mirror-based directions.
- Five active dispatch slots, including trucks departing, queued, driving, or waiting to return. The sixth selection is rejected while all five are occupied.
- Loading is split into batches of up to 1,200 sand cells per truck. After a full batch leaves, a replacement truck appears at the original parking position if that truck still has assigned sand remaining. This allows slots to be released before every grain of a color has been collected. Dispatch order still matters and can block progress; Undo and Restart remain available.
- Existing 18 illustrated sand pictures, rapid concurrent selection, FIFO road entry, fast loading, cargo fill and percentage displays are retained.
- An unfilled truck waits one second after exiting left, then joins the right-side entry queue. Congested entry can add waiting time.

## Files
index.html / style.css / js/*.js / assets/vehicles/*.png / assets/art/*.png
assets/source/: original generated atlases; runtime sprites are the normalized files in assets/vehicles.
SPRITE_CHECK.json: dimensions and alpha bounds of all padded sprites.
FIVE_SLOT_TEST.json: current checks and limitations.
MANIFEST.sha256: file integrity hashes.

## Tests and Limitations
Chromium: five-slot cap and sixth-selection rejection verified; undo restoration passed; all 18 initial capacity-plus-reserve totals match sand totals; no page-level horizontal overflow at 320, 390, 768 and 1440 pixels; no script errors observed. Sprites were visually inspected in the game and checked for transparent safety borders.
The automated greedy dispatch test reached a blocked-order prompt rather than completing the level. A complete five-slot playthrough has not been verified. Not all levels or physical mobile browsers have been tested. This edition must not be described as fully balance-tested.

## Artwork
Vehicle and sand-art visuals generated with Microsoft Copilot. Sprite cropping, hue normalization, padding and rendering adjustments are included in this edition. This is a study reconstruction, not a direct original APK port.

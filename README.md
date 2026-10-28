# Sandfall - Balanced Loads / Mixed Parking

## Run
Extract the entire ZIP and open index.html. No installation, Python, build step or internet connection is required. Keep the js and assets folders in place. All game text remains English.

## This Update
- Increased the per-truck capacity limit from 480 to 900 sand cells. Actual capacities are balanced per color and can be below the limit.
- Reduced each level from 30-33 trucks to 18-20 trucks. All trucks remain visible at the start; there is no hidden replenishment.
- Replaced left/right-only rows with deterministic horizontal and vertical parking, using four possible exit directions and staggered positions. Not every level necessarily contains all four directions.
- Trucks block one another along their forward paths. Each layout is checked for a geometric removal sequence; no visual overlap was found in the 18 packaged layouts.
- Parking truck length is 49 game units before the existing 1.10 visual scale. All directions preserve the same physical dimensions.
- Five active slots, refined single-hue-and-white top-down truck art, rapid concurrent dispatch, FIFO road entry, fast loading, progressive cargo fill, percentages, gravity sand, undo, hints, restart, pause and sound are retained.
- The road remains horizontal. Unfilled trucks exit left, wait one simulation second, then join the right-side queue. Congestion can add entry waiting time. Full trucks leave permanently.

## Included Files
index.html / style.css / js/art.js / js/game.js
assets/vehicles/: 24 refined directional truck sprites.
assets/art/: 18 sand-art thumbnails.
assets/source/: original generated artwork atlases.
TEST_REPORT.json: actual browser checks for this edition.
MANIFEST.sha256: file hashes.

## Verification and Limitations
Chromium checks passed for all 18 levels: capacity conservation, capacities no greater than 900, horizontal/vertical orientation mix, zero visual overlaps, and a geometric parking removal sequence. Blocked selection rejection, legal dispatch, undo restoration and responsive widths 320/390/768/1440 passed. No browser script errors were observed.
Geometric removability does NOT prove full sand-loading solvability with five active slots. Complete playthrough and difficulty balance have not been verified. Wrong dispatch choices can occupy all slots; use Undo or Restart. Physical phones and Safari have not been tested.

## Scope
This is the rebuilt 18-picture project, not a restoration of the earlier 40 reference-video drafts or their editor. Parking layouts are newly generated and are not original-video replicas.
Vehicle and sand-art visuals generated with Microsoft Copilot.

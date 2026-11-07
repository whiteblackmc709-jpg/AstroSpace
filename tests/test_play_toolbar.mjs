import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../play/play.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../play/index.html", import.meta.url), "utf8");

assert.match(css, /\.game-topbar\{[^}]*height:auto[^}]*flex-wrap:wrap/s,
  "The top bar must grow naturally instead of forcing every control into a fixed-width row.");
assert.match(css, /\.top-center\{[^}]*display:none/s,
  "The redundant sector caption must not sit underneath the navigation buttons.");
assert.match(css, /\.top-actions\{[^}]*min-width:0[^}]*flex-wrap:wrap/s,
  "Toolbar controls must be allowed to wrap without overflowing the header.");
assert.match(css, /@media\(max-width:760px\)/,
  "The toolbar must have a dedicated narrow-screen layout.");
assert.match(css, /@media\(max-width:480px\)/,
  "The toolbar must switch to a compact grid on small phones.");
for (const id of ["region-button","audio-button","community-button","settings-button","character-button","account-button","atlas-button","flight-button"]) {
  assert.ok(html.includes('id="' + id + '"'), "Keep the existing toolbar action: " + id);
}
console.log("Play toolbar layout contract: PASS — compact desktop row, wrapping tablet layout and small-screen grid.");

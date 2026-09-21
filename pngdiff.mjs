import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const B = "/private/tmp/claude-501/-Users-shadracklilan-Workdir-institute-digitalhub-frontend/88b3163f-2751-4602-98a3-5dd2a244bc66/scratchpad/bench/out";
const pairs = [];
for (const n of "admin_admin_students cl_cl_clinical cl_cl_students cl_cl ct_ct_clinical ct_ct_students ct_ct hc_hc_fellows hc_hc_reporting_school-reports_school-feedback hc_hc_schools hc_hc_supervisors sc_sc_schools_ARSENAL_SCH_students".split(" "))
  pairs.push([n, `${B}/crawl-before/shots/${n}.png`, `${B}/crawl-after/shots/${n}.png`]);
for (const n of ["sc-new-case-dob", "sc-new-session-date"]) pairs.push([`pickers ${n}`, `${B}/pickers-before/${n}.png`, `${B}/pickers-after/${n}.png`]);
const browser = await chromium.launch(); const page = await browser.newPage();
for (const [name, a, b] of pairs) {
  const da = "data:image/png;base64," + readFileSync(a).toString("base64");
  const db = "data:image/png;base64," + readFileSync(b).toString("base64");
  const r = await page.evaluate(async ([da, db]) => {
    const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
    const [ia, ib] = await Promise.all([load(da), load(db)]);
    const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
    const get = (img) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); g.drawImage(img, 0, 0); return g.getImageData(0, 0, w, h).data; };
    const A = get(ia), Bd = get(ib); let n = 0, minX = w, minY = h, maxX = 0, maxY = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (A[i] !== Bd[i] || A[i+1] !== Bd[i+1] || A[i+2] !== Bd[i+2]) { n++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; } }
    return { n, pct: ((100 * n) / (w * h)).toFixed(2), bbox: n ? `${minX},${minY}-${maxX},${maxY}` : "-", size: `${w}x${h}` };
  }, [da, db]);
  console.log(`${name}: ${r.n} px (${r.pct}%) bbox ${r.bbox}`);
}
await browser.close();

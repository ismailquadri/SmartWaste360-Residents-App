"""Frame-boundary check: every route, plus the side menu, must stay inside the phone mockup.
Run: python3 scripts/check-frame-bounds.py  (dev server on :8080)"""
import asyncio, json, sys
from playwright.async_api import async_playwright

ROUTES = ["/", "/activity", "/bins", "/wallet", "/report", "/you"]
SEED = {"name": "Ada", "premiseId": "x", "partnerId": "y"}
CHECK = """() => {
  const f = document.querySelector('.mockup-screen-shell').getBoundingClientRect();
  const bad = [];
  for (const el of document.querySelectorAll('[role=dialog], [role=alertdialog], .app-dock, body > *:not(.mockup-stage):not(script)')) {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (!r.width || cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
    if (r.left < f.left - 1 || r.right > f.right + 1 || r.top < f.top - 1 || r.bottom > f.bottom + 1)
      bad.push((el.className || el.tagName).toString().slice(0, 60));
  }
  for (const el of document.querySelectorAll('.app-phone button, .app-phone a')) {
    for (const c of el.querySelectorAll('span')) {
      const a = el.getBoundingClientRect(), r = c.getBoundingClientRect();
      if (r.width && r.right > a.right + 1) { bad.push('text overflows: ' + (c.textContent||'').slice(0,40)); break; }
    }
  }
  const s = document.querySelector('.mockup-stage');
  if (document.documentElement.scrollHeight > innerHeight + 1 && s.scrollHeight > innerHeight + 1) bad.push('page scrolls outside frame');
  return bad;
}"""

async def main():
    fails = []
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page()
        await pg.goto("http://localhost:8080")
        await pg.evaluate("s => { localStorage.setItem('lawma-customer-intro-v2','1'); localStorage.setItem('lawma-customer-demo-v2', s) }", json.dumps(SEED))
        for r in ROUTES:
            await pg.goto("http://localhost:8080" + r); await pg.wait_for_timeout(1500)
            fails += [f"{r}: {x}" for x in await pg.evaluate(CHECK)]
            await pg.locator(".app-dock button").last.click(); await pg.wait_for_timeout(600)
            fails += [f"{r} + menu: {x}" for x in await pg.evaluate(CHECK)]
        await pg.goto("http://localhost:8080/you"); await pg.wait_for_timeout(500)
        await pg.get_by_role("button", name="Reset demo", exact=True).click()
        await pg.wait_for_timeout(400)
        fails += [f"/you + reset: {x}" for x in await pg.evaluate(CHECK)]
        await pg.get_by_role("button", name="Keep my data", exact=True).click()
        await b.close()
    print("\n".join(fails) or "All routes and the menu stay inside the frame")
    sys.exit(1 if fails else 0)

asyncio.run(main())

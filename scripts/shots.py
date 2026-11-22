# Screenshot levels: python shots.py URL WIDTH LEVELS... -> ~/work/tmp/sq/L<n>-<w>.png ; prints console errors
import sys, os
from playwright.sync_api import sync_playwright
url, w = sys.argv[1], int(sys.argv[2]); lv = sys.argv[3:]
out = os.path.expanduser('~/work/tmp/sq')
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': w, 'height': 900})
    errs = []; pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: errs.append(str(e)))
    for n in lv:
        pg.goto(f'{url}#{n}'); pg.reload(); pg.wait_for_timeout(300)
        pg.locator('.panel').screenshot(path=f'{out}/L{n}-{w}.png')
    print('errors:', errs)
    b.close()

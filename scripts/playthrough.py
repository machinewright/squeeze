# Solve every level through the UI with an exact solution and proof (computed in node), at a given width.
# Usage: python playthrough.py URL WIDTH
import sys, json, subprocess, os
from playwright.sync_api import sync_playwright
url, w = sys.argv[1], int(sys.argv[2])
here = os.path.dirname(os.path.abspath(__file__))
sol = json.loads(subprocess.check_output(['bash', '-lc', f'source ~/.nvm/nvm.sh >/dev/null; node {here}/solutions.mjs']))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': w, 'height': 900})
    errs = []; pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.evaluate('localStorage.clear()')
    ok = 0
    for i, s in enumerate(sol):
        pg.goto(f'{url}#{i+1}'); pg.reload(); pg.wait_for_timeout(150)
        st = pg.locator('#stage')
        pg.click('#mode-build')
        if s['kind'] == 'pairs':
            for e in s['build']: st.locator('g.line').nth(e).dispatch_event('click')
            pg.click('#mode-bound')
            for v in s['bound']: st.locator('g.node').nth(v).dispatch_event('click')
        elif s['kind'] == 'grid':
            for a, c in s['build']: st.locator('.sq').nth(a).click(); st.locator('.sq').nth(c).click()
            pg.click('#mode-bound')
            for v in s['bound']: st.locator('.sq').nth(v).click()
        elif s['kind'] == 'pipes':
            for path in s['build']:
                for v in path[1:]: st.locator('g.junction').nth(v).dispatch_event('click')
            pg.click('#mode-bound')
            for e in s['bound']: st.locator('g.pipe').nth(e).dispatch_event('click')
        elif s['kind'] == 'boxes':
            for k, members in enumerate(s['build']):
                st.locator('.palette button').nth(k).click()
                for v in members: st.locator('g.handle').nth(v).dispatch_event('click')
            pg.click('#mode-bound')
            for v in s['bound']: st.locator('g.handle').nth(v).dispatch_event('click')
        solved = pg.locator('.verdict .solved').count() > 0
        if os.environ.get('SHOTS'): pg.locator('.panel').screenshot(path=os.path.expanduser(f'~/work/tmp/sq/S{i+1}-{w}.png'))
        print(f"L{i+1} {s['id']}: {'solved' if solved else 'NOT solved: ' + pg.locator('#meter').inner_text().replace(chr(10), ' ')}")
        ok += solved
    print(f'{ok}/{len(sol)} solved at {w}px; errors: {errs}')
    b.close()

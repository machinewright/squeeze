# Renders og.png (1200x630) from a solved level. Needs the local server on 8766 (repo root).
import asyncio, base64, json, subprocess, os
from playwright.async_api import async_playwright
URL = 'http://127.0.0.1:8766/'
def b64(path): return base64.b64encode(open(path, 'rb').read()).decode()
FONTS = f'''<style>
  @font-face {{ font-family: S; font-weight: 200 900; src: url(data:font/woff2;base64,{b64('fonts/source-serif-4-latin-opsz-normal.woff2')}) format("woff2"); }}
  @font-face {{ font-family: I; font-weight: 100 900; src: url(data:font/woff2;base64,{b64('fonts/inter-latin-wght-normal.woff2')}) format("woff2"); }}
  </style>'''
async def main():
    sol = json.loads(subprocess.check_output(['bash', '-lc', 'source ~/.nvm/nvm.sh >/dev/null; node scripts/solutions.mjs']))
    i = next(k for k, s in enumerate(sol) if s['id'] == 'w1')
    s = sol[i]
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={'width': 1100, 'height': 1000}, device_scale_factor=2)).new_page()
        await pg.goto(f'{URL}#{i+1}'); await pg.evaluate('localStorage.clear()'); await pg.reload()
        st = pg.locator('#stage')
        for path in s['build']:
            for v in path[1:]: await st.locator('g.junction').nth(v).dispatch_event('click')
        await pg.click('#mode-bound')
        for e in s['bound']: await st.locator('g.pipe').nth(e).dispatch_event('click')
        meter = base64.b64encode(await pg.locator('#meter .row').screenshot()).decode()
        board = base64.b64encode(await st.locator('svg').screenshot()).decode()
        cells = ''.join(f'<span style="width:40px;height:40px;display:grid;place-items:center;font:600 18px I;border-radius:7px;border:1px solid {"#1d7a48" if k == 4 else "#d9cfb8"};background:{"#1d7a48" if k == 4 else "#fff"};color:{"#fff" if k == 4 else "#9aa0aa"}">{k}</span>' for k in range(6))
        card = await b.new_page(viewport={'width': 1200, 'height': 630})
        await card.set_content(FONTS + f'''<body style="margin:0;width:1200px;height:630px;background:#fbf9f4;display:flex;align-items:center">
          <div style="width:470px;padding:0 20px 0 64px;color:#1f2430;flex:none">
            <div style="font:650 80px/1 S;letter-spacing:-2px">Squeeze</div>
            <div style="font:400 29px/1.35 S;color:#3d4452;margin-top:22px">Build the best answer.<br>Then prove nobody can do better.</div>
            <div style="display:flex;gap:5px;margin-top:34px">{cells}</div>
            <div style="font:500 19px/1.4 I;color:#646b78;margin-top:26px">A puzzle game about pairs, pipes and boxes, in the browser</div>
          </div>
          <div style="flex:1;display:flex;justify-content:center;padding-right:40px"><img src="data:image/png;base64,{board}" style="width:610px;background:#fff;border:1px solid #e2dbcb;border-radius:16px;padding:10px"></div>
        </body>''')
        await card.wait_for_timeout(300)
        await card.screenshot(path='og.png')
        await b.close()
asyncio.run(main())

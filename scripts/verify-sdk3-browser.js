// Run with Playwright MCP browser_run_code_unsafe({ filename: this file }).
async (page) => {
  const results = [];
  const browser = page.context().browser();
  const school = { id: 1863, name: 'Existing school', school_code: '7240085', atpt_code: 'D10' };
  const seed = {
    arena_school: JSON.stringify(school), arena_nickname: 'ExistingNick',
    rated_123: '5', review_reaction_token_123: 'existing-token', voted_battle_123: 'a',
    release_notice_20260624_school_fix_v2: '1',
  };
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  for (const scenario of ['upgrade', 'existing', 'empty-storage', 'new-user', 'sdk-retry', 'sdk-error', 'profile-error', 'browser']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await context.newPage();
    const errors = [];
    const requests = [];
    let upgraded = false;
    p.on('pageerror', error => errors.push(error.message));
    try {
      if (scenario === 'upgrade') await p.route('http://127.0.0.1:5173/**', async route => {
        if (upgraded) return route.fallback();
        const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
        const response = await p.request.get(`http://127.0.0.1:5174/${name}`);
        check(response.ok(), `Baseline asset unavailable: ${name}`);
        await route.fulfill({ response });
      });
      await p.route('https://puwthqzbounohrdmacgo.supabase.co/**', async route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        const body = request.postDataJSON();
        requests.push({ path, body });
        let response = [];
        if (path.endsWith('/get-user-school')) {
          response = scenario === 'profile-error' ? { error: 'TEMPORARY_ERROR' }
            : scenario === 'new-user' ? { ok: true, profile: null, school: null, membership: null }
            : { ok: true, profile: { display_name: 'ExistingNick' }, school, membership: { school_id: school.id } };
        } else if (path.includes('/functions/')) response = { ok: true };
        else if (path.includes('/rpc/')) response = 0;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response), headers: { 'access-control-allow-origin': '*' } });
      });
      if (scenario !== 'browser') {
        await p.route('**/ait-bridge.js*', route => route.fulfill({
          contentType: 'text/javascript',
          body: `window.AITBridge = {
            getOperationalEnvironment: () => 'toss',
            getAnonymousKey: async () => {
              window.__sdkCalls = (window.__sdkCalls || 0) + 1;
              if (window.__sdkFailure || (window.__sdkRetry && window.__sdkCalls === 1)) throw new Error('SDK unavailable');
              return { type: 'HASH', hash: 'existing_user_hash_123456' };
            }, Analytics: {}, getTossShareLink: async link => link, share: async () => {}
          };`,
        }));
      }
      await p.addInitScript(({ scenario, seed }) => {
        if (!sessionStorage.getItem('seeded')) {
          for (const [key, value] of Object.entries(seed)) localStorage.setItem(key, value);
          sessionStorage.setItem('seeded', '1');
        }
        window.__sdkFailure = scenario === 'sdk-error';
        window.__sdkRetry = scenario === 'sdk-retry';
        if (scenario !== 'browser') window.ReactNativeWebView = { postMessage() {} };
      }, { scenario, seed: ['empty-storage', 'new-user'].includes(scenario) ? {} : scenario === 'browser' ? { ...seed, arena_fp: 'cid_existing_browser_123456' } : seed });
      await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
      if (scenario === 'sdk-error') {
        await p.getByText('사용자 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.').waitFor();
        check(requests.length === 0, 'Failed identity sent a backend request');
        check(await p.evaluate(() => window.USER === null && !localStorage.getItem('arena_fp')), 'Failed identity created fp user');
        await p.evaluate(() => { window.__sdkFailure = false; });
        await p.getByRole('button', { name: '다시 시도', exact: true }).click();
      }
      await p.waitForFunction(() => window.USER !== null);
      if (scenario !== 'new-user') await p.waitForFunction(() => mySchool?.id === 1863);
      const state = await p.evaluate(() => ({
        user: window.USER, school: mySchool, nickname: userNickname,
        owned: isMyReview({ user_key: window.USER.id }),
        notOwned: isMyReview({ user_key: 'toss_another_user_123456' }),
        saved: Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])),
        calls: window.__sdkCalls,
        bodyLength: document.body.innerText.length,
      }));
      check(state.user.id === (scenario === 'browser' ? 'fp_cid_existing_browser_123456' : 'toss_existing_user_hash_123456'), `${scenario}: identity changed`);
      check(state.owned && !state.notOwned, `${scenario}: review ownership changed`);
      check(state.bodyLength > 100, `${scenario}: empty screen`);
      check(!requests.some(r => r.path.endsWith('/set-user-school')), `${scenario}: unexpected profile write`);
      if (!['new-user', 'empty-storage'].includes(scenario)) {
        for (const key of Object.keys(seed)) {
          if (key === 'arena_school') {
            const savedSchool = JSON.parse(state.saved[key]);
            for (const field of Object.keys(school)) check(savedSchool[field] === school[field], `${scenario}: changed school.${field}`);
          } else check(state.saved[key] === seed[key], `${scenario}: changed ${key}`);
        }
      }
      if (scenario === 'empty-storage') check(state.nickname === 'ExistingNick' && state.school.id === 1863, 'Server profile not restored');
      if (scenario === 'sdk-retry') check(state.calls === 2, 'Transient failure did not retry exactly once');
      if (scenario === 'upgrade') {
        upgraded = true;
        await p.reload({ waitUntil: 'networkidle' });
        await p.waitForFunction(() => window.USER?.id === 'toss_existing_user_hash_123456' && mySchool?.id === 1863);
        const after = await p.evaluate(() => ({ user: window.USER, school: mySchool, nickname: userNickname,
          saved: Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])),
          owned: isMyReview({ user_key: 'toss_existing_user_hash_123456' }) }));
        check(after.user.id === state.user.id && after.nickname === state.nickname && after.school.id === state.school.id, 'SDK 2 to 3 profile changed');
        check(JSON.stringify(after.saved) === JSON.stringify(state.saved), 'SDK 2 to 3 changed local data');
        check(after.owned, 'SDK 2 to 3 lost review ownership');
        check(!requests.some(r => r.path.endsWith('/set-user-school')), 'SDK 2 to 3 wrote profile unexpectedly');
      }
      if (scenario === 'existing') {
        await p.getByRole('button', { name: '랭킹', exact: true }).click();
        await p.getByText('이달의 참여 랭킹', { exact: true }).waitFor();
        await p.getByRole('button', { name: '홈', exact: true }).click();
        await p.reload({ waitUntil: 'networkidle' });
        await p.waitForFunction(() => window.USER?.id === 'toss_existing_user_hash_123456' && mySchool?.id === 1863);
        await p.setViewportSize({ width: 1280, height: 800 });
        check(await p.locator('body').innerText(), 'Desktop screen empty');
      }
      check(errors.length === 0, `${scenario}: ${errors.join('; ')}`);
      results.push({ scenario, result: 'PASS', requests: requests.length });
    } finally { await context.close(); }
  }
  return results;
}

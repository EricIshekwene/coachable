// One-off: detect athletics CMS platform for each school's staff directory.
// Run: node scripts/detect-platforms.js

const SCHOOLS = [
  ['FBS — Big Ten', 'Ohio State University', 'ohiostatebuckeyes.com'],
  ['FBS — MAC', 'Ohio University', 'ohiobobcats.com'],
  ['FBS — MAC', 'Bowling Green State University', 'bgsufalcons.com'],
  ['FBS — MAC', 'Kent State University', 'kentstatesports.com'],
  ['FBS — MAC', 'Miami University (OH)', 'miamiredhawks.com'],
  ['FBS — MAC', 'University of Toledo', 'utrockets.com'],
  ['FBS — MAC', 'University of Akron', 'gozips.com'],
  ['FCS', 'University of Dayton', 'daytonflyers.com'],
  ['FCS', 'Youngstown State University', 'ysusports.com'],
  ['D2', 'Ashland University', 'goashlandeagles.com'],
  ['D2', 'Central State University', 'csumarauders.com'],
  ['D2', 'University of Findlay', 'findlayoilers.com'],
  ['D2', 'Lake Erie College', 'lakeeriestorm.com'],
  ['D2', 'Notre Dame College', 'ndcfalcons.com'],
  ['D2', 'Ohio Dominican University', 'ohiodominican.com'],
  ['D2', 'Tiffin University', 'tiffindragon.com'],
  ['D2', 'Urbana University', 'urbanaathletics.com'],
  ['D2', 'Walsh University', 'walshcavaliers.com'],
  ['D3', 'Baldwin Wallace University', 'bwyellowjackets.com'],
  ['D3', 'Capital University', 'capitalcrusaders.com'],
  ['D3', 'Case Western Reserve University', 'athletics.case.edu'],
  ['D3', 'Defiance College', 'defianceathletics.com'],
  ['D3', 'Heidelberg University', 'heidelbergathletics.com'],
  ['D3', 'Hiram College', 'hiramathletics.com'],
  ['D3', 'John Carroll University', 'jcusports.com'],
  ['D3', 'Kenyon College', 'kenyonlords.com'],
  ['D3', 'Marietta College', 'mariettaathletics.com'],
  ['D3', 'Mount Union', 'athletics.mountunion.edu'],
  ['D3', 'Muskingum University', 'muskingumsports.com'],
  ['D3', 'Ohio Northern University', 'onusports.com'],
  ['D3', 'Ohio Wesleyan University', 'owusports.com'],
  ['D3', 'Otterbein University', 'otterbeinathletics.com'],
  ['D3', 'Wilmington College', 'wilmingtonathletics.com'],
  ['D3', 'Wittenberg University', 'wittenbergtigers.com'],
];

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const PATHS = [
  '/staff-directory',
  '/staff',
  '/coaches',
  '/sports/staff-directory',
];

function classify(html) {
  if (!html) return null;
  const lower = html.toLowerCase();
  if (html.includes('window.__NUXT__') || html.includes('__NUXT__'))
    return 'sidearm_nextgen';
  if (lower.includes('sidearmsports.com') || lower.includes('aspnetform'))
    return 'sidearm_legacy';
  if (lower.includes('prestosports')) return 'prestosports';
  // weak heuristics
  if (lower.includes('staff directory') || lower.includes('coaching staff'))
    return 'unknown_has_staff_keyword';
  return null;
}

async function fetchOne(url, timeoutMs = 15000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
      redirect: 'follow',
      signal: ac.signal,
    });
    const text = await res.text();
    return { status: res.status, finalUrl: res.url, text };
  } catch (e) {
    return { error: e.name === 'AbortError' ? 'timeout' : e.message };
  } finally {
    clearTimeout(t);
  }
}

async function detect(domain) {
  for (const path of PATHS) {
    const url = `https://${domain}${path}`;
    const r = await fetchOne(url);
    if (r.error) {
      // try next path on network error too
      if (path === PATHS[PATHS.length - 1])
        return { platform: 'error', error: r.error, triedLast: url };
      continue;
    }
    const platform = classify(r.text);
    if (platform && platform !== 'unknown_has_staff_keyword') {
      return {
        platform,
        status: r.status,
        finalUrl: r.finalUrl,
        path,
        bytes: r.text.length,
      };
    }
    // 200 with staff keyword but no platform sig = custom CMS, keep it
    if (r.status === 200 && platform === 'unknown_has_staff_keyword') {
      return {
        platform: 'custom',
        status: r.status,
        finalUrl: r.finalUrl,
        path,
        bytes: r.text.length,
      };
    }
    // 200 with no signals at all = unknown but reachable; record and move on
    if (r.status === 200) {
      return {
        platform: 'unknown_200',
        status: r.status,
        finalUrl: r.finalUrl,
        path,
        bytes: r.text.length,
      };
    }
    // non-200, try next path
  }
  return { platform: 'not_found_404' };
}

async function withLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

(async () => {
  const start = Date.now();
  const results = await withLimit(SCHOOLS, 5, async ([div, name, domain]) => {
    const r = await detect(domain);
    return { div, name, domain, ...r };
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  const buckets = {};
  for (const r of results) {
    buckets[r.platform] = (buckets[r.platform] || 0) + 1;
  }

  console.log(`\nDetected ${results.length} schools in ${elapsed}s\n`);
  console.log('Platform breakdown:');
  for (const [k, v] of Object.entries(buckets).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v.toString().padStart(3)}  ${k}`);
  }
  console.log('\nPer-school:');
  console.log(
    'div\tplatform\tname\tdomain\tpath\tstatus\tfinalUrl'
  );
  for (const r of results) {
    console.log(
      [
        r.div,
        r.platform,
        r.name,
        r.domain,
        r.path || '',
        r.status || '',
        r.finalUrl || r.error || '',
      ].join('\t')
    );
  }
})();

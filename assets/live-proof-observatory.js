(function () {
  async function loadMetrics() {
    try {
      const embedded = document.getElementById('public-grid-metrics-snapshot');
      if (embedded && embedded.textContent) return JSON.parse(embedded.textContent);
      let res = await fetch('/assets/public-grid-metrics.snapshot.json', { cache: 'no-store' });
      if (!res.ok) {
        res = await fetch('/data/public-grid-metrics.snapshot.json', { cache: 'no-store' });
      }
      if (!res.ok) throw new Error('snapshot unavailable');
      return await res.json();
    } catch (err) {
      return { schema: 'grid-client-metrics.v1', snapshot_status: 'demo_only', generated_at: new Date().toISOString(), metrics: [] };
    }
  }
  function fmt(v) {
    if (typeof v === 'number') return new Intl.NumberFormat('en-US').format(v);
    if (v === null || v === undefined) return 'pending';
    return String(v);
  }
  function metricValue(m) {
    return m.combined_lifetime_total ?? m.rolling_window_value ?? m.latest_snapshot_value ?? m.current_value;
  }
  function badge(m) {
    if (m.live_tracking_status === 'live_connected' && m.status === 'ok') return 'Live feed connected';
    if (m.status === 'stale') return 'Latest verified public-safe snapshot';
    return 'Live counter pending connection';
  }
  function card(m) {
    const el = document.createElement('article');
    el.className = 'live-proof-card';
    el.innerHTML = '<div class="live-proof-label"></div><div class="live-proof-value"></div><div class="live-proof-copy"></div><div class="live-proof-freshness"></div>';
    el.querySelector('.live-proof-label').textContent = m.public_label || m.label;
    el.querySelector('.live-proof-value').textContent = m.formatted_current_value || fmt(metricValue(m));
    el.querySelector('.live-proof-copy').textContent = m.public_copy || 'Public-safe aggregate proof metric.';
    el.querySelector('.live-proof-freshness').textContent = badge(m);
    return el;
  }
  async function render() {
    const mount = document.querySelector('[data-live-proof-observatory]');
    if (!mount) return;
    const data = await loadMetrics();
    const publicMetrics = (data.metrics || []).filter(m => m.public_safe && (m.allowed_surfaces || []).includes('gridfleet_ai'));
    const heroes = publicMetrics.filter(m => m.can_be_public_hero || m.hero_candidate).sort((a,b) => (b.client_hook_score || 0) - (a.client_hook_score || 0)).slice(0, 6);
    const trust = publicMetrics.filter(m => !heroes.includes(m)).sort((a,b) => (a.display_priority || 999) - (b.display_priority || 999)).slice(0, 4);
    mount.innerHTML = '<section class="live-proof-observatory"><p class="eyebrow">GAOS Harmonic Theater</p><h2>The Grid already has proof. Now it is live-counting in harmonic sync.</h2><p class="live-proof-subcopy">GridFleet combines historical operational proof with live GAOS harmonic telemetry, showing real work as it continues: tasks dispatched, signals reviewed, receipts generated, scans completed, and reliability checks passing.</p><div class="live-proof-grid" data-hero></div><div class="live-proof-trust" data-trust></div><p class="live-proof-note">Historical baseline + live GAOS harmonic activity. Metrics use the latest public-safe snapshot unless freshness rules confirm a live feed.</p></section>';
    const heroMount = mount.querySelector('[data-hero]');
    const trustMount = mount.querySelector('[data-trust]');
    heroes.forEach(m => heroMount.appendChild(card(m)));
    trust.forEach(m => trustMount.appendChild(card(m)));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
})();

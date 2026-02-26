/**
 * DEVICELY — app.js  (v2.0)
 * Handles both index.html (home) and app.html (preview) logic.
 * Auto-detects which page it's on via body class.
 */

'use strict';

/* ════════════════════════════════════════════════════════
   CONFIG
   ════════════════════════════════════════════════════════ */
const CONFIG = {
  API_BASE:    '',
  USER_ID:     'local-user-001',
  LS_KEY:      'devicely_preview_history',
  LS_URL_KEY:  'devicely_preview_url',
  LS_VPS_KEY:  'devicely_selected_viewports',
  MAX_HISTORY: 50,
};

/* ════════════════════════════════════════════════════════
   VIEWPORT PRESETS — shared between both pages
   ════════════════════════════════════════════════════════ */
const VIEWPORT_PRESETS = [
  { id: 'iphone15',  name: 'iPhone 15',   w: 390,  h: 844,  icon: 'mobile',  category: 'mobile' },
  { id: 'ipadair',   name: 'iPad Air',    w: 820,  h: 1180, icon: 'tablet',  category: 'tablet' },
  { id: 'macbook14', name: 'MacBook 14"', w: 1512, h: 982,  icon: 'laptop',  category: 'laptop' },
  { id: 'galaxys24', name: 'Galaxy S24',  w: 360,  h: 780,  icon: 'mobile',  category: 'mobile' },
  { id: 'desktophd', name: 'Desktop HD',  w: 1440, h: 900,  icon: 'desktop', category: 'desktop' },
  { id: 'pixel8',    name: 'Pixel 8',     w: 412,  h: 915,  icon: 'mobile',  category: 'mobile' },
];

/* ════════════════════════════════════════════════════════
   PAGE DETECTION + BOOT
   ════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  if (body.classList.contains('home-body')) {
    initHomePage();
  } else if (body.classList.contains('preview-body')) {
    initPreviewPage();
  }
});

/* ════════════════════════════════════════════════════════
   ░░░  HOME PAGE  ░░░
   ════════════════════════════════════════════════════════ */

const homeState = {
  history:       [],
  historyFilter: '',
  activeId:      null,
  isLoading:     false,
};

let H = {}; // DOM cache for home page

function initHomePage() {
  H = {
    urlInput:         document.getElementById('url-input'),
    previewBtn:       document.getElementById('preview-btn'),
    previewBtnText:   document.getElementById('preview-btn-text'),
    previewIcon:      document.getElementById('preview-icon'),
    inputLoading:     document.getElementById('input-loading'),
    protocolBadge:    document.getElementById('protocol-badge'),
    historyItems:     document.getElementById('history-items'),
    historySkeleton:  document.getElementById('history-skeleton'),
    historyEmpty:     document.getElementById('history-empty'),
    historySearch:    document.getElementById('history-search'),
    historyCountBadge:document.getElementById('history-count-badge'),
    btnClearHistory:  document.getElementById('btn-clear-history'),
    toastStack:       document.getElementById('toast-stack'),
    // Modal
    modalBackdrop:    document.getElementById('modal-backdrop'),
    deviceModal:      document.getElementById('device-modal'),
    viewportGrid:     document.getElementById('viewport-grid'),
    modalUrlDisplay:  document.getElementById('modal-url-display'),
    selectedCountText:document.getElementById('selected-count-text'),
    modalPreviewBtn:  document.getElementById('modal-preview-btn'),
    footerDot:        document.querySelector('.footer-dot'),
  };

  bindHomeEvents();
  loadHistory();
  H.urlInput.focus();
}

function bindHomeEvents() {
  H.previewBtn.addEventListener('click', handlePreviewClick);
  H.urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') handlePreviewClick(); });
  H.urlInput.addEventListener('input', () => updateProtocolBadge(H.urlInput.value));
  H.historySearch.addEventListener('input', () => {
    homeState.historyFilter = H.historySearch.value.trim().toLowerCase();
    renderHistoryItems();
  });
  H.btnClearHistory.addEventListener('click', clearAllHistory);

  // Modal
  H.modalBackdrop.addEventListener('click', e => {
    if (e.target === H.modalBackdrop) closeModal();
  });
  H.modalPreviewBtn.addEventListener('click', launchPreview);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

/* ── URL handling ─────────────────────────────────────── */
function handlePreviewClick() {
  const rawUrl = H.urlInput.value.trim();
  if (!rawUrl) {
    toast('warning', 'Please enter a URL first.');
    H.urlInput.focus(); return;
  }
  const url = normalizeUrl(rawUrl);
  if (!isValidUrl(url)) {
    toast('error', 'Please enter a valid URL (e.g. https://example.com)');
    return;
  }
  openViewportModal(url);
}

function fillUrl(url) {
  if (!H) return;
  H.urlInput.value = url;
  updateProtocolBadge(url);
  H.urlInput.focus();
}
window.fillUrl = fillUrl;

function updateProtocolBadge(raw) {
  if (!H.protocolBadge) return;
  if (raw.startsWith('http://')) {
    H.protocolBadge.textContent = 'http://';
    H.protocolBadge.style.color = '#f4a261';
  } else {
    H.protocolBadge.textContent = 'https://';
    H.protocolBadge.style.color = '#3ecf8e';
  }
}

/* ── Viewport Modal ───────────────────────────────────── */
let selectedViewports = new Set(['iphone15', 'ipadair']); // default selections

function openViewportModal(url) {
  H.modalUrlDisplay.textContent = url.replace(/^https?:\/\//, '');
  H.modalBackdrop.classList.remove('hidden');
  renderViewportGrid();
  updateModalFooter();
}

function closeModal() {
  H.modalBackdrop.classList.add('hidden');
}

function renderViewportGrid() {
  H.viewportGrid.innerHTML = '';
  VIEWPORT_PRESETS.forEach(vp => {
    const card = document.createElement('div');
    card.className = 'viewport-card' + (selectedViewports.has(vp.id) ? ' selected' : '');
    card.dataset.id = vp.id;
    card.innerHTML = `
      <div class="vp-icon">${getVpIcon(vp.icon)}</div>
      <span class="vp-name">${vp.name}</span>
      <span class="vp-size">${vp.w} × ${vp.h}</span>
      <div class="vp-checkbox"></div>
    `;
    card.addEventListener('click', () => {
      if (selectedViewports.has(vp.id)) {
        selectedViewports.delete(vp.id);
        card.classList.remove('selected');
      } else {
        selectedViewports.add(vp.id);
        card.classList.add('selected');
      }
      updateModalFooter();
    });
    H.viewportGrid.appendChild(card);
  });
}

function updateModalFooter() {
  const n = selectedViewports.size;
  const ready = n > 0;
  H.selectedCountText.textContent = n === 0
    ? '0 viewports selected'
    : `${n} viewport${n > 1 ? 's' : ''} selected — ready to preview`;
  H.modalPreviewBtn.disabled = !ready;
  H.modalPreviewBtn.classList.toggle('disabled', !ready);
  if (H.footerDot) H.footerDot.style.background = ready ? '#3ecf8e' : '#444';
}

function getVpIcon(type) {
  const icons = {
    mobile: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="6" y="2" width="12" height="20" rx="3"/><line x1="10" y1="19" x2="14" y2="19"/></svg>`,
    tablet: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/></svg>`,
    laptop: `<svg width="24" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M0 21h24"/></svg>`,
    desktop:`<svg width="24" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4" stroke-linecap="round"/></svg>`,
  };
  return icons[type] || icons.desktop;
}

function launchPreview() {
  if (selectedViewports.size === 0) return;
  const url = normalizeUrl(H.urlInput.value.trim());

  // Save to localStorage
  localStorage.setItem(CONFIG.LS_URL_KEY, url);
  localStorage.setItem(CONFIG.LS_VPS_KEY, JSON.stringify([...selectedViewports]));

  // Save to history
  const item = {
    id:        generateId(),
    url,
    timestamp: new Date().toISOString(),
    device:    [...selectedViewports][0],
  };
  addToHistory(item);

  closeModal();
  window.location.href = 'app.html';
}

/* ── History ──────────────────────────────────────────── */
async function loadHistory() {
  H.historySkeleton.style.display = 'flex';
  H.historySkeleton.style.flexDirection = 'column';
  H.historyEmpty.classList.add('hidden');

  try {
    const items = await fetchHistoryAPI();
    homeState.history = Array.isArray(items) ? items : [];
    mergeLocalHistory();
  } catch {
    homeState.history = loadLocalHistory();
  }

  H.historySkeleton.style.display = 'none';
  renderHistoryItems();
}

function renderHistoryItems() {
  const container = H.historyItems;
  container.innerHTML = '';
  let items = [...homeState.history];
  if (homeState.historyFilter) {
    items = items.filter(i => i.url.toLowerCase().includes(homeState.historyFilter));
  }
  items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  H.historyCountBadge.textContent = `${homeState.history.length} saved`;
  if (items.length === 0) { H.historyEmpty.classList.remove('hidden'); return; }
  H.historyEmpty.classList.add('hidden');
  items.forEach((item, i) => container.appendChild(buildHistoryCard(item, i)));
}

function buildHistoryCard(item, index) {
  const card = document.createElement('div');
  const isActive = item.id === homeState.activeId;
  card.className = `history-card${isActive ? ' active' : ''}`;
  card.style.animation = `slideIn 0.2s ${index * 25}ms ease both`;
  card.dataset.id = item.id;
  const favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(item.url)}&sz=16`;
  const formattedUrl = formatUrl(item.url);
  const formattedTime = formatTimestamp(item.timestamp);
  const devIcon = getDeviceIconSmall(item.device);

  card.innerHTML = `
    <div class="card-favicon">
      <img src="${favicon}" width="14" height="14" alt="" loading="lazy"
        onerror="this.style.display='none'" />
    </div>
    <div class="card-content">
      <span class="card-url" title="${escapeHtml(item.url)}">${escapeHtml(formattedUrl)}</span>
      <div class="card-meta">
        <span class="card-time">${formattedTime}</span>
        <div class="card-device-tag">${devIcon}<span>${item.device || 'desktop'}</span></div>
      </div>
    </div>
    <button class="card-delete-btn" data-id="${item.id}" title="Remove">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;

  card.addEventListener('click', e => {
    if (e.target.closest('.card-delete-btn')) return;
    H.urlInput.value = item.url;
    updateProtocolBadge(item.url);
    homeState.activeId = item.id;
    renderHistoryItems();
    openViewportModal(item.url);
  });
  card.querySelector('.card-delete-btn').addEventListener('click', e => {
    e.stopPropagation();
    removeHistoryItem(item.id);
  });
  return card;
}

function addToHistory(item) {
  homeState.history = homeState.history.filter(h => h.url !== item.url);
  homeState.history.unshift(item);
  if (homeState.history.length > CONFIG.MAX_HISTORY) {
    homeState.history = homeState.history.slice(0, CONFIG.MAX_HISTORY);
  }
  saveLocalHistory();
  renderHistoryItems();
}

function removeHistoryItem(id) {
  homeState.history = homeState.history.filter(h => h.id !== id);
  if (homeState.activeId === id) homeState.activeId = null;
  saveLocalHistory();
  renderHistoryItems();
  toast('info', 'Removed from history.');
}

function clearAllHistory() {
  if (homeState.history.length === 0) return;
  homeState.history = [];
  homeState.activeId = null;
  saveLocalHistory();
  renderHistoryItems();
  toast('info', 'History cleared.');
}

/* ── API + localStorage ───────────────────────────────── */
async function fetchHistoryAPI() {
  const res = await fetch(`${CONFIG.API_BASE}/api/previews/${CONFIG.USER_ID}`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

function saveLocalHistory() {
  try { localStorage.setItem(CONFIG.LS_KEY, JSON.stringify(homeState.history)); } catch {}
}
function loadLocalHistory() {
  try { return JSON.parse(localStorage.getItem(CONFIG.LS_KEY) || '[]'); } catch { return []; }
}
function mergeLocalHistory() {
  const local = loadLocalHistory();
  if (!local.length) return;
  const ids = new Set(homeState.history.map(h => h.id));
  homeState.history = [...homeState.history, ...local.filter(h => !ids.has(h.id))];
  homeState.history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  homeState.history = homeState.history.slice(0, CONFIG.MAX_HISTORY);
}

/* ════════════════════════════════════════════════════════
   ░░░  PREVIEW PAGE (app.html)  ░░░
   ════════════════════════════════════════════════════════ */

const previewState = {
  url:             '',
  selectedVPs:     [],   // array of viewport ids
  currentVP:       null, // single-view active viewport
  zoom:            1.0,
  loadTimes:       {},
};

let P = {}; // DOM cache for preview page

function initPreviewPage() {
  P = {
    canvas:          document.getElementById('preview-canvas'),
    singleLayout:    document.getElementById('single-viewport-layout'),
    multiLayout:     document.getElementById('multi-viewport-layout'),
    noUrlState:      document.getElementById('no-url-state'),
    scaleWrapper:    document.getElementById('scale-wrapper'),
    deviceShellOuter:document.getElementById('device-shell-outer'),
    deviceShell:     document.getElementById('device-shell'),
    frameInner:      document.getElementById('frame-inner'),
    deviceLabelTag:  document.getElementById('device-label-tag'),
    deviceTabs:      document.getElementById('device-tabs'),
    toolbarUrlChip:  document.getElementById('toolbar-url-chip'),
    toolbarUrlText:  document.getElementById('toolbar-url-text'),
    loadingOverlay:  document.getElementById('frame-loading-overlay'),
    btnRefresh:      document.getElementById('btn-refresh'),
    btnCopyUrl:      document.getElementById('btn-copy-url'),
    btnOpenTab:      document.getElementById('btn-open-tab'),
    zoomIn:          document.getElementById('zoom-in'),
    zoomOut:         document.getElementById('zoom-out'),
    zoomPct:         document.getElementById('zoom-pct'),
    statusLive:      document.getElementById('status-live'),
    statusDevice:    document.getElementById('status-device-name'),
    statusSize:      document.getElementById('status-size-display'),
    statusZoom:      document.getElementById('status-zoom-pct'),
    statusLoadTime:  document.getElementById('status-load-time'),
    loadTimeText:    document.getElementById('load-time-text'),
    toastStack:      document.getElementById('toast-stack'),
  };

  bindPreviewEvents();
  initPreview();
}

function bindPreviewEvents() {
  P.btnRefresh.addEventListener('click', refreshPreview);
  P.btnCopyUrl.addEventListener('click', copyUrl);
  P.btnOpenTab.addEventListener('click', openNewTab);
  P.zoomIn.addEventListener('click', () => applyZoom(previewState.zoom + 0.1));
  P.zoomOut.addEventListener('click', () => applyZoom(previewState.zoom - 0.1));

  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === '=' || e.key === '+') { e.preventDefault(); applyZoom(previewState.zoom + 0.1); }
      if (e.key === '-') { e.preventDefault(); applyZoom(previewState.zoom - 0.1); }
      if (e.key === '0') { e.preventDefault(); autoZoom(); }
    }
  });

  window.addEventListener('resize', () => {
    clearTimeout(window._resizeTimer);
    window._resizeTimer = setTimeout(autoZoom, 120);
  });
}

function initPreview() {
  previewState.url = localStorage.getItem(CONFIG.LS_URL_KEY) || '';
  const savedVPs   = JSON.parse(localStorage.getItem(CONFIG.LS_VPS_KEY) || '[]');
  previewState.selectedVPs = savedVPs.length ? savedVPs : ['desktophd'];

  if (!previewState.url) {
    showNoUrlState();
    return;
  }

  // Show URL chip
  P.toolbarUrlChip.style.display = 'flex';
  P.toolbarUrlText.textContent = previewState.url.replace(/^https?:\/\//, '').substring(0, 50);
  P.statusLive.style.display = 'flex';

  // Build device tabs
  buildDeviceTabs();

  // Decide layout: single vs multi
  if (previewState.selectedVPs.length === 1) {
    showSingleViewport(previewState.selectedVPs[0]);
  } else {
    showMultiViewport();
  }
}

/* ── Device Tabs ──────────────────────────────────────── */
function buildDeviceTabs() {
  P.deviceTabs.innerHTML = '';
  const vps = previewState.selectedVPs.map(id => VIEWPORT_PRESETS.find(v => v.id === id)).filter(Boolean);

  if (vps.length === 1) {
    // Show all presets as tabs for single view
    VIEWPORT_PRESETS.forEach(vp => {
      const btn = makeTabBtn(vp, vp.id === previewState.selectedVPs[0]);
      btn.addEventListener('click', () => {
        previewState.selectedVPs = [vp.id];
        buildDeviceTabs();
        showSingleViewport(vp.id);
      });
      P.deviceTabs.appendChild(btn);
    });
  } else {
    // Multi mode: show toggle between multi and each single
    const allBtn = document.createElement('button');
    allBtn.className = 'tab-btn active';
    allBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
      All (${vps.length})
    `;
    allBtn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      allBtn.classList.add('active');
      showMultiViewport();
    });
    P.deviceTabs.appendChild(allBtn);

    vps.forEach(vp => {
      const btn = makeTabBtn(vp, false);
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        showSingleViewport(vp.id);
      });
      P.deviceTabs.appendChild(btn);
    });
  }
}

function makeTabBtn(vp, active) {
  const btn = document.createElement('button');
  btn.className = 'tab-btn' + (active ? ' active' : '');
  btn.dataset.vpId = vp.id;
  btn.innerHTML = `${getTabIcon(vp.icon)}<span>${vp.name}</span>`;
  return btn;
}

function getTabIcon(type) {
  const icons = {
    mobile:  `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="6" y="2" width="12" height="20" rx="3"/></svg>`,
    tablet:  `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="4" y="2" width="16" height="20" rx="2"/></svg>`,
    laptop:  `<svg width="13" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M0 21h24"/></svg>`,
    desktop: `<svg width="13" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
  };
  return icons[type] || icons.desktop;
}

/* ── Single Viewport ──────────────────────────────────── */
function showSingleViewport(vpId) {
  const vp = VIEWPORT_PRESETS.find(v => v.id === vpId);
  if (!vp) return;
  previewState.currentVP = vpId;

  P.multiLayout.style.display = 'none';
  P.noUrlState.style.display = 'none';
  P.singleLayout.style.display = 'flex';

  // Update shell dimensions
  P.deviceShell.style.width  = vp.w + 'px';
  P.deviceShell.style.height = vp.h + 'px';
  P.deviceShell.style.borderRadius = vp.icon === 'mobile' ? '28px' : vp.icon === 'tablet' ? '18px' : '12px';

  P.deviceLabelTag.textContent = `${vp.name} · ${vp.w} × ${vp.h}`;
  P.statusDevice.textContent = vp.name;
  P.statusSize.textContent = `${vp.w} × ${vp.h}`;

  // Rebuild frame inner
  P.frameInner.innerHTML = '';
  P.frameInner.appendChild(P.loadingOverlay);

  // Chrome
  const chrome = buildChrome(vp, previewState.url);
  P.frameInner.insertBefore(chrome, P.loadingOverlay);

  // Iframe
  const iframe = buildIframe(previewState.url, vp.w, vp.h - getChromeHeight(vp), vpId);
  P.frameInner.appendChild(iframe);

  autoZoom();
}

function getChromeHeight(vp) {
  if (vp.icon === 'mobile') return 46;
  if (vp.icon === 'tablet') return 30;
  return 40; // desktop/laptop
}

function buildChrome(vp, url) {
  if (vp.icon === 'mobile') {
    const bar = document.createElement('div');
    bar.className = 'notch-bar';
    bar.innerHTML = `<div class="notch"></div>`;
    return bar;
  }
  if (vp.icon === 'tablet') {
    const bar = document.createElement('div');
    bar.className = 'tablet-bar';
    bar.innerHTML = `<div class="tablet-cam"></div>`;
    return bar;
  }
  // Desktop/Laptop
  const bar = document.createElement('div');
  bar.className = 'chrome-bar';
  bar.innerHTML = `
    <div class="chrome-dots">
      <div class="chrome-dot dot-red"></div>
      <div class="chrome-dot dot-yellow"></div>
      <div class="chrome-dot dot-green"></div>
    </div>
    <div class="chrome-url-bar">
      <svg class="chrome-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <rect x="5" y="11" width="14" height="10" rx="2"/>
        <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
      </svg>
      <span class="chrome-url-text">${escapeHtml(url || 'about:blank')}</span>
    </div>`;
  return bar;
}

function buildIframe(url, width, height, vpId) {
  const iframe = document.createElement('iframe');
  iframe.className = 'preview-iframe';
  iframe.style.height = height + 'px';
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
  iframe.setAttribute('loading', 'lazy');

  const startTime = performance.now();
  P.loadingOverlay.classList.add('show');

  iframe.onload = () => {
    P.loadingOverlay.classList.remove('show');
    const elapsed = Math.round(performance.now() - startTime);
    previewState.loadTimes[vpId] = elapsed;
    P.statusLoadTime.style.display = 'flex';
    P.loadTimeText.textContent = `${elapsed}ms`;
  };
  iframe.onerror = () => {
    P.loadingOverlay.classList.remove('show');
  };

  iframe.src = url;
  return iframe;
}

/* ── Multi Viewport ───────────────────────────────────── */
function showMultiViewport() {
  P.singleLayout.style.display = 'none';
  P.noUrlState.style.display = 'none';
  P.multiLayout.style.display = 'flex';
  P.multiLayout.innerHTML = '';

  const vps = previewState.selectedVPs
    .map(id => VIEWPORT_PRESETS.find(v => v.id === id))
    .filter(Boolean);

  // Calculate a responsive panel width and columns for multi-view mode.
  const safeCanvasW = Math.max(P.canvas.clientWidth - 32, 220);
  const maxColumns = safeCanvasW < 760 ? 1 : safeCanvasW < 1160 ? 2 : 3;
  const columns = Math.max(1, Math.min(vps.length, maxColumns));
  const gap = 24;
  const maxPanelW = Math.min(380, Math.max(180, (safeCanvasW - gap * (columns - 1)) / columns));

  vps.forEach(vp => {
    const scale = maxPanelW / vp.w;
    const scaledH = Math.round(vp.h * scale);

    const panel = document.createElement('div');
    panel.className = 'multi-viewport-panel';

    panel.innerHTML = `
      <div class="mvp-header">
        ${getTabIcon(vp.icon)}
        <span class="mvp-device-label">${vp.name}</span>
        <span class="mvp-size-label">${vp.w} × ${vp.h}</span>
      </div>
    `;

    const shellWrap = document.createElement('div');
    shellWrap.style.cssText = `position:relative; width:${maxPanelW}px; height:${scaledH}px; border-radius:${vp.icon === 'mobile' ? '14px' : '8px'}; overflow:hidden; border:1px solid #242424;`;

    const inner = document.createElement('div');
    inner.style.cssText = `transform:scale(${scale}); transform-origin:top left; width:${vp.w}px; height:${vp.h}px;`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = `display:block; width:${vp.w}px; height:${vp.h}px; border:none; background:white;`;
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
    iframe.setAttribute('loading', 'lazy');
    iframe.src = previewState.url;

    const badge = document.createElement('div');
    badge.className = 'mvp-pass-badge';
    badge.innerHTML = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Pass`;

    iframe.onload = () => { badge.style.display = 'flex'; };
    badge.style.display = 'none';

    inner.appendChild(iframe);
    shellWrap.appendChild(inner);
    shellWrap.appendChild(badge);
    panel.appendChild(shellWrap);
    P.multiLayout.appendChild(panel);
  });
}

/* ── No URL State ─────────────────────────────────────── */
function showNoUrlState() {
  P.singleLayout.style.display = 'none';
  P.multiLayout.style.display = 'none';
  P.noUrlState.style.display = 'flex';
}

/* ── Zoom ─────────────────────────────────────────────── */
function applyZoom(z) {
  previewState.zoom = Math.min(2, Math.max(0.15, z));
  P.scaleWrapper.style.transform = `scale(${previewState.zoom})`;
  P.scaleWrapper.style.transformOrigin = 'top center';
  const pct = Math.round(previewState.zoom * 100) + '%';
  P.zoomPct.textContent = pct;
  P.statusZoom.textContent = pct;
}

function autoZoom() {
  if (previewState.selectedVPs.length > 1) return; // multi layout handles its own scale
  const vp = VIEWPORT_PRESETS.find(v => v.id === previewState.currentVP);
  if (!vp) return;
  const padW = P.canvas.clientWidth < 768 ? 24 : 80;
  const padH = P.canvas.clientHeight < 700 ? 96 : 140;
  const availW = P.canvas.clientWidth - padW;
  const availH = P.canvas.clientHeight - padH;
  const z = Math.min(availW / vp.w, availH / vp.h, 1.0);
  applyZoom(parseFloat(z.toFixed(2)));
}

/* ── Toolbar Actions ──────────────────────────────────── */
function refreshPreview() {
  if (!previewState.url) { toast('warning', 'No URL loaded.'); return; }
  if (previewState.selectedVPs.length === 1) showSingleViewport(previewState.currentVP);
  else showMultiViewport();
  toast('info', 'Refreshed.');
}

async function copyUrl() {
  if (!previewState.url) { toast('warning', 'No URL to copy.'); return; }
  try {
    await navigator.clipboard.writeText(previewState.url);
    toast('success', 'URL copied!');
  } catch { toast('error', 'Copy failed.'); }
}

function openNewTab() {
  if (!previewState.url) { toast('warning', 'No URL loaded.'); return; }
  window.open(previewState.url, '_blank', 'noopener,noreferrer');
}

/* ════════════════════════════════════════════════════════
   SHARED UTILITIES
   ════════════════════════════════════════════════════════ */

function normalizeUrl(raw) {
  raw = raw.trim();
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
  return raw;
}

function isValidUrl(url) {
  try { new URL(url); return true; } catch { return false; }
}

function formatUrl(url) {
  try {
    const u = new URL(url);
    let d = u.hostname + (u.pathname !== '/' ? u.pathname : '');
    return d.length > 42 ? d.slice(0, 40) + '…' : d;
  } catch { return url; }
}

function formatTimestamp(iso) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return '—'; }
}

function generateId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function escapeHtml(str) {
  const el = document.createElement('div');
  el.textContent = str;
  return el.innerHTML;
}

function getDeviceIconSmall(device) {
  const icons = {
    mobile: `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="6" y="2" width="12" height="20" rx="3"/></svg>`,
    iphone15: `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="6" y="2" width="12" height="20" rx="3"/></svg>`,
    galaxys24: `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="6" y="2" width="12" height="20" rx="3"/></svg>`,
    pixel8: `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="6" y="2" width="12" height="20" rx="3"/></svg>`,
    tablet: `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="2" width="16" height="20" rx="2"/></svg>`,
    ipadair: `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="2" width="16" height="20" rx="2"/></svg>`,
    desktop: `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
    desktophd: `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
    macbook14: `<svg width="11" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M0 21h24"/></svg>`,
  };
  return icons[device] || icons.desktop;
}

/* ── Toast Notifications ──────────────────────────────── */
function toast(type, message) {
  const stack = document.getElementById('toast-stack');
  if (!stack) return;

  const colors = {
    success: { bg: '#0d1f16', border: 'rgba(62,207,142,0.35)',  icon: '#3ecf8e' },
    error:   { bg: '#1f0d0d', border: 'rgba(230,57,70,0.35)',   icon: '#e63946' },
    warning: { bg: '#1f1a0d', border: 'rgba(244,162,97,0.35)',  icon: '#f4a261' },
    info:    { bg: '#141414', border: '#2a2a2a',                icon: '#888' },
  };
  const svgPaths = {
    success: `<polyline points="20 6 9 17 4 12"/>`,
    error:   `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
    warning: `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>`,
    info:    `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>`,
  };

  const c = colors[type] || colors.info;
  const el = document.createElement('div');
  el.className = 'toast';
  el.style.cssText = `background:${c.bg};border:1px solid ${c.border};`;
  el.innerHTML = `
    <svg style="flex-shrink:0;color:${c.icon}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">${svgPaths[type] || svgPaths.info}</svg>
    <span style="font-size:12.5px;color:#e0e0e0;">${escapeHtml(message)}</span>
  `;
  stack.appendChild(el);

  setTimeout(() => {
    el.style.transition = 'all 0.25s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateX(8px)';
    setTimeout(() => el.remove(), 260);
  }, 3200);
}

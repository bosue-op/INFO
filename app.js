(function () {
  'use strict';

  const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json';

  const FEEDS = [
    { id: 'lemonde',    name: 'Le Monde',      url: 'https://www.lemonde.fr/rss/une.xml',                cat: 'general' },
    { id: 'franceinfo', name: 'France Info',   url: 'https://www.francetvinfo.fr/titres.rss',             cat: 'general' },
    { id: '20minutes',  name: '20 Minutes',    url: 'https://www.20minutes.fr/feeds/rss-une.xml',         cat: 'general' },
    { id: 'huffpost',   name: 'HuffPost',      url: 'https://www.huffingtonpost.fr/feeds/index.xml',      cat: 'general' },
    { id: 'courrierint', name: 'Courrier Int.', url: 'https://www.courrierinternational.com/feed/all/rss.xml', cat: 'general' },
    { id: 'lequipe',    name: "L'Équipe",       url: 'https://www.lequipe.fr/rss/actu_rss.xml',            cat: 'sport'   },
    { id: 'rmcsport',   name: 'RMC Sport',      url: 'https://rmcsport.bfmtv.com/rss/',                    cat: 'sport'   },
    { id: 'sportsfr',   name: 'Sports.fr',       url: 'https://www.sports.fr/feed/',                        cat: 'sport'   },
    { id: 'footmercato', name: 'Foot Mercato',   url: 'https://www.footmercato.net/rss.xml',                cat: 'sport'   },
    { id: 'sofoot',     name: 'So Foot',         url: 'https://www.sofoot.com/rss.xml',                     cat: 'sport'   },
    { id: 'maxifoot',   name: 'Maxifoot',        url: 'https://www.maxifoot.com/rss.xml',                   cat: 'sport'   },
    { id: '01net',      name: '01net',         url: 'https://www.01net.com/rss/actualites/',              cat: 'tech'    },
    { id: 'numerama',   name: 'Numerama',      url: 'https://www.numerama.com/feed/',                     cat: 'tech'    },
    { id: 'frandroid',  name: 'Frandroid',     url: 'https://www.frandroid.com/feed',                     cat: 'tech'    },
  ];

  const CACHE_MAX = 50;

  const state = {
    articles: [], currentCat: 'all', filtered: [],
    currentWikiCat: 'wikipedia', wikiResults: null,
    wikiCache: {}, articleId: 0,
    currentArticle: null,
  };

  const $ = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => [...(p || document).querySelectorAll(s)];

  const dom = {
    navBtns: $$('.nav-btn'), sections: $$('.section'),
    catBtns: $$('.cat-btn'), newsGrid: $('#newsGrid'),
    wikiSearch: $('#wikiSearch'), wikiSearchBtn: $('#wikiSearchBtn'),
    wikiContent: $('#wikiContent'), wikiResult: $('#wikiResult'),
    wikiHistory: $('#wikiHistory'),
    wikiCatTabs: $('.wiki-cat-tabs'), wikiCatBtns: $$('.wiki-cat-btn'),
    articleView: $('#articleView'), articleBody: $('#articleBody'),
    articleClose: $('#articleClose'), notif: $('.notification'),
    shareBtn: $('#shareBtn'),
    themeBtn: $('#themeBtn'),
    weatherContent: $('#weatherContent'), weatherResult: $('#weatherResult'),
    weatherCity: $('#weatherCity'), weatherCityBtn: $('#weatherCityBtn'),
    cryptoResult: $('#cryptoResult'), cryptoRefreshBtn: $('#cryptoRefreshBtn'),
  };

  /* --- UTILS --- */
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function formatDate(str) {
    if (!str) return '';
    const d = new Date(str);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function stripHtml(html) {
    if (!html) return '';
    const t = document.createElement('div');
    t.innerHTML = html;
    return t.textContent || t.innerText || '';
  }

  function sanitize(str) {
    if (!str) return '';
    const t = document.createElement('div');
    t.textContent = str;
    return t.innerHTML;
  }

  function extractImg(html) {
    if (!html) return null;
    const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m) return m[1];
    const m2 = html.match(/<media:content[^>]+url=["']([^"']+)["']/i);
    if (m2) return m2[1];
    const m3 = html.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
    if (m3) return m3[1];
    return null;
  }

  function simpleHash(str) {
    let hash = 0;
    if (!str) return 0;
    for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
    return Math.abs(hash);
  }

  function truncate(text, n) {
    if (!text) return '';
    return text.length > n ? text.slice(0, n).trim() + '…' : text;
  }

  function notify(msg) {
    dom.notif.textContent = msg;
    dom.notif.classList.add('show');
    clearTimeout(dom.notif._t);
    dom.notif._t = setTimeout(() => dom.notif.classList.remove('show'), 3000);
  }

  function loading(el) { el.innerHTML = '<div class="loading-state">Chargement…</div>'; }

  function error(el, msg) {
    el.innerHTML = `<div class="error-state"><p>${sanitize(msg || 'Une erreur est survenue.')}</p></div>`;
  }

  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  async function fetchJSON(url, signal) {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function typewrite(container, html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    container.innerHTML = '';
    const speed = 18;
    for (const node of tmp.childNodes) {
      if (!container.isConnected || container.style.display === 'none') return;
      if (node.nodeType === 1) {
        if (node.tagName === 'P') {
          const p = document.createElement('p');
          container.appendChild(p);
          const words = node.textContent.split(/(\s+)/);
          for (let i = 0; i < words.length; i++) {
            if (!container.isConnected || container.style.display === 'none') return;
            p.textContent += words[i];
            if (i % 2 === 0) await sleep(speed + Math.random() * 8);
          }
          p.classList.add('typing-cursor');
          await sleep(60);
          p.classList.remove('typing-cursor');
        } else if (node.tagName === 'IMG') {
          container.appendChild(node.cloneNode(true));
        } else {
          container.appendChild(node.cloneNode(true));
        }
      }
    }
  }

  /* --- HARD RESET --- */
  async function hardReset() {
    notify('Nettoyage du cache…');
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    notify('Rechargement…');
    setTimeout(() => window.location.reload(true), 500);
  }

  /* --- THEME --- */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('infohub-theme', theme);
    const sun = dom.themeBtn.querySelector('.sun-icon');
    const moon = dom.themeBtn.querySelector('.moon-icon');
    if (theme === 'light') { sun.style.display = 'none'; moon.style.display = ''; }
    else { sun.style.display = ''; moon.style.display = 'none'; }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'light' ? '#f5f5f7' : '#0b0b1a';
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'light' ? 'dark' : 'light');
  }

  function initTheme() {
    const saved = localStorage.getItem('infohub-theme');
    if (saved) { applyTheme(saved); return; }
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(prefersLight ? 'light' : 'dark');
  }

  /* --- SEARCH HISTORY --- */
  function loadHistory(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch (_) { return []; }
  }

  function saveHistory(key, items) {
    localStorage.setItem(key, JSON.stringify(items.slice(0, 10)));
  }

  function addHistory(key, value) {
    const items = loadHistory(key).filter(v => v !== value);
    items.unshift(value);
    saveHistory(key, items);
  }

  function clearHistory(key, el) {
    localStorage.removeItem(key);
    el.style.display = 'none';
    el.innerHTML = '';
  }

  function renderHistory(el, items, clickHandler, clearKey) {
    if (!items.length) { el.style.display = 'none'; el.innerHTML = ''; return; }
    el.style.display = 'flex';
    el.innerHTML = '<span class="search-history-label">Récent</span>' +
      items.map(v => `<button class="search-history-item" data-hvalue="${sanitize(v)}">${sanitize(v)}</button>`).join('') +
      `<button class="search-history-clear" data-clear="${clearKey}">Tout effacer</button>`;
    el.querySelectorAll('.search-history-item').forEach(btn => {
      btn.addEventListener('click', () => clickHandler(btn.dataset.hvalue));
    });
    const clearBtn = el.querySelector('.search-history-clear');
    if (clearBtn) clearBtn.addEventListener('click', () => clearHistory(clearKey, el));
  }

  /* --- RSS / NEWS --- */
  async function loadFeed(feed) {
    const url = `${RSS2JSON_API}?rss_url=${encodeURIComponent(feed.url)}`;
    try {
      const data = await fetchJSON(url);
      if (data.status !== 'ok') throw new Error('API error');
      return data.items.map(item => ({
        title: item.title || '(Sans titre)',
        desc: stripHtml(item.description || ''),
        link: item.link || '#',
        date: item.pubDate || '',
        img: item.thumbnail || extractImg(item.content || '') || extractImg(item.description || '') || `https://picsum.photos/seed/${simpleHash(item.title || item.link)}/400/250`,
        source: feed.name, category: feed.cat, feedId: feed.id,
      }));
    } catch (e) {
      if (e.name !== 'AbortError') console.warn(`RSS ${feed.name}:`, e);
      return [];
    }
  }

  async function loadAllFeeds() {
    dom.newsGrid.innerHTML = '<div class="loading-state">Chargement des actualités…</div>';
    const results = await Promise.allSettled(FEEDS.map(loadFeed));
    state.articles = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    state.articles.forEach(a => { a.id = ++state.articleId; });
    state.articles.sort((a, b) => new Date(b.date) - new Date(a.date));
    filterAndRender();
    notify(`${state.articles.length} actualités chargées`);
  }

  function filterAndRender() {
    state.filtered = state.currentCat === 'all'
      ? state.articles : state.articles.filter(a => a.category === state.currentCat);
    renderNews();
  }

  function renderNews() {
    const grid = dom.newsGrid;
    if (!state.filtered.length) {
      grid.innerHTML = '<div class="error-state"><p>Aucune actualité trouvée pour cette catégorie.</p></div>';
      return;
    }
    grid.innerHTML = state.filtered.map(a => buildCard(a)).join('');
  }

  function buildCard(a) {
    return `
      <div class="news-card" role="listitem" tabindex="0" data-id="${a.id}">
        <img class="card-img" src="${a.img}" alt="Illustration : ${sanitize(a.title || a.source)}" loading="lazy" onerror="this.src='https://picsum.photos/seed/${simpleHash(a.title || a.link)}/400/250'">
        <div class="card-body">
          <div class="card-source">${sanitize(a.source)}</div>
          <div class="card-title">${sanitize(a.title)}</div>
          <div class="card-desc">${sanitize(truncate(a.desc, 180))}</div>
          <div class="card-date">${formatDate(a.date)}</div>
        </div>
      </div>
    `;
  }

  function findArticleById(id) { return state.articles.find(a => a.id === id); }

  function openArticle(a) {
    state.currentArticle = a;
    dom.articleBody.innerHTML = `
      <img class="card-img" src="${sanitize(a.img)}" alt="Illustration : ${sanitize(a.title || a.source)}" style="width:100%;height:auto;max-height:360px;object-fit:cover;margin-bottom:20px" loading="lazy" onerror="this.style.display='none'">
      <div class="article-source">${sanitize(a.source)}</div>
      <div class="article-title">${sanitize(a.title)}</div>
      <div class="article-date">${formatDate(a.date)}</div>
      <div class="article-desc">${sanitize(a.desc || 'Aucun contenu disponible.')}</div>
      <a class="article-link" href="${sanitize(a.link)}" target="_blank" rel="noopener noreferrer">
        Lire l'article original
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
      </a>
    `;
    dom.articleView.style.display = 'block';
    dom.articleView.setAttribute('aria-hidden', 'false');
    dom.articleView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeArticle() {
    dom.articleView.style.display = 'none';
    dom.articleView.setAttribute('aria-hidden', 'true');
    state.currentArticle = null;
    const newsSection = document.getElementById('section-news');
    if (newsSection) newsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* --- SHARE --- */
  async function shareArticle() {
    const a = state.currentArticle;
    if (!a) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: a.title, text: a.desc || a.title, url: a.link });
      } catch (_) {}
    } else {
      await navigator.clipboard.writeText(a.link);
      notify('Lien copié dans le presse-papier');
    }
  }

  const WIKI_SOURCES = [
    { id: 'wikipedia',  label: 'Wikipédia',      domain: 'https://fr.wikipedia.org' },
    { id: 'wiktionary', label: 'Wiktionnaire',   domain: 'https://fr.wiktionary.org' },
    { id: 'wikibooks',  label: 'Wikibooks',      domain: 'https://fr.wikibooks.org' },
    { id: 'wikiquote',  label: 'Wikiquote',      domain: 'https://fr.wikiquote.org' },
    { id: 'wikinews',   label: 'Wikinews',       domain: 'https://fr.wikinews.org' },
  ];

  let wikiAbort = null;

  function cacheWiki(key, data) {
    if (Object.keys(state.wikiCache).length >= CACHE_MAX) {
      const firstKey = Object.keys(state.wikiCache)[0];
      delete state.wikiCache[firstKey];
    }
    state.wikiCache[key] = data;
  }

  async function wikiSearchSource(domain, query, signal, limit) {
    const url = `${domain}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit || 5}&format=json&origin=*`;
    const data = await fetchJSON(url, signal);
    return data.query ? data.query.search : [];
  }

  async function wikiGetExtract(domain, title, signal) {
    const url = `${domain}/w/api.php?action=query&prop=extracts|pageimages&exintro&explaintext&titles=${encodeURIComponent(title)}&pithumbsize=600&format=json&origin=*`;
    const data = await fetchJSON(url, signal);
    const pages = data.query && data.query.pages;
    if (!pages) return null;
    const key = Object.keys(pages)[0];
    if (key === '-1') return null;
    return pages[key];
  }

  async function wikiGetWiktionaryDefs(title, signal) {
    const domain = 'https://fr.wiktionary.org';
    const url = `${domain}/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&origin=*`;
    const data = await fetchJSON(url, signal);
    if (!data?.parse?.text?.['*']) return null;
    const div = document.createElement('div');
    div.innerHTML = data.parse.text['*'];
    const secFr = div.querySelector('.mw-heading3, h3');
    let defs = [], currentPos = '';
    if (secFr) {
      let el = secFr.nextElementSibling;
      while (el && !el.matches?.('.mw-heading3, h3, .mw-heading2, h2')) {
        if (el.matches?.('h4, .mw-heading4')) {
          currentPos = el.textContent.trim();
        } else if (el.matches?.('ol, ul')) {
          el.querySelectorAll('li').forEach(li => {
            const t = li.textContent.trim().replace(/\s+/g, ' ').replace(/^[①-⑳\d+.]\s*/, '');
            if (t && t.length > 2) defs.push({ text: t, pos: currentPos || 'Définition' });
          });
        }
        el = el.nextElementSibling;
      }
    }
    if (!defs.length) {
      div.querySelectorAll('ol li, ul li').forEach(li => {
        const t = li.textContent.trim().replace(/\s+/g, ' ');
        if (t && t.length > 2) defs.push({ text: t, pos: 'Définition' });
      });
    }
    return defs.slice(0, 10);
  }

  function getWikiSource(id) {
    if (id === 'all') return null;
    return WIKI_SOURCES.find(s => s.id === id) || WIKI_SOURCES[0];
  }

  async function handleWikiSearch(query) {
    if (!query.trim()) return;
    if (wikiAbort) wikiAbort.abort();
    wikiAbort = new AbortController();
    const signal = wikiAbort.signal;
    const q = query.trim();

    addHistory('infohub-wiki-history', q);

    if (state.currentWikiCat === 'all') {
      await handleUnifiedSearch(q, signal);
    } else {
      await handleSingleWikiSearch(q, signal);
    }
  }

  async function handleUnifiedSearch(q, signal) {
    const cacheKey = 'all_' + q.toLowerCase();
    if (state.wikiCache[cacheKey]) {
      renderUnifiedResults(state.wikiCache[cacheKey]);
      dom.wikiResult.style.display = 'block';
      dom.wikiContent.style.display = 'none';
      return;
    }

    dom.wikiResult.style.display = 'block';
    dom.wikiResult.innerHTML = '<div class="loading-state">Recherche sur tous les wikis...</div>';
    dom.wikiContent.style.display = 'none';

    try {
      const results = await Promise.allSettled(
        WIKI_SOURCES.map(src =>
          wikiSearchSource(src.domain, q, signal, 4)
            .then(res => ({ source: src, results: res }))
            .catch(() => ({ source: src, results: [] }))
        )
      );
      if (signal.aborted) return;

      const sources = results.map(r => r.value).filter(s => s.results.length);
      if (!sources.length) {
        dom.wikiResult.innerHTML = '<div class="error-state"><p>Aucun résultat trouvé sur les wikis.</p></div>';
        return;
      }

      renderUnifiedResults(sources);
      cacheWiki(cacheKey, sources);
    } catch (e) {
      if (e.name === 'AbortError') return;
      dom.wikiResult.innerHTML = '<div class="error-state"><p>Erreur de connexion aux wikis.</p></div>';
    }
  }

  function renderUnifiedResults(sources) {
    let html = '<div class="wiki-results">';

    sources.forEach(({ source, results }) => {
      const domain = source.domain;
      html += `
        <div class="wiki-source-section">
          <div class="wiki-source-header" data-toggle="${source.id}">
            <span class="source-dot"></span>
            <span class="source-name">${sanitize(source.label)}</span>
            <span class="source-count">${results.length}</span>
            <span class="source-toggle">❯</span>
          </div>
          <div class="wiki-source-body">
      `;

      results.forEach(r => {
        const enc = encodeURIComponent(r.title);
        html += `
          <div class="wiki-entry">
            <div class="wiki-entry-title">
              <a href="${domain}/wiki/${enc}" target="_blank" rel="noopener noreferrer" class="wiki-entry-link">${sanitize(r.title)}</a>
              <button class="wiki-expand-btn" data-domain="${domain}" data-title="${sanitize(r.title)}" title="Afficher l'article complet">❯</button>
            </div>
            <div class="wiki-entry-desc">${sanitize(truncate(stripHtml(r.snippet || ''), 240))}</div>
            <div class="wiki-entry-full" style="display:none"></div>
          </div>
        `;
      });

      html += `</div></div>`;
    });

    html += '</div>';
    dom.wikiResult.innerHTML = html;

    dom.wikiResult.querySelectorAll('.wiki-source-header').forEach(hdr => {
      hdr.addEventListener('click', () => {
        const body = hdr.nextElementSibling;
        const toggle = hdr.querySelector('.source-toggle');
        if (body) {
          const wasCollapsed = body.classList.contains('collapsed');
          body.classList.toggle('collapsed');
          if (toggle) toggle.textContent = wasCollapsed ? 'v' : '❯';
        }
      });
    });

    attachWikiExpand();
  }

  function attachWikiExpand() {
    dom.wikiResult.querySelectorAll('.wiki-expand-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const entry = btn.closest('.wiki-entry');
        const fullDiv = entry.querySelector('.wiki-entry-full');
        if (!fullDiv) return;

        if (fullDiv.style.display === 'block') {
          fullDiv.style.display = 'none';
          btn.textContent = '❯';
          btn.title = "Afficher l'article complet";
          return;
        }

        const domn = btn.dataset.domain;
        const title = btn.dataset.title;
        if (!domn || !title) return;

        fullDiv.innerHTML = '<div class="loading-state" style="padding:16px 0">Chargement…</div>';
        fullDiv.style.display = 'block';
        btn.textContent = 'v';
        btn.title = 'Réduire';

        try {
          const ac = new AbortController();
          const tmr = setTimeout(() => ac.abort(), 10000);
          let html = '';

          if (domn.includes('wiktionary')) {
            const defs = await wikiGetWiktionaryDefs(title, ac.signal);
            clearTimeout(tmr);
            if (defs && defs.length) {
              let lastPos = '';
              defs.forEach(d => {
                if (d.pos !== lastPos) {
                  html += `<div style="font-size:11px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:0.5px;margin:8px 0 4px">${sanitize(d.pos)}</div>`;
                  lastPos = d.pos;
                }
                html += `<div style="padding:4px 0 4px 12px;border-left:2px solid var(--accent);margin-bottom:4px;font-size:13px">${sanitize(d.text)}</div>`;
              });
              const lbl = btn.closest('.wiki-source-section')?.querySelector('.source-name')?.textContent || 'le wiki';
              html += `<p style="margin-top:10px"><a href="${domn}/wiki/${encodeURIComponent(title)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent);font-size:13px">Lire sur ${sanitize(lbl)} →</a></p>`;
            } else {
              html = '<p style="color:var(--text-dim)">Aucune définition trouvée.</p>';
            }
          } else {
            const page = await wikiGetExtract(domn, title, ac.signal);
            clearTimeout(tmr);
            if (!page || !page.extract) {
              fullDiv.innerHTML = '<p style="color:var(--text-dim)">Contenu non disponible.</p>';
              return;
            }
            const paragraphs = page.extract.split('\n').filter(p => p.trim()).map(p => sanitize(p));
            const thumb = page.thumbnail ? page.thumbnail.source : '';
            if (thumb) html += `<img src="${sanitize(thumb)}" alt="" loading="lazy">`;
            html += paragraphs.map(p => `<p>${p}</p>`).join('');
            const lbl = btn.closest('.wiki-source-section')?.querySelector('.source-name')?.textContent || 'le wiki';
            html += `<p style="margin-top:10px"><a href="${domn}/wiki/${encodeURIComponent(title)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent);font-size:13px">Lire sur ${sanitize(lbl)} →</a></p>`;
          }

          fullDiv.innerHTML = '';
          typewrite(fullDiv, html);
        } catch (_) {
          fullDiv.innerHTML = '<p style="color:var(--text-dim)">Erreur de chargement.</p>';
        }
      });
    });
  }

  async function handleSingleWikiSearch(q, signal) {
    const src = getWikiSource(state.currentWikiCat);
    const cacheKey = src.id + '_' + q.toLowerCase();
    if (state.wikiCache[cacheKey]) {
      renderSingleWikiResults(src, state.wikiCache[cacheKey]);
      dom.wikiResult.style.display = 'block';
      dom.wikiContent.style.display = 'none';
      return;
    }

    dom.wikiResult.style.display = 'block';
    dom.wikiResult.innerHTML = '<div class="loading-state">Recherche sur ' + sanitize(src.label) + '...</div>';
    dom.wikiContent.style.display = 'none';

    try {
      const results = await wikiSearchSource(src.domain, q, signal, 10);
      if (signal.aborted) return;

      if (!results.length) {
        dom.wikiResult.innerHTML = '<div class="error-state"><p>Aucun résultat sur ' + sanitize(src.label) + '.</p></div>';
        return;
      }

      renderSingleWikiResults(src, results);
      cacheWiki(cacheKey, results);
    } catch (e) {
      if (e.name === 'AbortError') return;
      dom.wikiResult.innerHTML = '<div class="error-state"><p>Erreur de connexion à ' + sanitize(src.label) + '.</p></div>';
    }
  }

  function renderSingleWikiResults(source, results) {
    const domain = source.domain;
    let html = '<div class="wiki-results">';

    results.forEach(r => {
      const enc = encodeURIComponent(r.title);
      html += `
        <div class="wiki-entry">
          <div class="wiki-entry-title">
            <a href="${domain}/wiki/${enc}" target="_blank" rel="noopener noreferrer" class="wiki-entry-link">${sanitize(r.title)}</a>
            <button class="wiki-expand-btn" data-domain="${domain}" data-title="${sanitize(r.title)}" title="Afficher l'article complet">❯</button>
          </div>
          <div class="wiki-entry-desc">${sanitize(truncate(stripHtml(r.snippet || ''), 240))}</div>
          <div class="wiki-entry-full" style="display:none"></div>
        </div>
      `;
    });

    html += '</div>';
    dom.wikiResult.innerHTML = html;
    attachWikiExpand();
  }

  /* --- WEATHER --- */
  async function loadWeather(city) {
    dom.weatherContent.style.display = 'none';
    dom.weatherResult.style.display = 'block';
    dom.weatherResult.innerHTML = '<div class="loading-state">Chargement de la météo...</div>';
    try {
      const ac = new AbortController();
      const tmr = setTimeout(() => ac.abort(), 10000);
      const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?lang=fr&format=j1`, { signal: ac.signal });
      clearTimeout(tmr);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      if (!data.current_condition || !data.current_condition[0]) throw new Error('No data');
      const cc = data.current_condition[0];
      const weather = (data.weather || []).slice(0, 3);
      const locName = sanitize(data.nearest_area?.[0]?.areaName?.[0]?.value || city);

      function getTodayHourly(hours) {
        if (!hours || !hours.length) return [];
        const now = new Date();
        const curH = now.getHours();
        return hours.filter(h => {
          const hour = Math.floor(parseInt(h.time, 10) / 100);
          return hour >= curH;
        }).slice(0, 8).map(h => ({
          hour: Math.floor(parseInt(h.time, 10) / 100),
          temp: h.tempC,
          code: h.weatherCode,
          feels: h.FeelsLikeC,
        }));
      }

      function hourlyPrecip(hours) {
        if (!hours || !hours.length) return 0;
        return hours.reduce((sum, h) => sum + (parseFloat(h.precipMM) || 0), 0);
      }

      const todayHourly = getTodayHourly(weather[0]?.hourly);

      dom.weatherResult.innerHTML = `
        <div class="weather-card">
          <div class="weather-current">
            <div class="weather-current-temp">
              <span class="weather-current-icon">${getWeatherEmoji(cc.weatherCode)}</span>
              <span class="weather-current-deg">${Math.round(parseFloat(cc.temp_C))}°</span>
            </div>
            <div class="weather-current-desc">${sanitize(cc.lang_fr?.[0]?.value || cc.weatherDesc?.[0]?.value || '')}</div>
            <div class="weather-current-loc">${locName}</div>
            <div class="weather-current-hilo">
              H: ${Math.round(parseFloat(weather[0]?.maxtempC || cc.temp_C))}° &nbsp; L: ${Math.round(parseFloat(weather[0]?.mintempC || cc.temp_C))}°
            </div>
          </div>

          <div class="weather-section-label">DÉTAILS</div>
          <div class="weather-detail-strip">
            <div class="weather-ds-item">
              <span class="weather-ds-label">Humidité</span>
              <span class="weather-ds-value">${cc.humidity || '—'}%</span>
            </div>
            <div class="weather-ds-item">
              <span class="weather-ds-label">Vent</span>
              <span class="weather-ds-value">${cc.windspeedKmph ? Math.round(parseFloat(cc.windspeedKmph)) + ' km/h' : '—'}</span>
            </div>
            <div class="weather-ds-item">
              <span class="weather-ds-label">Ressenti</span>
              <span class="weather-ds-value">${Math.round(parseFloat(cc.FeelsLikeC || 0))}°</span>
            </div>
            <div class="weather-ds-item">
              <span class="weather-ds-label">Pression</span>
              <span class="weather-ds-value">${cc.pressure ? cc.pressure + ' hPa' : '—'}</span>
            </div>
            <div class="weather-ds-item">
              <span class="weather-ds-label">Visibilité</span>
              <span class="weather-ds-value">${cc.visibility ? cc.visibility + ' km' : '—'}</span>
            </div>
          </div>

          ${todayHourly.length ? `
          <div class="weather-section-label">AUJOURD'HUI</div>
          <div class="weather-hourly-strip">
            ${todayHourly.map(h => `
              <div class="weather-hourly-cell">
                <div class="weather-hourly-cell-time">${String(h.hour).padStart(2, '0')}:00</div>
                <div class="weather-hourly-cell-icon">${getWeatherEmoji(h.code)}</div>
                <div class="weather-hourly-cell-temp">${Math.round(parseFloat(h.temp || 0))}°</div>
              </div>
            `).join('')}
          </div>` : ''}

          <div class="weather-section-label">PRÉVISIONS</div>
          <div class="mf-days">
            ${weather.map((d, idx) => `
              <div class="mf-day-card">
                <div class="mf-day-header">${idx === 0 ? "Aujourd'hui" : formatDay(d.date)}</div>
                <div class="mf-day-body">
                  <span class="mf-day-icon">${getWeatherEmoji(d.hourly?.[0]?.weatherCode)}</span>
                  <div class="mf-day-temps">
                    <span class="mf-day-high">${Math.round(parseFloat(d.maxtempC || 0))}°</span>
                    <span class="mf-day-low">${Math.round(parseFloat(d.mintempC || 0))}°</span>
                  </div>
                </div>
                <div class="mf-day-infos">
                  <span class="mf-day-info">
                    <span class="mf-day-info-label">Pluie</span>
                    <span>${hourlyPrecip(d.hourly) > 0 ? hourlyPrecip(d.hourly).toFixed(1) + 'mm' : '—'}</span>
                  </span>
                  <span class="mf-day-info">
                    <span class="mf-day-info-label">Vent</span>
                    <span>${cc.windspeedKmph ? Math.round(parseFloat(cc.windspeedKmph)) + 'km/h' : '—'}</span>
                  </span>
                  <span class="mf-day-info">
                    <span class="mf-day-info-label">UV</span>
                    <span>${idx === 0 ? (cc.uvIndex || '—') : '—'}</span>
                  </span>
                </div>
                <button class="weather-daily-btn mf-day-btn" data-idx="${idx}" title="Détails"><span class="arrow">❯</span> Détails</button>
                <div class="weather-daily-detail" id="forecast-${idx}" style="display:none">
                  <div class="weather-daily-detail-grid">
                    <div class="weather-dd-item">
                      <span class="weather-dd-label">Lever</span>
                      <span class="weather-dd-val">${sanitize(d.astronomy?.[0]?.sunrise || '—')}</span>
                    </div>
                    <div class="weather-dd-item">
                      <span class="weather-dd-label">Coucher</span>
                      <span class="weather-dd-val">${sanitize(d.astronomy?.[0]?.sunset || '—')}</span>
                    </div>
                    <div class="weather-dd-item">
                      <span class="weather-dd-label">Humidité</span>
                      <span class="weather-dd-val">${cc.humidity || '—'}%</span>
                    </div>
                    <div class="weather-dd-item">
                      <span class="weather-dd-label">Ressenti</span>
                      <span class="weather-dd-val">${Math.round(parseFloat(cc.FeelsLikeC || 0))}°</span>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      dom.weatherResult.querySelectorAll('.weather-daily-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const idx = btn.dataset.idx;
          const detail = document.getElementById('forecast-' + idx);
          if (!detail) return;
          const isOpen = detail.style.display !== 'none';
          detail.style.display = isOpen ? 'none' : 'block';
          btn.classList.toggle('open', !isOpen);
        });
      });
    } catch (e) {
      dom.weatherResult.innerHTML = '<div class="error-state"><p>Impossible de charger la météo pour cette ville.</p></div>';
    }
  }

  function getWeatherEmoji(code) {
    const map = {
      '113': '☀️', '116': '🌤', '119': '☁️', '122': '☁️', '143': '🌫',
      '176': '🌦', '179': '🌧', '182': '🌧', '185': '🌧', '200': '⛈',
      '227': '🌨', '230': '❄️', '248': '🌫', '260': '🌫', '263': '🌦',
      '266': '🌦', '281': '🌧', '284': '🌧', '293': '🌦', '296': '🌦',
      '299': '🌧', '302': '🌧', '305': '🌧', '308': '🌧', '311': '🌧',
      '314': '🌧', '317': '🌧', '320': '🌨', '323': '🌨', '326': '🌨',
      '329': '❄️', '332': '❄️', '335': '❄️', '338': '❄️', '350': '🧊',
      '353': '🌦', '356': '🌧', '359': '🌧', '362': '🌧', '365': '🌧',
      '368': '🌨', '371': '❄️', '374': '🌧', '377': '🌧', '386': '⛈',
      '389': '⛈', '392': '⛈', '395': '❄️',
    };
    return map[code] || '🌤';
  }

  function formatDay(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
  }

  /* --- CRYPTO --- */
  let cryptoData = [];
  let cryptoFilter = '';
  let cryptoRawFilter = '';
  let cryptoShowAll = false;

  async function loadCrypto() {
    const el = dom.cryptoResult;
    if (!el) return;
    el.innerHTML = '<div class="loading-state">Chargement des cours...</div>';
    try {
      const ac = new AbortController();
      const tmr = setTimeout(() => ac.abort(), 15000);
      const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=50&page=1&sparkline=false', { signal: ac.signal });
      clearTimeout(tmr);
      if (!res.ok) throw new Error('API error ' + res.status);
      cryptoData = await res.json();
      cryptoShowAll = false;
      cryptoFilter = '';
      cryptoRawFilter = '';
      const searchInput = document.getElementById('cryptoSearch');
      if (searchInput) searchInput.value = '';
      renderCrypto();
    } catch (e) {
      el.innerHTML = '<div class="error-state">Erreur de chargement des cours crypto.</div>';
    }
  }

  function renderCrypto() {
    const el = dom.cryptoResult;
    if (!el) return;

    const filtered = cryptoFilter
      ? cryptoData.filter(c => c.name.toLowerCase().includes(cryptoFilter) || c.symbol.toLowerCase().includes(cryptoFilter))
      : cryptoData;

    const visible = cryptoShowAll ? filtered : filtered.slice(0, 8);

    let html = `
      <div class="crypto-grid">
        ${visible.map(c => {
          const change = c.price_change_percentage_24h || 0;
          const cls = change >= 0 ? 'up' : 'down';
          const arrow = change >= 0 ? '▲' : '▼';
          const price = c.current_price != null ? c.current_price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
          return `
            <div class="crypto-card">
              <div class="crypto-header">
                <img src="${sanitize(c.image)}" alt="" class="crypto-icon-img" loading="lazy" onerror="this.style.display='none'">
                <span class="crypto-name">${sanitize(c.name)}</span>
                <span class="crypto-ticker">${sanitize(c.symbol.toUpperCase())}</span>
              </div>
              <div class="crypto-price">${price} €</div>
              <div class="crypto-rank">${c.market_cap_rank ? '#' + c.market_cap_rank : ''}</div>
              <div class="crypto-change ${cls}">
                ${arrow} ${Math.abs(change).toFixed(2)}%
              </div>
            </div>`;
        }).join('')}
      </div>
      <p style="font-size:11px;color:var(--text-dim);margin-top:8px;text-align:center">Via CoinGecko.com</p>
    `;

    if (filtered.length > 8 && !cryptoShowAll) {
      html += `<button class="crypto-more-btn" id="crypto-show-more">Afficher plus (${filtered.length - 8})</button>`;
    }
    if (cryptoShowAll && filtered.length > 8) {
      html += `<button class="crypto-more-btn" id="crypto-show-less">Afficher moins</button>`;
    }

    el.innerHTML = html;

    const showMore = document.getElementById('crypto-show-more');
    if (showMore) {
      showMore.addEventListener('click', () => {
        cryptoShowAll = true;
        renderCrypto();
      });
    }

    const showLess = document.getElementById('crypto-show-less');
    if (showLess) {
      showLess.addEventListener('click', () => {
        cryptoShowAll = false;
        renderCrypto();
      });
    }
  }

  /* --- NAVIGATION --- */
  function switchSection(id) {
    dom.navBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.section === id);
      b.setAttribute('aria-current', b.dataset.section === id ? 'page' : 'false');
    });
    dom.sections.forEach(s => s.classList.toggle('active', s.id === `section-${id}`));

    if (id === 'wiki') {
      const hist = loadHistory('infohub-wiki-history');
      renderHistory(dom.wikiHistory, hist, v => { dom.wikiSearch.value = v; handleWikiSearch(v); }, 'infohub-wiki-history');
    }
    if (id === 'weather') {
      const city = dom.weatherCity.value.trim() || 'Paris';
      loadWeather(city);
    }
    if (id === 'crypto') loadCrypto();
  }

  function switchCategory(cat) {
    state.currentCat = cat;
    dom.catBtns.forEach(b => {
      const active = b.dataset.category === cat;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    filterAndRender();
  }

  function switchWikiCat(cat) {
    state.currentWikiCat = cat;
    dom.wikiCatBtns.forEach(b => {
      const active = b.dataset.wiki === cat;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    const q = dom.wikiSearch.value.trim();
    if (q) handleWikiSearch(q);
  }

  /* --- EVENTS --- */
  function init() {
    initTheme();

    dom.navBtns.forEach(btn => {
      btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });

    dom.catBtns.forEach(btn => {
      btn.addEventListener('click', () => switchCategory(btn.dataset.category));
    });

    dom.newsGrid.addEventListener('click', e => {
      const card = e.target.closest('.news-card');
      if (!card) return;
      const id = parseInt(card.dataset.id, 10);
      const a = findArticleById(id);
      if (a) openArticle(a);
    });
    dom.newsGrid.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.news-card');
        if (!card) return;
        e.preventDefault();
        const id = parseInt(card.dataset.id, 10);
        const a = findArticleById(id);
        if (a) openArticle(a);
      }
    });

    dom.articleClose.addEventListener('click', closeArticle);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeArticle();
    });

    dom.shareBtn.addEventListener('click', shareArticle);
    dom.themeBtn.addEventListener('click', toggleTheme);
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', hardReset);

    dom.wikiCatBtns.forEach(btn => {
      btn.addEventListener('click', () => switchWikiCat(btn.dataset.wiki));
    });

    function doWiki() { handleWikiSearch(dom.wikiSearch.value); }
    dom.wikiSearchBtn.addEventListener('click', doWiki);
    dom.wikiSearch.addEventListener('keydown', e => { if (e.key === 'Enter') doWiki(); });
    dom.wikiSearch.addEventListener('input', debounce(() => {
      if (dom.wikiSearch.value.trim().length >= 3) doWiki();
    }, 500));

    dom.weatherCityBtn.addEventListener('click', () => {
      const city = dom.weatherCity.value.trim();
      if (city) loadWeather(city);
    });
    dom.weatherCity.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const city = dom.weatherCity.value.trim();
        if (city) loadWeather(city);
      }
    });

    dom.cryptoRefreshBtn?.addEventListener('click', loadCrypto);

    const cryptoSrch = document.getElementById('cryptoSearch');
    if (cryptoSrch) {
      cryptoSrch.addEventListener('input', e => {
        cryptoRawFilter = e.target.value;
        cryptoFilter = cryptoRawFilter.toLowerCase().trim();
        cryptoShowAll = false;
        renderCrypto();
      });
    }

    dom.notif.addEventListener('click', () => dom.notif.classList.remove('show'));

    document.addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === '1') switchSection('news');
      if (e.key === '2') switchSection('wiki');
      if (e.key === '3') switchSection('weather');
      if (e.key === '4') switchSection('crypto');
      if (e.key === 'r' || e.key === 'R') loadAllFeeds();
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    loadAllFeeds();
  }

  document.addEventListener('DOMContentLoaded', init);

  window.__INFOHUB = { state, loadAllFeeds, handleWikiSearch, loadWeather, loadCrypto };
})();
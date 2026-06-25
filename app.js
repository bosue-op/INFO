(function () {
  'use strict';

  const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json';
  const FEED_CACHE_TTL = 30 * 60 * 1000;

  const COUNTRY_CONFIGS = {
    fr: {
      name: 'France', lang: 'fr', emoji: '🇫🇷', defaultCity: 'Paris',
      feeds: [
        { id: 'lemonde',    name: 'Le Monde',      url: 'https://www.lemonde.fr/rss/une.xml',        cat: 'general' },
        { id: 'franceinfo', name: 'France Info',   url: 'https://www.francetvinfo.fr/titres.rss',    cat: 'general' },
        { id: 'lequipe',    name: "L'Équipe",      url: 'https://dwh.lequipe.fr/api/edito/rss?path=/', cat: 'sport'   },
        { id: 'lequipefoot', name: "L'Équipe Foot", url: 'https://dwh.lequipe.fr/api/edito/rss?path=/Football/', cat: 'sport' },
        { id: 'numerama',   name: 'Numerama',      url: 'https://www.numerama.com/feed/',            cat: 'tech'    },
        { id: '01net',      name: '01net',         url: 'https://www.01net.com/rss/actualites/',     cat: 'tech'    },
      ]
    },
    us: {
      name: 'USA', lang: 'en', emoji: '🇺🇸', defaultCity: 'New York',
      feeds: [
        { id: 'cnn',        name: 'CNN',          url: 'http://rss.cnn.com/rss/edition.rss',         cat: 'general' },
        { id: 'npr',        name: 'NPR',          url: 'https://feeds.npr.org/1001/rss.xml',         cat: 'general' },
        { id: 'espn',       name: 'ESPN',         url: 'https://www.espn.com/espn/rss/news',          cat: 'sport'   },
        { id: 'sportingnews', name: 'Sporting News', url: 'https://www.sportingnews.com/us/rss',      cat: 'sport'   },
        { id: 'theverge',   name: 'The Verge',    url: 'https://www.theverge.com/rss/index.xml',     cat: 'tech'    },
        { id: 'arstechnica', name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', cat: 'tech' },
      ]
    },
    gb: {
      name: 'Royaume-Uni', lang: 'en', emoji: '🇬🇧', defaultCity: 'London',
      feeds: [
        { id: 'guardian',   name: 'The Guardian',  url: 'https://www.theguardian.com/uk/rss',        cat: 'general' },
        { id: 'standard',   name: 'Evening Standard', url: 'https://www.standard.co.uk/rss',         cat: 'general' },
        { id: 'bbcsport',   name: 'BBC Sport',    url: 'https://feeds.bbci.co.uk/sport/rss.xml',     cat: 'sport'   },
        { id: 'guardiansport', name: 'Guardian Sport', url: 'https://www.theguardian.com/uk/sport/rss', cat: 'sport' },
        { id: 'bbctech',    name: 'BBC Tech',     url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', cat: 'tech' },
        { id: 'techradar',  name: 'TechRadar',    url: 'https://www.techradar.com/rss',              cat: 'tech'    },
      ]
    },
    de: {
      name: 'Allemagne', lang: 'de', emoji: '🇩🇪', defaultCity: 'Berlin',
      feeds: [
        { id: 'spiegel',    name: 'Der Spiegel',  url: 'https://www.spiegel.de/schlagzeilen/index.rss', cat: 'general' },
        { id: 'zeit',       name: 'Die Zeit',     url: 'https://newsfeed.zeit.de/index',              cat: 'general' },
        { id: 'kicker',     name: 'Kicker',       url: 'https://newsfeed.kicker.de/news/aktuell',     cat: 'sport'   },
        { id: 'sportschau', name: 'Sportschau',   url: 'https://www.sportschau.de/index~rss2.xml',    cat: 'sport'   },
        { id: 'heise',      name: 'Heise',        url: 'https://www.heise.de/rss/heise.rdf',          cat: 'tech'    },
        { id: 'golem',      name: 'Golem',        url: 'https://rss.golem.de/rss.php?feed=RSS2.0',    cat: 'tech'    },
      ]
    },
    es: {
      name: 'Espagne', lang: 'es', emoji: '🇪🇸', defaultCity: 'Madrid',
      feeds: [
        { id: 'elpais',     name: 'El País',      url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada', cat: 'general' },
        { id: 'elmundo',    name: 'El Mundo',     url: 'https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml', cat: 'general' },
        { id: 'marca',      name: 'Marca',        url: 'https://www.marca.com/rss/portada.xml',       cat: 'sport'   },
        { id: 'as',         name: 'AS',           url: 'https://feeds.as.com/mrss-s/pages/as/site/as.com/portada', cat: 'sport'   },
        { id: 'genbeta',    name: 'Genbeta',      url: 'https://www.genbeta.com/feedburner.xml',       cat: 'tech'    },
        { id: 'xataka',     name: 'Xataka',       url: 'https://www.xataka.com/feedburner.xml',        cat: 'tech'    },
      ]
    },
    it: {
      name: 'Italie', lang: 'it', emoji: '🇮🇹', defaultCity: 'Rome',
      feeds: [
        { id: 'repubblica', name: 'La Repubblica', url: 'https://www.repubblica.it/rss/homepage/rss2.0.xml', cat: 'general' },
        { id: 'corriere',   name: 'Corriere della Sera', url: 'https://www.corriere.it/rss/homepage.xml', cat: 'general' },
        { id: 'gazzetta',   name: 'La Gazzetta',  url: 'https://www.gazzetta.it/dynamic-feed/rss/section/last.xml', cat: 'sport' },
        { id: 'corrieredellosport', name: 'Corriere dello Sport', url: 'https://www.corrieredellosport.it/rss/', cat: 'sport' },
        { id: 'tomshw',     name: "Tom's Hardware", url: 'https://www.tomshw.it/feed/',                cat: 'tech'    },
        { id: 'webnews',    name: 'Webnews',      url: 'https://www.webnews.it/feed/',                 cat: 'tech'    },
      ]
    },
  };

  const DEFAULT_COUNTRY = 'fr';

  const CACHE_MAX = 50;

  const state = {
    articles: [], currentCat: 'all', filtered: [],
    wikiCache: {}, articleId: 0,
    currentArticle: null,
    currentCountry: DEFAULT_COUNTRY,
    loading: false, pendingCat: null, feedAbort: null,
    weatherCountry: DEFAULT_COUNTRY,
  };

  const $ = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => [...(p || document).querySelectorAll(s)];

  const dom = {
    navBtns: $$('.nav-btn'), sections: $$('.section'),
    catBtns: $$('.cat-btn'), newsGrid: $('#newsGrid'),
    wikiSearch: $('#wikiSearch'), wikiSearchBtn: $('#wikiSearchBtn'),
    wikiContent: $('#wikiContent'), wikiResult: $('#wikiResult'),
    wikiHistory: $('#wikiHistory'),
    articleView: $('#articleView'), articleBody: $('#articleBody'),
    articleClose: $('#articleClose'), notif: $('.notification'),
    shareBtn: $('#shareBtn'),
    translateBtn: $('#translateBtn'),
    countrySelect: $('#countrySelect'),
    weatherCountrySelect: $('#weatherCountrySelect'),
    themeBtn: $('#themeBtn'),
    weatherContent: $('#weatherContent'), weatherResult: $('#weatherResult'),
    weatherCity: $('#weatherCity'), weatherCityBtn: $('#weatherCityBtn'),
    cryptoRefreshBtn: $('#cryptoRefreshBtn'),
    cryptoResult: $('#cryptoResult'),
  };

  let cryptoShowAll = false;
  let cryptoRawFilter = '';
  let cryptoFilter = '';

  function sanitize(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function truncate(s, l) { return s && s.length > l ? s.slice(0, l) + '…' : s || ''; }

  function stripHtml(s) { return s ? s.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim() : ''; }

  function extractImg(html) {
    if (!html) return '';
    const m = html.match(/<img[^>]+src=["']([^"']+)["']/);
    return m ? m[1] : '';
  }

  function simpleHash(s) {
    let h = 0;
    for (let i = 0; i < (s || '').length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
    return Math.abs(h);
  }

  function formatDate(s) {
    if (!s) return '';
    const d = new Date(s);
    if (isNaN(d)) return s;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function typewrite(el, html) {
    if (!el) return;
    let idx = 0;
    el.innerHTML = '<span class="typing-cursor"></span>';
    const step = () => {
      if (idx >= html.length) { el.innerHTML = html; return; }
      const chunk = html.slice(idx, idx + 5);
      idx += 5;
      el.innerHTML = html.slice(0, idx) + '<span class="typing-cursor"></span>';
      requestAnimationFrame(step);
    };
    step();
  }

  function notify(msg) {
    dom.notif.textContent = msg;
    dom.notif.classList.add('show');
    clearTimeout(window._notifTimer);
    window._notifTimer = setTimeout(() => dom.notif.classList.remove('show'), 3000);
  }

  async function fetchJSON(url, signalOrMs) {
    let signal, tid;
    if (signalOrMs instanceof AbortSignal) { signal = signalOrMs; }
    else if (typeof signalOrMs === 'number') { const ac = new AbortController(); tid = setTimeout(() => ac.abort(), signalOrMs); signal = ac.signal; }
    try {
      const res = await fetch(url, { signal, headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    } finally { if (tid) clearTimeout(tid); }
  }

  function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  function loadHistory(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  }

  function saveHistory(key, items) {
    try { localStorage.setItem(key, JSON.stringify(items.slice(0, 15))); } catch {}
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

  function feedCacheKey(feed) { return 'infohub-feed-' + feed.id + '-' + state.currentCountry; }

  function feedCacheGet(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.ts < FEED_CACHE_TTL) return parsed.items;
    } catch {}
    return null;
  }

  function feedCacheSet(key, items) {
    try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), items })); } catch {}
  }

  function parseFeedXML(xmlDoc, feed) {
    const raw = [];
    const rssItems = xmlDoc.getElementsByTagName('item');
    if (rssItems.length) {
      for (const el of rssItems) {
        const gt = t => el.getElementsByTagName(t)[0]?.textContent || '';
        const le = el.getElementsByTagName('link')[0];
        raw.push({
          title: gt('title') || '(Sans titre)',
          desc: stripHtml(gt('description')),
          link: le?.textContent || le?.getAttribute('href') || '#',
          date: gt('pubDate') || gt('dc:date'),
          img: extractImg(gt('content:encoded') || gt('description')) || '',
        });
      }
    } else {
      const atom = xmlDoc.getElementsByTagName('entry');
      for (const el of atom) {
        const gt = t => el.getElementsByTagName(t)[0]?.textContent || '';
        const le = el.getElementsByTagName('link')[0];
        const summary = gt('summary');
        const content = gt('content') || summary;
        raw.push({
          title: gt('title') || '(Sans titre)',
          desc: stripHtml(summary || content),
          link: le?.getAttribute('href') || le?.textContent || '#',
          date: gt('published') || gt('updated'),
          img: extractImg(content) || '',
        });
      }
    }
    if (!raw.length) return [];
    return raw.map((item, i) => ({
      ...item,
      img: item.img || `https://picsum.photos/seed/${simpleHash(item.title + feed.id + i)}/400/250`,
      source: feed.name, category: feed.cat, feedId: feed.id,
    }));
  }

  async function loadFeedViaProxy(feed) {
    const proxies = ['https://api.allorigins.win/raw?url=', 'https://corsproxy.io/?url='];
    for (const proxy of proxies) {
      try {
        const ac = new AbortController();
        const tmr = setTimeout(() => ac.abort(), 8000);
        const res = await fetch(proxy + encodeURIComponent(feed.url), { signal: ac.signal });
        clearTimeout(tmr);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const xmlText = await res.text();
        const xml = new DOMParser().parseFromString(xmlText, 'text/xml');
        if (xml.querySelector('parsererror')) throw new Error('Bad XML');
        const items = parseFeedXML(xml, feed);
        if (items.length) return items;
      } catch (e) {
        if (e.name !== 'AbortError') console.warn(feed.name + ' proxy:', e.message || e);
      }
    }
    return [];
  }

  async function loadFeed(feed) {
    const cacheKey = feedCacheKey(feed);
    const cached = feedCacheGet(cacheKey);
    if (cached) return cached;

    let items;
    try {
      const d = await fetchJSON(`${RSS2JSON_API}?rss_url=${encodeURIComponent(feed.url)}`, 12000);
      if (d.status === 'ok' && d.items?.length) {
        items = d.items.map(item => ({
          title: item.title || '(Sans titre)',
          desc: stripHtml(item.description || ''),
          link: item.link || '#',
          date: item.pubDate || '',
          img: item.thumbnail || item.enclosure?.link || extractImg(item.content || '') || extractImg(item.description || '') || `https://picsum.photos/seed/${simpleHash(item.title || item.link)}/400/250`,
          source: feed.name, category: feed.cat, feedId: feed.id,
        }));
      }
    } catch {}

    if (!items || !items.length) {
      items = await loadFeedViaProxy(feed);
    }

    if (items && items.length) {
      feedCacheSet(cacheKey, items);
      return items;
    }
    return [];
  }

  function getCurrentFeeds() {
    const cfg = COUNTRY_CONFIGS[state.currentCountry];
    return cfg ? cfg.feeds : COUNTRY_CONFIGS[DEFAULT_COUNTRY].feeds;
  }

  async function loadAllFeeds() {
    if (state.feedAbort) state.feedAbort.abort();
    state.feedAbort = new AbortController();
    const signal = state.feedAbort.signal;

    state.loading = true;
    dom.newsGrid.innerHTML = '<div class="loading-state">Chargement des actualités…</div>';
    const feeds = getCurrentFeeds();
    const results = [];
    const BATCH_SIZE = 2;
    for (let i = 0; i < feeds.length; i += BATCH_SIZE) {
      if (signal.aborted) return;
      const batch = feeds.slice(i, i + BATCH_SIZE);
      dom.newsGrid.innerHTML = `<div class="loading-state">Chargement : ${batch.map(f => f.name).join(', ')}…</div>`;
      const batchResults = await Promise.allSettled(batch.map(loadFeed));
      if (signal.aborted) return;
      results.push(...batchResults);
      if (i + BATCH_SIZE < feeds.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    if (signal.aborted) return;

    state.loading = false;
    state.articles = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    state.articles.forEach(a => { a.id = ++state.articleId; });
    state.articles.sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0));

    if (state.pendingCat) {
      state.currentCat = state.pendingCat;
      state.pendingCat = null;
      dom.catBtns.forEach(b => {
        const active = b.dataset.category === state.currentCat;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }
    filterAndRender();
    const countryName = COUNTRY_CONFIGS[state.currentCountry]?.name || '';
    notify(`${state.articles.length} actualités chargées (${countryName})`);
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

  let translateAbort = null;

  async function translateArticle() {
    const a = state.currentArticle;
    if (!a) return;
    if (translateAbort) translateAbort.abort();
    translateAbort = new AbortController();
    const signal = translateAbort.signal;

    const targetLang = 'fr';
    const sourceLang = COUNTRY_CONFIGS[state.currentCountry]?.lang || 'fr';
    if (sourceLang === targetLang) {
      notify('L\'article est déjà en français');
      return;
    }

    const btn = dom.translateBtn;
    const origText = btn.innerHTML;
    btn.innerHTML = '<span>Traduction…</span>';
    btn.disabled = true;

    try {
      const texts = [a.title, a.desc].filter(t => t && t.length > 2);
      const translated = await Promise.allSettled(
        texts.map(t => {
          const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(t.slice(0, 500))}&langpair=${sourceLang}|${targetLang}`;
          return fetch(url, { signal }).then(r => r.json()).then(d => d.responseData?.translatedText || t);
        })
      );

      if (signal.aborted) return;

      const transTitle = translated[0]?.value || a.title;
      const transDesc = translated[1]?.value || a.desc;

      const titleEl = dom.articleBody.querySelector('.article-title');
      const descEl = dom.articleBody.querySelector('.article-desc');
      if (titleEl) titleEl.textContent = transTitle;
      if (descEl) descEl.textContent = transDesc;

      notify('Article traduit en français');
    } catch (e) {
      if (e.name !== 'AbortError') notify('Erreur de traduction');
    } finally {
      btn.innerHTML = origText;
      btn.disabled = false;
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

  async function handleUnifiedWikiSearch(query) {
    if (!query.trim()) return;
    if (wikiAbort) wikiAbort.abort();
    wikiAbort = new AbortController();
    const signal = wikiAbort.signal;
    const q = query.trim();

    addHistory('infoici-wiki-history', q);

    const cacheKey = 'unified_' + q.toLowerCase();
    if (state.wikiCache[cacheKey]) {
      renderUnifiedWikiResults(state.wikiCache[cacheKey]);
      dom.wikiResult.style.display = 'block';
      dom.wikiContent.style.display = 'none';
      return;
    }

    dom.wikiResult.style.display = 'block';
    dom.wikiResult.innerHTML = '<div class="loading-state">Recherche sur tous les wikis…</div>';
    dom.wikiContent.style.display = 'none';

    try {
      const results = await Promise.allSettled(
        WIKI_SOURCES.map(src =>
          wikiSearchSource(src.domain, q, signal, 4)
            .then(searchRes => {
              return { source: src, results: searchRes };
            })
        )
      );

      if (signal.aborted) return;

      const sources = results.map((r, i) => {
        if (r.status === 'fulfilled') return r.value;
        return { source: WIKI_SOURCES[i], results: [] };
      });

      const totalResults = sources.reduce((sum, s) => sum + s.results.length, 0);

      if (totalResults === 0) {
        dom.wikiResult.innerHTML = '<div class="error-state"><p>Aucun résultat trouvé sur les wikis.</p></div>';
        return;
      }

      renderUnifiedWikiResults(sources);
      cacheWiki(cacheKey, sources);
    } catch (e) {
      if (e.name === 'AbortError') return;
      dom.wikiResult.innerHTML = '<div class="error-state"><p>Erreur de connexion aux wikis.</p></div>';
    }
  }

  function renderUnifiedWikiResults(sources) {
    let html = '<div class="wiki-unified-results">';

    sources.forEach(({ source, results }) => {
      const domain = source.domain;
      const isOpen = source.id === 'wikipedia' || source.id === 'wiktionary' || source.id === 'wikibooks';

      html += `
        <div class="wiki-source-section">
          <div class="wiki-source-header" data-toggle="${source.id}">
            <span class="source-dot"></span>
            <span class="source-name">${sanitize(source.label)}</span>
            <span class="source-count">${results.length}</span>
            <span class="source-toggle ${isOpen ? 'open' : ''}">❯</span>
          </div>
          <div class="wiki-source-body ${isOpen ? '' : 'collapsed'}">
      `;

      if (!results.length) {
        html += '<div class="wiki-empty">Aucun résultat</div>';
      } else {
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
      }

      html += `
          </div>
        </div>
      `;
    });

    html += '</div>';
    dom.wikiResult.innerHTML = html;

    dom.wikiResult.querySelectorAll('.wiki-source-header').forEach(hdr => {
      hdr.addEventListener('click', () => {
        const body = hdr.nextElementSibling;
        const toggle = hdr.querySelector('.source-toggle');
        if (body) {
          body.classList.toggle('collapsed');
          if (toggle) toggle.classList.toggle('open');
        }
      });
    });

    dom.wikiResult.querySelectorAll('.wiki-expand-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const entry = btn.closest('.wiki-entry');
        const fullDiv = entry.querySelector('.wiki-entry-full');
        if (!fullDiv) return;

        if (fullDiv.style.display === 'block') {
          fullDiv.style.display = 'none';
          btn.classList.remove('open');
          btn.title = "Afficher l'article complet";
          return;
        }

        const domain = btn.dataset.domain;
        const title = btn.dataset.title;
        if (!domain || !title) return;

        fullDiv.innerHTML = '<div class="loading-state" style="padding:16px 0">Chargement…</div>';
        fullDiv.style.display = 'block';
        btn.classList.add('open');
        btn.title = 'Réduire';

        try {
          const ac = new AbortController();
          const tmr = setTimeout(() => ac.abort(), 10000);
          if (domain.includes('wiktionary')) {
            let html = '';
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
              html += `<p style="margin-top:10px"><a href="${domain}/wiki/${encodeURIComponent(title)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent);font-size:13px">Lire sur ${sanitize(btn.closest('.wiki-source-section')?.querySelector('.source-name')?.textContent || 'le wiki')} →</a></p>`;
            } else {
              html = '<p style="color:var(--text-dim)">Aucune définition trouvée.</p>';
            }
            typewrite(fullDiv, html);
          } else {
            const page = await wikiGetExtract(domain, title, ac.signal);
            clearTimeout(tmr);
            if (!page || !page.extract) {
              fullDiv.innerHTML = '<p style="color:var(--text-dim)">Contenu non disponible.</p>';
              return;
            }
            const paragraphs = page.extract.split('\n').filter(p => p.trim()).map(p => sanitize(p));
            const thumb = page.thumbnail ? page.thumbnail.source : '';
            let html = paragraphs.map(p => `<p>${p}</p>`).join('');
            html += `<p style="margin-top:10px"><a href="${domain}/wiki/${encodeURIComponent(title)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent);font-size:13px">Lire sur ${sanitize(btn.closest('.wiki-source-section')?.querySelector('.source-name')?.textContent || 'le wiki')} →</a></p>`;

            if (thumb) {
              fullDiv.innerHTML = `<img src="${sanitize(thumb)}" alt="" loading="lazy" style="max-width:100%;border-radius:6px;margin-bottom:12px"><div class="wiki-entry-text"></div>`;
              typewrite(fullDiv.querySelector('.wiki-entry-text'), html);
            } else {
              typewrite(fullDiv, html);
            }
          }
        } catch (_) {
          fullDiv.innerHTML = '<p style="color:var(--text-dim)">Erreur de chargement.</p>';
        }
      });
    });
  }

  async function loadWeather(city) {
    dom.weatherContent.style.display = 'none';
    dom.weatherResult.style.display = 'block';
    dom.weatherResult.innerHTML = '<div class="loading-state">Chargement de la météo...</div>';
    const lang = COUNTRY_CONFIGS[state.weatherCountry]?.lang || 'fr';
    try {
      const ac = new AbortController();
      const tmr = setTimeout(() => ac.abort(), 10000);
      const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?lang=${lang}&format=j1`, { signal: ac.signal });
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
          time: `${Math.floor(parseInt(h.time, 10) / 100)}h`,
          temp: Math.round(h.tempC),
          icon: getWeatherEmoji(h.weatherDesc?.[0]?.value || '', true),
          precip: h.chanceofrain || '0',
        }));
      }

      let html = `
        <div class="weather-card">
          <div class="weather-current">
            <div class="weather-current-temp">
              <span class="weather-current-icon">${getWeatherEmoji(cc.weatherDesc?.[0]?.value || '')}</span>
              <span class="weather-current-deg">${Math.round(cc.temp_C)}°</span>
            </div>
            <div class="weather-current-desc">${sanitize(cc.weatherDesc?.[0]?.value || '')}</div>
            <div class="weather-current-loc">${locName}</div>
            <div class="weather-current-hilo">${Math.round(cc.maxtempC || '')}° / ${Math.round(cc.mintempC || '')}°</div>
          </div>
      `;

      if (cc.humidity || cc.windspeedKmph || cc.FeelsLikeC || cc.pressure || cc.visibility) {
        html += `
          <div class="weather-section-label">DÉTAILS</div>
          <div class="weather-detail-strip">
            <div class="weather-ds-item"><span class="weather-ds-label">Humidité</span><span class="weather-ds-value">${cc.humidity || '—'}%</span></div>
            <div class="weather-ds-item"><span class="weather-ds-label">Vent</span><span class="weather-ds-value">${cc.windspeedKmph || '—'} km/h</span></div>
            <div class="weather-ds-item"><span class="weather-ds-label">Ressenti</span><span class="weather-ds-value">${Math.round(cc.FeelsLikeC || '—')}°</span></div>
            <div class="weather-ds-item"><span class="weather-ds-label">Pression</span><span class="weather-ds-value">${cc.pressure || '—'} hPa</span></div>
            <div class="weather-ds-item"><span class="weather-ds-label">Visibilité</span><span class="weather-ds-value">${cc.visibility || '—'} km</span></div>
          </div>
        `;
      }

      html += `<div class="weather-section-label">AUJOURD'HUI</div>`;

      if (weather[0]?.hourly) {
        const hourly = getTodayHourly(weather[0].hourly);
        if (hourly.length) {
          html += '<div class="weather-hourly-strip">';
          hourly.forEach(h => {
            html += `
              <div class="weather-hourly-cell">
                <div class="weather-hourly-cell-time">${sanitize(h.time)}</div>
                <div class="weather-hourly-cell-icon">${h.icon}</div>
                <div class="weather-hourly-cell-temp">${h.temp}°</div>
                <div class="weather-hourly-cell-precip">${h.precip}%</div>
              </div>
            `;
          });
          html += '</div>';
        }
      }

      html += '<div class="weather-section-label">PRÉVISIONS</div><div class="mf-days">';

      weather.forEach((day, i) => {
        const date = new Date(day.date);
        const dayName = i === 0 ? "Aujourd'hui" : date.toLocaleDateString('fr-FR', { weekday: 'long' });
        html += `
          <div class="mf-day-card">
            <div class="mf-day-header">${sanitize(dayName)}</div>
            <div class="mf-day-body">
              <span class="mf-day-icon">${getWeatherEmoji(day.hourly?.[0]?.weatherDesc?.[0]?.value || '', true)}</span>
              <span class="mf-day-temps">
                <span class="mf-day-high">${Math.round(day.maxtempC)}°</span>
                <span class="mf-day-low">${Math.round(day.mintempC)}°</span>
              </span>
            </div>
            <div class="mf-day-infos">
              <div class="mf-day-info"><span class="mf-day-info-label">Pluie</span>${day.hourly?.[0]?.chanceofrain || '0'}%</div>
              <div class="mf-day-info"><span class="mf-day-info-label">Vent</span>${day.hourly?.[0]?.windspeedKmph || '—'} km/h</div>
              <div class="mf-day-info"><span class="mf-day-info-label">UV</span>${day.uvIndex || '—'}</div>
            </div>
          </div>
        `;
      });

      html += '</div></div>';
      dom.weatherResult.innerHTML = html;
    } catch (e) {
      if (e.name === 'AbortError') return;
      dom.weatherResult.innerHTML = '<div class="error-state"><p>Ville introuvable ou erreur réseau.</p></div>';
    }
  }

  function getWeatherEmoji(desc, small) {
    const d = desc.toLowerCase();
    if (d.includes('soleil') || d.includes('ensoleill')) return small ? '☀️' : '☀️';
    if (d.includes('éclairci') || d.includes('partiellement')) return small ? '⛅' : '⛅';
    if (d.includes('nuage')) return small ? '☁️' : '☁️';
    if (d.includes('plu') || d.includes('averse') || d.includes('giboulée')) return small ? '🌧️' : '🌧️';
    if (d.includes('orage') || d.includes('tonnerre')) return small ? '⛈️' : '⛈️';
    if (d.includes('neige') || d.includes('verglas')) return small ? '❄️' : '❄️';
    if (d.includes('brouillard') || d.includes('brume')) return small ? '🌫️' : '🌫️';
    if (d.includes('vent')) return small ? '💨' : '💨';
    return small ? '☀️' : '☀️';
  }

  async function loadCrypto() {
    dom.cryptoResult.innerHTML = '<div class="loading-state">Chargement des cours...</div>';
    try {
      const ac = new AbortController();
      const tmr = setTimeout(() => ac.abort(), 15000);
      const data = await fetchJSON('https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=250&page=1&sparkline=false', ac.signal);
      clearTimeout(tmr);
      renderCrypto(data);
    } catch (_) {
      dom.cryptoResult.innerHTML = '<div class="error-state"><p>Erreur de chargement des cryptos.</p></div>';
    }
  }

  function renderCrypto(data) {
    if (!data) data = state._cryptoData;
    if (!data) return;
    state._cryptoData = data;

    const filtered = cryptoFilter
      ? data.filter(c => c.name.toLowerCase().includes(cryptoFilter) || c.symbol.toLowerCase().includes(cryptoFilter))
      : data;

    const max = cryptoShowAll ? filtered.length : Math.min(filtered.length, 20);
    const slice = filtered.slice(0, max);

    let html = '<div class="crypto-grid">';
    slice.forEach(c => {
      const change = c.price_change_percentage_24h || 0;
      const cls = change >= 0 ? 'up' : 'down';
      const arrow = change >= 0 ? '▲' : '▼';
      html += `
        <div class="crypto-card">
          <div class="crypto-header">
            ${c.image ? `<img class="crypto-icon-img" src="${sanitize(c.image)}" alt="" loading="lazy">` : ''}
            <span class="crypto-name">${sanitize(c.name)}</span>
            <span class="crypto-ticker">${sanitize(c.symbol.toUpperCase())}</span>
          </div>
          <div class="crypto-price">€${formatCryptoPrice(c.current_price)}</div>
          <div class="crypto-rank">Rang #${c.market_cap_rank || '—'}</div>
          <div class="crypto-change ${cls}">${arrow} ${Math.abs(change).toFixed(2)}%</div>
        </div>
      `;
    });
    html += '</div>';

    if (filtered.length > 20 && !cryptoShowAll) {
      html += `<button id="cryptoShowAllBtn" class="crypto-more-btn">Afficher tout (${filtered.length})</button>`;
    }

    dom.cryptoResult.innerHTML = html;

    const showAll = document.getElementById('cryptoShowAllBtn');
    if (showAll) {
      showAll.addEventListener('click', () => {
        cryptoShowAll = true;
        renderCrypto();
      });
    }


  }

  function formatCryptoPrice(p) {
    if (!p) return '—';
    if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 0.01) return p.toFixed(4);
    return p.toFixed(8);
  }

  function initTheme() {
    const saved = localStorage.getItem('infohub-theme');
    if (saved) applyTheme(saved);
  }

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

  function hardReset() {
    if (!confirm('Hard reset : vider le cache et recharger ?')) return;
    localStorage.clear();
    if ('caches' in window) {
      caches.keys().then(names => Promise.all(names.map(n => caches.delete(n)))).catch(() => {});
    }
    notify('Cache vidé, rechargement...');
    setTimeout(() => location.reload(), 500);
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme');
    applyTheme(cur === 'light' ? 'dark' : 'light');
  }

  function switchCountry(countryCode) {
    if (countryCode === state.currentCountry) return;
    state.currentCountry = countryCode;
    localStorage.setItem('infohub-country', countryCode);
    dom.countrySelect.value = countryCode;
    switchSection('news');
    loadAllFeeds();
  }

  function switchWeatherCountry(countryCode) {
    if (countryCode === state.weatherCountry) return;
    state.weatherCountry = countryCode;
    localStorage.setItem('infohub-weather-country', countryCode);
    dom.weatherCountrySelect.value = countryCode;
    const cfg = COUNTRY_CONFIGS[countryCode];
    if (cfg) dom.weatherCity.value = cfg.defaultCity;
    loadWeather(cfg ? cfg.defaultCity : 'Paris');
  }

  function switchSection(id) {
    dom.navBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.section === id);
      b.setAttribute('aria-current', b.dataset.section === id ? 'page' : 'false');
    });
    dom.sections.forEach(s => s.classList.toggle('active', s.id === `section-${id}`));

    dom.countrySelect.value = state.currentCountry;
    dom.weatherCountrySelect.value = state.weatherCountry;

    if (id === 'wiki') {
      const hist = loadHistory('infohub-wiki-history');
      renderHistory(dom.wikiHistory, hist, v => { dom.wikiSearch.value = v; handleUnifiedWikiSearch(v); }, 'infohub-wiki-history');
    }
    if (id === 'weather') {
      const cfg = COUNTRY_CONFIGS[state.weatherCountry];
      if (!cfg) return;
      const city = dom.weatherCity.value.trim() || cfg.defaultCity;
      loadWeather(city);
    }
    if (id === 'crypto') loadCrypto();
  }

  function switchCategory(cat) {
    if (state.loading) {
      state.pendingCat = cat;
      return;
    }
    state.currentCat = cat;
    dom.catBtns.forEach(b => {
      const active = b.dataset.category === cat;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    filterAndRender();
  }

  function init() {
    initTheme();

    const savedCountry = localStorage.getItem('infohub-country');
    if (savedCountry && COUNTRY_CONFIGS[savedCountry]) {
      state.currentCountry = savedCountry;
    }
    const savedWeatherCountry = localStorage.getItem('infohub-weather-country');
    if (savedWeatherCountry && COUNTRY_CONFIGS[savedWeatherCountry]) {
      state.weatherCountry = savedWeatherCountry;
    }

    dom.countrySelect.value = state.currentCountry;
    dom.weatherCountrySelect.value = state.weatherCountry;

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
    dom.translateBtn.addEventListener('click', translateArticle);
    dom.themeBtn.addEventListener('click', toggleTheme);

    dom.countrySelect.addEventListener('change', e => switchCountry(e.target.value));
    dom.weatherCountrySelect.addEventListener('change', e => switchWeatherCountry(e.target.value));
    dom.resetBtn = $('#resetBtn');
    if (dom.resetBtn) dom.resetBtn.addEventListener('click', hardReset);

    function doWiki() { handleUnifiedWikiSearch(dom.wikiSearch.value); }
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

  window.__INFOHUB = { state, loadAllFeeds, handleUnifiedWikiSearch, loadWeather, loadCrypto };
})();

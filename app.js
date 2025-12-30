// ========================
// CONFIG
// ========================
const API_BASE = 'https://sankavollerei.com';          // host api
const STREAM_BASE = `${API_BASE}/anime/stream`;        // prefix stream

let currentMode = 'latest';   // 'latest' | 'trending' | 'random' | 'search'
let currentPage = 1;
let isLoading = false;
let lastQuery = '';
let currentAnime = null;      // untuk player
let currentEpisodes = [];

// ========================
// HELPERS
// ========================
async function fetchJson(path) {
  try {
    const res = await fetch(`${STREAM_BASE}${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json;
  } catch (err) {
    console.error('API error:', err);
    throw err;
  }
}

function setActiveTab(mode) {
  currentMode = mode;
  currentPage = 1;

  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  if (mode === 'latest') document.getElementById('latest-btn')?.classList.add('active');
  if (mode === 'trending') document.getElementById('trending-btn')?.classList.add('active');
  if (mode === 'random') document.getElementById('random-btn')?.classList.add('active');

  const titleEl = document.getElementById('section-label');
  if (!titleEl) return;
  if (mode === 'latest') titleEl.textContent = 'Terbaru!';
  else if (mode === 'trending') titleEl.textContent = 'Sedang Populer';
  else if (mode === 'random') titleEl.textContent = 'Rekomendasi Acak';
  else if (mode === 'search') titleEl.textContent = 'Hasil Pencarian';
}

function showHome() {
  document.getElementById('home-page').style.display = 'block';
  document.getElementById('detail-page').style.display = 'none';
  document.getElementById('player').innerHTML = '';
  currentAnime = null;
  currentEpisodes = [];
}

// ========================
// LOAD LIST ANIME
// ========================
async function loadLatest(reset = true) {
  if (isLoading) return;
  isLoading = true;

  const listEl = document.getElementById('anime-list');
  if (reset) {
    listEl.innerHTML = '<p class="loading">Loading anime...</p>';
  }

  try {
    const data = await fetchJson(`/latest/${currentPage}`);
    const list = data?.data || data?.results || [];
    appendAnimes(list, { reset, tag: 'Baru' });
    currentPage++;
  } catch (err) {
    listEl.innerHTML = `<p style="padding:20px;">Error load list: ${err}</p>`;
  } finally {
    isLoading = false;
  }
}

async function loadTrending(reset = true) {
  if (isLoading) return;
  isLoading = true;

  const listEl = document.getElementById('anime-list');
  if (reset) {
    listEl.innerHTML = '<p class="loading">Loading anime populer...</p>';
  }

  try {
    const data = await fetchJson('/popular');
    const list = data?.data || data?.results || [];
    appendAnimes(list, { reset, tag: 'Populer' });
    currentPage = 2; // kalau mau nanti pakai paging juga
  } catch (err) {
    listEl.innerHTML = `<p style="padding:20px;">Error load list: ${err}</p>`;
  } finally {
    isLoading = false;
  }
}

// optional random → pakai latest page random saja
async function loadRandom(reset = true) {
  if (isLoading) return;
  isLoading = true;

  const listEl = document.getElementById('anime-list');
  if (reset) listEl.innerHTML = '<p class="loading">Mengacak anime...</p>';

  try {
    const randomPage = Math.floor(Math.random() * 5) + 1; // page 1–5
    const data = await fetchJson(`/latest/${randomPage}`);
    const list = (data?.data || data?.results || []).sort(() => Math.random() - 0.5);
    appendAnimes(list.slice(0, 20), { reset, tag: 'Random' });
    currentPage = randomPage;
  } catch (err) {
    listEl.innerHTML = `<p style="padding:20px;">Error load list: ${err}</p>`;
  } finally {
    isLoading = false;
  }
}

async function searchAnime(reset = true) {
  if (isLoading) return;
  const q = document.getElementById('search-input').value.trim();
  if (!q) return alert('Masukkan judul anime dulu.');

  isLoading = true;
  const listEl = document.getElementById('anime-list');
  listEl.innerHTML = '<p class="loading">Mencari anime...</p>';

  try {
    lastQuery = q;
    const data = await fetchJson(`/search/${encodeURIComponent(q)}`);
    const list = data?.data || data?.results || [];
    appendAnimes(list, { reset: true, tag: 'Search' });
    currentPage = 2;
  } catch (err) {
    listEl.innerHTML = `<p style="padding:20px;">Error pencarian: ${err}</p>`;
  } finally {
    isLoading = false;
  }
}

// tambahkan ke grid
function appendAnimes(animes, options = {}) {
  const listEl = document.getElementById('anime-list');
  if (options.reset) {
    listEl.innerHTML = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (!animes || animes.length === 0) {
    if (!listEl.innerHTML.trim()) {
      listEl.innerHTML = '<p style="padding:20px;">Tidak ada anime ditemukan.</p>';
    }
    return;
  }

  let html = listEl.innerHTML;

  animes.forEach((anime, idx) => {
    const cover =
      anime.poster ||
      anime.image ||
      anime.thumbnail ||
      'https://via.placeholder.com/300x450?text=No+Poster';

    const title =
      anime.title ||
      anime.name ||
      anime.anime_title ||
      'Unknown';

    const ep =
      anime.episode ||
      anime.ep ||
      anime.latest_episode ||
      anime.chapter ||
      '';

    const tag = options.tag || 'Anime';

    // slug untuk detail stream API
    const slug =
      anime.slug ||
      anime.slugAnime ||
      anime.endpoint ||
      anime.slug_anime ||
      '';

    const safeSlug = slug.replace(/'/g, "\\'");

    html += `
      <article class="drama-card" onclick="showDetail('${safeSlug}')">
        <div class="card-thumb">
          <img src="${cover}" alt="${title}" loading="lazy">
          ${ep ? `<div class="badge-episode">Ep. ${ep}</div>` : ''}
        </div>
        <div class="drama-info">
          <h3>${title}</h3>
          <div class="drama-meta">
            <span class="drama-tag">${tag}</span>
          </div>
        </div>
      </article>
    `;
  });

  listEl.innerHTML = html;
}

// ========================
// DETAIL + EPISODE
// ========================
async function showDetail(slug) {
  if (!slug) {
    alert('Slug anime tidak ditemukan.');
    return;
  }

  try {
    const res = await fetchJson(`/anime/${slug}`);
    const anime = res?.data || res;
    currentAnime = anime;

    const detailEl = document.getElementById('anime-detail');
    const epListEl = document.getElementById('episode-list');

    const cover =
      anime.poster ||
      anime.image ||
      anime.thumbnail ||
      'https://via.placeholder.com/300x450?text=No+Poster';

    const title = anime.title || anime.name || 'Unknown';
    const synopsis = anime.synopsis || anime.description || 'Tidak ada sinopsis.';
    const genresArr = anime.genres || anime.genre || [];
    const genres = Array.isArray(genresArr)
      ? genresArr.map(g => (g.name || g)).join(' • ')
      : genresArr;

    detailEl.innerHTML = `
      <div class="detail-main">
        <img src="${cover}" alt="${title}">
        <div class="detail-text">
          <h2>${title}</h2>
          ${genres ? `<p class="detail-genre">${genres}</p>` : ''}
          <p class="detail-synopsis">${synopsis}</p>
        </div>
      </div>
    `;

    const episodes =
      anime.episodes ||
      anime.list_episode ||
      anime.episodeList ||
      [];

    currentEpisodes = episodes;

    if (!episodes || episodes.length === 0) {
      epListEl.innerHTML = '<p style="padding:20px;">Episode belum tersedia.</p>';
    } else {
      let epHtml = '';
      episodes.forEach((ep, index) => {
        const num = ep.episode || ep.number || ep.ep || index + 1;

        // ⚠️ INI PENTING:
        // cari field slug untuk endpoint /anime/stream/episode/:slug
        const epSlug =
          ep.slug ||
          ep.slugEpisode ||
          ep.endpoint ||
          (ep.url ? ep.url.split('/').pop() : '');

        const safeEpSlug = String(epSlug || '').replace(/'/g, "\\'");

        epHtml += `
          <button 
            class="episode-btn" 
            data-slug="${safeEpSlug}"
            onclick="playEpisode('${safeEpSlug}', ${num})">
            Eps ${num}
          </button>
        `;
      });

      epListEl.innerHTML = epHtml;
    }

    // ganti tampilan
    document.getElementById('home-page').style.display = 'none';
    document.getElementById('detail-page').style.display = 'block';

    // auto play eps pertama kalau ada
    if (episodes && episodes.length > 0) {
      const first = episodes[0];
      const firstSlug =
        first.slug ||
        first.slugEpisode ||
        first.endpoint ||
        (first.url ? first.url.split('/').pop() : '');
      if (firstSlug) {
        playEpisode(firstSlug, first.episode || 1);
      }
    }
  } catch (err) {
    alert('Gagal memuat detail anime: ' + err);
  }
}

function backToHome() {
  showHome();
}

// ========================
// PLAYER
// ========================
async function playEpisode(epSlug, epNumber) {
  if (!epSlug) {
    alert('Slug episode tidak ditemukan.');
    return;
  }

  // highlight tombol episode aktif
  document.querySelectorAll('.episode-btn').forEach(btn => {
    btn.classList.remove('playing');
    if (btn.dataset.slug === epSlug) btn.classList.add('playing');
  });

  const playerEl = document.getElementById('player');
  playerEl.innerHTML = `<p class="loading">Mengambil link video Episode ${epNumber}...</p>`;

  try {
    const res = await fetchJson(`/episode/${epSlug}`);
    const data = res?.data || res;

    // ================================
    // BAGIAN PENTING: CARI URL STREAM
    // ================================
    // Cek beberapa kemungkinan nama field:
    let sources =
      data.sources ||
      data.streaming ||
      data.stream ||
      data.players ||
      data.download ||
      [];

    if (!Array.isArray(sources)) {
      // kadang format: {streaming: {url: '...'}}
      sources = [sources];
    }

    let streamUrl =
      (sources[0] && (sources[0].url || sources[0].file || sources[0].link)) ||
      data.embed ||
      data.stream_url ||
      data.url ||
      '';

    if (!streamUrl) {
      // kalau masih kosong, log ke console supaya kamu bisa lihat strukturnya
      console.log('Response episode API (cek di sini untuk nama field url):', data);
      playerEl.innerHTML = `
        <p style="padding:20px; color:#ffb3b3;">
          Gagal menemukan link streaming di respon API.<br>
          Buka DevTools &gt; Console di PC untuk lihat struktur JSON,
          lalu sesuaikan bagian <code>playEpisode()</code> di app.js (nama field URL).
        </p>
      `;
      return;
    }

    // jika berupa //domain.com, tambahkan https:
    if (streamUrl.startsWith('//')) {
      streamUrl = 'https:' + streamUrl;
    }

    const title = currentAnime?.title || currentAnime?.name || 'Anime';
    playerEl.innerHTML = `
      <h3 class="player-title">Sedang menonton: ${title} • Episode ${epNumber}</h3>
      <div class="player-frame">
        <iframe
          src="${streamUrl}"
          allowfullscreen
          frameborder="0"
          referrerpolicy="no-referrer"
          loading="lazy">
        </iframe>
      </div>
      <p class="player-note">
        Jika video tidak muncul, coba reload halaman atau pilih episode lain.
        Beberapa server sumber kadang membalas 503 seperti yang muncul di JSON.
      </p>
    `;
  } catch (err) {
    playerEl.innerHTML = `
      <p style="padding:20px; color:#ffb3b3;">
        Gagal memuat link video Episode ${epNumber}.<br>
        ${err}
      </p>
    `;
  }
}

// ========================
// INFINITE SCROLL LIST
// ========================
window.addEventListener('scroll', () => {
  if (currentMode === 'search' || currentMode === 'trending' || currentMode === 'random') return;
  if (isLoading) return;

  const nearBottom =
    window.innerHeight + window.scrollY >= document.body.offsetHeight - 500;

  if (nearBottom) {
    if (currentMode === 'latest') {
      loadLatest(false);
    }
  }
});

// ========================
// EVENT BIND
// ========================
window.setMode = function (mode) {
  setActiveTab(mode);
  if (mode === 'latest') loadLatest(true);
  else if (mode === 'trending') loadTrending(true);
  else if (mode === 'random') loadRandom(true);
};

window.searchAnime = function () {
  setActiveTab('search');
  searchAnime(true);
};

window.showDetail = showDetail;
window.backToHome = backToHome;
window.playEpisode = playEpisode;

// start
window.addEventListener('load', () => {
  setActiveTab('latest');
  loadLatest(true);
});

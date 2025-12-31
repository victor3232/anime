// ========================
// CONFIG
// ========================

// pakai host yang dulu sudah berhasil
const API_HOST = 'https://www.sankavollerei.com';
const STREAM_BASE = `${API_HOST}/anime/stream`;

let currentMode = 'latest';   // 'latest' | 'trending' | 'random' | 'search'
let currentPage = 1;
let isLoading = false;
let lastQuery = '';
let currentAnime = null;
let currentEpisodes = [];

// ========================
// HELPERS
// ========================
async function fetchJson(path) {
  const url = `${STREAM_BASE}${path}`;
  try {
    const res = await fetch(url);

    if (!res.ok) {
      const textErr = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} - ${textErr.slice(0, 120)}`);
    }

    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch (e) {
      // kalau bukan JSON, lempar error dengan isi awal respon
      throw new Error(
        `Response bukan JSON (mungkin HTML / error dari server):\n` +
          text.slice(0, 200)
      );
    }
  } catch (err) {
    console.error('API error:', url, err);
    throw err;
  }
}

function setActiveTab(mode) {
  currentMode = mode;
  currentPage = 1;

  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.classList.remove('active')
  );
  if (mode === 'latest') document.getElementById('latest-btn')?.classList.add('active');
  if (mode === 'trending') document.getElementById('trending-btn')?.classList.add('active');
  if (mode === 'random') document.getElementById('random-btn')?.classList.add('active');

  const labelEl = document.getElementById('section-label');
  const subEl = document.getElementById('section-subtitle');

  if (!labelEl || !subEl) return;

  if (mode === 'latest') {
    labelEl.textContent = 'Terbaru!';
    subEl.textContent = 'Nikmati update anime setiap hari secara gratis.';
  } else if (mode === 'trending') {
    labelEl.textContent = 'Sedang Populer';
    subEl.textContent = 'Anime yang paling sering ditonton pengguna.';
  } else if (mode === 'random') {
    labelEl.textContent = 'Rekomendasi Acak';
    subEl.textContent = 'Bingung nonton apa? Coba beberapa anime acak ini.';
  } else if (mode === 'search') {
    labelEl.textContent = 'Hasil Pencarian';
    subEl.textContent = `Menampilkan hasil untuk: "${lastQuery}"`;
  }
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
    listEl.innerHTML = `<p style="padding:20px;">Error load list:<br>${err}</p>`;
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
    currentPage = 2;
  } catch (err) {
    listEl.innerHTML = `<p style="padding:20px;">Error load list:<br>${err}</p>`;
  } finally {
    isLoading = false;
  }
}

async function loadRandom(reset = true) {
  if (isLoading) return;
  isLoading = true;

  const listEl = document.getElementById('anime-list');
  if (reset) {
    listEl.innerHTML = '<p class="loading">Mengacak anime...</p>';
  }

  try {
    const randomPage = Math.floor(Math.random() * 5) + 1;
    const data = await fetchJson(`/latest/${randomPage}`);
    const list = (data?.data || data?.results || []).sort(
      () => Math.random() - 0.5
    );
    appendAnimes(list.slice(0, 20), { reset, tag: 'Random' });
    currentPage = randomPage;
  } catch (err) {
    listEl.innerHTML = `<p style="padding:20px;">Error load list:<br>${err}</p>`;
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
    setActiveTab('search');
    appendAnimes(list, { reset: true, tag: 'Search' });
    currentPage = 2;
  } catch (err) {
    listEl.innerHTML = `<p style="padding:20px;">Error pencarian:<br>${err}</p>`;
  } finally {
    isLoading = false;
  }
}

// ========================
// TAMBAH KE GRID
// ========================
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
  const tag = options.tag || 'Anime';

  animes.forEach(anime => {
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

    const slug =
      anime.slug ||
      anime.slugAnime ||
      anime.endpoint ||
      anime.slug_anime ||
      '';

    const safeSlug = String(slug).replace(/'/g, "\\'");

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

    document.getElementById('home-page').style.display = 'none';
    document.getElementById('detail-page').style.display = 'block';

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

  document.querySelectorAll('.episode-btn').forEach(btn => {
    btn.classList.remove('playing');
    if (btn.dataset.slug === epSlug) btn.classList.add('playing');
  });

  const playerEl = document.getElementById('player');
  playerEl.innerHTML = `<p class="loading">Mengambil link video Episode ${epNumber}...</p>`;

  try {
    const res = await fetchJson(`/episode/${epSlug}`);
    const data = res?.data || res;

    let sources =
      data.sources ||
      data.streaming ||
      data.stream ||
      data.players ||
      data.download ||
      [];

    if (!Array.isArray(sources)) {
      sources = [sources];
    }

    let streamUrl =
      (sources[0] && (sources[0].url || sources[0].file || sources[0].link)) ||
      data.embed ||
      data.stream_url ||
      data.url ||
      '';

    if (!streamUrl) {
      console.log('Response episode API (cek field URL di sini):', data);
      playerEl.innerHTML = `
        <p style="padding:20px; color:#ffb3b3;">
          Gagal menemukan link streaming di respon API.<br>
          Coba buka DevTools &gt; Console di PC untuk lihat struktur JSON,
          lalu sesuaikan bagian <code>playEpisode()</code> di app.js dengan nama field URL yang benar.
        </p>
      `;
      return;
    }

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
// INFINITE SCROLL (optional utk latest)
// ========================
window.addEventListener('scroll', () => {
  if (currentMode !== 'latest') return;
  if (isLoading) return;

  const nearBottom =
    window.innerHeight + window.scrollY >= document.body.offsetHeight - 500;

  if (nearBottom) {
    loadLatest(false);
  }
});

// ========================
// GLOBAL HOOKS UNTUK HTML
// ========================
window.setMode = function (mode) {
  setActiveTab(mode);
  if (mode === 'latest') loadLatest(true);
  else if (mode === 'trending') loadTrending(true);
  else if (mode === 'random') loadRandom(true);
};

window.searchAnime = function () {
  searchAnime(true);
};

window.showDetail = showDetail;
window.backToHome = backToHome;
window.playEpisode = playEpisode;

// start saat page load
window.addEventListener('load', () => {
  setActiveTab('latest');
  loadLatest(true);
});

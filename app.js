// =======================
// Konfigurasi dasar
// =======================
const API_STREAM_BASE = "https://www.sankavollerei.com/anime/stream";

let currentMode = "latest"; // 'latest' | 'trending' | 'recommend' | 'search'
let currentPage = 1;
let isLoading = false;
let hasMore = true;
let currentQuery = "";
let currentItems = [];

// Elemen DOM
const listEl = document.getElementById("anime-list");
const sectionTitleEl = document.getElementById("section-title");
const sectionSubtitleEl = document.getElementById("section-subtitle");

// =======================
// Helper UI
// =======================

function setActiveTab(mode) {
  currentMode = mode;
  document.querySelectorAll(".tab-btn").forEach((btn) =>
    btn.classList.remove("active")
  );
  if (mode === "trending") {
    document.getElementById("trending-btn").classList.add("active");
  } else if (mode === "latest") {
    document.getElementById("latest-btn").classList.add("active");
  } else if (mode === "recommend") {
    document.getElementById("random-btn").classList.add("active");
  }
}

function updateSectionTexts() {
  if (currentMode === "trending") {
    sectionTitleEl.textContent = "Trending Sekarang";
    sectionSubtitleEl.textContent =
      "Deretan anime yang paling sering ditonton pengguna.";
  } else if (currentMode === "latest") {
    sectionTitleEl.textContent = "Terbaru!";
    sectionSubtitleEl.textContent =
      "Nikmati update anime setiap hari secara gratis.";
  } else if (currentMode === "recommend") {
    sectionTitleEl.textContent = "Rekomendasi Acak";
    sectionSubtitleEl.textContent =
      "Bingung nonton apa? Coba beberapa rekomendasi acak ini.";
  } else if (currentMode === "search") {
    sectionTitleEl.textContent = `Hasil Pencarian`;
    sectionSubtitleEl.textContent = `Menampilkan hasil untuk: "${currentQuery}"`;
  }
}

function showLoadingList() {
  listEl.classList.add("loading");
  listEl.innerHTML = `<p style="padding:20px;">Loading drama...</p>`;
}

function showEmptyList() {
  listEl.classList.remove("loading");
  listEl.innerHTML = `<p style="padding:20px;">Tidak ada data ditemukan.</p>`;
}

function showErrorList(msg) {
  listEl.classList.remove("loading");
  listEl.innerHTML = `<p style="padding:20px;color:#ff9b9b;">${msg}</p>`;
}

// =======================
// Ekstrak data dari API
// (supaya fleksibel kalau nama field beda)
// =======================
function firstArrayInObject(obj) {
  if (!obj || typeof obj !== "object") return [];
  if (Array.isArray(obj)) return obj;
  for (const key of Object.keys(obj)) {
    if (Array.isArray(obj[key])) return obj[key];
  }
  return [];
}

function extractListFromResponse(json) {
  // Banyak API Sanka memakai { data: [...] } atau { results: [...] }
  let root =
    json.data ||
    json.results ||
    json.items ||
    json.list ||
    json.anime ||
    json.animes ||
    json;

  return firstArrayInObject(root);
}

function extractCardData(item) {
  // Cover / thumbnail
  const cover =
    item.image ||
    item.thumbnail ||
    item.thumb ||
    item.poster ||
    item.cover ||
    item.coverImage ||
    "https://via.placeholder.com/300x450?text=No+Image";

  // Judul
  const title =
    item.title ||
    item.name ||
    item.judul ||
    item.animeTitle ||
    item.anime_title ||
    "Judul tidak diketahui";

  // Episode info / badge kecil
  const episodeText =
    item.episode ||
    item.episodes ||
    item.current_episode ||
    item.ep ||
    item.epNum ||
    "";

  const typeOrStatus =
    item.type || item.status || item.category || item.tag || "";

  // URL / slug untuk nonton
  // Kalau API langsung kasih link nonton/stream, pakai itu.
  const watchUrl =
    item.watch_url ||
    item.stream_url ||
    item.url ||
    item.link ||
    item.episode_url ||
    "";

  // Kalau tidak ada watchUrl, tapi ada slug, nanti bisa diolah sendiri.
  const slug =
    item.slug ||
    item.animeSlug ||
    item.endpoint ||
    item.id ||
    (typeof item.link === "string"
      ? item.link.split("/").filter(Boolean).pop()
      : "");

  return { cover, title, episodeText, typeOrStatus, watchUrl, slug };
}

// =======================
// Render list kartu
// =======================
function renderList() {
  if (!currentItems.length) {
    showEmptyList();
    return;
  }

  listEl.classList.remove("loading");
  let html = "";

  currentItems.forEach((item, idx) => {
    const cd = extractCardData(item);

    html += `
      <article class="card" onclick="openAnime('${encodeURIComponent(
        cd.watchUrl
      )}','${encodeURIComponent(cd.slug)}')">
        <div class="card-thumb">
          <img src="${cd.cover}" alt="${cd.title}" loading="lazy" />
          ${
            cd.episodeText
              ? `<span class="card-badge-episode">Ep. ${cd.episodeText}</span>`
              : ""
          }
        </div>
        <div class="card-info">
          <h3 class="card-title">${cd.title}</h3>
          <div class="card-meta">
            ${
              cd.typeOrStatus
                ? `<span class="card-tag">${cd.typeOrStatus}</span>`
                : ""
            }
          </div>
        </div>
      </article>
    `;
  });

  listEl.innerHTML = html;
}

// =======================
// Fetch data list
// =======================
async function fetchList(reset = false) {
  if (isLoading) return;
  if (!hasMore && !reset) return;

  isLoading = true;

  if (reset) {
    currentPage = 1;
    hasMore = true;
    currentItems = [];
    showLoadingList();
  }

  updateSectionTexts();

  let url = "";

  if (currentMode === "latest") {
    url = `${API_STREAM_BASE}/latest/${currentPage}`;
  } else if (currentMode === "trending") {
    // /popular biasanya tanpa page, jadi kita panggil sekali saja
    url = `${API_STREAM_BASE}/popular`;
  } else if (currentMode === "recommend") {
    // Pakai page random dari latest
    const randomPage = Math.floor(Math.random() * 5) + 1; // 1-5
    url = `${API_STREAM_BASE}/latest/${randomPage}`;
  } else if (currentMode === "search") {
    if (!currentQuery) {
      showErrorList("Masukkan kata kunci dulu.");
      isLoading = false;
      return;
    }
    url = `${API_STREAM_BASE}/search/${encodeURIComponent(currentQuery)}`;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Gagal memuat data dari server");

    const json = await res.json();
    const list = extractListFromResponse(json);

    if (!list || !list.length) {
      if (currentItems.length === 0) showEmptyList();
      hasMore = false;
    } else {
      currentItems = currentItems.concat(list);
      renderList();
      currentPage += 1;

      // Kalau endpoint memang cuma 1 halaman (misal /popular), jangan endless.
      if (currentMode === "trending" || currentMode === "recommend") {
        hasMore = false;
      }
    }
  } catch (err) {
    console.error(err);
    showErrorList(
      "Terjadi kesalahan saat memuat data.<br>Coba refresh atau ganti mode."
    );
  } finally {
    isLoading = false;
  }
}

// =======================
// Aksi user
// =======================

function setMode(mode) {
  if (mode === currentMode && mode !== "search") return;
  setActiveTab(mode);
  if (mode !== "search") {
    currentQuery = "";
    document.getElementById("search-input").value = "";
  }
  fetchList(true);
}

function searchAnime() {
  const q = document.getElementById("search-input").value.trim();
  if (!q) return alert("Masukkan judul anime dulu dong 🙂");

  currentQuery = q;
  currentMode = "search";
  setActiveTab("search"); // tidak ada tab, hanya reset visual
  document.querySelectorAll(".tab-btn").forEach((btn) =>
    btn.classList.remove("active")
  );

  fetchList(true);
}

function openAnime(encodedWatchUrl, encodedSlug) {
  const watchUrl = decodeURIComponent(encodedWatchUrl);
  const slug = decodeURIComponent(encodedSlug);

  // Kalau API sudah kasih link nonton langsung, pakai itu.
  if (watchUrl) {
    window.open(watchUrl, "_blank");
    return;
  }

  // Fallback: bukakan halaman detail di API (biar user bisa klik link di sana).
  if (slug) {
    window.open(`${API_STREAM_BASE}/anime/${slug}`, "_blank");
  }
}

// =======================
// Infinite scroll (optional)
// =======================
window.addEventListener("scroll", () => {
  if (isLoading || !hasMore) return;

  const scrollPosition = window.innerHeight + window.scrollY;
  const bottom = document.body.offsetHeight - 800; // load sebelum mentok

  if (scrollPosition >= bottom) {
    fetchList(false);
  }
});

// =======================
// Init
// =======================
window.addEventListener("DOMContentLoaded", () => {
  setActiveTab("latest");
  fetchList(true);
});

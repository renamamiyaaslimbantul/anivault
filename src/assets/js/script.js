/**
 * AniVault - Anime Discovery Engine
 * Core JavaScript using ES6+
 * Powered by Jikan API (v4)
 * 
 * @author GitHub Copilot
 * @version 1.3.0
 */

/**
 * @typedef {Object} Anime
 * @property {number} mal_id
 * @property {string} title
 * @property {Object} images
 * @property {number} score
 * @property {string} type
 * @property {string} synopsis
 * @property {Array} genres
 * @property {Array} studios
 * @property {Object} trailer
 * @property {number} [year]
 */

const API_CONFIG = {
    BASE_URL: "https://api.jikan.moe/v4",
    ENDPOINTS: {
        TOP_ANIME: "/top/anime",
        SEARCH: "/anime",
        GENRES: "/genres/anime"
    }
};

/**
 * Main application class for AniVault
 */
class AniVault {
    constructor() {
        // UI Elements
        this.animeGrid = document.getElementById("anime-grid");
        this.searchInput = document.getElementById("search-input");
        this.favBtnNav = document.getElementById("btn-show-favorites");
        this.favCountBadge = document.getElementById("fav-count");
        
        // Filter Elements
        this.filterGenre = document.getElementById("filter-genre");
        this.filterStatus = document.getElementById("filter-status");
        this.filterType = document.getElementById("filter-type");
        this.btnReset = document.getElementById("btn-reset");

        // Modal Elements
        this.modal = document.getElementById("anime-modal");
        this.modalPoster = document.getElementById("modal-poster");
        this.modalTitle = document.getElementById("modal-title");
        this.modalType = document.getElementById("modal-type");
        this.modalScore = document.getElementById("modal-score");
        this.modalScoreValue = this.modalScore?.querySelector("span");
        this.modalYear = document.getElementById("modal-year");
        this.modalStudios = document.getElementById("modal-studios");
        this.modalGenres = document.getElementById("modal-genres");
        this.modalSynopsis = document.getElementById("modal-synopsis");
        this.modalTrailer = document.getElementById("modal-trailer");
        this.modalFavoriteBtn = document.getElementById("modal-favorite-btn");

        // State Management
        this.currentAnimeList = [];
        this.currentActiveAnime = null;
        this.favorites = JSON.parse(localStorage.getItem("aniVault_favorites")) || [];
        this.isShowingFavorites = false;
        this.filters = {
            q: "",
            genres: "",
            status: "",
            type: ""
        };

        this.init();
    }

    /**
     * Initializes the application
     */
    async init() {
        console.log("%c AniVault %c System Online ", "background: #6366f1; color: white; border-radius: 4px 0 0 4px; padding: 2px 4px;", "background: #1e293b; color: #6366f1; border-radius: 0 4px 4px 0; padding: 2px 4px;");
        this.updateFavBadge();
        await this.fetchAnime();
        this.setupEventListeners();
    }

    /**
     * Sets up all event listeners for the application
     */
    setupEventListeners() {
        let debounceTimer;
        
        // Search Input with Debounce
        this.searchInput?.addEventListener("input", (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.handleSearch(e.target.value);
            }, 500);
        });

        // Filter Dropdowns
        [this.filterGenre, this.filterStatus, this.filterType].forEach(el => {
            el?.addEventListener("change", (e) => {
                this.handleFilterChange(e.target.id, e.target.value);
            });
        });

        // Navigation & Controls
        this.btnReset?.addEventListener("click", () => this.resetFilters());
        this.favBtnNav?.addEventListener("click", () => this.toggleFavoritesView());

        // Delegation for Anime Cards
        this.animeGrid?.addEventListener("click", (event) => {
            const card = event.target.closest("[data-mal-id]");
            if (!card) return;

            const malId = Number(card.dataset.malId);
            const anime = (this.isShowingFavorites ? this.favorites : this.currentAnimeList).find(item => item.mal_id === malId);
            if (anime) this.openModal(anime);
        });

        // Modal Controls
        this.modalFavoriteBtn?.addEventListener("click", () => {
            if (this.currentActiveAnime) {
                this.toggleFavorite(this.currentActiveAnime);
            }
        });

        document.querySelectorAll(".js-modal-close").forEach(btn => {
            btn.addEventListener("click", () => this.closeModal());
        });

        this.modal?.addEventListener("click", (e) => {
            if (e.target.classList.contains("js-modal-overlay")) this.closeModal();
        });
    }

    /**
     * Handles search input logic
     * @param {string} query 
     */
    handleSearch(query) {
        this.isShowingFavorites = false;
        this.filters.q = query.trim();
        this.fetchAnime();
    }

    /**
     * Handles filter dropdown logic
     * @param {string} elementId 
     * @param {string} value 
     */
    handleFilterChange(elementId, value) {
        this.isShowingFavorites = false;
        const key = elementId.replace("filter-", "");
        const filterKey = key === "genre" ? "genres" : key;
        this.filters[filterKey] = value;
        this.fetchAnime();
    }

    /**
     * Toggles between main view and favorites view
     */
    toggleFavoritesView() {
        this.isShowingFavorites = !this.isShowingFavorites;
        
        if (this.isShowingFavorites) {
            this.renderAnimeList(this.favorites, "Watchlist Favorit");
            this.favBtnNav.classList.add("bg-accent/30", "text-accent", "border-accent");
        } else {
            this.favBtnNav.classList.remove("bg-accent/30", "text-accent", "border-accent");
            this.fetchAnime();
        }
    }

    /**
     * Fetches anime data from Jikan API based on current filters
     */
    async fetchAnime() {
        if (this.isShowingFavorites) return;

        try {
            this.showLoading();
            const params = new URLSearchParams();
            if (this.filters.q) params.append("q", this.filters.q);
            if (this.filters.genres) params.append("genres", this.filters.genres);
            if (this.filters.status) params.append("status", this.filters.status);
            if (this.filters.type) params.append("type", this.filters.type);
            
            params.append("limit", "24");
            params.append("order_by", "score");
            params.append("sort", "desc");

            const hasActiveFilters = Object.values(this.filters).some(val => val !== "");
            const endpoint = hasActiveFilters ? API_CONFIG.ENDPOINTS.SEARCH : API_CONFIG.ENDPOINTS.TOP_ANIME;
            const url = `${API_CONFIG.BASE_URL}${endpoint}?${params.toString()}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const { data } = await response.json();
            this.renderAnimeList(data);
        } catch (error) {
            console.error("[AniVault Error]:", error);
            this.renderErrorState();
        }
    }

    /**
     * Adds or removes an anime from favorites
     * @param {Anime} anime 
     */
    toggleFavorite(anime) {
        const index = this.favorites.findIndex(fav => fav.mal_id === anime.mal_id);
        
        if (index === -1) {
            this.favorites.push(anime);
        } else {
            this.favorites.splice(index, 1);
        }

        localStorage.setItem("aniVault_favorites", JSON.stringify(this.favorites));
        this.updateFavoriteBtnUI(anime.mal_id);
        this.updateFavBadge();

        if (this.isShowingFavorites) {
            this.renderAnimeList(this.favorites, "Watchlist Favorit");
        }
    }

    /**
     * Updates the favorites badge in the navbar
     */
    updateFavBadge() {
        if (!this.favCountBadge) return;
        const count = this.favorites.length;
        this.favCountBadge.textContent = count;
        this.favCountBadge.classList.toggle("hidden", count === 0);
    }

    /**
     * Updates the Favorite button UI inside the modal
     * @param {number} malId 
     */
    updateFavoriteBtnUI(malId) {
        if (!this.modalFavoriteBtn) return;
        const isFav = this.favorites.some(fav => fav.mal_id === malId);
        
        const iconHtml = isFav 
            ? `<i data-lucide="heart" class="w-4 h-4 fill-current text-red-500"></i><span>Favorited</span>`
            : `<i data-lucide="heart" class="w-4 h-4"></i><span>Add to Favorite</span>`;
        
        this.modalFavoriteBtn.innerHTML = iconHtml;
        
        if (isFav) {
            this.modalFavoriteBtn.classList.add("bg-red-500/10", "border-red-500/30", "text-red-500");
            this.modalFavoriteBtn.classList.remove("bg-accent/10", "border-accent/30", "text-accent");
        } else {
            this.modalFavoriteBtn.classList.remove("bg-red-500/10", "border-red-500/30", "text-red-500");
            this.modalFavoriteBtn.classList.add("bg-accent/10", "border-accent/30", "text-accent");
        }

        if (window.lucide) lucide.createIcons();
    }

    /**
     * Resets all filters and returns to top anime view
     */
    resetFilters() {
        this.isShowingFavorites = false;
        this.favBtnNav?.classList.remove("bg-accent/30", "text-accent", "border-accent");
        this.filters = { q: "", genres: "", status: "", type: "" };
        [this.searchInput, this.filterGenre, this.filterStatus, this.filterType].forEach(el => {
            if (el) el.value = "";
        });
        this.fetchAnime();
    }

    /**
     * Renders skeleton loading state
     */
    showLoading() {
        this.animeGrid.innerHTML = Array(12).fill(0).map(() => `
            <div class="bg-secondary rounded-xl overflow-hidden border border-slate-800 animate-pulse">
                <div class="aspect-[3/4] bg-slate-800"></div>
                <div class="p-4 space-y-3">
                    <div class="h-4 w-1/2 bg-slate-800 rounded-full"></div>
                    <div class="h-4 w-full bg-slate-800 rounded"></div>
                </div>
            </div>
        `).join("");
    }

    /**
     * Renders a list of anime cards to the grid
     * @param {Anime[]} animeList 
     * @param {string|null} title 
     */
    renderAnimeList(animeList, title = null) {
        if (!this.isShowingFavorites) {
            this.currentAnimeList = animeList || [];
        }

        if (animeList.length === 0) {
            const emptyMsg = this.isShowingFavorites ? "Watchlist kamu masih kosong." : "Anime tidak ditemukan.";
            this.renderEmptyState(emptyMsg);
            return;
        }

        this.animeGrid.innerHTML = animeList.map(anime => `
            <article class="group relative bg-secondary rounded-xl overflow-hidden card-hover cursor-pointer border border-slate-800 hover:border-accent/50 transition-all" data-mal-id="${anime.mal_id}">
                <div class="aspect-[3/4] overflow-hidden bg-slate-900 border-b border-white/5">
                    <img src="${anime.images.webp.large_image_url}" alt="${anime.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy">
                </div>
                <div class="absolute inset-0 bg-gradient-to-t from-dark via-dark/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity"></div>
                <div class="absolute inset-x-0 bottom-0 p-4 transform transition-transform duration-300">
                    <div class="flex items-center gap-2 mb-2 translate-y-2 group-hover:translate-y-0 transition-transform">
                        <span class="text-[10px] font-bold px-2 py-0.5 bg-accent text-white rounded-full uppercase">${anime.type || "TV"}</span>
                        ${anime.score ? `<span class="text-[10px] font-bold text-yellow-400 flex items-center gap-1"><i data-lucide="star" class="w-3 h-3 fill-current"></i> ${anime.score}</span>` : ""}
                    </div>
                    <h3 class="text-sm font-bold text-white line-clamp-2 leading-tight group-hover:text-accent transition-colors">${anime.title}</h3>
                </div>
            </article>
        `).join("");

        if (window.lucide) lucide.createIcons();
    }

    /**
     * Populates and opens the anime detail modal
     * @param {Anime} anime 
     */
    openModal(anime) {
        if (!this.modal) return;
        this.currentActiveAnime = anime;

        if (this.modalPoster) this.modalPoster.src = anime.images?.webp?.large_image_url || "";
        if (this.modalTitle) this.modalTitle.textContent = anime.title || "";
        if (this.modalType) this.modalType.textContent = anime.type || "TV";
        if (this.modalScoreValue) this.modalScoreValue.textContent = anime.score || "N/A";
        if (this.modalSynopsis) this.modalSynopsis.textContent = anime.synopsis || "No synopsis available.";
        if (this.modalYear) this.modalYear.textContent = anime.year ? `@ ${anime.year}` : "";
        
        if (this.modalStudios) {
            const studios = anime.studios?.map(s => s.name).join(", ") || "Unknown";
            this.modalStudios.textContent = `Studio: ${studios}`;
        }

        if (this.modalGenres) {
            const genresHtml = anime.genres?.map(g => {
                return `<span class="px-2.5 py-1 rounded-full bg-slate-800 text-slate-100 border border-slate-700 text-[11px] font-medium hover:border-accent/50 transition-colors">${g.name}</span>`;
            }).join("") || "";
            this.modalGenres.innerHTML = genresHtml;
        }

        if (this.modalTrailer) {
            const trailer = anime.trailer;
            const trailerId = trailer?.youtube_id;
            const embedUrl = trailer?.embed_url;

            if (trailerId || embedUrl) {
                const finalSrc = embedUrl || `https://www.youtube.com/embed/${trailerId}`;
                this.modalTrailer.innerHTML = `
                    <div class="aspect-video bg-black rounded-xl overflow-hidden shadow-inner font-sans">
                        <iframe 
                            src="${finalSrc}" 
                            class="w-full h-full" 
                            frameborder="0" 
                            allowfullscreen>
                        </iframe>
                    </div>`;
            } else {
                this.modalTrailer.innerHTML = `
                    <div class="p-6 text-center bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
                        <p class="text-[11px] text-slate-500 italic">Official trailer unavailable.</p>
                    </div>`;
            }
        }

        this.updateFavoriteBtnUI(anime.mal_id);
        this.modal.classList.remove("hidden");
        this.modal.classList.add("flex");
        document.body.classList.add("overflow-hidden");
        if (window.lucide) lucide.createIcons();
    }

    /**
     * Closes the detail modal and cleans up
     */
    closeModal() {
        if (!this.modal) return;
        this.modal.classList.replace("flex", "hidden");
        document.body.classList.remove("overflow-hidden");
        if (this.modalTrailer) this.modalTrailer.innerHTML = ""; 
        this.currentActiveAnime = null;
    }

    /**
     * Renders a friendly empty state message
     * @param {string} message 
     */
    renderEmptyState(message) {
        this.animeGrid.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-32 text-slate-500">
                <div class="p-6 rounded-full bg-slate-900 mb-4 border border-slate-800">
                    <i data-lucide="search-x" class="w-10 h-10 opacity-30"></i>
                </div>
                <p class="text-lg font-medium text-slate-400">${message}</p>
                <p class="text-sm">Try adjusting your filters or search terms.</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    /**
     * Renders a generic error state
     */
    renderErrorState() {
        this.animeGrid.innerHTML = `
            <div class="col-span-full text-center py-32">
                <p class="text-red-500 font-semibold">Service Temporarily Unavailable</p>
                <p class="text-slate-400 text-sm mt-1">Please refresh or try again later.</p>
                <button onclick="location.reload()" class="mt-6 px-4 py-2 bg-accent rounded text-white text-sm">Retry Connection</button>
            </div>
        `;
    }
}

document.addEventListener("DOMContentLoaded", () => new AniVault());

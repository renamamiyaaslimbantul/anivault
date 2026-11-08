/**
 * AniVault - Anime Discovery Engine
 * Core JavaScript using ES6+
 * Powered by Jikan API (v4)
 *
 * @author GitHub Copilot
 * @version 2.0.0
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
        this.btnClearSearch = document.getElementById("btn-clear-search");
        this.favBtnNav = document.getElementById("btn-show-favorites");
        this.favCountBadge = document.getElementById("fav-count");
        this.resultsMeta = document.getElementById("results-meta");
        this.activeView = document.getElementById("active-view");
        this.toastRegion = document.getElementById("toast-region");

        // Filter Elements
        this.filterGenre = document.getElementById("filter-genre");
        this.filterStatus = document.getElementById("filter-status");
        this.filterType = document.getElementById("filter-type");
        this.filterSort = document.getElementById("filter-sort");
        this.filterSortMobile = document.getElementById("filter-sort-mobile");
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
            type: "",
            sort: "score"
        };

        // Modal focus management state
        this.lastFocusedElement = null;

        this.init();
    }

    /**
     * Initializes the application
     */
    async init() {
        console.log("%c AniVault %c System Online ", "background: #e2563b; color: white; border-radius: 2px 0 0 2px; padding: 2px 4px;", "background: #18161f; color: #e2563b; border-radius: 0 2px 2px 0; padding: 2px 4px;");
        this.updateFavBadge();
        this.updateClearSearchBtn();
        this.setupEventListeners();
        await this.fetchAnime();
    }

    /**
     * Sets up all event listeners for the application
     */
    setupEventListeners() {
        let debounceTimer;

        // Search Input with Debounce
        this.searchInput?.addEventListener("input", (e) => {
            this.updateClearSearchBtn();
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.handleSearch(e.target.value);
            }, 500);
        });

        // Clear Search button
        this.btnClearSearch?.addEventListener("click", () => {
            this.searchInput.value = "";
            this.updateClearSearchBtn();
            this.searchInput.focus();
            this.handleSearch("");
        });

        // Filter Dropdowns (including sort)
        [this.filterGenre, this.filterStatus, this.filterType, this.filterSort, this.filterSortMobile].forEach(el => {
            el?.addEventListener("change", (e) => {
                this.handleFilterChange(e.target.id, e.target.value);
            });
        });

        // Keep desktop and mobile sort selects in sync
        [this.filterSort, this.filterSortMobile].forEach(el => {
            el?.addEventListener("change", (e) => {
                const other = e.target === this.filterSort ? this.filterSortMobile : this.filterSort;
                if (other) other.value = e.target.value;
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

        // Keyboard accessibility for cards (Enter/Space when focused)
        this.animeGrid?.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            const card = event.target.closest("[data-mal-id]");
            if (!card) return;
            event.preventDefault();
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

        // Esc closes modal + focus trap
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !this.modal.classList.contains("hidden")) {
                this.closeModal();
                return;
            }
            if (e.key === "Tab" && !this.modal.classList.contains("hidden")) {
                this.trapFocus(e);
            }
        });

        // Poster fade-in
        this.modalPoster?.addEventListener("load", () => this.modalPoster.classList.remove("opacity-0"));
    }

    /**
     * Keeps Tab focus inside the open modal
     * @param {KeyboardEvent} e
     */
    trapFocus(e) {
        const focusable = this.modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    /**
     * Shows/hides the clear-search button
     */
    updateClearSearchBtn() {
        if (!this.btnClearSearch) return;
        this.btnClearSearch.classList.toggle("hidden", !this.searchInput.value);
    }

    /**
     * Handles search input logic
     * @param {string} query
     */
    handleSearch(query) {
        this.isShowingFavorites = false;
        this.syncFavoritesBtn();
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
        this.syncFavoritesBtn();
        if (elementId === "filter-sort" || elementId === "filter-sort-mobile") {
            this.filters.sort = value;
        } else {
            const key = elementId.replace("filter-", "");
            const filterKey = key === "genre" ? "genres" : key;
            this.filters[filterKey] = value;
        }
        this.fetchAnime();
    }

    /**
     * Syncs favorites toggle button pressed state
     */
    syncFavoritesBtn() {
        this.favBtnNav?.setAttribute("aria-pressed", String(this.isShowingFavorites));
        if (!this.favBtnNav) return;
        this.favBtnNav.classList.toggle("bg-accent/15", this.isShowingFavorites);
        this.favBtnNav.classList.toggle("border-accent/50", this.isShowingFavorites);
        this.favBtnNav.classList.toggle("text-accent", this.isShowingFavorites);
    }

    /**
     * Toggles between main view and favorites view
     */
    toggleFavoritesView() {
        this.isShowingFavorites = !this.isShowingFavorites;
        this.syncFavoritesBtn();

        if (this.isShowingFavorites) {
            this.renderAnimeList(this.favorites, "Your favorites");
            this.renderResultsMeta(this.favorites.length, true);
        } else {
            this.fetchAnime();
        }
    }

    /**
     * Fetches anime data from Jikan API based on current filters
     */
    async fetchAnime() {
        if (this.isShowingFavorites) return;

        // Abort in-flight request so rapid filter changes don't race
        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();

        try {
            this.showLoading();
            const params = new URLSearchParams();
            if (this.filters.q) params.append("q", this.filters.q);
            if (this.filters.genres) params.append("genres", this.filters.genres);
            if (this.filters.status) params.append("status", this.filters.status);
            if (this.filters.type) params.append("type", this.filters.type);

            params.append("limit", "24");
            params.append("order_by", this.filters.sort);
            params.append("sort", this.filters.sort === "popularity" || this.filters.sort === "title" ? "asc" : "desc");

            const hasActiveFilters = Object.entries(this.filters).some(([key, val]) => key !== "sort" && val !== "");
            const endpoint = hasActiveFilters ? API_CONFIG.ENDPOINTS.SEARCH : API_CONFIG.ENDPOINTS.TOP_ANIME;
            const url = `${API_CONFIG.BASE_URL}${endpoint}?${params.toString()}`;

            const response = await fetch(url, { signal: this.abortController.signal });
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const { data } = await response.json();
            this.renderAnimeList(data);
            this.renderResultsMeta(data.length, hasActiveFilters);
        } catch (error) {
            if (error.name === "AbortError") return; // superseded by newer request
            console.error("[AniVault Error]:", error);
            this.renderErrorState(error);
        }
    }

    /**
     * Adds or removes an anime from favorites
     * @param {Anime} anime
     */
    toggleFavorite(anime) {
        const index = this.favorites.findIndex(fav => fav.mal_id === anime.mal_id);
        const wasAdded = index === -1;

        if (wasAdded) {
            this.favorites.push(anime);
        } else {
            this.favorites.splice(index, 1);
        }

        localStorage.setItem("aniVault_favorites", JSON.stringify(this.favorites));
        this.updateFavoriteBtnUI(anime.mal_id);
        this.updateFavBadge();
        this.showToast(wasAdded ? `Added “${anime.title}” to favorites` : `Removed “${anime.title}” from favorites`);

        if (this.isShowingFavorites) {
            this.renderAnimeList(this.favorites, "Your favorites");
            this.renderResultsMeta(this.favorites.length, true);
        }
    }

    /**
     * Shows a brief toast message
     * @param {string} message
     */
    showToast(message) {
        if (!this.toastRegion) return;
        const toast = document.createElement("div");
        toast.className = "toast-in pointer-events-auto flex items-center gap-2.5 bg-panel border border-line rounded-sm px-4 py-3 text-sm text-bone shadow-xl mb-2";
        toast.innerHTML = `
            <i data-lucide="check-circle-2" class="w-4 h-4 text-accent shrink-0"></i>
            <span class="truncate max-w-xs">${message}</span>
        `;
        this.toastRegion.appendChild(toast);
        if (window.lucide) lucide.createIcons();

        setTimeout(() => {
            toast.style.transition = "opacity 0.3s, transform 0.3s";
            toast.style.opacity = "0";
            toast.style.transform = "translateY(8px)";
            setTimeout(() => toast.remove(), 300);
        }, 2600);
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
            : `<i data-lucide="heart" class="w-4 h-4"></i><span>Add to favorites</span>`;

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
        this.syncFavoritesBtn();
        this.filters = { q: "", genres: "", status: "", type: "", sort: this.filters.sort };
        [this.searchInput, this.filterGenre, this.filterStatus, this.filterType].forEach(el => {
            if (el) el.value = "";
        });
        this.updateClearSearchBtn();
        this.fetchAnime();
    }

    /**
     * Renders skeleton loading state
     */
    showLoading() {
        this.animeGrid.setAttribute("aria-busy", "true");
        this.animeGrid.innerHTML = Array(12).fill(0).map(() => `
            <div class="bg-secondary rounded-md overflow-hidden border border-line">
                <div class="aspect-[3/4] skeleton-img"></div>
                <div class="p-3.5 space-y-2.5">
                    <div class="h-3.5 w-2/3 skeleton-img rounded-sm"></div>
                    <div class="h-3 w-1/3 skeleton-img rounded-sm"></div>
                </div>
            </div>
        `).join("");
        if (this.resultsMeta) this.resultsMeta.textContent = "";
    }

    /**
     * Updates the result count line
     * @param {number} count
     * @param {boolean} filtered
     */
    renderResultsMeta(count, filtered) {
        if (!this.resultsMeta) return;
        if (this.isShowingFavorites) {
            this.resultsMeta.textContent = count === 1 ? "1 title saved" : `${count} titles saved`;
            if (this.activeView) this.activeView.textContent = "Favorites view";
            return;
        }
        this.resultsMeta.textContent = count === 1 ? "1 title found" : `${count} titles`;
        if (this.activeView) this.activeView.textContent = filtered ? "Filtered results" : "Top anime";
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

        this.animeGrid.removeAttribute("aria-busy");

        if (!animeList || animeList.length === 0) {
            const emptyMsg = this.isShowingFavorites ? "Your favorites list is empty." : "No anime found.";
            this.renderEmptyState(emptyMsg);
            return;
        }

        this.animeGrid.innerHTML = animeList.map((anime, i) => `
            <article class="group relative bg-secondary rounded-md overflow-hidden card-hover cursor-pointer border border-line hover:border-accent/40 transition-all fade-in" style="animation-delay: ${Math.min(i * 30, 300)}ms" data-mal-id="${anime.mal_id}" role="button" tabindex="0" aria-label="View details for ${this.escapeHtml(anime.title)}">
                <div class="aspect-[3/4] overflow-hidden bg-slate-900 border-b border-line">
                    <img src="${anime.images.webp.large_image_url}" alt="" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy">
                </div>
                <div class="absolute inset-0 bg-gradient-to-t from-dark via-dark/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <div class="absolute inset-x-0 bottom-0 p-3.5 transform transition-transform duration-300 pointer-events-none">
                    <div class="flex items-center gap-2 mb-1.5 translate-y-1.5 group-hover:translate-y-0 transition-transform">
                        <span class="text-[10px] font-bold px-2 py-0.5 bg-accent text-white rounded-sm uppercase">${anime.type || "TV"}</span>
                        ${anime.score ? `<span class="text-[10px] font-bold text-bone flex items-center gap-1"><i data-lucide="star" class="w-3 h-3 fill-current text-accent"></i> ${anime.score}</span>` : ""}
                    </div>
                    <h3 class="text-sm font-bold text-bone line-clamp-2 leading-tight group-hover:text-accent transition-colors">${this.escapeHtml(anime.title)}</h3>
                </div>
                ${this.isShowingFavorites ? `
                <button class="js-remove-fav absolute top-2 right-2 p-1.5 rounded-sm bg-dark/80 text-slate-300 hover:text-red-400 border border-line opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity" data-mal-id="${anime.mal_id}" aria-label="Remove ${this.escapeHtml(anime.title)} from favorites" title="Remove from favorites">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>` : ""}
            </article>
        `).join("");

        if (this.isShowingFavorites) {
            this.animeGrid.querySelectorAll(".js-remove-fav").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const anime = this.favorites.find(f => f.mal_id === Number(btn.dataset.malId));
                    if (anime) this.toggleFavorite(anime);
                });
            });
        }

        if (window.lucide) lucide.createIcons();
    }

    /**
     * Escapes HTML special characters in user/API-provided strings
     * @param {string} str
     * @returns {string}
     */
    escapeHtml(str) {
        return String(str ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    /**
     * Populates and opens the anime detail modal
     * @param {Anime} anime
     */
    openModal(anime) {
        if (!this.modal) return;
        this.currentActiveAnime = anime;
        this.lastFocusedElement = document.activeElement;

        if (this.modalPoster) {
            this.modalPoster.classList.add("opacity-0");
            this.modalPoster.src = anime.images?.webp?.large_image_url || "";
            this.modalPoster.alt = `${anime.title} poster`;
        }
        if (this.modalTitle) this.modalTitle.textContent = anime.title || "";
        if (this.modalType) this.modalType.textContent = anime.type || "TV";
        if (this.modalScoreValue) this.modalScoreValue.textContent = anime.score || "N/A";
        if (this.modalSynopsis) this.modalSynopsis.textContent = anime.synopsis || "No synopsis available.";
        if (this.modalYear) this.modalYear.textContent = anime.year ? `· ${anime.year}` : "";

        if (this.modalStudios) {
            const studios = anime.studios?.map(s => s.name).join(", ") || "Unknown";
            this.modalStudios.textContent = `Studio: ${studios}`;
        }

        if (this.modalGenres) {
            const genresHtml = anime.genres?.map(g => {
                return `<span class="px-2.5 py-1 rounded-sm bg-panel text-slate-100 border border-line text-[11px] font-medium">${this.escapeHtml(g.name)}</span>`;
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
                    <div class="aspect-video bg-black overflow-hidden">
                        <iframe
                            src="${finalSrc}"
                            class="w-full h-full"
                            frameborder="0"
                            allowfullscreen
                            title="${this.escapeHtml(anime.title)} trailer"></iframe>
                    </div>`;
            } else {
                this.modalTrailer.innerHTML = `
                    <div class="p-5 text-center bg-dark/50 rounded-sm border border-dashed border-line">
                        <p class="text-[11px] text-slate-500 italic">Official trailer unavailable.</p>
                    </div>`;
            }
        }

        this.updateFavoriteBtnUI(anime.mal_id);
        this.modal.classList.remove("hidden");
        this.modal.classList.add("flex");
        document.body.classList.add("overflow-hidden");

        // Move focus into modal
        const firstFocusable = this.modal.querySelector("button, [href], input, select, textarea");
        firstFocusable?.focus();

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

        // Restore focus to where the modal was opened from
        if (this.lastFocusedElement && document.contains(this.lastFocusedElement)) {
            this.lastFocusedElement.focus();
        }
        this.lastFocusedElement = null;
    }

    /**
     * Renders a friendly empty state message
     * @param {string} message
     */
    renderEmptyState(message) {
        this.animeGrid.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-28 text-slate-500 fade-in">
                <div class="p-6 rounded-md bg-secondary mb-4 border border-line">
                    <i data-lucide="${this.isShowingFavorites ? "heart" : "search-x"}" class="w-8 h-8 opacity-40 text-slate-400"></i>
                </div>
                <p class="text-lg font-medium text-slate-300">${message}</p>
                <p class="text-sm mt-1">${this.isShowingFavorites ? "Open any anime and tap the heart to save it here." : "Try adjusting your filters or search terms."}</p>
                ${!this.isShowingFavorites ? `
                <button onclick="document.getElementById('btn-reset').click()" class="mt-6 px-4 py-2.5 bg-panel hover:bg-slate-700 border border-line rounded-sm text-sm font-medium text-bone transition-colors">
                    Clear filters
                </button>` : ""}
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    /**
     * Renders a friendly error state
     * @param {Error} error
     */
    renderErrorState(error) {
        const isRateLimit = error?.message?.includes("429");
        this.animeGrid.innerHTML = `
            <div class="col-span-full text-center py-28 fade-in">
                <div class="p-6 rounded-md bg-secondary mb-4 border border-line inline-flex">
                    <i data-lucide="server-crash" class="w-8 h-8 text-red-400 opacity-70"></i>
                </div>
                <p class="text-red-400 font-semibold font-display">${isRateLimit ? "Too many requests" : "Service temporarily unavailable"}</p>
                <p class="text-slate-400 text-sm mt-1">${isRateLimit ? "The API needs a moment to catch up. Try again shortly." : "Check your connection, then try again."}</p>
                <button onclick="window.__aniVault.fetchAnime()" class="mt-6 px-4 py-2.5 bg-accent hover:bg-accent/80 rounded-sm text-white text-sm font-medium transition-colors">
                    Retry
                </button>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.__aniVault = new AniVault();
});

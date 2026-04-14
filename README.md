# 🌀 AniVault | Anime Discovery Engine

AniVault is a sleek, modern Single Page Application (SPA) designed for anime enthusiasts to discover, search, and track their favorite titles. Powered by the [Jikan API](https://jikan.moe/) (v4), AniVault provides a seamless experience with real-time data fetching and a clean, responsive UI.

[AniVault Preview](https://aniv4ult.netlify.app/)

## ✨ Features

-   **Dynamic Discovery**: Browse top-rated anime across various categories.
-   **Advanced Filtering**: Filter results by **Status** (Airing, Complete, Upcoming), **Type** (TV, Movie, OVA, Special), and **Genres**.
-   **Real-time Search**: Instant results with built-in **Debouncing** to optimize API calls.
-   **Comprehensive Details**: Deep-dive into any title with a rich modal featuring:
    -   Synopsis & Studio info.
    -   Genre tags & User scores.
    -   Official YouTube trailers.
-   **Favorites System**: Save your "Must Watch" list locally with persistent **localStorage** integration.
-   **Responsive Design**: Fully optimized for Desktop, Tablet, and Mobile devices.
-   **Clean UI/UX**: Dark-themed aesthetic powered by Tailwind CSS with smooth hover effects and skeleton loading states.

## 🚀 Tech Stack

-   **Language**: Vanilla JavaScript (ES6+)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) (CDN)
-   **Icons**: [Lucide Icons](https://lucide.dev/)
-   **API**: [Jikan API v4](https://docs.api.jikan.moe/) (The unofficial MyAnimeList API)
-   **Architecture**: Object-Oriented Programming (OOP) with a centralized engine class.

## 🛠️ Installation & Local Setup

To run this project locally, follows these simple steps:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/renamamiyaaslimbantul/anivault.git
    cd anivault
    ```

2.  **Open with Live Server**:
    -   If using **VS Code**, install the "Live Server" extension.
    -   Right-click `index.html` and select **Open with Live Server**.
    -   Alternatively, simply open `index.html` in any modern web browser.

3.  **No Build Step Needed**:
    Since this project uses Vanilla JS and Tailwind via CDN, you don't need `npm install` or any complex build boilerplate. It's ready to fly out of the box!

## 📖 JSDoc & Code Quality

The codebase is written with **Clean Code** principles:
-   Modularized logic for fetching, filtering, and rendering.
-   Full **JSDoc** documentation for all core functions.
-   Consistent `camelCase` naming conventions.
-   Robust error handling for API edge cases.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---
*Developed with ❤️ as a portfolio project.*
# anivault

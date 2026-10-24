
const themeButton = document.getElementById("themeButton");
const homeButton = document.getElementById("homeButton");

const API_BASE_URL = "https://metube-api.maherq090.workers.dev";

let currentChannel = null;
let currentPlaylist = null;
let channelData = [];

let currentMode = "channels";

let currentVideos = [];
let currentPlaylists = [];
let currentPlaylistVideos = [];

let videoPageToken = null;
let playlistsPageToken = null;
let playlistVideosPageToken = null;

let isLoadingVideos = false;
let isLoadingPlaylists = false;

/* =========================
   SVG Icons
========================= */

function getIcon(name) {
    const icons = {
        moon: `
            <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5
                     8.5 8.5 0 1 0 20.5 15.5Z"/>
        `,
        sun: `
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2"/>
            <path d="M12 20v2"/>
            <path d="m4.93 4.93 1.41 1.41"/>
            <path d="m17.66 17.66 1.41 1.41"/>
            <path d="M2 12h2"/>
            <path d="M20 12h2"/>
            <path d="m6.34 17.66-1.41 1.41"/>
            <path d="m19.07 4.93-1.41 1.41"/>
        `,
        back: `<path d="m15 18-6-6 6-6"/>`,
        videos: `
            <rect x="3" y="5" width="18" height="14" rx="3"/>
            <path d="m10 9 5 3-5 3V9Z"/>
        `,
        playlists: `
            <path d="M4 6h12M4 10h12M4 14h7"/>
            <path d="m15 14 5 3-5 3v-6Z"/>
        `
    };

    return `
        <svg viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round"
             aria-hidden="true" focusable="false">
            ${icons[name] || ""}
        </svg>
    `;
}

/* =========================
   Keep Screen Awake
========================= */

async function setVideoScreenAwake(enabled) {
    const keepAwake = window.metubeKeepAwake;

    if (!keepAwake) return;

    try {
        if (enabled) {
            await keepAwake.keepAwake();
        } else {
            await keepAwake.allowSleep();
        }
    } catch (error) {
        console.error("Failed to update screen awake state:", error);
    }
}

/* =========================
   Safe Text / UI Helpers
========================= */

function createTextElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    element.textContent = text ?? "";
    return element;
}

function createBackButton(id, label = "Back") {
    const button = document.createElement("button");

    button.type = "button";
    button.id = id;
    button.className = "back-button";
    button.setAttribute("aria-label", label);
    button.innerHTML = `${getIcon("back")}<span></span>`;
    button.querySelector("span").textContent = label;

    return button;
}

function createCard(imageUrl, title, onClick, extraText = "") {
    const card = document.createElement("div");

    card.className = "channel-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", title || "Open item");

    if (imageUrl) {
        const image = document.createElement("img");

        image.src = imageUrl;
        image.alt = title || "";
        image.loading = "lazy";
        image.decoding = "async";

        image.addEventListener("error", () => {
            image.remove();
        }, { once: true });

        card.appendChild(image);
    }

    const content = document.createElement("div");
    content.className = "channel-card-content";

    content.appendChild(createTextElement("h3", "", title));

    if (extraText) {
        content.appendChild(
            createTextElement("p", "card-subtitle", extraText)
        );
    }

    card.appendChild(content);
    card.addEventListener("click", onClick);

    card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
        }
    });

    return card;
}

function showMessage(container, message) {
    if (!container) return;

    container.replaceChildren(
        createTextElement("p", "page-message", message)
    );
}

function getMain() {
    return document.querySelector(".main");
}

/* =========================
   Channel Tabs
========================= */

function createTabs(activeTab) {
    const tabs = document.createElement("div");

    tabs.className = "channel-tabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Channel content");

    const videosButton = document.createElement("button");

    videosButton.type = "button";
    videosButton.className = "channel-tab";

    if (activeTab === "videos") {
        videosButton.classList.add("active");
    }

    videosButton.innerHTML =
        `${getIcon("videos")}<span>Videos</span>`;

    videosButton.setAttribute("role", "tab");
    videosButton.setAttribute(
        "aria-selected",
        String(activeTab === "videos")
    );

    videosButton.addEventListener("click", () => {
        loadChannelVideos(currentChannel);
    });

    const playlistsButton = document.createElement("button");

    playlistsButton.type = "button";
    playlistsButton.className = "channel-tab";

    if (activeTab === "playlists") {
        playlistsButton.classList.add("active");
    }

    playlistsButton.innerHTML =
        `${getIcon("playlists")}<span>Playlists</span>`;

    playlistsButton.setAttribute("role", "tab");
    playlistsButton.setAttribute(
        "aria-selected",
        String(activeTab === "playlists")
    );

    playlistsButton.addEventListener("click", () => {
        loadChannelPlaylists(currentChannel);
    });

    tabs.append(videosButton, playlistsButton);

    return tabs;
}

/* =========================
   Load Channel Information
========================= */

async function loadChannels() {
    try {
        const channelIds = channels
            .map(channel => channel.id)
            .join(",");

        const response = await fetch(
            `${API_BASE_URL}/api/channels?ids=${encodeURIComponent(channelIds)}`
        );

        if (!response.ok) {
            throw new Error("Failed to load channels");
        }

        const data = await response.json();

        channelData = data.items || [];

        showChannels();
    } catch (error) {
        console.error(error);

        const main = getMain();

        main.replaceChildren();

        main.appendChild(
            createTextElement("h2", "", "Channels")
        );

        main.appendChild(
            createTextElement(
                "p",
                "page-message",
                "حدث خطأ أثناء تحميل القنوات. حاول مرة أخرى."
            )
        );
    }
}

/* =========================
   Channels Home
========================= */

function showChannels() {
    currentMode = "channels";
    currentChannel = null;
    currentPlaylist = null;

    setVideoScreenAwake(false);

    const main = getMain();

    main.replaceChildren();

    main.appendChild(
        createTextElement("h2", "", "Channels")
    );

    const container = document.createElement("div");

    container.id = "channelsContainer";
    container.className = "channels-container";

    channelData.forEach(channel => {
        const card = createCard(
            channel.image,
            channel.name,
            () => loadChannelVideos(channel)
        );

        container.appendChild(card);
    });

    main.appendChild(container);
}

/* =========================
   Channel Page Header
========================= */

function renderChannelHeader(activeTab) {
    const main = getMain();

    main.replaceChildren();

    const backButton = createBackButton("backToChannels");

    backButton.addEventListener("click", () => {
        showChannels();
    });

    main.appendChild(backButton);

    main.appendChild(
        createTextElement(
            "h2",
            "",
            currentChannel?.name || "Channel"
        )
    );

    main.appendChild(createTabs(activeTab));

    const container = document.createElement("div");

    container.id = "channelsContainer";
    container.className = "channels-container";

    main.appendChild(container);

    const loadMoreContainer = document.createElement("div");

    loadMoreContainer.id = "loadMoreContainer";

    main.appendChild(loadMoreContainer);

    return { container, loadMoreContainer };
}

/* =========================
   Channel Videos
========================= */

async function loadChannelVideos(channel) {
    if (!channel) return;

    currentChannel = channel;
    currentPlaylist = null;
    currentMode = "channel-videos";

    currentVideos = [];
    videoPageToken = null;
    isLoadingVideos = false;

    const { container } = renderChannelHeader("videos");

    showMessage(container, "جاري تحميل الفيديوهات...");

    await loadMoreVideos();
}

async function loadMoreVideos() {
    if (
        !currentChannel ||
        isLoadingVideos ||
        currentMode !== "channel-videos"
    ) {
        return;
    }

    const container = document.getElementById("channelsContainer");
    const loadMoreContainer = document.getElementById("loadMoreContainer");

    if (!container) return;

    isLoadingVideos = true;

    if (loadMoreContainer) {
        showMessage(loadMoreContainer, "جاري تحميل المزيد...");
    }

    try {
        let url =
            `${API_BASE_URL}/api/videos?channelId=` +
            encodeURIComponent(currentChannel.id);

        if (videoPageToken) {
            url += `&pageToken=${encodeURIComponent(videoPageToken)}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Failed to load videos");
        }

        const data = await response.json();

        currentVideos.push(...(data.items || []));

        videoPageToken = data.nextPageToken || null;

        displayVideos(currentVideos);
        updateLoadMoreButton();
    } catch (error) {
        console.error(error);

        if (container && currentVideos.length === 0) {
            showMessage(
                container,
                "حدث خطأ أثناء تحميل الفيديوهات. حاول مرة أخرى."
            );
        }

        if (loadMoreContainer) {
            loadMoreContainer.replaceChildren();
        }
    } finally {
        isLoadingVideos = false;
        updateLoadMoreButton();
    }
}

/* =========================
   Channel Playlists
========================= */

async function loadChannelPlaylists(channel) {
    if (!channel) return;

    currentChannel = channel;
    currentPlaylist = null;
    currentMode = "channel-playlists";

    currentPlaylists = [];
    playlistsPageToken = null;
    isLoadingPlaylists = false;

    const { container } = renderChannelHeader("playlists");

    showMessage(container, "جاري تحميل البلي ليستات...");

    await loadMorePlaylists();
}

async function loadMorePlaylists() {
    if (
        !currentChannel ||
        isLoadingPlaylists ||
        currentMode !== "channel-playlists"
    ) {
        return;
    }

    const container = document.getElementById("channelsContainer");
    const loadMoreContainer = document.getElementById("loadMoreContainer");

    if (!container) return;

    isLoadingPlaylists = true;

    if (loadMoreContainer) {
        showMessage(loadMoreContainer, "جاري تحميل المزيد...");
    }

    try {
        let url =
            `${API_BASE_URL}/api/playlists?channelId=` +
            encodeURIComponent(currentChannel.id);

        if (playlistsPageToken) {
            url += `&pageToken=${encodeURIComponent(playlistsPageToken)}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Failed to load playlists");
        }

        const data = await response.json();

        currentPlaylists.push(...(data.items || []));

        playlistsPageToken = data.nextPageToken || null;

        displayPlaylists(currentPlaylists);
    } catch (error) {
        console.error(error);

        if (container && currentPlaylists.length === 0) {
            showMessage(
                container,
                "حدث خطأ أثناء تحميل البلي ليستات."
            );
        }
    } finally {
        isLoadingPlaylists = false;
        updateLoadMoreButton();
    }
}

function displayPlaylists(playlists) {
    const container = document.getElementById("channelsContainer");

    if (!container) return;

    container.replaceChildren();

    if (playlists.length === 0) {
        showMessage(
            container,
            "ماكو بلي ليستات عامة متاحة بهالقناة."
        );

        return;
    }

    playlists.forEach(playlist => {
        const thumbnail =
            playlist.snippet?.thumbnails?.medium?.url ||
            playlist.snippet?.thumbnails?.high?.url ||
            playlist.snippet?.thumbnails?.default?.url ||
            "";

        const count = playlist.contentDetails?.itemCount;

        const subtitle =
            count !== undefined ? `${count} videos` : "Playlist";

        const card = createCard(
            thumbnail,
            playlist.snippet?.title || "Untitled playlist",
            () => loadPlaylistVideos(playlist),
            subtitle
        );

        container.appendChild(card);
    });
}

/* =========================
   Playlist Videos
========================= */

async function loadPlaylistVideos(playlist) {
    if (!playlist?.id) return;

    currentPlaylist = playlist;
    currentMode = "playlist-videos";

    currentPlaylistVideos = [];
    playlistVideosPageToken = null;
    isLoadingVideos = false;

    const main = getMain();

    main.replaceChildren();

    const backButton = createBackButton(
        "backToPlaylists",
        "Back to playlists"
    );

    backButton.addEventListener("click", () => {
        restoreChannelPlaylists();
    });

    main.appendChild(backButton);

    main.appendChild(
        createTextElement(
            "h2",
            "",
            playlist.snippet?.title || "Playlist"
        )
    );

    const container = document.createElement("div");

    container.id = "channelsContainer";
    container.className = "channels-container";

    main.appendChild(container);

    const loadMoreContainer = document.createElement("div");

    loadMoreContainer.id = "loadMoreContainer";

    main.appendChild(loadMoreContainer);

    showMessage(container, "جاري تحميل فيديوهات البلي ليست...");

    await loadMorePlaylistVideos();
}

async function loadMorePlaylistVideos() {
    if (
        !currentPlaylist ||
        isLoadingVideos ||
        currentMode !== "playlist-videos"
    ) {
        return;
    }

    const container = document.getElementById("channelsContainer");
    const loadMoreContainer = document.getElementById("loadMoreContainer");

    if (!container) return;

    isLoadingVideos = true;

    if (loadMoreContainer) {
        showMessage(loadMoreContainer, "جاري تحميل المزيد...");
    }

    try {
        let url =
            `${API_BASE_URL}/api/playlist-videos?playlistId=` +
            encodeURIComponent(currentPlaylist.id);

        if (playlistVideosPageToken) {
            url += `&pageToken=${encodeURIComponent(playlistVideosPageToken)}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Failed to load playlist videos");
        }

        const data = await response.json();

        currentPlaylistVideos.push(...(data.items || []));

        playlistVideosPageToken = data.nextPageToken || null;

        displayVideos(currentPlaylistVideos);
    } catch (error) {
        console.error(error);

        if (container && currentPlaylistVideos.length === 0) {
            showMessage(
                container,
                "حدث خطأ أثناء تحميل فيديوهات البلي ليست."
            );
        }
    } finally {
        isLoadingVideos = false;
        updateLoadMoreButton();
    }
}

function restoreChannelPlaylists() {
    currentMode = "channel-playlists";

    renderChannelHeader("playlists");

    displayPlaylists(currentPlaylists);

    updateLoadMoreButton();
}

/* =========================
   Display Videos
========================= */

function displayVideos(videos) {
    const container = document.getElementById("channelsContainer");

    if (!container) return;

    container.replaceChildren();

    if (!videos.length) {
        showMessage(container, "لا توجد فيديوهات متاحة.");
        return;
    }

    videos.forEach(video => {
        const videoId = video.id?.videoId;
        const title = video.snippet?.title || "Untitled video";

        const thumbnail =
            video.snippet?.thumbnails?.medium?.url ||
            video.snippet?.thumbnails?.high?.url ||
            video.snippet?.thumbnails?.default?.url ||
            "";

        if (!videoId) return;

        const card = createCard(
            thumbnail,
            title,
            () => openVideo(videoId, title)
        );

        container.appendChild(card);
    });
}

/* =========================
   Load More Button
========================= */

function updateLoadMoreButton() {
    const loadMoreContainer = document.getElementById("loadMoreContainer");

    if (!loadMoreContainer) return;

    loadMoreContainer.replaceChildren();

    let hasMore = false;
    let loading = false;
    let handler = null;

    if (currentMode === "channel-videos") {
        hasMore = Boolean(videoPageToken);
        loading = isLoadingVideos;
        handler = loadMoreVideos;
    } else if (currentMode === "channel-playlists") {
        hasMore = Boolean(playlistsPageToken);
        loading = isLoadingPlaylists;
        handler = loadMorePlaylists;
    } else if (currentMode === "playlist-videos") {
        hasMore = Boolean(playlistVideosPageToken);
        loading = isLoadingVideos;
        handler = loadMorePlaylistVideos;
    }

    if (!hasMore) return;

    const button = document.createElement("button");

    button.id = "loadMoreButton";
    button.type = "button";
    button.textContent = loading ? "جاري التحميل..." : "Load more";
    button.disabled = loading;

    button.addEventListener("click", async () => {
        button.disabled = true;
        button.textContent = "جاري التحميل...";
        await handler();
    });

    loadMoreContainer.appendChild(button);
}

/* =========================
   Restore Current Listing
========================= */

function renderCurrentListing() {
    if (currentMode === "channel-videos") {
        renderChannelHeader("videos");
        displayVideos(currentVideos);
        updateLoadMoreButton();
        return;
    }

    if (currentMode === "channel-playlists") {
        renderChannelHeader("playlists");
        displayPlaylists(currentPlaylists);
        updateLoadMoreButton();
        return;
    }

    if (currentMode === "playlist-videos") {
        const main = getMain();

        main.replaceChildren();

        const backButton = createBackButton(
            "backToPlaylists",
            "Back to playlists"
        );

        backButton.addEventListener("click", restoreChannelPlaylists);

        main.appendChild(backButton);

        main.appendChild(
            createTextElement(
                "h2",
                "",
                currentPlaylist?.snippet?.title || "Playlist"
            )
        );

        const container = document.createElement("div");

        container.id = "channelsContainer";
        container.className = "channels-container";

        main.appendChild(container);

        const loadMoreContainer = document.createElement("div");

        loadMoreContainer.id = "loadMoreContainer";

        main.appendChild(loadMoreContainer);

        displayVideos(currentPlaylistVideos);
        updateLoadMoreButton();
    }
}

/* =========================
   Video Player
========================= */

function openVideo(videoId, title) {
    const main = getMain();

    // Save the listing mode before switching to the player.
    const previousMode = currentMode;

    main.replaceChildren();

    const page = document.createElement("div");

    page.className = "video-page";

    const backButton = createBackButton("backToVideos", "Back");

    backButton.addEventListener("click", () => {
        setVideoScreenAwake(false);
        currentMode = previousMode;
        renderCurrentListing();
    });

    page.appendChild(backButton);

    page.appendChild(
        createTextElement("h2", "", title)
    );

    const wrapper = document.createElement("div");

    wrapper.className = "video-wrapper";

    const iframe = document.createElement("iframe");

    iframe.src =
        `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1`;

    iframe.title = title;

    iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";

    iframe.allowFullscreen = true;

    iframe.referrerPolicy = "strict-origin-when-cross-origin";

    wrapper.appendChild(iframe);
    page.appendChild(wrapper);
    main.appendChild(page);

    setVideoScreenAwake(true);
}

/* =========================
   Dark / Light Mode
========================= */

function updateThemeButton() {
    const isDark = document.body.classList.contains("dark");

    themeButton.innerHTML = getIcon(isDark ? "sun" : "moon");

    themeButton.setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode"
    );

    themeButton.title = isDark ? "Light mode" : "Dark mode";

    const themeColor = document.querySelector(
        'meta[name="theme-color"]'
    );

    if (themeColor) {
        themeColor.content = isDark ? "#191a1e" : "#ffffff";
    }
}

function toggleTheme() {
    document.body.classList.toggle("dark");
    updateThemeButton();
}

themeButton.addEventListener("click", toggleTheme);

/* =========================
   Home Button
========================= */

homeButton.addEventListener("click", event => {
    event.preventDefault();
    showChannels();
});

/* =========================
   Start App
========================= */

updateThemeButton();
loadChannels();

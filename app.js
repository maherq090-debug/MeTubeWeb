
const themeButton = document.getElementById("themeButton");
const homeButton = document.getElementById("homeButton");

const API_BASE_URL = "https://metube-api.maherq090.workers.dev";

let currentChannel = null;
let nextPageToken = null;
let currentVideos = [];
let channelData = [];
let isLoadingVideos = false;


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
        back: `
            <path d="m15 18-6-6 6-6"/>
        `
    };

    return `
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            ${icons[name] || ""}
        </svg>
    `;
}


/* =========================
   Keep Screen Awake
========================= */

async function setVideoScreenAwake(enabled) {
    const keepAwake = window.metubeKeepAwake;

    if (!keepAwake) {
        return;
    }

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
   Safe Text Helpers
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


/* =========================
   Create Channel / Video Card
========================= */

function createCard(imageUrl, title, onClick) {
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

    const heading = createTextElement("h3", "", title);
    content.appendChild(heading);
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

        const main = document.querySelector(".main");
        main.replaceChildren();

        main.appendChild(
            createTextElement("h2", "", "Channels")
        );

        main.appendChild(
            createTextElement(
                "p",
                "",
                "حدث خطأ أثناء تحميل القنوات. حاول مرة أخرى."
            )
        );
    }
}


/* =========================
   Channels Page
========================= */

function showChannels() {
    setVideoScreenAwake(false);

    const main = document.querySelector(".main");
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
   Load Channel Videos
========================= */

async function loadChannelVideos(channel) {
    currentChannel = channel;
    nextPageToken = null;
    currentVideos = [];
    isLoadingVideos = false;

    const main = document.querySelector(".main");
    main.replaceChildren();

    const backButton = createBackButton("backToChannels");

    backButton.addEventListener("click", () => {
        showChannels();
    });

    main.appendChild(backButton);
    main.appendChild(
        createTextElement("h2", "", channel.name)
    );

    const container = document.createElement("div");
    container.id = "channelsContainer";
    container.className = "channels-container";

    container.appendChild(
        createTextElement("p", "", "جاري تحميل الفيديوهات...")
    );

    main.appendChild(container);

    const loadMoreContainer = document.createElement("div");
    loadMoreContainer.id = "loadMoreContainer";
    main.appendChild(loadMoreContainer);

    await loadMoreVideos();
}


/* =========================
   Load More Videos
========================= */

async function loadMoreVideos() {
    const container = document.getElementById("channelsContainer");
    const loadMoreContainer = document.getElementById("loadMoreContainer");

    if (!container || !currentChannel || isLoadingVideos) {
        return;
    }

    isLoadingVideos = true;

    if (loadMoreContainer) {
        loadMoreContainer.replaceChildren();

        loadMoreContainer.appendChild(
            createTextElement("p", "", "جاري تحميل المزيد...")
        );
    }

    try {
        let url =
            `${API_BASE_URL}/api/videos?channelId=` +
            encodeURIComponent(currentChannel.id);

        if (nextPageToken) {
            url += `&pageToken=${encodeURIComponent(nextPageToken)}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Failed to load videos");
        }

        const data = await response.json();

        const videos = data.items || [];

        currentVideos.push(...videos);

        nextPageToken = data.nextPageToken || null;

        displayVideos(currentVideos, currentChannel);
        updateLoadMoreButton();

    } catch (error) {
        console.error(error);

        if (loadMoreContainer) {
            loadMoreContainer.replaceChildren();

            loadMoreContainer.appendChild(
                createTextElement(
                    "p",
                    "",
                    "حدث خطأ أثناء تحميل الفيديوهات."
                )
            );
        }
    } finally {
        isLoadingVideos = false;
    }
}


/* =========================
   Display Videos
========================= */

function displayVideos(videos, channel) {
    const container = document.getElementById("channelsContainer");

    if (!container) {
        return;
    }

    container.replaceChildren();

    if (videos.length === 0) {
        container.appendChild(
            createTextElement("p", "", "لا توجد فيديوهات متاحة.")
        );

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

        if (!videoId) {
            return;
        }

        const card = createCard(
            thumbnail,
            title,
            () => openVideo(videoId, title, channel)
        );

        container.appendChild(card);
    });
}


/* =========================
   Load More Button
========================= */

function updateLoadMoreButton() {
    const loadMoreContainer = document.getElementById("loadMoreContainer");

    if (!loadMoreContainer) {
        return;
    }

    loadMoreContainer.replaceChildren();

    if (!nextPageToken) {
        return;
    }

    const button = document.createElement("button");

    button.id = "loadMoreButton";
    button.type = "button";
    button.textContent = "Load more";

    button.addEventListener("click", async () => {
        if (isLoadingVideos) {
            return;
        }

        button.disabled = true;
        button.textContent = "جاري التحميل...";

        await loadMoreVideos();
    });

    loadMoreContainer.appendChild(button);
}


/* =========================
   Video Player
========================= */

function openVideo(videoId, title, channel) {
    const main = document.querySelector(".main");
    main.replaceChildren();

    const page = document.createElement("div");
    page.className = "video-page";

    const backButton = createBackButton("backToVideos");

    backButton.addEventListener("click", () => {
        showChannelVideosAgain(channel);
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

    // Keep the screen awake while the video page is open.
    setVideoScreenAwake(true);
}


/* =========================
   Return To Current Channel
========================= */

function showChannelVideosAgain(channel) {
    setVideoScreenAwake(false);

    const main = document.querySelector(".main");
    main.replaceChildren();

    const backButton = createBackButton("backToChannels");

    backButton.addEventListener("click", () => {
        showChannels();
    });

    main.appendChild(backButton);

    main.appendChild(
        createTextElement("h2", "", channel.name)
    );

    const container = document.createElement("div");
    container.id = "channelsContainer";
    container.className = "channels-container";

    main.appendChild(container);

    const loadMoreContainer = document.createElement("div");
    loadMoreContainer.id = "loadMoreContainer";

    main.appendChild(loadMoreContainer);

    displayVideos(currentVideos, channel);
    updateLoadMoreButton();
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

    const themeColor = document.querySelector('meta[name="theme-color"]');

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

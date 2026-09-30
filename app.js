const themeButton = document.getElementById("themeButton");

const API_BASE_URL = "https://metube-api.maherq090.workers.dev";

let currentChannel = null;
let nextPageToken = null;
let currentVideos = [];

let channelData = [];


/* =========================
   Screen Wake Lock
========================= */

let wakeLock = null;

async function requestWakeLock() {
    try {
        if (!("wakeLock" in navigator)) {
            return;
        }

        if (wakeLock !== null) {
            return;
        }

        wakeLock = await navigator.wakeLock.request("screen");

        wakeLock.addEventListener("release", () => {
            wakeLock = null;
        });

    } catch (error) {
        console.log("Wake Lock unavailable:", error);
        wakeLock = null;
    }
}

async function releaseWakeLock() {
    try {
        if (wakeLock !== null) {
            await wakeLock.release();
            wakeLock = null;
        }
    } catch (error) {
        console.log("Wake Lock release error:", error);
        wakeLock = null;
    }
}


/* =========================
   Restore Wake Lock
   when page becomes visible
========================= */

document.addEventListener("visibilitychange", () => {

    if (
        document.visibilityState === "visible" &&
        document.querySelector(".video-page")
    ) {
        requestWakeLock();
    }
});


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

        main.innerHTML = `
            <h2>Channels</h2>

            <p>
                حدث خطأ أثناء تحميل القنوات.
            </p>
        `;
    }
}


/* =========================
   Channels Page
========================= */

function showChannels() {

    releaseWakeLock();

    currentChannel = null;

    const main = document.querySelector(".main");

    main.innerHTML = `
        <h2>Channels</h2>

        <div id="channelsContainer" class="channels-container"></div>
    `;

    const container =
        document.getElementById("channelsContainer");

    channelData.forEach(channel => {

        const card =
            document.createElement("div");

        card.className = "channel-card";

        card.innerHTML = `
            ${
                channel.image
                    ? `<img src="${channel.image}" alt="${channel.name}">`
                    : ""
            }

            <div class="channel-card-content">
                <h3>${channel.name}</h3>
            </div>
        `;

        card.addEventListener("click", () => {
            loadChannelVideos(channel);
        });

        container.appendChild(card);
    });
}


/* =========================
   Load Channel Videos
========================= */

async function loadChannelVideos(channel) {

    await releaseWakeLock();

    currentChannel = channel;

    nextPageToken = null;

    currentVideos = [];

    const main =
        document.querySelector(".main");

    main.innerHTML = `
        <button
            class="back-button"
            id="backToChannels"
            type="button"
        >
            ← Back
        </button>

        <h2>${channel.name}</h2>

        <div
            id="channelsContainer"
            class="channels-container"
        >
            <p>جاري تحميل الفيديوهات...</p>
        </div>

        <div id="loadMoreContainer"></div>
    `;

    document
        .getElementById("backToChannels")
        .addEventListener("click", () => {
            showChannels();
        });

    await loadMoreVideos();
}


/* =========================
   Load More Videos
========================= */

async function loadMoreVideos() {

    const container =
        document.getElementById("channelsContainer");

    const loadMoreContainer =
        document.getElementById("loadMoreContainer");

    if (!container || !currentChannel) {
        return;
    }

    loadMoreContainer.innerHTML = `
        <p>جاري تحميل المزيد...</p>
    `;

    try {

        let url =
            `${API_BASE_URL}/api/videos?channelId=` +
            encodeURIComponent(currentChannel.id);

        if (nextPageToken) {
            url +=
                `&pageToken=${encodeURIComponent(nextPageToken)}`;
        }

        const response =
            await fetch(url);

        if (!response.ok) {
            throw new Error(
                "Failed to load videos"
            );
        }

        const data =
            await response.json();

        const videos =
            data.items || [];

        currentVideos.push(...videos);

        nextPageToken =
            data.nextPageToken || null;

        displayVideos(
            currentVideos,
            currentChannel
        );

        updateLoadMoreButton();

    } catch (error) {

        console.error(error);

        loadMoreContainer.innerHTML = `
            <p>
                حدث خطأ أثناء تحميل الفيديوهات.
            </p>
        `;
    }
}


/* =========================
   Display Videos
========================= */

function displayVideos(videos, channel) {

    const container =
        document.getElementById("channelsContainer");

    if (!container) {
        return;
    }

    if (videos.length === 0) {

        container.innerHTML = `
            <p>
                لا توجد فيديوهات متاحة.
            </p>
        `;

        return;
    }

    container.innerHTML = "";

    videos.forEach(video => {

        const videoId =
            video.id.videoId;

        const title =
            video.snippet.title;

        const thumbnail =
            video.snippet.thumbnails?.medium?.url;

        const card =
            document.createElement("div");

        card.className =
            "channel-card";

        card.innerHTML = `
            ${
                thumbnail
                    ? `<img src="${thumbnail}" alt="${title}">`
                    : ""
            }

            <div class="channel-card-content">
                <h3>${title}</h3>
            </div>
        `;

        card.addEventListener("click", () => {

            openVideo(
                videoId,
                title,
                channel
            );

        });

        container.appendChild(card);
    });
}


/* =========================
   Load More Button
========================= */

function updateLoadMoreButton() {

    const loadMoreContainer =
        document.getElementById(
            "loadMoreContainer"
        );

    if (!loadMoreContainer) {
        return;
    }

    if (nextPageToken) {

        loadMoreContainer.innerHTML = `
            <button
                id="loadMoreButton"
                type="button"
                style="
                    display: block;
                    margin: 30px auto;
                    padding: 12px 24px;
                    font-size: 16px;
                    cursor: pointer;
                "
            >
                Load more
            </button>
        `;

        document
            .getElementById("loadMoreButton")
            .addEventListener(
                "click",
                async () => {

                    const button =
                        document.getElementById(
                            "loadMoreButton"
                        );

                    button.disabled = true;

                    button.textContent =
                        "جاري التحميل...";

                    await loadMoreVideos();
                }
            );

    } else {

        loadMoreContainer.innerHTML = "";
    }
}


/* =========================
   Video Player
========================= */

async function openVideo(
    videoId,
    title,
    channel
) {

    const main =
        document.querySelector(".main");

    main.innerHTML = `
        <div class="video-page">

            <button
                class="back-button"
                id="backToVideos"
                type="button"
            >
                ← Back
            </button>

            <h2>${title}</h2>

            <div class="video-wrapper">

                <iframe
                    src="https://www.youtube.com/embed/${videoId}?autoplay=1"
                    title="${title}"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
                </iframe>

            </div>

        </div>
    `;

    /*
     * فقط هنا نطلب إبقاء الشاشة شغالة.
     * إذا فشل Wake Lock، الفيديو والموقع
     * يستمرون بالعمل بصورة طبيعية.
     */
    requestWakeLock();

    document
        .getElementById("backToVideos")
        .addEventListener(
            "click",
            async () => {

                await releaseWakeLock();

                showChannelVideosAgain(
                    channel
                );
            }
        );
}


/* =========================
   Return To Current Channel
========================= */

function showChannelVideosAgain(channel) {

    const main =
        document.querySelector(".main");

    main.innerHTML = `
        <button
            class="back-button"
            id="backToChannels"
            type="button"
        >
            ← Back
        </button>

        <h2>${channel.name}</h2>

        <div
            id="channelsContainer"
            class="channels-container"
        ></div>

        <div id="loadMoreContainer"></div>
    `;

    document
        .getElementById("backToChannels")
        .addEventListener(
            "click",
            () => {
                showChannels();
            }
        );

    displayVideos(
        currentVideos,
        channel
    );

    updateLoadMoreButton();
}


/* =========================
   Dark / Light Mode
========================= */

function toggleTheme() {

    document.body.classList.toggle("dark");

    if (
        document.body.classList.contains("dark")
    ) {
        themeButton.textContent = "☀️";
    } else {
        themeButton.textContent = "🌙";
    }
}


themeButton.addEventListener(
    "click",
    toggleTheme
);


/* =========================
   Start App
=========================

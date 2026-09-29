const themeButton = document.getElementById("themeButton");

const API_BASE_URL = "https://metube-api.maherq090.workers.dev";

let currentChannel = null;

function showChannels() {
    const main = document.querySelector(".main");

    main.innerHTML = `
        <h2>Channels</h2>

        <div id="channelsContainer" class="channels-container"></div>
    `;

    const container = document.getElementById("channelsContainer");

    channels.forEach(channel => {
        const card = document.createElement("div");

        card.className = "channel-card";

        card.innerHTML = `
            ${channel.image ? `<img src="${channel.image}" alt="${channel.name}">` : ""}

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

async function loadChannelVideos(channel) {
    currentChannel = channel;

    const main = document.querySelector(".main");

    main.innerHTML = `
        <button class="back-button" id="backToChannels" type="button">
            ← Back
        </button>

        <h2>${channel.name}</h2>

        <div id="channelsContainer" class="channels-container">
            <p>جاري تحميل الفيديوهات...</p>
        </div>
    `;

    const container = document.getElementById("channelsContainer");

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/videos?channelId=${encodeURIComponent(channel.id)}`
        );

        if (!response.ok) {
            throw new Error("فشل الاتصال بالخادم");
        }

        const data = await response.json();

        displayVideos(data.items || [], channel);

    } catch (error) {
        console.error(error);

        container.innerHTML = `
            <p>حدث خطأ أثناء تحميل الفيديوهات.</p>
        `;
    }

    document.getElementById("backToChannels").addEventListener("click", () => {
        showChannels();
    });
}

function displayVideos(videos, channel) {
    const container = document.getElementById("channelsContainer");

    if (videos.length === 0) {
        container.innerHTML = `
            <p>لا توجد فيديوهات متاحة.</p>
        `;
        return;
    }

    container.innerHTML = "";

    videos.forEach(video => {
        const videoId = video.id.videoId;
        const title = video.snippet.title;
        const thumbnail = video.snippet.thumbnails?.medium?.url;

        const card = document.createElement("div");

        card.className = "channel-card";

        card.innerHTML = `
            ${thumbnail ? `<img src="${thumbnail}" alt="${title}">` : ""}

            <div class="channel-card-content">
                <h3>${title}</h3>
            </div>
        `;

        card.addEventListener("click", () => {
            openVideo(videoId, title, channel);
        });

        container.appendChild(card);
    });
}

function openVideo(videoId, title, channel) {
    const main = document.querySelector(".main");

    main.innerHTML = `
        <div class="video-page">

            <button class="back-button" id="backToVideos" type="button">
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

    document.getElementById("backToVideos").addEventListener("click", () => {
        loadChannelVideos(channel);
    });
}

function toggleTheme() {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
        themeButton.textContent = "☀️";
    } else {
        themeButton.textContent = "🌙";
    }
}

themeButton.addEventListener("click", toggleTheme);

showChannels();

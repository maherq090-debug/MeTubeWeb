const channelsContainer = document.getElementById("channelsContainer");
const themeButton = document.getElementById("themeButton");

const API_BASE_URL = "https://metube-api.maherq090.workers.dev";

function displayChannels() {
    channelsContainer.innerHTML = "";

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

        channelsContainer.appendChild(card);
    });
}

async function loadChannelVideos(channel) {
    channelsContainer.innerHTML = `
        <p>جاري تحميل الفيديوهات...</p>
    `;

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

        channelsContainer.innerHTML = `
            <p>حدث خطأ أثناء تحميل الفيديوهات.</p>
        `;
    }
}

function displayVideos(videos, channel) {
    if (videos.length === 0) {
        channelsContainer.innerHTML = `
            <p>لا توجد فيديوهات متاحة.</p>
        `;
        return;
    }

    channelsContainer.innerHTML = "";

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
            openVideo(videoId, title);
        });

        channelsContainer.appendChild(card);
    });
}

function openVideo(videoId, title) {
    channelsContainer.innerHTML = `
        <div class="video-player" style="
            width: 100%;
        ">
            <h2 style="
                margin-bottom: 16px;
                font-size: 22px;
            ">${title}</h2>

            <div style="
                position: relative;
                width: 100%;
                aspect-ratio: 16 / 9;
                background: #000;
                border-radius: 10px;
                overflow: hidden;
            ">
                <iframe
                    src="https://www.youtube.com/embed/${videoId}?autoplay=1"
                    title="${title}"
                    style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        border: none;
                    "
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
                </iframe>
            </div>
        </div>
    `;
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

displayChannels();

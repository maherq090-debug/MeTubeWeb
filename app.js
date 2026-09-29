const channelsContainer = document.getElementById("channelsContainer");
const themeButton = document.getElementById("themeButton");

function displayChannels() {
    channelsContainer.innerHTML = "";

    channels.forEach(channel => {
        const card = document.createElement("div");

        card.className = "channel-card";

        card.innerHTML = `
            <img src="${channel.image}" alt="${channel.name}">
            
            <div class="channel-card-content">
                <h3>${channel.name}</h3>
            </div>
        `;

        channelsContainer.appendChild(card);
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

displayChannels();

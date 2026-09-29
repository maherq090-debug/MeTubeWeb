const channelsContainer = document.getElementById("channelsContainer");

function displayChannels() {
    channelsContainer.innerHTML = "";

    channels.forEach(channel => {
        const card = document.createElement("div");

        card.className = "channel-card";

        card.innerHTML = `
            <div class="channel-card-content">
                <h3>${channel.name}</h3>
            </div>
        `;

        channelsContainer.appendChild(card);
    });
}

displayChannels();

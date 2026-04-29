const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const statusText = document.getElementById("status");
const logBox = document.getElementById("logs");
const bitrateSel = document.getElementById("bitrate");
const fpsSel = document.getElementById("fps");
// Guide modal logic
const guideBtn = document.getElementById("guideBtn");
const guideModal = document.getElementById("guideModal");
const closeGuide = document.getElementById("closeGuide");

guideBtn.onclick = () => {
  guideModal.style.display = "flex";
};

closeGuide.onclick = () => {
  guideModal.style.display = "none";
};

// Close when clicking outside modal
guideModal.onclick = (e) => {
  if (e.target === guideModal) {
    guideModal.style.display = "none";
  }
};


disconnectBtn.style.display = "none";
connectBtn.disabled = true;

function addLog(msg) {
  logBox.innerHTML += `<div>${msg}</div>`;
  logBox.scrollTop = logBox.scrollHeight;
}

window.api.onLog(addLog);

// Auto device detection
setInterval(async () => {
  const res = await window.api.checkDevice();
  if (res.status === "ready") {
    statusText.innerText = "🟢 Device connected";
    connectBtn.disabled = false;
  } else {
    statusText.innerText = "🔴 No device";
    connectBtn.disabled = true;
  }
}, 2000);

connectBtn.onclick = async () => {
  await window.api.start({
    bitrate: bitrateSel.value,
    fps: fpsSel.value
  });

  connectBtn.style.display = "none";
  disconnectBtn.style.display = "block";
  statusText.innerText = "🟢 Streaming active";
};

disconnectBtn.onclick = async () => {
  await window.api.stop();
  connectBtn.style.display = "block";
  disconnectBtn.style.display = "none";
  statusText.innerText = "🔴 Disconnected";
};

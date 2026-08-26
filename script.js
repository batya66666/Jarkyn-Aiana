const targetDate = new Date("2026-10-19T16:00:00+06:00");

const progressBar = document.querySelector(".progress span");
const revealItems = document.querySelectorAll(".reveal");
const photos = document.querySelectorAll(".photo img");
const rsvpForm = document.querySelector(".rsvp-form");
const rsvpStatus = document.querySelector(".form-status");
const rsvpAdmin = document.querySelector(".rsvp-admin");
const rsvpCount = document.getElementById("rsvp-count");
const downloadRsvp = document.getElementById("download-rsvp");
const bgMusic = document.getElementById("bg-music");
const musicButton = document.querySelector(".music-button");
const RSVP_STORAGE_KEY = "jarkyn-rsvp-responses";

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.22 }
);

revealItems.forEach((item) => observer.observe(item));

function handlePhotoError(photo) {
  const fallback = photo.dataset.fallback;

  if (fallback) {
    photo.removeAttribute("data-fallback");
    photo.src = fallback;
    return;
  }

  photo.closest(".photo")?.classList.add("is-missing");
  photo.remove();
}

photos.forEach((photo) => {
  photo.addEventListener("error", () => handlePhotoError(photo));

  if (photo.complete && photo.naturalWidth === 0) {
    handlePhotoError(photo);
  }
});

function pad(value) {
  return String(Math.max(0, value)).padStart(2, "0");
}

function updateCountdown() {
  const diff = Math.max(0, targetDate.getTime() - Date.now());
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  document.getElementById("days").textContent = pad(days);
  document.getElementById("hours").textContent = pad(hours);
  document.getElementById("minutes").textContent = pad(minutes);
}

function updateProgress() {
  const page = document.documentElement;
  const maxScroll = page.scrollHeight - page.clientHeight;
  const percent = maxScroll <= 0 ? 0 : (page.scrollTop / maxScroll) * 100;
  progressBar.style.width = `${percent}%`;
}

function updateMusicButton() {
  if (!bgMusic || !musicButton) return;

  const isPlaying = !bgMusic.paused;
  musicButton.classList.toggle("is-playing", isPlaying);
  musicButton.setAttribute("aria-pressed", String(isPlaying));
  musicButton.setAttribute("aria-label", isPlaying ? "Выключить музыку" : "Включить музыку");
}

async function playMusic() {
  if (!bgMusic) return false;

  try {
    bgMusic.volume = 0.45;
    await bgMusic.play();
    updateMusicButton();
    return true;
  } catch {
    updateMusicButton();
    return false;
  }
}

function enableMusicOnce() {
  playMusic();
  window.removeEventListener("pointerdown", enableMusicOnce);
  window.removeEventListener("keydown", enableMusicOnce);
  window.removeEventListener("touchstart", enableMusicOnce);
}

function getStoredResponses() {
  try {
    return JSON.parse(localStorage.getItem(RSVP_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveStoredResponse(response) {
  const responses = getStoredResponses();
  responses.push(response);
  localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(responses));
}

function updateRsvpCount() {
  if (!rsvpCount) return;
  rsvpCount.textContent = `Жооптор: ${getStoredResponses().length}`;
}

function encodeFormData(formData) {
  return new URLSearchParams(formData).toString();
}

async function sendRsvp(formData) {
  if (window.location.protocol === "file:") return;

  await fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: encodeFormData(formData),
  });
}

function downloadResponses() {
  const responses = getStoredResponses();
  const rows = [
    ["createdAt", "name", "attendance"],
    ...responses.map((item) => [item.createdAt, item.name, item.attendance]),
  ];
  const csv = rows
    .map((row) => row.map((value) => `"${String(value || "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "rsvp-responses.csv";
  link.click();
  URL.revokeObjectURL(url);
}

if (rsvpForm) {
  rsvpForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!rsvpForm.reportValidity()) return;

    const formData = new FormData(rsvpForm);
    const response = {
      createdAt: new Date().toISOString(),
      name: String(formData.get("name") || "").trim(),
      attendance: String(formData.get("attendance") || ""),
    };

    saveStoredResponse(response);
    rsvpStatus.textContent = "Рахмат! Жообуңуз сакталды.";

    try {
      await sendRsvp(formData);
    } catch {
      rsvpStatus.textContent = "Рахмат! Жообуңуз сакталды.";
    }

    rsvpForm.reset();
    updateRsvpCount();
  });
}

if (rsvpAdmin && new URLSearchParams(window.location.search).get("admin") === "1") {
  rsvpAdmin.hidden = false;
  updateRsvpCount();
}

downloadRsvp?.addEventListener("click", downloadResponses);

musicButton?.addEventListener("click", async () => {
  if (!bgMusic) return;

  if (bgMusic.paused) {
    await playMusic();
  } else {
    bgMusic.pause();
    updateMusicButton();
  }
});

bgMusic?.addEventListener("play", updateMusicButton);
bgMusic?.addEventListener("pause", updateMusicButton);

window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);
window.addEventListener("pointerdown", enableMusicOnce, { once: true });
window.addEventListener("keydown", enableMusicOnce, { once: true });
window.addEventListener("touchstart", enableMusicOnce, { once: true, passive: true });

updateCountdown();
updateProgress();
updateMusicButton();
playMusic();
setInterval(updateCountdown, 60000);

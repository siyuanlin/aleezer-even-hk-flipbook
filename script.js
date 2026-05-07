
const slides = Array.from(document.querySelectorAll(".slide"));
const dots = document.querySelector("#dots");
const prevBtn = document.querySelector("#prevBtn");
const nextBtn = document.querySelector("#nextBtn");
const crumb = document.querySelector("#crumb");
const toast = document.querySelector("#toast");
const noteDialog = document.querySelector("#noteDialog");
const noteText = document.querySelector("#noteText");
const noteTitle = document.querySelector("#noteTitle");
const wishBtn = document.querySelector("#wishBtn");
const wishDialog = document.querySelector("#wishDialog");
const wishText = document.querySelector("#wishText");
const saveWish = document.querySelector("#saveWish");
const savedWish = document.querySelector("#savedWish");
const resetBtn = document.querySelector("#resetBtn");
const musicBtn = document.querySelector("#musicBtn");
const slidesEl = document.querySelector("#slides");

let current = 0;
let touchStartX = 0;
let touchStartY = 0;
let pointerStartedOnControl = false;
let isMusicPlaying = false;
let ambience = null;
let licensedTrack = null;
const validStamps = new Set(["art", "complexcon", "shikon", "cristal"]);
const storedStamps = JSON.parse(localStorage.getItem("ae-flipbook-stamps") || "[]").filter((stamp) => validStamps.has(stamp));
const collected = new Set(storedStamps);
const wishes = JSON.parse(localStorage.getItem("ae-flipbook-wishes") || "{}");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1600);
}

function renderDots() {
  dots.innerHTML = "";
  slides.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `跳到第 ${index + 1} 页`);
    dot.addEventListener("click", () => goTo(index));
    dots.appendChild(dot);
  });
}

function syncArchive() {
  document.querySelectorAll("[data-slot]").forEach((slot) => {
    slot.classList.toggle("collected", collected.has(slot.dataset.slot));
  });
}

function syncWish() {
  const saved = wishes[String(current)] || "";
  wishText.value = saved;
  savedWish.textContent = saved ? `Pinned: ${saved}` : "";
}

function sync() {
  crumb.textContent = slides[current].dataset.title;
  dots.querySelectorAll("button").forEach((dot, index) => {
    dot.classList.toggle("active", index === current);
  });
  prevBtn.disabled = current === 0;
  nextBtn.disabled = current === slides.length - 1;
  syncWish();
}

function goTo(index) {
  const next = Math.max(0, Math.min(index, slides.length - 1));
  if (next === current) return;

  slides[current].classList.toggle("prev-out", next > current);
  slides[current].classList.remove("active");
  current = next;
  slides[current].classList.remove("prev-out");
  slides[current].classList.add("active");
  sync();
}

function saveStamps() {
  localStorage.setItem("ae-flipbook-stamps", JSON.stringify(Array.from(collected)));
}

function createCityStarsAmbience() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;

  const ctx = new AudioContext();
  let timer = null;
  const chords = [
    [261.63, 329.63, 392.0, 493.88],
    [293.66, 349.23, 440.0, 523.25],
    [220.0, 329.63, 392.0, 493.88],
    [246.94, 329.63, 392.0, 587.33],
  ];
  const topNotes = [659.25, 587.33, 523.25, 493.88, 440.0, 523.25];
  let bar = 0;

  function tone(freq, start, duration, gainValue, type = "sine") {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  function playBar() {
    const now = ctx.currentTime + 0.02;
    const chord = chords[bar % chords.length];
    chord.forEach((freq, index) => tone(freq, now + index * 0.025, 1.65, 0.018, "triangle"));
    tone(chord[0] / 2, now, 0.55, 0.026, "sine");
    tone(chord[1] / 2, now + 0.72, 0.42, 0.018, "sine");
    tone(topNotes[bar % topNotes.length], now + 1.08, 0.58, 0.012, "sine");
    bar += 1;
  }

  return {
    async start() {
      await ctx.resume();
      playBar();
      timer = window.setInterval(playBar, 1800);
    },
    stop() {
      window.clearInterval(timer);
    },
  };
}

async function toggleMusic() {
  if (isMusicPlaying) {
    licensedTrack?.pause();
    ambience?.stop();
    isMusicPlaying = false;
    musicBtn.classList.remove("playing");
    showToast("City of Stars paused");
    return;
  }

  if (!licensedTrack) {
    licensedTrack = new Audio("./assets/city-of-stars.mp3");
    licensedTrack.loop = true;
    licensedTrack.preload = "auto";
    licensedTrack.volume = 0.72;
  }

  try {
    await licensedTrack.play();
    isMusicPlaying = true;
    musicBtn.classList.add("playing");
    showToast("Playing City of Stars");
  } catch {
    ambience ||= createCityStarsAmbience();
    if (!ambience) {
      showToast("当前浏览器不支持音频播放");
      return;
    }
    await ambience.start();
    isMusicPlaying = true;
    musicBtn.classList.add("playing");
    showToast("City of Stars-style ambience");
  }
}

renderDots();
syncArchive();
sync();

prevBtn.addEventListener("click", () => goTo(current - 1));
nextBtn.addEventListener("click", () => goTo(current + 1));
musicBtn.addEventListener("click", toggleMusic);

slidesEl.addEventListener("pointerdown", (event) => {
  touchStartX = event.clientX;
  touchStartY = event.clientY;
  pointerStartedOnControl = Boolean(event.target.closest("button, textarea, dialog"));
});

slidesEl.addEventListener("pointerup", (event) => {
  if (pointerStartedOnControl) return;
  const delta = event.clientX - touchStartX;
  const verticalDelta = Math.abs(event.clientY - touchStartY);
  if (Math.abs(delta) < 58) return;
  if (verticalDelta > Math.abs(delta) * 0.8) return;
  if (delta < 0) goTo(current + 1);
  if (delta > 0) goTo(current - 1);
});

document.querySelectorAll(".callout").forEach((callout) => {
  callout.addEventListener("pointerup", (event) => event.stopPropagation());
  callout.addEventListener("click", (event) => {
    event.stopPropagation();
    const stamp = callout.dataset.stamp;
    if (stamp) {
      collected.add(stamp);
      saveStamps();
      syncArchive();
      showToast(collected.size === validStamps.size ? "Love Atlas completed" : "Stamp collected");
    }

    noteTitle.textContent = stamp ? "Stamped Field Note" : "Field Note";
    noteText.textContent = callout.dataset.note;
    if (typeof noteDialog.showModal === "function") {
      noteDialog.showModal();
    }
  });
});

wishBtn.addEventListener("click", () => {
  syncWish();
  if (typeof wishDialog.showModal === "function") {
    wishDialog.showModal();
  }
});

saveWish.addEventListener("click", () => {
  const text = wishText.value.trim();
  if (!text) {
    showToast("先写一句想留住的话");
    return;
  }
  wishes[String(current)] = text;
  localStorage.setItem("ae-flipbook-wishes", JSON.stringify(wishes));
  syncWish();
  showToast("Note pinned");
});

resetBtn.addEventListener("click", () => {
  collected.clear();
  Object.keys(wishes).forEach((key) => delete wishes[key]);
  localStorage.removeItem("ae-flipbook-stamps");
  localStorage.removeItem("ae-flipbook-wishes");
  syncArchive();
  syncWish();
  showToast("Archive cleared");
});

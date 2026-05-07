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

let current = 0;
let touchStartX = 0;
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

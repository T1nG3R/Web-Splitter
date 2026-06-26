import { getChunkName, chunkBytes } from "./splitter.js";

// State
const state = {
  file: null,
  chunkSizeBytes: 2_000_000_000,
  convention: "7zip",
  isSplitting: false,
  chunks: [], // Array of { name, url, done }
  abortController: null,
};

// DOM refs
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const fileInfo = document.getElementById("file-info");
const fileNameEl = document.getElementById("file-name");
const fileSizeEl = document.getElementById("file-size");
const clearFileBtn = document.getElementById("clear-file-btn");
const chunkNumInput = document.getElementById("chunk-size-number");
const chunkUnitSel = document.getElementById("chunk-size-unit");
const chunkMsgEl = document.getElementById("chunk-size-message");
const presetBtns = document.querySelectorAll(".preset-btn");
const naming7zip = document.getElementById("naming-7zip");
const namingPart = document.getElementById("naming-part");
const splitBtn = document.getElementById("split-btn");
const progressSect = document.getElementById("progress-section");
const progressFill = document.getElementById("progress-bar-fill");
const progressLabel = document.getElementById("progress-label");
const chunkListSect = document.getElementById("chunk-list-section");
const chunkListEl = document.getElementById("chunk-list");
const restartBtn = document.getElementById("restart-btn");
const toastContainer = document.getElementById("toast-container");
const compatBanner = document.getElementById("compat-banner");

// Browser compatibility check
if (!window.File || !window.FileReader || !Blob.prototype.slice) {
  compatBanner.classList.remove("hidden");
  setSplitBtnDisabled(true);
}

// Helpers
export function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val % 1 === 0 ? val : val.toFixed(2)} ${units[i]}`;
}

const UNIT_MULTIPLIERS = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 };

export function getChunkSizeBytes() {
  const num = parseFloat(chunkNumInput.value);
  const unit = chunkUnitSel.value;
  if (isNaN(num) || num <= 0) return 0;
  return Math.floor(num * UNIT_MULTIPLIERS[unit]);
}

export function validateChunkSize() {
  const bytes = getChunkSizeBytes();
  chunkMsgEl.className = "chunk-size-message";

  if (bytes <= 0) {
    chunkMsgEl.textContent = "Chunk size must be greater than 0.";
    chunkMsgEl.classList.add("error");
    chunkMsgEl.classList.remove("hidden");
    setSplitBtnDisabled(true);
    return;
  }
  if (state.file && state.file.size === 0) {
    chunkMsgEl.textContent = "File is empty and cannot be split.";
    chunkMsgEl.classList.add("error");
    chunkMsgEl.classList.remove("hidden");
    setSplitBtnDisabled(true);
    return;
  }
  if (state.file && bytes >= state.file.size) {
    chunkMsgEl.textContent = `Chunk size exceeds file size — file will be downloaded as a single chunk.`;
    chunkMsgEl.classList.add("warning");
    chunkMsgEl.classList.remove("hidden");
    splitBtn.disabled = !state.file;
    return;
  }

  chunkMsgEl.classList.add("hidden");
  chunkMsgEl.textContent = "";
  splitBtn.disabled = !state.file;
}

// Toast
export function showToast(message, type = "info", durationMs = 6000) {
  const el = document.createElement("div");
  el.className = `toast${type === "warning" ? " warning" : ""}`;
  el.textContent = message;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), durationMs);
}

// File handling
function loadFile(file) {
  if (state.isSplitting) {
    const confirmed = confirm(
      "A split is in progress. Are you sure you want to load a new file? All progress will be lost.",
    );
    if (!confirmed) {
      // Reset the file input so the same file can be re-selected later
      fileInput.value = "";
      return;
    }
    resetSplitState();
  }

  state.file = file;
  fileNameEl.textContent = file.name;
  fileSizeEl.textContent = formatBytes(file.size);
  fileInfo.classList.remove("hidden");
  validateChunkSize();
}

function clearFile() {
  if (state.isSplitting) {
    const confirmed = confirm(
      "A split is in progress. Are you sure you want to clear the file? All progress will be lost.",
    );
    if (!confirmed) return;
    resetSplitState();
  }
  state.file = null;
  fileInput.value = "";
  fileInfo.classList.add("hidden");
  fileNameEl.textContent = "—";
  fileSizeEl.textContent = "—";
  validateChunkSize();
}

// Drop Zone events
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () =>
  dropZone.classList.remove("dragover"),
);
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer?.files?.[0];
  if (file) loadFile(file);
});
dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) loadFile(file);
});
clearFileBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  clearFile();
});

// Chunk size events
chunkNumInput.addEventListener("input", () => {
  clearActivePreset();
  validateChunkSize();
});
chunkUnitSel.addEventListener("change", () => {
  clearActivePreset();
  validateChunkSize();
});

function clearActivePreset() {
  presetBtns.forEach((btn) => btn.classList.remove("active"));
}

presetBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    chunkNumInput.value = btn.dataset.value;
    chunkUnitSel.value = btn.dataset.unit;
    clearActivePreset();
    btn.classList.add("active");
    validateChunkSize();
  });
});

// Naming convention events
naming7zip.addEventListener("change", () => {
  state.convention = "7zip";
});
namingPart.addEventListener("change", () => {
  state.convention = "part";
});

// beforeunload guard
window.addEventListener("beforeunload", (e) => {
  if (state.isSplitting) {
    e.preventDefault();
    e.returnValue = "";
  }
});

// Reset helpers
function resetSplitState() {
  revokeAllUrls();
  state.isSplitting = false;
  state.chunks = [];
  progressSect.classList.add("hidden");
  chunkListSect.classList.add("hidden");
  chunkListEl.innerHTML = "";
  progressFill.style.width = "0%";
  progressLabel.textContent = "Preparing…";
  splitBtn.disabled = !state.file;
  splitBtn.textContent = "✂ Split File";
}

// Expose for Task 4 (splitting logic)
export {
  state,
  dropZone,
  fileInput,
  fileInfo,
  fileNameEl,
  fileSizeEl,
  chunkNumInput,
  chunkUnitSel,
  presetBtns,
  naming7zip,
  namingPart,
  splitBtn,
  progressSect,
  progressFill,
  progressLabel,
  chunkListSect,
  chunkListEl,
  restartBtn,
  toastContainer,
  resetSplitState,
  loadFile,
  clearFile,
  showToast,
  getChunkName,
  chunkBytes,
};

// URL cleanup
function revokeAllUrls() {
  state.chunks.forEach((c) => {
    if (c.url) URL.revokeObjectURL(c.url);
  });
}

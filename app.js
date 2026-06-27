import { getChunkName, chunkBytes } from "./splitter.js";

// State
const state = {
  file: null,
  chunkSizeBytes: 2_000_000_000,
  convention: "7zip",
  isSplitting: false,
  chunks: [], // Array of { name, url, done }
  abortController: null,
  useDecimal: true,
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
const decimalToggle = document.getElementById("unit-decimal-toggle");
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
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const decimalUnits = ["B", "KB", "MB", "GB", "TB"];
  const binaryUnits = ["B", "KiB", "MiB", "GiB", "TiB"];
  const units = state.useDecimal ? decimalUnits : binaryUnits;
  const base = state.useDecimal ? 1000 : 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(base));
  const val = bytes / Math.pow(base, i);
  return `${val % 1 === 0 ? val : val.toFixed(2)} ${units[i]}`;
}

function getUnitMultipliers() {
  const base = state.useDecimal ? 1000 : 1024;
  return {
    B: 1,
    KB: base,
    MB: base ** 2,
    GB: base ** 3,
  };
}

function getChunkSizeBytes() {
  const num = parseFloat(chunkNumInput.value);
  const unit = chunkUnitSel.value;
  if (isNaN(num) || num <= 0) return 0;
  const multipliers = getUnitMultipliers();
  return Math.floor(num * multipliers[unit]);
}

// Accessibility helper
function setSplitBtnDisabled(disabled) {
  splitBtn.disabled = disabled;
  splitBtn.setAttribute("aria-disabled", String(disabled));
}

function validateChunkSize() {
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
    setSplitBtnDisabled(!state.file);
    return;
  }

  chunkMsgEl.classList.add("hidden");
  chunkMsgEl.textContent = "";
  setSplitBtnDisabled(!state.file);
}

// Toast
function showToast(message, type = "info", durationMs = 6000) {
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
  fileNameEl.title = file.name;
  fileInfo.title = file.name;
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
  fileNameEl.removeAttribute("title");
  fileInfo.removeAttribute("title");
  fileSizeEl.textContent = "—";
  validateChunkSize();
}

// Drop Zone events
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", (e) => {
  if (dropZone.contains(e.relatedTarget)) return;
  dropZone.classList.remove("dragover");
});
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer?.files?.[0];
  if (file) loadFile(file);
});
dropZone.addEventListener("click", (e) => {
  // If the user clicked the actual hidden input element, let it happen naturally.
  // Otherwise, programmatically click it.
  if (e.target !== fileInput) {
    fileInput.click();
  }
});
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

function updateUnitLabels() {
  const isDec = state.useDecimal;
  
  // 1. Update dropdown select option text
  const base = isDec ? "" : "i";
  for (let i = 0; i < chunkUnitSel.options.length; i++) {
    const opt = chunkUnitSel.options[i];
    if (opt.value === "B") continue;
    opt.textContent = opt.value.replace("B", base + "B");
  }

  // 2. Update presets button labels
  const presetTextsMap = {
    "preset-700mb": isDec ? "700 MB" : "700 MiB",
    "preset-1gb": isDec ? "1 GB" : "1 GiB",
    "preset-2gb": isDec ? "2 GB" : "2 GiB",
    "preset-4gb": isDec ? "4 GB" : "4 GiB",
  };

  presetBtns.forEach((btn) => {
    const labelSpan = btn.querySelector(".preset-label");
    const labelHtml = labelSpan ? labelSpan.outerHTML : "";
    const textBase = presetTextsMap[btn.id] || btn.textContent;
    btn.innerHTML = `${textBase}${labelHtml ? " " + labelHtml : ""}`;
  });

  // 3. Update File size display if a file is loaded
  if (state.file) {
    fileSizeEl.textContent = formatBytes(state.file.size);
  }
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

decimalToggle.addEventListener("change", () => {
  state.useDecimal = decimalToggle.checked;
  updateUnitLabels();
  validateChunkSize();
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
  setSplitBtnDisabled(!state.file);
  splitBtn.textContent = "✂ Split File";
}

// Chunk List UI helpers
function addChunkRow(name, index) {
  const li = document.createElement("li");
  li.className = "chunk-item";
  li.id = `chunk-row-${index}`;

  const statusSpan = document.createElement("span");
  statusSpan.className = "chunk-status";
  statusSpan.id = `chunk-status-${index}`;
  statusSpan.textContent = "⏳";

  const nameSpan = document.createElement("span");
  nameSpan.className = "chunk-name";
  nameSpan.textContent = name;

  const dlBtn = document.createElement("button");
  dlBtn.className = "chunk-download-btn";
  dlBtn.id = `chunk-dl-${index}`;
  dlBtn.disabled = true;
  dlBtn.setAttribute("aria-label", `Download ${name}`);
  dlBtn.textContent = "↓";

  li.appendChild(statusSpan);
  li.appendChild(nameSpan);
  li.appendChild(dlBtn);
  chunkListEl.appendChild(li);
}

function markChunkDone(index, url, name) {
  const row = document.getElementById(`chunk-row-${index}`);
  const status = document.getElementById(`chunk-status-${index}`);
  const dlBtn = document.getElementById(`chunk-dl-${index}`);
  if (row) row.classList.add("done");
  if (status) status.textContent = "✅";
  if (dlBtn) {
    dlBtn.disabled = false;
    dlBtn.addEventListener("click", () => triggerDownload(url, name));
  }
}

function triggerDownload(url, name) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Sequential auto-download
const DOWNLOAD_DELAY_MS = 300;

async function autoDownloadAll(startIndex = 0) {
  for (let i = startIndex; i < state.chunks.length; i++) {
    const chunk = state.chunks[i];
    if (!chunk.url) continue; // not ready yet (shouldn't happen in restart flow)
    triggerDownload(chunk.url, chunk.name);
    await new Promise((r) => setTimeout(r, DOWNLOAD_DELAY_MS));
  }
}

// Main split function
async function startSplit() {
  if (!state.file || state.isSplitting) return;

  const chunkSize = getChunkSizeBytes();
  if (chunkSize <= 0) return;

  // Setup
  state.isSplitting = true;
  state.chunks = [];
  chunkListEl.innerHTML = "";
  progressSect.classList.remove("hidden");
  chunkListSect.classList.remove("hidden");
  setSplitBtnDisabled(true);
  splitBtn.textContent = "Splitting…";

  const fileName = state.file.name;
  const convention = state.convention;

  // Pre-compute total chunks to build the list upfront
  const total = Math.ceil(state.file.size / chunkSize);

  // Pre-populate chunk rows with pending status
  for (let i = 0; i < total; i++) {
    const name = getChunkName(fileName, i, total, convention);
    state.chunks.push({ name, url: null, done: false });
    addChunkRow(name, i);
  }

  progressLabel.textContent = `Preparing ${total} chunk${total > 1 ? "s" : ""}…`;

  try {
    for await (const { blob, index } of chunkBytes(state.file, chunkSize)) {
      const name = state.chunks[index].name;
      const url = URL.createObjectURL(blob);
      state.chunks[index].url = url;
      state.chunks[index].done = true;
      markChunkDone(index, url, name);

      // Update progress
      const pct = Math.round(((index + 1) / total) * 100);
      progressFill.style.width = `${pct}%`;
      progressLabel.textContent = `Downloading ${index + 1} of ${total}: ${name}`;

      // Auto-download this chunk
      triggerDownload(url, name);
      await new Promise((r) => setTimeout(r, DOWNLOAD_DELAY_MS));
    }

    progressLabel.textContent = `✅ Done! ${total} chunk${total > 1 ? "s" : ""} ready.`;
    progressFill.style.width = "100%";

    showToast(
      "If any downloads were blocked by your browser, use the ↓ buttons to re-download them.",
      "info",
      8000,
    );
  } catch (err) {
    showToast(`Error during split: ${err.message}`, "warning");
    progressLabel.textContent = "⚠️ Split failed. Please try again.";
  } finally {
    state.isSplitting = false;
    setSplitBtnDisabled(!state.file);
    splitBtn.textContent = "✂ Split File";
  }
}

// Revoke all chunk URLs (cleanup)
function revokeAllUrls() {
  state.chunks.forEach((c) => {
    if (c.url) URL.revokeObjectURL(c.url);
  });
}
window.addEventListener("beforeunload", revokeAllUrls);

// Event: Split button
splitBtn.addEventListener("click", startSplit);

// Event: Restart auto-download
restartBtn.addEventListener("click", () => {
  if (state.chunks.length === 0) return;
  autoDownloadAll(0);
});

// Initial validation
validateChunkSize();

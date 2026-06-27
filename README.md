# ✂ WebSplitter

A free, private, browser-based file splitter. Split any file into chunks — no uploads, no server, everything stays on your device.

**[→ Open WebSplitter](https://t1ng3r.github.io/Web-Splitter/)**

## Features

- 🔒 **100% private** — files never leave your browser
- 📦 **Archive-compatible naming** — 7-Zip style (`.001`, `.002`) or Part style (`.part001`)
- 💾 **Any file, any size** — memory-efficient streaming via `Blob.slice()`
- ⚡ **Auto-download + manual re-download** — sequential auto-download with individual chunk buttons
- 🎛️ **Flexible chunk sizes** — presets (700 MB CD, 1 GB, 2 GB, 4 GB FAT32) or custom

## Usage

1. Drag & drop or click to select a file
2. Choose a chunk size (default: 2 GB)
3. Choose naming convention (default: 7-Zip style)
4. Click **✂ Split File**
5. Chunks download automatically — use the ↓ buttons to re-download any chunk

## Reassembling chunks

### 7-Zip style (`.001`, `.002`, …) — default

**Windows (7-Zip GUI):**

1. Place all chunk files in the same folder
2. Right-click the `.001` file → **7-Zip → Combine files…**
3. Click OK

**Windows (Command Prompt) — works for both naming styles:**

```cmd
copy /b "movie.mkv.001"+"movie.mkv.002"+"movie.mkv.003" "movie.mkv"
```

With many parts, use a wildcard — zero-padding keeps the order correct:

```cmd
copy /b "movie.mkv.00*" "movie.mkv"
```

**Linux / macOS:**

```bash
cat movie.mkv.001 movie.mkv.002 movie.mkv.003 > movie.mkv
# or with a glob:
cat movie.mkv.0* > movie.mkv
```

---

### Part style (`.part001`, `.part002`, …)

7-Zip does **not** recognize the Part naming convention as a split archive — use `copy /b` or `cat` to concatenate.

**Windows (Command Prompt):**

```cmd
copy /b "movie.mkv.part001"+"movie.mkv.part002"+"movie.mkv.part003" "movie.mkv"
```

With many parts:

```cmd
copy /b "movie.mkv.part*" "movie.mkv"
```

**Linux / macOS:**

```bash
cat movie.mkv.part* > movie.mkv
```

**PowerShell 7 (memory-safe streaming, for very large files):**

```powershell
$out = [System.IO.File]::OpenWrite("movie.mkv")
Get-ChildItem "movie.mkv.part*" | Sort-Object Name | ForEach-Object {
    $in = [System.IO.File]::OpenRead($_.FullName)
    $in.CopyTo($out)
    $in.Close()
}
$out.Close()
```

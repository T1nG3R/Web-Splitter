// Compute the padded suffix number string (minimum 3 digits, scales with total chunks)
function paddedIndex(index, totalChunks) {
  const digits = Math.max(3, String(totalChunks).length);
  return String(index + 1).padStart(digits, "0");
}

// Generate the filename for a chunk based on the naming convention
export function getChunkName(fileName, index, totalChunks, convention) {
  const pad = paddedIndex(index, totalChunks);
  if (convention === "part") {
    return `${fileName}.part${pad}`;
  }
  // 7-Zip style (default)
  return `${fileName}.${pad}`;
}

// Async generator that yields one sliced chunk at a time to minimize memory usage
export async function* chunkBytes(file, chunkSize) {
  if (!Number.isFinite(chunkSize) || chunkSize <= 0)
    throw new RangeError("chunkSize must be a finite number > 0");
  const total = Math.ceil(file.size / chunkSize);
  for (let i = 0; i < total; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const blob = file.slice(start, end);
    yield { blob, index: i, total };
  }
}

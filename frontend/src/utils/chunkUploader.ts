import { initChunkUpload, uploadChunkApi, completeChunkUpload, type UploadResult } from '../api/verifications';

export interface ChunkUploadOptions {
  chunkSize?: number; // default 2MB
  maxRetries?: number; // default 3
  onProgress?: (progressPercent: number, currentChunk: number, totalChunks: number) => void;
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Uploads a large file (e.g., video or high-res document) in 2MB chunks with auto-retry and progress tracking.
 */
export async function uploadFileInChunks(
  file: File,
  fileCategory: string = 'video',
  options?: ChunkUploadOptions
): Promise<UploadResult> {
  const maxRetries = options?.maxRetries ?? 3;

  // 1. Initialize session on backend
  const initRes = await initChunkUpload(file.name, file.size, file.type, fileCategory);
  const { uploadId, chunkSize, totalChunks } = initRes;

  // 2. Upload chunks sequentially
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunkBlob = file.slice(start, end);

    let attempts = 0;
    let success = false;
    let lastError: any = null;

    while (attempts < maxRetries && !success) {
      try {
        attempts++;
        await uploadChunkApi(uploadId, i, totalChunks, chunkBlob, (chunkProgress) => {
          if (options?.onProgress) {
            // Fine-grained progress interpolation
            const baseProgress = (i / totalChunks) * 100;
            const chunkContribution = (chunkProgress / totalChunks);
            const totalPercent = Math.min(Math.round(baseProgress + chunkContribution), 99);
            options.onProgress(totalPercent, i + 1, totalChunks);
          }
        });
        success = true;
      } catch (err: any) {
        lastError = err;
        console.warn(`Chunk ${i + 1}/${totalChunks} upload attempt ${attempts} failed. Retrying...`, err);
        if (attempts < maxRetries) {
          await sleep(1000 * Math.pow(2, attempts - 1)); // 1s, 2s, 4s backoff
        }
      }
    }

    if (!success) {
      throw new Error(
        lastError?.response?.data?.message ||
          `Upload failed on chunk ${i + 1} of ${totalChunks} after ${maxRetries} attempts. Please check your network.`
      );
    }

    if (options?.onProgress) {
      const overallPercent = Math.min(Math.round(((i + 1) / totalChunks) * 100), 99);
      options.onProgress(overallPercent, i + 1, totalChunks);
    }
  }

  // 3. Finalize assembly on backend
  const completeRes = await completeChunkUpload(uploadId, file.name, totalChunks);

  if (options?.onProgress) {
    options.onProgress(100, totalChunks, totalChunks);
  }

  return completeRes;
}

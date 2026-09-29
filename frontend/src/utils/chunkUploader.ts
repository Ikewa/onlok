import type { UploadResult } from '../api/verifications';

export interface ChunkUploadOptions {
  applicationId?: string;
  token?: string; // Optional token override
  chunkSize?: number; // default 2MB
  maxRetries?: number; // default 3
  onProgress?: (progressPercent: number, currentChunk: number, totalChunks: number) => void;
  onStatus?: (status: 'uploading' | 'retrying' | 'resuming') => void;
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const getApiBaseUrl = () => import.meta.env.PROD
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

const encodeMetadata = (metadata: Record<string, string>) => Object.entries(metadata)
  .map(([key, value]) => `${key} ${btoa(unescape(encodeURIComponent(value)))}`)
  .join(',');

interface TusResponse {
  status: number;
  headers: Headers;
}

interface TusError extends Error {
  status?: number;
  headers?: Headers;
  serverMessage?: string;
  traceId?: string;
}

const parseErrorMessage = (rawBody: string): string | undefined => {
  if (!rawBody) return undefined;
  try {
    const parsed = JSON.parse(rawBody);
    return typeof parsed?.message === 'string' ? parsed.message : undefined;
  } catch {
    return undefined;
  }
};

// Network failures, timeouts, offset conflicts, rate limits and server errors
// are worth retrying. Everything else is a permanent rejection.
const isRetryableTusError = (error: TusError): boolean => {
  const status = error?.status;
  if (status === undefined || status === null) return true;
  return status === 408 || status === 409 || status === 429 || status >= 500;
};

const requestTus = (
  method: string,
  url: string,
  body: XMLHttpRequestBodyInit | Document | null,
  headers: Record<string, string>,
  timeoutMs: number,
  onProgress?: (loaded: number, total: number) => void,
): Promise<TusResponse> => new Promise((resolve, reject) => {
  const request = new XMLHttpRequest();
  request.open(method, url);
  request.timeout = timeoutMs;
  Object.entries(headers).forEach(([key, value]) => request.setRequestHeader(key, value));
  request.upload.onprogress = (event) => {
    if (event.lengthComputable) onProgress?.(event.loaded, event.total);
  };
  request.onload = () => {
    const responseHeaders = new Headers();
    request.getAllResponseHeaders().trim().split(/[\r\n]+/).forEach((line) => {
      const separator = line.indexOf(':');
      if (separator > 0) responseHeaders.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
    });
    if (request.status >= 200 && request.status < 300) {
      resolve({ status: request.status, headers: responseHeaders });
    } else {
      const serverMessage = parseErrorMessage(request.responseText);
      const error: TusError = new Error(serverMessage || `Upload failed (HTTP ${request.status}).`);
      error.status = request.status;
      error.headers = responseHeaders;
      error.serverMessage = serverMessage;
      // Quote the trace id when reporting an upload failure: the resumable
      // upload endpoints are the ones most likely to need support help.
      error.traceId = responseHeaders.get('X-Trace-Id') || undefined;
      reject(error);
    }
  };
  request.onerror = () => reject(new Error('Network error during upload. Check your connection and try again.'));
  request.ontimeout = () => reject(new Error('Upload request timed out. Progress is saved, retry to resume.'));
  request.onabort = () => reject(new Error('Upload request was aborted'));
  const sendBody = request.send.bind(request) as (payload: unknown) => void;
  sendBody(body);
});

const getToken = (): string => {
  const directToken = localStorage.getItem('onlok_token');
  if (directToken) return directToken;
  try {
    const rawUser = localStorage.getItem('onlok_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      return parsed.token || '';
    }
  } catch {
    // fallback
  }
  return '';
};

const getResumeKey = (file: File, fileCategory: string, applicationId?: string) =>
  `onlok_tus:${applicationId || 'legacy'}:${fileCategory}:${file.name}:${file.size}:${file.lastModified}`;

interface StoredUpload {
  uploadId: string;
  uploadUrl: string;
}

const loadStoredUpload = (key: string): StoredUpload | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as StoredUpload : null;
  } catch {
    return null;
  }
};

/** Uploads a file using the tus protocol with offset recovery and bounded retries. */
export async function uploadFileInChunks(
  file: File,
  fileCategory: string = 'video',
  options?: ChunkUploadOptions
): Promise<UploadResult> {
  const token = options?.token || getToken();
  if (!token) {
    throw new Error('Not authorized, no token. Please sign in again.');
  }

  const maxRetries = options?.maxRetries ?? 3;
  const chunkSize = options?.chunkSize ?? 2 * 1024 * 1024;
  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

  if (!file.size) {
    throw new Error('The selected file is empty.');
  }

  const baseUrl = `${getApiBaseUrl()}/verifications/upload/tus`;
  // The JWT travels in the Authorization header only. It must never appear in
  // the URL: those end up in access logs, browser history and Location headers.
  const authHeaders = { Authorization: `Bearer ${token}`, 'Tus-Resumable': '1.0.0' };
  const resumeKey = getResumeKey(file, fileCategory, options?.applicationId);
  const storedUpload = loadStoredUpload(resumeKey);
  let uploadUrl = storedUpload?.uploadUrl || '';
  let uploadId = storedUpload?.uploadId || '';
  let offset = 0;

  if (uploadUrl && uploadId) {
    try {
      options?.onStatus?.('resuming');
      const status = await requestTus('HEAD', uploadUrl, null, authHeaders, 30000);
      offset = Number(status.headers.get('Upload-Offset') || 0);
    } catch {
      localStorage.removeItem(resumeKey);
      uploadUrl = '';
      uploadId = '';
    }
  }

  if (!uploadUrl || !uploadId) {
    let createError: unknown;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        options?.onStatus?.('uploading');
        const createRes = await requestTus('POST', baseUrl, null, {
          ...authHeaders,
          'Upload-Length': String(file.size),
          'Upload-Metadata': encodeMetadata({
            filename: file.name,
            filetype: file.type || 'application/octet-stream',
            'upload-category': fileCategory,
            ...(options?.applicationId ? { 'application-id': options.applicationId } : {}),
          }),
        }, 30000);

        const location = createRes.headers.get('Location');
        if (!location) throw new Error('Upload session was not created.');
        uploadUrl = new URL(location, window.location.origin).toString();
        uploadId = decodeURIComponent(uploadUrl.split('?')[0].split('/').pop() || '');
        offset = Number(createRes.headers.get('Upload-Offset') || 0);
        if (!uploadId) throw new Error('Upload session was not created.');
        localStorage.setItem(resumeKey, JSON.stringify({ uploadId, uploadUrl } satisfies StoredUpload));
        break;
      } catch (error) {
        createError = error;
        if (!isRetryableTusError(error as TusError)) throw error;
        options?.onStatus?.('retrying');
        if (attempt < maxRetries) await sleep(1000 * Math.pow(2, attempt - 1));
      }
    }
    if (!uploadUrl || !uploadId) throw createError || new Error('Upload session was not created.');
  }

  while (offset < file.size) {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        attempts++;
        const nextOffset = Math.min(offset + chunkSize, file.size);
        const chunk = file.slice(offset, nextOffset);
        const startingOffset = offset;
        const response = await requestTus('PATCH', uploadUrl, chunk, {
          ...authHeaders,
          'Content-Type': 'application/offset+octet-stream',
          'Upload-Offset': String(startingOffset),
        }, 60000, (loaded, total) => {
          const progress = Math.min(Math.round(((startingOffset + (loaded / total) * (nextOffset - startingOffset)) / file.size) * 100), 99);
          options?.onProgress?.(progress, Math.floor(startingOffset / chunkSize) + 1, totalChunks);
        });
        offset = Number(response.headers.get('Upload-Offset') || nextOffset);
        options?.onProgress?.(Math.min(Math.round((offset / file.size) * 100), 99), Math.ceil(offset / chunkSize), totalChunks);
        break;
      } catch (err) {
        // 4xx responses other than conflicts/rate limits are permanent
        // (invalid format, file too large, quota exhausted): fail fast rather
        // than burning the retry budget.
        if (!isRetryableTusError(err as TusError)) throw err;
        if (attempts >= maxRetries) throw err;
        options?.onStatus?.('retrying');
        try {
          const status = await requestTus('HEAD', uploadUrl, null, authHeaders, 30000);
          offset = Number(status.headers.get('Upload-Offset') || offset);
        } catch {
          // The next bounded retry will attempt the last known offset.
        }
        console.warn(`Tus upload attempt ${attempts} failed. Retrying...`, err);
        if (attempts < maxRetries) {
          await sleep(1000 * Math.pow(2, attempts - 1)); // 1s, 2s, 4s backoff
        }
      }
    }
  }

  if (offset < file.size) {
    throw new Error('Upload did not complete. Please retry to resume from where it stopped.');
  }

  options?.onProgress?.(100, totalChunks, totalChunks);
  localStorage.removeItem(resumeKey);
  return {
    uploadId,
    url: `/uploads/tus/${encodeURIComponent(uploadId)}`,
    filename: file.name,
    originalname: file.name,
    size: file.size,
  };
}

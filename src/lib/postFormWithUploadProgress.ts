/** Send multipart data with actual browser upload progress and a fetch-like response. */
export function postFormWithUploadProgress(
  url: string,
  formData: FormData,
  headers: Record<string, string>,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Upload cancelled.', 'AbortError')); return; }
    const request = new XMLHttpRequest();
    request.open('POST', url);
    request.responseType = 'arraybuffer';
    for (const [name, value] of Object.entries(headers)) request.setRequestHeader(name, value);
    const abort = () => request.abort();
    const cleanup = () => signal?.removeEventListener('abort', abort);
    signal?.addEventListener('abort', abort, { once: true });
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(Math.min(99, Math.round(event.loaded / event.total * 100)));
    };
    request.upload.onload = () => onProgress(100);
    request.onerror = () => { cleanup(); reject(new Error('Network error while uploading.')); };
    request.onabort = () => { cleanup(); reject(new DOMException('Upload cancelled.', 'AbortError')); };
    request.onload = () => {
      cleanup();
      if (!request.status) { reject(new Error('No response from the server.')); return; }
      const responseHeaders = new Headers();
      for (const line of request.getAllResponseHeaders().trim().split(/[\r\n]+/)) {
        const colon = line.indexOf(':');
        if (colon > 0) responseHeaders.append(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
      }
      resolve(new Response(request.response, { status: request.status, headers: responseHeaders }));
    };
    request.send(formData);
  });
}

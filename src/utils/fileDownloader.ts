/**
 * Triggers a direct download of a Blob file in the browser / mobile phone
 */
export function downloadFile(blob: Blob, filename: string): string {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';

  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    try {
      document.body.removeChild(a);
    } catch (_) {}
  }, 1000);

  return url;
}

/**
 * Formats seconds into MM:SS or MM:SS.SS
 */
export function formatTime(seconds: number, includeDecimals = false): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const formattedMins = mins.toString().padStart(2, '0');
  const formattedSecs = secs.toString().padStart(2, '0');

  if (includeDecimals) {
    const millis = Math.floor((seconds % 1) * 10);
    return `${formattedMins}:${formattedSecs}.${millis}`;
  }

  return `${formattedMins}:${formattedSecs}`;
}

/**
 * Formats bytes to readable KB / MB
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Formats timestamps to friendly date time (e.g. "20 nov, 10:15 pm")
 */
export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

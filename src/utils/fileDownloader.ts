/**
 * Triggers a direct download of a Blob file in the browser / mobile phone
 */
export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
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
 * Generates an automatic clean name for CRM audio
 */
export function generateAudioFilename(originalName: string | null, format: 'ogg' | 'mp3' | 'wav'): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;

  if (!originalName) {
    return `nota_voz_crm_${dateStr}.${format}`;
  }

  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_');
  return `${baseName}_crm.${format}`;
}

/**
 * Shared utilities for the Media Library system.
 * Used by the Media Library management page, the MediaLibraryPicker,
 * and the MediaSelector upload flow.
 */

/**
 * Get image dimensions from a URL by loading it into an Image element.
 * Returns { width, height } or { width: null, height: null } on error.
 * Lightweight — no server processing, just browser image decoding.
 */
export function getImageDimensions(url) {
  return new Promise((resolve) => {
    if (!url) return resolve({ width: null, height: null });
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: null, height: null });
    img.src = url;
  });
}

/**
 * Format file size in bytes to a human-readable string.
 * Returns '—' if no size provided.
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Determine asset_type from MIME type.
 * Maps common MIME types to the asset_type enum.
 */
export function assetTypeFromMime(mime) {
  if (!mime) return 'other';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'other';
  if (mime.includes('pdf') || mime.includes('document') || mime.includes('text') || mime.includes('sheet') || mime.includes('word') || mime.includes('presentation')) return 'document';
  return 'other';
}

/**
 * Validate a file before upload.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateFile(file, maxMB = 10) {
  if (!file) return { valid: false, error: 'No file selected' };
  if (file.size > maxMB * 1024 * 1024) {
    return { valid: false, error: `File too large (max ${maxMB}MB)` };
  }
  return { valid: true };
}

/**
 * Upload a file to Base44 public storage and create a LibraryAsset record.
 * Returns the created LibraryAsset record.
 * Throws on upload failure. LibraryAsset creation failure is caught
 * and logged — the URL is still returned for direct use.
 */
export async function uploadAndCreateAsset(file, base44) {
  const validation = validateFile(file);
  if (!validation.valid) throw new Error(validation.error);

  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  const asset_type = assetTypeFromMime(file.type);
  const title = file.name.replace(/\.[^.]+$/, ''); // filename without extension

  let dimensions = { width: null, height: null };
  if (asset_type === 'image') {
    dimensions = await getImageDimensions(file_url);
  }

  let asset = null;
  try {
    asset = await base44.entities.LibraryAsset.create({
      title,
      filename: file.name,
      url: file_url,
      asset_type,
      mime_type: file.type || '',
      file_size: file.size,
      width: dimensions.width,
      height: dimensions.height,
      alt_text: '',
      tags: [],
      is_archived: false,
      source: 'upload',
    });
  } catch (err) {
    // LibraryAsset creation failed — the file is still uploaded and usable.
    // Log but don't block; the caller gets the URL.
    console.warn('LibraryAsset creation failed (file still uploaded):', err?.message);
  }

  return { file_url, asset };
}
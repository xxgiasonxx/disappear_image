const MAGIC_NUMBERS: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function validateFileType(file: File): boolean {
  const fileType = file.type;
  if (fileType === 'image/jpeg') return true;
  if (fileType === 'image/png') return true;
  if (fileType === 'image/webp') return true;
  return false;
}

export async function validateMagicNumber(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const expected = MAGIC_NUMBERS[file.type];

  if (!expected) return false;

  for (let i = 0; i < expected.length; i++) {
    if (bytes[i] !== expected[i]) return false;
  }

  return true;
}

export function validateFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE;
}

export function validateFileSizeWithLimit(file: File, maxSize: number): boolean {
  return file.size <= maxSize;
}

export function sanitizeHtml(input: string): string {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

export function escapeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };
  return input.replace(/[&<>"']/g, (char) => map[char]);
}

export async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

export function validateImageDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): boolean {
  return width <= maxWidth && height <= maxHeight;
}
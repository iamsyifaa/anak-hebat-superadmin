// Aturan unggah logo sekolah (Contract v1.3): jpg/png/webp, maks. 2 MB,
// maks. 4096x4096 px (dimensi diperiksa backend; pelanggaran 422).
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Mengembalikan pesan error, atau null bila berkas boleh diunggah.
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type))
    return "Logo harus berformat JPG, PNG, atau WebP.";
  if (file.size > IMAGE_MAX_BYTES) return "Ukuran logo maksimal 2 MB.";
  return null;
}

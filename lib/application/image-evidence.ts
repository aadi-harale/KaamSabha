const MAX_INPUT_BYTES = 6 * 1024 * 1024;

export async function compressEvidence(file: File): Promise<{ dataUrl: string; mimeType: string; size: number }> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('Image must be smaller than 6 MB.');
  const source = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot prepare the image.');
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Image compression failed.')), 'image/jpeg', 0.76),
  );
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Image data was not readable.'));
    reader.onerror = () => reject(new Error('Image could not be read.'));
    reader.readAsDataURL(blob);
  });
  return { dataUrl, mimeType: blob.type, size: blob.size };
}

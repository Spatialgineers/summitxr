/**
 * Utility for compressing uploaded images on the client side to strictly under 1 MB.
 * Uses HTML5 Canvas API with dynamic downscaling and JPEG quality adjustments.
 */

export interface CompressionResult {
  dataUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  width: number;
  height: number;
  filename: string;
}

export async function compressImageToDataUrl(
  file: File,
  maxSizeBytes = 1048576, // 1 MB
  maxDimension = 1920
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('El archivo seleccionado no es una imagen válida.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Error al cargar la imagen.'));

      img.onload = () => {
        try {
          // Calculate initial dimensions respecting maxDimension
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('No se pudo obtener el contexto 2D del canvas.'));
          }

          // Draw image
          ctx.drawImage(img, 0, 0, width, height);

          // Iteratively reduce quality & dimensions to guarantee size < maxSizeBytes (1 MB)
          let quality = 0.9;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);

          // Base64 byte length estimation: (stringLength * 3) / 4 - padding
          let estimatedBytes = Math.round((dataUrl.length * 3) / 4);

          while (estimatedBytes > maxSizeBytes && quality > 0.1) {
            quality -= 0.15;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            estimatedBytes = Math.round((dataUrl.length * 3) / 4);
          }

          // If still over 1 MB, downscale dimensions
          let currentWidth = width;
          let currentHeight = height;

          while (estimatedBytes > maxSizeBytes && currentWidth > 320) {
            currentWidth = Math.round(currentWidth * 0.75);
            currentHeight = Math.round(currentHeight * 0.75);
            canvas.width = currentWidth;
            canvas.height = currentHeight;
            ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
            dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            estimatedBytes = Math.round((dataUrl.length * 3) / 4);
          }

          if (estimatedBytes > maxSizeBytes) {
            return reject(
              new Error('No se pudo comprimir la imagen por debajo de 1 MB. Prueba con una imagen más pequeña.')
            );
          }

          resolve({
            dataUrl,
            originalSizeBytes: file.size,
            compressedSizeBytes: estimatedBytes,
            width: currentWidth,
            height: currentHeight,
            filename: file.name,
          });
        } catch (err: any) {
          reject(new Error(err?.message || 'Error durante la compresión de la imagen.'));
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

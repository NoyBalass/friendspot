/**
 * Resize and compress an image file using Canvas before uploading.
 * @param file     Original image file
 * @param maxPx    Longest edge in pixels (default 1200)
 * @param quality  JPEG quality 0-1 (default 0.82)
 */
export function resizeImage(file: File, maxPx = 1200, quality = 0.82): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img
      if (width <= maxPx && height <= maxPx) {
        // Already small enough — just convert to JPEG for consistent compression
        toBlob(img, width, height, quality, file, resolve, reject)
        return
      }

      if (width > height) {
        height = Math.round((height / width) * maxPx)
        width = maxPx
      } else {
        width = Math.round((width / height) * maxPx)
        height = maxPx
      }

      toBlob(img, width, height, quality, file, resolve, reject)
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }

    img.src = objectUrl
  })
}

function toBlob(
  img: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
  originalFile: File,
  resolve: (f: File) => void,
  reject: (e: Error) => void,
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) { reject(new Error('Canvas not supported')); return }
  ctx.drawImage(img, 0, 0, width, height)
  canvas.toBlob(
    (blob) => {
      if (!blob) { reject(new Error('Canvas toBlob failed')); return }
      // Keep original filename but force .jpg extension
      const name = originalFile.name.replace(/\.[^.]+$/, '') + '.jpg'
      resolve(new File([blob], name, { type: 'image/jpeg' }))
    },
    'image/jpeg',
    quality,
  )
}

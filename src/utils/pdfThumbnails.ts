import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export async function generatePdfThumbnail(
  file: File,
  maxWidth = 200,
  maxHeight = 280,
): Promise<string | null> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const page = await pdf.getPage(1)

    const viewport = page.getViewport({ scale: 1 })
    const scale = Math.min(maxWidth / viewport.width, maxHeight / viewport.height)
    const scaledViewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = scaledViewport.width
    canvas.height = scaledViewport.height

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise

    return canvas.toDataURL('image/jpeg', 0.7)
  } catch {
    return null
  }
}

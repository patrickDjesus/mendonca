import { useState, useCallback } from 'react'
import { Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

interface PdfViewerProps {
  fileUrl: string
  fileName: string
  onClose: () => void
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3]

export default function PdfViewer({ fileUrl, fileName, onClose }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scaleIndex, setScaleIndex] = useState(2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const scale = ZOOM_STEPS[scaleIndex]

  const onDocumentLoad = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n)
    setCurrentPage(1)
    setLoading(false)
  }, [])

  const onDocumentLoadError = useCallback((err: Error) => {
    setError(err.message)
    setLoading(false)
  }, [])

  const zoomIn = useCallback(() => {
    setScaleIndex(i => Math.min(i + 1, ZOOM_STEPS.length - 1))
  }, [])

  const zoomOut = useCallback(() => {
    setScaleIndex(i => Math.max(i - 1, 0))
  }, [])

  const goToPrev = useCallback(() => {
    setCurrentPage(p => Math.max(p - 1, 1))
  }, [])

  const goToNext = useCallback(() => {
    setCurrentPage(p => Math.min(p + 1, numPages))
  }, [numPages])

  return (
    <div className="pdf-viewer-overlay">
      <div className="pdf-viewer-topbar">
        <div className="pdf-viewer-info">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="pdf-viewer-title">{fileName}</span>
        </div>

        <div className="pdf-viewer-controls">
          <button
            className="pdf-ctrl-btn"
            onClick={zoomOut}
            disabled={scaleIndex === 0}
            title="Diminuir zoom"
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <span className="pdf-zoom-label">{Math.round(scale * 100)}%</span>
          <button
            className="pdf-ctrl-btn"
            onClick={zoomIn}
            disabled={scaleIndex === ZOOM_STEPS.length - 1}
            title="Aumentar zoom"
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>

          <div className="pdf-ctrl-divider" />

          <button
            className="pdf-ctrl-btn"
            onClick={goToPrev}
            disabled={currentPage <= 1}
            title="Página anterior"
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="pdf-page-label">{currentPage} / {numPages}</span>
          <button
            className="pdf-ctrl-btn"
            onClick={goToNext}
            disabled={currentPage >= numPages}
            title="Próxima página"
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <button className="pdf-viewer-close" onClick={onClose} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="pdf-viewer-body">
        {error ? (
          <div className="pdf-viewer-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="pdf-placeholder-title">Erro ao carregar PDF</p>
            <p className="pdf-placeholder-hint">{error}</p>
          </div>
        ) : (
          <div className="pdf-react-viewer">
            {loading && (
              <div className="pdf-loading-spinner">
                <div className="pdf-spinner" />
                <span>Carregando PDF...</span>
              </div>
            )}
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoad}
              onLoadError={onDocumentLoadError}
              loading=""
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </div>
        )}
      </div>
    </div>
  )
}

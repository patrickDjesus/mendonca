import { useState, useCallback, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const pageWrappers = useRef<Map<number, HTMLDivElement>>(new Map())

  const scale = ZOOM_STEPS[scaleIndex]

  useEffect(() => {
    const el = overlayRef.current
    if (!el) return
    const onFsChange = () => setIsFullscreen(document.fullscreenElement === el)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const toggleFullscreen = useCallback(() => {
    const el = overlayRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else el.requestFullscreen()
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
        e.preventDefault()
        toggleFullscreen()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [toggleFullscreen])

  const onDocumentLoad = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n)
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

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const handleScroll = () => {
      const threshold = container.getBoundingClientRect().top + container.getBoundingClientRect().height * 0.35
      let closest = 1
      for (const [pageNum, el] of pageWrappers.current) {
        if (el.getBoundingClientRect().top <= threshold) closest = pageNum
      }
      setCurrentPage(closest)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [numPages])

  return (
    <div className={`pdf-viewer-overlay ${isFullscreen ? 'pdf-fullscreen' : ''}`} ref={overlayRef}>
      <div className="pdf-viewer-topbar">
        <div className="pdf-viewer-info">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="pdf-viewer-title">{fileName}</span>
        </div>

        <div className="pdf-viewer-controls">
          <button className="pdf-ctrl-btn" onClick={zoomOut} disabled={scaleIndex === 0} title="Diminuir zoom" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <span className="pdf-zoom-label">{Math.round(scale * 100)}%</span>
          <button className="pdf-ctrl-btn" onClick={zoomIn} disabled={scaleIndex === ZOOM_STEPS.length - 1} title="Aumentar zoom" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>

          <div className="pdf-ctrl-divider" />

          <span className="pdf-page-label">{currentPage} / {numPages}</span>

          <div className="pdf-ctrl-divider" />

          <button
            className={`pdf-ctrl-btn ${isFullscreen ? 'pdf-ctrl-active' : ''}`}
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            type="button"
          >
            {isFullscreen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
            )}
          </button>
        </div>

        <button className="pdf-viewer-close" onClick={onClose} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="pdf-viewer-body" ref={scrollContainerRef}>
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
              {Array.from({ length: numPages }, (_, i) => (
                <div
                  key={i + 1}
                  ref={el => {
                    if (el) pageWrappers.current.set(i + 1, el)
                    else pageWrappers.current.delete(i + 1)
                  }}
                  className="pdf-page-slot"
                >
                  <Page
                    pageNumber={i + 1}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                </div>
              ))}
            </Document>
          </div>
        )}
      </div>
    </div>
  )
}

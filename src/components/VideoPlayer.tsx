import { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import { extractYoutubeId } from '../utils/youtube'

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

let apiPromise: Promise<void> | null = null

function loadYouTubeApi(): Promise<void> {
  if (apiPromise) return apiPromise
  apiPromise = new Promise<void>(resolve => {
    if (window.YT && window.YT.Player) {
      resolve()
      return
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
    window.onYouTubeIframeAPIReady = () => resolve()
  })
  return apiPromise
}

function loadYoutubeApiInWindow(win: Window): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if ((win as any).YT?.Player) {
      resolve()
      return
    }
    ;(win as any).onYouTubeIframeAPIReady = () => resolve()
    const tag = win.document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.onerror = () => reject(new Error('Falha ao carregar API do YouTube'))
    win.document.head.appendChild(tag)
  })
}

export interface VideoPlayerHandle {
  getCurrentTime: () => number
  seekTo: (seconds: number) => void
  getDuration: () => number
}

interface Props {
  videoUrl: string
  autoPlay?: boolean
  onTimeUpdate?: (time: number) => void
  onDurationReady?: (duration: number) => void
  onPlayingChange?: (playing: boolean) => void
}

const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(function VideoPlayer(
  { videoUrl, autoPlay = true, onTimeUpdate, onDurationReady, onPlayingChange },
  ref,
) {
  const ytId = extractYoutubeId(videoUrl)
  const containerRef = useRef<HTMLDivElement>(null)
  const ytPlayerRef = useRef<any>(null)
  const htmlVideoRef = useRef<HTMLVideoElement>(null)
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const htmlTimeupdateCleanup = useRef<(() => void) | null>(null)
  const pipWindowRef = useRef<any>(null)
  const pipPlayerRef = useRef<any>(null)
  const pipFallbackRef = useRef<HTMLDivElement | null>(null)
  const pipTimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [pipActive, setPipActive] = useState(false)

  const pipSupported = ytId
    ? true
    : typeof document !== 'undefined' &&
      'pictureInPictureEnabled' in document &&
      document.pictureInPictureEnabled

  const stopTimeTracking = useCallback(() => {
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current)
      timeIntervalRef.current = null
    }
    if (htmlTimeupdateCleanup.current) {
      htmlTimeupdateCleanup.current()
      htmlTimeupdateCleanup.current = null
    }
  }, [])

  const startYtTracking = useCallback(() => {
    stopTimeTracking()
    onPlayingChange?.(true)
    timeIntervalRef.current = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        const t = ytPlayerRef.current.getCurrentTime()
        onTimeUpdate?.(t)
      }
    }, 500)
  }, [stopTimeTracking, onTimeUpdate, onPlayingChange])

  const startHtml5Tracking = useCallback(() => {
    stopTimeTracking()
    const el = htmlVideoRef.current
    if (!el) return
    onPlayingChange?.(!el.paused)
    const handler = () => onTimeUpdate?.(el.currentTime)
    el.addEventListener('timeupdate', handler)
    htmlTimeupdateCleanup.current = () => {
      el.removeEventListener('timeupdate', handler)
    }
  }, [stopTimeTracking, onTimeUpdate, onPlayingChange])

  const restoreYoutubeToContainer = useCallback(() => {
    const player = ytPlayerRef.current
    const iframe = player?.getIframe?.() as HTMLElement | undefined
    if (iframe && containerRef.current) {
      containerRef.current.appendChild(iframe)
      iframe.style.width = '100%'
      iframe.style.height = '100%'
      iframe.style.border = 'none'
      const rect = containerRef.current.getBoundingClientRect()
      if (rect.width > 0) player?.setSize?.(rect.width, rect.height)
    }
  }, [])

  const exitYoutubePip = useCallback(() => {
    const pipWin = pipWindowRef.current
    const fallback = pipFallbackRef.current
    if (fallback) {
      restoreYoutubeToContainer()
      fallback.remove()
      pipFallbackRef.current = null
      setPipActive(false)
      return
    }
    if (pipWin) {
      try { pipWin.close() } catch { /* noop */ }
    }
  }, [restoreYoutubeToContainer])

  const enterYoutubePip = useCallback(async () => {
    const player = ytPlayerRef.current
    const iframe = player?.getIframe?.() as HTMLElement | undefined
    if (!player || !iframe || !containerRef.current) return

    const hostRect = containerRef.current.getBoundingClientRect()
    const aspect = hostRect.height > 0 ? hostRect.width / hostRect.height : 16 / 9
    const width = Math.min(720, Math.max(320, Math.round(hostRect.width || 640)))
    const height = Math.round(width / aspect)

    const docPip = (window as any).documentPictureInPicture
    if (docPip?.requestWindow) {
      try {
        const wasPlaying = player.getPlayerState?.() === window.YT.PlayerState.PLAYING
        const startTime = player.getCurrentTime?.() || 0

        const pipWindow = await docPip.requestWindow({ width, height })
        pipWindowRef.current = pipWindow
        pipWindow.document.body.style.margin = '0'
        pipWindow.document.body.style.background = '#000'

        await loadYoutubeApiInWindow(pipWindow)

        const pipId = `pip-player-${Math.random().toString(36).slice(2, 8)}`
        const host = pipWindow.document.createElement('div')
        host.id = pipId
        host.style.width = '100%'
        host.style.height = '100%'
        pipWindow.document.body.appendChild(host)

        const pipPlayer = new pipWindow.YT.Player(pipId, {
          videoId: ytId,
          playerVars: {
            autoplay: wasPlaying ? 1 : 0,
            start: Math.max(0, Math.floor(startTime)),
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            controls: 1,
          },
          events: {
            onReady: () => {
              if (wasPlaying && pipPlayerRef.current) pipPlayerRef.current.playVideo?.()
            },
            onStateChange: (e: any) => {
              if (e.data === pipWindow.YT.PlayerState.PLAYING) {
                onPlayingChange?.(true)
                if (pipTimeIntervalRef.current) clearInterval(pipTimeIntervalRef.current)
                pipTimeIntervalRef.current = setInterval(() => {
                  if (pipPlayerRef.current?.getCurrentTime) {
                    onTimeUpdate?.(pipPlayerRef.current.getCurrentTime())
                  }
                }, 500)
              } else {
                onPlayingChange?.(false)
                if (pipTimeIntervalRef.current) {
                  clearInterval(pipTimeIntervalRef.current)
                  pipTimeIntervalRef.current = null
                }
              }
            },
          },
        })
        pipPlayerRef.current = pipPlayer

        try { player.pauseVideo?.() } catch { /* noop */ }

        pipWindow.addEventListener('pagehide', () => {
          if (!pipWindowRef.current) return
          const pipPlayer = pipPlayerRef.current
          const endTime = pipPlayer?.getCurrentTime?.() ?? startTime
          if (pipTimeIntervalRef.current) {
            clearInterval(pipTimeIntervalRef.current)
            pipTimeIntervalRef.current = null
          }
          pipPlayerRef.current = null
          pipWindowRef.current = null
          try { pipPlayer?.destroy?.() } catch { /* noop */ }
          const main = ytPlayerRef.current
          if (main) {
            try { main.seekTo?.(endTime, true) } catch { /* noop */ }
            if (wasPlaying) try { main.playVideo?.() } catch { /* noop */ }
          }
          setPipActive(false)
        })

        setPipActive(true)
        return
      } catch {
        // cai no fallback de janela flutuante na própria página
      }
    }

    const wrap = document.createElement('div')
    wrap.style.cssText =
      'position:fixed;right:20px;bottom:20px;width:340px;aspect-ratio:16/9;z-index:99999;' +
      'border-radius:12px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.5);background:#000;'
    wrap.appendChild(iframe)
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    iframe.style.border = 'none'
    const closeBtn = document.createElement('button')
    closeBtn.textContent = '✕'
    closeBtn.style.cssText =
      'position:absolute;top:8px;right:8px;z-index:2;width:28px;height:28px;border:none;border-radius:6px;' +
      'background:rgba(0,0,0,.6);color:#fff;font-size:14px;cursor:pointer;'
    closeBtn.addEventListener('click', () => exitYoutubePip())
    wrap.appendChild(closeBtn)
    document.body.appendChild(wrap)
    pipFallbackRef.current = wrap
    setPipActive(true)
  }, [ytId, onPlayingChange, onTimeUpdate, exitYoutubePip])

  const toggleYoutubePip = useCallback(() => {
    if (pipActive) {
      exitYoutubePip()
    } else {
      enterYoutubePip()
    }
  }, [pipActive, enterYoutubePip, exitYoutubePip])

  const togglePip = useCallback(async () => {
    if (ytId) {
      toggleYoutubePip()
      return
    }
    const el = htmlVideoRef.current
    if (!el || !pipSupported) return
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else if (typeof el.requestPictureInPicture === 'function') {
        await el.requestPictureInPicture()
      }
    } catch {
      // PiP rejeitado ou não suportado
    }
  }, [ytId, pipSupported, toggleYoutubePip])

  useImperativeHandle(ref, () => ({
    getCurrentTime: () => {
      if (ytId && ytPlayerRef.current?.getCurrentTime) return ytPlayerRef.current.getCurrentTime()
      if (htmlVideoRef.current) return htmlVideoRef.current.currentTime
      return 0
    },
    seekTo: (seconds: number) => {
      if (ytId && ytPlayerRef.current?.seekTo) {
        ytPlayerRef.current.seekTo(seconds, true)
      } else if (htmlVideoRef.current) {
        htmlVideoRef.current.currentTime = seconds
      }
    },
    getDuration: () => {
      if (ytId && ytPlayerRef.current?.getDuration) return ytPlayerRef.current.getDuration()
      if (htmlVideoRef.current) return htmlVideoRef.current.duration || 0
      return 0
    },
  }), [ytId])

  useEffect(() => {
    if (!ytId || !containerRef.current) return

    let destroyed = false
    const containerId = `yt-player-${Math.random().toString(36).slice(2, 8)}`
    const containerEl = containerRef.current

    loadYouTubeApi().then(() => {
      if (destroyed) return
      const div = document.createElement('div')
      div.id = containerId
      div.style.width = '100%'
      div.style.height = '100%'
      containerEl.appendChild(div)

      ytPlayerRef.current = new window.YT.Player(containerId, {
        videoId: ytId,
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          rel: 0,
          modestbranding: 1,
          controls: 1,
        },
        events: {
          onReady: (e: any) => {
            const dur = e.target.getDuration()
            if (dur > 0) onDurationReady?.(dur)
            startYtTracking()
          },
          onStateChange: (e: any) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              startYtTracking()
            } else {
              onPlayingChange?.(false)
              stopTimeTracking()
            }
          },
        },
      })
    })

    return () => {
      destroyed = true
      stopTimeTracking()
      onPlayingChange?.(false)
      if (pipTimeIntervalRef.current) {
        clearInterval(pipTimeIntervalRef.current)
        pipTimeIntervalRef.current = null
      }
      const pipPlayer = pipPlayerRef.current
      pipPlayerRef.current = null
      if (pipPlayer?.destroy) {
        try { pipPlayer.destroy() } catch { /* noop */ }
      }
      if (pipWindowRef.current) {
        pipWindowRef.current = null
        try { pipWindowRef.current?.close?.() } catch { /* noop */ }
      }
      if (pipFallbackRef.current) {
        pipFallbackRef.current.remove()
        pipFallbackRef.current = null
      }
      const player = ytPlayerRef.current
      if (player?.destroy) {
        try { player.destroy() } catch { /* noop */ }
      }
      ytPlayerRef.current = null
      setPipActive(false)
      if (containerEl) {
        containerEl.innerHTML = ''
      }
    }
  }, [ytId, autoPlay, onDurationReady, startYtTracking, stopTimeTracking, onPlayingChange])

  useEffect(() => {
    if (ytId) return
    const el = htmlVideoRef.current
    if (!el) return
    startHtml5Tracking()
    const onLoaded = () => {
      if (el.duration && isFinite(el.duration)) onDurationReady?.(el.duration)
    }
    const onPlay = () => onPlayingChange?.(true)
    const onPause = () => { onPlayingChange?.(false); stopTimeTracking() }
    const onEnterPip = () => setPipActive(true)
    const onLeavePip = () => setPipActive(false)
    el.addEventListener('loadedmetadata', onLoaded)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('enterpictureinpicture', onEnterPip)
    el.addEventListener('leavepictureinpicture', onLeavePip)
    return () => {
      stopTimeTracking()
      el.removeEventListener('loadedmetadata', onLoaded)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('enterpictureinpicture', onEnterPip)
      el.removeEventListener('leavepictureinpicture', onLeavePip)
    }
  }, [ytId, startHtml5Tracking, onDurationReady, stopTimeTracking, onPlayingChange])

  useEffect(() => {
    return () => stopTimeTracking()
  }, [stopTimeTracking])

  const pipButton = (
    <button
      type="button"
      className={`video-watch-pip-btn${pipActive ? ' active' : ''}`}
      onClick={togglePip}
      aria-label={pipActive ? 'Sair do Picture-in-Picture' : 'Ativar Picture-in-Picture'}
      title={pipActive ? 'Sair do PiP' : 'Picture-in-Picture'}
    >
      {pipActive ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 6h12v6H6z" />
          <path d="M12 12v4" />
          <path d="M9 16h6" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <rect x="12" y="10" width="8" height="6" rx="1" fill="currentColor" stroke="none" />
        </svg>
      )}
    </button>
  )

  if (ytId) {
    return (
      <div className="video-watch-player-yt-wrap">
        <div
          ref={containerRef}
          className="video-watch-player-yt"
          style={{ width: '100%', height: '100%' }}
        />
        {pipSupported && pipButton}
      </div>
    )
  }

  return (
    <div className="video-watch-player-html5-wrap">
      <video
        ref={htmlVideoRef}
        src={videoUrl}
        className="video-watch-player-html5"
        controls
        autoPlay={autoPlay}
      />
      {pipSupported && pipButton}
    </div>
  )
})

export default VideoPlayer

import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react'

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1] ?? null
}

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
}

const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(function VideoPlayer(
  { videoUrl, autoPlay = true, onTimeUpdate, onDurationReady },
  ref,
) {
  const ytId = extractYoutubeId(videoUrl)
  const containerRef = useRef<HTMLDivElement>(null)
  const ytPlayerRef = useRef<any>(null)
  const htmlVideoRef = useRef<HTMLVideoElement>(null)
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTimeTracking = useCallback(() => {
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current)
      timeIntervalRef.current = null
    }
  }, [])

  const startYtTracking = useCallback(() => {
    stopTimeTracking()
    timeIntervalRef.current = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        const t = ytPlayerRef.current.getCurrentTime()
        onTimeUpdate?.(t)
      }
    }, 500)
  }, [stopTimeTracking, onTimeUpdate])

  const startHtml5Tracking = useCallback(() => {
    stopTimeTracking()
    const el = htmlVideoRef.current
    if (!el) return
    const handler = () => onTimeUpdate?.(el.currentTime)
    el.addEventListener('timeupdate', handler)
    timeIntervalRef.current = setInterval(() => {
      if (el && !el.paused) onTimeUpdate?.(el.currentTime)
    }, 500)
    return () => {
      el.removeEventListener('timeupdate', handler)
    }
  }, [stopTimeTracking, onTimeUpdate])

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

    loadYouTubeApi().then(() => {
      if (destroyed || !containerRef.current) return
      const div = document.createElement('div')
      div.id = containerId
      div.style.width = '100%'
      div.style.height = '100%'
      containerRef.current!.appendChild(div)

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
              stopTimeTracking()
            }
          },
        },
      })
    })

    return () => {
      destroyed = true
      stopTimeTracking()
      const player = ytPlayerRef.current
      if (player?.destroy) {
        try { player.destroy() } catch { /* noop */ }
        ytPlayerRef.current = null
      }
      const container = containerRef.current
      if (container) {
        container.innerHTML = ''
      }
    }
  }, [ytId, autoPlay, onDurationReady, startYtTracking, stopTimeTracking])

  useEffect(() => {
    if (ytId) return
    const el = htmlVideoRef.current
    if (!el) return
    const cleanup = startHtml5Tracking()
    const onLoaded = () => {
      if (el.duration && isFinite(el.duration)) onDurationReady?.(el.duration)
    }
    el.addEventListener('loadedmetadata', onLoaded)
    return () => {
      cleanup?.()
      el.removeEventListener('loadedmetadata', onLoaded)
    }
  }, [ytId, startHtml5Tracking, onDurationReady, stopTimeTracking])

  useEffect(() => {
    return () => stopTimeTracking()
  }, [stopTimeTracking])

  if (ytId) {
    return (
      <div
        ref={containerRef}
        className="video-watch-player-yt"
        style={{ width: '100%', height: '100%' }}
      />
    )
  }

  return (
    <video
      ref={htmlVideoRef}
      src={videoUrl}
      className="video-watch-player-html5"
      controls
      autoPlay={autoPlay}
    />
  )
})

export default VideoPlayer

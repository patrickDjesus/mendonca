import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export interface Notification {
  id: string
  type: 'level_up' | 'achievement' | 'info' | 'xp_gain'
  title: string
  message: string
  icon?: string
  xpAmount?: number
}

interface NotificationContextValue {
  push: (n: Omit<Notification, 'id'>) => void
}

const NotificationContext = createContext<NotificationContextValue>({ push: () => {} })

export function useNotifications() {
  return useContext(NotificationContext)
}

let globalPush: ((n: Omit<Notification, 'id'>) => void) | null = null

export function pushNotification(n: Omit<Notification, 'id'>) {
  if (globalPush) globalPush(n)
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const push = useCallback((n: Omit<Notification, 'id'>) => {
    const id = crypto.randomUUID()
    setNotifications(prev => [...prev, { ...n, id }])
  }, [])

  useEffect(() => { globalPush = push; return () => { globalPush = null } }, [push])

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  return (
    <NotificationContext.Provider value={{ push }}>
      {children}
      <div className="notif-container">
        {notifications.map(n => (
          <NotificationToast key={n.id} notification={n} onDismiss={() => dismiss(n.id)} />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

function NotificationToast({ notification, onDismiss }: { notification: Notification; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const borderColor = notification.type === 'xp_gain' ? '#daa03c' : notification.type === 'level_up' ? '#daa03c' : notification.type === 'achievement' ? '#b450b4' : '#508cc8'

  return (
    <div className="notif-toast" style={{ borderLeftColor: borderColor }}>
      {notification.type === 'xp_gain' ? (
        <div className="notif-icon notif-icon-xp">
          <img src="/XP.png" alt="XP" className="notif-xp-img" />
        </div>
      ) : (
        <div className="notif-icon" style={{ background: `${borderColor}20`, color: borderColor }}>
          {notification.type === 'level_up' && '⬆'}
          {notification.type === 'achievement' && (notification.icon || '🏆')}
          {notification.type === 'info' && 'ℹ'}
        </div>
      )}
      <div className="notif-body">
        <span className="notif-title">{notification.title}</span>
        <span className="notif-message">{notification.message}</span>
      </div>
      <button className="notif-close" onClick={onDismiss} type="button">&times;</button>
    </div>
  )
}

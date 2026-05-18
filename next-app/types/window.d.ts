declare global {
  interface Window {
    __ENV?: {
      TRACKER_WS_URL?: string
      [key: string]: string | undefined
    }
  }
}

export {}

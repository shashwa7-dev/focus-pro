import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      startSession: (sites: string[]) => Promise<{ ok: boolean; error?: string }>
      endSession: () => Promise<{ ok: boolean; error?: string }>
      notify: (data: { title: string; body: string }) => Promise<void>
    }
  }
}

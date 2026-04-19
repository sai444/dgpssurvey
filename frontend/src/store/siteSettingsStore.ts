import { create } from 'zustand'
import type { SiteSettings } from '@/types'
import { siteSettingsApi } from '@/api'

interface SiteSettingsStore {
  settings: SiteSettings | null
  loading: boolean
  loaded: boolean
  fetchSettings: () => Promise<void>
  updateSettings: (settings: SiteSettings) => void
}

export const useSiteSettingsStore = create<SiteSettingsStore>((set, get) => ({
  settings: null,
  loading: false,
  loaded: false,

  fetchSettings: async () => {
    if (get().loaded) return
    set({ loading: true })
    try {
      const { data } = await siteSettingsApi.get()
      set({ settings: data, loaded: true })
    } catch {
      // Settings not available yet
    } finally {
      set({ loading: false })
    }
  },

  updateSettings: (settings: SiteSettings) => {
    set({ settings, loaded: true })
  },
}))

import { create } from "zustand"

interface AsteroidStore {
  // Settings
  maxAsteroids: number
  minSize: number
  maxSize: number
  spawnRate: number // asteroids per second

  // Actions
  setMaxAsteroids: (value: number) => void
  setMinSize: (value: number) => void
  setMaxSize: (value: number) => void
  setSpawnRate: (value: number) => void
}

export const useAsteroidStore = create<AsteroidStore>((set) => ({
  // Default settings
  maxAsteroids: 10,
  minSize: 5,
  maxSize: 15,
  spawnRate: 1,

  // Actions
  setMaxAsteroids: (value) => set({ maxAsteroids: value }),
  setMinSize: (value) => set({ minSize: value }),
  setMaxSize: (value) => set({ maxSize: value }),
  setSpawnRate: (value) => set({ spawnRate: value }),
}))

import { create } from "zustand";

interface SaveStore {
  savedPosts: Record<string, boolean>;
  toggle: (slug: string) => void;
  setSaved: (slug: string, saved: boolean) => void;
}

export const useSaveStore = create<SaveStore>((set) => ({
  savedPosts: {},
  toggle: (slug) =>
    set((state) => ({
      savedPosts: {
        ...state.savedPosts,
        [slug]: !state.savedPosts[slug],
      },
    })),
  setSaved: (slug, saved) =>
    set((state) => ({
      savedPosts: {
        ...state.savedPosts,
        [slug]: saved,
      },
    })),
}));
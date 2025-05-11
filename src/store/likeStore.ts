import { create } from "zustand";

interface LikeStore {
  likedPosts: Record<string, boolean>;
  toggle: (slug: string) => void;
  setLiked: (slug: string, saved: boolean) => void;
}

export const useLikeStore = create<LikeStore>((set) => ({
  likedPosts: {},
  toggle: (slug) =>
    set((state) => ({
      likedPosts: {
        ...state.likedPosts,
        [slug]: !state.likedPosts[slug],
      },
    })),
  setLiked: (slug, liked) =>
    set((state) => ({
      likedPosts: {
        ...state.likedPosts,
        [slug]: liked,
      },
    })),
}));
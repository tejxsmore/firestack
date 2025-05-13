import { create } from "zustand";

interface LikeStore {
  likedPosts: Record<string, boolean>;
  toggle: (slug: string) => void;
  setLiked: (slug: string, liked: boolean) => void;
}

export const useLikeStore = create<LikeStore>((set) => ({
  likedPosts: {},
  toggle: (slug) =>
    set((state) => {
      const current = state.likedPosts[slug] ?? false;
      return {
        likedPosts: {
          ...state.likedPosts,
          [slug]: !current,
        },
      };
    }),
  setLiked: (slug, liked) =>
    set((state) => ({
      likedPosts: {
        ...state.likedPosts,
        [slug]: liked,
      },
    })),
}));
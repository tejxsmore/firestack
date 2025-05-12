"use client";

import { useEffect, useState } from "react";
import { useLikeStore } from "../../store/likeStore"

interface LikeProps {
  slug: string;
  title: string;
}

export default function Like({ slug, title }: LikeProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(true);

  const isLiked = useLikeStore((state: any) => state.likedPosts[slug] ?? false);
  const toggle = useLikeStore((state: any) => state.toggle);
  const setLiked = useLikeStore((state: any) => state.setLiked);

  useEffect(() => {
    const checkLikedStatus = async () => {
      try {
        const res = await fetch(`/api/like?slug=${slug}`);
        if (res.status === 401) {
          setIsSignedIn(false);
          return;
        }
        const data = await res.json();
        setLiked(slug, data?.liked || false);
      } catch (err) {
        console.error("Error fetching saved status", err);
      } finally {
        setIsLoading(false);
      }
    };

    checkLikedStatus();
  }, [slug, setLiked]);

  const toggleLike = async () => {
    toggle(slug); // Optimistic update

    try {
      const res = await fetch("/api/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title }),
      });

      if (res.ok) {
        const data = await res.json();
        setLiked(slug, data?.liked || false);
      }
    } catch (err) {
      console.error("Error toggling like", err);
      toggle(slug); // Revert optimistic update if error
    }
  };

  if (!isSignedIn || isLoading) return null;

  return (
    <button
      onClick={toggleLike}
      aria-label="Toggle Like"
      className={`inline-block p-3 text-sm rounded-[16px] border 
        transition-colors cursor-pointer text-orange-400
        ${isLiked
          ? "bg-[#14100f] border-[#3a2a1e] hover:bg-[#1e1917] hover:border-[#5a3a1e]"
          : "bg-[#14100f] border-[#3a2a1e] hover:bg-[#1e1917] hover:border-[#5a3a1e]"
        }`}
    >
      {isLiked ? (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="#CB0404" 
            stroke="#CB0404" 
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"    
            className="lucide lucide-heart-icon lucide-heart">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 
                .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        </svg>
      ) : (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#CB0404" 
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-heart-icon lucide-heart">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 
                .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        </svg>
      )}
    </button>
  );
}
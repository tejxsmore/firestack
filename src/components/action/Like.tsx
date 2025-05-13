"use client";

import { useEffect, useState } from "react";
import { useLikeStore } from "../../store/likeStore";

interface LikeProps {
  slug: string;
  title: string;
}

export default function Like({ slug, title }: LikeProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(true);
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Track if the request is in process

  const isLiked = useLikeStore((state: any) => state.likedPosts[slug] ?? false);
  const toggle = useLikeStore((state: any) => state.toggle);
  const setLiked = useLikeStore((state: any) => state.setLiked);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, action: "status" }),
        });

        if (res.status === 401) {
          setIsSignedIn(false);
          return;
        }

        const data = await res.json();
        setLiked(slug, data?.liked || false);
        setLikeCount(data?.likeCount ?? null);
      } catch (err) {
        console.error("Error fetching like status:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, [slug, setLiked]);

  const toggleLike = async () => {
    setIsProcessing(true); // Mark the button as being processed
    toggle(slug); // Optimistic UI update
    setLikeCount(prev => (isLiked ? (prev ?? 1) - 1 : (prev ?? 0) + 1));

    try {
      const res = await fetch("/api/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title, action: "toggle" }),
      });

      if (res.ok) {
        const data = await res.json();
        setLiked(slug, data?.liked || false);

        // Refresh like count
        const res2 = await fetch("/api/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, action: "status" }),
        });

        const updated = await res2.json();
        setLikeCount(updated?.likeCount ?? null);
      }
    } catch (err) {
      console.error("Error toggling like:", err);
      toggle(slug); // Revert optimistic update
      setLikeCount(prev => (isLiked ? (prev ?? 0) + 1 : (prev ?? 1) - 1));
    } finally {
      setIsProcessing(false); // Reset after processing
    }
  };

  if (!isSignedIn || isLoading) return null;

  return (
    <button 
      onClick={toggleLike}
      disabled={isProcessing} // Disable button while processing
      aria-label="Toggle Like" 
      className="flex items-center gap-1 cursor-pointer"
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
          className="lucide lucide-heart-icon">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
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
          className="lucide lucide-heart-icon">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      )}
      {likeCount !== null && likeCount > 0 && <span>{likeCount}</span>}
    </button>
  );
}
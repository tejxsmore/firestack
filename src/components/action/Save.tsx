"use client";

import { useEffect, useState } from "react";
import { useSaveStore } from "../../store/saveStore"

interface SaveProps {
  slug: string;
  title: string;
}

export default function Save({ slug, title }: SaveProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(true);

  const isSaved = useSaveStore((state: any) => state.savedPosts[slug] ?? false);
  const toggle = useSaveStore((state: any) => state.toggle);
  const setSaved = useSaveStore((state: any) => state.setSaved);

  useEffect(() => {
    const checkSavedStatus = async () => {
      try {
        const res = await fetch(`/api/save?slug=${slug}`);
        if (res.status === 401) {
          setIsSignedIn(false);
          return;
        }
        const data = await res.json();
        setSaved(slug, data?.saved || false);
      } catch (err) {
        console.error("Error fetching saved status", err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSavedStatus();
  }, [slug, setSaved]);

  const toggleSave = async () => {
    toggle(slug); // Optimistic update

    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title }),
      });

      if (res.ok) {
        const data = await res.json();
        setSaved(slug, data?.saved || false);
      }
    } catch (err) {
      console.error("Error toggling save", err);
      toggle(slug); // Revert optimistic update if error
    }
  };

  if (!isSignedIn || isLoading) return null;

  return (
    <button
      onClick={toggleSave}
      aria-label="Toggle Bookmark"
      className='text-orange-400 cursor-pointer'
    >
      {isSaved ? (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="currentColor" 
          stroke="currentColor" 
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-bookmark-icon lucide-bookmark"
        >
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
        </svg>
      ) : (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-bookmark-icon lucide-bookmark"
        >
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
        </svg>
      )}
    </button>
  );
}
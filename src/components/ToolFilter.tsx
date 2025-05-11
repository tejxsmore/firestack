import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import SearchBar from "./SearchBar";
import Asteroids from "./Asteroids";

interface Tool {
  name: string;
  slug: string;
  logo: { url: string };
  description: string;
  websiteUrl: string;
  category: { name: string; slug: string };
}

interface Category {
  name: string;
  slug: string;
}

interface Props {
  tools: Tool[];
  categories: Category[];
}

export default function ToolFilter({ tools = [], categories = [] }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearchQuery(params.get("search") || "");
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    searchQuery.length > 1
      ? url.searchParams.set("search", searchQuery)
      : url.searchParams.delete("search");
    window.history.replaceState({}, "", url.toString());
  }, [searchQuery]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutside);
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const toggleCategory = (slug: string) =>
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );

  const filteredTools = tools.filter(
    (tool) =>
      (selected.length === 0 || selected.includes(tool.category.slug)) &&
      (searchQuery.length < 2 ||
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-5 space-y-5">
      <Asteroids />
      <div className="md:max-w-2xl mx-auto my-10 mb-30 space-y-10">
        <div className="text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight">
            Cut through the noise,
            <br />
            <span className="bg-gradient-to-r from-amber-500 via-orange-600 
            to-red-700 text-transparent bg-clip-text">
              Find tools
            </span>
            <span> that work</span>
          </h1>
        </div>
        <div className="flex items-center gap-5">
          <SearchBar tools={tools} query={searchQuery} setQuery={setSearchQuery} />
          <button
            onClick={() => setIsOpen(true)}
            className="px-6 py-3 rounded-[16px] text-white bg-[#14100f] border 
            border-[#3a2a1e] hover:bg-[#1b1613] hover:border-[#4a3a2e] transition-colors 
            text-base font-medium z-20 cursor-pointer"
          >
            Filters
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm h-full">
          <div
            ref={modalRef}
            className="relative w-full max-w-md p-6 space-y-5 rounded-[20px] bg-[#0e0e0e] border border-[#2c2c2c]"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Categories</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-red-400 transition-colors cursor-pointer"
              >
                <X />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {categories.map(({ name, slug }) => (
                <button
                  key={slug}
                  onClick={() => toggleCategory(slug)}
                  className={`px-6 py-3 rounded-[16px] border text-sm cursor-pointer rounded-[16px] ${
                    selected.includes(slug)
                      ? "bg-[#2a1e17] border-[#ff6a00] text-white font-semibold"
                      : "bg-[#14100f] text-white border border-[#3a2a1e] hover:bg-[#1e1917] hover:border-[#5a3a1e]"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>

            <button
              onClick={() => setSelected([])}
              disabled={selected.length === 0}
              className={`px-6 py-2 rounded-[16px] w-full transition-colors border text-white cursor-pointer
                ${selected.length > 0 
                  ? "bg-[#8E1616] border-red-900 hover:bg-red-950" 
                  : "bg-[#1a1a1a] border-[#2c2c2c] cursor-not-allowed opacity-50"}`}
            >
              Clear All
            </button>

          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
        {filteredTools.map(({ name, slug, logo, description, websiteUrl }) => (
          <div
            key={slug}
            className="p-5 space-y-5 rounded-[20px] border flex flex-col relative overflow-hidden hover:brightness-110 z-20"
            style={{
              background: "radial-gradient(circle at top left, #1a1a1a, #0d0d0d)",
              borderColor: "#2c2c2c",
            }}
          >
            <a
              href={`/tools/${slug}`}
              className="w-12 h-12 p-2 rounded-[12px] flex items-center justify-center bg-[#1e1e1e] border border-[#2c2c2c] shadow-inner shadow-[#00000033] z-10 relative"
            >
              <img
                src={logo.url}
                alt={`Logo of ${name}`}
                className="w-full h-full object-contain rounded-[6px]"
              />
            </a>
            <a href={`/tools/${slug}`} className="z-10 relative text-lg font-semibold text-white">
              {name}
            </a>
            <p className="text-sm text-gray-300 z-10 relative flex-grow">
              {description.length > 100 ? description.slice(0, 100) + "..." : description}
            </p>
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="z-10 relative inline-block px-6 py-3 text-sm text-center 
              rounded-[16px] bg-[#14100f] text-white border border-[#3a2a1e] 
              hover:bg-[#1e1917] hover:border-[#5a3a1e] transition-colors"
              >
              Visit {name}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
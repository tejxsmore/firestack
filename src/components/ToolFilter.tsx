import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import SearchBar from "./SearchBar";

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
    const urlParams = new URLSearchParams(window.location.search);
    setSearchQuery(urlParams.get("search") || "");
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (searchQuery.length > 1) {
      url.searchParams.set("search", searchQuery);
    } else {
      url.searchParams.delete("search");
    }
    window.history.replaceState({}, "", url.toString());
  }, [searchQuery]);

  const toggleCategory = (slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const filteredTools = tools.filter((tool) => {
    const matchesCategory =
      selected.length === 0 || selected.includes(tool.category.slug);
    const matchesSearch =
      searchQuery.length < 2 ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

  return (
    <div className="p-5 space-y-5">
      <div className="flex justify-between items-center gap-4">
        <SearchBar tools={tools} query={searchQuery} setQuery={setSearchQuery} />
        <button onClick={() => setIsOpen(true)}>Filters</button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm">
          <div ref={modalRef} className="bg-white p-4 rounded shadow-md w-full max-w-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Categories</h3>
              <button onClick={() => setIsOpen(false)}><X /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => toggleCategory(cat.slug)}
                  className={`px-2 py-1 rounded border ${
                    selected.includes(cat.slug) ? "bg-black text-white" : "bg-gray-100"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-between text-sm">
              <button onClick={() => setSelected([])} className="underline">
                Clear All
              </button>
              <button onClick={() => setIsOpen(false)} className="underline">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
        {filteredTools.map(({ name, slug, logo: { url }, description, websiteUrl }) => (
          <div key={slug} className="p-4 border rounded flex flex-col">
            <div className="w-16 h-16 border mb-2 flex items-center justify-center">
              <img src={url} alt={`Logo of ${name}`} className="w-full h-full object-contain" />
            </div>
            <a href={`/tools/${slug}`}>
              <h3 className="text-base font-semibold">{name}</h3>
            </a>
            <p className="text-sm text-gray-600 flex-grow">
              {description.length > 100 ? description.slice(0, 100) + "..." : description}
            </p>
            <a
              href={websiteUrl}
              target="_blank"
              className="block mt-2 underline text-sm"
            >
              Visit {name}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
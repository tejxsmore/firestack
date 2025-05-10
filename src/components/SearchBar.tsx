import { Search, X } from "lucide-react";

type Tool = {
  name: string;
  slug: string;
};

type Props = {
  tools: Tool[];
  query: string;
  setQuery: (value: string) => void;
};

export default function SearchBar({ tools, query, setQuery }: Props) {
  const isOpen = query.length > 1;
  const filtered = isOpen
    ? tools.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="relative w-full md:max-w-2xl z-20">
      <div
        className="flex items-center w-full px-3 py-3 rounded-[16px] border border-[#2c2c2c]
        bg-[#121212] text-white shadow-[0_0_0_1px_#1f1f1f] hover:border-[#3a3a3a]
        focus-within:ring-2 focus-within:ring-[#ffffff22] transition-all duration-300"
      >
        <Search size={20} className="text-gray-400" />
        <input
          type="text"
          placeholder="Search tools by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent outline-none border-none px-3 text-base placeholder-gray-500 text-white"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
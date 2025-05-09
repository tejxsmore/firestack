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
    <div className="relative w-full">
      <div className="flex items-center w-full border border-gray-400 rounded-lg">
        <Search size={16} className="ml-3 text-gray-500" />
        <input
          type="text"
          placeholder="Search tools..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-3 py-2 bg-transparent outline-none"
        />
        {query && (
          <button onClick={() => setQuery("")} className="mr-3 text-gray-500 hover:text-black">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
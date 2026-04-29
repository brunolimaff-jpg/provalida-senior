'use client';

interface FilterChipsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  categories: string[];
}

export default function FilterChips({ activeFilter, onFilterChange, categories }: FilterChipsProps) {
  const allFilters = ['Todos', ...categories];

  return (
    <div className="flex flex-wrap gap-2">
      {allFilters.map((filter) => (
        <button
          key={filter}
          onClick={() => onFilterChange(filter)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-180 ${
            activeFilter === filter
              ? 'bg-[#01696f] text-white'
              : 'bg-[var(--background)] text-[var(--muted)] border border-[var(--border)] hover:bg-[#cedcd8] hover:text-[#01696f]'
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}

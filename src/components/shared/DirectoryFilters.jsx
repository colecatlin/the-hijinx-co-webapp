import React, { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function DirectoryFilters({ 
  searchQuery, 
  onSearchChange, 
  filters, 
  onFilterChange, 
  filterConfig,
  sortBy,
  onSortChange,
  sortOptions 
}) {
  const [open, setOpen] = useState(false);

  const hasActiveFilters = Object.values(filters).some(v => v !== 'all');

  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="relative">
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#00FFDA] rounded-full" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Sort By</DropdownMenuLabel>
          <div className="px-2 py-2">
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Filter By</DropdownMenuLabel>

          {filterConfig.map((config, index) => (
            <div key={config.key} className="px-2 py-2">
              <label className="text-xs text-gray-500 mb-1 block">{config.label}</label>
              <Select 
                value={filters[config.key]} 
                onValueChange={(value) => onFilterChange(config.key, value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {config.options.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          {hasActiveFilters && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    filterConfig.forEach(config => onFilterChange(config.key, 'all'));
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
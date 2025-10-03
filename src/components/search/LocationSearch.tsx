"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { geocodeLocation } from "@/lib/actions";
import type { Location } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface LocationSearchProps {
  onSearch: (location: Location) => void;
}

export function LocationSearch({ onSearch }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    try {
      const location = await geocodeLocation(query);
      if (location) {
        onSearch(location);
        setQuery("");
      } else {
        toast({
          title: "Location not found",
          description: "Please try a different search term.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Could not perform search. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex w-full max-w-xs items-center space-x-2">
      <Input
        type="text"
        placeholder="e.g. New York..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={loading}
        className="h-9"
      />
      <Button type="submit" size="icon" className="h-9 w-9" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
      </Button>
    </form>
  );
}

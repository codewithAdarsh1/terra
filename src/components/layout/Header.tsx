import { Leaf } from "lucide-react";
import { LocationSearch } from "@/components/search/LocationSearch";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import type { Location } from "@/lib/types";

interface HeaderProps {
  onSearch: (location: Location) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  return (
    <header className="flex items-center justify-between p-2 sm:p-4 border-b bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Leaf className="h-6 w-6 text-primary" />
        <h1 className="text-lg sm:text-xl font-bold font-headline">Earth Insights Explorer</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <LocationSearch onSearch={onSearch} />
        <ThemeToggle />
      </div>
    </header>
  );
}

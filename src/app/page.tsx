"use client";

import { useState, useCallback } from "react";
import type { Location, EnvironmentalData, AIInsights } from "@/lib/types";
import { getLocationData } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";

import Header from "@/components/layout/Header";
import EarthGlobe from "@/components/globe/EarthGlobe";
import Dashboard from "@/components/dashboard/Dashboard";

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [data, setData] = useState<(EnvironmentalData & AIInsights) | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLocationSelect = useCallback(async (location: Location) => {
    setSelectedLocation(location);
    setLoading(true);
    setData(null);

    toast({
      title: "Fetching Data...",
      description: `Analyzing location: ${location.name || `${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}`}`,
    });

    try {
      const result = await getLocationData(location);
      setData(result);
      toast({
        title: "Success!",
        description: `Data loaded for ${location.name || 'selected area'}.`,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to fetch environmental data. Please try again.",
        variant: "destructive",
      });
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <Header onSearch={handleLocationSelect} />
      <main className="flex-1 grid md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 overflow-hidden">
        <div className="lg:col-span-2 h-full min-h-[300px] md:min-h-0 rounded-lg overflow-hidden border shadow-md">
          <EarthGlobe onLocationSelect={handleLocationSelect} markerCoordinates={selectedLocation} />
        </div>
        <div className="lg:col-span-3 h-full overflow-y-auto rounded-lg custom-scrollbar">
          <Dashboard data={data} loading={loading} selectedLocation={selectedLocation} />
        </div>
      </main>
    </div>
  );
}

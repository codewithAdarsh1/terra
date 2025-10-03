"use client";

import type { Location, EnvironmentalData, AIInsights } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe } from "lucide-react";
import { EnvironmentalDataDashboard } from "./EnvironmentalDataDashboard";
import { AIDataDashboard } from "./AIDataDashboard";

interface DashboardProps {
  data: (EnvironmentalData & AIInsights) | null;
  loading: boolean;
  selectedLocation: Location | null;
}

export default function Dashboard({ data, loading, selectedLocation }: DashboardProps) {

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!selectedLocation || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-card rounded-lg border">
        <Globe className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Welcome to Earth Insights Explorer</h2>
        <p className="text-muted-foreground">Click on the globe or use the search bar to select a location and explore its environmental data.</p>
      </div>
    );
  }

  return (
    <div id="report-content" className="space-y-4">
      <EnvironmentalDataDashboard data={data} location={selectedLocation} />
      <AIDataDashboard data={data} />
    </div>
  );
}

const DashboardSkeleton = () => (
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </CardContent>
    </Card>
     <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/3" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  </div>
);

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Satellite } from "lucide-react";
import type { SatelliteData } from "@/lib/types";

interface TerraDataPanelProps {
  data: SatelliteData;
}

export function TerraDataPanel({ data }: TerraDataPanelProps) {
  return (
    <Card className="absolute bottom-4 right-4 w-80 backdrop-blur-sm bg-card/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Satellite className="h-5 w-5" />
          Terra Satellite (Live)
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <DataItem label="Latitude" value={data.lat.toFixed(4)} />
        <DataItem label="Longitude" value={data.lng.toFixed(4)} />
        <DataItem label="Altitude" value={`${data.alt.toFixed(2)} km`} />
        <DataItem label="Speed" value={`${data.speed.toFixed(2)} km/s`} />
      </CardContent>
    </Card>
  );
}

interface DataItemProps {
  label: string;
  value: string;
}

function DataItem({ label, value }: DataItemProps) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

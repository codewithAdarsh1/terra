import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EnvironmentalData, Location } from "@/lib/types";
import { Thermometer, Wind, Droplets, Flame, Trees, TestTube2, CloudCog } from "lucide-react";
import { format } from "date-fns";
import { DownloadReportButton } from "./DownloadReportButton";
import { cn } from "@/lib/utils";
import { WeatherChart } from "./WeatherChart";

interface EnvironmentalDataDashboardProps {
  data: EnvironmentalData;
  location: Location;
}

const getAerosolColor = (index: number) => {
  if (index > 0.4) return 'text-destructive';
  if (index > 0.2) return 'text-yellow-500';
  return 'text-primary';
}

export function EnvironmentalDataDashboard({ data, location }: EnvironmentalDataDashboardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-2xl">{location.name || `Lat: ${location.lat.toFixed(2)}, Lon: ${location.lng.toFixed(2)}`}</CardTitle>
          <CardDescription>Last Updated: {format(new Date(data.lastUpdated), "PPP p")}</CardDescription>
        </div>
        <DownloadReportButton reportId="report-content" locationName={location.name || 'selected-area'} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <DataCard
            icon={<Wind className="h-6 w-6 text-muted-foreground" />}
            title="Aerosol Index"
            value={data.airQuality.aerosolIndex.toFixed(3)}
            unit=""
            description={`CO: ${data.airQuality.co.toExponential(2)}`}
            valueClassName={getAerosolColor(data.airQuality.aerosolIndex)}
          />
          <DataCard
            icon={<Thermometer className="h-6 w-6 text-muted-foreground" />}
            title="Surface Temp (MODIS)"
            value={data.soil.temperature}
            unit="°C"
            description={`Soil Moisture: ${(data.soil.moisture * 100).toFixed(0)}%`}
          />
          <DataCard
            icon={<Droplets className="h-6 w-6 text-muted-foreground" />}
            title="Precipitation"
            value={data.water.precipitation}
            unit="mm"
            description={`Surface Water: ${(data.water.surfaceWater * 100).toFixed(0)}%`}
          />
          <DataCard
            icon={<Flame className="h-6 w-6 text-muted-foreground" />}
            title="Active Fires (FIRMS)"
            value={data.fire.activeFires}
            unit=""
            description={`Risk: ${data.fire.fireRisk}`}
            valueClassName={data.fire.fireRisk === 'high' || data.fire.fireRisk === 'very-high' ? 'text-destructive' : ''}
          />
          <DataCard
            icon={<Trees className="h-6 w-6 text-muted-foreground" />}
            title="Vegetation (NDVI)"
            value={data.vegetation.ndvi}
            unit=""
            description={data.vegetation.ndvi > 0.6 ? "Dense Vegetation" : "Sparse Vegetation"}
          />
           <DataCard
            icon={<CloudCog className="h-6 w-6 text-muted-foreground" />}
            title="Simulated Soil"
            value={data.soil.ph}
            unit="pH"
            description={`N: ${data.soil.nitrogen} P: ${data.soil.phosphorus} K: ${data.soil.potassium}`}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Weather Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <WeatherChart data={data.weather.forecast} />
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}

interface DataCardProps {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  unit: string;
  description: string;
  valueClassName?: string;
}

function DataCard({ icon, title, value, unit, description, valueClassName }: DataCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", valueClassName)}>
          {value} {unit}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

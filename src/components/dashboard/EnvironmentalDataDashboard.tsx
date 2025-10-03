import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EnvironmentalData, Location } from "@/lib/types";
import { Thermometer, Wind, Droplets, Flame, Trees, TestTube2 } from "lucide-react";
import { format } from "date-fns";
import { DownloadReportButton } from "./DownloadReportButton";
import { cn } from "@/lib/utils";
import { WeatherChart } from "./WeatherChart";

interface EnvironmentalDataDashboardProps {
  data: EnvironmentalData;
  location: Location;
}

const getAqiColor = (aqi: number) => {
  if (aqi > 150) return 'text-destructive';
  if (aqi > 100) return 'text-yellow-500';
  if (aqi > 50) return 'text-yellow-400';
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
            title="Air Quality Index"
            value={data.airQuality.aqi}
            unit=""
            description={`PM2.5: ${data.airQuality.pm25}`}
            valueClassName={getAqiColor(data.airQuality.aqi)}
          />
          <DataCard
            icon={<Thermometer className="h-6 w-6 text-muted-foreground" />}
            title="Avg. Soil Temp"
            value={data.soil.temperature}
            unit="°C"
            description={`Moisture: ${(data.soil.moisture * 100).toFixed(0)}%`}
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
            title="Active Fires"
            value={data.fire.activeFires}
            unit=""
            description={`Risk: ${data.fire.fireRisk}`}
            valueClassName={data.fire.fireRisk === 'high' || data.fire.fireRisk === 'very-high' ? 'text-destructive' : ''}
          />
          <DataCard
            icon={<Trees className="h-6 w-6 text-muted-foreground" />}
            title="Vegetation Index"
            value={data.vegetation.ndvi}
            unit="NDVI"
            description={data.vegetation.ndvi > 0.6 ? "Dense Vegetation" : "Sparse Vegetation"}
          />
          <DataCard
            icon={<TestTube2 className="h-6 w-6 text-muted-foreground" />}
            title="Soil pH"
            value={data.soil.ph}
            unit=""
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
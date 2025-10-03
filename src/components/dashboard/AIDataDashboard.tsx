import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BrainCircuit, Lightbulb, Tractor, ShieldAlert } from "lucide-react";
import type { AIInsights } from "@/lib/types";

interface AIDataDashboardProps {
  data: AIInsights;
}

export function AIDataDashboard({ data }: AIDataDashboardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-6 w-6 text-primary" />
          AI-Powered Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{data.summary}</p>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="predictions">
            <AccordionTrigger>
              <Lightbulb className="mr-2 h-4 w-4" />
              Future Predictions
            </AccordionTrigger>
            <AccordionContent className="prose dark:prose-invert prose-sm max-w-none">
              {data.futurePredictions}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="recommendations">
            <AccordionTrigger>
              <Tractor className="mr-2 h-4 w-4" />
              Crop Recommendations
            </AccordionTrigger>
            <AccordionContent className="prose dark:prose-invert prose-sm max-w-none">
              {data.cropRecommendations}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="solutions">
            <AccordionTrigger>
              <Lightbulb className="mr-2 h-4 w-4" />
              Environmental Solutions
            </AccordionTrigger>
            <AccordionContent className="prose dark:prose-invert prose-sm max-w-none">
              {data.environmentalSolutions}
            </AccordionContent>
          </AccordionItem>
           <AccordionItem value="risk">
            <AccordionTrigger>
              <ShieldAlert className="mr-2 h-4 w-4" />
              Risk Assessment
            </AccordionTrigger>
            <AccordionContent className="prose dark:prose-invert prose-sm max-w-none">
              {data.riskAssessment}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

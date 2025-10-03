"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

interface DownloadReportButtonProps {
  reportId: string;
  locationName: string;
}

export function DownloadReportButton({ reportId, locationName }: DownloadReportButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    const element = document.getElementById(reportId);
    if (!element) {
      toast({
        title: "Error",
        description: "Could not find report element to download.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Temporarily change background for canvas capture
      const originalBg = document.body.style.backgroundColor;
      const isDark = document.documentElement.classList.contains('dark');
      document.body.style.backgroundColor = isDark ? '#0a0a0a' : '#f5f5dc';

      const canvas = await html2canvas(element, {
        useCORS: true,
        scale: 1,
        backgroundColor: isDark ? '#0a0a0a' : '#f5f5dc',
      });
      
      // Restore original background
      document.body.style.backgroundColor = originalBg;

      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      
      const fileName = `Earth-Insights-Report-${locationName.replace(/ /g, '_')}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error(error);
      toast({
        title: "Download Failed",
        description: "An error occurred while generating the PDF.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleDownload} disabled={loading} variant="outline" size="sm">
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      {loading ? "Generating..." : "Download Report"}
    </Button>
  );
}

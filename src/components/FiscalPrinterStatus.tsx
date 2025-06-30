
'use client';

import React, { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import useLocalStorage from '@/hooks/use-local-storage';
import type { CompanyDetails } from '@/lib/types';
import { DEFAULT_COMPANY_ID } from "@/lib/types";

type Status = 'online' | 'offline' | 'checking';

export default function FiscalPrinterStatus() {
  const [status, setStatus] = useState<Status>('checking');
  const [companyDetails] = useLocalStorage<CompanyDetails>(
    "companyDetails",
    { id: DEFAULT_COMPANY_ID }
  );

  const fiscalPrinterApiUrl = companyDetails?.fiscalPrinterApiUrl;

  useEffect(() => {
    if (!fiscalPrinterApiUrl) {
      setStatus('offline');
      return;
    }

    const statusUrl = new URL(fiscalPrinterApiUrl);
    statusUrl.pathname = '/status'; // Create a dedicated /status endpoint

    const checkStatus = async () => {
      try {
        const response = await fetch(statusUrl.toString(), {
          method: 'GET',
          signal: AbortSignal.timeout(2000), // 2-second timeout
        });
        if (response.ok) {
          setStatus('online');
        } else {
          setStatus('offline');
        }
      } catch (error) {
        setStatus('offline');
      }
    };

    checkStatus(); // Initial check
    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [fiscalPrinterApiUrl]);

  if (!companyDetails?.fiscalPrinterEnabled) {
    return null; // Don't show the indicator if the feature is disabled
  }

  const statusConfig = {
    online: { color: 'bg-green-500', text: 'Servicio Fiscal Online' },
    offline: { color: 'bg-red-500', text: 'Servicio Fiscal Offline' },
    checking: { color: 'bg-yellow-500 animate-pulse', text: 'Verificando servicio...' },
  };

  const { color, text } = statusConfig[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <div className={cn("h-3 w-3 rounded-full", color)} />
            <span className="text-xs text-muted-foreground">{text}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{text}</p>
          <p className="text-xs text-muted-foreground">{fiscalPrinterApiUrl || "URL no configurada"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

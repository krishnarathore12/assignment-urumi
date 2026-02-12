"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, ExternalLink, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StoreLogsProps {
  storeId: string;
  storeName: string;
  onClose: () => void;
  onComplete: (data: any) => void;
}

export function StoreLogs({ storeId, storeName, onClose, onComplete }: StoreLogsProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<"connecting" | "provisioning" | "complete" | "failed">("connecting");
  const [credentials, setCredentials] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // In a real app, use wss:// for production
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.hostname}:8000/api/stores/ws/${storeId}`;
    
    console.log("Connecting to WebSocket:", wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setStatus("provisioning");
      setLogs((prev) => [...prev, "Connected to logging service..."]);
    };

    ws.onmessage = (event) => {
      const message = event.data;
      
      if (message === "PROVISIONING_COMPLETE") {
        setStatus("complete");
      } else if (message === "PROVISIONING_FAILED") {
        setStatus("failed");
      } else {
        try {
            // Check if it's JSON (credentials)
            const data = JSON.parse(message);
            if (data.url && data.admin_user) {
                setCredentials(data);
                onComplete(data);
                return;
            }
        } catch (e) {
            // Not JSON, just a log line
        }
        setLogs((prev) => [...prev, message]);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setLogs((prev) => [...prev, "Error connecting to log service."]);
      setStatus("failed");
    };

    ws.onclose = () => {
      if (status !== "complete" && status !== "failed") {
          setLogs((prev) => [...prev, "Connection closed."]);
      }
    };

    return () => {
      ws.close();
    };
  }, [storeId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
        const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
    }
  }, [logs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-lg border bg-background shadow-lg overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/50">
          <div className="flex items-center gap-2 font-semibold">
            <Terminal className="h-4 w-4" />
            Provisioning {storeName}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 bg-black p-4 font-mono text-sm text-green-400 overflow-hidden">
          <ScrollArea className="h-[400px]" ref={scrollRef}>
            {logs.map((log, i) => (
              <div key={i} className="whitespace-pre-wrap break-all border-l-2 border-transparent hover:border-green-800 pl-2">
                <span className="opacity-50 select-none mr-2">$</span>
                {log}
              </div>
            ))}
            {status === "provisioning" && (
                <div className="animate-pulse mt-2">_</div>
            )}
          </ScrollArea>
        </div>

        {status === "complete" && credentials && (
            <div className="p-6 bg-green-500/10 border-t border-green-500/20">
                <h3 className="text-lg font-bold text-green-600 mb-4 flex items-center gap-2">
                    ✅ Store Provisioned Successfully!
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground uppercase font-bold">Store URL</label>
                        <div className="flex items-center gap-2">
                             <a href={credentials.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono">
                                {credentials.url}
                             </a>
                             <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground uppercase font-bold">Admin User</label>
                        <div className="font-mono bg-muted px-2 py-1 rounded w-fit select-all">
                            {credentials.admin_user}
                        </div>
                    </div>
                     <div className="space-y-1 col-span-2">
                        <label className="text-xs text-muted-foreground uppercase font-bold">Admin Password</label>
                        <div className="font-mono bg-muted px-2 py-1 rounded w-fit select-all text-red-500">
                            {credentials.admin_password}
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <Button onClick={onClose}>Done</Button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

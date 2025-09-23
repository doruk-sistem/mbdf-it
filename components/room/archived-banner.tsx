"use client";

import { Archive, RefreshCw, Info, Clock } from "lucide-react";
import { useUnarchiveRoom } from "@/hooks/use-rooms";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ArchivedBannerProps {
  roomId: string;
  roomName: string;
  archivedAt?: string;
  archiveReason?: string;
  isAdmin?: boolean;
}

export function ArchivedBanner({ 
  roomId, 
  roomName, 
  archivedAt, 
  archiveReason, 
  isAdmin = false 
}: ArchivedBannerProps) {
  const unarchiveMutation = useUnarchiveRoom();

  const handleUnarchive = async () => {
    if (!isAdmin) return;
    
    try {
      await unarchiveMutation.mutateAsync(roomId);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  return (
    <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <Archive className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-orange-800 dark:text-orange-200">
                This room is archived
              </span>
              <Badge variant="secondary" className="bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200">
                Read-only
              </Badge>
            </div>
            <div className="mt-1 flex items-center space-x-4 text-sm text-orange-700 dark:text-orange-300">
              {archivedAt && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>Archived on {new Date(archivedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
              )}
              {archiveReason && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center space-x-1 cursor-help">
                        <Info className="h-3 w-3" />
                        <span>Reason provided</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p>{archiveReason}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          <div className="text-xs text-orange-600 dark:text-orange-400">
            No new documents, messages, or requests can be added.
          </div>
        </div>
        
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnarchive}
            disabled={unarchiveMutation.isPending}
            className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900"
          >
            {unarchiveMutation.isPending ? (
              <>
                <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                Reactivating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-3 w-3" />
                Reactivate Room
              </>
            )}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
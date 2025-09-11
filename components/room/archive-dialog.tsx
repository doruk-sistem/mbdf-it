"use client";

import { useState } from "react";
import { Archive, AlertTriangle, Loader2 } from "lucide-react";
import { useArchivePrecheck, useArchiveRoom } from "@/hooks/use-rooms";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ArchiveDialogProps {
  roomId: string;
  roomName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArchiveDialog({ roomId, roomName, open, onOpenChange }: ArchiveDialogProps) {
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [step, setStep] = useState<"precheck" | "confirm">("precheck");

  const { data: precheck, isLoading: isLoadingPrecheck } = useArchivePrecheck(roomId, {
    enabled: open, // Only fetch when dialog is open
  });
  const archiveMutation = useArchiveRoom();

  const isConfirmDisabled = confirmText !== "ARCHIVE" || (reason && reason.length < 10);

  const handleArchive = async () => {
    if (isConfirmDisabled) return;

    try {
      await archiveMutation.mutateAsync({ roomId, reason: reason || undefined });
      onOpenChange(false);
      // Reset state
      setReason("");
      setConfirmText("");
      setStep("precheck");
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleClose = () => {
    if (!archiveMutation.isPending) {
      onOpenChange(false);
      setReason("");
      setConfirmText("");
      setStep("precheck");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Archive className="h-5 w-5 text-destructive" />
            <span>Archive Room: {roomName}</span>
          </DialogTitle>
          <DialogDescription>
            This action will make the room read-only. All pending requests will be rejected and approved tokens will be revoked.
          </DialogDescription>
        </DialogHeader>

        {isLoadingPrecheck ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Checking room status...</span>
          </div>
        ) : precheck?.can_archive === false ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This room cannot be archived at the moment:
              <ul className="mt-2 list-disc list-inside">
                {precheck.reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : step === "precheck" && precheck ? (
          <div className="space-y-4">
            {/* Room Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Room Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <span className="text-sm font-medium">{precheck.room.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={precheck.room.status === 'active' ? 'default' : 'secondary'}>
                    {precheck.room.status}
                  </Badge>
                </div>
                {precheck.room.substance && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">EC Number:</span>
                      <span className="text-sm">{precheck.room.substance.ec_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">CAS Number:</span>
                      <span className="text-sm">{precheck.room.substance.cas_number || 'N/A'}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Current Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Current Room Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Total Members</TableCell>
                      <TableCell className="text-right">{precheck.counts.total_members}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Pending Requests</TableCell>
                      <TableCell className="text-right">{precheck.counts.pending_requests}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Approved Requests</TableCell>
                      <TableCell className="text-right">{precheck.counts.approved_requests}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Open Votes</TableCell>
                      <TableCell className="text-right">{precheck.counts.open_votes}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Draft Agreements</TableCell>
                      <TableCell className="text-right">{precheck.counts.draft_agreements}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Archive Effects */}
            {(precheck.effects.pending_will_be_rejected > 0 || 
              precheck.effects.approved_will_be_revoked > 0 || 
              precheck.effects.votes_will_be_closed > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span>Archive Effects</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {precheck.effects.pending_will_be_rejected > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm">Pending requests will be rejected:</span>
                      <Badge variant="destructive">{precheck.effects.pending_will_be_rejected}</Badge>
                    </div>
                  )}
                  {precheck.effects.approved_will_be_revoked > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm">Approved tokens will be revoked:</span>
                      <Badge variant="destructive">{precheck.effects.approved_will_be_revoked}</Badge>
                    </div>
                  )}
                  {precheck.effects.votes_will_be_closed > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm">Open votes will be closed:</span>
                      <Badge variant="destructive">{precheck.effects.votes_will_be_closed}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setStep("confirm")}
                disabled={!precheck.can_archive}
              >
                Continue to Archive
              </Button>
            </DialogFooter>
          </div>
        ) : step === "confirm" && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This action cannot be undone by non-admin users. 
                Only system administrators can reactivate archived rooms.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="reason">Archive Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Provide a reason for archiving this room (minimum 10 characters)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className={reason && reason.length > 0 && reason.length < 10 ? "border-destructive" : ""}
              />
              {reason && reason.length > 0 && reason.length < 10 && (
                <p className="text-sm text-destructive">Reason must be at least 10 characters long.</p>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="confirm">Type "ARCHIVE" to confirm</Label>
              <Input
                id="confirm"
                placeholder="Type ARCHIVE to confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                className={confirmText && confirmText !== "ARCHIVE" ? "border-destructive" : ""}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("precheck")} disabled={archiveMutation.isPending}>
                Back
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleArchive}
                disabled={isConfirmDisabled || archiveMutation.isPending}
              >
                {archiveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Archiving...
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive Room
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
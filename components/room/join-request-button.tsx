"use client";

import { useState } from "react";
import { UserPlus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

interface JoinRequestButtonProps {
  roomId: string;
  roomName: string;
  isArchived?: boolean;
}

export function JoinRequestButton({ roomId, roomName, isArchived = false }: JoinRequestButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!acceptTerms) {
      toast({
        title: "Hata",
        description: "Şartları kabul etmelisiniz",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setOpen(false);
    setMessage("");
    setAcceptTerms(false);
    
    toast({
      title: "Başarılı",
      description: `${roomName} odasına katılım talebiniz gönderildi!`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={isArchived}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Katılım Talebi Gönder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Katılım Talebi
          </DialogTitle>
          <DialogDescription>
            <strong>{roomName}</strong> odasına katılım talebi göndermek istediğinizi onaylıyor musunuz?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="message">Mesaj (İsteğe bağlı)</Label>
            <Textarea
              id="message"
              placeholder="Katılım nedeninizi açıklayabilirsiniz..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="terms"
              checked={acceptTerms}
              onCheckedChange={(checked: boolean) => setAcceptTerms(checked)}
            />
            <Label htmlFor="terms" className="text-sm">
              MBDF oda kurallarını ve şartlarını kabul ediyorum
            </Label>
          </div>
          
          <div className="flex space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              İptal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !acceptTerms}
              className="flex-1 gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Talebi Gönder
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

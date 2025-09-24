"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  Upload, 
  Mail, 
  FileText, 
  Users,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface InviteModalProps {
  roomId: string;
  roomName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteModal({ roomId, roomName, open, onOpenChange }: InviteModalProps) {
  const [activeTab, setActiveTab] = useState("manual");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleManualInvite = async () => {
    if (!email.trim()) return;
    
    setIsLoading(true);
    
    const response = await fetch(`/api/rooms/${roomId}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim(),
        message: message.trim(),
        roomName: roomName,
        inviterName: 'MBDF Üyesi' // TODO: Get actual user name
      }),
    });

    const data = await response.json();

    // Check if the invitation was actually successful
    if (data?.success === false) {
      toast({
        title: "Hata! ❌",
        description: data?.error || 'Davet gönderilemedi',
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    // If we get here, it means success

    // Reset form
    setEmail("");
    setMessage("");
    
    // Close modal
    onOpenChange(false);
    
    // Show success toast
    toast({
      title: "Davet Gönderildi! 🎉",
      description: `${email} adresine davet email'i başarıyla gönderildi.`,
      variant: "default"
    });
    
    setIsLoading(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // TODO: Handle file upload and parse emails
      console.log("File uploaded:", file.name);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Odaya Davet Et</span>
            <Badge variant="outline" className="text-xs">
              {roomName}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Manuel Davet</span>
            </TabsTrigger>
            <TabsTrigger value="file" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Dosya Yükle</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">E-posta ile Davet Et</CardTitle>
                <CardDescription>
                  Tek bir e-posta adresi ile manuel davet gönderin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta Adresi</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">Davet Mesajı (Opsiyonel)</Label>
                  <Textarea
                    id="message"
                    placeholder="Davet mesajınızı buraya yazın..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleManualInvite}
                  disabled={!email.trim() || isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Davet Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Davet Gönder
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="file" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Dosya ile Toplu Davet</CardTitle>
                <CardDescription>
                  Excel veya CSV dosyası ile birden fazla kişiyi davet edin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                        Dosya Seç
                      </span>
                      <input
                        id="file-upload"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Excel (.xlsx, .xls) veya CSV dosyası
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Dosya Formatı:</p>
                      <p className="mt-1">
                        Dosyanızda <strong>email</strong> sütunu bulunmalıdır. 
                        İsteğe bağlı olarak <strong>name</strong> ve <strong>company</strong> sütunları da ekleyebilirsiniz.
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  disabled
                  className="w-full"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Dosya Yükle (Yakında)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Davet edilen kişiler e-posta ile bilgilendirilecek</span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

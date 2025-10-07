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
  Loader2,
  X,
  FileSpreadsheet
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface InviteModalProps {
  roomId: string;
  roomName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedEmail {
  email: string;
  name?: string;
  company?: string;
  valid: boolean;
  error?: string;
}

interface BulkInviteResult {
  email: string;
  status: 'success' | 'failed';
  reason?: string;
}

export function InviteModal({ roomId, roomName, open, onOpenChange }: InviteModalProps) {
  const [activeTab, setActiveTab] = useState("manual");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Bulk invite states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedEmails, setParsedEmails] = useState<ParsedEmail[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkInviteResult[]>([]);

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

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Parse CSV file
  const parseCSV = (file: File): Promise<ParsedEmail[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const emails: ParsedEmail[] = results.data.map((row: any) => {
            const email = row.email || row.Email || row.EMAIL || '';
            const valid = validateEmail(email);
            return {
              email: email.trim(),
              name: row.name || row.Name || row.NAME,
              company: row.company || row.Company || row.COMPANY,
              valid,
              error: valid ? undefined : 'Geçersiz e-posta formatı'
            };
          });
          resolve(emails.filter(e => e.email)); // Remove empty emails
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  };

  // Parse Excel file
  const parseExcel = async (file: File): Promise<ParsedEmail[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          
          const emails: ParsedEmail[] = jsonData.map((row: any) => {
            const email = row.email || row.Email || row.EMAIL || '';
            const valid = validateEmail(email);
            return {
              email: email.trim(),
              name: row.name || row.Name || row.NAME,
              company: row.company || row.Company || row.COMPANY,
              valid,
              error: valid ? undefined : 'Geçersiz e-posta formatı'
            };
          });
          resolve(emails.filter(e => e.email)); // Remove empty emails
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsBinaryString(file);
    });
  };

  // Handle file selection
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      toast({
        title: "Geçersiz Dosya Formatı",
        description: "Lütfen CSV veya Excel dosyası yükleyin",
        variant: "destructive"
      });
      return;
    }

    setUploadedFile(file);
    setIsProcessing(true);

    try {
      let emails: ParsedEmail[];
      
      if (fileExtension === 'csv') {
        emails = await parseCSV(file);
      } else {
        emails = await parseExcel(file);
      }

      setParsedEmails(emails);
      
      const validCount = emails.filter(e => e.valid).length;
      const invalidCount = emails.filter(e => !e.valid).length;

      toast({
        title: "Dosya Başarıyla İşlendi",
        description: `${validCount} geçerli, ${invalidCount} geçersiz e-posta bulundu`,
      });
    } catch (error) {
      toast({
        title: "Dosya İşlenirken Hata Oluştu",
        description: error instanceof Error ? error.message : "Bilinmeyen hata",
        variant: "destructive"
      });
      setUploadedFile(null);
      setParsedEmails([]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove uploaded file
  const handleRemoveFile = () => {
    setUploadedFile(null);
    setParsedEmails([]);
    setBulkResults([]);
  };

  // Send bulk invitations
  const handleBulkInvite = async () => {
    const validEmails = parsedEmails.filter(e => e.valid);
    
    if (validEmails.length === 0) {
      toast({
        title: "Geçerli E-posta Bulunamadı",
        description: "Lütfen geçerli e-posta adresleri içeren bir dosya yükleyin",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setBulkResults([]);

    // TODO: Create bulk invite API endpoint
    // For now, send one by one
    const results: BulkInviteResult[] = [];
    
    for (const emailData of validEmails) {
      try {
        const response = await fetch(`/api/rooms/${roomId}/invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: emailData.email,
            message: message.trim(),
            roomName: roomName,
            recipientName: emailData.name || emailData.email, // CSV'den gelen isim
            recipientCompany: emailData.company || null       // CSV'den gelen şirket
          }),
        });

        const data = await response.json();

        if (data.success || response.ok) {
          results.push({
            email: emailData.email,
            status: 'success'
          });
        } else {
          results.push({
            email: emailData.email,
            status: 'failed',
            reason: data.error || 'Bilinmeyen hata'
          });
        }
      } catch (error) {
        results.push({
          email: emailData.email,
          status: 'failed',
          reason: 'Bağlantı hatası'
        });
      }
    }

    setBulkResults(results);
    
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    toast({
      title: "Toplu Davet Tamamlandı",
      description: `${successCount} başarılı, ${failedCount} başarısız`,
      variant: successCount > 0 ? "default" : "destructive"
    });

    setIsLoading(false);

    // Reset after success
    if (successCount > 0) {
      setTimeout(() => {
        handleRemoveFile();
        setMessage("");
        onOpenChange(false);
      }, 2000);
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
                
                {/* File Upload Area */}
                {!uploadedFile && (
                  <>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
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
                            disabled={isProcessing}
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
                  </>
                )}

                {/* File Processing */}
                {isProcessing && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-3 text-sm text-gray-600">Dosya işleniyor...</span>
                  </div>
                )}

                {/* File Preview */}
                {uploadedFile && !isProcessing && parsedEmails.length > 0 && (
                  <>
                    {/* File Info */}
                    <div className="bg-gray-50 border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileSpreadsheet className="h-8 w-8 text-green-600" />
                          <div>
                            <p className="font-medium text-sm">{uploadedFile.name}</p>
                            <p className="text-xs text-gray-500">
                              {parsedEmails.length} kişi bulundu
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveFile}
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Email List Preview */}
                    <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                      <p className="text-sm font-medium mb-3">E-posta Listesi:</p>
                      <div className="space-y-2">
                        {parsedEmails.slice(0, 10).map((emailData, index) => (
                          <div
                            key={index}
                            className={`flex items-center justify-between text-sm p-2 rounded ${
                              emailData.valid 
                                ? 'bg-green-50 text-green-800' 
                                : 'bg-red-50 text-red-800'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              {emailData.valid ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span className="font-medium">{emailData.email}</span>
                              {emailData.name && (
                                <span className="text-xs">({emailData.name})</span>
                              )}
                            </div>
                            {!emailData.valid && (
                              <span className="text-xs">{emailData.error}</span>
                            )}
                          </div>
                        ))}
                        {parsedEmails.length > 10 && (
                          <p className="text-xs text-gray-500 text-center pt-2">
                            ... ve {parsedEmails.length - 10} kişi daha
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-xs text-green-700">Geçerli</p>
                        <p className="text-2xl font-bold text-green-900">
                          {parsedEmails.filter(e => e.valid).length}
                        </p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-xs text-red-700">Geçersiz</p>
                        <p className="text-2xl font-bold text-red-900">
                          {parsedEmails.filter(e => !e.valid).length}
                        </p>
                      </div>
                    </div>

                    {/* Message Input */}
                    <div className="space-y-2">
                      <Label htmlFor="bulk-message">Davet Mesajı (Tümü için)</Label>
                      <Textarea
                        id="bulk-message"
                        placeholder="Toplu davet mesajınızı buraya yazın..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {/* Send Button */}
                    <Button 
                      onClick={handleBulkInvite}
                      disabled={isLoading || parsedEmails.filter(e => e.valid).length === 0}
                      className="w-full"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Davetler Gönderiliyor... ({bulkResults.length}/{parsedEmails.filter(e => e.valid).length})
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          {parsedEmails.filter(e => e.valid).length} Kişiye Davet Gönder
                        </>
                      )}
                    </Button>
                  </>
                )}

                {/* Results */}
                {bulkResults.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium mb-3">Sonuçlar:</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {bulkResults.map((result, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between text-sm p-2 rounded ${
                            result.status === 'success' 
                              ? 'bg-green-50 text-green-800' 
                              : 'bg-red-50 text-red-800'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            {result.status === 'success' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <X className="h-4 w-4 text-red-600" />
                            )}
                            <span>{result.email}</span>
                          </div>
                          {result.status === 'failed' && result.reason && (
                            <span className="text-xs">{result.reason}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

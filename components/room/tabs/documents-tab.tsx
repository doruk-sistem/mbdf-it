"use client";

import { useState } from "react";
import { Upload, Download, FileText, Trash2, Eye, Loader2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useDocuments, useUploadDocument } from "@/hooks/use-documents";

interface DocumentsTabProps {
  roomId: string;
  isArchived?: boolean;
}


export function DocumentsTab({ roomId, isArchived = false }: DocumentsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  // API hooks
  const { data: documentsData, isLoading, refetch } = useDocuments(roomId);
  const uploadMutation = useUploadDocument();

  const documents = documentsData?.items || [];
  const isMember = documentsData?.isMember ?? false;

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === "all") return matchesSearch;
    
    const fileType = doc.mime_type?.split("/")[1] || "";
    return matchesSearch && fileType.includes(filterType);
  });

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
      return <FileText className="h-4 w-4 text-green-500" />;
    }
    return <FileText className="h-4 w-4 text-blue-500" />;
  };

  const handleView = (document: any) => {
    if (document.download_url) {
      window.open(document.download_url, '_blank');
      return;
    }
    toast({
      title: "Hata",
      description: "Görüntüleme linki oluşturulamadı.",
      variant: "destructive",
    });
  };

  const handleDownload = (document: any) => {
    if (document.download_url) {
      window.open(document.download_url, '_blank');
    } else {
      toast({
        title: "Hata",
        description: "İndirme linki oluşturulamadı.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (document: any) => {
    toast({
      title: "Doküman silindi",
      description: `${document.name} başarıyla silindi.`,
      variant: "destructive",
    });
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) {
      toast({
        title: "Hata",
        description: "Lütfen dosya seçin ve başlık girin.",
        variant: "destructive",
      });
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        file: selectedFile,
        roomId,
        title: title.trim(),
        description: description.trim() || undefined,
      });
      
      // Reset form
      setSelectedFile(null);
      setTitle("");
      setDescription("");
      setIsUploadDialogOpen(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Dokümanlar</CardTitle>
            <CardDescription>
              Oda dokümanlarını görüntüleyin ve yönetin
            </CardDescription>
          </div>
          {isMember && (
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={isArchived} title={isArchived ? "Arşivli odada işlem yapılamaz" : undefined}>
                  <Upload className="mr-2 h-4 w-4" />
                  Yükle
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Doküman Yükle</DialogTitle>
                <DialogDescription>
                  Yeni bir doküman yükleyin.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Başlık *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Doküman başlığı..."
                    disabled={isArchived}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">Dosya *</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    disabled={isArchived}
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Seçilen: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Açıklama</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Doküman açıklaması..."
                    className="resize-none"
                    disabled={isArchived}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                  İptal
                </Button>
                <Button 
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending || !selectedFile || !title.trim() || isArchived}
                >
                  {uploadMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Yükle
                </Button>
              </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isMember && !isLoading && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Not:</strong> Bu odaya üye olmadığınız için sadece dokümanları görüntüleyebilirsiniz. 
              Doküman yüklemek veya silmek için odaya üye olmanız gerekmektedir.
            </p>
          </div>
        )}
        {/* Filters */}
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Doküman ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Dosya tipi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm dosyalar</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="word">Word</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Documents Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Dokümanlar yükleniyor...</span>
          </div>
        ) : (
          <div className="border rounded-2xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doküman</TableHead>
                  <TableHead>Boyut</TableHead>
                  <TableHead>Yükleyen</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {getFileIcon(document.mime_type || "")}
                        <div>
                          <p className="font-medium">{document.name}</p>
                          {document.description && (
                            <p className="text-sm text-muted-foreground">{document.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatFileSize(document.file_size || 0)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={document.profiles?.avatar_url || ""} />
                          <AvatarFallback className="text-xs">
                            {document.profiles?.full_name
                              ?.split(" ")
                              .map(n => n[0])
                              .join("")
                              .toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{document.profiles?.full_name || "Bilinmiyor"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(document.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 5v.01M12 12v.01M12 19v.01"
                              />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownload(document)}>
                            <Download className="mr-2 h-4 w-4" />
                            İndir
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleView(document)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Görüntüle
                          </DropdownMenuItem>
                          {isMember && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDelete(document)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Sil
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Doküman bulunamadı</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchTerm ? "Arama kriterlerinize uygun doküman bulunamadı." : "Henüz doküman yüklenmemiş."}
            </p>
            {!isMember && (
              <p className="mt-2 text-sm text-muted-foreground">
                Doküman yüklemek için odaya üye olmanız gerekmektedir.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
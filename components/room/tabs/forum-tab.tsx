"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, MessageCircle, User, Plus, Search, X, Trash2, AlertTriangle } from "lucide-react";
import { useMembers } from "@/hooks/use-members";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ForumMessage {
  id: string;
  content: string;
  message_type: string;
  topic: string;
  created_at: string;
  updated_at: string;
  sender_id: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url?: string;
    company?: {
      name: string;
    } | null;
  } | null;
}

interface ForumTabProps {
  roomId: string;
  isArchived?: boolean;
}

export function ForumTab({ roomId, isArchived = false }: ForumTabProps) {
  const [newMessage, setNewMessage] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("Genel");
  const [newTopic, setNewTopic] = useState("");
  const [showNewTopicInput, setShowNewTopicInput] = useState(false);
  const [topicSearchTerm, setTopicSearchTerm] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get members data to check if current user is a member
  const { data: membersData } = useMembers(roomId);

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const userData = await response.json();
          setCurrentUserId(userData.user?.id || null);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    getUser();
  }, []);

  // Check if current user is a member
  const isMember = currentUserId && membersData?.items?.some(member => 
    member.id === currentUserId || 
    member.user_id === currentUserId ||
    member.profiles?.id === currentUserId
  );
  // Fetch forum topics
  const { data: topics } = useQuery<string[]>({
    queryKey: ["forum-topics", roomId],
    queryFn: async (): Promise<string[]> => {
      const response = await fetch(`/api/rooms/${roomId}/forum/topics`);
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("ACCESS_DENIED");
        }
        throw new Error("Failed to fetch forum topics");
      }
      const data = await response.json() as { topics: string[] };
      return data.topics;
    },
    retry: (failureCount, error) => {
      if (error.message === "ACCESS_DENIED") {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Fetch forum messages
  const { data: messages, isLoading, error } = useQuery<ForumMessage[]>({
    queryKey: ["forum-messages", roomId, selectedTopic],
    queryFn: async (): Promise<ForumMessage[]> => {
      const response = await fetch(`/api/rooms/${roomId}/forum?topic=${encodeURIComponent(selectedTopic)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch forum messages");
      }
      const data = await response.json() as { messages: ForumMessage[] };
      // Sort messages by created_at (oldest first, newest last)
      const sortedMessages = data.messages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      return sortedMessages;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
    retry: (failureCount, error) => {
      return failureCount < 3;
    },
  });

  // Send new message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, topic }: { content: string; topic: string }) => {
      const response = await fetch(`/api/rooms/${roomId}/forum`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, message_type: "forum", topic }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403 && errorData.code === "MEMBERSHIP_REQUIRED") {
          throw new Error("MEMBERSHIP_REQUIRED");
        }
        throw new Error("Failed to send message");
      }

      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["forum-messages", roomId, selectedTopic] });
      queryClient.invalidateQueries({ queryKey: ["forum-topics", roomId] });
      toast({
        title: "Mesaj gönderildi",
        description: "Forum mesajınız başarıyla gönderildi.",
      });
    },
    onError: (error) => {
      if (error.message === "MEMBERSHIP_REQUIRED") {
        toast({
          title: "Üyelik Gerekli",
          description: "Bu odaya üye olmadığınız için mesaj yazamazsınız. Mesaj yazmak için odaya üye olmanız gerekmektedir.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Hata",
          description: "Mesaj gönderilirken bir hata oluştu.",
          variant: "destructive",
        });
      }
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await fetch(`/api/rooms/${roomId}/forum/${messageId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete message");
      }
      
      return response.json();
    },
    onMutate: async (messageId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["forum-messages", roomId, selectedTopic] });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(["forum-messages", roomId, selectedTopic]);

      // Optimistically update to the new value
      queryClient.setQueryData(["forum-messages", roomId, selectedTopic], (old: ForumMessage[] | undefined) => {
        if (!old) return old;
        return old.filter(message => message.id !== messageId);
      });

      // Return a context object with the snapshotted value
      return { previousMessages };
    },
    onSuccess: () => {
      // Force refetch all forum-related queries
      queryClient.invalidateQueries({ 
        queryKey: ["forum-messages", roomId, selectedTopic],
        refetchType: "active"
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ["forum-messages", roomId],
        refetchType: "active"
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ["forum-topics", roomId],
        refetchType: "active"
      });
      
      toast({
        title: "Mesaj silindi",
        description: "Mesajınız başarıyla silindi.",
      });
    },
    onError: (err, messageId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousMessages) {
        queryClient.setQueryData(["forum-messages", roomId, selectedTopic], context.previousMessages);
      }
      toast({
        title: "Hata",
        description: "Mesaj silinirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (newMessage.trim() && !isArchived) {
      sendMessageMutation.mutate({ 
        content: newMessage.trim(), 
        topic: selectedTopic 
      });
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessageToDelete(messageId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteMessage = () => {
    if (messageToDelete) {
      deleteMessageMutation.mutate(messageToDelete);
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
    }
  };

  const cancelDeleteMessage = () => {
    setDeleteDialogOpen(false);
    setMessageToDelete(null);
  };

  const handleAddNewTopic = () => {
    if (newTopic.trim() && topics && !topics.includes(newTopic.trim())) {
      const newTopicName = newTopic.trim();
      setSelectedTopic(newTopicName);
      setNewTopic("");
      setShowNewTopicInput(false);
      
      // Optimistically update the topics list
      queryClient.setQueryData(["forum-topics", roomId], (oldTopics: string[] | undefined) => {
        if (!oldTopics) return [newTopicName];
        return [...oldTopics, newTopicName].sort();
      });
    }
  };

  // Filter topics based on search term
  const filteredTopics = (topics || []).filter(topic =>
    topic.toLowerCase().includes(topicSearchTerm.toLowerCase())
  );

  // Show topics based on search state
  const displayTopics = topicSearchTerm ? filteredTopics : (topics || []);

  // Auto-select first matching topic when searching
  useEffect(() => {
    if (topicSearchTerm && filteredTopics.length > 0) {
      setSelectedTopic(filteredTopics[0]);
    }
  }, [topicSearchTerm, filteredTopics]);


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Forum
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const isAccessDenied = error.message === "ACCESS_DENIED";
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Forum
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isAccessDenied ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Bu odaya erişim yetkiniz yok</p>
              <p className="text-sm">Forum mesajlarını görüntülemek için oda üyesi olmanız gerekiyor.</p>
            </div>
          ) : (
            <p className="text-destructive">Forum mesajları yüklenirken bir hata oluştu.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Forum
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Topic Search and Selection */}
          <div className="space-y-3">
            {/* Search, Dropdown and New Topic Button */}
            <div className="flex gap-2 items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Konu ara..."
                  value={topicSearchTerm}
                  onChange={(e) => setTopicSearchTerm(e.target.value)}
                  className="pl-9"
                />
                {topicSearchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setTopicSearchTerm("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <Select 
                value={selectedTopic} 
                onValueChange={(value) => {
                  setSelectedTopic(value);
                  setTopicSearchTerm(""); // Clear search when topic selected
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Konu seçin" />
                </SelectTrigger>
                <SelectContent>
                  {displayTopics.length > 0 ? (
                    displayTopics.map((topic) => (
                      <SelectItem key={topic} value={topic}>
                        {topic}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Konu bulunamadı
                    </div>
                  )}
                </SelectContent>
              </Select>
              
              {isMember && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewTopicInput(!showNewTopicInput)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Yeni Konu
                </Button>
              )}
            </div>
            
            {/* Search Results Info */}
            {topicSearchTerm && (
              <div className="text-sm text-muted-foreground">
                {filteredTopics.length > 0 
                  ? `${filteredTopics.length} konu bulundu`
                  : `"${topicSearchTerm}" için konu bulunamadı`
                }
              </div>
            )}
          </div>

          {/* New Topic Input */}
          {showNewTopicInput && isMember && (
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Yeni konu adı..."
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddNewTopic();
                  }
                }}
                className="w-48"
              />
              <Button
                size="sm"
                onClick={handleAddNewTopic}
                disabled={!newTopic.trim()}
              >
                Ekle
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNewTopicInput(false);
                  setNewTopic("");
                }}
              >
                İptal
              </Button>
            </div>
          )}
          {/* Messages List */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {messages && messages.length > 0 ? (
              messages.map((message) => (
                <div key={message.id} className="flex gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={message.profiles?.avatar_url} />
                    <AvatarFallback>
                      {message.profiles?.full_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {message.profiles?.full_name || "Unknown User"}
                          {message.profiles?.company?.name && (
                            <span className="text-muted-foreground ml-1">
                              - {message.profiles.company.name}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleString("tr-TR")}
                        </span>
                      </div>
                      {currentUserId === message.sender_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMessage(message.id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>"{selectedTopic}" konusunda henüz mesaj yok.</p>
                <p className="text-sm">İlk mesajı sen gönder!</p>
              </div>
            )}
          </div>

          {/* Message Input */}
          {!isArchived && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                "{selectedTopic}" konusuna mesaj yazıyorsunuz
              </div>
              
              {/* Membership warning */}
              {isMember === false && (
                <div className="rounded-lg border bg-yellow-50 p-3 dark:bg-yellow-950">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Not:</strong> Bu odaya üye olmadığınız için mesaj yazamazsınız. 
                    Mesaj yazmak için odaya üye olmanız gerekmektedir.
                  </p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Textarea
                  placeholder={isMember === false ? "Üye olmadığınız için mesaj yazamazsınız..." : "Forum mesajınızı yazın..."}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="min-h-[80px] resize-none"
                  disabled={sendMessageMutation.isPending || isMember === false}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending || isMember === false}
                  size="icon"
                  className="self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {isArchived && (
            <div className="text-center py-4 text-muted-foreground">
              <p>Bu oda arşivlendiği için forum mesajları gönderilemez.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mesajı Sil</DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz. Mesajınızı silmek istediğinizden emin misiniz?
            </DialogDescription>
          </DialogHeader>
          
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Uyarı:</strong> Bu mesaj kalıcı olarak silinecektir ve geri alınamaz.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={cancelDeleteMessage}>
              İptal
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteMessage}
              disabled={deleteMessageMutation.isPending}
            >
              {deleteMessageMutation.isPending ? "Siliniyor..." : "Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

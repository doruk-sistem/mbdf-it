"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, MessageCircle, User, Plus, Search, X, Trash2, AlertTriangle, ArrowLeft, Hash, Pin } from "lucide-react";
import { useMembers } from "@/hooks/use-members";
import { useForumUnread, useMarkForumAsRead } from "@/hooks/use-forum-unread";
import { usePinMessage } from "@/hooks/use-messages";
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
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { getTonnageLabel } from "@/lib/tonnage";

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
    tonnage_range?: string | null;
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
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState("");
  const [showNewTopicInput, setShowNewTopicInput] = useState(false);
  const [topicSearchTerm, setTopicSearchTerm] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'topics' | 'messages'>('topics');
  const [currentPage, setCurrentPage] = useState(1);
  const topicsPerPage = 5;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get members data to check if current user is a member
  const { data: membersData } = useMembers(roomId);
  
  // Get unread message counts
  const { data: unreadData, isLoading: unreadLoading, error: unreadError } = useForumUnread(roomId);
  const markAsReadMutation = useMarkForumAsRead();
  const pinMessageMutation = usePinMessage();

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const userData = await response.json();
          setCurrentUserId(userData.profile?.id || null);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    getUser();
  }, []);

  // All authenticated users are considered members for forum access
  const isMember = true;
  // Fetch forum topics
  const { data: topics } = useQuery<{ topic: string; isPinned: boolean }[]>({
    queryKey: ["forum-topics", roomId],
    queryFn: async (): Promise<{ topic: string; isPinned: boolean }[]> => {
      const response = await fetch(`/api/rooms/${roomId}/forum/topics`);
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("ACCESS_DENIED");
        }
        throw new Error("Failed to fetch forum topics");
      }
      const data = await response.json() as { topics: { topic: string; isPinned: boolean }[] };
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
      if (!selectedTopic) return [];
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
    enabled: !!selectedTopic,
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
        console.error("Forum message error:", errorData);
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
      console.error("Forum message send error:", error);
      toast({
        title: "Hata",
        description: "Mesaj gönderilirken bir hata oluştu.",
        variant: "destructive",
      });
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
    if (newMessage.trim() && !isArchived && selectedTopic) {
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
    if (newTopic.trim() && topics && !topics.some(t => t.topic === newTopic.trim())) {
      const newTopicName = newTopic.trim();
      setSelectedTopic(newTopicName);
      setNewTopic("");
      setShowNewTopicInput(false);
      setViewMode('messages');
      
      // Optimistically update the topics list
      queryClient.setQueryData(["forum-topics", roomId], (oldTopics: { topic: string; isPinned: boolean }[] | undefined) => {
        if (!oldTopics) return [{ topic: newTopicName, isPinned: false }];
        return [...oldTopics, { topic: newTopicName, isPinned: false }].sort((a, b) => a.topic.localeCompare(b.topic));
      });
    }
  };

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
    setViewMode('messages');
    setTopicSearchTerm("");
    
    // Mark forum as read when user enters a topic
    markAsReadMutation.mutate(roomId);
  };

  const handleBackToTopics = () => {
    setViewMode('topics');
    setSelectedTopic(null);
  };

  const handlePinTopic = async (topic: string, isPinned: boolean) => {
    // Get the first message of this topic to pin/unpin
    const response = await fetch(`/api/rooms/${roomId}/forum?topic=${encodeURIComponent(topic)}`);
    if (!response.ok) {
      return;
    }
    
    const data = await response.json() as { messages: ForumMessage[] };
    const firstMessage = data.messages[0];
    
    if (firstMessage) {
      pinMessageMutation.mutate({ 
        messageId: firstMessage.id, 
        isPinned: isPinned 
      });
    }
  };

  // Filter topics based on search term
  const filteredTopics = (topics || []).filter(topicObj =>
    topicObj.topic.toLowerCase().includes(topicSearchTerm.toLowerCase())
  );

  // Show topics based on search state
  const displayTopics = topicSearchTerm ? filteredTopics : (topics || []);

  // Pagination logic
  const totalPages = Math.ceil(displayTopics.length / topicsPerPage);
  const startIndex = (currentPage - 1) * topicsPerPage;
  const endIndex = startIndex + topicsPerPage;
  const paginatedTopics = displayTopics.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [topicSearchTerm]);


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
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Forum
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Forum mesajları yüklenirken bir hata oluştu.</p>
        </CardContent>
      </Card>
    );
  }

  // Topics List View
  if (viewMode === 'topics') {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Forum Konuları
              {unreadData?.totalUnread && unreadData.totalUnread > 0 ? (
                <Badge variant="destructive" className="ml-2">
                  {unreadData.totalUnread} okunmamış
                </Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and New Topic */}
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

            {/* Topics List */}
            <div className="space-y-2">
              {paginatedTopics.length > 0 ? (
                paginatedTopics.map((topicObj) => (
                  <div
                    key={topicObj.topic}
                    onClick={() => handleTopicSelect(topicObj.topic)}
                    className={`flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors ${
                      topicObj.isPinned ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    {topicObj.isPinned ? (
                      <Pin className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Hash className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{topicObj.topic}</h3>
                        {topicObj.isPinned && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                            Sabitlenen
                          </Badge>
                        )}
                        {unreadData?.unreadCounts?.[topicObj.topic] && unreadData.unreadCounts[topicObj.topic] > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {unreadData.unreadCounts[topicObj.topic]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Konuya tıklayarak mesajları görüntüleyin
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isMember && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePinTopic(topicObj.topic, topicObj.isPinned);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Pin className={`h-4 w-4 ${topicObj.isPinned ? 'text-blue-600' : 'text-muted-foreground'}`} />
                        </Button>
                      )}
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Henüz forum konusu yok.</p>
                  {isMember && (
                    <p className="text-sm">İlk konuyu sen oluştur!</p>
                  )}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  {displayTopics.length} konudan {startIndex + 1}-{Math.min(endIndex, displayTopics.length)} arası gösteriliyor
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Önceki
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="h-8 w-8 p-0"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Messages View
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToTopics}
              className="p-1 h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              {selectedTopic}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
                          {message.profiles?.tonnage_range && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {getTonnageLabel(message.profiles.tonnage_range)}
                            </Badge>
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
                      <div 
                        className="text-sm prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: message.content }}
                      />
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
              
              {/* All authenticated users can now participate in forum */}
              
              <div className="space-y-3">
                <RichTextEditor
                  content={newMessage}
                  onChange={setNewMessage}
                  placeholder="Forum mesajınızı yazın..."
                  disabled={sendMessageMutation.isPending}
                  className="min-h-[120px]"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Gönder
                  </Button>
                </div>
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

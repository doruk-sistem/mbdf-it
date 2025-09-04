"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, MessageCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

interface ForumMessage {
  id: string;
  content: string;
  message_type: string;
  created_at: string;
  updated_at: string;
  sender_id: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url?: string;
  } | null;
}

interface ForumTabProps {
  roomId: string;
  isArchived?: boolean;
}

export function ForumTab({ roomId, isArchived = false }: ForumTabProps) {
  const [newMessage, setNewMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch forum messages
  const { data: messages, isLoading, error } = useQuery({
    queryKey: ["forum-messages", roomId],
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomId}/forum`);
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("ACCESS_DENIED");
        }
        throw new Error("Failed to fetch forum messages");
      }
      const data = await response.json();
      return data.messages as ForumMessage[];
    },
    refetchInterval: (query) => {
      // Only refetch if we have data (user has access)
      // Don't refetch if there's an error (access denied)
      return query.state.data ? 5000 : false;
    },
    retry: (failureCount, error) => {
      // Don't retry if access is denied
      if (error.message === "ACCESS_DENIED") {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Send new message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/rooms/${roomId}/forum`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, message_type: "forum" }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["forum-messages", roomId] });
      toast({
        title: "Mesaj gönderildi",
        description: "Forum mesajınız başarıyla gönderildi.",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Mesaj gönderilirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (newMessage.trim() && !isArchived) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

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
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {message.profiles?.full_name || "Unknown User"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.created_at).toLocaleString("tr-TR")}
                      </span>
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
                <p>Henüz forum mesajı yok.</p>
                <p className="text-sm">İlk mesajı sen gönder!</p>
              </div>
            )}
          </div>

          {/* Message Input */}
          {!isArchived && (
            <div className="flex gap-2">
              <Textarea
                placeholder="Forum mesajınızı yazın..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="min-h-[80px] resize-none"
                disabled={sendMessageMutation.isPending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                size="icon"
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}

          {isArchived && (
            <div className="text-center py-4 text-muted-foreground">
              <p>Bu oda arşivlendiği için forum mesajları gönderilemez.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

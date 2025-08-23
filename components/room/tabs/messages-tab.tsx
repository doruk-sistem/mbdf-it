"use client";

import { useState, useRef } from "react";
import { Send, Pin, Reply, MoreHorizontal, Trash2 } from "lucide-react";
import { useMessages, useSendMessage, usePinMessage, useDeleteMessage } from "@/hooks/use-messages";
import { Skeleton } from "@/components/ui/skeleton";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type MessageWithProfile = {
  id: string;
  content: string;
  is_pinned: boolean;
  thread_id: string | null;
  created_at: string;
  updated_at: string | null;
  profiles: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    company: {
      name: string;
    } | null;
  } | null;
  parent_message?: MessageWithProfile | null;
};

interface MessagesTabProps {
  roomId: string;
}

export function MessagesTab({ roomId }: MessagesTabProps) {
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Query hooks
  const { data: messagesData, isLoading, error } = useMessages(roomId);
  const sendMessageMutation = useSendMessage();
  const pinMessageMutation = usePinMessage();
  const deleteMessageMutation = useDeleteMessage();

  // Extract messages from query response
  const messages = messagesData?.items || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    sendMessageMutation.mutate(
      {
        roomId,
        content: newMessage,
        thread_id: replyTo,
      },
      {
        onSuccess: () => {
          setNewMessage("");
          setReplyTo(null);
          scrollToBottom();
        }
      }
    );
  };

  const handlePinMessage = (messageId: string, currentPinStatus: boolean) => {
    pinMessageMutation.mutate({ messageId, isPinned: currentPinStatus });
  };

  const handleDeleteMessage = (messageId: string) => {
    deleteMessageMutation.mutate(messageId);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Az önce";
    if (diffInHours < 24) return `${diffInHours} saat önce`;
    
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReplyingToMessage = () => {
    if (!replyTo) return null;
    return messages.find(msg => msg.id === replyTo);
  };

  const pinnedMessages = messages.filter(msg => msg.is_pinned);
  const regularMessages = messages.filter(msg => !msg.is_pinned);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mesajlar</CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-48" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mesajlar</CardTitle>
          <CardDescription className="text-destructive">
            Mesajlar yüklenirken bir hata oluştu.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader>
        <CardTitle>Oda Mesajları</CardTitle>
        <CardDescription>
          Oda üyeleri ile iletişim kurun ve önemli duyuruları takip edin
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Pinned Messages */}
        {pinnedMessages.length > 0 && (
          <div className="px-6 py-3 bg-blue-50 dark:bg-blue-950/20 border-b">
            <div className="flex items-center space-x-2 mb-2">
              <Pin className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Sabitlenmiş Mesajlar
              </span>
            </div>
            <div className="space-y-2">
              {pinnedMessages.map((message) => (
                <div key={message.id} className="text-sm text-blue-700 dark:text-blue-300 bg-white dark:bg-blue-900/30 p-2 rounded">
                  <div className="flex items-center space-x-2 text-xs text-blue-600 dark:text-blue-400 mb-1">
                    <span className="font-medium">{message.profiles?.full_name}</span>
                    <span>•</span>
                    <span>{formatTime(message.created_at)}</span>
                  </div>
                  <p>{message.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
            {regularMessages.map((message) => (
              <div key={message.id} className="flex space-x-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={message.profiles?.avatar_url || ""} />
                  <AvatarFallback className="text-xs">
                    {message.profiles?.full_name
                      ? message.profiles.full_name
                          .split(" ")
                          .map(n => n[0])
                          .join("")
                          .toUpperCase()
                      : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">
                      {message.profiles?.full_name || "İsimsiz"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {message.profiles?.company?.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(message.created_at)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setReplyTo(message.id)}>
                          <Reply className="mr-2 h-4 w-4" />
                          Yanıtla
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePinMessage(message.id, message.is_pinned)}>
                          <Pin className="mr-2 h-4 w-4" />
                          {message.is_pinned ? "Sabitleme Kaldır" : "Sabitle"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteMessage(message.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {message.parent_message && (
                    <div className="mt-1 p-2 bg-muted rounded text-sm border-l-2 border-primary">
                      <div className="text-xs text-muted-foreground mb-1">
                        {message.parent_message.profiles?.full_name} yanıtlanıyor
                      </div>
                      <p className="text-muted-foreground line-clamp-2">
                        {message.parent_message.content}
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-1 text-sm group">
                    <p>{message.content}</p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <Separator />

        {/* Message Input */}
        <div className="p-4 border-t">
          {replyTo && (
            <div className="mb-2 p-2 bg-muted rounded text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground">
                    {getReplyingToMessage()?.profiles?.full_name} yanıtlanıyor
                  </span>
                  <p className="line-clamp-1">{getReplyingToMessage()?.content}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyTo(null)}
                >
                  ✕
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Mesaj yazın..."
              disabled={sendMessageMutation.isPending}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button
              onClick={handleSendMessage}
              disabled={sendMessageMutation.isPending || !newMessage.trim()}
            >
              {sendMessageMutation.isPending ? (
                "Gönderiliyor..."
              ) : (
                <>
                  <Send className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
"use client";

import { useState } from "react";
import { Plus, UserX, Crown, Shield } from "lucide-react";

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
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from "@/components/ui/table";

interface MembersTabProps {
  roomId: string;
}

// Mock data
const mockMembers = [
  {
    id: "1",
    profiles: {
      full_name: "Ahmet Yılmaz",
      email: "ahmet@company.com",
      avatar_url: null,
      company: {
        name: "ABC Kimya"
      }
    },
    role: "admin",
    joined_at: "2024-01-15T10:00:00Z"
  },
  {
    id: "2",
    profiles: {
      full_name: "Fatma Kaya",
      email: "fatma@petrokim.com",
      avatar_url: null,
      company: {
        name: "Petro Kimya"
      }
    },
    role: "lr",
    joined_at: "2024-01-20T14:30:00Z"
  },
  {
    id: "3",
    profiles: {
      full_name: "Mehmet Özkan",
      email: "mehmet@demir.com",
      avatar_url: null,
      company: {
        name: "Demir A.Ş."
      }
    },
    role: "member",
    joined_at: "2024-02-01T09:15:00Z"
  }
];

export function MembersTab({ roomId }: MembersTabProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMembers = mockMembers.filter(member =>
    member.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.profiles.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.profiles.company?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4" />;
      case "lr":
        return <Shield className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Yönetici";
      case "lr":
        return "LR";
      case "member":
        return "Üye";
      default:
        return role;
    }
  };

  const getRoleVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "lr":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Oda Üyeleri</CardTitle>
            <CardDescription>
              Bu odadaki tüm üyeleri görüntüleyin ve yönetin
            </CardDescription>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Üye Ekle
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Üye ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Members Table */}
        <div className="border rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Üye</TableHead>
                <TableHead>Şirket</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Katılım Tarihi</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.profiles.avatar_url || ""} />
                        <AvatarFallback>
                          {member.profiles.full_name
                            .split(" ")
                            .map(n => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.profiles.full_name}</p>
                        <p className="text-sm text-muted-foreground">{member.profiles.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{member.profiles.company?.name}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleVariant(member.role)} className="text-xs">
                      <span className="flex items-center space-x-1">
                        {getRoleIcon(member.role)}
                        <span>{getRoleLabel(member.role)}</span>
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(member.joined_at).toLocaleDateString('tr-TR')}
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
                        <DropdownMenuItem>Profili görüntüle</DropdownMenuItem>
                        {member.role !== "admin" && (
                          <>
                            <DropdownMenuItem>Rol değiştir</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <UserX className="mr-2 h-4 w-4" />
                              Odadan çıkar
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

        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Arama kriterlerinize uygun üye bulunamadı.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
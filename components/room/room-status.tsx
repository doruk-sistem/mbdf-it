"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMembers } from "@/hooks/use-members";
import { useDocuments } from "@/hooks/use-documents";
import { calculateTotalTonnage, formatTonnageRange } from "@/lib/tonnage";
import { 
  Users, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  BarChart3
} from "lucide-react";

interface RoomStatusProps {
  roomId: string;
}

export function RoomStatus({ roomId }: RoomStatusProps) {
  const { data: membersData, isLoading: membersLoading } = useMembers(roomId);
  const { data: documentsData, isLoading: documentsLoading } = useDocuments(roomId);

  if (membersLoading || documentsLoading) {
    return <RoomStatusSkeleton />;
  }

  const members = membersData?.items || [];
  const documents = documentsData?.items || [];
  
  // Include all members with tonnage (LR and regular members)
  const membersWithTonnage = members.filter(member => 
    member.tonnage_range
  );
  
  // Separate LR and regular members for display
  const lrMembers = members.filter(member => member.role === 'lr' && member.tonnage_range);
  const regularMembers = members.filter(member => member.role === 'member' && member.tonnage_range);

  // Calculate total tonnage (including LR)
  const tonnageStats = calculateTotalTonnage(membersWithTonnage);

  // Check ministry submission status (mock data for now - ministry_submitted field doesn't exist yet)
  const ministrySubmittedDocs: any[] = []; // Mock: no documents submitted yet
  const ministryPendingDocs = documents; // All documents are pending for now
  
  // Determine ministry submission status
  const hasSubmittedDocs = ministrySubmittedDocs.length > 0;
  const hasPendingDocs = ministryPendingDocs.length > 0;

  // Calculate tonnage distribution for chart
  const tonnageDistribution = membersWithTonnage.reduce((acc, member) => {
    const range = member.tonnage_range;
    if (range) {
      acc[range] = (acc[range] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Tonnage Overview Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Toplam Kimyasal Tonaj
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {tonnageStats.memberCount > 0 
              ? formatTonnageRange(tonnageStats.totalMin, tonnageStats.totalMax)
              : "0 ton"
            }
          </div>
          <p className="text-xs text-muted-foreground">
            {tonnageStats.memberCount} üyenin tonaj bilgisi
            {tonnageStats.hasUnspecified && " (bazı üyeler belirtmemiş)"}
          </p>
        </CardContent>
      </Card>

      {/* Member Statistics Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Katılımcı Üyeler
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {regularMembers.length}
          </div>
          <p className="text-xs text-muted-foreground">
            Toplam {members.length} üye
          </p>
        </CardContent>
      </Card>

      {/* Ministry Submission Status Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Bakanlık Gönderim Durumu
          </CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {documents.length === 0 ? (
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-muted-foreground">Henüz doküman yüklenmemiş</span>
              </div>
            ) : hasSubmittedDocs && !hasPendingDocs ? (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-700">Lider Tarafından Gönderildi</span>
              </div>
            ) : hasPendingDocs && !hasSubmittedDocs ? (
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700">Lider Tarafından Gönderilmedi</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-yellow-700">Kısmen Gönderildi</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tonnage Distribution Chart */}
      {Object.keys(tonnageDistribution).length > 0 && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <BarChart3 className="mr-2 h-4 w-4" />
              Tonaj Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(tonnageDistribution).map(([range, count]) => {
                const percentage = (count / membersWithTonnage.length) * 100;
                const getRangeColor = (range: string) => {
                  switch (range) {
                    case "1-10": return "bg-blue-500";
                    case "10-100": return "bg-green-500";
                    case "100-1000": return "bg-yellow-500";
                    case "1000+": return "bg-red-500";
                    default: return "bg-gray-500";
                  }
                };
                
                return (
                  <div key={range} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{range} ton</span>
                      <span className="text-muted-foreground">{count} üye ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getRangeColor(range)}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Tonnage Breakdown */}
      {tonnageStats.memberCount > 0 && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Tonaj Detayları
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* LR Members */}
              {lrMembers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Lider (LR)</h4>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {lrMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                        <div>
                          <p className="text-sm font-medium">
                            {member.profiles?.full_name || "İsimsiz LR"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.profiles?.company?.name || "Şirket bilgisi yok"}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-blue-100">
                          {member.tonnage_range}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Regular Members */}
              {regularMembers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Üyeler</h4>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {regularMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">
                            {member.profiles?.full_name || "İsimsiz Üye"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.profiles?.company?.name || "Şirket bilgisi yok"}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {member.tonnage_range}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {tonnageStats.hasUnspecified && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">
                    {members.filter(m => !m.tonnage_range).length} üyenin tonaj bilgisi belirtilmemiş
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RoomStatusSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-3 w-40" />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-36" />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-8" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-8" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

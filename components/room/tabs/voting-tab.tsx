"use client";

import { useState } from "react";
import { Vote, Crown, Star, Users, CheckCircle, Plus } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/use-toast";
import { useVotes, useCandidates, useSubmitVote, useSubmitAllVotes, useNominateCandidate } from "@/hooks/use-votes";
import { useMembers } from "@/hooks/use-members";
import { useCurrentUser } from "@/hooks/use-user";
import { Skeleton } from "@/components/ui/skeleton";

interface VotingTabProps {
  roomId: string;
}


const scoreLabels = {
  technical: "Teknik Bilgi",
  experience: "Deneyim", 
  availability: "Müsaitlik",
  communication: "İletişim",
  leadership: "Liderlik"
};

export function VotingTab({ roomId }: VotingTabProps) {
  const [votes, setVotes] = useState<Record<string, {
    technical: number[];
    experience: number[];
    availability: number[];
    communication: number[];
    leadership: number[];
  }>>({});
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [showNominateDialog, setShowNominateDialog] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  
  const { toast } = useToast();

  // Data fetching
  const { data: votingData, isLoading: votesLoading, error: votesError } = useVotes(roomId);
  const { data: candidatesData, isLoading: candidatesLoading, error: candidatesError } = useCandidates(roomId);
  const { data: membersData, isLoading: membersLoading } = useMembers(roomId);
  const { data: user } = useCurrentUser();

  // Mutations
  const submitVoteMutation = useSubmitVote();
  const submitAllVotesMutation = useSubmitAllVotes();
  const nominateCandidateMutation = useNominateCandidate();

  const candidates = candidatesData?.items || [];
  const members = (membersData as any)?.items || [];
  const votingResults = votingData?.results || [];
  const currentUserRole = (membersData as any)?.currentUserRole || 'member';
  const myVote = votingData?.my_vote;
  const isFinalized = votingData?.is_finalized || false;
  
  // Check if current user is a candidate
  const currentUser = members.find((member: any) => member.profiles?.email === user?.profile?.email);
  const isCurrentUserCandidate = candidates.some((candidate: any) => candidate.user_id === currentUser?.user_id);

  // Check for tie (equal scores)
  const maxScore = votingResults.length > 0 ? Math.max(...votingResults.map(r => r.total_score)) : 0;
  const topCandidates = votingResults.filter(r => r.total_score === maxScore);
  const hasTie = topCandidates.length > 1 && maxScore > 0;

  const handleVoteChange = (candidateId: string, criterion: string, value: number[]) => {
    setVotes(prev => ({
      ...prev,
      [candidateId]: {
        ...prev[candidateId],
        [criterion]: value
      }
    }));
  };

  const initializeVotesForCandidate = (candidateId: string) => {
    if (!votes[candidateId]) {
      setVotes(prev => ({
        ...prev,
        [candidateId]: {
          technical: [4],
          experience: [4],
          availability: [4],
          communication: [4],
          leadership: [4]
        }
      }));
    }
  };

  const handleSubmitAllVotes = () => {
    if (candidates.length === 0) {
      toast({
        title: "Aday yok",
        description: "Değerlendirmek için en az bir aday olmalı.",
        variant: "destructive",
      });
      return;
    }

    // Check if all candidates have been evaluated
    const unevaluatedCandidates = candidates.filter((candidate: any) => !votes[candidate.id]);
    if (unevaluatedCandidates.length > 0) {
      toast({
        title: "Eksik değerlendirme",
        description: `Lütfen tüm adayları değerlendirin. ${unevaluatedCandidates.length} aday eksik.`,
        variant: "destructive",
      });
      return;
    }

    // Prepare all votes data
    const allVotes = candidates.map((candidate: any) => {
      const candidateVotes = votes[candidate.id];
      return {
        candidate_id: candidate.id,
        technical_score: candidateVotes.technical[0],
        experience_score: candidateVotes.experience[0],
        availability_score: candidateVotes.availability[0],
        communication_score: candidateVotes.communication[0],
        leadership_score: candidateVotes.leadership[0],
      };
    });

    // Submit all votes at once
    submitAllVotesMutation.mutate({
      roomId,
      votes: allVotes
    });
  };


  const handleNominateCandidate = () => {
    // For members, use current user ID; for admin/lr, use selected member ID
    let userId: string;
    
    if (['admin', 'lr'].includes(currentUserRole)) {
      if (!selectedMemberId) {
        toast({
          title: "Üye seçin",
          description: "Aday göstermek için bir üye seçmelisiniz.",
          variant: "destructive",
        });
        return;
      }
      userId = selectedMemberId;
    } else {
      // For members, we need to get current user ID from members data
      const currentUser = members.find((member: any) => member.profiles?.email === user?.profile?.email);
      if (!currentUser) {
        toast({
          title: "Hata",
          description: "Kullanıcı bilgileri bulunamadı.",
          variant: "destructive",
        });
        return;
      }
      userId = currentUser.user_id;
    }

    nominateCandidateMutation.mutate({
      roomId,
      userId
    }, {
      onSuccess: () => {
        setShowNominateDialog(false);
        setSelectedMemberId("");
      }
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "text-green-600";
    if (score >= 4.0) return "text-blue-600";
    if (score >= 3.5) return "text-yellow-600";
    return "text-red-600";
  };

  // Loading state
  if (votesLoading || candidatesLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (votesError || candidatesError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p>Oylama verileri yüklenirken hata oluştu.</p>
            <p className="text-sm text-muted-foreground mt-2">
              {votesError?.message || candidatesError?.message}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current LR */}
      {candidates.find((c: any) => c.is_selected) && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Crown className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-800 dark:text-green-200">Seçilen Lider Kayıtçı</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const selectedLR = candidates.find((c: any) => c.is_selected)!;
              const lrResult = votingResults.find(r => r.candidate_id === selectedLR.id);
              return (
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {(selectedLR.profiles?.full_name || lrResult?.full_name)
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase() || "LR"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-green-800 dark:text-green-200">
                      {selectedLR.profiles?.full_name || lrResult?.full_name || "Bilinmeyen"}
                    </h3>
                    <p className="text-sm text-green-600 dark:text-green-300">
                      {selectedLR.profiles?.company?.name || "Şirket bilgisi yok"}
                    </p>
                    {lrResult && (
                      <div className="flex items-center space-x-2 mt-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">
                          {lrResult.total_score.toFixed(1)}/5.0
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({lrResult.vote_count} oy)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Voting */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>LR Oylaması</CardTitle>
                <CardDescription>
                  Lider Kayıtçı adaylarını değerlendirin (0-5 puan)
                </CardDescription>
              </div>
              <Button
                onClick={() => setShowNominateDialog(true)}
                size="sm"
                variant="outline"
                disabled={isFinalized}
              >
                <Plus className="mr-2 h-4 w-4" />
                {['admin', 'lr'].includes(currentUserRole) ? 'Aday Ekle' : 'Kendimi Aday Göster'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* All Candidates Evaluation */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Tüm Adayları Değerlendirin:</Label>
                <Badge variant="outline" className="text-xs">
                  {candidates.length} aday
                </Badge>
              </div>
              {candidates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Henüz aday yok</p>
                  <p className="text-sm">Aday eklemek için yukarıdaki butonu kullanın</p>
                </div>
              ) : (
                candidates.map((candidate: any) => {
                  initializeVotesForCandidate(candidate.id);
                  const candidateVotes = votes[candidate.id] || {
                    technical: [4],
                    experience: [4],
                    availability: [4],
                    communication: [4],
                    leadership: [4]
                  };
                  
                  return (
                    <Card key={candidate.id} className={candidate.is_selected ? "border-green-200" : ""}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="text-sm">
                              {candidate.profiles?.full_name
                                ?.split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-medium">{candidate.profiles?.full_name || "Bilinmeyen"}</h3>
                            <p className="text-sm text-muted-foreground">
                              {candidate.profiles?.company?.name || "Şirket bilgisi yok"}
                            </p>
                          </div>
                          {candidate.is_selected && (
                            <Badge variant="default">
                              <Crown className="mr-1 h-3 w-3" />
                              Seçilen
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {Object.entries(scoreLabels).map(([key, label]) => (
                            <div key={key} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm">{label}</Label>
                                <span className="text-sm font-medium">
                                  {candidateVotes[key as keyof typeof candidateVotes][0]}/5
                                </span>
                              </div>
                              <Slider
                                value={candidateVotes[key as keyof typeof candidateVotes]}
                                onValueChange={(value) => handleVoteChange(candidate.id, key, value)}
                                max={5}
                                min={0}
                                step={0.5}
                                className="w-full"
                                disabled={isFinalized}
                              />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>


            {isFinalized ? (
              <div className="text-center py-6 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-600" />
                <h3 className="text-lg font-semibold text-green-800 mb-2">🎉 Oylama Tamamlandı!</h3>
                <p className="text-green-700">LR seçimi başarıyla tamamlandı. Seçilen LR yukarıda görüntüleniyor.</p>
              </div>
            ) : hasTie ? (
              <div className="space-y-4">
                <div className="text-center py-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">🔄 Tekrar Oylama Gerekli</h3>
                  <p className="text-yellow-700 mb-2">
                    En yüksek puanlı adaylar eşit ({maxScore.toFixed(1)}/5.0)! 
                  </p>
                  <p className="text-yellow-600 text-sm">
                    Lütfen tüm adayları tekrar değerlendirin ve farklı puanlar verin.
                  </p>
                </div>
                <Button
                  onClick={handleSubmitAllVotes}
                  className="w-full"
                  disabled={candidates.length === 0 || submitAllVotesMutation.isPending}
                >
                  <Vote className="mr-2 h-4 w-4" />
                  {submitAllVotesMutation.isPending 
                    ? "Kaydediliyor..." 
                    : "Tekrar Değerlendirmeleri Gönder"
                  }
                </Button>
              </div>
            ) : isCurrentUserCandidate ? (
              <div className="text-center py-6 bg-blue-50 border border-blue-200 rounded-lg">
                <Users className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Adaysınız</h3>
                <p className="text-blue-700">Aday olarak kendinize oy veremezsiniz. Diğer üyeler sizi değerlendirecek.</p>
              </div>
            ) : (
              <Button
                onClick={handleSubmitAllVotes}
                className="w-full"
                disabled={candidates.length === 0 || submitAllVotesMutation.isPending}
              >
                <Vote className="mr-2 h-4 w-4" />
                {submitAllVotesMutation.isPending 
                  ? "Kaydediliyor..." 
                  : hasTie 
                    ? "Tekrar Değerlendirmeleri Gönder" 
                    : "Tüm Değerlendirmeleri Gönder"
                }
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sonuçlar</CardTitle>
                <CardDescription>
                  {isFinalized 
                    ? "Oylama tamamlandı - LR seçildi" 
                    : hasTie
                    ? `🔄 Eşit puanlar! Tekrar oylama gerekli (${maxScore.toFixed(1)}/5.0)`
                    : (() => {
                        const totalVotes = votingResults.reduce((sum, r) => sum + r.vote_count, 0);
                        const candidateUserIds = candidates.map((c: any) => c.user_id);
                        const eligibleVoters = members.length - candidateUserIds.length;
                        const expectedVotes = eligibleVoters * candidates.length;
                        return `Mevcut oy durumu ve skorlar (${totalVotes}/${expectedVotes} beklenen oy - ${eligibleVoters} üye × ${candidates.length} aday)`;
                      })()
                  }
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {votingResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Vote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Henüz oy verilmemiş</p>
                <p className="text-sm">Sonuçları görmek için oy verin</p>
              </div>
            ) : (
                votingResults
                .sort((a, b) => b.total_score - a.total_score)
                .map((result, index) => {
                  const candidate = candidates.find((c: any) => c.id === result.candidate_id);
                  return (
                    <Card key={result.candidate_id} className={candidate?.is_selected ? "border-green-200" : ""}>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="text-2xl font-bold text-muted-foreground">
                                #{index + 1}
                              </div>
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {candidate?.profiles?.full_name
                                    ?.split(" ")
                                    .map((n: string) => n[0])
                                    .join("")
                                    .toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{candidate?.profiles?.full_name || "Bilinmeyen"}</p>
                                <p className="text-sm text-muted-foreground">
                                  {candidate?.profiles?.company?.name || "Şirket bilgisi yok"}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-2xl font-bold ${getScoreColor(result.total_score)}`}>
                                {result.total_score.toFixed(1)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {result.vote_count} oy
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Nominate Candidate Dialog */}
      {showNominateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>{['admin', 'lr'].includes(currentUserRole) ? 'Aday Ekle' : 'Kendimi Aday Göster'}</CardTitle>
              <CardDescription>
                {['admin', 'lr'].includes(currentUserRole) 
                  ? 'LR adayı olarak göstermek istediğiniz üyeyi seçin'
                  : 'Kendinizi LR adayı olarak göstermek istediğinizi onaylayın'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {['admin', 'lr'].includes(currentUserRole) ? (
                <div className="space-y-2">
                  <Label>Üye Seçin:</Label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Üye seçin...</option>
                    {members
                      .filter((member: any) => !candidates.some((c: any) => c.user_id === member.user_id))
                      .map((member: any) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.profiles?.full_name} - {member.profiles?.company?.name}
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Kendinizi Aday Gösteriyorsunuz:</Label>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      LR (Lead Registrant) adayı olarak kendinizi göstermek istediğinizi onaylıyor musunuz?
                    </p>
                  </div>
                </div>
              )}
              <div className="flex space-x-2">
                <Button
                  onClick={handleNominateCandidate}
                  disabled={(['admin', 'lr'].includes(currentUserRole) ? !selectedMemberId : false) || nominateCandidateMutation.isPending}
                  className="flex-1"
                >
                  {nominateCandidateMutation.isPending 
                    ? "Ekleniyor..." 
                    : (['admin', 'lr'].includes(currentUserRole) ? "Aday Ekle" : "Kendimi Aday Göster")
                  }
                </Button>
                <Button
                  onClick={() => {
                    setShowNominateDialog(false);
                    setSelectedMemberId("");
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  İptal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
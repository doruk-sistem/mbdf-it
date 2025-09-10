"use client";

import React, { useState } from "react";
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
import { useVotes, useCandidates, useSubmitVote, useSubmitAllVotes, useNominateCandidate, useFinalizeLR, useResetVotes } from "@/hooks/use-votes";
import { useMembers } from "@/hooks/use-members";
import { useCurrentUser } from "@/hooks/use-user";
import { Skeleton } from "@/components/ui/skeleton";
import { CountdownTimer } from "@/components/ui/countdown-timer";

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
  const [forcePhaseUpdate, setForcePhaseUpdate] = useState(0);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [currentVotingCandidate, setCurrentVotingCandidate] = useState<any>(null);
  const [evaluatedCandidates, setEvaluatedCandidates] = useState<Set<string>>(new Set());
  const [isTieDetected, setIsTieDetected] = useState(false);
  const [finalizeTimeoutRef, setFinalizeTimeoutRef] = useState<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  // Data fetching
  const { data: votingData, isLoading: votesLoading, error: votesError, refetch: refetchVotes } = useVotes(roomId);
  const { data: candidatesData, isLoading: candidatesLoading, error: candidatesError, refetch: refetchCandidates } = useCandidates(roomId);
  const { data: membersData, isLoading: membersLoading } = useMembers(roomId);
  const { data: user } = useCurrentUser();

  // Mutations
  const submitVoteMutation = useSubmitVote();
  const submitAllVotesMutation = useSubmitAllVotes();
  const nominateCandidateMutation = useNominateCandidate();
  const finalizeLRMutation = useFinalizeLR();
  const resetVotesMutation = useResetVotes();

  const candidates = candidatesData?.items || [];
  const members = (membersData as any)?.items || [];
  const votingResults = votingData?.results || [];
  const currentUserRole = (membersData as any)?.currentUserRole || 'member';
  const myVote = votingData?.my_vote;
  // More intelligent finalized check - if no candidates, it's not finalized
  // Use API's is_finalized value which already checks if all eligible members have voted
  const isFinalized = (votingData?.is_finalized || false) && candidates.length > 0;
  
  // Check if current user is a candidate
  const currentUser = members.find((member: any) => member.profiles?.email === user?.profile?.email);
  const isCurrentUserCandidate = candidates.some((candidate: any) => candidate.user_id === currentUser?.user_id);

  // Check for tie (equal scores) - but only if we're not already in a tie state
  const maxScore = votingResults.length > 0 ? Math.max(...votingResults.map(r => r.total_score)) : 0;
  const topCandidates = votingResults.filter(r => r.total_score === maxScore);
  const hasTie = !isTieDetected && topCandidates.length > 1 && maxScore > 0;
  
  
  // Reset evaluated candidates when tie is detected
  React.useEffect(() => {
    if (hasTie && !isTieDetected) {
      setIsTieDetected(true);
      setEvaluatedCandidates(new Set());
      
      // Cancel any pending finalize timeout
      if (finalizeTimeoutRef) {
        clearTimeout(finalizeTimeoutRef);
        setFinalizeTimeoutRef(null);
      }
      
      // Check if voting time is still active
      const now = Date.now();
      const isVotingTimeActive = votingEndTime && now < votingEndTime.getTime();
      
      // Reset votes in database when tie is detected - THIS MUST HAPPEN FIRST
      resetVotesMutation.mutate({ roomId }, {
        onSuccess: () => {
          // Refresh data after reset
          refetchVotes();
          refetchCandidates();
          
          // Wait a bit longer to ensure data is fully refreshed
          setTimeout(() => {
            // Force another refresh to make sure we have clean data
            refetchVotes();
            refetchCandidates();
          }, 2000);
        },
        onError: (error) => {
          console.error('❌ VOTES RESET ERROR:', error);
        }
      });
      
      if (isVotingTimeActive) {
        toast({
          title: "🔄 Tekrar Oylama Gerekli",
          description: `En yüksek puanlı adaylar eşit (${maxScore.toFixed(1)}/5.0)! Oylar sıfırlandı, lütfen tekrar değerlendirin.`,
          variant: "default",
          duration: 10000,
        });
      } else {
        toast({
          title: "🔄 Eşit Puan - Süre Doldu",
          description: `En yüksek puanlı adaylar eşit (${maxScore.toFixed(1)}/5.0)! Oylar sıfırlandı. Tüm adaylara oy verilmesi gerekiyor.`,
          variant: "default",
          duration: 10000,
        });
      }
    } else if (!hasTie && isTieDetected && votingResults.length === 0) {
      // Reset tie detection when votes are cleared
      setIsTieDetected(false);
      setEvaluatedCandidates(new Set());
    }
  }, [hasTie, isTieDetected, votingResults.length]); // Remove votingEndTime from dependencies

  // Check if voting is complete (all eligible voters have voted for all candidates)
  const candidateUserIds = candidates.map((c: any) => c.user_id);
  const eligibleVoters = members.length - candidateUserIds.length; // Non-candidate members
  const expectedTotalVotes = eligibleVoters * candidates.length;
  const actualTotalVotes = votingResults.reduce((sum, result) => sum + result.vote_count, 0);
  const isVotingComplete = eligibleVoters > 0 && actualTotalVotes >= expectedTotalVotes && !isFinalized;

  // Voting phase logic based on first candidate creation time
  const getVotingPhase = (actualVotes: number, expectedVotes: number) => {
    if (candidates.length === 0) {
      return 'no-candidates';
    }
    
    // If there's a tie, always return 'voting' to allow re-evaluation
    if (hasTie) {
      return 'voting';
    }
    
    // Check if all members have voted before marking as completed
    if (isFinalized && actualVotes >= expectedVotes) {
      return 'completed';
    }
    
    // If finalized but not all members voted, continue voting
    if (isFinalized && actualVotes < expectedVotes) {
      // Continue with voting phase logic below
    }
    
    const firstCandidate = candidates.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0];
    
    const now = Date.now();
    const firstCandidateTime = new Date(firstCandidate.created_at).getTime();
    const votingStartTime = firstCandidateTime + (60 * 1000); // +1 minute for testing
    const votingEndTime = votingStartTime + (60 * 1000); // +2 minutes for testing
    
    if (now < votingStartTime) {
      return 'nomination';
    }
    if (now < votingEndTime) {
      return 'voting';
    }
    
    // Time expired, but check if all members have voted
    if (actualVotes < expectedVotes) {
      return 'voting'; // Continue voting even if time expired
    }
    
    return 'completed';
  };

  const votingPhase = getVotingPhase(actualTotalVotes, expectedTotalVotes);
  const firstCandidate = candidates.length > 0 ? candidates.sort((a: any, b: any) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )[0] : null;
  
  const votingStartTime = firstCandidate ? new Date(new Date(firstCandidate.created_at).getTime() + (60 * 1000)) : null; // +1 minute for testing
  const votingEndTime = votingStartTime ? new Date(votingStartTime.getTime() + (60 * 1000)) : null; // +1 minute for testing


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
    // Always use current user ID for self-nomination
      const currentUser = members.find((member: any) => member.profiles?.email === user?.profile?.email);
      if (!currentUser) {
        toast({
          title: "Hata",
          description: "Kullanıcı bilgileri bulunamadı.",
          variant: "destructive",
        });
        return;
    }

    nominateCandidateMutation.mutate({
      roomId,
      userId: currentUser.user_id
    }, {
      onSuccess: () => {
        setShowNominateDialog(false);
        setSelectedMemberId("");
      }
    });
  };

  const handleStartVoting = (candidate: any) => {
    setCurrentVotingCandidate(candidate);
    setShowVoteModal(true);
    // Initialize votes for this candidate
    initializeVotesForCandidate(candidate.id);
  };

  const handleSubmitSingleVote = () => {
    if (!currentVotingCandidate) return;

    const candidateVotes = votes[currentVotingCandidate.id];
    if (!candidateVotes) {
      toast({
        title: "Hata",
        description: "Lütfen tüm kriterleri değerlendirin.",
        variant: "destructive",
      });
      return;
    }

    const voteData = {
      candidate_id: currentVotingCandidate.id,
      technical_score: candidateVotes.technical[0],
      experience_score: candidateVotes.experience[0],
      availability_score: candidateVotes.availability[0],
      communication_score: candidateVotes.communication[0],
      leadership_score: candidateVotes.leadership[0],
    };

    submitVoteMutation.mutate({
      roomId,
      ...voteData
    }, {
      onSuccess: () => {
        // Mark candidate as evaluated
        setEvaluatedCandidates(prev => new Set(Array.from(prev).concat(currentVotingCandidate.id)));
        setShowVoteModal(false);
        setCurrentVotingCandidate(null);
        
        // Check if current user has evaluated all candidates
        const currentUserEvaluatedAll = candidates.every((c: any) => 
          evaluatedCandidates.has(c.id) || c.id === currentVotingCandidate.id
        );
        
        
        // Only show completion message for current user, don't auto-finalize
        if (currentUserEvaluatedAll) {
          toast({
            title: "✅ Tüm Adayları Değerlendirdiniz",
            description: "Tüm adayları değerlendirdiniz. Diğer üyeler de oy verene kadar bekleyin.",
            variant: "default",
          });
        }
        
        // Check if we have enough votes for majority (this is the real finalization trigger)
        const requiredVotesForMajority = Math.ceil(expectedTotalVotes * 0.51);
        if (actualTotalVotes >= requiredVotesForMajority) {
          // Check for tie BEFORE attempting finalization
          if (hasTie || isTieDetected) {
            toast({
              title: "🔄 Eşit Puan Tespit Edildi",
              description: "Oylar sıfırlanıyor, lütfen tekrar değerlendirin.",
              variant: "default",
            });
            return; // Don't finalize if there's a tie
          }
          
          // Additional check: Make sure we have enough votes for all candidates
          const expectedVotesForAllCandidates = eligibleVoters * candidates.length;
          if (actualTotalVotes < expectedVotesForAllCandidates) {
            toast({
              title: "⚠️ Eksik Oylar",
              description: "Tüm üyeler tüm adaylara oy vermeli.",
              variant: "default",
            });
            return;
          }
          
          toast({
            title: "Tüm değerlendirmeler tamamlandı!",
            description: "LR seçimi otomatik olarak yapılacak.",
          });
          
          // Auto-finalize if all votes are in and no tie - BUT WAIT LONGER
          const timeoutId = setTimeout(() => {
            // Get the best candidate and finalize
            refetchVotes().then(() => {
              refetchCandidates().then(() => {
                // Wait a bit more to ensure all data is fresh
                setTimeout(() => {
                  // Triple-check for tie after refetch
                  if (hasTie || isTieDetected) {
                    toast({
                      title: "🔄 Eşit Puan Tespit Edildi",
                      description: "Finalize işlemi iptal edildi.",
                      variant: "default",
                    });
                    return;
                  }
                  
                  // Find the candidate with highest score
                  if (votingResults.length === 0) {
                    toast({
                      title: "⚠️ Oylar Bulunamadı",
                      description: "Finalize işlemi iptal edildi.",
                      variant: "default",
                    });
                    return;
                  }
                  
                  const maxScore = Math.max(...votingResults.map(r => r.total_score));
                  const topCandidates = votingResults.filter(r => r.total_score === maxScore);
                  
                  // Only finalize if there's exactly one top candidate (no tie)
                  if (topCandidates.length === 1) {
                    const bestCandidate = candidates.find((c: any) => c.id === topCandidates[0].candidate_id);
                    
                    if (bestCandidate) {
                      // Final check before finalizing
                      toast({
                        title: "🎯 Lider Seçiliyor",
                        description: `${bestCandidate.profiles?.full_name || 'Aday'} lider olarak seçiliyor...`,
                        variant: "default",
                      });
                      
                      finalizeLRMutation.mutate({
                        roomId: roomId,
                        candidateId: bestCandidate.id
                      }, {
                        onSuccess: () => {
                          // Force phase update
                          setForcePhaseUpdate(prev => prev + 1);
                        },
                        onError: (error: any) => {
                          console.error('❌ FINALIZE ERROR:', error);
                          toast({
                            title: 'Finalize Hatası',
                            description: error?.data?.error || 'LR seçimi tamamlanamadı',
                            variant: 'destructive',
                          });
                        }
                      });
                    }
                  } else {
                    toast({
                      title: "🔄 Eşit Puan Tespit Edildi",
                      description: `${topCandidates.length} aday eşit puan aldı. Finalize işlemi iptal edildi.`,
                      variant: "default",
                    });
                  }
                }, 1500); // Additional 1.5 second delay
              });
            });
          }, 3000); // Increased from 1000ms to 3000ms
          
          // Store timeout reference for potential cancellation
          setFinalizeTimeoutRef(timeoutId);
        }
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
      {/* Current LR - Only show if no tie exists */}
      {candidates.find((c: any) => c.is_selected) && !hasTie && (
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
                  {votingPhase === 'no-candidates' && "Lider Kayıtçı adaylarını değerlendirin (0-5 puan)"}
                  {votingPhase === 'nomination' && "Aday gösterme dönemi - Oylama 1 gün sonra başlayacak"}
                  {votingPhase === 'voting' && actualTotalVotes >= expectedTotalVotes && "Oylama dönemi - Lider Kayıtçı adaylarını değerlendirin (0-5 puan)"}
                  {votingPhase === 'voting' && actualTotalVotes < expectedTotalVotes && "Oylama süresi doldu - Eksik oyları tamamlayın"}
                  {votingPhase === 'completed' && actualTotalVotes >= expectedTotalVotes && "Oylama tamamlandı - LR seçildi"}
                  {votingPhase === 'completed' && actualTotalVotes < expectedTotalVotes && "Oylama devam ediyor - Tüm üyeler oy vermeli"}
                </CardDescription>
                {votingPhase === 'nomination' && votingStartTime && (
                  <div className="mt-2">
                    <CountdownTimer 
                      targetTime={votingStartTime}
                      onComplete={() => {
                        // Force phase update
                        setForcePhaseUpdate(prev => prev + 1);
                      }}
                    />
                  </div>
                )}
                {votingPhase === 'voting' && votingEndTime && (
                  <div className="mt-2">
                    <CountdownTimer 
                      targetTime={votingEndTime} 
                      onComplete={() => {
                        // Only run once - check if we already processed this
                        if (forcePhaseUpdate === 0) {
                          setForcePhaseUpdate(1);
                          
                          // Check if all members have voted for all candidates
                          if (actualTotalVotes >= expectedTotalVotes) {
                            // All votes are in, check for tie
                            if (votingResults.length > 0) {
                              const maxScore = Math.max(...votingResults.map(r => r.total_score));
                              const topCandidates = votingResults.filter(r => r.total_score === maxScore);
                              
                              if (topCandidates.length === 1) {
                                // No tie, finalize
                                const bestCandidate = candidates.find((c: any) => c.id === topCandidates[0].candidate_id);
                                
                                if (bestCandidate) {
                                  toast({
                                    title: '🎯 Süre Doldu - Lider Seçiliyor',
                                    description: `Tüm oylar tamamlandı. ${bestCandidate.profiles?.full_name || 'Aday'} lider olarak seçiliyor.`,
                                    variant: 'default',
                                  });
                                  
                                  finalizeLRMutation.mutate({
                                    roomId: roomId,
                                    candidateId: bestCandidate.id
                                  }, {
                                    onSuccess: () => {
                                      // Force phase update after finalization
                                      setForcePhaseUpdate(prev => prev + 1);
                                    },
                                    onError: (error: any) => {
                                      // Show error message to user
                                      toast({
                                        title: 'Finalize Hatası',
                                        description: error?.data?.error || 'LR seçimi tamamlanamadı',
                                        variant: 'destructive',
                                      });
                                    }
                                  });
                                }
                              } else {
                                // Tie detected, reset votes
                                toast({
                                  title: '🔄 Eşit Puan - Oylar Sıfırlanıyor',
                                  description: `${topCandidates.length} aday eşit puan aldı. Oylar sıfırlanıyor, lütfen tekrar değerlendirin.`,
                                  variant: 'default',
                                  duration: 8000,
                                });
                                
                                resetVotesMutation.mutate({ roomId }, {
                                  onSuccess: () => {
                                    refetchVotes();
                                    refetchCandidates();
                                  }
                                });
                              }
                            }
                          } else {
                            // Not all members have voted, show warning
                            toast({
                              title: '⚠️ Oylama Süresi Doldu',
                              description: `Tüm üyeler oy vermedi (${actualTotalVotes}/${expectedTotalVotes}). LR seçimi için tüm üyelerin oy vermesi gerekiyor.`,
                              variant: 'destructive',
                              duration: 8000,
                            });
                          }
                        }
                      }}
                    />
                  </div>
                )}
              </div>
              {(votingPhase === 'no-candidates' || votingPhase === 'nomination') && !isCurrentUserCandidate && (
              <Button
                onClick={() => setShowNominateDialog(true)}
                size="sm"
                variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Aday Ol
                </Button>
              )}
              {votingPhase === 'voting' && (
                <Button
                  disabled
                  size="sm"
                  variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                  Oylama Dönemi
              </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Candidates List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Adayları Değerlendirin:</Label>
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
                <div className="space-y-3">
                  {candidates.map((candidate: any) => {
                    const isEvaluated = evaluatedCandidates.has(candidate.id);
                    const candidateResult = votingResults.find(r => r.candidate_id === candidate.id);
                    const isCurrentUser = currentUser?.user_id === candidate.user_id;
                  
                  return (
                      <Card key={candidate.id} className={`${candidate.is_selected ? "border-green-200" : ""} ${isEvaluated ? "border-blue-200 bg-blue-50" : ""}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
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
                              <div>
                            <h3 className="font-medium">{candidate.profiles?.full_name || "Bilinmeyen"}</h3>
                            <p className="text-sm text-muted-foreground">
                              {candidate.profiles?.company?.name || "Şirket bilgisi yok"}
                            </p>
                                {candidateResult && (
                                  <p className="text-sm text-blue-600 font-medium">
                                    Puan: {candidateResult.total_score.toFixed(1)}/5.0
                                  </p>
                                )}
                              </div>
                          </div>
                            <div className="flex items-center space-x-2">
                          {candidate.is_selected && (
                            <Badge variant="default">
                              <Crown className="mr-1 h-3 w-3" />
                              Seçilen
                            </Badge>
                          )}
                              {isCurrentUser ? (
                                <Badge variant="outline">
                                  <Users className="mr-1 h-3 w-3" />
                                  Adaysınız
                                </Badge>
                              ) : isCurrentUserCandidate ? (
                                <Badge variant="outline">
                                  <Users className="mr-1 h-3 w-3" />
                                  Aday Olduğunuz İçin Değerlendiremezsiniz
                                </Badge>
                              ) : isEvaluated ? (
                                <Badge variant="secondary">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Değerlendirildi
                                </Badge>
                              ) : (
                                <Button
                                  onClick={() => {
                                    handleStartVoting(candidate);
                                  }}
                                  size="sm"
                                  variant="outline"
                                  disabled={isFinalized || votingPhase !== 'voting' || isCurrentUserCandidate}
                                >
                                  <Vote className="mr-2 h-4 w-4" />
                                  Değerlendir
                                </Button>
                              )}
                            </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                  })}
                </div>
              )}
            </div>


            {isFinalized ? (
              <div className="text-center py-6 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-600" />
                <h3 className="text-lg font-semibold text-green-800 mb-2">🎉 Oylama Tamamlandı!</h3>
                <p className="text-green-700">LR seçimi başarıyla tamamlandı. Seçilen LR yukarıda görüntüleniyor.</p>
              </div>
            ) : hasTie ? (
              <div className="text-center py-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Users className="h-12 w-12 mx-auto mb-3 text-yellow-600" />
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">🔄 Tekrar Oylama Gerekli</h3>
                  <p className="text-yellow-700 mb-2">
                    En yüksek puanlı adaylar eşit ({maxScore.toFixed(1)}/5.0)! 
                  </p>
                  <p className="text-yellow-600 text-sm">
                  Lütfen adayları tekrar değerlendirin ve farklı puanlar verin.
                </p>
                <p className="text-sm text-yellow-600 mt-2">
                  Değerlendirilen: {evaluatedCandidates.size}/{candidates.length}
                </p>
              </div>
            ) : isCurrentUserCandidate ? (
              <div className="text-center py-6 bg-blue-50 border border-blue-200 rounded-lg">
                <Users className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Adaysınız</h3>
                <p className="text-blue-700">Aday olarak kendinize oy veremezsiniz. Diğer üyeler sizi değerlendirecek.</p>
              </div>
            ) : actualTotalVotes < expectedTotalVotes ? (
              <div className="text-center py-6 bg-orange-50 border border-orange-200 rounded-lg">
                <Users className="h-12 w-12 mx-auto mb-3 text-orange-600" />
                <h3 className="text-lg font-semibold text-orange-800 mb-2">⚠️ Tüm Üyeler Oy Vermedi</h3>
                <p className="text-orange-700 mb-2">
                  LR seçimi için tüm üyelerin oy vermesi gerekiyor.
                </p>
                <p className="text-orange-600 text-sm">
                  Oy veren: {actualTotalVotes}/{expectedTotalVotes} (Beklenen: {eligibleVoters} üye × {candidates.length} aday)
                </p>
                <p className="text-orange-600 text-sm mt-1">
                  Eksik: {expectedTotalVotes - actualTotalVotes} oy
                </p>
              </div>
            ) : votingPhase === 'no-candidates' ? (
              <div className="text-center py-6 bg-blue-50 border border-blue-200 rounded-lg">
                <Users className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Aday Gösterin</h3>
                <p className="text-blue-700">LR oylaması için aday göstermek isteyenler kendilerini aday gösterebilir.</p>
              </div>
            ) : votingPhase === 'nomination' ? (
              <div className="text-center py-6 bg-blue-50 border border-blue-200 rounded-lg">
                <Users className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Aday Gösterme Dönemi</h3>
                <p className="text-blue-700">Oylama henüz başlamadı. Aday göstermek isteyenler kendilerini aday gösterebilir.</p>
                {votingStartTime && (
                  <div className="mt-3">
                    <CountdownTimer targetTime={votingStartTime} />
                  </div>
                )}
              </div>
            ) : votingPhase === 'voting' && evaluatedCandidates.size === candidates.length ? (
              <div className="text-center py-6 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-600" />
                <h3 className="text-lg font-semibold text-green-800 mb-2">✅ Tüm Adayları Değerlendirdiniz</h3>
                <p className="text-green-700">Tüm adayları değerlendirdiniz. Diğer üyeler de oy verene kadar bekleyin.</p>
                <p className="text-sm text-green-600 mt-2">
                  Çoğunluk sağlandığında LR seçimi otomatik olarak yapılacak.
                </p>
              </div>
            ) : votingPhase === 'voting' ? (
              <div className="text-center py-6 bg-blue-50 border border-blue-200 rounded-lg">
                <Users className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Oylama Dönemi</h3>
                <p className="text-blue-700">Adayları tek tek değerlendirin. Yukarıdaki "Değerlendir" butonlarını kullanın.</p>
                <p className="text-sm text-blue-600 mt-2">
                  Değerlendirilen: {evaluatedCandidates.size}/{candidates.length}
                </p>
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 border border-gray-200 rounded-lg">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Oylama Tamamlandı</h3>
                <p className="text-gray-700">LR seçimi başarıyla tamamlandı.</p>
              </div>
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
                  {isFinalized && actualTotalVotes >= expectedTotalVotes
                    ? "Oylama tamamlandı - LR seçildi" 
                    : isFinalized && actualTotalVotes < expectedTotalVotes
                    ? "Oylama devam ediyor - Tüm üyeler oy vermeli"
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
              <CardTitle>Adaylık Başvurusu</CardTitle>
              <CardDescription>
                Lider Kayıtçı olmak için adaylığınızı onaylayın
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                <Label>Başvuru Detayları:</Label>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                    Lider Kayıtçı olmak için adaylığınızı onaylıyor musunuz? Bu işlem geri alınamaz.
                    </p>
                  </div>
                </div>
              <div className="flex space-x-2">
                <Button
                  onClick={handleNominateCandidate}
                  disabled={nominateCandidateMutation.isPending}
                  className="flex-1"
                >
                  {nominateCandidateMutation.isPending 
                    ? "Başvuru Gönderiliyor..." 
                    : "Adaylığımı Onayla"
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

      {/* Voting Modal */}
      {showVoteModal && currentVotingCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Aday Değerlendirme</CardTitle>
              <CardDescription>
                {currentVotingCandidate.profiles?.full_name || "Bilinmeyen"} adayını değerlendirin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Candidate Info */}
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {currentVotingCandidate.profiles?.full_name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{currentVotingCandidate.profiles?.full_name || "Bilinmeyen"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {currentVotingCandidate.profiles?.company?.name || "Şirket bilgisi yok"}
                  </p>
                </div>
              </div>

              {/* Voting Sliders */}
              <div className="space-y-4">
                {Object.entries(scoreLabels).map(([key, label]) => {
                  const candidateVotes = votes[currentVotingCandidate.id] || {
                    technical: [4],
                    experience: [4],
                    availability: [4],
                    communication: [4],
                    leadership: [4]
                  };
                  
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">{label}</Label>
                        <span className="text-sm font-medium text-blue-600">
                          {candidateVotes[key as keyof typeof candidateVotes][0]}/5
                        </span>
                      </div>
                      <Slider
                        value={candidateVotes[key as keyof typeof candidateVotes]}
                        onValueChange={(value) => handleVoteChange(currentVotingCandidate.id, key, value)}
                        max={5}
                        min={0}
                        step={0.5}
                        className="w-full"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={handleSubmitSingleVote}
                  disabled={submitVoteMutation.isPending}
                  className="flex-1"
                >
                  <Vote className="mr-2 h-4 w-4" />
                  {submitVoteMutation.isPending ? "Gönderiliyor..." : "Değerlendirmeyi Gönder"}
                </Button>
                <Button
                  onClick={() => {
                    setShowVoteModal(false);
                    setCurrentVotingCandidate(null);
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
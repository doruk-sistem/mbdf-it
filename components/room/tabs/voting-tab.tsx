"use client";

import { useState } from "react";
import { Vote, Crown, Star, Users, CheckCircle } from "lucide-react";

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

interface VotingTabProps {
  roomId: string;
}

// Mock data
const mockCandidates = [
  {
    id: "1",
    user: {
      full_name: "Fatma Kaya",
      email: "fatma@petrokim.com",
      company: { name: "Petro Kimya" }
    },
    total_score: 4.2,
    vote_count: 5,
    is_selected: true,
    scores: {
      technical: 4.5,
      experience: 4.0,
      availability: 4.2,
      communication: 4.1,
      leadership: 4.2
    }
  },
  {
    id: "2", 
    user: {
      full_name: "Mehmet Özkan",
      email: "mehmet@demir.com", 
      company: { name: "Demir A.Ş." }
    },
    total_score: 3.8,
    vote_count: 5,
    is_selected: false,
    scores: {
      technical: 4.0,
      experience: 3.5,
      availability: 4.2,
      communication: 3.8,
      leadership: 3.5
    }
  }
];

const scoreLabels = {
  technical: "Teknik Bilgi",
  experience: "Deneyim", 
  availability: "Müsaitlik",
  communication: "İletişim",
  leadership: "Liderlik"
};

export function VotingTab({ roomId }: VotingTabProps) {
  const [votes, setVotes] = useState({
    technical: [4],
    experience: [4], 
    availability: [4],
    communication: [4],
    leadership: [4]
  });
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const { toast } = useToast();

  const handleVoteChange = (criterion: string, value: number[]) => {
    setVotes(prev => ({ ...prev, [criterion]: value }));
  };

  const handleSubmitVote = () => {
    if (!selectedCandidate) {
      toast({
        title: "Aday seçin",
        description: "Oy vermek için önce bir aday seçmelisiniz.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Oy kaydedildi",
      description: "Oyunuz başarıyla kaydedildi.",
    });
  };

  const handleFinalizeSelection = () => {
    toast({
      title: "LR seçildi",
      description: "Lider Kayıtçı seçimi tamamlandı.",
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "text-green-600";
    if (score >= 4.0) return "text-blue-600";
    if (score >= 3.5) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Current LR */}
      {mockCandidates.find(c => c.is_selected) && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Crown className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-800 dark:text-green-200">Seçilen Lider Kayıtçı</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const selectedLR = mockCandidates.find(c => c.is_selected)!;
              return (
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {selectedLR.user.full_name
                        .split(" ")
                        .map(n => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-green-800 dark:text-green-200">
                      {selectedLR.user.full_name}
                    </h3>
                    <p className="text-sm text-green-600 dark:text-green-300">
                      {selectedLR.user.company.name}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">
                        {selectedLR.total_score.toFixed(1)}/5.0
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({selectedLR.vote_count} oy)
                      </span>
                    </div>
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
            <CardTitle>LR Oylaması</CardTitle>
            <CardDescription>
              Lider Kayıtçı adaylarını değerlendirin (0-5 puan)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Candidate Selection */}
            <div className="space-y-3">
              <Label>Aday Seçin:</Label>
              {mockCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedCandidate === candidate.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedCandidate(candidate.id)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {candidate.user.full_name
                          .split(" ")
                          .map(n => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{candidate.user.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {candidate.user.company.name}
                      </p>
                    </div>
                    {candidate.is_selected && (
                      <Badge variant="default" className="ml-auto">
                        <Crown className="mr-1 h-3 w-3" />
                        Seçilen
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Voting Criteria */}
            <div className="space-y-4">
              <Label>Değerlendirme Kriterleri:</Label>
              {Object.entries(scoreLabels).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{label}</Label>
                    <span className="text-sm font-medium">
                      {votes[key as keyof typeof votes][0]}/5
                    </span>
                  </div>
                  <Slider
                    value={votes[key as keyof typeof votes]}
                    onValueChange={(value) => handleVoteChange(key, value)}
                    max={5}
                    min={0}
                    step={0.5}
                    className="w-full"
                  />
                </div>
              ))}
            </div>

            <Button
              onClick={handleSubmitVote}
              className="w-full"
              disabled={!selectedCandidate}
            >
              <Vote className="mr-2 h-4 w-4" />
              Oy Ver
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sonuçlar</CardTitle>
                <CardDescription>
                  Mevcut oy durumu ve skorlar
                </CardDescription>
              </div>
              {!mockCandidates.find(c => c.is_selected) && (
                <Button onClick={handleFinalizeSelection} variant="outline" size="sm">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Seçimi Tamamla
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockCandidates
              .sort((a, b) => b.total_score - a.total_score)
              .map((candidate, index) => (
                <Card key={candidate.id} className={candidate.is_selected ? "border-green-200" : ""}>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl font-bold text-muted-foreground">
                            #{index + 1}
                          </div>
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {candidate.user.full_name
                                .split(" ")
                                .map(n => n[0])
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{candidate.user.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {candidate.user.company.name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getScoreColor(candidate.total_score)}`}>
                            {candidate.total_score.toFixed(1)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {candidate.vote_count} oy
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {Object.entries(candidate.scores).map(([key, score]) => (
                          <div key={key} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {scoreLabels[key as keyof typeof scoreLabels]}
                            </span>
                            <div className="flex items-center space-x-2">
                              <Progress value={score * 20} className="w-20 h-2" />
                              <span className={`font-medium ${getScoreColor(score)}`}>
                                {score.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
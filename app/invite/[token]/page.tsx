"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Mail, 
  Calendar, 
  User, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertCircle,
  Clock,
  Home,
  Scale
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { TONNAGE_RANGES } from "@/lib/tonnage";

interface InvitationDetails {
  id: string;
  roomId: string;
  roomName: string;
  email: string;
  message: string | null;
  inviterName: string;
  expiresAt: string;
  createdAt: string;
}

export default function InvitationPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [valid, setValid] = useState(false);
  const [tonnageRange, setTonnageRange] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetchInvitation();
    checkLoginStatus();
  }, [params.token]);

  const checkLoginStatus = async () => {
    try {
      const response = await fetch('/api/invitations/' + params.token + '/check-membership');
      const data = await response.json();
      setIsLoggedIn(!data.requiresAuth);
    } catch {
      setIsLoggedIn(false);
    }
  };

  const fetchInvitation = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/invitations/${params.token}`);
      const data = await response.json();

      if (!response.ok || !data.valid) {
        setError(data.error || 'Davet bulunamadı');
        setValid(false);
        return;
      }

      setInvitation(data.invitation);
      setValid(true);
    } catch (err) {
      setError('Davet bilgileri yüklenirken bir hata oluştu');
      setValid(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    // If not logged in, validation will happen on backend (redirect to login)
    // If logged in, validate tonnage selection
    if (isLoggedIn === true && !tonnageRange) {
      toast({
        title: "Tonaj Seçimi Gerekli",
        description: "Lütfen tonaj aralığınızı seçiniz",
        variant: "destructive"
      });
      return;
    }

    try {
      setAccepting(true);

      const response = await fetch(`/api/invitations/${params.token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tonnageRange: tonnageRange || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if user needs to log in with correct email
        if (response.status === 401) {
          toast({
            title: "Giriş Gerekli",
            description: "Lütfen giriş yapınız",
            variant: "destructive"
          });
          // Redirect to sign-in with return URL
          router.push(`/auth/sign-in?redirect=/invite/${params.token}`);
          return;
        }

        if (response.status === 403) {
          setError(data.error || 'Bu davet başka bir e-posta adresi için gönderilmiş');
          toast({
            title: "Hata",
            description: data.error || 'E-posta adresi eşleşmiyor',
            variant: "destructive"
          });
          return;
        }

        setError(data.error || 'Davet kabul edilirken bir hata oluştu');
        toast({
          title: "Hata",
          description: data.error || 'Davet kabul edilemedi',
          variant: "destructive"
        });
        return;
      }

      // Success!
      toast({
        title: "Başarılı! 🎉",
        description: data.alreadyMember 
          ? 'Bu odanın zaten bir üyesisiniz' 
          : 'Odaya başarıyla katıldınız!',
        variant: "default"
      });

      // Redirect to room page
      setTimeout(() => {
        router.push(`/mbdf/${data.roomId}`);
      }, 1500);

    } catch (err) {
      setError('Sunucu hatası');
      toast({
        title: "Hata",
        description: 'Bir şeyler yanlış gitti',
        variant: "destructive"
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-lg">Davet kontrol ediliyor...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !valid || !invitation) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <XCircle className="h-6 w-6 text-red-500" />
              <CardTitle>Geçersiz Davet</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || 'Bu davet geçersiz veya süresi dolmuş'}
              </AlertDescription>
            </Alert>

            <div className="flex justify-between items-center pt-4">
              <Button
                variant="outline"
                onClick={() => router.push('/')}
              >
                <Home className="mr-2 h-4 w-4" />
                Ana Sayfa
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expiresAt = new Date(invitation.expiresAt);
  const createdAt = new Date(invitation.createdAt);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2 mb-2">
            <Mail className="h-6 w-6 text-blue-600" />
            <CardTitle>MBDF Odası Daveti</CardTitle>
          </div>
          <CardDescription>
            Aşağıdaki odaya katılmak için davet edildiniz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Room Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 text-lg mb-2">
              {invitation.roomName}
            </h3>
            <div className="flex items-center text-sm text-blue-700">
              <User className="h-4 w-4 mr-2" />
              <span>Davet eden: <strong>{invitation.inviterName}</strong></span>
            </div>
          </div>

          {/* Invitation Message */}
          {invitation.message && (
            <div className="border-l-4 border-blue-500 bg-gray-50 p-4 rounded">
              <p className="text-sm font-medium text-gray-700 mb-1">Davet Mesajı:</p>
              <p className="text-gray-900">{invitation.message}</p>
            </div>
          )}

          {/* Invitation Details */}
          <div className="space-y-3">
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="h-4 w-4 mr-2" />
              <span>Davet edilen e-posta: <strong>{invitation.email}</strong></span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              <span>Gönderim tarihi: {createdAt.toLocaleDateString('tr-TR', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-2" />
              <span>
                Son geçerlilik: {expiresAt.toLocaleDateString('tr-TR', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
                {daysUntilExpiry > 0 && (
                  <span className="ml-2 text-orange-600 font-medium">
                    ({daysUntilExpiry} gün kaldı)
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Warning if expiring soon */}
          {daysUntilExpiry <= 2 && daysUntilExpiry > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Bu davet yakında sona erecek. Lütfen en kısa sürede kabul ediniz.
              </AlertDescription>
            </Alert>
          )}

          {/* Login Warning - if not logged in */}
          {isLoggedIn === false && (
            <Alert className="bg-amber-50 border-amber-300">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>⚠️ Oturum Açmanız Gerekiyor</strong>
                <p className="mt-2">
                  Daveti kabul etmek için önce giriş yapmalısınız. 
                  Aşağıdaki butona tıklayarak giriş sayfasına yönlendirileceksiniz.
                </p>
                <p className="mt-2 text-sm">
                  <strong>Kayıtlı değilseniz:</strong> Giriş sayfasından kayıt olabilirsiniz.
                </p>
                <p className="mt-2 text-sm font-medium">
                  Giriş yaptıktan sonra tonaj bilginizi girip daveti kabul edebileceksiniz.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Tonnage Selection - ONLY if logged in */}
          {isLoggedIn === true && (
            <>
              <Alert className="bg-green-50 border-green-300">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>✅ Oturum Açık</strong>
                  <p className="mt-1">
                    Tonaj bilginizi seçip daveti kabul edebilirsiniz.
                  </p>
                </AlertDescription>
              </Alert>

              <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Scale className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">Tonaj Bilgisi (Zorunlu)</h4>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Bu oda için yıllık tahmini tonaj aralığınızı seçiniz:
                </p>
                <div className="space-y-2">
                  <Label htmlFor="tonnage" className="text-sm font-medium">
                    Tonnage Aralığı <span className="text-red-500">*</span>
                  </Label>
                  <Select value={tonnageRange} onValueChange={setTonnageRange}>
                    <SelectTrigger id="tonnage" className="bg-white">
                      <SelectValue placeholder="Tonaj aralığı seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {TONNAGE_RANGES.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Info about MBDF */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <h4 className="font-semibold text-gray-900 mb-2">MBDF Odası Nedir?</h4>
            <p className="text-sm text-gray-600">
              MBDF odaları, KKDİK MBDF süreçlerinizi yönetmek, doküman paylaşmak, 
              oylamalar yapmak ve sözleşmeler imzalamak için kullanılan dijital çalışma 
              alanlarıdır.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleAcceptInvitation}
              disabled={accepting || (isLoggedIn === true && !tonnageRange)}
              className="flex-1"
              size="lg"
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  İşleniyor...
                </>
              ) : isLoggedIn === false ? (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Giriş Yap ve Daveti Kabul Et
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Daveti Kabul Et ve Odaya Katıl
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              disabled={accepting}
              size="lg"
            >
              İptal
            </Button>
          </div>

          {/* Help Text */}
          <div className="space-y-1 pt-2">
            <p className="text-xs text-center text-gray-500">
              Bu daveti kabul ederek odaya üye olacak ve oda içeriğine erişim kazanacaksınız.
            </p>
            {isLoggedIn === true && !tonnageRange && (
              <p className="text-xs text-center text-red-500 font-medium">
                ⚠️ Devam etmek için tonaj aralığınızı seçmelisiniz
              </p>
            )}
            {isLoggedIn === false && (
              <p className="text-xs text-center text-amber-600 font-medium">
                ℹ️ Butona tıklayarak önce giriş yapın, sonra tonaj seçip daveti kabul edin
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


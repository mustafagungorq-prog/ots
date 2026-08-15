import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  UserCheck,
  UserX,
  Users,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  GraduationCap,
} from "lucide-react";
import { useStudentData } from "@/hooks/useStudentData";
import { apiGet, apiPost, apiDelete } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";

interface PendingUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  schoolId: number | null;
  active: boolean;
  approved?: boolean;
  createdAt: string;
}

export function PendingApprovalsPage() {
  const navigate = useNavigate();
  const { students, loadStudents } = useStudentData();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
    fetchPending();
  }, [loadStudents]);

  const fetchPending = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<PendingUser[]>("users?pending=1");
      setPendingUsers(data);
    } catch (err: any) {
      setError(err?.message || "Bekleyen kullanıcılar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const matchedStudents = (user: PendingUser) => {
    if (!user.phone && !user.email) return [];
    return students.filter((s) => {
      if (s.archived) return false;
      const phoneMatch = user.phone && s.parentPhone === user.phone;
      const emailMatch = user.email && s.email === user.email;
      return phoneMatch || emailMatch;
    });
  };

  const handleApprove = async (id: number) => {
    setActionId(id);
    setError(null);
    setMessage(null);
    try {
      await apiPost(`users/${id}/approve`, {});
      setMessage("Kullanıcı onaylandı.");
      await fetchPending();
    } catch (err: any) {
      setError(err?.message || "Onaylama başarısız oldu.");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!window.confirm("Bu kullanıcıyı reddetmek istediğinize emin misiniz?")) return;
    setActionId(id);
    setError(null);
    setMessage(null);
    try {
      await apiDelete(`users/${id}`);
      setMessage("Kullanıcı reddedildi.");
      await fetchPending();
    } catch (err: any) {
      setError(err?.message || "Reddetme başarısız oldu.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <UserCheck className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">Üyelik Bekleyenler</h1>
      </div>

      {message && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Bilgi</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Hata</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Onay Bekleyen Veliler
          </CardTitle>
          <CardDescription>
            Sadece superadmin görebilir. Onaylanan kullanıcılar sisteme giriş
            yapabilir. Telefonu/e-postası öğrenci kaydıyla eşleşen velilere
            otomatik öğrenci atanır.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8">
              <Spinner className="h-4 w-4" />
              Yükleniyor...
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Onay bekleyen kullanıcı bulunmamaktadır.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead>Kullanıcı Adı</TableHead>
                    <TableHead>İletişim</TableHead>
                    <TableHead>Eşleşen Öğrenci(ler)</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((user) => {
                    const matches = matchedStudents(user);
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.fullName}
                        </TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            {user.phone && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {user.phone}
                              </div>
                            )}
                            {user.email && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {matches.length > 0 ? (
                            <div className="space-y-1">
                              {matches.map((s) => (
                                <Badge
                                  key={s.id}
                                  variant="secondary"
                                  className="mr-1 cursor-pointer"
                                  onClick={() => navigate(`/student-profile/${s.id}`)}
                                >
                                  <GraduationCap className="mr-1 h-3 w-3" />
                                  {s.firstName} {s.lastName}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Eşleşme yok
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(user.id)}
                              disabled={actionId === user.id}
                            >
                              {actionId === user.id ? (
                                <Spinner className="mr-1 h-3 w-3" />
                              ) : (
                                <UserCheck className="mr-1 h-3 w-3" />
                              )}
                              Onayla
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(user.id)}
                              disabled={actionId === user.id}
                            >
                              <UserX className="mr-1 h-3 w-3" />
                              Reddet
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

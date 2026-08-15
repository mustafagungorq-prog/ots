import { useEffect, useMemo, useState } from "react";
import {
  Mail,
  Send,
  AlertCircle,
  CheckCircle,
  XCircle,
  Users,
  Eye,
  FileText,
  GraduationCap,
  CalendarDays,
  MessageSquare,
  BookOpen,
  BookMarked,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import { useStudentData } from "@/hooks/useStudentData";
import { useAuth } from "@/hooks/useAuth";
import { apiPost } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Spinner } from "@/components/ui/spinner";

interface BulkMailResult {
  total: number;
  sent: number;
  skipped: number;
  failed: number;
  results: {
    studentId: number;
    name: string;
    status: "sent" | "skipped" | "failed";
    email?: string;
    reason?: string;
  }[];
}

const SECTIONS = [
  { icon: GraduationCap, label: "Öğrenci bilgileri (okul, sınıf, dersler)" },
  { icon: TrendingUp, label: "Öğrenim durumu (Kuran, Risale, Elifba)" },
  { icon: CalendarDays, label: "Yoklama özeti (geldi / mazeretli / geç / gelmedi)" },
  { icon: MessageSquare, label: "Öğretmen yorumları" },
  { icon: BookOpen, label: "Ödevler (başlık, içerik, tamamlanma)" },
  { icon: BookMarked, label: "Ezber durumu ve öğretmen notları" },
  { icon: ClipboardList, label: "İşlenen dersler (tarih, kategori, konu, not)" },
  { icon: FileText, label: "Son kaydeden rapor bilgileri (varsa)" },
];

export function BulkReportMailPage() {
  const { currentUser } = useAuth();
  const {
    students,
    classRooms,
    loadStudents,
    loadClassRooms,
    loadingStudents,
    loadingClassRooms,
  } = useStudentData();

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BulkMailResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClassRooms();
    loadStudents();
  }, [loadClassRooms, loadStudents]);

  const filteredClassRooms = useMemo(() => {
    if (!currentUser) return classRooms;
    if (currentUser.role === "superadmin") return classRooms;
    return classRooms.filter((r) => r.schoolId === currentUser.schoolId);
  }, [classRooms, currentUser]);

  const groupStudents = useMemo(() => {
    if (!selectedGroupId) return [];
    const groupId = Number(selectedGroupId);
    return students.filter(
      (s) => s.groupId === groupId && !s.archived
    );
  }, [students, selectedGroupId]);

  const selectedGroup = useMemo(
    () => filteredClassRooms.find((r) => String(r.id) === selectedGroupId),
    [filteredClassRooms, selectedGroupId]
  );

  const withEmail = groupStudents.filter((s) => s.email?.trim());
  const withoutEmail = groupStudents.filter((s) => !s.email?.trim());

  const handleSend = async () => {
    if (!selectedGroupId) return;
    const ok = window.confirm(
      `${selectedGroup?.grade} ${selectedGroup?.name} grubundaki ${withEmail.length} öğrenciye rapor e-postası gönderilecek. Devam etmek istiyor musunuz?`
    );
    if (!ok) return;

    setSending(true);
    setResult(null);
    setError(null);
    try {
      const data = await apiPost<BulkMailResult>("student-reports/bulk-mail", {
        groupId: Number(selectedGroupId),
      });
      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Gönderim sırasında bir hata oluştu.");
    } finally {
      setSending(false);
    }
  };

  const loading = loadingStudents || loadingClassRooms;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Mail className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">Toplu Rapor E-Postası</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grup Seçimi</CardTitle>
          <CardDescription>
            Rapor e-postası gönderilecek grubu seçin. Sadece e-posta adresi
            tanımlı öğrencilere gönderim yapılır.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Spinner className="h-4 w-4" />
              Yükleniyor...
            </div>
          ) : (
            <div className="grid gap-2 md:max-w-md">
              <Label htmlFor="group-select">Sınıf / Grup</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger id="group-select">
                  <SelectValue placeholder="Grup seçin" />
                </SelectTrigger>
                <SelectContent>
                  {filteredClassRooms.map((room) => (
                    <SelectItem key={room.id} value={String(room.id)}>
                      {room.grade} {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedGroupId && !loading && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">
                  <Users className="mr-1 h-3 w-3" />
                  Toplam: {groupStudents.length}
                </Badge>
                <Badge variant="default">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  E-posta var: {withEmail.length}
                </Badge>
                <Badge variant="destructive">
                  <XCircle className="mr-1 h-3 w-3" />
                  E-posta yok: {withoutEmail.length}
                </Badge>
              </div>

              {withoutEmail.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>E-posta adresi eksik</AlertTitle>
                  <AlertDescription>
                    Aşağıdaki {withoutEmail.length} öğrenciye e-posta
                    gönderilemeyecek. Öğrenci profilinden e-posta adresi
                    ekleyebilirsiniz.
                  </AlertDescription>
                </Alert>
              )}

              {groupStudents.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Öğrenci</TableHead>
                        <TableHead>E-posta</TableHead>
                        <TableHead className="w-32 text-center">Durum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupStudents.map((student) => {
                        const hasEmail = !!student.email?.trim();
                        return (
                          <TableRow key={student.id}>
                            <TableCell>
                              {student.firstName} {student.lastName}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {student.email || "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              {hasEmail ? (
                                <Badge variant="outline" className="text-green-600">
                                  Gönderilecek
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-destructive">
                                  Atlanacak
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="preview">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Gönderilecek Rapor İçeriği
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2 rounded-md border p-4">
                      {SECTIONS.map((section, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <section.icon className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                          {section.label}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleSend}
                  disabled={sending || withEmail.length === 0}
                >
                  {sending ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {withEmail.length} Öğrenciye Gönder
                    </>
                  )}
                </Button>
                {withEmail.length === 0 && groupStudents.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    Gönderilecek e-posta adresi bulunmuyor.
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Hata</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Gönderim Sonucu
            </CardTitle>
            <CardDescription>
              Toplam {result.total} öğrenci işlendi: {result.sent} başarılı,{" "}
              {result.skipped} atlandı, {result.failed} başarısız.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result.results.some((r) => r.status !== "sent") ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Öğrenci</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Açıklama</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.results
                      .filter((r) => r.status !== "sent")
                      .map((r) => (
                        <TableRow key={r.studentId}>
                          <TableCell>{r.name}</TableCell>
                          <TableCell>
                            {r.status === "skipped" ? (
                              <Badge variant="secondary">Atlandı</Badge>
                            ) : (
                              <Badge variant="destructive">Başarısız</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {r.reason || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Tamamlandı</AlertTitle>
                <AlertDescription>
                  Tüm e-postalar başarıyla gönderildi.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

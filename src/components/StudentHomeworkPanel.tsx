import { useState, useMemo } from "react";
import { CheckCircle2, XCircle, Plus, Trash2 } from "lucide-react";
import { useStudentData } from "@/hooks/useStudentData";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface StudentHomeworkPanelProps {
  studentId: number;
}

export function StudentHomeworkPanel({ studentId }: StudentHomeworkPanelProps) {
  const data = useStudentData();
  const { currentUser } = useAuth();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const student = useMemo(
    () => data.students.find((s) => s.id === studentId),
    [data.students, studentId],
  );

  const assignments = useMemo(
    () => data.homeworkAssignments.filter((a) => a.studentId === studentId),
    [data.homeworkAssignments, studentId],
  );

  const availableTemplates = useMemo(
    () =>
      data.homeworkTemplates.filter(
        (t) =>
          (t.active ?? true) &&
          !assignments.some((a) => String(a.templateId) === String(t.id)),
      ),
    [data.homeworkTemplates, assignments],
  );

  const handleAssign = () => {
    const template = data.homeworkTemplates.find(
      (t) => String(t.id) === selectedTemplateId,
    );
    if (!template) return;
    data.addHomeworkAssignment({
      studentId,
      templateId: template.id,
      title: template.title,
      content: template.content,
      details: template.details,
      author: currentUser?.fullName || currentUser?.username || "Öğretmen",
      completed: false,
      type: template.type || "diger",
    });
    setSelectedTemplateId("");
  };

  if (!student) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          Öğrenci bulunamadı
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Yeni Ödev Ata</CardTitle>
          <CardDescription>
            {student.firstName} {student.lastName} için ödev tanımı seçin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
            >
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder="Ödev tanımı seçin" />
              </SelectTrigger>
              <SelectContent>
                {availableTemplates.length === 0 && (
                  <SelectItem value="_empty" disabled>
                    Atanabilecek ödev tanımı yok
                  </SelectItem>
                )}
                {availableTemplates.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAssign}
              disabled={!selectedTemplateId}
              className="w-full sm:w-auto"
            >
              <Plus size={16} className="mr-1" />
              Ata
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Atanmış Ödevler</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Ödev</TableHead>
                <TableHead className="text-xs">Tip</TableHead>
                <TableHead className="text-xs">Durum</TableHead>
                <TableHead className="text-xs text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium text-sm">
                    {a.title}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className="text-[10px]">
                      {a.type === "ezber"
                        ? "Ezber"
                        : a.type === "okuma-kuran"
                          ? "Kuran Okuma"
                          : a.type === "okuma-risale"
                            ? "Risale Okuma"
                            : "Diğer"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-[10px] text-white ${a.completed ? "bg-green-500" : "bg-amber-500"}`}
                    >
                      {a.completed ? "Tamamlandı" : "Bekliyor"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant={a.completed ? "outline" : "default"}
                        onClick={() => data.toggleHomeworkCompleted(a.id)}
                      >
                        {a.completed ? (
                          <>
                            <XCircle size={13} className="mr-1" />
                            Geri Al
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={13} className="mr-1" />
                            Tamamlandı
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300"
                        onClick={() => data.deleteHomeworkAssignment(a.id)}
                      >
                        <Trash2 size={13} className="mr-1" />
                        Kaldır
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {assignments.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-gray-500"
                  >
                    Bu öğrenciye atanmış ödev yok
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

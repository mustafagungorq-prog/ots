import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStudentData } from "@/hooks/useStudentData";

interface StudentMemorizationPanelProps {
  studentId: number;
}

const STATUS_LABELS: Record<string, string> = {
  passed: "Geçti",
  failed: "Kaldı",
  repeat_tecvid: "Tekrarlamalı (Tecvid)",
  repeat_harf: "Tekrarlamalı (Harf)",
};

const STATUS_BADGES: Record<string, string> = {
  passed: "bg-green-500",
  failed: "bg-red-500",
  repeat_tecvid: "bg-amber-500",
  repeat_harf: "bg-blue-500",
};

export function StudentMemorizationPanel({
  studentId,
}: StudentMemorizationPanelProps) {
  const data = useStudentData();

  const student = useMemo(
    () => data.students.find((s) => s.id === studentId),
    [data.students, studentId],
  );

  const records = useMemo(
    () =>
      data.memorizationTracking
        .filter((r) => r.studentId === studentId)
        .map((r) => {
          const text = data.memorizationTexts.find((t) => t.id === r.textId);
          return { ...r, textTitle: text?.title || "Bilinmeyen metin" };
        })
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        ),
    [data.memorizationTracking, data.memorizationTexts, studentId],
  );

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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {student.firstName} {student.lastName} - Ezber Kayıtları
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Metin</TableHead>
              <TableHead className="text-xs">Durum</TableHead>
              <TableHead className="text-xs">Öğretmen Notu</TableHead>
              <TableHead className="text-xs">Tarih</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-sm">
                  {r.textTitle}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`text-[10px] text-white ${STATUS_BADGES[r.status] || "bg-gray-500"}`}
                  >
                    {STATUS_LABELS[r.status] || r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-gray-600 max-w-[200px] truncate">
                  {r.teacherNote || "-"}
                </TableCell>
                <TableCell className="text-xs">
                  {r.createdAt
                    ? new Date(r.createdAt).toLocaleDateString("tr-TR")
                    : "-"}
                </TableCell>
              </TableRow>
            ))}
            {records.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-8 text-gray-500"
                >
                  Ezber kaydı bulunamadı
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

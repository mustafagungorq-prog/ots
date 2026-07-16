import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  BookOpen,
  Type,
  Save,
  ListChecks,
} from "lucide-react";
import { useStudentData } from "@/hooks/useStudentData";
import { apiGet } from "@/hooks/useApi";
import type { MemorizationStatus, MemorizationMode } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_OPTIONS: MemorizationStatus[] = [
  "passed",
  "failed",
  "repeat_tecvid",
  "repeat_harf",
];

const STATUS_LABELS: Record<MemorizationStatus, string> = {
  passed: "Geçti",
  failed: "Kaldı",
  repeat_tecvid: "Tekrarlamalı (Tecvid)",
  repeat_harf: "Tekrarlamalı (Harf)",
};

const STATUS_BADGES: Record<MemorizationStatus, string> = {
  passed: "bg-green-500",
  failed: "bg-red-500",
  repeat_tecvid: "bg-amber-500",
  repeat_harf: "bg-blue-500",
};

type LocalRow = {
  status: MemorizationStatus;
  teacherNote: string;
  scores: Record<string, number>;
};

interface StudentMemorizationGridPanelProps {
  studentId: number;
}

export function StudentMemorizationGridPanel({
  studentId,
}: StudentMemorizationGridPanelProps) {
  const data = useStudentData();
  const [localStatuses, setLocalStatuses] = useState<Record<number, LocalRow>>(
    {},
  );
  const [memorizationMode, setMemorizationMode] =
    useState<MemorizationMode>("simple");

  const student = useMemo(
    () => data.students.find((s) => s.id === studentId),
    [data.students, studentId],
  );

  const activeCriteria = useMemo(
    () =>
      data.memorizationCriteria
        .filter((c) => c.active)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [data.memorizationCriteria],
  );

  useEffect(() => {
    apiGet<{ value?: string }>("system-settings/memorization_mode")
      .then((d) => {
        const mode = d.value as MemorizationMode;
        setMemorizationMode(
          ["simple", "scoring", "detailed"].includes(mode) ? mode : "simple",
        );
      })
      .catch(() => setMemorizationMode("simple"));
  }, []);

  useEffect(() => {
    const map: Record<number, LocalRow> = {};
    data.memorizationTracking
      .filter((r) => r.studentId === studentId)
      .forEach((r) => {
        map[r.textId] = {
          status: r.status,
          teacherNote: r.teacherNote || "",
          scores: r.scores || {},
        };
      });
    data.memorizationTexts.forEach((t) => {
      if (!map[t.id]) {
        map[t.id] = {
          status: "failed",
          teacherNote: "",
          scores: {},
        };
      }
    });
    setLocalStatuses(map);
  }, [studentId, data.memorizationTracking, data.memorizationTexts]);

  const computeStatusFromScores = (
    scores: Record<string, number>,
  ): MemorizationStatus => {
    if (activeCriteria.length === 0) return "failed";
    let weightedSum = 0;
    let totalWeight = 0;
    activeCriteria.forEach((c) => {
      const score = scores[c.code] ?? 0;
      weightedSum += score * c.weight;
      totalWeight += c.weight;
    });
    if (totalWeight === 0) return "failed";
    const avg = weightedSum / totalWeight;
    if (avg >= 70) return "passed";
    if (avg >= 50) return "repeat_tecvid";
    return "failed";
  };

  const updateStatus = (textId: number, status: MemorizationStatus) => {
    setLocalStatuses((prev) => ({
      ...prev,
      [textId]: { ...(prev[textId] || { teacherNote: "", scores: {} }), status },
    }));
  };

  const updateNote = (textId: number, teacherNote: string) => {
    setLocalStatuses((prev) => ({
      ...prev,
      [textId]: {
        ...(prev[textId] || { status: "failed" as MemorizationStatus, scores: {} }),
        teacherNote,
      },
    }));
  };

  const updateScore = (textId: number, code: string, value: number) => {
    setLocalStatuses((prev) => {
      const row = prev[textId] || {
        status: "failed" as MemorizationStatus,
        teacherNote: "",
        scores: {},
      };
      const nextScores = { ...row.scores, [code]: value };
      const nextStatus =
        memorizationMode === "simple"
          ? row.status
          : computeStatusFromScores(nextScores);
      return {
        ...prev,
        [textId]: { ...row, scores: nextScores, status: nextStatus },
      };
    });
  };

  const saveText = (textId: number) => {
    const row = localStatuses[textId];
    if (!row) return;
    data.setMemorizationStatus(
      studentId,
      textId,
      row.status,
      row.teacherNote,
      memorizationMode === "simple" ? undefined : row.scores,
    );
  };

  const saveAll = () => {
    data.memorizationTexts.forEach((text) => {
      const row = localStatuses[text.id];
      if (row) {
        data.setMemorizationStatus(
          studentId,
          text.id,
          row.status,
          row.teacherNote,
          memorizationMode === "simple" ? undefined : row.scores,
        );
      }
    });
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">
            {student.firstName} {student.lastName} - Ezber Takip
          </h3>
          <p className="text-xs text-gray-500">
            Tüm ezber metinlerini görüntüleyip durumlarını güncelleyebilirsiniz.
          </p>
        </div>
        <Button onClick={saveAll}>
          <Save size={16} className="mr-1" />
          Tümünü Kaydet
        </Button>
      </div>

      {data.memorizationTexts.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <ListChecks size={40} className="mx-auto mb-3 opacity-50" />
            Henüz ezber metni tanımlanmamış.
          </CardContent>
        </Card>
      )}

      {data.memorizationTexts.length > 0 && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Metin</TableHead>
                  <TableHead className="text-xs">Durum</TableHead>
                  {memorizationMode !== "simple" && (
                    <TableHead className="text-xs">Kriterler</TableHead>
                  )}
                  <TableHead className="text-xs">Not</TableHead>
                  <TableHead className="text-xs text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.memorizationTexts.map((text) => {
                  const row = localStatuses[text.id] || {
                    status: "failed" as MemorizationStatus,
                    teacherNote: "",
                    scores: {},
                  };
                  return (
                    <TableRow key={text.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{text.title}</p>
                        <p className="text-xs text-gray-600 whitespace-pre-wrap">
                          {text.content}
                        </p>
                      </TableCell>
                      <TableCell>
                        {memorizationMode === "simple" ? (
                          <div className="flex flex-wrap gap-1">
                            {STATUS_OPTIONS.map((s) => (
                              <Button
                                key={s}
                                type="button"
                                size="sm"
                                variant={row.status === s ? "default" : "outline"}
                                className={
                                  row.status === s
                                    ? `${STATUS_BADGES[s]} text-white`
                                    : ""
                                }
                                onClick={() => updateStatus(text.id, s)}
                              >
                                {s === "passed" && (
                                  <CheckCircle2 size={13} className="mr-1" />
                                )}
                                {s === "failed" && (
                                  <XCircle size={13} className="mr-1" />
                                )}
                                {s === "repeat_tecvid" && (
                                  <BookOpen size={13} className="mr-1" />
                                )}
                                {s === "repeat_harf" && (
                                  <Type size={13} className="mr-1" />
                                )}
                                {STATUS_LABELS[s]}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <Badge
                            className={`text-[10px] text-white ${STATUS_BADGES[row.status]}`}
                          >
                            {STATUS_LABELS[row.status]}
                          </Badge>
                        )}
                      </TableCell>
                      {memorizationMode !== "simple" && (
                        <TableCell>
                          <div className="flex flex-wrap gap-2 items-center">
                            {activeCriteria.map((c) => (
                              <div
                                key={c.code}
                                className="flex items-center gap-1"
                              >
                                <Label className="text-[10px] whitespace-nowrap">
                                  {c.label}
                                </Label>
                                <Input
                                  type="number"
                                  min={0}
                                  max={c.maxScore}
                                  value={row.scores[c.code] ?? ""}
                                  onChange={(e) =>
                                    updateScore(
                                      text.id,
                                      c.code,
                                      Number(e.target.value),
                                    )
                                  }
                                  className="w-16 h-7 text-xs px-1"
                                />
                              </div>
                            ))}
                            {activeCriteria.length === 0 && (
                              <span className="text-xs text-gray-400">
                                Kriter tanımlanmamış
                              </span>
                            )}
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <Input
                          value={row.teacherNote}
                          onChange={(e) =>
                            updateNote(text.id, e.target.value)
                          }
                          placeholder="Not"
                          className="min-w-[140px]"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => saveText(text.id)}>
                          <Save size={14} className="mr-1" />
                          Kaydet
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

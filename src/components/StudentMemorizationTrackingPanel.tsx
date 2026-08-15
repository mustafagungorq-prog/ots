import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ListChecks,
  XCircle,
  BookOpen,
  Type,
  Save,
} from "lucide-react";
import { useStudentData } from "@/hooks/useStudentData";
import { apiGet } from "@/hooks/useApi";
import type { MemorizationStatus, MemorizationMode } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const STATUS_OPTIONS: MemorizationStatus[] = [
  "passed",
  "failed",
  "repeat_tecvid",
  "repeat_harf",
  "not_appointment",
  "home_work",
];

const STATUS_LABELS: Record<MemorizationStatus, string> = {
  passed: "Geçti",
  failed: "Kaldı",
  repeat_tecvid: "Tekrarlamalı (Tecvid)",
  repeat_harf: "Tekrarlamalı (Harf)",
  not_appointment: "Atanmadı",
  home_work: "Ev Ödevi",
};

const STATUS_BADGES: Record<MemorizationStatus, string> = {
  passed: "bg-green-500",
  failed: "bg-red-500",
  repeat_tecvid: "bg-amber-500",
  repeat_harf: "bg-blue-500",
  not_appointment: "bg-gray-500",
  home_work: "bg-purple-500",
};

interface StudentMemorizationTrackingPanelProps {
  studentId: number;
}

export function StudentMemorizationTrackingPanel({
  studentId,
}: StudentMemorizationTrackingPanelProps) {
  const data = useStudentData();

  const [selectedTextId, setSelectedTextId] = useState<string>("");
  const [status, setStatus] = useState<MemorizationStatus>("not_appointment");
  const [teacherNote, setTeacherNote] = useState<string>("");
  const [scores, setScores] = useState<Record<string, number>>({});
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

  const selectedText = useMemo(
    () => data.memorizationTexts.find((t) => String(t.id) === selectedTextId),
    [data.memorizationTexts, selectedTextId],
  );

  const existingRecord = useMemo(
    () =>
      data.memorizationTracking.find(
        (r) => r.studentId === studentId && r.textId === Number(selectedTextId),
      ),
    [data.memorizationTracking, studentId, selectedTextId],
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
    if (!selectedTextId) {
      setStatus("not_appointment");
      setTeacherNote("");
      setScores({});
      return;
    }
    if (existingRecord) {
      setStatus(existingRecord.status);
      setTeacherNote(existingRecord.teacherNote || "");
      setScores(existingRecord.scores || {});
    } else {
      setStatus("not_appointment");
      setTeacherNote("");
      setScores({});
    }
  }, [selectedTextId, existingRecord]);

  const computeStatusFromScores = (
    nextScores: Record<string, number>,
  ): MemorizationStatus => {
    if (activeCriteria.length === 0) return "failed";
    let weightedSum = 0;
    let totalWeight = 0;
    activeCriteria.forEach((c) => {
      const score = nextScores[c.code] ?? 0;
      weightedSum += score * c.weight;
      totalWeight += c.weight;
    });
    if (totalWeight === 0) return "failed";
    const avg = weightedSum / totalWeight;
    if (avg >= 70) return "passed";
    if (avg >= 50) return "repeat_tecvid";
    return "failed";
  };

  const updateScore = (code: string, value: number) => {
    setScores((prev) => {
      const next = { ...prev, [code]: value };
      if (memorizationMode !== "simple") {
        setStatus(computeStatusFromScores(next));
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!selectedTextId) return;
    data.setMemorizationStatus(
      studentId,
      Number(selectedTextId),
      status,
      teacherNote,
      memorizationMode === "simple" ? undefined : scores,
    );
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
        <CardHeader>
          <CardTitle className="text-base">Ezber Metni Seçimi</CardTitle>
          <CardDescription>
            {student.firstName} {student.lastName} için ezber metni seçin ve
            durumu kaydedin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Ezber Metni</Label>
            <Select value={selectedTextId} onValueChange={setSelectedTextId}>
              <SelectTrigger>
                <SelectValue placeholder="Metin seçin" />
              </SelectTrigger>
              <SelectContent>
                {data.memorizationTexts.map((text) => (
                  <SelectItem key={text.id} value={String(text.id)}>
                    {text.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedText && (
            <div className="rounded-md border bg-gray-50 p-3 text-sm text-gray-700">
              <p className="font-medium">{selectedText.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-xs text-gray-600">
                {selectedText.content}
              </p>
            </div>
          )}

          {!selectedTextId && (
            <div className="rounded-md border border-dashed p-8 text-center text-gray-500">
              <ListChecks size={40} className="mx-auto mb-3 opacity-50" />
              Ezber takibi yapmak için bir metin seçin.
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTextId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Durum Güncelle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {memorizationMode === "simple" ? (
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant={status === s ? "default" : "outline"}
                    className={
                      status === s ? `${STATUS_BADGES[s]} text-white` : ""
                    }
                    onClick={() => setStatus(s)}
                  >
                    {s === "passed" && <CheckCircle2 size={13} className="mr-1" />}
                    {s === "failed" && <XCircle size={13} className="mr-1" />}
                    {s === "repeat_tecvid" && <BookOpen size={13} className="mr-1" />}
                    {s === "repeat_harf" && <Type size={13} className="mr-1" />}
                    {STATUS_LABELS[s]}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3 items-center">
                  {activeCriteria.map((c) => (
                    <div key={c.code} className="flex items-center gap-1">
                      <Label className="text-[10px] whitespace-nowrap">
                        {c.label}
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={c.maxScore}
                        value={scores[c.code] ?? ""}
                        onChange={(e) =>
                          updateScore(c.code, Number(e.target.value))
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
                <Badge
                  className={`text-[10px] text-white ${STATUS_BADGES[status]}`}
                >
                  {STATUS_LABELS[status]}
                </Badge>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Öğretmen Notu</Label>
              {memorizationMode === "detailed" ? (
                <Textarea
                  value={teacherNote}
                  onChange={(e) => setTeacherNote(e.target.value)}
                  placeholder="Ayrıntılı not"
                  rows={2}
                />
              ) : (
                <Input
                  value={teacherNote}
                  onChange={(e) => setTeacherNote(e.target.value)}
                  placeholder="Not"
                />
              )}
            </div>

            <Button onClick={handleSave}>
              <Save size={16} className="mr-1" />
              Kaydet
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

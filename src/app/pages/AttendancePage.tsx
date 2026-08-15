// @ts-nocheck
import { useState, useMemo, useEffect } from "react";
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStudentData } from "@/hooks/useStudentData";
import { useAuth } from "@/hooks/useAuth";
import type { Attendance } from "@/types";

const DAYS = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];

const STATUS_CONFIG: Record<
  Attendance["status"],
  { label: string; color: string }
> = {
  present: { label: "Mevcut", color: "bg-green-500" },
  absent: { label: "Yok", color: "bg-red-500" },
  late: { label: "Geç", color: "bg-yellow-500" },
  excused: { label: "İzinli", color: "bg-blue-500" },
};

function getDateForDay(dayName: string, reference = new Date()) {
  const dayIndex = DAYS.indexOf(dayName);
  if (dayIndex === -1) return null;
  const d = new Date(reference);
  const currentDay = d.getDay(); // 0=Sunday
  const currentIndex = currentDay === 0 ? 6 : currentDay - 1; // Monday=0
  const diff = dayIndex - currentIndex;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export function AttendancePage() {
  const data = useStudentData();
  const { currentUser } = useAuth();

  const isRestrictedTeacher =
    currentUser?.role === "teacher" ||
    currentUser?.role === "authorized_teacher";

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [classRoom, setClassRoom] = useState("");
  const [day, setDay] = useState("");
  const [note, setNote] = useState("");
  const [localAttendance, setLocalAttendance] = useState<
    Record<number, Attendance["status"]>
  >({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    data.loadStudents();
    data.loadClassRooms();
    data.loadAttendance();
  }, []);

  useEffect(() => {
    if (day) {
      const d = getDateForDay(day);
      if (d) setDate(d);
    }
  }, [day]);

  const availableClassRooms = useMemo(() => {
    if (!isRestrictedTeacher || !currentUser) return data.classRooms;
    return data.classRooms.filter((r) =>
      r.teacherIds.includes(currentUser.id),
    );
  }, [data.classRooms, isRestrictedTeacher, currentUser]);

  const selectedClassRoomId = classRoom ? Number(classRoom) : null;
  const selectedClassRoom = data.classRooms.find(
    (r) => r.id === selectedClassRoomId,
  );

  const studentsToShow = useMemo(() => {
    if (!selectedClassRoomId) return [];
    return data.students.filter((s) => s.groupId === selectedClassRoomId);
  }, [data.students, selectedClassRoomId]);

  useEffect(() => {
    if (selectedClassRoomId && date) {
      const prev: Record<number, Attendance["status"]> = {};
      data.attendance
        .filter((a) => a.studentId && a.date === date)
        .forEach((a) => {
          prev[a.studentId] = a.status;
        });
      setLocalAttendance(prev);
      setSaved(false);
    }
  }, [selectedClassRoomId, date, data.attendance]);

  const toggleStatus = (sid: number, s: Attendance["status"]) => {
    setLocalAttendance((prev) => ({
      ...prev,
      [sid]: prev[sid] === s ? undefined : s,
    }));
    setSaved(false);
  };

  const handleSaveAll = () => {
    if (!selectedClassRoomId || !date) return;
    const marked = Object.entries(localAttendance).filter(
      ([, status]) => status,
    );
    if (marked.length === 0) {
      alert("Hiçbir öğrenci işaretlenmemiş");
      return;
    }
    if (
      !confirm(
        `${marked.length} öğrencinin yoklaması kaydedilecek. Emin misiniz?`,
      )
    )
      return;

    studentsToShow.forEach((s) => {
      const st = localAttendance[s.id];
      if (!st) return;
      const ex = data.attendance.find(
        (a) => a.studentId === s.id && a.date === date,
      );
      if (ex) {
        data.updateAttendanceStatus(ex.id, st);
      } else {
        data.addAttendance({
          studentId: s.id,
          classRoomId: selectedClassRoomId,
          date,
          status: st,
          note: note || undefined,
        });
      }
    });
    setSaved(true);
  };

  const getDisplayStatus = (sid: number) => localAttendance[sid] || null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Yoklama</h2>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1 w-full sm:w-56">
              <Label className="text-xs">Sınıf</Label>
              <Select value={classRoom} onValueChange={setClassRoom}>
                <SelectTrigger>
                  <SelectValue placeholder="Sınıf seçin" />
                </SelectTrigger>
                <SelectContent>
                  {availableClassRooms.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 w-full sm:w-40">
              <Label className="text-xs">Gün</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger>
                  <SelectValue placeholder="Gün seçin" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tarih</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs">Not</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Genel not..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isRestrictedTeacher && availableClassRooms.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            Size atanmış sınıf bulunmuyor. Yönetici ile iletişime geçin.
          </p>
        </div>
      )}

      {selectedClassRoomId && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {selectedClassRoom?.name} — {date}
                  </CardTitle>
                  <CardDescription>
                    {studentsToShow.length} öğrenci
                  </CardDescription>
                </div>
                {saved && (
                  <Badge
                    variant="outline"
                    className="text-green-600 border-green-300"
                  >
                    <CheckCircle2 size={14} className="mr-1" /> Kaydedildi
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Öğrenci</TableHead>
                    <TableHead className="text-xs">Durum</TableHead>
                    <TableHead className="text-xs">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsToShow.map((s) => {
                    const st = getDisplayStatus(s.id);
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium text-sm">
                          {s.firstName} {s.lastName}
                        </TableCell>
                        <TableCell>
                          {st ? (
                            <Badge
                              className={`${STATUS_CONFIG[st].color} text-xs`}
                            >
                              {STATUS_CONFIG[st].label}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              İşaretlenmedi
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {(
                              [
                                "present",
                                "absent",
                                "late",
                                "excused",
                              ] as const
                            ).map((s2) => (
                              <Button
                                key={s2}
                                size="sm"
                                variant={st === s2 ? "default" : "outline"}
                                className={`text-xs ${st === s2 ? STATUS_CONFIG[s2].color : ""}`}
                                onClick={() => toggleStatus(s.id, s2)}
                              >
                                {STATUS_CONFIG[s2].label}
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Button onClick={handleSaveAll} className="w-full" size="lg">
            <Save size={18} className="mr-2" /> Yoklamayı Kaydet
          </Button>
        </>
      )}

      {!selectedClassRoomId && (
        <div className="text-center py-12 text-gray-500">
          <ClipboardCheck size={48} className="mx-auto mb-4 opacity-50" />
          <p>Sınıf seçin</p>
        </div>
      )}
    </div>
  );
}

// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { useStudentData } from "@/hooks/useStudentData";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Check, ChevronsUpDown } from "lucide-react";
import { Loading } from "@/components/Loading";
import { cn } from "@/lib/utils";

export function ParentStudentLinksPage() {
  const data = useStudentData();
  const { users, refreshUsers, usersLoaded } = useAuth();
  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [parentOpen, setParentOpen] = useState(false);
  const [studentOpen, setStudentOpen] = useState(false);

  useEffect(() => {
    data.loadStudents();
    refreshUsers();
    data.loadParentStudentLinks();
  }, []);

  const parents = useMemo(
    () => users.filter((u) => u.role === "parent"),
    [users],
  );
  const students = data.students;

  const linksWithNames = useMemo(() => {
    return data.parentStudentLinks.map((l) => {
      const parent = users.find((u) => u.id === l.parentUserId);
      const student = data.students.find((s) => s.id === l.studentId);
      return {
        parentUserId: l.parentUserId,
        studentId: l.studentId,
        parentName: parent
          ? `${parent.fullName} (${parent.username})`
          : `Veli #${l.parentUserId}`,
        studentName: student
          ? `${student.firstName} ${student.lastName}`
          : `Öğrenci #${l.studentId}`,
      };
    });
  }, [data.parentStudentLinks, users, data.students]);

  const linkedStudentIds = useMemo(
    () => new Set(data.parentStudentLinks.map((l) => l.studentId)),
    [data.parentStudentLinks],
  );

  const handleAdd = () => {
    if (!selectedParentId || !selectedStudentId) return;
    const studentId = Number(selectedStudentId);
    if (linkedStudentIds.has(studentId)) {
      alert("Bu öğrencinin zaten bir velisi var.");
      return;
    }
    data.addParentStudentLink(Number(selectedParentId), studentId);
    setSelectedParentId("");
    setSelectedStudentId("");
  };

  const handleDelete = (parentUserId: number, studentId: number) => {
    if (confirm("Eşleştirmeyi kaldırmak istediğinize emin misiniz?")) {
      data.deleteParentStudentLink(parentUserId, studentId);
    }
  };

  if (data.loadingStudents || data.loadingParentStudentLinks || !usersLoaded) {
    return <Loading />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
        Veli - Öğrenci Eşleştirme
      </h2>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Yeni Eşleştirme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1 w-full sm:w-64">
              <Label className="text-xs">Veli</Label>
              <Popover open={parentOpen} onOpenChange={setParentOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={parentOpen}
                    className="w-full justify-between"
                  >
                    {selectedParentId
                      ? parents.find((p) => String(p.id) === selectedParentId)
                          ?.fullName
                      : "Veli seçin"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full sm:w-64 p-0">
                  <Command>
                    <CommandInput placeholder="Veli ara..." />
                    <CommandList>
                      <CommandEmpty>Veli bulunamadı</CommandEmpty>
                      <CommandGroup>
                        {parents.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.fullName} ${p.username} ${p.phone}`}
                            onSelect={() => {
                              setSelectedParentId(String(p.id));
                              setParentOpen(false);
                            }}
                          >
                            <Check
                              size={14}
                              className={cn(
                                "mr-2 shrink-0",
                                selectedParentId === String(p.id)
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {p.fullName} ({p.username})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1 w-full sm:w-64">
              <Label className="text-xs">Öğrenci</Label>
              <Popover open={studentOpen} onOpenChange={setStudentOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={studentOpen}
                    className="w-full justify-between"
                  >
                    {selectedStudentId
                      ? (() => {
                          const s = students.find(
                            (x) => String(x.id) === selectedStudentId,
                          );
                          return s ? `${s.firstName} ${s.lastName}` : "";
                        })()
                      : "Öğrenci seçin"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full sm:w-64 p-0">
                  <Command>
                    <CommandInput placeholder="Öğrenci ara..." />
                    <CommandList>
                      <CommandEmpty>Öğrenci bulunamadı</CommandEmpty>
                      <CommandGroup>
                        {students.map((s) => {
                          const alreadyLinked = linkedStudentIds.has(s.id);
                          return (
                            <CommandItem
                              key={s.id}
                              value={`${s.firstName} ${s.lastName} ${s.grade}`}
                              disabled={alreadyLinked}
                              onSelect={() => {
                                if (alreadyLinked) return;
                                setSelectedStudentId(String(s.id));
                                setStudentOpen(false);
                              }}
                              className={cn(
                                alreadyLinked && "opacity-50 cursor-not-allowed",
                              )}
                            >
                              <Check
                                size={14}
                                className={cn(
                                  "mr-2 shrink-0",
                                  selectedStudentId === String(s.id)
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {s.firstName} {s.lastName}
                              {alreadyLinked && " (zaten velisi var)"}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <Button
              onClick={handleAdd}
              disabled={!selectedParentId || !selectedStudentId}
            >
              Ekle
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Veli</TableHead>
                <TableHead className="text-xs">Öğrenci</TableHead>
                <TableHead className="text-xs">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linksWithNames.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-sm text-gray-500"
                  >
                    Henüz eşleştirme yok.
                  </TableCell>
                </TableRow>
              )}
              {linksWithNames.map((l) => (
                <TableRow key={`${l.parentUserId}-${l.studentId}`}>
                  <TableCell className="text-sm">{l.parentName}</TableCell>
                  <TableCell className="text-sm">{l.studentName}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(l.parentUserId, l.studentId)}
                    >
                      <Trash2 size={14} className="mr-1" /> Kaldır
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

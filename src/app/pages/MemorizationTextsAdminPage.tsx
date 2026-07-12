import { useEffect, useMemo, useState } from "react";
import { ListChecks, Pencil, Plus } from "lucide-react";
import { useStudentData } from "@/hooks/useStudentData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export function MemorizationTextsAdminPage() {
  const data = useStudentData();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "passive"
  >("all");

  useEffect(() => {
    data.loadMemorizationTexts();
  }, []);
  /*
  if (data.loadingMemorizationTexts) {
    return <Loading />;
  }*/

  const rows = useMemo(() => {
    let list = data.memorizationTexts;
    if (activeFilter === "active") list = list.filter((t) => t.active);
    else if (activeFilter === "passive") list = list.filter((t) => !t.active);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (text) =>
        text.title.toLowerCase().includes(q) ||
        text.content.toLowerCase().includes(q),
    );
  }, [data.memorizationTexts, query, activeFilter]);

  const toggleActive = (id: number, currentActive: boolean) => {
    data.updateMemorizationText(id, { active: !currentActive });
  };

  const openCreate = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
    setDialogOpen(true);
  };

  const openEdit = (id: number) => {
    const text = data.memorizationTexts.find((item) => item.id === id);
    if (!text) return;
    setEditingId(id);
    setTitle(text.title);
    setContent(text.content);
    setDialogOpen(true);
  };

  const save = () => {
    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    if (!cleanTitle || !cleanContent) return;

    if (editingId) {
      data.updateMemorizationText(editingId, {
        title: cleanTitle,
        content: cleanContent,
      });
    } else {
      data.addMemorizationText({
        title: cleanTitle,
        content: cleanContent,
        active: true,
      });
    }

    setDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Ezber Metin Yönetimi
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Bu ekran sadece admin erişimine açıktır.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-1" />
          Yeni Ezber Metni
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ezber Metinleri Grid</CardTitle>
          <CardDescription>
            Metin ekleyebilir ve mevcut metinleri güncelleyebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 max-w-md space-y-1">
              <Label className="text-xs">Ara</Label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Başlık veya içerik ara"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "active", "passive"] as const).map((f) => (
                <Button
                  key={f}
                  type="button"
                  size="sm"
                  variant={activeFilter === f ? "default" : "outline"}
                  onClick={() => setActiveFilter(f)}
                >
                  {f === "all" ? "Tümü" : f === "active" ? "Aktif" : "Pasif"}
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[260px]">Başlık</TableHead>
                  <TableHead>Metin</TableHead>
                  <TableHead className="w-[110px] text-center">Durum</TableHead>
                  <TableHead className="w-[130px] text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <div className="py-10 text-center text-sm text-gray-500">
                        <ListChecks
                          size={28}
                          className="mx-auto mb-2 opacity-50"
                        />
                        Kayıt bulunamadı.
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {rows.map((text) => (
                  <TableRow
                    key={text.id}
                    className={!text.active ? "opacity-50" : undefined}
                  >
                    <TableCell className="font-medium">{text.title}</TableCell>
                    <TableCell className="max-w-[580px]">
                      <div className="line-clamp-3 whitespace-pre-wrap text-sm text-gray-700">
                        {text.content}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Switch
                          checked={text.active}
                          onCheckedChange={() =>
                            toggleActive(text.id, text.active)
                          }
                          title={text.active ? "Pasife al" : "Aktife al"}
                        />
                        <Badge
                          variant="outline"
                          className={
                            text.active
                              ? "border-green-400 text-green-700 text-[10px]"
                              : "border-gray-300 text-gray-400 text-[10px]"
                          }
                        >
                          {text.active ? "Aktif" : "Pasif"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(text.id)}
                      >
                        <Pencil size={14} className="mr-1" />
                        Güncelle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Ezber Metni Güncelle" : "Yeni Ezber Metni Ekle"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Başlık</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Başlık"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Metin</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder="Ezber metni"
              />
            </div>
            <Button className="w-full" onClick={save}>
              {editingId ? "Güncelle" : "Ekle"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

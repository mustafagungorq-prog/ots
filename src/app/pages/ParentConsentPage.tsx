import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2, ShieldCheck, FileText } from "lucide-react";
import { useStudentData } from "@/hooks/useStudentData";
import { useAuth } from "@/hooks/useAuth";
import { Loading } from "@/components/Loading";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const ILLUMINATION_TEXT = `VELİ AYDINLATMA VE BİLGİLENDİRME METNİ

MektepTakip sistemi, öğrencilerin eğitim süreçlerinin takip edilmesi, devam-devamsızlık kayıtlarının tutulması, ezber ve ders gelişimlerinin izlenmesi, veli bilgilendirmelerinin yapılması ve eğitim faaliyetlerinin yürütülmesi amacıyla kullanılmaktadır.

Bu kapsamda öğrenciye ve veliye ait ad-soyad, iletişim bilgileri, devam-devamsızlık kayıtları, eğitim performansı, ezber durumu, öğretmen değerlendirmeleri ve sistem kullanım kayıtları işlenebilmektedir.

Kişisel veriler;

• Öğrenci eğitim süreçlerinin yönetilmesi,
• Veli bilgilendirmelerinin yapılması,
• Öğrenci gelişim raporlarının oluşturulması,
• Kurum içi eğitim ve idari faaliyetlerin yürütülmesi,
• Bilgi güvenliğinin sağlanması,
• Yasal yükümlülüklerin yerine getirilmesi

amaçlarıyla işlenmektedir.

Sistem üzerinde yer alan öğrenci bilgileri yalnızca ilgili öğrenci, öğrencinin velisi ve yetkilendirilmiş kurum personeli tarafından görüntülenebilmektedir. Kişisel veriler yürürlükteki mevzuat kapsamında gerekli teknik ve idari güvenlik tedbirleri alınarak korunmaktadır.

Tarafıma ait ve velisi bulunduğum öğrenciye ait bilgilerin yukarıda belirtilen amaçlarla işlenmesi konusunda bilgilendirildiğimi, bu metni okuduğumu ve anladığımı beyan ederim.`;

const KVKK_TEXT = `AÇIK RIZA BEYANI

Velisi bulunduğum öğrenciye ilişkin eğitim gelişim kayıtlarının, yoklama bilgilerinin, ezber ve ders takip verilerinin, öğretmen değerlendirmelerinin ve tarafıma ait iletişim bilgilerinin MektepTakip sistemi üzerinden saklanmasına, işlenmesine ve tarafıma sunulmasına açık rıza veriyorum.

Bu rızayı dilediğim zaman yürürlükteki mevzuat kapsamında geri çekebileceğimi biliyorum.`;

export function ParentConsentPage() {
  const data = useStudentData();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<"illumination" | "kvkk">("illumination");
  const [illuminationChecked, setIlluminationChecked] = useState(false);
  const [kvkkChecked, setKvkkChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    data.loadParentConsent();
  }, [data.loadParentConsent]);

  useEffect(() => {
    if (data.loadingParentConsent) return;
    if (
      data.parentConsent?.illuminationConsent &&
      data.parentConsent?.kvkkConsent &&
      currentUser?.linkedStudentIds?.length
    ) {
      navigate(
        `/student-profile/${currentUser.linkedStudentIds[0]}`,
        { replace: true },
      );
    }
  }, [data.loadingParentConsent, data.parentConsent, currentUser, navigate]);

  const handleSave = async () => {
    if (!illuminationChecked || !kvkkChecked) return;
    setSaving(true);
    try {
      await data.saveParentConsent({
        illuminationConsent: true,
        kvkkConsent: true,
      });
      if (currentUser?.linkedStudentIds?.length) {
        navigate(
          `/student-profile/${currentUser.linkedStudentIds[0]}`,
          { replace: true },
        );
      }
    } finally {
      setSaving(false);
    }
  };

  if (!data.loadedParentConsent || data.loadingParentConsent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Dialog open={true} modal>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {step === "illumination" ? (
                <>
                  <FileText size={20} className="text-emerald-600" />
                  Veli Aydınlatma Metni
                </>
              ) : (
                <>
                  <ShieldCheck size={20} className="text-emerald-600" />
                  Açık Rıza Beyanı (KVKK)
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {step === "illumination" ? (
            <div className="space-y-4">
              <div className="rounded-md border bg-gray-50 p-4 text-sm leading-relaxed whitespace-pre-wrap text-gray-700 max-h-80 overflow-y-auto">
                {ILLUMINATION_TEXT}
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="illumination"
                  checked={illuminationChecked}
                  onCheckedChange={(v) => setIlluminationChecked(v === true)}
                />
                <Label htmlFor="illumination" className="text-sm font-normal">
                  Yukarıdaki Aydınlatma Metnini okudum ve bilgi edindim.
                </Label>
              </div>
              <Button
                className="w-full"
                disabled={!illuminationChecked}
                onClick={() => setStep("kvkk")}
              >
                Devam Et
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border bg-gray-50 p-4 text-sm leading-relaxed whitespace-pre-wrap text-gray-700 max-h-80 overflow-y-auto">
                {KVKK_TEXT}
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="kvkk"
                  checked={kvkkChecked}
                  onCheckedChange={(v) => setKvkkChecked(v === true)}
                />
                <Label htmlFor="kvkk" className="text-sm font-normal">
                  Açık rıza veriyorum.
                </Label>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("illumination")}
                >
                  Geri
                </Button>
                <Button
                  className="flex-1"
                  disabled={!kvkkChecked || saving}
                  onClick={handleSave}
                >
                  {saving ? (
                    "Kaydediliyor..."
                  ) : (
                    <>
                      <CheckCircle2 size={16} className="mr-1" />
                      Onaylıyorum
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

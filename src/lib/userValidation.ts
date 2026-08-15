import type { User } from "@/types";

export interface UserFormErrors {
  username?: string;
  fullName?: string;
  email?: string;
  password?: string;
  role?: string;
  parentStudentId?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const VALID_ROLES = [
  "superadmin",
  "admin",
  "authorized_teacher",
  "teacher",
  "parent",
] as const;

export function validateUserForm(
  form: Partial<User>,
  parentStudentId: string,
  existingUsers: User[],
  editingId?: number,
): { valid: boolean; errors: UserFormErrors } {
  const errors: UserFormErrors = {};

  const username = (form.username || "").trim();
  if (!username) {
    errors.username = "Kullanıcı adı zorunludur.";
  } else if (username.length < 3) {
    errors.username = "Kullanıcı adı en az 3 karakter olmalıdır.";
  } else if (!USERNAME_REGEX.test(username)) {
    errors.username =
      "Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir.";
  } else if (
    existingUsers.some((u) => u.username === username && u.id !== editingId)
  ) {
    errors.username = "Bu kullanıcı adı zaten kullanılıyor.";
  }

  const fullName = (form.fullName || "").trim();
  if (!fullName) {
    errors.fullName = "Ad soyad zorunludur.";
  } else if (fullName.length < 2) {
    errors.fullName = "Ad soyad en az 2 karakter olmalıdır.";
  }

  const email = (form.email || "").trim();
  if (email && !EMAIL_REGEX.test(email)) {
    errors.email = "Geçerli bir e-posta adresi girin.";
  } else if (
    email &&
    existingUsers.some((u) => u.email === email && u.id !== editingId)
  ) {
    errors.email = "Bu e-posta adresi zaten kullanılıyor.";
  }

  const password = form.password || "";
  if (!editingId) {
    if (!password) {
      errors.password = "Şifre zorunludur.";
    } else if (password.length < 6) {
      errors.password = "Şifre en az 6 karakter olmalıdır.";
    }
  } else if (password && password.length < 6) {
    errors.password = "Şifre en az 6 karakter olmalıdır.";
  }

  if (!form.role) {
    errors.role = "Rol zorunludur.";
  } else if (!VALID_ROLES.includes(form.role as (typeof VALID_ROLES)[number])) {
    errors.role = "Geçersiz rol seçildi.";
  }

  if (form.role === "parent" && !parentStudentId) {
    errors.parentStudentId = "Veli için öğrenci seçimi zorunludur.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

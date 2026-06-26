export interface User {
  id: number;
  name: string;
  phone: number;
  level: number;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export enum ClinicRole {
  ADMIN = 1,
  DOCTOR = 2,
  STAFF = 3,
}

export const getRoleLabel = (level: number): { label: string; badgeColor: string; icon: string } => {
  switch (level) {
    case 1:
      return {
        label: "Administrator",
        badgeColor: "bg-red-950/45 text-red-300 border-red-900/40 text-[9px]",
        icon: "👑",
      };
    case 2:
      return {
        label: "Dental Doctor",
        badgeColor: "bg-emerald-950/45 text-emerald-300 border-emerald-900/40 text-[9px]",
        icon: "⚕️",
      };
    case 3:
    default:
      return {
        label: "Clinic Assistant",
        badgeColor: "bg-zinc-900 text-zinc-300 border-zinc-800 text-[9px]",
        icon: "🧪",
      };
  }
};

/**
 * Iraq Time Helpers (Asia/Baghdad timezone)
 */
export function getIraqDateString(dateInput?: Date | string | number): string {
  if (!dateInput) {
    const d = new Date();
    try {
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Baghdad",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
      return formatter.format(d);
    } catch (e) {
      const offsetDate = new Date(d.getTime() + (3 * 3600000) + d.getTimezoneOffset() * 60000);
      return offsetDate.toISOString().split("T")[0];
    }
  }

  let d: Date;
  if (typeof dateInput === "string") {
    let clean = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }
    if (!clean.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(clean)) {
      clean = clean.replace(" ", "T");
      if (!clean.includes("T")) {
        clean = clean + "T00:00:00Z";
      } else if (!clean.endsWith("Z")) {
        clean = clean + "Z";
      }
    }
    d = new Date(clean);
  } else {
    d = new Date(dateInput);
  }

  if (isNaN(d.getTime())) return "N/A";

  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Baghdad",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    return formatter.format(d);
  } catch (e) {
    const offsetDate = new Date(d.getTime() + (3 * 3600000) + d.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().split("T")[0];
  }
}

export function getIraqDateTimeString(dateInput?: Date | string | number): string {
  return getIraqDateString(dateInput);
}

export function formatIraqFriendly(dateInput: string | Date | undefined): string {
  if (!dateInput) return "N/A";
  const dateObj = new Date(dateInput);
  if (isNaN(dateObj.getTime())) {
    const cleanStr = String(dateInput).trim().split(" ")[0];
    return cleanStr || "N/A";
  }

  // Get current date string in Iraq ("YYYY-MM-DD")
  const todayStr = getIraqDateString(new Date());
  
  // Get yesterday's date string in Iraq
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getIraqDateString(yesterday);

  // Get target date string in Iraq
  const targetStr = getIraqDateString(dateObj);

  if (targetStr === todayStr) {
    return `Today (${targetStr})`;
  } else if (targetStr === yesterdayStr) {
    return `Yesterday (${targetStr})`;
  } else {
    return targetStr;
  }
}

export interface Patient {
  id: number;
  name: string;
  phone: string;
  address: string;
  chronic_illness: string;
  registered_at: string;
  ref?: string; // referred by existing patient name from ptdata
  age?: number;   // age of patient
}

export interface Payment {
  id: number;
  pt_id: number;
  pt_name: string;
  amount: number;
  type: string; // "Installment" | "Full" | "Deposit"
  created_at: string;
  work_id?: string;
  dr_id?: number;
  dr_name?: string;
  notes?: string;
}

export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  phone: string;
  shift_status: "Active" | "On Call" | "Off Duty";
  level: number;
}

export interface Appointment {
  id: number;
  pt_id: number;
  pt_name: string;
  doctor_id: number;
  doctor_name: string;
  appointment_date: string;
  notes: string;
  status: "Scheduled" | "Completed" | "Cancelled";
}

export interface DentalWork {
  id: number;
  pt_id: number;
  pt_name: string;
  teeth_map: string; // comma separated teeth numbers
  price: number;
  notes: string;
  status: "Active" | "Labs Dispatch" | "Fitted" | "Completed";
  dr_id?: number;
  dr_name?: string;
  treatment_type_id?: number;
  treatment_type_name?: string;
  shade_code?: string;
  lab_id?: number;
  lab_name?: string;
  created_at?: string;
}

export interface DentalLab {
  id: number;
  name: string;
  phone: string;
  address: string;
  email: string;
  name2?: string;
  phone2?: string;
  time?: string;
}

export interface LabsWork {
  id: number;
  pt_id: number;
  pt_name: string;
  lab_id: number;
  lab_name: string;
  tooth_code: string; // e.g. "A1", "A2", "B1"
  status: "Dispatched" | "In Progress" | "Delivered";
  fee: number;
  dispatch_date: string;
  notes?: string;
  dr_name?: string;
  delevery?: string;
  called?: string;
}

export interface TreatmentType {
  id: number;
  name: string;
  description: string;
}

export interface ShadeColor {
  id: number;
  code: string; // A1, A2, etc.
  hex: string;
}

// Emptied initial records to remove local demo data
export const INITIAL_PATIENTS: Patient[] = [];

export const INITIAL_DOCTORS: Doctor[] = [];

export const INITIAL_PAID_MONEY: Payment[] = [];

export const INITIAL_APPOINTMENTS: Appointment[] = [];

export const INITIAL_LABS: DentalLab[] = [];

export const INITIAL_LABS_WORK: LabsWork[] = [];

export const INITIAL_TREATMENT_TYPES: TreatmentType[] = [];

export const INITIAL_SHADE_COLORS: ShadeColor[] = [
  { id: 1, code: "0M1", hex: "#FFFDFC" },
  { id: 2, code: "0M2", hex: "#FFFBF0" },
  { id: 3, code: "0M3", hex: "#FFF8E5" },
  { id: 4, code: "1M1", hex: "#FCF6CE" },
  { id: 5, code: "1M2", hex: "#FAF1C4" },
  { id: 6, code: "1M3", hex: "#F7ECB8" },
  { id: 7, code: "2M1", hex: "#F6EAA8" },
  { id: 8, code: "2M2", hex: "#F2E09B" },
  { id: 9, code: "2M3", hex: "#EDD68F" },
  { id: 10, code: "3M1", hex: "#E7CE86" },
  { id: 11, code: "3M2", hex: "#DEBF77" },
  { id: 12, code: "3M3", hex: "#D5B169" },
  { id: 13, code: "4M1", hex: "#CEAA6E" },
  { id: 14, code: "4M2", hex: "#C19B5F" },
  { id: 15, code: "4M3", hex: "#B58E51" },
  { id: 16, code: "5M1", hex: "#A98246" },
  { id: 17, code: "5M2", hex: "#9D773C" },
  { id: 18, code: "5M3", hex: "#916B31" }
];

export const INITIAL_DENTAL_WORKS: DentalWork[] = [];

export const INITIAL_LOANS: any[] = [];

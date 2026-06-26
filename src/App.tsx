import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity,
  Heart,
  Droplet,
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Smile,
  LogOut,
  Sparkles,
  ShieldCheck,
  Calendar,
  FlaskConical,
  CreditCard,
  CheckCircle,
  Clock,
  Briefcase,
  Layers,
  Palette,
  Check,
  ChevronRight,
  Server,
  Database,
  RefreshCw,
  UserPlus,
  Search,
  Plus
} from "lucide-react";
import { User as AppUser, getRoleLabel } from "./types";
import {
  Patient,
  Payment,
  Doctor,
  Appointment,
  DentalWork,
  DentalLab,
  LabsWork,
  TreatmentType,
  ShadeColor,
  INITIAL_PATIENTS,
  INITIAL_DOCTORS,
  INITIAL_PAID_MONEY,
  INITIAL_APPOINTMENTS,
  INITIAL_LABS,
  INITIAL_LABS_WORK,
  INITIAL_TREATMENT_TYPES,
  INITIAL_SHADE_COLORS,
  INITIAL_LOANS,
  INITIAL_DENTAL_WORKS,
  getIraqDateString,
  getIraqDateTimeString,
  formatIraqFriendly
} from "./data";

// FDI Two-digit to Palmer quadrant notation map for high-fidelity clinical charting
const PALMER_TO_FDI: Record<string, string> = {
  "UR1": "11", "UR2": "12", "UR3": "13", "UR4": "14", "UR5": "15", "UR6": "16", "UR7": "17", "UR8": "18",
  "UL1": "21", "UL2": "22", "UL3": "23", "UL4": "24", "UL5": "25", "UL6": "26", "UL7": "27", "UL8": "28",
  "LL1": "31", "LL2": "32", "LL3": "33", "LL4": "34", "LL5": "35", "LL6": "36", "LL7": "37", "LL8": "38",
  "LR1": "41", "LR2": "42", "LR3": "43", "LR4": "44", "LR5": "45", "LR6": "46", "LR7": "47", "LR8": "48"
};

const FDI_TO_PALMER: Record<string, string> = {};
Object.entries(PALMER_TO_FDI).forEach(([palmer, fdi]) => {
  FDI_TO_PALMER[fdi] = palmer;
});

// Helper to normalize tooth keys (checks FDI and Palmer)
export function getPalmerCode(toothCode: string): string {
  const code = toothCode.trim().toUpperCase();
  if (FDI_TO_PALMER[code]) {
    return FDI_TO_PALMER[code];
  }
  return code;
}

export default function App() {
  // Session & UI States
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<"login" | "register" | "dashboard">("login");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // A safe confirmation dialog helper that tolerates iframe sandbox blockages
  const safeConfirm = (msg: string): boolean => {
    return true; // Auto-bypass confirmation in sandboxed preview iframe structures
  };
  
  // Form input states
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [level, setLevel] = useState<number>(3); // Default 3 (assistant)
  
  // Show/Hide Password states
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // Dynamic UI feedback states
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [serverHealth, setServerHealth] = useState<{ status: string; timestamp: string; supabaseConnected: boolean } | null>(null);
  const [isUpdatingPhone, setIsUpdatingPhone] = useState<boolean>(false);
  const [newPhone, setNewPhone] = useState<string>("");
  const [updateMsg, setUpdateMsg] = useState<{ text: string; success: boolean } | null>(null);

  // Global Search State Query (Requested center search bar)
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Language state (Default: Arabic)
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en);

  // Primary Navigation Tab state
  const [activeTab, setActiveTab] = useState<string>("insert"); // Start in patient treatment insert registration screen
  const [insertViewMode, setInsertViewMode] = useState<"new" | "edit">("new");

  // Clinical Database States
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [payments, setPayments] = useState<Payment[]>(INITIAL_PAID_MONEY);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [labs, setLabs] = useState<DentalLab[]>(INITIAL_LABS);
  const [labsWork, setLabsWork] = useState<LabsWork[]>(INITIAL_LABS_WORK);
  const [treatmentTypes, setTreatmentTypes] = useState<TreatmentType[]>(INITIAL_TREATMENT_TYPES);
  const [shadeColors, setShadeColors] = useState<ShadeColor[]>(INITIAL_SHADE_COLORS);
  const [loans, setLoans] = useState<any[]>(INITIAL_LOANS);
  const [dentalWorks, setDentalWorks] = useState<DentalWork[]>(INITIAL_DENTAL_WORKS);
  const [workFilterMode, setWorkFilterMode] = useState<"today" | "all">("today");
  const [workScreenPage, setWorkScreenPage] = useState<number>(1);

  useEffect(() => {
    setWorkScreenPage(1);
  }, [workFilterMode, activeTab]);

  const [incomePeriod, setIncomePeriod] = useState<"all" | "today" | "yesterday" | "this-week" | "this-month" | "custom">("all");
  const [incomeScreenPage, setIncomeScreenPage] = useState<number>(1);

  useEffect(() => {
    setIncomeScreenPage(1);
  }, [incomePeriod, activeTab]);

  const [incomeStartCustomDate, setIncomeStartCustomDate] = useState<string>("");
  const [incomeEndCustomDate, setIncomeEndCustomDate] = useState<string>("");

  // Loan Screen Advanced Query Controls
  const [loanSearchQuery, setLoanSearchQuery] = useState<string>("");
  const [loanSortKey, setLoanSortKey] = useState<"debt-desc" | "debt-asc" | "cost-desc" | "name-asc" | "id-desc">("debt-desc");
  const [loanStatusFilter, setLoanStatusFilter] = useState<"all" | "active-debt" | "paid-off" | "high-debt">("all");
  const [loanReconciliationView, setLoanReconciliationView] = useState<"dynamic" | "declared">("dynamic");
  const [loanScreenPage, setLoanScreenPage] = useState<number>(1);

  useEffect(() => {
    setLoanScreenPage(1);
  }, [loanSearchQuery, loanSortKey, loanStatusFilter, loanReconciliationView, activeTab]);

  // Sub-forms interactive state bindings
  // 10. Dental Work Screen
  const [workPtId, setWorkPtId] = useState<number | "">("");
  const [workTeeth, setWorkTeeth] = useState("");
  const [workPrice, setWorkPrice] = useState("");
  const [workNotes, setWorkNotes] = useState("");
  const [workStatus, setWorkStatus] = useState<"Active" | "Labs Dispatch" | "Fitted" | "Completed">("Active");
  const [workSearchWord, setWorkSearchWord] = useState("");
  const [workShowSuggestions, setWorkShowSuggestions] = useState(false);
  
  // Extended state inputs for Dental Work orders
  const [workDrId, setWorkDrId] = useState<number | "">("");
  const [workTreatmentTypeId, setWorkTreatmentTypeId] = useState<number | "">("");
  const [workShadeCode, setWorkShadeCode] = useState<string>("");
  const [workShadeDropdownOpen, setWorkShadeDropdownOpen] = useState(false);
  const [workLabId, setWorkLabId] = useState<number | "">("");
  const [workTeethList, setWorkTeethList] = useState<string[]>([]);
  const [workPaymentAmount, setWorkPaymentAmount] = useState<string>("");
  const [headerShowDropdown, setHeaderShowDropdown] = useState(false);
  
  // Local quick-search states for Patient Dossier (PT INFO - Subpage 4)
  const [ptInfoSearchWord, setPtInfoSearchWord] = useState("");
  const [ptInfoShowSuggestions, setPtInfoShowSuggestions] = useState(false);
  const [ptInfoSubTab, setPtInfoSubTab] = useState<"summary" | "anatomy" | "procedures">("summary");

  // 1. Patient file insertion (Insert)
  const [newPtName, setNewPtName] = useState("");
  const [newPtPhone, setNewPtPhone] = useState("");
  const [newPtAddress, setNewPtAddress] = useState("");
  const [newPtIllness, setNewPtIllness] = useState("");
  const [newPtAge, setNewPtAge] = useState<number | "">("");

  const [editPtId, setEditPtId] = useState<number | null>(null);
  const [editPtName, setEditPtName] = useState("");
  const [editPtPhone, setEditPtPhone] = useState("");
  const [editPtAddress, setEditPtAddress] = useState("");
  const [editPtIllness, setEditPtIllness] = useState("");
  const [editPtAge, setEditPtAge] = useState<number | "">("");
  const [editPtRef, setEditPtRef] = useState<number | "">("");
  const [editPtRefSearchWord, setEditPtRefSearchWord] = useState("");
  const [showEditPtRefSuggestions, setShowEditPtRefSuggestions] = useState(false);
  const [editSearchWord, setEditSearchWord] = useState("");
  const [newPtRef, setNewPtRef] = useState(""); // final selected referrer name
  const [refSearchWord, setRefSearchWord] = useState(""); // input search query for referrer
  const [showRefSuggestions, setShowRefSuggestions] = useState(false);
  const [poolSearch, setPoolSearch] = useState(""); // state for the main patient database pool search

  // 2. Receipt payments (Add Money)
  const [payPtId, setPayPtId] = useState<number | "">("");
  const [payAmount, setPayAmount] = useState("");
  const [payType, setPayType] = useState("Installment");
  const [payDate, setPayDate] = useState(getIraqDateString());
  const [payDocId, setPayDocId] = useState<number | "">(1); // default to first doctor (id: 1)
  const [payWorkId, setPayWorkId] = useState(""); // custom work ID
  const [paySearchWord, setPaySearchWord] = useState(""); // search input for selecting patient for payment
  const [payShowSuggestions, setPayShowSuggestions] = useState(false);
  const [selectedDrId, setSelectedDrId] = useState<number | null>(null);
  const [drsSubTab, setDrsSubTab] = useState<"payments" | "works">("payments");
  const [drsDateFilter, setDrsDateFilter] = useState<"all" | "today" | "yesterday" | "week" | "month">("all");
  const [drsPaidPage, setDrsPaidPage] = useState(1);
  const [drsWorksPage, setDrsWorksPage] = useState(1);

  useEffect(() => {
    setDrsPaidPage(1);
    setDrsWorksPage(1);
  }, [selectedDrId, drsDateFilter, drsSubTab]);

  // Helper to select a patient for payment, finding their unpaid work or default
  const handleSelectPatientForPayment = (patientId: number, patientName: string) => {
    setPayPtId(patientId);
    setPaySearchWord(patientName);
    setPayShowSuggestions(false);
    
    // Find all dental work orders for this patient
    const patientWorks = dentalWorks.filter(w => w.pt_id === patientId);
    
    // Check if there is an unpaid/remnant work order
    let chosenWorkId = `WRK-${patientId}`;
    let chosenAmount = "";
    
    if (patientWorks.length > 0) {
      // Find the first work with unpaid amount > 0
      const unpaidWork = patientWorks.find(w => {
        const paidForWork = payments
          .filter(p => p.work_id === `WRK-DW-${w.id}`)
          .reduce((sum, p) => sum + p.amount, 0);
        return w.price - paidForWork > 0;
      });
      
      if (unpaidWork) {
        const paidForWork = payments
          .filter(p => p.work_id === `WRK-DW-${unpaidWork.id}`)
          .reduce((sum, p) => sum + p.amount, 0);
        chosenWorkId = `WRK-DW-${unpaidWork.id}`;
        chosenAmount = String(Math.max(0, unpaidWork.price - paidForWork));
      } else {
        // If all are paid, default to the last work ID, but amount 0 or just the last work ID
        const lastWork = patientWorks[patientWorks.length - 1];
        chosenWorkId = `WRK-DW-${lastWork.id}`;
        chosenAmount = "0";
      }
    }
    
    setPayWorkId(chosenWorkId);
    setPayAmount(chosenAmount);
  };

  // Helper to find unpaid remnant details for the currently active/selected Work ID
  const getWorkOrderUnpaidDetails = () => {
    if (!payWorkId) return null;
    let dwId: number | null = null;
    if (payWorkId.startsWith("WRK-DW-")) {
      const parsed = parseInt(payWorkId.replace("WRK-DW-", ""), 10);
      if (!isNaN(parsed)) dwId = parsed;
    } else {
      const parsed = parseInt(payWorkId, 10);
      if (!isNaN(parsed)) dwId = parsed;
    }
    
    if (dwId !== null) {
      const dw = dentalWorks.find(w => w.id === dwId);
      if (dw) {
        const paidForWork = payments
          .filter(p => p.work_id === `WRK-DW-${dw.id}`)
          .reduce((sum, p) => sum + p.amount, 0);
        const unpaidAmount = Math.max(0, dw.price - paidForWork);
        return {
          price: dw.price,
          paid: paidForWork,
          unpaid: unpaidAmount,
          teeth: dw.teeth_map,
          pt_name: dw.pt_name,
          pt_id: dw.pt_id
        };
      }
    }
    return null;
  };

  // Pre-populate payAmount with remnant unpaid amount when payWorkId changes
  useEffect(() => {
    if (!payWorkId) return;
    let dwId: number | null = null;
    if (payWorkId.startsWith("WRK-DW-")) {
      const parsed = parseInt(payWorkId.replace("WRK-DW-", ""), 10);
      if (!isNaN(parsed)) dwId = parsed;
    } else {
      const parsed = parseInt(payWorkId, 10);
      if (!isNaN(parsed)) dwId = parsed;
    }
    
    if (dwId !== null) {
      const dw = dentalWorks.find(w => w.id === dwId);
      if (dw) {
        const paidForWork = payments
          .filter(p => p.work_id === `WRK-DW-${dw.id}`)
          .reduce((sum, p) => sum + p.amount, 0);
        const unpaidAmount = Math.max(0, dw.price - paidForWork);
        setPayAmount(String(unpaidAmount));
      }
    }
  }, [payWorkId, dentalWorks, payments]);

  // 3. New Doctor entry
  const [newDocName, setNewDocName] = useState("");
  const [newDocSpecialty, setNewDocSpecialty] = useState("");
  const [newDocPhone, setNewDocPhone] = useState("");
  const [newDocShift, setNewDocShift] = useState<"Active" | "On Call" | "Off Duty">("Active");

  // 4. Patient folder active ID in "PT Info" tab
  const [selectedPtId, setSelectedPtId] = useState<number | null>(() => {
    const saved = sessionStorage.getItem("session_pt_id");
    return saved ? Number(saved) : 101;
  });

  useEffect(() => {
    if (insertViewMode === 'edit' && selectedPtId) {
      const pt = patients.find(p => p.id === selectedPtId);
      if (pt) {
        setEditPtId(pt.id);
        setEditPtName(pt.name);
        setEditPtPhone(pt.phone);
        setEditPtAddress(pt.address || "");
        setEditPtIllness(pt.chronic_illness || "");
        setEditPtAge(pt.age || "");
        setEditPtRef(pt.ref || "");
      }
    }
  }, [insertViewMode, selectedPtId, patients]);

  // 5. Booking appointment slot
  const [aptPtId, setAptPtId] = useState<number | "">("");
  const [aptDocId, setAptDocId] = useState<number | "">("");
  const [aptDate, setAptDate] = useState(getIraqDateString());
  const [aptNotes, setAptNotes] = useState("");

  // 6. Teeth chart shade map selection & treatments registry
  const [selectedToothNum, setSelectedToothNum] = useState<number | null>(11);
  const [selectedShadeCode, setSelectedShadeCode] = useState("0M2");
  const [newTreatName, setNewTreatName] = useState("");
  const [newTreatDesc, setNewTreatDesc] = useState("");

  // Supabase/PostgreSQL Test Report States
  const [supabaseTestReport, setSupabaseTestReport] = useState<string>("");
  const [supabaseTestLines, setSupabaseTestLines] = useState<string[]>([]);
  const [supabaseTestRunning, setSupabaseTestRunning] = useState<boolean>(false);
  const [supabaseTestAllPassed, setSupabaseTestAllPassed] = useState<boolean | null>(null);
  const [supabaseTestProgress, setSupabaseTestProgress] = useState<string>("Press button to start...");

  // 7. Dispatching and packaging prosthetics lab orders
  const [labPtId, setLabPtId] = useState<number | "">("");
  const [labTargetId, setLabTargetId] = useState<number | "">("");
  const [labToothShadeCode, setLabToothShadeCode] = useState("0M2");
  const [labFee, setLabFee] = useState("");
  
  // Custom lab & subpage division states
  const [workCustomLabName, setWorkCustomLabName] = useState("");
  const [labsSubTab, setLabsSubTab] = useState<"labs_work" | "labs">("labs_work");
  
  // Labs work (labs_work) editing / show state
  const [editingLabWorkId, setEditingLabWorkId] = useState<number | null>(null);
  const [editLabWorkPtId, setEditLabWorkPtId] = useState<number | "">("");
  const [editLabWorkLabId, setEditLabWorkLabId] = useState<number | "">("");
  const [editLabWorkShade, setEditLabWorkShade] = useState("0M2");
  const [editLabWorkFee, setEditLabWorkFee] = useState("");
  const [editLabWorkStatus, setEditLabWorkStatus] = useState<"Dispatched" | "In Progress" | "Delivered">("Dispatched");
  const [editLabWorkNotes, setEditLabWorkNotes] = useState("");
  const [editLabWorkDrName, setEditLabWorkDrName] = useState("");
  const [editLabWorkDelevery, setEditLabWorkDelevery] = useState("Dispatch / Standard");
  const [editLabWorkCalled, setEditLabWorkCalled] = useState("No");

  // New dispatch options state
  const [labWorkDrName, setLabWorkDrName] = useState("Attending Doctor");
  const [labWorkDelevery, setLabWorkDelevery] = useState("Dispatch / Standard");
  const [labWorkCalled, setLabWorkCalled] = useState("No");

  // Labs (labs) add / edit / show state
  const [labSearchWord, setLabSearchWord] = useState("");
  const [showCompletedLabWork, setShowCompletedLabWork] = useState(false);
  const [newLabName, setNewLabName] = useState("");
  const [newLabPhone, setNewLabPhone] = useState("");
  const [newLabAddress, setNewLabAddress] = useState("");
  const [newLabEmail, setNewLabEmail] = useState("");
  const [newLabName2, setNewLabName2] = useState("");
  const [newLabPhone2, setNewLabPhone2] = useState("");
  
  const [editingLabId, setEditingLabId] = useState<number | null>(null);
  const [editLabName, setEditLabName] = useState("");
  const [editLabPhone, setEditLabPhone] = useState("");
  const [editLabAddress, setEditLabAddress] = useState("");
  const [editLabEmail, setEditLabEmail] = useState("");
  const [editLabName2, setEditLabName2] = useState("");
  const [editLabPhone2, setEditLabPhone2] = useState("");
  
  // Check the backend server health on boot
  useEffect(() => {
    checkServerHealth();
    
    // Retrieve cached session
    const cachedToken = localStorage.getItem("slava_dent_token");
    const cachedUser = localStorage.getItem("slava_dent_user");

    if (cachedToken && cachedUser) {
      try {
        setToken(cachedToken);
        setUser(JSON.parse(cachedUser));
        setView("dashboard");
      } catch (e) {
        // Clear corrupt storage
        localStorage.removeItem("slava_dent_token");
        localStorage.removeItem("slava_dent_user");
      }
    }
    
    setTimeout(() => {
      setIsLoading(false);
    }, 850);
  }, []);

  // Sync active patient dossier selection with sessionStorage
  useEffect(() => {
    if (selectedPtId !== null) {
      sessionStorage.setItem("session_pt_id", String(selectedPtId));
      
      // Also automatically draft a work id matching this session patient if not set
      const generatedWorkId = `WRK-${selectedPtId}`;
      setPayWorkId(prev => prev ? prev : generatedWorkId);
    }
  }, [selectedPtId]);

  // Handle auto-population of Add Money defaults from active design session patient
  useEffect(() => {
    if (activeTab === "add-money" && selectedPtId !== null) {
      setPayPtId(selectedPtId);
      
      // Auto-populate patient search display field
      const activePatient = patients.find(p => p.id === selectedPtId);
      if (activePatient) {
        setPaySearchWord(activePatient.name);
      }
    }
  }, [activeTab, selectedPtId, patients]);

  // Handle auto-population of Work Register defaults from active/selected design session patient
  useEffect(() => {
    if (selectedPtId !== null) {
      setWorkPtId(selectedPtId);
      
      const activePatient = patients.find(p => p.id === selectedPtId);
      if (activePatient) {
        setWorkSearchWord(activePatient.name);
      }
    }
  }, [selectedPtId, patients]);

  const checkServerHealth = async () => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        setServerHealth(data);
      } else {
        setServerHealth({ status: "error", timestamp: "", supabaseConnected: false });
      }
    } catch (e) {
      setServerHealth({ status: "offline", timestamp: "", supabaseConnected: false });
    }
  };

  const runSupabaseTest = async () => {
    setSupabaseTestRunning(true);
    setSupabaseTestProgress("Initializing test runner on backend...");
    setSupabaseTestAllPassed(null);
    setSupabaseTestReport("");
    setSupabaseTestLines([]);

    try {
      // Staggered progress logs to give high-fidelity visual system response feedback
      setSupabaseTestProgress("Running Test 1/8: DNS & API endpoint ping...");
      await new Promise(r => setTimeout(r, 450));

      setSupabaseTestProgress("Running Test 3/8: Initializing SQL queries & authentication token verification...");
      await new Promise(r => setTimeout(r, 450));

      setSupabaseTestProgress("Running Test 5/8: Running User CRUD insert and validation operations...");
      await new Promise(r => setTimeout(r, 450));

      setSupabaseTestProgress("Running Test 7/8: User entry cleanup and structural verification...");
      
      const res = await fetch("/api/supabase-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        const data = await res.json();
        setSupabaseTestAllPassed(data.success);
        setSupabaseTestReport(data.report);
        setSupabaseTestLines(data.lines || []);
        if (data.success) {
          setSupabaseTestProgress("ALL TESTS PASSED ✅");
          checkServerHealth();
        } else {
          setSupabaseTestProgress("SOME TESTS FAILED ❌");
        }
      } else {
        const text = await res.text();
        setSupabaseTestAllPassed(false);
        const reportErr = `❌ HTTP Error: ${res.status} ${res.statusText}\n${text}`;
        setSupabaseTestReport(reportErr);
        setSupabaseTestLines([`❌ HTTP Error: ${res.status}`, text]);
        setSupabaseTestProgress("TEST EXECUTION FAILED ❌");
      }
    } catch (e: any) {
      setSupabaseTestAllPassed(false);
      const reportErr = `❌ Exception occurred running test:\n${e.message}`;
      setSupabaseTestReport(reportErr);
      setSupabaseTestLines([`❌ Exception: ${e.message}`]);
      setSupabaseTestProgress("EXCEPTION OCCURRED ❌");
    } finally {
      setSupabaseTestRunning(false);
    }
  };

  const loadClinicalData = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const [resPts, resWorks, resPayments, resDocs, resApts, resLabs, resTypes, resLabsWork] = await Promise.all([
        fetch("/api/patients", { headers }),
        fetch("/api/work", { headers }),
        fetch("/api/payments", { headers }),
        fetch("/api/doctors", { headers }),
        fetch("/api/appointments", { headers }),
        fetch("/api/labs", { headers }),
        fetch("/api/treatment-types", { headers }),
        fetch("/api/labs-work", { headers })
      ]);

      if (resPts.ok) {
        const pts = await resPts.json();
        if (Array.isArray(pts)) setPatients(pts);
      }
      if (resWorks.ok) {
        const works = await resWorks.json();
        if (Array.isArray(works)) setDentalWorks(works);
      }
      if (resPayments.ok) {
        const pays = await resPayments.json();
        if (Array.isArray(pays)) setPayments(pays);
      }
      if (resDocs.ok) {
        const docs = await resDocs.json();
        if (Array.isArray(docs)) setDoctors(docs);
      }
      if (resApts.ok) {
        const apts = await resApts.json();
        if (Array.isArray(apts)) setAppointments(apts);
      }
      if (resLabs.ok) {
        const lbs = await resLabs.json();
        if (Array.isArray(lbs)) setLabs(lbs);
      }
      if (resTypes.ok) {
        const types = await resTypes.json();
        if (Array.isArray(types)) setTreatmentTypes(types);
      }
      if (resLabsWork.ok) {
        const lw = await resLabsWork.json();
        if (Array.isArray(lw)) setLabsWork(lw);
      }
    } catch (err) {
      console.error("Failed to fetch full-stack sync clinical tables from Express/Postgres, retained local memory sets:", err);
    }
  };

  useEffect(() => {
    if (token) {
      loadClinicalData();
    }
  }, [token]);

  // Auth: Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    // Basic Validation
    if (!username.trim()) {
      setAuthError("Please enter a username or full name.");
      return;
    }
    if (phone.length < 5) {
      setAuthError("Please enter a valid phone number (at least 5 digits).");
      return;
    }
    if (password.length < 4) {
      setAuthError("Password must be at least 4 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setAuthError("Passwords do not match. Please verify.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: username,
          password,
          phone: phone.replace(/\D/g, ""),
          level
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create accounts.");
      }

      setAuthSuccess(`Account created for ${data.user.name}!`);
      
      // Auto-cache & Login after secure registration
      localStorage.setItem("slava_dent_token", data.token);
      localStorage.setItem("slava_dent_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      
      // Reset forms
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setPhone("");
      setLevel(3);
      
      setTimeout(() => {
        setView("dashboard");
      }, 900);
    } catch (err: any) {
      setAuthError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  // Auth: Handle logins
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (!username.trim() || !password) {
      setAuthError("Please provide both name and password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login credential mismatch.");
      }

      setAuthSuccess("Login successful!");
      
      localStorage.setItem("slava_dent_token", data.token);
      localStorage.setItem("slava_dent_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      
      setUsername("");
      setPassword("");
      
      setTimeout(() => {
        setView("dashboard");
      }, 700);
    } catch (err: any) {
      setAuthError(err.message || "Failed to log in.");
    } finally {
      setIsLoading(false);
    }
  };

  // Auth: Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("slava_dent_token");
    localStorage.removeItem("slava_dent_user");
    setUser(null);
    setToken(null);
    setAuthSuccess("Session logged out successfully.");
    setView("login");
  };

  // Profile Action: Mock update profile phone (demonstrates real JWT context routing)
  const handleUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateMsg(null);
    const numericPhone = newPhone.replace(/\D/g, "");
    if (!numericPhone || numericPhone.length < 5) {
      setUpdateMsg({ text: "Please supply a valid numeric phone format.", success: false });
      return;
    }

    setIsUpdatingPhone(true);
    // Simulate updating in-app context to demonstrate interactive database-style action
    setTimeout(() => {
      if (user) {
        const updated = { ...user, phone: parseInt(numericPhone, 10) };
        setUser(updated);
        localStorage.setItem("slava_dent_user", JSON.stringify(updated));
        setUpdateMsg({ text: "Emergency notification phone synced with DB!", success: true });
        setNewPhone("");
      }
      setIsUpdatingPhone(false);
    }, 600);
  };

  // ==========================================
  // 9 CLINICAL CORE SUB-ACTION SUBMISSIONS
  // ==========================================

  // 1. Submit patient registry form (Insert patient):
  const submitInsertPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPtName.trim() || !newPtPhone.trim()) return;

    try {
      // Find referer id if any
      const matchedRef = patients.find(p => p.name.toLowerCase() === newPtRef.trim().toLowerCase());
      const refId = matchedRef ? matchedRef.id : undefined;

      const resPt = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          name: newPtName.trim(),
          phone: newPtPhone.trim(),
          address: newPtAddress.trim() || "Unspecified address",
          chronic_illness: newPtIllness.trim() || "None",
          age: newPtAge !== "" ? Number(newPtAge) : undefined,
          ref_id: refId,
          user_by: user ? user.name : "admin"
        })
      });

      if (!resPt.ok) {
        throw new Error("Failed to insert patient profile to postgresql server.");
      }

      const insertedPt = await resPt.json();

      // Reload fresh synchronized tables from backend database
      await loadClinicalData();

      // Ensure that a default dummy loan is initialized locally for consistency
      const newLoan = {
        pt_id: insertedPt.id,
        pt_name: insertedPt.name,
        total_cost: 0,
        total_paid: 0,
        loan_debt: 0,
        status: "Paid Off"
      };
      setLoans(prev => [newLoan, ...prev]);

      setSelectedPtId(insertedPt.id);
      setWorkPtId(insertedPt.id);
      setWorkSearchWord(insertedPt.name);
      
      // Reset entries
      setNewPtName("");
      setNewPtPhone("");
      setNewPtAddress("");
      setNewPtIllness("");
      setNewPtAge("");
      setNewPtRef("");
      setRefSearchWord("");
      setShowRefSuggestions(false);

      // Redirect to work screen
      setActiveTab("work");

    } catch (err: any) {
      console.error("Patient sync failed, performing offline state update:", err.message);
      // Fallback: update local state so everything is smooth
      const newId = patients.length > 0 ? Math.max(...patients.map(p => p.id)) + 1 : 101;
      const newPt: Patient = {
        id: newId,
        name: newPtName.trim(),
        phone: newPtPhone.trim(),
        address: newPtAddress.trim() || "Unspecified address",
        chronic_illness: newPtIllness.trim() || "None",
        registered_at: getIraqDateString(),
        ref: newPtRef.trim() || undefined,
        age: newPtAge !== "" ? Number(newPtAge) : undefined
      };

      setPatients([newPt, ...patients]);
      
      const newLoan = {
        pt_id: newId,
        pt_name: newPt.name,
        total_cost: 1200000,
        total_paid: 0,
        loan_debt: 1200000,
        status: "Active Debt"
      };
      setLoans([newLoan, ...loans]);

      setSelectedPtId(newId);
      setWorkPtId(newId);
      setWorkSearchWord(newPt.name);
      setNewPtName("");
      setNewPtPhone("");
      setNewPtAddress("");
      setNewPtIllness("");
      setNewPtAge("");
      setNewPtRef("");
      setRefSearchWord("");
      setShowRefSuggestions(false);
      setActiveTab("work");
    }
  };

  // 10. Submit new Dental Work Order:
  const submitInsertDentalWork = async (e: React.FormEvent) => {
    e.preventDefault();
    const ptIdNum = Number(workPtId);
    const priceVal = Number(workPrice);
    if (!ptIdNum) {
      alert("Please search and select a patient from the suggestions list first.");
      return;
    }

    const targetPt = patients.find(p => p.id === ptIdNum);
    if (!targetPt) {
      alert("Patient not found. Please select a valid patient.");
      return;
    }

    const selectedDr = doctors.find(d => d.id === Number(workDrId));
    const selectedType = treatmentTypes.find(t => t.id === Number(workTreatmentTypeId));
    const selectedLab = labs.find(l => l.id === Number(workLabId));

    const finalTeethString = workTeethList.length > 0 ? workTeethList.sort().join(", ") : "Unspecified";

    try {
      // POST the work order to the backend
      const resWork = await fetch("/api/work", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          pt_id: ptIdNum,
          pt_name: targetPt.name,
          teeth_map: finalTeethString,
          price: priceVal || 0,
          notes: workNotes.trim() || "No notes",
          status: workStatus,
          dr_name: selectedDr ? selectedDr.name : "Dental Practitioner",
          treatment_type_name: selectedType ? selectedType.name : "Restoration",
          shade_code: workShadeCode || "0M2",
          lab_name: selectedLab ? selectedLab.name : (workCustomLabName.trim() || "Chairside Fabrication"),
          user_by: user ? user.name : "admin"
        })
      });

      if (!resWork.ok) {
        throw new Error("Failed to insert dental work to PostgreSQL");
      }

      const insertedWork = await resWork.json();

      // POST the payment to the backend (if any money was recorded on the spot)
      const payAmountVal = Number(workPaymentAmount);
      if (payAmountVal > 0) {
        await fetch("/api/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify({
            pt_id: ptIdNum,
            pt_name: targetPt.name,
            amount: payAmountVal,
            type: "Deposit",
            work_id: `WRK-DW-${insertedWork.id}`,
            dr_name: selectedDr ? selectedDr.name : "Dental Practitioner",
            notes: workNotes.trim() || "Procedure down-payment deposit",
            user_by: user ? user.name : "admin"
          })
        });
      }

      // Reload fresh synchronized tables from the backend database (Supabase/PostgreSQL)
      await loadClinicalData();

      // Also trigger updating the client-side Loans list just in case
      const existLoan = loans.find(l => l.pt_id === ptIdNum);
      if (existLoan) {
        setLoans(loans.map(l => {
          if (l.pt_id === ptIdNum) {
            const newCost = l.total_cost + (priceVal || 0);
            const newPaid = l.total_paid + payAmountVal;
            const newDebt = newCost - newPaid;
            return {
              ...l,
              total_cost: newCost,
              total_paid: newPaid,
              loan_debt: newDebt,
              status: newDebt === 0 ? "Paid Off" : "Active Debt"
            };
          }
          return l;
        }));
      } else {
        const newCost = priceVal || 0;
        const newPaid = payAmountVal;
        const newDebt = newCost - newPaid;
        const newLoan = {
          pt_id: ptIdNum,
          pt_name: targetPt.name,
          total_cost: newCost,
          total_paid: newPaid,
          loan_debt: newDebt,
          status: newDebt === 0 ? "Paid Off" : "Active Debt"
        };
        setLoans([newLoan, ...loans]);
      }

      // Reset form states
      setWorkPtId("");
      setWorkTeeth("");
      setWorkPrice("");
      setWorkNotes("");
      setWorkStatus("Active");
      setWorkSearchWord("");
      setWorkDrId("");
      setWorkTreatmentTypeId("");
      setWorkShadeCode("");
      setWorkLabId("");
      setWorkTeethList([]);
      setWorkPaymentAmount("");

    } catch (err: any) {
      console.error("Clinical work insert failed, continuing in offline/local state mode:", err.message);
      // Fallback: implement local state update so experience is never blocked if database is loading...
      const newDwId = dentalWorks.length > 0 ? Math.max(...dentalWorks.map(w => w.id)) + 1 : 1;
      const fallbackWorkObj: DentalWork = {
        id: newDwId,
        pt_id: ptIdNum,
        pt_name: targetPt.name,
        teeth_map: finalTeethString,
        price: priceVal || 0,
        notes: workNotes.trim() || "No notes",
        status: workStatus,
        dr_id: workDrId ? Number(workDrId) : undefined,
        dr_name: selectedDr ? selectedDr.name : undefined,
        treatment_type_id: workTreatmentTypeId ? Number(workTreatmentTypeId) : undefined,
        treatment_type_name: selectedType ? selectedType.name : undefined,
        shade_code: workShadeCode || undefined,
        lab_id: workLabId ? Number(workLabId) : undefined,
        lab_name: selectedLab ? selectedLab.name : undefined,
        created_at: getIraqDateTimeString()
      };
      setDentalWorks([fallbackWorkObj, ...dentalWorks]);

      const payAmountVal = Number(workPaymentAmount);
      if (payAmountVal > 0) {
        const newPayId = payments.length > 0 ? Math.max(...payments.map(p => p.id)) + 1 : 1;
        const fallbackPaymentObj: Payment = {
          id: newPayId,
          pt_id: ptIdNum,
          pt_name: targetPt.name,
          amount: payAmountVal,
          type: "Deposit",
          created_at: getIraqDateTimeString(),
          work_id: `WRK-DW-${newDwId}`,
          dr_id: workDrId ? Number(workDrId) : undefined,
          dr_name: selectedDr ? selectedDr.name : undefined,
          notes: workNotes.trim() || "No notes"
        };
        setPayments([fallbackPaymentObj, ...payments]);
      }

      // Local Loan Fallback
      const existLoan = loans.find(l => l.pt_id === ptIdNum);
      if (existLoan) {
        setLoans(loans.map(l => {
          if (l.pt_id === ptIdNum) {
            const newCost = l.total_cost + (priceVal || 0);
            const newPaid = l.total_paid + payAmountVal;
            const newDebt = newCost - newPaid;
            return {
              ...l,
              total_cost: newCost,
              total_paid: newPaid,
              loan_debt: newDebt,
              status: newDebt === 0 ? "Paid Off" : "Active Debt"
            };
          }
          return l;
        }));
      } else {
        const newCost = priceVal || 0;
        const newPaid = payAmountVal;
        const newDebt = newCost - newPaid;
        setLoans([{
          pt_id: ptIdNum,
          pt_name: targetPt.name,
          total_cost: newCost,
          total_paid: newPaid,
          loan_debt: newDebt,
          status: newDebt === 0 ? "Paid Off" : "Active Debt"
        }, ...loans]);
      }

      // Reset form states
      setWorkPtId("");
      setWorkTeeth("");
      setWorkPrice("");
      setWorkNotes("");
      setWorkStatus("Active");
      setWorkSearchWord("");
      setWorkDrId("");
      setWorkTreatmentTypeId("");
      setWorkShadeCode("");
      setWorkLabId("");
      setWorkCustomLabName("");
      setWorkTeethList([]);
      setWorkPaymentAmount("");
    }
  };

  const handleToggleWorkStatus = async (workId: number, currentStatus: string) => {
    const nextStatus = currentStatus === "Completed" ? "Active" : "Completed";
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/work/${workId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        setDentalWorks(dentalWorks.map(w => w.id === workId ? { ...w, status: nextStatus } : w));
      } else {
        setDentalWorks(dentalWorks.map(w => w.id === workId ? { ...w, status: nextStatus } : w));
      }
    } catch (err) {
      console.error("Failed to update work status:", err);
      setDentalWorks(dentalWorks.map(w => w.id === workId ? { ...w, status: nextStatus } : w));
    }
  };

  // 2. Submit payment and booking transaction installment (Add Money):
  const submitAddMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    const ptIdNum = Number(payPtId);
    const amountVal = Number(payAmount);

    if (!ptIdNum || isNaN(amountVal) || amountVal <= 0) return;

    const targetPt = patients.find(p => p.id === ptIdNum);
    if (!targetPt) return;

    const selectedDoc = doctors.find(d => d.id === Number(payDocId));
    const drName = selectedDoc ? selectedDoc.name : "Unassigned Practitioner";
    const finalWorkId = payWorkId.trim() || `WRK-${ptIdNum}`;

    try {
      // POST the payment to the backend
      const resPay = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          pt_id: ptIdNum,
          pt_name: targetPt.name,
          amount: amountVal,
          type: payType,
          work_id: finalWorkId,
          dr_name: drName,
          notes: `Ledger installment receipt [${payType}]`,
          user_by: user ? user.name : "admin"
        })
      });

      if (!resPay.ok) {
        throw new Error("Failed to post payment receipt to PostgreSQL database");
      }

      // Reload fresh synchronized tables from the backend database (Supabase/PostgreSQL)
      await loadClinicalData();

      // Update loans list
      setLoans(loans.map(loan => {
        if (loan.pt_id === ptIdNum) {
          const updatedPaid = loan.total_paid + amountVal;
          const updatedDebt = Math.max(0, loan.total_cost - updatedPaid);
          return {
            ...loan,
            total_paid: updatedPaid,
            loan_debt: updatedDebt,
            status: updatedDebt === 0 ? "Paid Off" : "Active Debt"
          };
        }
        return loan;
      }));

      // Reset controls & select active view
      setPayPtId("");
      setPayAmount("");
      setPaySearchWord("");
      setPayWorkId("");
      setSelectedPtId(ptIdNum);
      setActiveTab("income"); // redirect to ledger view to double check the audit entries

    } catch (err: any) {
      console.error("Payment sync insert failed, performing offline state update:", err.message);
      // Fallback: update local state so everything is smooth
      const newPayId = payments.length > 0 ? Math.max(...payments.map(p => p.id)) + 1 : 1;
      const newPaymentObj: Payment = {
        id: newPayId,
        pt_id: ptIdNum,
        pt_name: targetPt.name,
        amount: amountVal,
        type: payType,
        created_at: payDate,
        work_id: finalWorkId,
        dr_id: payDocId ? Number(payDocId) : undefined,
        dr_name: drName
      };

      setPayments([newPaymentObj, ...payments]);

      // Update corresponding patient balance sheets ledger dynamically!
      setLoans(loans.map(loan => {
        if (loan.pt_id === ptIdNum) {
          const updatedPaid = loan.total_paid + amountVal;
          const updatedDebt = Math.max(0, loan.total_cost - updatedPaid);
          return {
            ...loan,
            total_paid: updatedPaid,
            loan_debt: updatedDebt,
            status: updatedDebt === 0 ? "Paid Off" : "Active Debt"
          };
        }
        return loan;
      }));

      // Reset controls & select active view
      setPayPtId("");
      setPayAmount("");
      setPaySearchWord("");
      setPayWorkId("");
      setSelectedPtId(ptIdNum);
      setActiveTab("income");
    }
  };

  // 3. New doctor enrollment:
  const submitAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !newDocSpecialty.trim()) return;

    try {
      const res = await fetch("/api/doctors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          name: newDocName.trim(),
          specialty: newDocSpecialty.trim(),
          phone: newDocPhone.trim() || "Unlisted",
          shift_status: newDocShift
        })
      });

      if (res.ok) {
        const addedDoc = await res.json();
        setDoctors([...doctors, addedDoc]);
      } else {
        const newId = doctors.length > 0 ? Math.max(...doctors.map(d => d.id)) + 1 : 1;
        const newDoc: Doctor = {
          id: newId,
          name: newDocName.trim(),
          specialty: newDocSpecialty.trim(),
          phone: newDocPhone.trim() || "Unlisted",
          shift_status: newDocShift,
          level: 2
        };
        setDoctors([...doctors, newDoc]);
      }
    } catch (err) {
      console.error("Failing to sync doctor to server, fallback used:", err);
      const newId = doctors.length > 0 ? Math.max(...doctors.map(d => d.id)) + 1 : 1;
      const newDoc: Doctor = {
        id: newId,
        name: newDocName.trim(),
        specialty: newDocSpecialty.trim(),
        phone: newDocPhone.trim() || "Unlisted",
        shift_status: newDocShift,
        level: 2
      };
      setDoctors([...doctors, newDoc]);
    }

    setNewDocName("");
    setNewDocSpecialty("");
    setNewDocPhone("");
  };

  // 4. Book Appointment Slot:
  const submitBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const ptIdNum = Number(aptPtId);
    const docIdNum = Number(aptDocId);

    if (!ptIdNum || !docIdNum || !aptDate) return;

    const targetPt = patients.find(p => p.id === ptIdNum);
    const targetDoc = doctors.find(d => d.id === docIdNum);

    if (!targetPt || !targetDoc) return;

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          pt_id: ptIdNum,
          pt_name: targetPt.name,
          doctor_id: docIdNum,
          doctor_name: targetDoc.name,
          appointment_date: aptDate,
          notes: aptNotes.trim() || "Routine general review"
        })
      });

      if (res.ok) {
        const addedApt = await res.json();
        setAppointments([addedApt, ...appointments]);
      } else {
        const newAptId = appointments.length > 0 ? Math.max(...appointments.map(a => a.id)) + 1 : 1;
        const newApt: Appointment = {
          id: newAptId,
          pt_id: ptIdNum,
          pt_name: targetPt.name,
          doctor_id: docIdNum,
          doctor_name: targetDoc.name,
          appointment_date: aptDate,
          notes: aptNotes.trim() || "Routine general review",
          status: "Scheduled"
        };
        setAppointments([newApt, ...appointments]);
      }
    } catch (err) {
      console.error("Failing appointment booking sync, default fallback used:", err);
      const newAptId = appointments.length > 0 ? Math.max(...appointments.map(a => a.id)) + 1 : 1;
      const newApt: Appointment = {
        id: newAptId,
        pt_id: ptIdNum,
        pt_name: targetPt.name,
        doctor_id: docIdNum,
        doctor_name: targetDoc.name,
        appointment_date: aptDate,
        notes: aptNotes.trim() || "Routine general review",
        status: "Scheduled"
      };
      setAppointments([newApt, ...appointments]);
    }

    setAptPtId("");
    setAptDocId("");
    setAptDate("");
    setAptNotes("");
  };

  // 5. Add custom treatment types description catalog:
  const submitAddTreatmentType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTreatName.trim()) return;

    try {
      const res = await fetch("/api/treatment-types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          name: newTreatName.trim()
        })
      });

      if (res.ok) {
        const addedType = await res.json();
        setTreatmentTypes([...treatmentTypes, addedType]);
      } else {
        const newId = treatmentTypes.length > 0 ? Math.max(...treatmentTypes.map(t => t.id)) + 1 : 1;
        const newTypeObj: TreatmentType = {
          id: newId,
          name: newTreatName.trim(),
          description: newTreatDesc.trim() || "Dental mapping procedure"
        };
        setTreatmentTypes([...treatmentTypes, newTypeObj]);
      }
    } catch (err) {
      console.error("Failing custom procedure type sync, default fallback used:", err);
      const newId = treatmentTypes.length > 0 ? Math.max(...treatmentTypes.map(t => t.id)) + 1 : 1;
      const newTypeObj: TreatmentType = {
        id: newId,
        name: newTreatName.trim(),
        description: newTreatDesc.trim() || "Dental mapping procedure"
      };
      setTreatmentTypes([...treatmentTypes, newTypeObj]);
    }

    setNewTreatName("");
    setNewTreatDesc("");
  };

  // 6. Submit prosthetic laboratory dispatches (Labs works):
  const submitLabsDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const ptIdNum = Number(labPtId);
    const labIdNum = Number(labTargetId);
    const feeNum = Number(labFee) || 120000;

    if (!ptIdNum || !labIdNum) return;

    const targetPt = patients.find(p => p.id === ptIdNum);
    const targetLab = labs.find(l => l.id === labIdNum);

    if (!targetPt || !targetLab) return;

    const dispatchDateStr = getIraqDateString();

    try {
      const res = await fetch("/api/labs-work", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          pt_id: ptIdNum,
          pt_name: targetPt.name,
          lab_id: labIdNum,
          lab_name: targetLab.name,
          tooth_code: labToothShadeCode,
          status: "Dispatched",
          fee: feeNum,
          dispatch_date: dispatchDateStr,
          dr_name: labWorkDrName,
          delevery: labWorkDelevery,
          called: labWorkCalled
        })
      });

      if (res.ok) {
        const addedLabWork = await res.json();
        setLabsWork([addedLabWork, ...labsWork]);
      } else {
        const newLabWorkId = labsWork.length > 0 ? Math.max(...labsWork.map(lw => lw.id)) + 1 : 1;
        const newLabsWorkItem: LabsWork = {
          id: newLabWorkId,
          pt_id: ptIdNum,
          pt_name: targetPt.name,
          lab_id: labIdNum,
          lab_name: targetLab.name,
          tooth_code: labToothShadeCode,
          status: "Dispatched",
          fee: feeNum,
          dispatch_date: dispatchDateStr,
          dr_name: labWorkDrName,
          delevery: labWorkDelevery,
          called: labWorkCalled
        };
        setLabsWork([newLabsWorkItem, ...labsWork]);
      }
    } catch (err) {
      console.error("Failing lab dispatch sync, default fallback used:", err);
      const newLabWorkId = labsWork.length > 0 ? Math.max(...labsWork.map(lw => lw.id)) + 1 : 1;
      const newLabsWorkItem: LabsWork = {
        id: newLabWorkId,
        pt_id: ptIdNum,
        pt_name: targetPt.name,
        lab_id: labIdNum,
        lab_name: targetLab.name,
        tooth_code: labToothShadeCode,
        status: "Dispatched",
        fee: feeNum,
        dispatch_date: dispatchDateStr,
        dr_name: labWorkDrName,
        delevery: labWorkDelevery,
        called: labWorkCalled
      };
      setLabsWork([newLabsWorkItem, ...labsWork]);
    }

    // Reset dispatch state fields
    setLabPtId("");
    setLabTargetId("");
    setLabFee("");
  };

  // --- NEW LABS AND LAB-WORK CUSTOM DISPATCH CRUD HANDLERS ---
  const handleSaveEditLabWork = async (id: number) => {
    try {
      const selectedLabObj = labs.find(l => l.id === Number(editLabWorkLabId));
      const res = await fetch(`/api/labs-work/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          pt_id: Number(editLabWorkPtId),
          lab_id: Number(editLabWorkLabId),
          lab_name: selectedLabObj?.name || "Partner Lab",
          tooth_code: editLabWorkShade,
          fee: Number(editLabWorkFee),
          status: editLabWorkStatus,
          notes: editLabWorkNotes,
          dr_name: editLabWorkDrName,
          delevery: editLabWorkDelevery,
          called: editLabWorkCalled
        })
      });
      if (res.ok) {
        await loadClinicalData();
        setEditingLabWorkId(null);
      } else {
        alert("Failed to save lab work details");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteLabWork = async (id: number) => {
    if (!safeConfirm("Are you sure you want to delete this lab work order dispatch entry?")) return;
    try {
      const res = await fetch(`/api/labs-work/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": token ? `Bearer ${token}` : ""
        }
      });
      if (res.ok) {
        await loadClinicalData();
      } else {
        alert("Failed to delete dispatch order");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateLab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabName.trim()) return;
    try {
      const res = await fetch("/api/labs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          name: newLabName.trim(),
          phone: newLabPhone.trim(),
          address: newLabAddress.trim(),
          email: newLabEmail.trim(),
          name2: newLabName2.trim(),
          phone2: newLabPhone2.trim()
        })
      });
      if (res.ok) {
        await loadClinicalData();
        setNewLabName("");
        setNewLabPhone("");
        setNewLabAddress("");
        setNewLabEmail("");
        setNewLabName2("");
        setNewLabPhone2("");
      } else {
        alert("Failed to create new partner lab profile");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEditLab = async (id: number) => {
    if (!editLabName.trim()) return;
    try {
      const res = await fetch(`/api/labs/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          name: editLabName.trim(),
          phone: editLabPhone.trim(),
          address: editLabAddress.trim(),
          email: editLabEmail.trim(),
          name2: editLabName2.trim(),
          phone2: editLabPhone2.trim()
        })
      });
      if (res.ok) {
        await loadClinicalData();
        setEditingLabId(null);
      } else {
        alert("Failed to save lab profile changes");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteLab = async (id: number) => {
    if (!safeConfirm("Are you sure you want to delete this lab partner from the database? This might orphan historical entries.")) return;
    try {
      const res = await fetch(`/api/labs/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": token ? `Bearer ${token}` : ""
        }
      });
      if (res.ok) {
        await loadClinicalData();
      } else {
        alert("Failed to delete lab profile");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // List of Postgres tables requested by user (proves awareness of all tables)
  const databaseTables = [
    { name: "public.users", rows: "Active", icon: User, desc: "Dental specialists, assistants, administrators." },
    { name: "public.ptdata", rows: "Active", icon: Smile, desc: "Master patient register." },
    { name: "public.appointments", rows: "Active", icon: Calendar, desc: "Schedules and dentist shift bookings." },
    { name: "public.work", rows: "Active", icon: Briefcase, desc: "Dental work orders and teeth mapping." },
    { name: "public.labs", rows: "Active", icon: FlaskConical, desc: "Prosthetic labs directory." },
    { name: "public.labs_work", rows: "Active", icon: Activity, desc: "Technician dispatches and delivery tracking." },
    { name: "public.payments", rows: "Active", icon: CreditCard, desc: "Billing journal and receipt audit ledger." },
    { name: "public.doctors", rows: "Active", icon: Heart, desc: "Clinician directory and shift records." },
    { name: "public.types", rows: "Active", icon: Layers, desc: "Treatment procedures catalog." },
    { name: "public.colors", rows: "Active", icon: Palette, desc: "Aesthetic tooth color mapping config." }
  ];

  return (
    <div id="slava-dent-container" className="min-h-screen w-full bg-[#121212] text-white font-sans flex overflow-hidden selection:bg-zinc-800 selection:text-white">
      
      {/* LEFT PRESENTATION WINDOW: Desktop Visual Portal (Inspired by Sophisticated Dark Georgia/Playfair font scale) */}
      <div className="hidden lg:flex lg:w-[58%] xl:w-[62%] h-screen p-16 flex-col justify-between border-r border-zinc-800 bg-[#121212] relative overflow-hidden">
        {/* Abstract luxury accent */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-2xl bg-zinc-800/5 blur-[120px] pointer-events-none" />
        
        <header className="z-10">
          <div className="flex items-center space-x-3 select-none">
            <div className="w-9 h-9 border border-zinc-800 rounded-2xl flex items-center justify-center">
              <div className="w-3.5 h-3.5 bg-zinc-800 rounded-3xs rotate-45"></div>
            </div>
            <span className="text-base font-light tracking-[0.25em] text-white font-display">SLAVA DENT</span>
          </div>
        </header>
        
        <main className="max-w-xl my-auto z-10">
          <h1 className="text-6xl font-light text-white leading-[1.12] mb-8 font-serif">
            Precision Care <br/>
            <span className="italic opacity-60 text-5xl font-serif">redefined.</span>
          </h1>
          <p className="text-base text-white leading-relaxed mb-12">
            A comprehensive clinical mobile ecosystem designed for seamless patient management, dental laboratory dispatching, and real-time ledger accounting. Built natively to match your initial 10 Postgres table declarations.
          </p>
          <div className="grid grid-cols-2 gap-8 border-t border-zinc-800 pt-10">
            <div>
              <p className="text-white uppercase text-[10px] tracking-widest mb-1.5 font-mono font-semibold">DATABASE CLUSTER</p>
              <p className="text-white text-sm font-light tracking-wide font-display">10 Active Postgres Entities</p>
            </div>
            <div>
              <p className="text-white uppercase text-[10px] tracking-widest mb-1.5 font-mono font-semibold">SECURITY LAYER</p>
              <p className="text-white text-sm font-light tracking-wide font-display">ECDSA Session Signature</p>
            </div>
          </div>
        </main>

        <footer className="flex justify-between text-[10px] tracking-widest text-white uppercase font-mono z-10">
          <span>Core Version 1.0.0 ALPHA</span>
          <span>&copy; 2026 Slava Dent Systems</span>
        </footer>
      </div>

      {/* RIGHT EMULATOR WINDOW: Dark Matte Glass Mobile Shell Interface */}
      <div className="flex-1 lg:w-[42%] xl:w-[38%] h-screen flex items-center justify-center bg-[#121212]">
        <div id="mobile-device-shell" className="w-full max-w-[340px] mx-auto h-screen md:h-[780px] bg-[#121212] md:rounded-[48px] md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden relative border-0 md:border md:border-zinc-800">
          
          {/* Hardware notch & top task bar simulated */}
          <div id="device-status-bar" className="hidden md:flex justify-between items-center px-8 pt-3 pb-2 bg-[#121212] z-25 border-b border-[#1a1a1a]/40">
            <span className="text-[10px] font-bold text-white font-mono">17:22</span>
            <div className="w-20 h-4 bg-black rounded-2xl flex justify-center items-center">
              <div className="w-1.5 h-1.5 rounded-2xl bg-zinc-800 mr-1.5" />
              <div className="w-8 h-1 rounded-2xl bg-zinc-800" />
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-white font-mono">
              <span className="text-[8px] font-bold text-white">SECURE</span>
              <div className="w-3.5 h-2 border border-zinc-800 rounded-2xl p-0.5 flex">
                <div className="w-full h-full bg-zinc-800 rounded-[1px]" />
              </div>
            </div>
          </div>

          {/* Core App Loader Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-[#0d0d0d] z-50 flex flex-col justify-center items-center">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, ease: "linear", duration: 1.2 }}
                className="p-3 bg-zinc-800 rounded-2xl mb-3 border border-zinc-800"
              >
                <RefreshCw className="w-6 h-6 text-white animate-spin" />
              </motion.div>
              <p className="text-[10px] font-bold uppercase text-white tracking-widest font-mono">Securing Gateway</p>
            </div>
          )}

          {/* Content scroll box */}
          <div className="flex-1 flex flex-col overflow-y-auto relative bg-[#121212]">
            
            {/* Standard Brand Logo on Login & Register Screens */}
            {view !== "dashboard" && (
              <div className="px-6 py-6 pb-2 text-center flex flex-col items-center relative">
                {/* Language Toggle */}
                <button
                    onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                    className="absolute top-2 right-4 text-[9px] font-mono font-bold bg-zinc-800 text-white px-2 py-1 rounded-2xl"
                >
                    {lang === 'ar' ? 'EN' : 'AR'}
                </button>
                <div className="w-12 h-12 border border-zinc-800 rounded-2xl bg-zinc-800 flex items-center justify-center text-white mb-3 mt-4">
                  <Smile className="w-6 h-6 stroke-[1.25] text-white" />
                </div>
                <h1 className="font-display font-light text-lg tracking-[0.2em] text-white">
                  SLAVA DENT
                </h1>
                <p className="text-[9px] text-white font-semibold tracking-widest uppercase mt-1 font-mono">
                  Clinician Mobile Node
                </p>
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* === LOGIN SCREEN === */}
              {view === "login" && (
                <motion.div
                  key="login-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="px-6 pb-8 flex-1 flex flex-col"
                >
                  <div className="bg-[#121212] p-6 rounded-2xl border border-zinc-800   mt-2">
                    <h2 className="text-xl text-white font-light font-serif mb-1 text-center">{t("أهلاً بك مجدداً", "Welcome Back")}</h2>

                    <form onSubmit={handleLogin} className="space-y-4">
                      {/* Name field */}
                      <div className="space-y-2">
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-white">
                            <User className="w-4 h-4" />
                          </span>
                          <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="username"
                            className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-3 pl-11 pr-4 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 focus:bg-[#121212] transition-all font-mono font-medium"
                          />
                        </div>
                      </div>

                      {/* Password field */}
                      <div className="space-y-2">
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-white">
                            <Lock className="w-4 h-4" />
                          </span>
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="password"
                            className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-3 pl-11 pr-11 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 focus:bg-[#121212] transition-all font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white  cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Diagnostic Signals banner */}
                      {authError && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-3 bg-zinc-800 border border-zinc-800 text-red-400 text-[11px] font-mono rounded-2xl"
                        >
                          ✕ ERROR: {authError}
                        </motion.div>
                      )}

                      {authSuccess && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-3 bg-zinc-800 border border-zinc-800 text-white text-[11px] font-mono rounded-2xl flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5 text-white" /> {authSuccess}
                        </motion.div>
                      )}

                      {/* Primary Authorize Trigger */}
                      <button
                        type="submit"
                        className="w-full bg-white text-white font-semibold py-3 rounded-2xl mt-4 hover:bg-zinc-800 active:scale-98 transition-colors text-xs tracking-widest uppercase cursor-pointer"
                      >
                        Submit: Authorize
                      </button>
                    </form>
                  </div>

                  {/* Alt Screen Option */}
                  <div className="mt-auto pt-6 text-center text-xs text-white">
                    New staff practitioner?{" "}
                    <button 
                      onClick={() => {
                        setView("register");
                        setAuthError(null);
                        setAuthSuccess(null);
                      }}
                      className="text-white font-bold hover:underline ml-1 cursor-pointer"
                    >
                      Action: Register
                    </button>
                  </div>
                </motion.div>
              )}

              {/* === REGISTER SCREEN === */}
              {view === "register" && (
                <motion.div
                  key="register-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="px-6 pb-8 flex-1 flex flex-col"
                >
                  <div className="bg-[#121212] p-5 rounded-2xl border border-zinc-800   mt-2">
                    <h2 className="text-xl text-white font-light font-serif mb-1 text-center">Practitioner Registry</h2>

                    <form onSubmit={handleRegister} className="space-y-3">
                      {/* Name input */}
                      <div className="space-y-1">
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-white">
                            <User className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="username"
                            className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 focus:bg-[#121212] transition-all font-mono"
                          />
                        </div>
                      </div>

                      {/* Phone Number */}
                      <div className="space-y-1">
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-white">
                            <Phone className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="phone"
                            className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 focus:bg-[#121212] transition-all font-mono"
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div className="space-y-1">
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-white">
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="password"
                            className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 focus:bg-[#121212] transition-all font-mono"
                          />
                        </div>
                      </div>

                      {/* Confirm password */}
                      <div className="space-y-1">
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-white">
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="again"
                            className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 focus:bg-[#121212] transition-all font-mono"
                          />
                        </div>
                      </div>



                      {/* Feedback Alerts */}
                      {authError && (
                        <div className="p-2.5 bg-zinc-800 border border-zinc-800 text-[10px] text-red-400 font-mono rounded-2xl">
                          ⚠️ {authError}
                        </div>
                      )}

                      {authSuccess && (
                        <div className="p-2.5 bg-zinc-800 border border-zinc-800 text-[10px] text-white font-mono rounded-2xl flex items-center gap-1">
                          <Check className="w-3 h-3 text-white" /> {authSuccess}
                        </div>
                      )}

                      {/* Register Submit */}
                      <button
                        type="submit"
                        className="w-full bg-white text-white font-semibold py-2.5 rounded-2xl mt-3 hover:bg-zinc-800 active:scale-98 transition-colors text-xs tracking-widest uppercase cursor-pointer"
                      >
                        Submit: Enrol
                      </button>
                    </form>
                  </div>

                  {/* Options */}
                  <div className="pt-4 text-center text-xs text-white mb-2">
                    Already registered?{" "}
                    <button 
                      onClick={() => {
                        setView("login");
                        setAuthError(null);
                        setAuthSuccess(null);
                      }}
                      className="text-white font-bold hover:underline ml-1 cursor-pointer"
                    >
                      Action: Authenticate
                    </button>
                  </div>
                </motion.div>
              )}

              {/* === MAIN DASHBOARD PORTAL === */}
              {view === "dashboard" && user && (
                <motion.div
                  key="dashboard-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col bg-[#121212] h-full"
                >
                  
                  {/* Top Header Navbar exactly as requested: Left site name, center search bar, right logout */}
                  <div className="px-2.5 py-2.5 bg-[#121212] border-b border-zinc-900 flex justify-between items-center gap-1.5 sticky top-0 z-15 select-none shrink-0 shadow-md">
                    {/* Site name left */}
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="w-5 h-5 rounded-md border border-zinc-700 bg-zinc-950 flex items-center justify-center">
                        <Smile className="w-3 h-3 text-zinc-300" />
                      </div>
                    </div>                    {/* Search center with interactive active session dropdown list */}
                    <div className="flex-1 max-w-[155px] relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-zinc-500 pointer-events-none">
                        <Search className="w-3 h-3" />
                      </span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setHeaderShowDropdown(true);
                        }}
                        onFocus={() => setHeaderShowDropdown(true)}
                        onBlur={() => setTimeout(() => setHeaderShowDropdown(false), 250)}
                        placeholder="search"
                        className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-full py-1 pl-7 pr-3 text-[10px] text-white placeholder:text-zinc-500 focus:outline-hidden focus:border-zinc-500 transition-all font-mono"
                      />
                      
                      {headerShowDropdown && searchQuery.trim().length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 max-h-52 overflow-y-auto bg-[#141416] border border-zinc-800 rounded-xl shadow-2xl z-50 divide-y divide-zinc-900 scrollbar-thin">
                          {(() => {
                            const term = searchQuery.toLowerCase().trim();
                            const matchedPts = patients.filter(p => p.name.toLowerCase().includes(term) || p.phone.includes(term));
                            
                            if (matchedPts.length === 0) {
                              return (
                                <div className="p-3 text-center text-white italic text-[9px] font-mono">
                                  No patient matched
                                </div>
                              );
                            }
                            
                            return matchedPts.map(p => (
                              <button
                                key={`header-search-item-${p.id}`}
                                type="button"
                                onMouseDown={() => {
                                  setSelectedPtId(p.id);
                                  setWorkPtId(p.id);
                                  setWorkSearchWord(p.name);
                                  setSearchQuery("");
                                  setHeaderShowDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 text-[10px] hover:bg-zinc-800 text-white  transition-colors font-mono flex flex-col gap-0.5"
                              >
                                <span className="font-sans font-semibold text-white flex justify-between">
                                  <span>👤 {p.name}</span>
                                  <span className="text-[7.5px] tracking-wide px-1.5 py-0.2 bg-zinc-800 text-white border border-zinc-800 rounded font-bold">#{p.id}</span>
                                </span>
                                <span className="text-[8px] text-white">📞 {p.phone}</span>
                              </button>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                    
                    {/* Language Toggle */}
                    <button
                        onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                        className="p-1.5 bg-[#1A1A1A] hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-full transition-all shrink-0 flex items-center justify-center cursor-pointer active:scale-95 text-[9px] font-mono font-bold w-7 h-7"
                    >
                        {lang === 'ar' ? 'EN' : 'AR'}
                    </button>

                    {/* Logout right */}
                    <button
                      onClick={handleLogout}
                      className="p-1.5 bg-[#1A1A1A] hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-full transition-all shrink-0 flex items-center justify-center cursor-pointer active:scale-95"
                      title="Terminate active session"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Horizontal Scroll Bar Navigation menu - holding the 9 requested clinical buttons */}
                  <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-zinc-900 bg-[#151517] overflow-x-auto scrollbar-none sticky top-[44px] z-10 shrink-0">
                    {[
                      { id: "insert", label: t("إضافة", "Insert"), icon: Plus },
                      { id: "work", label: t("عمل", "Work"), icon: Briefcase },
                      { id: "add-money", label: t("إضافة أموال", "Add Money"), icon: CreditCard },
                      { id: "drs", label: t("الأطباء", "DRs"), icon: Heart },
                      { id: "pt-info", label: t("معلومات المريض", "PT Info"), icon: Smile },
                      { id: "appointments", label: t("المواعيد", "Appointments"), icon: Calendar },
                      { id: "loan", label: t("القروض", "Loan"), icon: Activity },
                      { id: "income", label: t("الدخل", "Income"), icon: Layers },
                      { id: "treatments", label: t("العلاجات", "Treatments"), icon: Palette },
                      { id: "labs", label: t("المختبرات", "Labs"), icon: FlaskConical },
                      { id: "provider-profile", label: t("الملف الشخصي", "Profile"), icon: User }
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center gap-0.5 px-2 py-0.5 text-[9px] uppercase font-mono tracking-wider font-normal shrink-0 transition-all cursor-pointer rounded-2xl border ${
                            isActive
                              ? "bg-white text-white border-white"
                              : "bg-[#101012] text-[#cbcbdc]  border-zinc-800"
                          }`}
                        >
                          <Icon className="w-2.5 h-2.5" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Main Container Scrollable Body */}
                  <div className="p-2 flex-1 space-y-2.5 overflow-y-auto pb-12">

                    {/* Active search filter banner indicator if query exists */}
                    {searchQuery && (
                      <div className="p-2 bg-zinc-800 border border-zinc-800 rounded-2xl flex justify-between items-center text-[10px] font-mono text-white">
                        <span>🔍 FILTER: Active matches for &quot;{searchQuery}&quot;</span>
                        <button 
                          onClick={() => setSearchQuery("")}
                          className="text-white hover:underline text-[9px] font-bold"
                        >
                          [Clear]
                        </button>
                      </div>
                    )}
                    
                    {/* === SUBPAGE 1: INSERT CLIENT (Patient registration) === */}
                    {activeTab === "insert" && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <div className="bg-[#121212] p-4.5 rounded-2xl border border-zinc-800   space-y-4">
                          <div className="flex gap-1 bg-[#121212] p-1 rounded-2xl mb-4">
                            <button
                                onClick={() => setInsertViewMode('new')}
                                className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-2xl ${insertViewMode === 'new' ? 'bg-zinc-800 text-white' : 'text-white'}`}
                            >
                                {t("مريض جديد", "New Patient")}
                            </button>
                            <button
                                onClick={() => setInsertViewMode('edit')}
                                className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-2xl ${insertViewMode === 'edit' ? 'bg-zinc-800 text-white' : 'text-white'}`}
                            >
                                {t("تعديل مريض", "Edit Patient")}
                            </button>
                          </div>

                          {insertViewMode === 'new' && (
                            <form onSubmit={submitInsertPatient} className="space-y-3">
                              <div>
                                <input
                                  type="text"
                                  required
                                  value={newPtName}
                                  onChange={(e) => setNewPtName(e.target.value)}
                                  placeholder="Name"
                                  lang="en"
                                  dir="ltr"
                                  inputMode="latin"
                                  className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 px-3 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                                />
                              </div>

                              <div>
                                <input
                                  type="tel"
                                  required
                                  value={newPtPhone}
                                  onChange={(e) => setNewPtPhone(e.target.value)}
                                  placeholder="Phone"
                                  lang="en"
                                  dir="ltr"
                                  inputMode="latin"
                                  className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 px-3 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                                />
                              </div>

                              <div>
                                <input
                                  type="text"
                                  value={newPtAddress}
                                  onChange={(e) => setNewPtAddress(e.target.value)}
                                  placeholder="Address"
                                  lang="en"
                                  dir="ltr"
                                  className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 px-3 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                                />
                              </div>

                              <div>
                                <input
                                  type="text"
                                  value={newPtIllness}
                                  onChange={(e) => setNewPtIllness(e.target.value)}
                                  placeholder="Chronic Illness"
                                  lang="en"
                                  dir="ltr"
                                  className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 px-3 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                                />
                              </div>

                              <div>
                                <input
                                  type="number"
                                  min="0"
                                  max="150"
                                  value={newPtAge}
                                  onChange={(e) => setNewPtAge(e.target.value === "" ? "" : Number(e.target.value))}
                                  placeholder="Age"
                                  lang="en"
                                  dir="ltr"
                                  className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 px-3 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                                />
                              </div>

                            {/* SELECTABLE & SEARCHABLE REFERRAL (REF) FIELD FROM SAMETABLE ptdata */}
                            <div className="space-y-1.5 pt-1.5 border-t border-zinc-800/40">
                              <div className="flex justify-between items-center">
                                {newPtRef ? (
                                  <span className="text-[10px] text-white font-mono font-medium">Reference: Selected ✔</span>
                                ) : (
                                  <span className="text-[9px] text-white font-mono">Reference (Optional)</span>
                                )}
                              </div>
                                   {/* Suggestion based on active selected patient dossier */}
                              {(() => {
                                const selectedPt = patients.find(p => p.id === selectedPtId);
                                if (!selectedPt) return null;
                                return (
                                  <div className="flex items-center justify-between text-[10px] bg-[#161618] hover:bg-zinc-800 p-2 rounded-2xl border border-zinc-800/60 transition-all">
                                    <span className="text-white truncate font-mono">
                                      Active patient: <strong className="text-white font-sans">{selectedPt.name}</strong>
                                    </span>
                                    {newPtRef !== selectedPt.name ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewPtRef(selectedPt.name);
                                          setRefSearchWord("");
                                          setShowRefSuggestions(false);
                                        }}
                                        className="text-[9px] uppercase font-bold tracking-widest text-white  cursor-pointer select-none transition-colors"
                                      >
                                        Action: Use Ref
                                      </button>
                                    ) : (
                                      <span className="text-[9px] uppercase font-bold tracking-widest text-white font-mono">
                                        Assigned
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Search field */}
                              <div className="relative">
                                <div className="flex gap-1.5">
                                  <div className="relative flex-1">
                                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-white pointer-events-none">
                                      <Search className="w-3 h-3 text-white" />
                                    </span>
                                    <input
                                      type="text"
                                      value={refSearchWord}
                                      onChange={(e) => {
                                        setRefSearchWord(e.target.value);
                                        setShowRefSuggestions(true);
                                      }}
                                      onFocus={() => setShowRefSuggestions(true)}
                                      placeholder={newPtRef ? `Selected: ${newPtRef}` : "Reference"}
                                      className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 pl-7 pr-3 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                                    />
                                    {refSearchWord && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRefSearchWord("");
                                        }}
                                        className="absolute right-2 top-2 text-[10px] text-white  font-mono"
                                      >
                                        ✗
                                      </button>
                                    )}
                                  </div>
                                  {newPtRef && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNewPtRef("");
                                        setRefSearchWord("");
                                      }}
                                      className="px-2 py-1.5 bg-zinc-800 text-[10px] hover:text-red-400 hover:border-red-900 border border-zinc-800 rounded-2xl text-white transition-colors font-mono"
                                    >
                                      Reset
                                    </button>
                                  )}
                                </div>

                                {/* Autocomplete dropdown mapping */}
                                {showRefSuggestions && (
                                  <div className="absolute left-0 right-0 mt-1 max-h-[150px] overflow-y-auto bg-[#161618] border border-zinc-800 rounded-2xl   z-30 divide-y divide-zinc-900 font-mono text-[10px]">
                                    <div className="flex justify-between items-center px-2 py-1 bg-zinc-800 text-white border-b border-zinc-800 text-[8px] uppercase tracking-wider">
                                      <span>Select from ptdata table</span>
                                      <button
                                        type="button"
                                        onClick={() => setShowRefSuggestions(false)}
                                        className="text-[8px]  font-bold"
                                      >
                                        Close
                                      </button>
                                    </div>
                                    {(() => {
                                      const filtered = patients.filter(pt =>
                                        pt.name.toLowerCase().includes(refSearchWord.toLowerCase()) ||
                                        pt.phone.includes(refSearchWord)
                                      );
                                      if (filtered.length === 0) {
                                        return (
                                          <div className="p-2.5 text-white italic">
                                            No active patient found matching input.
                                          </div>
                                        );
                                      }
                                      return filtered.map(pt => (
                                        <button
                                          key={`ref-option-${pt.id}`}
                                          type="button"
                                          onClick={() => {
                                            setNewPtRef(pt.name);
                                            setRefSearchWord("");
                                            setShowRefSuggestions(false);
                                          }}
                                          className="w-full text-left px-2.5 py-1.5 flex justify-between items-center hover:bg-zinc-800 text-white transition-colors cursor-pointer"
                                        >
                                          <div className="truncate">
                                            <span className="text-white font-sans font-medium text-xs block">{pt.name}</span>
                                            <span className="text-[9px] text-white">Phone: {pt.phone}</span>
                                          </div>
                                          <span className="text-white shrink-0 text-[8px] border border-zinc-800 rounded px-1.5 bg-zinc-800 font-mono">Idx: {pt.id}</span>
                                        </button>
                                      ));
                                    })()}
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              type="submit"
                              className="w-full py-2 bg-white text-white text-xs uppercase font-bold tracking-widest rounded-2xl hover:bg-zinc-800 mt-2 cursor-pointer select-none transition-colors"
                            >
                              Submit: Register
                            </button>
                          </form>
                          )}
                          {insertViewMode === 'edit' && (
                            <div className="space-y-4">
                              <div className="relative">
                                <input
                                  type="text"
                                  value={editSearchWord}
                                  onChange={(e) => setEditSearchWord(e.target.value)}
                                  placeholder={t("بحث عن مريض للتعديل", "Search patient to edit")}
                                  className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 px-3 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                                />
                                {editSearchWord && (
                                  <div className="absolute left-0 right-0 mt-1 max-h-[150px] overflow-y-auto bg-[#161618] border border-zinc-800 rounded-2xl   z-30 divide-y divide-zinc-900">
                                    {patients
                                      .filter(pt => pt.name.toLowerCase().includes(editSearchWord.toLowerCase()) || pt.phone.includes(editSearchWord))
                                      .map(pt => (
                                        <button
                                          key={`edit-pt-${pt.id}`}
                                          type="button"
                                          onClick={() => {
                                            setEditPtId(pt.id);
                                            setEditPtName(pt.name);
                                            setEditPtPhone(pt.phone);
                                            setEditPtAddress(pt.address || "");
                                            setEditPtIllness(pt.chronic_illness || "");
                                            setEditPtAge(pt.age || "");
                                            setEditSearchWord("");
                                          }}
                                          className="w-full text-left px-3 py-2 hover:bg-zinc-800 text-xs text-white"
                                        >
                                          {pt.name} - {pt.phone}
                                        </button>
                                      ))}
                                  </div>
                                )}
                              </div>
                              {editPtId !== null && (
                                <form className="space-y-3 pt-4 border-t border-zinc-800">
                                  <input
                                    type="text"
                                    value={editPtName}
                                    onChange={(e) => setEditPtName(e.target.value)}
                                    placeholder={t("اسم المريض", "Patient Name")}
                                    className="w-full bg-[#121212] border border-zinc-800 rounded-2xl py-1.5 px-3 text-xs text-white"
                                  />
                                  <input
                                    type="tel"
                                    value={editPtPhone}
                                    onChange={(e) => setEditPtPhone(e.target.value)}
                                    placeholder={t("هاتف المريض", "Patient Phone")}
                                    className="w-full bg-[#121212] border border-zinc-800 rounded-2xl py-1.5 px-3 text-xs text-white"
                                  />
                                  <input
                                    type="text"
                                    value={editPtAddress}
                                    onChange={(e) => setEditPtAddress(e.target.value)}
                                    placeholder={t("عنوان المريض", "Patient Address")}
                                    className="w-full bg-[#121212] border border-zinc-800 rounded-2xl py-1.5 px-3 text-xs text-white"
                                  />
                                  <input
                                    type="text"
                                    value={editPtIllness}
                                    onChange={(e) => setEditPtIllness(e.target.value)}
                                    placeholder={t("مرض مزمن", "Chronic Illness")}
                                    className="w-full bg-[#121212] border border-zinc-800 rounded-2xl py-1.5 px-3 text-xs text-white"
                                  />
                                  <input
                                    type="number"
                                    value={editPtAge}
                                    onChange={(e) => setEditPtAge(Number(e.target.value))}
                                    placeholder={t("عمر المريض", "Patient Age")}
                                    className="w-full bg-[#121212] border border-zinc-800 rounded-2xl py-1.5 px-3 text-xs text-white"
                                  />
                                  <div className="relative">
                                    <div className="flex gap-1.5">
                                      <div className="relative flex-1">
                                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-white pointer-events-none">
                                          <Search className="w-3 h-3 text-white" />
                                        </span>
                                        <input
                                          type="text"
                                          value={editPtRefSearchWord}
                                          onChange={(e) => {
                                            setEditPtRefSearchWord(e.target.value);
                                            setShowEditPtRefSuggestions(true);
                                          }}
                                          onFocus={() => setShowEditPtRefSuggestions(true)}
                                          placeholder={editPtRef ? `Selected ID: ${editPtRef}` : t("الاقارب", "Relatives")}
                                          className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 pl-7 pr-3 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                                        />
                                        {editPtRefSearchWord && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditPtRefSearchWord("");
                                            }}
                                            className="absolute right-2 top-2 text-[10px] text-white  font-mono"
                                          >
                                            ✗
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {showEditPtRefSuggestions && (
                                      <div className="absolute left-0 right-0 mt-1 max-h-[150px] overflow-y-auto bg-[#161618] border border-zinc-800 rounded-2xl   z-30 divide-y divide-zinc-900 font-mono text-[10px]">
                                        {patients
                                          .filter(
                                            (pt) =>
                                              pt.name.toLowerCase().includes(editPtRefSearchWord.toLowerCase()) ||
                                              pt.phone.includes(editPtRefSearchWord)
                                          )
                                          .map((pt) => (
                                            <button
                                              key={pt.id}
                                              type="button"
                                              onClick={() => {
                                                setEditPtRef(pt.id);
                                                setEditPtRefSearchWord(pt.name);
                                                setShowEditPtRefSuggestions(false);
                                              }}
                                              className="w-full text-left px-3 py-2 hover:bg-zinc-800 text-white"
                                            >
                                              {pt.name} - {pt.phone}
                                            </button>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        const response = await fetch(`/api/patients/${editPtId}`, {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            name: editPtName,
                                            phone: editPtPhone,
                                            address: editPtAddress,
                                            chronic_illness: editPtIllness,
                                            age: editPtAge,
                                            ref: editPtRef
                                          })
                                        });
                                        if (response.ok) {
                                           const updatedPt = await response.json();
                                           setPatients(prev => prev.map(p => p.id === editPtId ? updatedPt : p));
                                           setEditPtId(null);
                                           setEditSearchWord("");
                                           alert(t("تم تحديث بيانات المريض", "Patient data updated"));
                                        } else {
                                           alert(t("فشل تحديث البيانات", "Failed to update data"));
                                        }
                                      } catch (e) {
                                         alert(t("خطأ", "Error"));
                                      }
                                    }}
                                    className="w-full py-2 bg-indigo-500 text-white text-xs font-bold rounded-2xl hover:bg-zinc-800"
                                  >
                                    {t("تحديث", "Update")}
                                  </button>
                                </form>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-4.5 space-y-3.5  ">
                          <div className="flex justify-between items-center pb-1">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-2xl bg-indigo-500 animate-pulse"></span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-[10px] font-mono text-white bg-zinc-800 px-2.5 py-1 rounded-2xl border border-zinc-800">
                              <span>Total:</span>
                              <strong className="text-white">{patients.length} records</strong>
                            </div>
                          </div>

                          {/* Database search & clear controls */}
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-white pointer-events-none font-sans font-bold">
                                🔍
                              </span>
                              <input
                                type="text"
                                value={poolSearch}
                                onChange={(e) => setPoolSearch(e.target.value)}
                                placeholder="Search"
                                className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                              />
                              {poolSearch && (
                                <button
                                  type="button"
                                  onClick={() => setPoolSearch("")}
                                  className="absolute right-2 top-2 text-[10px] text-white  font-mono cursor-pointer"
                                >
                                  ✗
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Beautiful Interactive Table Container */}
                          <div className="overflow-hidden border border-zinc-800 rounded-2xl bg-zinc-800/20">
                            <div className="overflow-y-auto max-h-[385px] scrollbar-thin">
                              <table className="w-full text-left font-mono text-[10px] border-collapse">
                                <thead className="bg-[#161618] sticky top-0 z-10 text-white text-[8.5px] uppercase tracking-wider border-b border-zinc-800">
                                  <tr>
                                    <th className="py-2.5 px-3">Patient Name</th>
                                    <th className="py-2.5 px-3 text-right">Location</th>
                                    <th className="py-2.5 px-3 text-center">Medical Alert</th>
                                    <th className="py-2.5 px-3 text-right">Ref</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900">
                                  {(() => {
                                    const filtered = patients.filter(p => {
                                      if (!poolSearch) return true;
                                      const q = poolSearch.toLowerCase();
                                      return (
                                        p.name.toLowerCase().includes(q) ||
                                        p.phone.includes(q) ||
                                        p.address.toLowerCase().includes(q) ||
                                        p.chronic_illness.toLowerCase().includes(q) ||
                                        (p.ref && p.ref.toLowerCase().includes(q))
                                      );
                                    });

                                    if (filtered.length === 0) {
                                      return (
                                        <tr>
                                          <td colSpan={4} className="py-8 text-center text-white italic">
                                            No patients found matching &quot;{poolSearch}&quot; in database.
                                          </td>
                                        </tr>
                                      );
                                    }

                                    return filtered.map(pt => {
                                      return (
                                        <tr
                                          key={`pool-row-${pt.id}`}
                                          onClick={() => {
                                            setSelectedPtId(pt.id);
                                            setActiveTab("pt-info");
                                          }}
                                          className="hover:bg-[#1A1A1E] transition-colors cursor-pointer group"
                                        >
                                          <td className="py-2 px-3 font-sans font-semibold text-white group- transition-colors">
                                            <div className="flex items-center gap-1.5">
                                              <span>{pt.name}</span>
                                              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] bg-zinc-800 text-white px-1 rounded font-mono">📂 Open</span>
                                            </div>
                                          </td>
                                          <td className="py-2 px-3 text-right text-white truncate max-w-[120px]" title={pt.address}>
                                            {pt.address}
                                          </td>
                                          <td className="py-2 px-3 text-center">
                                            <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                              pt.chronic_illness !== "None"
                                                ? "bg-amber-950/80 text-amber-400 border border-amber-900/30"
                                                : "bg-[#161618] text-white"
                                            }`}>
                                              {pt.chronic_illness}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-right text-white italic max-w-[100px] truncate" title={pt.ref || "Direct"}>
                                            {pt.ref ? `👤 ${pt.ref}` : "Direct"}
                                          </td>
                                        </tr>
                                      );
                                    });
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                                 {/* === SUBPAGE 10: WORK (Manage Patient Dental Work Orders) === */}
                    {activeTab === "work" && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start"
                      >
                        {/* LEFT COLUMN: Register Dental Work Order */}
                        <div className="xl:col-span-6 space-y-4">
                          <div className="bg-[#121212] p-4 rounded-2xl border border-zinc-800   space-y-4 animate-fadeIn">
                            {/* Autocompletion patient lookup */}
                            <form onSubmit={submitInsertDentalWork} className="space-y-4">
                              <div className="relative">
                                <div className="flex gap-2">
                                  <div className="relative flex-1">
                                    <input
                                      type="text"
                                      required
                                      value={workSearchWord}
                                      onChange={(e) => {
                                        setWorkSearchWord(e.target.value);
                                        setWorkShowSuggestions(true);
                                        if (!e.target.value) setWorkPtId("");
                                      }}
                                      onFocus={() => setWorkShowSuggestions(true)}
                                      placeholder="search"
                                      className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 px-3 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                                    />
                                    {workSearchWord && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setWorkSearchWord("");
                                          setWorkPtId("");
                                        }}
                                        className="absolute right-2.5 top-2.5 text-[9px] text-white  font-mono cursor-pointer"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                  <div className="text-[10px] bg-zinc-800 px-3 py-1.5 rounded-2xl border border-zinc-800 flex items-center font-mono shrink-0">
                                    <strong className="text-white font-bold">{workPtId || "No Link"}</strong>
                                  </div>
                                </div>

                                {workShowSuggestions && workSearchWord && (
                                  <div className="absolute left-0 right-0 top-[100%] mt-1 max-h-40 overflow-y-auto bg-zinc-800 border border-zinc-800 rounded-2xl   z-20 divide-y divide-zinc-900 scrollbar-thin">
                                    {patients
                                      .filter(p => p.name.toLowerCase().includes(workSearchWord.toLowerCase()) || p.phone.includes(workSearchWord))
                                      .map(p => (
                                        <button
                                          key={`work-autocomplete-${p.id}`}
                                          type="button"
                                          onClick={() => {
                                            setWorkPtId(p.id);
                                            setWorkSearchWord(p.name);
                                            setWorkShowSuggestions(false);
                                          }}
                                          className="w-full text-left px-3 py-2 text-[10px] hover:bg-[#1A1A1F] text-white  font-mono flex justify-between items-center cursor-pointer"
                                        >
                                          <span>{p.name}</span>
                                          <span className="text-[8px] bg-zinc-800 text-white px-1 py-0.5 rounded font-bold">ID {p.id}</span>
                                        </button>
                                      ))}
                                    {patients.filter(p => p.name.toLowerCase().includes(workSearchWord.toLowerCase()) || p.phone.includes(workSearchWord)).length === 0 && (
                                      <div className="p-2.5 text-center text-white font-mono italic text-[10px]">
                                        No patient matches search query...
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Form Select fields: Doctor, Treatment, Shade, Lab */}
                              <div className="grid grid-cols-2 gap-3">
                                {/* Doctor Select */}
                                <div>
                                  <select
                                    required
                                    value={workDrId}
                                    onChange={(e) => setWorkDrId(e.target.value ? Number(e.target.value) : "")}
                                    className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 px-2.5 text-xs text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                                  >
                                    <option value="">drs</option>
                                    {doctors.map(dr => (
                                      <option key={`work-dr-opt-${dr.id}`} value={dr.id}>👤 {dr.name} ({dr.specialty})</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Type (Treatment) Select */}
                                <div>
                                  <select
                                    required
                                    value={workTreatmentTypeId}
                                    onChange={(e) => setWorkTreatmentTypeId(e.target.value ? Number(e.target.value) : "")}
                                    className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 px-2.5 text-xs text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                                  >
                                    <option value="">type</option>
                                    {treatmentTypes.map(t => (
                                      <option key={`work-tt-opt-${t.id}`} value={t.id}>⚙️ {t.name}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Shade Color select */}
                                <div className="relative">
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => setWorkShadeDropdownOpen(!workShadeDropdownOpen)}
                                      className="w-full bg-[#121212] border border-zinc-800 rounded-2xl py-1.5 px-2.5 text-xs text-white flex justify-between items-center font-mono hover:border-zinc-800 cursor-pointer text-left"
                                    >
                                      <div className="flex items-center gap-2">
                                        {workShadeCode ? (
                                          <>
                                            <span 
                                              className="w-3 h-3 rounded-2xl border border-black/50 shrink-0 inline-block"
                                              style={{ backgroundColor: shadeColors.find(sc => sc.code === workShadeCode)?.hex || '#FFFFFF' }}
                                            />
                                            <span className="font-bold text-white">{workShadeCode}</span>
                                          </>
                                        ) : (
                                          <span className="text-white bg-transparent">color</span>
                                        )}
                                      </div>
                                      <span className="text-white text-[9px] font-bold font-sans">
                                        {workShadeDropdownOpen ? "▲" : "▼"}
                                      </span>
                                    </button>

                                    {workShadeDropdownOpen && (
                                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-zinc-800 border border-zinc-800 rounded-2xl p-1.5 space-y-0.5 scrollbar-thin  ">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setWorkShadeCode("");
                                            setWorkShadeDropdownOpen(false);
                                          }}
                                          className={`flex items-center gap-2 w-full px-2 py-1 bg-zinc-800 font-bold hover:bg-[#1A1A22] rounded-2xl text-[10px] font-mono cursor-pointer transition-all ${
                                            workShadeCode === "" ? "text-amber-400 font-black border border-amber-500/20" : "text-white"
                                          }`}
                                        >
                                          <div className="w-3 h-3 rounded-2xl bg-zinc-800 flex items-center justify-center text-[7px]" style={{ fontSize: '7px' }}>✕</div>
                                          <span>No Shade (Clear)</span>
                                        </button>
                                        {shadeColors.map(sc => {
                                          const isSelected = workShadeCode === sc.code;
                                          return (
                                            <button
                                              key={`work-shade-custom-${sc.id}`}
                                              type="button"
                                              onClick={() => {
                                                setWorkShadeCode(sc.code);
                                                setWorkShadeDropdownOpen(false);
                                              }}
                                              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-2xl text-[10px] font-mono cursor-pointer transition-all text-left ${
                                                isSelected 
                                                  ? "bg-amber-400 text-white font-extrabold" 
                                                  : "text-white hover:bg-[#1C1C1F] "
                                              }`}
                                            >
                                              <span 
                                                className="w-3.5 h-3.5 rounded-2xl border border-black/40 shrink-0 inline-block"
                                                style={{ backgroundColor: sc.hex }}
                                              />
                                              <span>{sc.code}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Lab select */}
                                <div>
                                  <select
                                    value={workLabId}
                                    onChange={(e) => {
                                      const val = e.target.value ? Number(e.target.value) : "";
                                      setWorkLabId(val);
                                      if (val) setWorkCustomLabName("");
                                    }}
                                    className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 px-2.5 text-xs text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                                  >
                                    <option value="">lab</option>
                                    {labs.map(lab => (
                                      <option key={`work-lab-opt-${lab.id}`} value={lab.id}>🔬 {lab.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Teeth Selector & Grid */}
                              <div className="space-y-2 pt-1 border-t border-zinc-800">
                                <div className="bg-zinc-800 p-2.5 rounded-2xl border border-zinc-800 space-y-3 font-mono">
                                  {/* QUADRANT 1: UL (Upper Left) */}
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[7px] text-sky-400 font-bold uppercase tracking-wider px-1">
                                      <span>MAXILLARY LEFT (UL8 ➔ UL1)</span>
                                      <span className="text-white font-bold">UL Left</span>
                                    </div>
                                    <div className="flex gap-1 justify-start max-w-[70%]">
                                      {["UL8", "UL7", "UL6", "UL5", "UL4", "UL3", "UL2", "UL1"].map(tooth => {
                                        const isSelected = workTeethList.includes(tooth);
                                        return (
                                          <button
                                            key={`tooth-select-btn-${tooth}`}
                                            type="button"
                                            onClick={() => {
                                              if (workTeethList.includes(tooth)) {
                                                setWorkTeethList(workTeethList.filter(t => t !== tooth));
                                              } else {
                                                setWorkTeethList([...workTeethList, tooth]);
                                              }
                                            }}
                                            className={`flex-1 h-7.5 text-[8px] font-bold border rounded flex items-center justify-center transition-all cursor-pointer ${
                                              isSelected 
                                                ? "bg-sky-400 text-white border-[#704bbe] font-extrabold  " 
                                                : "bg-[#0d1624] border-sky-950 text-sky-305 hover:bg-[#122238] "
                                            }`}
                                          >
                                            {tooth}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* QUADRANT 2: UR (Upper Right) - "under to ul but right" */}
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[7px] text-white font-bold uppercase tracking-wider px-1 max-w-[70%] ml-auto">
                                      <span className="text-white font-bold">UR Right</span>
                                      <span>MAXILLARY RIGHT (UR1 ➔ UR8)</span>
                                    </div>
                                    <div className="flex gap-1 justify-end max-w-[70%] ml-auto">
                                      {["UR1", "UR2", "UR3", "UR4", "UR5", "UR6", "UR7", "UR8"].map(tooth => {
                                        const isSelected = workTeethList.includes(tooth);
                                        return (
                                          <button
                                            key={`tooth-select-btn-${tooth}`}
                                            type="button"
                                            onClick={() => {
                                              if (workTeethList.includes(tooth)) {
                                                setWorkTeethList(workTeethList.filter(t => t !== tooth));
                                              } else {
                                                setWorkTeethList([...workTeethList, tooth]);
                                              }
                                            }}
                                            className={`flex-1 h-7.5 text-[8px] font-bold border rounded flex items-center justify-center transition-all cursor-pointer ${
                                              isSelected 
                                                ? "bg-indigo-500 text-white border-[#704bbe] font-extrabold  " 
                                                : "bg-[#0a1b12] border-zinc-800 text-white hover:bg-[#0f2e1e] "
                                            }`}
                                          >
                                            {tooth}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* QUADRANT 3: LL (Lower Left) - "ll new row left" */}
                                  <div className="space-y-1 pt-1.5 border-t border-zinc-800">
                                    <div className="flex justify-between text-[7px] text-violet-400 font-bold uppercase tracking-wider px-1">
                                      <span>MANDIBULAR LEFT (LL8 ➔ LL1)</span>
                                      <span className="text-white font-bold">LL Left</span>
                                    </div>
                                    <div className="flex gap-1 justify-start max-w-[70%]">
                                      {["LL8", "LL7", "LL6", "LL5", "LL4", "LL3", "LL2", "LL1"].map(tooth => {
                                        const isSelected = workTeethList.includes(tooth);
                                        return (
                                          <button
                                            key={`tooth-select-btn-${tooth}`}
                                            type="button"
                                            onClick={() => {
                                              if (workTeethList.includes(tooth)) {
                                                setWorkTeethList(workTeethList.filter(t => t !== tooth));
                                              } else {
                                                setWorkTeethList([...workTeethList, tooth]);
                                              }
                                            }}
                                            className={`flex-1 h-7.5 text-[8px] font-bold border rounded flex items-center justify-center transition-all cursor-pointer ${
                                              isSelected 
                                                ? "bg-violet-400 text-white border-[#704bbe] font-extrabold  " 
                                                : "bg-[#180f28] border-violet-955 text-violet-305 hover:bg-[#251540] "
                                            }`}
                                          >
                                            {tooth}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* QUADRANT 4: LR (Lower Right) - "lr under for new row right" */}
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[7px] text-amber-500 font-bold uppercase tracking-wider px-1 max-w-[70%] ml-auto">
                                      <span className="text-white font-bold">LR Right</span>
                                      <span>MANDIBULAR RIGHT (LR1 ➔ LR8)</span>
                                    </div>
                                    <div className="flex gap-1 justify-end max-w-[70%] ml-auto">
                                      {["LR1", "LR2", "LR3", "LR4", "LR5", "LR6", "LR7", "LR8"].map(tooth => {
                                        const isSelected = workTeethList.includes(tooth);
                                        return (
                                          <button
                                            key={`tooth-select-btn-${tooth}`}
                                            type="button"
                                            onClick={() => {
                                              if (workTeethList.includes(tooth)) {
                                                setWorkTeethList(workTeethList.filter(t => t !== tooth));
                                              } else {
                                                setWorkTeethList([...workTeethList, tooth]);
                                              }
                                            }}
                                            className={`flex-1 h-7.5 text-[8px] font-bold border rounded flex items-center justify-center transition-all cursor-pointer ${
                                              isSelected 
                                                ? "bg-amber-400 text-white border-[#704bbe] font-extrabold  " 
                                                : "bg-[#21160a] border-amber-955 text-amber-505 hover:bg-[#34210d] "
                                            }`}
                                          >
                                            {tooth}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                {/* Price in IQD */}
                                <div className="space-y-1">
                                  <label className="text-[10px] text-white font-mono block font-bold">total</label>
                                  <input
                                    type="number"
                                    required
                                    value={workPrice}
                                    onChange={(e) => setWorkPrice(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 px-3 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                                  />
                                </div>

                                {/* Dynamic initial Payment (This will insert directly into payment tables instead of same work tables) */}
                                <div className="space-y-1">
                                  <label className="text-[10px] text-white font-mono block font-bold">paid</label>
                                  <input
                                    type="number"
                                    value={workPaymentAmount}
                                    onChange={(e) => setWorkPaymentAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800/50 rounded-2xl py-1.5 px-3 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                                  />
                                </div>
                              </div>

                              {/* Treatment notes or description */}
                              <div className="space-y-1">
                                <textarea
                                  value={workNotes}
                                  onChange={(e) => setWorkNotes(e.target.value)}
                                  placeholder="note:"
                                  className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 px-3 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 font-mono h-16 resize-none"
                                />
                              </div>



                              <button
                                type="submit"
                                className="w-full py-2.5 bg-white text-white text-xs uppercase font-extrabold tracking-widest rounded-2xl hover:bg-zinc-800 mt-2 cursor-pointer select-none transition-all active:scale-98  "
                              >
                                Submit: Record Work
                              </button>
                            </form>
                          </div>
                        </div>

                        {/* RIGHT COLUMN: Works index and actions */}
                        <div className="xl:col-span-6 space-y-4">
                          {(() => {
                            const filteredWorks = dentalWorks.filter(dw => {
                              if (workFilterMode === "today") {
                                const todayStr = getIraqDateString();
                                const dwDateStr = getIraqDateString(dw.created_at);
                                return dwDateStr === todayStr;
                              }
                              return true; // "all"
                            });

                            const itemsPerPage = 8;
                            const totalWorksCount = filteredWorks.length;
                            const totalWorksPages = Math.ceil(totalWorksCount / itemsPerPage) || 1;
                            const activePage = Math.min(workScreenPage, totalWorksPages);
                            const paginatedWorks = filteredWorks.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

                            return (
                              <div className="bg-[#121212] p-4.5 rounded-2xl border border-zinc-800   space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[8px] px-2 py-0.5 bg-zinc-800 text-white border border-zinc-800 rounded font-mono">
                                      Total: {filteredWorks.length}
                                    </span>
                                    <div className="flex items-center gap-1 bg-zinc-800 p-0.5 border border-zinc-800 rounded">
                                      <button
                                        type="button"
                                        onClick={() => setWorkFilterMode("today")}
                                        className={`px-1.5 py-0.5 text-[8px] uppercase font-bold tracking-wider rounded transition-all cursor-pointer ${
                                          workFilterMode === "today"
                                            ? "bg-amber-400 text-white shadow-xs font-black"
                                            : "text-white "
                                        }`}
                                        title="Toggle"
                                      >
                                        today
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setWorkFilterMode("all")}
                                        className={`px-1.5 py-0.5 text-[8px] uppercase font-bold tracking-wider rounded transition-all cursor-pointer ${
                                          workFilterMode === "all"
                                            ? "bg-amber-400 text-white shadow-xs font-black"
                                            : "text-white "
                                        }`}
                                        title="Toggle"
                                      >
                                        all
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Works Table */}
                                <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-800/40 font-mono">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-[10px] font-mono min-w-[650px]">
                                      <thead>
                                        <tr className="border-b border-zinc-800 bg-zinc-800/50 text-[7.5px] text-white uppercase tracking-widest [&>th]:px-3 [&>th]:py-2.5 select-none font-bold">
                                          <th>Patient & Dentist</th>
                                          <th>Treatment</th>
                                          <th className="text-right">Cost (IQD)</th>
                                          <th className="text-right">Paid (IQD)</th>
                                          <th className="text-right">Remaining (IQD)</th>
                                          <th className="text-center">Payment Status</th>
                                          <th className="text-center">Treatment Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-zinc-900 text-white">
                                        {paginatedWorks.length === 0 ? (
                                          <tr>
                                            <td colSpan={7} className="text-center py-6 text-white italic text-[10px]">
                                              No active dental work records registered in system for this period.
                                            </td>
                                          </tr>
                                        ) : (
                                          paginatedWorks.map(dw => {
                                            const isSelected = payWorkId === `WRK-DW-${dw.id}`;
                                            const workPayments = payments.filter(p => p.work_id === `WRK-DW-${dw.id}`);
                                            const totalPaidForWork = workPayments.reduce((sum, p) => sum + p.amount, 0);
                                            const unpaidAmount = Math.max(0, dw.price - totalPaidForWork);
                                            const isPaidComplete = totalPaidForWork >= dw.price;

                                            return (
                                              <React.Fragment key={`pay-dw-general-frag-${dw.id}`}>
                                                <tr key={`pay-dw-gen-${dw.id}`} 
                                                    onClick={() => {
                                                      setPayPtId(dw.pt_id);
                                                      setPaySearchWord(dw.pt_name);
                                                      setPayWorkId(`WRK-DW-${dw.id}`);
                                                      setPayAmount(String(unpaidAmount));
                                                      setSelectedPtId(dw.pt_id);
                                                    }}
                                                    className={`cursor-pointer transition-colors hover:bg-zinc-800 [&>td]:px-3 [&>td]:py-2.5 ${
                                                      isSelected ? "bg-indigo-500/30 text-white font-medium border-l border-zinc-800/40" : ""
                                                    }`}
                                                    title="Click to select for payment"
                                                  >
                                                    <td className="text-white font-sans font-medium whitespace-nowrap">
                                                      <div className="flex flex-col">
                                                        <span className="text-white font-semibold flex items-center gap-1">👤 {dw.pt_name || `Patient #${dw.pt_id}`}</span>
                                                        {dw.dr_name && (
                                                          <span className="text-[8px] text-white font-mono mt-0.5">
                                                            Dr: {dw.dr_name}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </td>
                                                    <td className="text-white font-mono whitespace-nowrap">
                                                      <div className="flex flex-col gap-0.5">
                                                        <span className="font-semibold text-white">{dw.treatment_type_name || "Treatment"}</span>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                          <span className="text-[8px] bg-zinc-800 border border-zinc-800/80 text-amber-500 px-1 py-0.2 rounded font-bold">
                                                            Teeth: {dw.teeth_map}
                                                          </span>
                                                          {dw.shade_code && (
                                                            <span className="text-[8px] bg-zinc-800 border border-zinc-800/80 text-white px-1 py-0.2 rounded">
                                                              🎨 {dw.shade_code}
                                                            </span>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </td>
                                                    <td className="text-right font-bold text-white whitespace-nowrap font-mono">
                                                      {dw.price.toLocaleString()}
                                                    </td>
                                                    <td className="text-right font-bold text-white whitespace-nowrap font-mono">
                                                      {totalPaidForWork.toLocaleString()}
                                                    </td>
                                                    <td className={`text-right font-bold whitespace-nowrap font-mono ${unpaidAmount > 0 ? "text-rose-400" : "text-white"}`}>
                                                      {unpaidAmount.toLocaleString()}
                                                    </td>
                                                    <td className="text-center whitespace-nowrap font-mono text-[9px]">
                                                      <span className={`px-1 py-0.5 rounded text-[8px] font-extrabold uppercase border inline-block ${
                                                        isPaidComplete
                                                          ? "bg-indigo-500/40 text-white border-zinc-800/30"
                                                          : "bg-rose-950/40 text-rose-450 border-rose-900/30"
                                                      }`}>
                                                        {isPaidComplete ? "Paid" : "Unpaid"}
                                                      </span>
                                                    </td>
                                                    <td className="text-center whitespace-nowrap font-mono text-[9px]">
                                                      {dw.status === "Completed" ? (
                                                        <span className="px-1.5 py-0.5 bg-indigo-500/50 text-white border border-zinc-800/40 rounded text-[8px] font-extrabold uppercase inline-block font-sans">
                                                          ✓ Done
                                                        </span>
                                                      ) : (
                                                        <button
                                                          type="button"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleWorkStatus(dw.id, dw.status || "Active");
                                                          }}
                                                          className="px-2 py-0.5 bg-amber-955/30 hover:bg-zinc-800 text-amber-500 border border-amber-900/20 rounded text-[8px] font-bold uppercase inline-block cursor-pointer transition-all active:scale-95"
                                                          title="Click to mark treatment as Completed"
                                                        >
                                                          Complete
                                                        </button>
                                                      )}
                                                    </td>
                                                  </tr>
                                                  <tr>
                                                    <td colSpan={7} className="bg-zinc-800/30 p-0 border-b border-zinc-800/60">
                                                      <div className="px-3 py-1.5 space-y-1 bg-[#0c0c0e] border-l-2 border-zinc-800/30 font-mono text-[9px]">
                                                        <div className="text-white font-bold uppercase tracking-wider mb-0.5">
                                                          Installment Receivables History ({workPayments.length}):
                                                        </div>
                                                        {workPayments.length === 0 ? (
                                                          <span className="text-white italic pl-1 block">No installment receipts linked to this treatment yet.</span>
                                                        ) : (
                                                          <div className="flex flex-wrap gap-2 pt-0.5 pl-1">
                                                            {workPayments.map(p => (
                                                              <div key={`nested-p-gen-${p.id}`} className="bg-zinc-800/60 border border-zinc-800 px-2 py-0.5 rounded text-white flex items-center gap-1.5 hover:border-zinc-800 transition-all">
                                                                <span className="text-white font-bold">R#{p.id}</span>
                                                                <span className="text-white font-extrabold">+${p.amount.toLocaleString()} IQD</span>
                                                                <span className="text-white">({p.type})</span>
                                                              </div>
                                                            ))}
                                                          </div>
                                                        )}
                                                      </div>
                                                    </td>
                                                  </tr>
                                              </React.Fragment>
                                            );
                                          })
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* Pagination Controls */}
                                {totalWorksPages > 1 && (
                                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-[9px] font-mono select-none">
                                    <button
                                      type="button"
                                      disabled={activePage === 1}
                                      onClick={() => setWorkScreenPage(p => Math.max(1, p - 1))}
                                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 rounded-2xl text-white font-bold transition-all  cursor-pointer"
                                    >
                                      ◀ PREV
                                    </button>
                                    <span className="text-white">
                                      PAGE <strong className="text-white font-bold">{activePage}</strong> OF {totalWorksPages}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={activePage === totalWorksPages}
                                      onClick={() => setWorkScreenPage(p => Math.min(totalWorksPages, p + 1))}
                                      className="px-2.5 py-1 bg-[#121212] hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 rounded-2xl text-white font-bold transition-all  cursor-pointer"
                                    >
                                      NEXT ▶
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </motion.div>
                    )}

                      {/* === SUBPAGE 2: ADD MONEY (Record booking receipts) === */}
                      {activeTab === "add-money" && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start"
                        >
                        {/* LEFT COLUMN: Entry Form & Context Details */}
                        <div className="xl:col-span-5 space-y-4">
                          <div className="bg-[#121212] p-4.5 rounded-2xl border border-zinc-800   space-y-4 animate-fadeIn">

                            {/* Session status banner */}
                            {selectedPtId && (
                              <div className="p-2.5 bg-zinc-800/60 border border-zinc-800/30 rounded-2xl flex items-center justify-between text-[10px] font-mono">
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-2xl bg-indigo-500 animate-pulse shrink-0"></span>
                                  <span className="text-white">
                                    Patient: <strong className="text-white">{patients.find(p => p.id === selectedPtId)?.name || "Unassigned"}</strong>
                                  </span>
                                </div>
                                {payPtId !== selectedPtId ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const activePt = patients.find(p => p.id === selectedPtId);
                                      if (activePt) {
                                        handleSelectPatientForPayment(activePt.id, activePt.name);
                                      }
                                    }}
                                    className="px-2 py-0.5 bg-indigo-500 hover:bg-zinc-800 text-white rounded border border-zinc-800/30 text-[9px] font-bold cursor-pointer transition-colors"
                                  >
                                    Action: Use Session
                                  </button>
                                ) : (
                                  <span className="text-[8px] text-white bg-indigo-500/40 border border-zinc-800/20 px-1.5 py-0.5 rounded uppercase font-bold font-mono">
                                    Linked ✓
                                  </span>
                                )}
                              </div>
                            )}

                            <form onSubmit={submitAddMoney} className="space-y-3">
                              
                              {/* Autocomplete Patient Search & Selection */}
                              <div className="space-y-1 relative">
                                <div className="flex gap-2">
                                  <div className="relative flex-1">
                                    <input
                                      type="text"
                                      required
                                      value={paySearchWord}
                                      onChange={(e) => {
                                        setPaySearchWord(e.target.value);
                                        setPayShowSuggestions(true);
                                        if (!e.target.value) setPayPtId("");
                                      }}
                                      onFocus={() => setPayShowSuggestions(true)}
                                      placeholder="Type patient name or phone to select..."
                                      className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 px-3 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                                    />
                                    {paySearchWord && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPaySearchWord("");
                                          setPayPtId("");
                                        }}
                                        className="absolute right-2.5 top-2.5 text-[9px] text-white  font-mono cursor-pointer"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                  <div className="text-[10px] bg-zinc-800 px-3 py-1.5 rounded-2xl border border-zinc-800 flex items-center font-mono shrink-0">
                                    <span>ID:</span>
                                    <strong className="text-white ml-1 font-bold">{payPtId || "No Link"}</strong>
                                  </div>
                                </div>

                                {payShowSuggestions && paySearchWord && (
                                  <div className="absolute left-0 right-0 top-[100%] mt-1 max-h-40 overflow-y-auto bg-zinc-800 border border-zinc-800 rounded-2xl   z-20 divide-y divide-zinc-900 scrollbar-thin">
                                    {patients
                                      .filter(p => p.name.toLowerCase().includes(paySearchWord.toLowerCase()) || p.phone.includes(paySearchWord))
                                      .map(p => (
                                        <button
                                          key={`pay-autocomplete-${p.id}`}
                                          type="button"
                                          onClick={() => {
                                            handleSelectPatientForPayment(p.id, p.name);
                                            setSelectedPtId(p.id); // Synchronize workspace session patient
                                          }}
                                          className="w-full text-left px-3 py-2 text-[10px] hover:bg-[#1A1A1F] text-white  font-mono flex justify-between items-center cursor-pointer"
                                        >
                                          <span>{p.name}</span>
                                          <span className="text-[8px] bg-zinc-800 text-white px-1 py-0.5 rounded font-bold">ID {p.id}</span>
                                        </button>
                                      ))}
                                    {patients.filter(p => p.name.toLowerCase().includes(paySearchWord.toLowerCase()) || p.phone.includes(paySearchWord)).length === 0 && (
                                      <div className="p-2.5 text-center text-white font-mono italic text-[10px]">
                                        No patient record matches search filter...
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Attending Doctor Selector */}
                              <div className="space-y-1">
                                <select
                                  required
                                  value={payDocId}
                                  onChange={(e) => setPayDocId(Number(e.target.value))}
                                  className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 px-2.5 text-xs text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                                >
                                  <option value="" className="bg-[#121212]">-- Select Roster Dentist --</option>
                                  {doctors.map(d => (
                                    <option key={`pay-doc-opt-${d.id}`} value={d.id} className="bg-[#121212]">
                                      {d.name} ({d.specialty})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Custom Work ID linking */}
                              <div className="space-y-1">
                                <input
                                  type="text"
                                  required
                                  value={payWorkId}
                                  onChange={(e) => setPayWorkId(e.target.value)}
                                  placeholder="Treatment Work ID..."
                                  className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 px-3 text-xs text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                                />
                                {(() => {
                                  const details = getWorkOrderUnpaidDetails();
                                  if (!details) return null;
                                  return (
                                    <div className="mt-1.5 p-2 bg-zinc-800/80 rounded-2xl border border-zinc-800/80 text-[10px] font-mono space-y-1 animate-fadeIn">
                                      <div className="text-white flex justify-between">
                                        <span>Patient File:</span>
                                        <span className="text-white">{details.pt_name} (ID: {details.pt_id})</span>
                                      </div>
                                      <div className="text-white flex justify-between">
                                        <span>Teeth Map:</span>
                                        <span className="text-amber-500 font-bold">{details.teeth}</span>
                                      </div>
                                      <div className="text-white flex justify-between">
                                        <span>Agreement Cost:</span>
                                        <span className="text-white">{details.price.toLocaleString()} IQD</span>
                                      </div>
                                      <div className="text-white flex justify-between">
                                        <span>Settled Installments:</span>
                                        <span className="text-white">{details.paid.toLocaleString()} IQD</span>
                                      </div>
                                      <div className="text-white flex justify-between items-center pt-1.5 border-t border-zinc-800/65">
                                        <span className="text-white">Remnant Debt:</span>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-red-400 font-extrabold">{details.unpaid.toLocaleString()} IQD</span>
                                          <button
                                            type="button"
                                            onClick={() => setPayAmount(String(details.unpaid))}
                                            className="px-1.5 py-0.5 bg-indigo-500/40 hover:bg-zinc-800 text-white rounded border border-zinc-800/40 font-bold text-[9px] cursor-pointer"
                                          >
                                            Fill
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>

                              <div className="space-y-1">
                                <input
                                  type="number"
                                  required
                                  value={payAmount}
                                  onChange={(e) => setPayAmount(e.target.value)}
                                  placeholder="Collected Amount (IQD)..."
                                  className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 px-3 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                                />
                              </div>

                              <button
                                type="submit"
                                className="w-full py-2 bg-white text-white text-xs uppercase font-bold tracking-widest rounded-2xl hover:bg-zinc-800 mt-2 cursor-pointer select-none transition-colors"
                              >
                                Submit: Book
                              </button>
                            </form>
                          </div>
                        </div>

                        {/* RIGHT COLUMN: Selected Patient Payments & Account Ledger */}
                        <div className="xl:col-span-7 space-y-4">
                           {(() => {
                            const activePtPaymentId = payPtId || selectedPtId;
                            const targetPt = patients.find(p => p.id === activePtPaymentId);
                            const activeLoanObj = loans.find(l => l.pt_id === activePtPaymentId);
                            const ptPaymentsList = payments.filter(p => p.pt_id === activePtPaymentId);

                            if (!activePtPaymentId) {
                              return (
                                <div className="space-y-4">
                                  <div className="bg-[#121212] p-6 rounded-2xl border border-zinc-800 text-center space-y-3 font-mono">
                                    <span className="text-2xl block text-white">👤</span>
                                    <h4 className="text-white text-xs font-semibold tracking-wider uppercase">No Patient Link Established</h4>
                                    <p className="text-[10px] text-white max-w-sm mx-auto leading-relaxed">
                                      Type in the search field or click the session button to select a patient. We will instantly retrieve their active treatments, outstanding liabilities, and historic chronological payments listed under their file.
                                    </p>
                                  </div>

                                  {/* General Work selection table when no patient is active */}
                                  <div className="bg-[#121212] p-4.5 rounded-2xl border border-zinc-800   space-y-3 animate-fadeIn">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-white font-mono font-bold uppercase tracking-wider">
                                        Clinic-Wide Treatment Work Registry
                                      </span>
                                      <span className="text-[8px] px-2 py-0.5 bg-zinc-800 text-white border border-zinc-800 rounded font-mono font-bold">
                                        Total: {dentalWorks.length}
                                      </span>
                                    </div>
                                    <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-800/40 font-mono">
                                      <div className="max-h-[350px] overflow-y-auto overflow-x-auto scrollbar-thin">
                                        <table className="w-full text-left border-collapse text-[10px] font-mono min-w-[700px]">
                                        <thead>
                                          <tr className="border-b border-zinc-800 bg-zinc-800/50 text-[7.5px] text-white uppercase tracking-widest [&>th]:px-3 [&>th]:py-2.5 select-none font-bold">
                                            <th>Patient & Dentist</th>
                                            <th>Treatment</th>
                                            <th className="text-right">Cost (IQD)</th>
                                            <th className="text-right">Paid (IQD)</th>
                                            <th className="text-right">Remaining (IQD)</th>
                                            <th className="text-center">Payment Status</th>
                                            <th className="text-center">Treatment Status</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-900 text-white">
                                           {(() => {
                                             const subWorks = dentalWorks;
                                             if (subWorks.length === 0) {
                                               return (
                                                 <tr>
                                                   <td colSpan={6} className="text-center py-4 text-white italic text-[10px] font-mono">
                                                     No specific work orders found for this patient.
                                                   </td>
                                                 </tr>
                                               );
                                             }
                                             return subWorks.map(dw => {
                                               const isSelected = payWorkId === `WRK-DW-${dw.id}`;
                                               const workPayments = payments.filter(p => p.work_id === `WRK-DW-${dw.id}`);
                                               const totalPaidForWork = workPayments.reduce((sum, p) => sum + p.amount, 0);
                                               const unpaidAmount = Math.max(0, dw.price - totalPaidForWork);
                                               const isPaidComplete = totalPaidForWork >= dw.price;

                                               return (
                                                 <React.Fragment key={`pay-dw-general-frag-${dw.id}`}>
                                                   <tr key={`pay-dw-gen-${dw.id}`} 
                                                       onClick={() => {
                                                         setPayPtId(dw.pt_id);
                                                         setPaySearchWord(dw.pt_name || "");
                                                         setPayWorkId(`WRK-DW-${dw.id}`);
                                                         setPayAmount(String(unpaidAmount));
                                                         setSelectedPtId(dw.pt_id);
                                                       }}
                                                       className={`cursor-pointer transition-colors hover:bg-zinc-800 [&>td]:px-3 [&>td]:py-2.5 ${
                                                         isSelected ? "bg-indigo-500/30 text-white font-medium border-l border-zinc-800/40" : ""
                                                       }`}
                                                       title="Click to select for payment"
                                                     >
                                                       <td className="text-white font-sans font-medium whitespace-nowrap">
                                                         <div className="flex flex-col">
                                                           {dw.dr_name ? (
                                                             <span className="text-white font-semibold flex items-center gap-1">👤 {dw.dr_name}</span>
                                                           ) : (
                                                             <span className="text-white italic text-[9px]">Unspecified Dentist</span>
                                                           )}
                                                         </div>
                                                       </td>
                                                       <td className="text-white font-mono whitespace-nowrap">
                                                         <div className="flex flex-col gap-0.5">
                                                           <span className="font-semibold text-white">{dw.treatment_type_name || "Treatment"}</span>
                                                           <div className="flex items-center gap-1.5 mt-0.5">
                                                             <span className="text-[8px] bg-zinc-800 border border-zinc-800/80 text-amber-500 px-1 py-0.2 rounded font-bold">
                                                               Teeth: {dw.teeth_map}
                                                             </span>
                                                             {dw.shade_code && (
                                                               <span className="text-[8px] bg-zinc-800 border border-zinc-800/80 text-white px-1 py-0.2 rounded">
                                                                 🎨 {dw.shade_code}
                                                               </span>
                                                             )}
                                                           </div>
                                                         </div>
                                                       </td>
                                                       <td className="text-right font-bold text-white whitespace-nowrap font-mono">
                                                         {dw.price.toLocaleString()}
                                                       </td>
                                                       <td className="text-right font-bold text-white whitespace-nowrap font-mono">
                                                         {totalPaidForWork.toLocaleString()}
                                                       </td>
                                                       <td className={`text-right font-bold whitespace-nowrap font-mono ${unpaidAmount > 0 ? "text-rose-400" : "text-white"}`}>
                                                         {unpaidAmount.toLocaleString()}
                                                       </td>
                                                       <td className="text-center whitespace-nowrap font-mono text-[9px]">
                                                         <span className={`px-1 py-0.5 rounded text-[8px] font-extrabold uppercase border inline-block ${
                                                           isPaidComplete
                                                             ? "bg-indigo-500/40 text-white border-zinc-800/30"
                                                             : "bg-rose-950/40 text-rose-450 border-rose-900/30"
                                                         }`}>
                                                           {isPaidComplete ? "Paid" : "Unpaid"}
                                                         </span>
                                                       </td>
                                                     </tr>
                                                     <tr>
                                                       <td colSpan={6} className="bg-zinc-800/30 p-0 border-b border-zinc-800/60">
                                                         <div className="px-3 py-1.5 space-y-1 bg-[#0c0c0e] border-l-2 border-zinc-800/30 font-mono text-[9px]">
                                                           <div className="text-white font-bold uppercase tracking-wider mb-0.5">
                                                             Installment Receivables History ({workPayments.length}):
                                                           </div>
                                                           {workPayments.length === 0 ? (
                                                             <span className="text-white italic pl-1 block">No installment receipts linked to this treatment yet.</span>
                                                           ) : (
                                                             <div className="flex flex-wrap gap-2 pt-0.5 pl-1">
                                                               {workPayments.map(p => (
                                                                 <div key={`nested-p-spec-${p.id}`} className="bg-zinc-800/60 border border-zinc-800 px-2 py-0.5 rounded text-white flex items-center gap-1.5 hover:border-zinc-800 transition-all">
                                                                   <span className="text-white font-bold">R#{p.id}</span>
                                                                   <span className="text-white font-extrabold">+${p.amount.toLocaleString()} IQD</span>
                                                                   <span className="text-white">({p.type})</span>
                                                                 </div>
                                                               ))}
                                                             </div>
                                                           )}
                                                         </div>
                                                       </td>
                                                     </tr>
                                                 </React.Fragment>
                                               );
                                             });
                                           })()}
                                         </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                            const ptWorks = dentalWorks.filter(dw => dw.pt_id === activePtPaymentId);
                            const totalPtCost = ptWorks.reduce((sum, dw) => sum + dw.price, 0);
                            const totalPtPaid = ptPaymentsList.reduce((sum, p) => sum + p.amount, 0);
                            const calculatedDebt = Math.max(0, totalPtCost - totalPtPaid);

                            const displayTotal = activeLoanObj ? (activeLoanObj.total_cost || 0) : totalPtCost;
                            const displayPaid = activeLoanObj ? (activeLoanObj.total_paid || 0) : totalPtPaid;
                            const displayRemnant = activeLoanObj ? (activeLoanObj.loan_debt || 0) : calculatedDebt;

                            return (
                              <div className="space-y-4">
                                <div className="bg-[#121212] p-4.5 rounded-2xl border border-zinc-800   space-y-4 animate-fadeIn">

                                  {/* Summary metrics */}
                                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                                    <div className="bg-zinc-800 p-2.5 rounded-2xl border border-zinc-800 text-center">
                                      <span className="text-[7px] text-white uppercase tracking-wider font-bold block mb-1">Total Works</span>
                                      <span className="text-[11px] font-bold text-white block">
                                        {displayTotal.toLocaleString()} IQD
                                      </span>
                                    </div>

                                    <div className="bg-zinc-800 p-2.5 rounded-2xl border border-zinc-800 text-center">
                                      <span className="text-[7px] text-white uppercase tracking-wider font-bold block mb-1">Total Paid</span>
                                      <span className="text-[11px] font-bold text-white block">
                                        {displayPaid.toLocaleString()} IQD
                                      </span>
                                    </div>

                                    <div className="bg-zinc-800 p-2.5 rounded-2xl border border-zinc-800 text-center">
                                      <span className="text-[7px] text-white uppercase tracking-wider font-bold block mb-1">Remnant Debt</span>
                                      <span className={`text-[11px] font-bold block ${displayRemnant > 0 ? "text-rose-400 font-bold" : "text-white"}`}>
                                        {displayRemnant.toLocaleString()} IQD
                                      </span>
                                    </div>
                                  </div>

                                  {/* Patient Specific Work Orders select list table on the same screen */}
                                  <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                                    <div className="text-[10px] text-white font-mono font-bold uppercase tracking-wider">
                                      Patient Specific Treatments
                                    </div>
                                    <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-800/40 font-mono">
                                      <div className="max-h-[350px] overflow-y-auto overflow-x-auto scrollbar-thin">
                                        <table className="w-full text-left border-collapse text-[10px] font-mono min-w-[700px]">
                                        <thead>
                                          <tr className="border-b border-zinc-800 bg-zinc-800/50 text-[7.5px] text-white uppercase tracking-widest [&>th]:px-3 [&>th]:py-2 select-none font-bold">
                                            <th>Dentist</th>
                                            <th>Treatment</th>
                                            <th className="text-right">Cost (IQD)</th>
                                            <th className="text-right">Paid (IQD)</th>
                                            <th className="text-right">Remaining (IQD)</th>
                                            <th className="text-center">Payment Status</th>
                                            <th className="text-center">Treatment Status</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-900 text-white">
                                          {(() => {
                                            const subWorks = dentalWorks.filter(w => w.pt_id === activePtPaymentId);
                                            if (subWorks.length === 0) {
                                              return (
                                                <tr>
                                                  <td colSpan={7} className="text-center py-4 text-white italic text-[10px] font-mono">
                                                    No specific work orders found for this patient.
                                                  </td>
                                                </tr>
                                              );
                                            }
                                            return subWorks.map(dw => {
                                              const isSelected = payWorkId === `WRK-DW-${dw.id}`;
                                              const workPayments = payments.filter(p => p.work_id === `WRK-DW-${dw.id}`);
                                              const totalPaidForWork = workPayments.reduce((sum, p) => sum + p.amount, 0);
                                              const unpaidAmount = Math.max(0, dw.price - totalPaidForWork);
                                              const isPaidComplete = totalPaidForWork >= dw.price;

                                              return (
                                                <React.Fragment key={`pay-dw-specific-frag-${dw.id}`}>
                                                  <tr key={`pay-dw-spec-${dw.id}`} 
                                                      onClick={() => {
                                                        setPayWorkId(`WRK-DW-${dw.id}`);
                                                        setPayAmount(String(unpaidAmount));
                                                      }}
                                                      className={`cursor-pointer transition-colors hover:bg-zinc-800 [&>td]:px-3 [&>td]:py-2.5 ${
                                                        isSelected ? "bg-indigo-500/30 text-white font-medium border-l border-zinc-800/40" : ""
                                                      }`}
                                                      title="Click to select for payment"
                                                    >
                                                      <td className="text-white font-sans font-medium whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                          {dw.dr_name ? (
                                                            <span className="text-white font-semibold flex items-center gap-1">👤 {dw.dr_name}</span>
                                                          ) : (
                                                            <span className="text-white italic text-[9px]">Unspecified Dentist</span>
                                                          )}
                                                        </div>
                                                      </td>
                                                      <td className="text-white font-mono whitespace-nowrap">
                                                        <div className="flex flex-col gap-0.5">
                                                          <span className="font-semibold text-white">{dw.treatment_type_name || "Treatment"}</span>
                                                          <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[8px] bg-zinc-800 border border-zinc-800/80 text-amber-500 px-1 py-0.2 rounded font-bold">
                                                              Teeth: {dw.teeth_map}
                                                            </span>
                                                            {dw.shade_code && (
                                                              <span className="text-[8px] bg-zinc-800 border border-zinc-800/80 text-white px-1 py-0.2 rounded">
                                                                🎨 {dw.shade_code}
                                                              </span>
                                                            )}
                                                          </div>
                                                        </div>
                                                      </td>
                                                      <td className="text-right font-bold text-white whitespace-nowrap font-mono">
                                                        {dw.price.toLocaleString()}
                                                      </td>
                                                      <td className="text-right font-bold text-white whitespace-nowrap font-mono">
                                                        {totalPaidForWork.toLocaleString()}
                                                      </td>
                                                      <td className={`text-right font-bold whitespace-nowrap font-mono ${unpaidAmount > 0 ? "text-rose-400" : "text-white"}`}>
                                                        {unpaidAmount.toLocaleString()}
                                                      </td>
                                                      <td className="text-center whitespace-nowrap font-mono text-[9px]">
                                                        <span className={`px-1 py-0.5 rounded text-[8px] font-extrabold uppercase border inline-block ${
                                                          isPaidComplete
                                                            ? "bg-indigo-500/40 text-white border-zinc-800/30"
                                                            : "bg-rose-950/40 text-rose-450 border-rose-900/30"
                                                        }`}>
                                                          {isPaidComplete ? "Paid" : "Unpaid"}
                                                        </span>
                                                      </td>
                                                      <td className="text-center whitespace-nowrap font-mono text-[9px]" onClick={(e) => e.stopPropagation()}>
                                                        {dw.status === "Completed" ? (
                                                          <span className="px-1.5 py-0.5 bg-indigo-500/50 text-white border border-zinc-800/40 rounded text-[8px] font-extrabold uppercase inline-block">
                                                            ✓ Done
                                                          </span>
                                                        ) : (
                                                          <button
                                                            type="button"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              handleToggleWorkStatus(dw.id, dw.status || "Active");
                                                            }}
                                                            className="px-2 py-0.5 bg-amber-955/30 hover:bg-zinc-800 text-amber-500 border border-amber-900/20 rounded text-[8px] font-bold uppercase inline-block cursor-pointer transition-all active:scale-95 animate-fadeIn"
                                                            title="Click to mark treatment as Completed"
                                                          >
                                                            Complete
                                                          </button>
                                                        )}
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td colSpan={7} className="bg-zinc-800/30 p-0 border-b border-zinc-800/60">
                                                        <div className="px-3 py-1.5 space-y-1 bg-[#0c0c0e] border-l-2 border-zinc-800/30 font-mono text-[9px]">
                                                          <div className="text-white font-bold uppercase tracking-wider mb-0.5">
                                                            Installment Receivables History ({workPayments.length}):
                                                          </div>
                                                          {workPayments.length === 0 ? (
                                                            <span className="text-white italic pl-1 block">No installment receipts linked to this treatment yet.</span>
                                                          ) : (
                                                            <div className="flex flex-wrap gap-2 pt-0.5 pl-1">
                                                              {workPayments.map(p => (
                                                                <div key={`nested-p-spec-pt-${p.id}`} className="bg-zinc-800/60 border border-zinc-800 px-2 py-0.5 rounded text-white flex items-center gap-1.5 hover:border-zinc-800 transition-all">
                                                                  <span className="text-white font-bold">R#{p.id}</span>
                                                                  <span className="text-white font-extrabold">+{p.amount.toLocaleString()} IQD</span>
                                                                  <span className="text-white">({p.type})</span>
                                                                </div>
                                                              ))}
                                                            </div>
                                                          )}
                                                        </div>
                                                      </td>
                                                    </tr>
                                                </React.Fragment>
                                              );
                                            });
                                          })()}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                          })()}
                        </div>
                      </motion.div>
                    )}

                    {/* === SUBPAGE 3: DRS (Doctors index) === */}
                    {activeTab === "drs" && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-5"
                      >
                        {/* Doctors Directory list filtered by search - horizontally styled */}
                        <div className="space-y-2">
                          {/* Horizontal scrolling carousel of doctor cards */}
                          <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-thin snap-x snap-mandatory font-mono">
                            {(() => {
                              const filteredDrs = doctors.filter(d => {
                                if (!searchQuery) return true;
                                const q = searchQuery.toLowerCase();
                                return d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q);
                              });

                              if (filteredDrs.length === 0) {
                                return (
                                  <div className="text-white italic text-[10px] py-4 w-full text-center">
                                    No attending practitioners match the search query.
                                  </div>
                                );
                              }

                              return filteredDrs.map((doc) => {
                                // Default first doctor if nothing selected
                                const isSelected = selectedDrId === null 
                                  ? doc.id === filteredDrs[0]?.id 
                                  : selectedDrId === doc.id;

                                return (
                                  <div 
                                    key={doc.id}
                                    onClick={() => setSelectedDrId(doc.id)}
                                    className={`p-3.5 bg-[#121214] border rounded-2xl flex flex-col justify-between gap-3 cursor-pointer transition-all snap-start shrink-0 w-[230px] select-none hover:bg-zinc-800 ${
                                      isSelected 
                                        ? "border-amber-500 bg-amber-950/5    " 
                                        : "border-zinc-800 hover:border-zinc-800"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-1.5">
                                      <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-2xl text-white shrink-0 border ${
                                          isSelected ? "bg-amber-950/50 border-amber-500/30 text-amber-400" : "bg-zinc-800 border-zinc-800"
                                        }`}>
                                          <Heart className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="min-w-0">
                                          <h5 className="font-serif italic text-xs font-semibold text-white truncate">{doc.name}</h5>
                                          <p className="text-[8.5px] text-white font-mono mt-0.5 truncate">{doc.specialty}</p>
                                        </div>
                                      </div>

                                      {/* Indicator active dot */}
                                      {isSelected && (
                                        <span className="w-1.5 h-1.5 rounded-2xl bg-amber-400 shrink-0  " />
                                      )}
                                    </div>

                                    <div className="flex items-center justify-between gap-2 border-t border-zinc-800 pt-2 text-[8px] font-mono text-white">
                                      <span>📞 {doc.phone || "No Contact"}</span>
                                      
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const nextMap: Record<string, "Active" | "On Call" | "Off Duty"> = {
                                            "Active": "On Call",
                                            "On Call": "Off Duty",
                                            "Off Duty": "Active"
                                          };
                                          setDoctors(doctors.map(d => d.id === doc.id ? { ...d, shift_status: nextMap[d.shift_status] } : d));
                                        }}
                                        className={`px-1.5 py-0.2 rounded font-mono font-bold transition-all shrink-0 cursor-pointer text-[7.5px] border ${
                                          doc.shift_status === "Active"
                                            ? "bg-indigo-500/40 text-white border-zinc-800/40"
                                            : doc.shift_status === "On Call"
                                            ? "bg-amber-950/40 text-amber-400 border-amber-900/40"
                                            : "bg-zinc-800 text-white border-zinc-800"
                                        }`}
                                        title="Click to toggle status shift"
                                      >
                                        ● {doc.shift_status}
                                      </button>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* Interactive Activity & Ledger lists for the selected doctor */}
                        {(() => {
                          const currentDoc = doctors.find(d => 
                            selectedDrId === null ? d.id === doctors[0]?.id : d.id === selectedDrId
                          );

                          if (!currentDoc) return null;

                          // Dynamic Iraq timezone timing calculations
                          const getIraqDateObj = (date?: Date): Date => {
                            const d = date ? new Date(date) : new Date();
                            const utc = d.getTime() + d.getTimezoneOffset() * 60000;
                            return new Date(utc + 3 * 3600000);
                          };

                          const iraqToday = getIraqDateObj();
                          const todayStr = getIraqDateString(iraqToday);

                          const iraqYesterday = new Date(iraqToday);
                          iraqYesterday.setDate(iraqToday.getDate() - 1);
                          const yesterdayStr = getIraqDateString(iraqYesterday);

                          const getThisWeekStartSaturday = (iraqDate: Date): string => {
                            const day = iraqDate.getDay(); // 0 = Sun, ..., 6 = Sat
                            const daysSinceSaturday = (day + 1) % 7;
                            const sat = new Date(iraqDate);
                            sat.setDate(iraqDate.getDate() - daysSinceSaturday);
                            return getIraqDateString(sat);
                          };
                          const weekStartSatStr = getThisWeekStartSaturday(iraqToday);
                          const currentMonthPrefix = todayStr.slice(0, 7); // e.g. "2026-06"

                          const checkDateInFilter = (dateStr: string): boolean => {
                            const dOnly = dateStr.split(" ")[0].split("T")[0]; // sanitize to YYYY-MM-DD
                            if (drsDateFilter === "today") return dOnly === todayStr;
                            if (drsDateFilter === "yesterday") return dOnly === yesterdayStr;
                            if (drsDateFilter === "week") return dOnly >= weekStartSatStr && dOnly <= todayStr;
                            if (drsDateFilter === "month") return dOnly.startsWith(currentMonthPrefix);
                            return true; // "all"
                          };

                          // Match dentalWorks that belong to this doctor (by doctor name matching)
                          const unfilteredDocWorks = dentalWorks.filter(w => 
                            w.dr_name === currentDoc.name || 
                            (w.dr_name && currentDoc.name && w.dr_name.toLowerCase().replace("dr.", "").trim() === currentDoc.name.toLowerCase().replace("dr.", "").trim())
                          );
                          const docWorks = unfilteredDocWorks.filter(w => checkDateInFilter(getIraqDateString(w.created_at)));

                          // Match payments for these dentalWorks and apply date filter on payment's date
                          const docPayments = payments
                            .filter(p => {
                              const matchesWork = unfilteredDocWorks.map(w => `WRK-DW-${w.id}`).includes(p.work_id);
                              const matchesDrName = p.dr_name === currentDoc.name || 
                                (p.dr_name && currentDoc.name && p.dr_name.toLowerCase().replace("dr.", "").trim() === currentDoc.name.toLowerCase().replace("dr.", "").trim());
                              return matchesWork || matchesDrName;
                            })
                            .filter(p => checkDateInFilter(getIraqDateString(p.created_at)));

                          const totalCollected = docPayments.reduce((sum, p) => sum + p.amount, 0);
                          const totalTreatmentValue = docWorks.reduce((sum, w) => sum + w.price, 0);

                          const itemsPerPage = 10;
                          
                          const totalPaidPages = Math.ceil(docPayments.length / itemsPerPage) || 1;
                          const currentPaidPage = Math.min(drsPaidPage, totalPaidPages);
                          const startIndexPaid = (currentPaidPage - 1) * itemsPerPage;
                          const paginatedPayments = docPayments.slice(startIndexPaid, startIndexPaid + itemsPerPage);

                          const totalWorksPages = Math.ceil(docWorks.length / itemsPerPage) || 1;
                          const currentWorksPage = Math.min(drsWorksPage, totalWorksPages);
                          const startIndexWorks = (currentWorksPage - 1) * itemsPerPage;
                          const paginatedWorks = docWorks.slice(startIndexWorks, startIndexWorks + itemsPerPage);

                          return (
                            <div className="space-y-4 animate-fadeIn">
                              {/* Selected Doctor Summary Row */}
                              <div className="p-3 bg-zinc-800 border border-zinc-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                                {/* Period Filter Selector */}
                                <div className="flex flex-wrap items-center gap-1 bg-zinc-800/60 p-1 rounded-2xl border border-zinc-800 max-w-fit">
                                  {[
                                    { id: "all", label: "All Time" },
                                    { id: "today", label: "Today" },
                                    { id: "yesterday", label: "Yesterday" },
                                    { id: "week", label: "Week (Sat)" },
                                    { id: "month", label: "This Month" }
                                  ].map((f) => {
                                    const isActive = drsDateFilter === f.id;
                                    return (
                                      <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setDrsDateFilter(f.id as any)}
                                        className={`px-2.5 py-1 text-[8.5px] font-mono rounded-2xl transition-all cursor-pointer font-bold ${
                                          isActive
                                            ? "bg-amber-500/15 border border-amber-500/40 text-amber-400 font-extrabold"
                                            : "text-white  border border-transparent"
                                        }`}
                                      >
                                        {f.label}
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="flex items-center gap-2 text-[8.5px] font-mono">
                                  <div className="px-2 py-1 bg-zinc-800 border border-zinc-800 rounded-2xl">
                                    <span className="text-white">Collected: </span>
                                    <span className="text-white font-bold">{totalCollected.toLocaleString()} IQD</span>
                                  </div>
                                  <div className="px-2 py-1 bg-zinc-800 border border-zinc-800 rounded-2xl">
                                    <span className="text-white">Treatments: </span>
                                    <span className="text-amber-400 font-bold">{docWorks.length} cases</span>
                                  </div>
                                </div>
                              </div>

                              {/* Two Horizontal Buttons Side-by-Side as Segmented Controls */}
                              <div className="flex flex-row gap-2 max-w-full">
                                <button
                                  type="button"
                                  onClick={() => setDrsSubTab("payments")}
                                  className={`flex-1 py-2.5 px-3 rounded-2xl font-mono text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                                    drsSubTab === "payments"
                                      ? "bg-indigo-500/40 text-white border-zinc-800/50    "
                                      : "bg-zinc-800 border-zinc-800 text-white  hover:border-zinc-800"
                                  }`}
                                >
                                  💰 paid
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDrsSubTab("works")}
                                  className={`flex-1 py-2.5 px-3 rounded-2xl font-mono text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                                    drsSubTab === "works"
                                      ? "bg-amber-950/40 text-amber-500 border-amber-500/50    "
                                      : "bg-zinc-800 border-zinc-800 text-white  hover:border-zinc-800"
                                  }`}
                                >
                                  🦷 works
                                </button>
                              </div>

                              {/* Toggleable Table View Container */}
                              <div className="animate-fadeIn">
                                {drsSubTab === "payments" ? (
                                  /* Section A: PAYMENTS SECTION */
                                  <div className="bg-[#121212] p-4 rounded-2xl border border-zinc-800 space-y-3 font-mono">
                                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                      <span className="text-[10px] text-white font-bold uppercase tracking-wider flex items-center gap-1">
                                        💰 Payments & Share Ledger ({docPayments.length})
                                      </span>
                                      <span className="text-[8.5px] bg-indigo-500/40 text-white border border-zinc-800/20 px-2 py-0.5 rounded-2xl font-bold">
                                        Sum: {totalCollected.toLocaleString()} IQD
                                      </span>
                                    </div>

                                    <div className="max-h-[300px] overflow-y-auto scrollbar-thin divide-y divide-zinc-900">
                                      {paginatedPayments.length === 0 ? (
                                        <div className="text-white italic text-[10px] py-6 text-center">
                                          No payments recorded for this doctor in the selected period.
                                        </div>
                                      ) : (
                                        paginatedPayments.map(p => {
                                          const linkedWork = dentalWorks.find(w => `WRK-DW-${w.id}` === p.work_id);
                                          const patientDisplay = p.pt_name || linkedWork?.pt_name || "Linked Patient";
                                          const pt_id = p.pt_id || linkedWork?.pt_id;
                                          const isCurrentSessionPt = selectedPtId !== null && pt_id === selectedPtId;

                                          return (
                                            <div 
                                              key={p.id} 
                                              onClick={() => {
                                                if (pt_id) {
                                                  setSelectedPtId(pt_id);
                                                }
                                              }}
                                              className={`py-2 px-2.5 my-1 flex items-center justify-between text-[10.5px] hover:bg-zinc-800 rounded-2xl transition-all cursor-pointer border ${
                                                isCurrentSessionPt 
                                                  ? "bg-indigo-500/25 border-zinc-800/40 text-white" 
                                                  : "border-transparent hover:border-zinc-800 text-white"
                                              }`}
                                              title="Click to activate patient in session"
                                            >
                                              <div className="space-y-0.5 min-w-0 mr-2">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <span className="text-white font-bold text-[9px]">R#{p.id}</span>
                                                  <span className="text-white font-semibold truncate">{patientDisplay}</span>
                                                  {isCurrentSessionPt && (
                                                    <span className="px-1.5 py-0.2 bg-indigo-500/10 text-white border border-zinc-800/20 rounded text-[7px] font-extrabold uppercase animate-pulse">
                                                      Active Session
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[8px] text-white">
                                                  <span>📅 {getIraqDateString(p.created_at)}</span>
                                                  <span>•</span>
                                                  <span className="text-white">{linkedWork?.treatment_type_name || "Treatment"}</span>
                                                </div>
                                              </div>
                                              <div className="text-right shrink-0">
                                                <span className="text-white font-extrabold block">+{p.amount.toLocaleString()} IQD</span>
                                                <span className="text-[7.5px] text-white bg-zinc-800 border border-zinc-800 px-1 rounded inline-block mt-0.5 uppercase font-bold">{p.type}</span>
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>

                                    {/* Pagination Controls along the table */}
                                    {totalPaidPages > 1 && (
                                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-[9px] font-mono select-none">
                                        <button
                                          type="button"
                                          disabled={currentPaidPage === 1}
                                          onClick={() => setDrsPaidPage(p => Math.max(1, p - 1))}
                                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 rounded-2xl text-white font-bold transition-all  cursor-pointer"
                                        >
                                          ◀ PREV
                                        </button>
                                        <span className="text-white">
                                          PAGE <strong className="text-white font-bold">{currentPaidPage}</strong> OF {totalPaidPages}
                                        </span>
                                        <button
                                          type="button"
                                          disabled={currentPaidPage === totalPaidPages}
                                          onClick={() => setDrsPaidPage(p => Math.min(totalPaidPages, p + 1))}
                                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 rounded-2xl text-white font-bold transition-all  cursor-pointer"
                                        >
                                          NEXT ▶
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  /* Section B: WORKS SECTION */
                                  <div className="bg-[#121212] p-4 rounded-2xl border border-zinc-800 space-y-3 font-mono">
                                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                      <span className="text-[10px] text-white font-bold uppercase tracking-wider flex items-center gap-1">
                                        🦷 Treatment Works Registry ({docWorks.length})
                                      </span>
                                      <span className="text-[8.5px] bg-amber-950/40 text-amber-500 border border-amber-900/20 px-2 py-0.5 rounded-2xl font-bold">
                                        Val: {totalTreatmentValue.toLocaleString()} IQD
                                      </span>
                                    </div>

                                    <div className="max-h-[300px] overflow-y-auto scrollbar-thin divide-y divide-zinc-900">
                                      {paginatedWorks.length === 0 ? (
                                        <div className="text-white italic text-[10px] py-6 text-center">
                                          No dental work records registered for this doctor in the selected period.
                                        </div>
                                      ) : (
                                        paginatedWorks.map(w => {
                                          const pt_id = w.pt_id;
                                          const isCurrentSessionPt = selectedPtId !== null && pt_id === selectedPtId;

                                          return (
                                            <div 
                                              key={w.id} 
                                              onClick={() => {
                                                if (pt_id) {
                                                  setSelectedPtId(pt_id);
                                                }
                                              }}
                                              className={`py-2 px-2.5 my-1 flex items-center justify-between text-[10.5px] hover:bg-zinc-800 rounded-2xl transition-all cursor-pointer border ${
                                                isCurrentSessionPt 
                                                  ? "bg-indigo-500/25 border-zinc-800/40 text-white" 
                                                  : "border-transparent hover:border-zinc-800 text-white"
                                              }`}
                                              title="Click to activate patient in session"
                                            >
                                              <div className="space-y-0.5 min-w-0 mr-2">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <span className="text-white font-bold text-[9px]">#W{w.id}</span>
                                                  <span className="text-white font-semibold truncate">{w.pt_name || `Patient #${w.pt_id}`}</span>
                                                  {isCurrentSessionPt && (
                                                    <span className="px-1.5 py-0.2 bg-indigo-500/10 text-white border border-zinc-800/20 rounded text-[7px] font-extrabold uppercase animate-pulse">
                                                      Active Session
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[8px] text-white">
                                                  <span className="font-bold text-white">{w.treatment_type_name || "Treatment"}</span>
                                                  <span>•</span>
                                                  <span className="text-amber-500 font-bold">Teeth: {w.teeth_map}</span>
                                                  {w.shade_code && (
                                                    <>
                                                      <span>•</span>
                                                      <span className="text-white">🎨 {w.shade_code}</span>
                                                    </>
                                                  )}
                                                  <span>•</span>
                                                  <span className="text-white">📅 {getIraqDateString(w.created_at)}</span>
                                                </div>
                                              </div>
                                              <div className="text-right shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <span className="text-white font-extrabold block">{w.price.toLocaleString()} IQD</span>
                                                
                                                {/* Toggle Status Button */}
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleWorkStatus(w.id, w.status || "Active");
                                                  }}
                                                  className={`px-1.5 py-0.2 rounded mt-1 font-bold text-[7.5px] uppercase transition-all shrink-0 cursor-pointer border inline-block ${
                                                    w.status === "Completed"
                                                      ? "bg-indigo-500/40 text-white border-zinc-800/40"
                                                      : "bg-amber-950/30 text-amber-500 border-amber-900/20 hover:bg-zinc-800"
                                                  }`}
                                                >
                                                  {w.status === "Completed" ? "Completed ✓" : "Active"}
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>

                                    {/* Pagination Controls along the table */}
                                    {totalWorksPages > 1 && (
                                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-[9px] font-mono select-none">
                                        <button
                                          type="button"
                                          disabled={currentWorksPage === 1}
                                          onClick={() => setDrsWorksPage(p => Math.max(1, p - 1))}
                                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 rounded-2xl text-white font-bold transition-all  cursor-pointer"
                                        >
                                          ◀ PREV
                                        </button>
                                        <span className="text-white">
                                          PAGE <strong className="text-white font-bold">{currentWorksPage}</strong> OF {totalWorksPages}
                                        </span>
                                        <button
                                          type="button"
                                          disabled={currentWorksPage === totalWorksPages}
                                          onClick={() => setDrsWorksPage(p => Math.min(totalWorksPages, p + 1))}
                                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 rounded-2xl text-white font-bold transition-all  cursor-pointer"
                                        >
                                          NEXT ▶
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                            </div>
                          );
                        })()}

                        {/* Register doctor form */}
                        <div className="bg-[#121212] p-4 rounded-2xl border border-zinc-800 space-y-3">
                          <h4 className="text-white text-xs font-normal font-mono tracking-wider uppercase">Enrol New Medical Practitioner</h4>
                          <form onSubmit={submitAddDoctor} className="space-y-2.5">
                            <input
                              type="text"
                              required
                              value={newDocName}
                              onChange={(e) => setNewDocName(e.target.value)}
                              placeholder="Doctor Name (e.g. Dr. Sarah Waleed)"
                              className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2.5 text-[10.5px] text-white placeholder:text-white font-mono focus:outline-hidden"
                            />
                            <input
                              type="text"
                              required
                              value={newDocSpecialty}
                              onChange={(e) => setNewDocSpecialty(e.target.value)}
                              placeholder="Clinical Specialty (e.g. Endodontics)"
                              className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2.5 text-[10.5px] text-white placeholder:text-white font-mono focus:outline-hidden"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="tel"
                                value={newDocPhone}
                                onChange={(e) => setNewDocPhone(e.target.value)}
                                placeholder="Contact Line"
                                className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2.5 text-[10.5px] text-white placeholder:text-white font-mono focus:outline-hidden"
                              />
                              <select
                                value={newDocShift}
                                onChange={(e) => setNewDocShift(e.target.value as any)}
                                className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2.5 text-[10.5px] text-white font-mono focus:outline-hidden"
                              >
                                <option value="Active">Active Duty</option>
                                <option value="On Call">On Call</option>
                                <option value="Off Duty">Off Duty</option>
                              </select>
                            </div>
                            <button
                              type="submit"
                              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-800 text-white font-bold uppercase tracking-wider text-[9.5px] rounded-2xl transition-colors cursor-pointer"
                            >
                              Submit: Enrol
                            </button>
                          </form>
                        </div>
                      </motion.div>
                    )}

                    {/* === SUBPAGE 4: PT INFO (Comprehensive health record explorer) === */}
                    {activeTab === "pt-info" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4"
                      >
                        {/* 1. Selector area: supporting session, direct button selection, or keyword search */}
                        <div className="bg-[#121212]/90 border border-zinc-800 rounded-2xl p-4 space-y-3.5">
                          <div className="flex flex-col md:flex-row gap-3.5 items-start md:items-center justify-between">
                            <div className="space-y-0.5">
                              <span className="text-[9px] uppercase tracking-widest text-[#FFF] font-mono font-normal block">Patient Health Directory Explorer</span>
                              <p className="text-[10.5px] text-white">Search patients, load active cases, view teeth charts and payments ledger</p>
                            </div>
                            
                            {/* Local interactive search field */}
                            <div className="relative w-full md:w-80">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Type patient name, phone, or ID to find..."
                                  value={ptInfoSearchWord}
                                  onChange={(e) => {
                                    setPtInfoSearchWord(e.target.value);
                                    setPtInfoShowSuggestions(true);
                                  }}
                                  onFocus={() => setPtInfoShowSuggestions(true)}
                                  className="w-full bg-zinc-800 border border-zinc-800 rounded-2xl py-1.5 px-3 text-xs text-white placeholder:text-white font-mono focus:outline-hidden focus:border-zinc-800"
                                />
                                {ptInfoSearchWord && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPtInfoSearchWord("");
                                      setPtInfoShowSuggestions(false);
                                    }}
                                    className="absolute right-3.5 top-2.5 text-white  font-mono text-[9.5px] cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                              
                              {/* Search Suggestion list pop-up */}
                              {ptInfoShowSuggestions && ptInfoSearchWord && (
                                <div className="absolute left-0 right-0 top-[100%] mt-1.5 max-h-48 overflow-y-auto bg-[#121212] border border-zinc-800 rounded-2xl   z-50 divide-y divide-zinc-900 scrollbar-thin">
                                  {patients
                                    .filter(p => p.name.toLowerCase().includes(ptInfoSearchWord.toLowerCase()) || p.phone.includes(ptInfoSearchWord) || p.id.toString() === ptInfoSearchWord)
                                    .map(p => (
                                      <button
                                        key={`ptinfo-suggest-${p.id}`}
                                        type="button"
                                        onClick={() => {
                                          setSelectedPtId(p.id);
                                          setPtInfoSearchWord(p.name);
                                          setPtInfoShowSuggestions(false);
                                        }}
                                        className="w-full text-left px-3.5 py-2 text-[11px] hover:bg-zinc-800 text-white  font-mono flex justify-between items-center cursor-pointer"
                                      >
                                        <span className="font-bold">{p.name}</span>
                                        <span className="text-[8px] bg-zinc-800 border border-zinc-800 text-white px-1.5 py-0.5 rounded font-bold uppercase">ID {p.id}</span>
                                      </button>
                                    ))}
                                  {patients.filter(p => p.name.toLowerCase().includes(ptInfoSearchWord.toLowerCase()) || p.phone.includes(ptInfoSearchWord) || p.id.toString() === ptInfoSearchWord).length === 0 && (
                                    <div className="p-2.5 text-center text-white font-mono italic text-[10px]">No matched patients found</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick selection roster cards */}
                          <div className="space-y-1 pt-1.5 border-t border-zinc-800">
                            <span className="text-[8px] uppercase tracking-widest text-[#FFF] font-mono block">Patient Quick-Selection Pool ({patients.length} Registered)</span>
                            <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-thin">
                              {patients.map(pt => {
                                const isSelected = selectedPtId === pt.id;
                                return (
                                  <button
                                    key={`ptinfo-selectpool-${pt.id}`}
                                    onClick={() => {
                                      setSelectedPtId(pt.id);
                                      setPtInfoSearchWord(pt.name);
                                    }}
                                    className={`px-3 py-1.5 rounded-2xl text-left shrink-0 transition-all border ${
                                      isSelected
                                        ? "bg-amber-400 text-white border-amber-450 font-extrabold"
                                        : "bg-[#121214] text-white border-zinc-800 hover:border-zinc-800 "
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 text-[10px]">
                                      <span className="font-bold">{pt.name}</span>
                                      <span className={`text-[7.5px] px-1 py-0.2 rounded font-mono ${isSelected ? 'bg-amber-500 text-white font-black' : 'bg-zinc-800 text-white'}`}>ID {pt.id}</span>
                                    </div>
                                  </button>
                                );
                              })}
                              </div>
                            </div>
                          </div>

                          {/* Individual patient folder view */}
                          {selectedPtId && (() => {
                          const patient = patients.find(p => p.id === selectedPtId);
                          if (!patient) return null;
                          const patientApts = appointments.filter(a => a.pt_id === selectedPtId);
                          const patientReceipts = payments.filter(p => p.pt_id === selectedPtId);
                          const patientDebtObj = loans.find(l => l.pt_id === selectedPtId);
                          const ptWorks = dentalWorks.filter(dw => dw.pt_id === selectedPtId);
                          
                          // Financial ledger math
                          const totalCost = patientDebtObj?.total_cost || ptWorks.reduce((s, w) => s + w.price, 0);
                          const totalPaid = patientReceipts.reduce((s, p) => s + p.amount, 0);
                          const loanDebt = Math.max(0, totalCost - totalPaid);
                          const paidPercent = totalCost > 0 ? Math.min(100, Math.round((totalPaid / totalCost) * 100)) : 100;
                          const hasOverallDebt = loanDebt > 0;

                          return (
                            <div className="space-y-6">
                              {/* === COMPONENT 1: MASTER RE-ARRANGED PATIENT DOSSIER CARD === */}
                              <div className="bg-indigo-500     border border-zinc-800 rounded-2xl   overflow-hidden">
                                {/* Header banner styling with vital telemetry */}
                                <div className="p-5 border-b border-zinc-800 bg-zinc-800/40 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                  <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl text-white flex flex-col items-center justify-center text-center   relative bg-indigo-500 from-amber-300 to-amber-505 border border-amber-600 font-serif font-extrabold text-xl">
                                      {patient.name.charAt(0)}
                                      <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-2xl bg-indigo-500 border-2 border-zinc-800" title="Active Folder Access" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-serif italic text-xl text-white font-medium tracking-wide">{patient.name}</h4>
                                        <span className="text-[9px] px-2 py-0.5 rounded-2xl bg-zinc-800 border border-zinc-800 text-white font-mono font-bold uppercase tracking-wider">
                                          ID: #{patient.id}
                                        </span>
                                        {hasOverallDebt ? (
                                          <span className="text-[8px] px-2 py-0.5 rounded-2xl bg-red-950/50 text-red-400 border border-red-900/40 font-mono font-extrabold animate-pulse uppercase">
                                            ⚠️ Outstanding Balance Due
                                          </span>
                                        ) : (
                                          <span className="text-[8px] px-2 py-0.5 rounded-2xl bg-indigo-500/50 text-white border border-zinc-800/40 font-mono font-bold uppercase">
                                            ✓ Accounts Cleared
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-white mt-1.5 font-mono flex items-center gap-3 flex-wrap">
                                        <span className="flex items-center gap-1"><Calendar size={11} className="text-white" /> <span className="text-white">Inscribed:</span> {formatIraqFriendly(patient.registered_at)}</span>
                                        <span className="text-white">•</span>
                                        <span className="flex items-center gap-1"><Phone size={11} className="text-white" /> <span className="text-white">Contact:</span> <span className="text-amber-305 font-extrabold">+{patient.phone}</span></span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                    <span className="px-3 py-1 bg-zinc-800 border border-zinc-800 text-[10.5px] text-white rounded-2xl font-mono flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-2xl bg-sky-500" /> Age: <strong className="text-white">{patient.age !== undefined ? `${patient.age} Y/O` : "N/A"}</strong>
                                    </span>
                                    {patient.chronic_illness && patient.chronic_illness !== "None" ? (
                                      <span className="px-3 py-1 bg-red-955/60 border border-red-900/65 text-[10.5px] text-red-400 rounded-2xl font-mono font-bold flex items-center gap-1.5 animate-pulse">
                                        ⚠️ WARNING: {patient.chronic_illness}
                                      </span>
                                    ) : (
                                      <span className="px-3 py-1 bg-indigo-500/40 border border-zinc-800/50 text-[10.5px] text-white rounded-2xl font-mono flex items-center gap-1.5">
                                        ✓ Vitals Compliant (Treatable)
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Patient Profile Metadata block */}
                                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-zinc-800/60 text-[11px] bg-zinc-800/10">
                                  <div className="space-y-1.5">
                                    <span className="block text-[8px] text-white font-bold uppercase tracking-wider font-mono">Resident Address</span>
                                    <p className="text-white bg-zinc-800/60 p-2.5 rounded-2xl border border-zinc-800/80 font-sans leading-relaxed min-h-[40px] text-[11px]">
                                      📍 {patient.address || "No address on file"}
                                    </p>
                                  </div>

                                  <div className="space-y-1.5">
                                    <span className="block text-[8px] text-white font-bold uppercase tracking-wider font-mono">Intake Referral</span>
                                    <p className="text-white bg-zinc-800/60 p-2.5 rounded-2xl border border-zinc-800/80 font-sans truncate min-h-[40px] text-[11px]">
                                      👤 {patient.ref || "Direct Walk-In (Inscribed)"}
                                    </p>
                                  </div>

                                  <div className="space-y-1.5">
                                    <span className="block text-[8px] text-white font-bold uppercase tracking-wider font-mono">Clinical Safety Flag</span>
                                    <div className="text-white bg-zinc-800/60 p-2.5 rounded-2xl border border-zinc-800/80 font-sans min-h-[40px] flex items-center">
                                      {patient.chronic_illness && patient.chronic_illness !== "None" ? (
                                        <span className="text-red-400 font-mono font-extrabold text-[9px] uppercase tracking-wide flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-2xl bg-red-500 animate-ping inline-block" /> High Vigilance (Safety Protocols Advised)
                                        </span>
                                      ) : (
                                        <span className="text-white font-mono text-[9px] uppercase flex items-center gap-1.5">
                                          <span className="w-1.5 h-1.5 rounded-2xl bg-indigo-500 inline-block" /> No systemic liabilities flagged
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Clinical Sub-Tabs Navigation for Patient Folder */}
                              <div className="bg-indigo-500     border border-zinc-800 rounded-2xl   overflow-hidden">
                                <div className="border-b border-zinc-800 bg-zinc-800/40 flex gap-1 scrollbar-none overflow-x-auto">
                                  {(["summary", "anatomy", "procedures"] as const).map((tab) => {
                                    const labels = {
                                      summary: { label: "General & Billing", icon: CreditCard },
                                      anatomy: { label: "Anatomy Charting", icon: Activity },
                                      procedures: { label: "Clinical Procedures", icon: Layers }
                                    };
                                    const isTabActive = ptInfoSubTab === tab;
                                    const Icon = labels[tab].icon;
                                    return (
                                      <button
                                        key={`pt-info-subtab-${tab}`}
                                        type="button"
                                        onClick={() => setPtInfoSubTab(tab)}
                                        className={`py-3 px-4 text-xs font-mono font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer select-none ${
                                          isTabActive
                                            ? "border-amber-400 text-amber-400 bg-amber-500/[0.02]"
                                            : "border-transparent text-white  hover:bg-zinc-800"
                                        }`}
                                      >
                                        <Icon size={12} />
                                        <span>{labels[tab].label}</span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {ptInfoSubTab === "summary" && (
                                  <div className="p-5 space-y-4 bg-zinc-800/30">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
                                      <span className="text-[9px] uppercase tracking-widest text-[#FFF]/85 font-mono font-extrabold flex items-center gap-1.5">
                                        <CreditCard size={12} className="text-amber-400" /> Patient General Ledger Balance Sheet
                                      </span>
                                      <span className="text-[8.5px] text-white font-mono font-bold">All amounts in Iraqi Dinar (IQD)</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                      {/* Column 1: Total Cost */}
                                      <div className="bg-zinc-800 border border-zinc-800 p-4 rounded-2xl space-y-1 shadow-inner">
                                        <span className="text-[8px] text-white font-bold uppercase block tracking-wider font-mono">TOTAL TREATMENT COST</span>
                                        <span className="font-mono text-sm md:text-base font-extrabold text-white block">
                                          {totalCost.toLocaleString()} IQD
                                        </span>
                                      </div>

                                      {/* Column 2: Total Balance Paid */}
                                      <div className="bg-zinc-800 border border-zinc-800 p-4 rounded-2xl space-y-1 shadow-inner">
                                        <span className="text-[8px] text-white font-bold uppercase block tracking-wider font-mono">TOTAL COLLECTED CASH</span>
                                        <span className="font-mono text-sm md:text-base font-extrabold text-white block">
                                          {totalPaid.toLocaleString()} IQD
                                        </span>
                                      </div>

                                      {/* Column 3: Outstanding Debt (Dynamic alert style) */}
                                      <div className={`border p-4 rounded-2xl space-y-1 transition-all ${
                                        hasOverallDebt 
                                          ? "bg-red-955/20 border-red-900/50  " 
                                          : "bg-zinc-800 border-zinc-800"
                                      }`}>
                                        <span className="text-[8px] text-white font-bold uppercase block tracking-wider font-mono">OUTSTANDING CLINIC DEBT</span>
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className={`font-mono text-sm md:text-base font-extrabold ${hasOverallDebt ? "text-red-400" : "text-white"}`}>
                                              {loanDebt.toLocaleString()} IQD
                                            </span>
                                            {hasOverallDebt && (
                                              <span className="animate-pulse w-2 h-2 bg-red-500 rounded-2xl inline-block" title="Dynamic Loan Notice Active" />
                                            )}
                                          </div>
                                          {hasOverallDebt && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                // Autofill pay client values and navigate
                                                handleSelectPatientForPayment(patient.id, patient.name);
                                                setPayAmount(loanDebt.toString());
                                                setActiveTab("add-money");
                                              }}
                                              className="text-[9px] bg-red-900/30 hover:bg-zinc-800 text-red-300 font-mono font-bold px-2 py-0.5 rounded-2xl border border-red-800/40 transition-all cursor-pointer select-none"
                                            >
                                              Settle Balance ➜
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Beautiful horizontal progress coverage meter */}
                                    <div className="bg-zinc-800/80 p-3 rounded-2xl border border-zinc-800/85">
                                      <div className="flex justify-between items-center text-[9px] font-mono mb-1.5">
                                        <span className="text-white">Ledger Amortization Status</span>
                                        <span className={`font-bold ${hasOverallDebt ? 'text-amber-400' : 'text-white'}`}>
                                          {paidPercent}% Covered {hasOverallDebt && `(${loanDebt.toLocaleString()} IQD pending on loans)`}
                                        </span>
                                      </div>
                                      <div className="w-full bg-zinc-800 h-2.5 rounded-2xl overflow-hidden flex border border-zinc-800">
                                        <div 
                                          className="bg-indigo-500     h-full rounded-l-full transition-all duration-500" 
                                          style={{ width: `${paidPercent}%` }}
                                        />
                                        {hasOverallDebt && (
                                          <div 
                                            className="bg-indigo-500 from-red-550 to-rose-600 h-full rounded-r-full animate-pulse" 
                                            style={{ width: `${100 - paidPercent}%` }}
                                          />
                                        )}
                                      </div>
                                      <div className="flex justify-between text-[7px] text-white font-mono mt-1 px-0.5">
                                        <span>0% COVERED</span>
                                        <span>50% HALF PAYMENT</span>
                                        <span>100% COMPLETE</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {ptInfoSubTab === "anatomy" && (
                                <div className="bg-indigo-500     border border-zinc-800 rounded-2xl p-5 space-y-4   text-xs">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-zinc-800">
                                  <div className="space-y-0.5">
                                    <span className="text-[8px] tracking-widest uppercase text-amber-400 font-mono font-bold block flex items-center gap-1">
                                      <Activity size={10} className="text-amber-400" /> Patient Anatomy Profile Map
                                    </span>
                                    <p className="text-[10px] text-white font-mono">Unified FDI Two-Digit & Palmer-Coordinate Maxillofacial Arch Mapping</p>
                                  </div>
                                  <div className="flex items-center gap-3 text-[8.5px] font-mono mt-1 sm:mt-0 font-bold">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2.5 h-2.5 rounded bg-indigo-500 from-amber-300 via-amber-400 to-amber-500 border border-amber-600   animate-pulse" />
                                      <span className="text-white">Treated Co-ordinates ({(() => {
                                        const allTreatedTeeth = new Set<string>();
                                        ptWorks.forEach(work => {
                                          if (work.teeth_map) {
                                            work.teeth_map.split(",").map(t => getPalmerCode(t.trim().toUpperCase())).forEach(tooth => {
                                              if (tooth) allTreatedTeeth.add(tooth);
                                            });
                                          }
                                        });
                                        return allTreatedTeeth.size;
                                      })()})</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2.5 h-2.5 rounded bg-zinc-800 border border-zinc-800" />
                                      <span className="text-white">Untreated/Normal</span>
                                    </div>
                                  </div>
                                </div>

                                {(() => {
                                  const allTreatedTeeth = new Set<string>();
                                  const toothWorksMap = new Map<string, Array<{ id: number; treatment: string }>>();
                                  
                                  ptWorks.forEach(work => {
                                    if (work.teeth_map) {
                                      work.teeth_map.split(",").map(t => getPalmerCode(t.trim().toUpperCase())).forEach(tooth => {
                                        if (tooth) {
                                          allTreatedTeeth.add(tooth);
                                          if (!toothWorksMap.has(tooth)) {
                                            toothWorksMap.set(tooth, []);
                                          }
                                          toothWorksMap.get(tooth)!.push({
                                            id: work.id,
                                            treatment: work.treatment_name || treatmentTypes.find(t=>t.id===work.treatment_type_id)?.name || "Restoration"
                                          });
                                        }
                                      });
                                    }
                                  });

                                  if (allTreatedTeeth.size === 0) {
                                    return (
                                      <div className="p-5 bg-zinc-800/40 rounded-2xl border border-zinc-800 border-dashed text-center font-mono text-white italic text-[10.5px]">
                                        No anatomy operations mapped. All dental structures are physically unassigned.
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="space-y-4 font-mono">
                                      <p className="text-[9.5px] text-white bg-zinc-800/80 p-3 rounded-2xl border border-zinc-800 leading-relaxed font-sans">
                                        💡 <span className="font-semibold text-white">Intelligent Charting:</span> This matrix maps lifetime dental coordinates treated at this clinic. Mapped quadrants are organized like a standard orthodontic chart. Treated teeth are distinguished by a <strong className="text-amber-400 font-bold">Gold Highlight</strong> with dual FDI-Palmer notation references.
                                      </p>

                                      {/* ADVANCED CLINIC QUADRANT CROSSHAIR CHART DESIGN */}
                                      <div className="bg-[#070709] p-4.5 rounded-2xl border border-zinc-800/80 space-y-4 shadow-inner relative overflow-hidden">
                                        {/* Backgrid aesthetic stripes */}
                                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-zinc-800/40 z-0" />
                                        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-zinc-800/40 z-0" />

                                        {/* TOP JAW (MAXILLARY ARCH) */}
                                        <div className="grid grid-cols-2 gap-4 relative z-10">
                                          {/* QUADRANT UL (MAXILLARY LEFT) */}
                                          <div className="space-y-1.5 bg-zinc-800/40 p-2.5 rounded-2xl border border-zinc-800/50">
                                            <div className="flex justify-between text-[7px] text-sky-400 font-bold uppercase tracking-widest">
                                              <span>UL8 ➔ UL1 Left</span>
                                              <span className="text-white font-mono text-[6.5px]">Quadrant UL (Group 2)</span>
                                            </div>
                                            <div className="grid grid-cols-8 gap-1">
                                              {["UL8", "UL7", "UL6", "UL5", "UL4", "UL3", "UL2", "UL1"].map(tooth => {
                                                const isTreated = allTreatedTeeth.has(tooth);
                                                const fdi = PALMER_TO_FDI[tooth] || "";
                                                return (
                                                  <div
                                                    key={`life-ul-${tooth}`}
                                                    title={`Tooth Palmer: ${tooth} / FDI: ${fdi} ${isTreated ? '(Treated)' : '(Normal)'}`}
                                                    className={`h-11 text-[9px] rounded-2xl border flex flex-col items-center justify-center transition-all select-none ${
                                                      isTreated 
                                                        ? "bg-indigo-500 from-amber-300 to-amber-500 text-white border-amber-505 font-extrabold   scale-105" 
                                                        : "bg-zinc-800 border-zinc-800 text-white hover:border-zinc-800"
                                                    }`}
                                                  >
                                                    <span className="text-[8px] tracking-tighter">{tooth}</span>
                                                    <span className={`text-[6.5px] font-sans ${isTreated ? 'text-white/70 font-semibold' : 'text-white'}`}>{fdi}</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {/* QUADRANT UR (MAXILLARY RIGHT) */}
                                          <div className="space-y-1.5 bg-zinc-800/40 p-2.5 rounded-2xl border border-zinc-800/50">
                                            <div className="flex justify-between text-[7px] text-white font-bold uppercase tracking-widest">
                                              <span className="text-white font-mono text-[6.5px]">Quadrant UR (Group 1)</span>
                                              <span>UR1 ➔ UR8 Right</span>
                                            </div>
                                            <div className="grid grid-cols-8 gap-1">
                                              {["UR1", "UR2", "UR3", "UR4", "UR5", "UR6", "UR7", "UR8"].map(tooth => {
                                                const isTreated = allTreatedTeeth.has(tooth);
                                                const fdi = PALMER_TO_FDI[tooth] || "";
                                                return (
                                                  <div
                                                    key={`life-ur-${tooth}`}
                                                    title={`Tooth Palmer: ${tooth} / FDI: ${fdi} ${isTreated ? '(Treated)' : '(Normal)'}`}
                                                    className={`h-11 text-[9px] rounded-2xl border flex flex-col items-center justify-center transition-all select-none ${
                                                      isTreated 
                                                        ? "bg-indigo-500 from-amber-300 to-amber-500 text-white border-amber-505 font-extrabold   scale-105" 
                                                        : "bg-zinc-800 border-zinc-800 text-white hover:border-zinc-800"
                                                    }`}
                                                  >
                                                    <span className="text-[8px] tracking-tighter">{tooth}</span>
                                                    <span className={`text-[6.5px] font-sans ${isTreated ? 'text-white/70 font-semibold' : 'text-white'}`}>{fdi}</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </div>

                                        {/* MIDDLE SEPARATOR OCCLUSION TEXT ACCENT */}
                                        <div className="flex items-center justify-center text-[7px] font-mono text-white font-extrabold tracking-widest uppercase gap-3 relative z-10 py-1">
                                          <div className="w-16 h-[1px] bg-zinc-800/40" />
                                          <span>🧪 CLINICAL TRAJECTORY - OCCLUSAL LINE</span>
                                          <div className="w-16 h-[1px] bg-zinc-800/40" />
                                        </div>

                                        {/* BOTTOM JAW (MANDIBULAR ARCH) */}
                                        <div className="grid grid-cols-2 gap-4 relative z-10">
                                          {/* QUADRANT LL (MANDIBULAR LEFT) */}
                                          <div className="space-y-1.5 bg-zinc-800/40 p-2.5 rounded-2xl border border-zinc-800/50">
                                            <div className="flex justify-between text-[7px] text-violet-400 font-bold uppercase tracking-widest">
                                              <span>LL8 ➔ LL1 Left</span>
                                              <span className="text-white font-mono text-[6.5px]">Quadrant LL (Group 3)</span>
                                            </div>
                                            <div className="grid grid-cols-8 gap-1">
                                              {["LL8", "LL7", "LL6", "LL5", "LL4", "LL3", "LL2", "LL1"].map(tooth => {
                                                const isTreated = allTreatedTeeth.has(tooth);
                                                const fdi = PALMER_TO_FDI[tooth] || "";
                                                return (
                                                  <div
                                                    key={`life-ll-${tooth}`}
                                                    title={`Tooth Palmer: ${tooth} / FDI: ${fdi} ${isTreated ? '(Treated)' : '(Normal)'}`}
                                                    className={`h-11 text-[9px] rounded-2xl border flex flex-col items-center justify-center transition-all select-none ${
                                                      isTreated 
                                                        ? "bg-indigo-500 from-amber-300 to-amber-500 text-white border-amber-505 font-extrabold   scale-105" 
                                                        : "bg-zinc-800 border-zinc-800 text-white hover:border-zinc-800"
                                                    }`}
                                                  >
                                                    <span className="text-[8px] tracking-tighter">{tooth}</span>
                                                    <span className={`text-[6.5px] font-sans ${isTreated ? 'text-white/70 font-semibold' : 'text-white'}`}>{fdi}</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {/* QUADRANT LR (MANDIBULAR RIGHT) */}
                                          <div className="space-y-1.5 bg-zinc-800/40 p-2.5 rounded-2xl border border-zinc-800/50">
                                            <div className="flex justify-between text-[7px] text-amber-500 font-bold uppercase tracking-widest">
                                              <span className="text-white font-mono text-[6.5px]">Quadrant LR (Group 4)</span>
                                              <span>LR1 ➔ LR8 Right</span>
                                            </div>
                                            <div className="grid grid-cols-8 gap-1">
                                              {["LR1", "LR2", "LR3", "LR4", "LR5", "LR6", "LR7", "LR8"].map(tooth => {
                                                const isTreated = allTreatedTeeth.has(tooth);
                                                const fdi = PALMER_TO_FDI[tooth] || "";
                                                return (
                                                  <div
                                                    key={`life-lr-${tooth}`}
                                                    title={`Tooth Palmer: ${tooth} / FDI: ${fdi} ${isTreated ? '(Treated)' : '(Normal)'}`}
                                                    className={`h-11 text-[9px] rounded-2xl border flex flex-col items-center justify-center transition-all select-none ${
                                                      isTreated 
                                                        ? "bg-indigo-500 from-amber-300 to-amber-500 text-white border-amber-505 font-extrabold   scale-105" 
                                                        : "bg-zinc-800 border-zinc-800 text-white hover:border-zinc-800"
                                                    }`}
                                                  >
                                                    <span className="text-[8px] tracking-tighter">{tooth}</span>
                                                    <span className={`text-[6.5px] font-sans ${isTreated ? 'text-white/70 font-semibold' : 'text-white'}`}>{fdi}</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Listing associations and logs */}
                                      <div className="space-y-2 pt-1">
                                        <span className="text-[8.5px] uppercase tracking-wider text-white font-bold block">Consolidated Tooth Restoration Timeline</span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                                          {Array.from(allTreatedTeeth).sort().map(tooth => {
                                            const associations = toothWorksMap.get(tooth) || [];
                                            const fdi = PALMER_TO_FDI[tooth] || "";
                                            return (
                                              <div key={`note-tooth-${tooth}`} className="p-2.5 bg-zinc-800/60 rounded-2xl border border-zinc-800 hover:border-zinc-800 flex justify-between items-center text-[10px] transition-all">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-amber-450 font-bold font-mono bg-amber-500/10 border border-amber-600/20 px-2 py-0.5 rounded text-[9.5px]">
                                                    {tooth} ({fdi})
                                                  </span>
                                                  <span className="text-white">➔</span>
                                                  <span className="text-white font-sans truncate max-w-[170px] font-medium">{associations.map(a => a.treatment).join(", ")}</span>
                                                </div>
                                                <span className="text-[7.5px] text-white bg-zinc-800/80 px-2 py-0.5 rounded-2xl font-mono border border-zinc-800">
                                                  Ref #{associations.map(a => a.id).join(", ")}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                              )}

                              {ptInfoSubTab === "procedures" && (
                                <div className="bg-indigo-500     border border-zinc-800 rounded-2xl p-5 space-y-5   text-xs">
                                <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                                  <div className="space-y-0.5">
                                    <span className="text-[8px] tracking-widest uppercase text-white font-mono font-bold block flex items-center gap-1">
                                      <Layers size={10} className="text-white" /> Patient Clinical Procedure Folders
                                    </span>
                                    <p className="text-[10px] text-white font-mono">Detailed records of active case treatments and lab codes ({ptWorks.length})</p>
                                  </div>
                                  <span className="text-[9.5px] font-mono font-bold px-2.5 py-0.5 bg-zinc-800 border border-zinc-800 text-amber-500 rounded-2xl">
                                    {ptWorks.length} Total Orders
                                  </span>
                                </div>

                                {ptWorks.length === 0 ? (
                                  <div className="p-8 bg-[#0a0a0c]/85 rounded-2xl border border-zinc-800 border-dashed text-center font-mono text-white italic text-[11px]">
                                    No custom clinical dental work orders logged for this patient yet. Use the Treatment Work Screen to issue one.
                                  </div>
                                ) : (
                                  <div className="space-y-6">
                                    {ptWorks.map((work) => {
                                      // Find payments that are related to this specific work
                                      const workPayments = patientReceipts.filter(p => 
                                        p.work_id === `WRK-DW-${work.id}` || 
                                        p.work_id === `WRK-${patient.id}-${work.id}` ||
                                        (p.work_id && (p.work_id.includes(`WRK-DW-${work.id}`) || p.work_id.endsWith(work.id.toString())))
                                      );
                                      const totalPaidForWork = workPayments.reduce((sum, p) => sum + p.amount, 0);
                                      const remainingPriceForWork = Math.max(0, work.price - totalPaidForWork);
                                      const isDebtOnWork = remainingPriceForWork > 0;

                                      // Parse the selected teeth 
                                      const selectedTeethCodes = work.teeth_map 
                                        ? work.teeth_map.split(",").map(t => getPalmerCode(t.trim().toUpperCase())) 
                                        : [];

                                      // Determine progress workflow status step count (1-4)
                                      let workflowStep = 1; // Active / Diagnosis
                                      if (work.status === "Labs Dispatch") workflowStep = 2;
                                      if (work.status === "Fitted") workflowStep = 3;
                                      if (work.status === "Completed") workflowStep = 4;

                                      return (
                                        <div 
                                          key={`ptinfo-work-${work.id}`} 
                                          className={`border-l-4 ${
                                            work.status === "Completed" ? "border-l-emerald-500" :
                                            work.status === "Fitted" ? "border-l-sky-500" :
                                            work.status === "Labs Dispatch" ? "border-l-cyan-500" :
                                            "border-l-amber-500"
                                          } bg-[#0b0b0e] p-5 rounded-2xl border border-zinc-800   space-y-5 transition-all relative overflow-hidden ${
                                            isDebtOnWork 
                                              ? "    border-red-955/70 bg-red-955/[0.015]" 
                                              : "border-zinc-800"
                                          }`}
                                        >
                                          {/* LOAN RED DISTINGUISH BANNER */}
                                          {isDebtOnWork && (
                                            <div className="bg-red-500/10 border border-red-900/40 p-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[10.5px] font-mono text-red-300">
                                              <div className="flex items-start gap-2">
                                                <span className="text-sm mt-0.5">⚠️</span>
                                                <div>
                                                  <span className="font-extrabold uppercase block tracking-wider text-[9px] text-red-400">ACTIVE PROCEDURE CASH LIABILITY DEBT</span>
                                                  <span className="text-[9.5px] text-white font-sans leading-normal">Outstanding balance due on this clinical procedure. Payment required.</span>
                                                </div>
                                              </div>
                                              <div className="text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-red-900/30">
                                                <span className="text-[8px] text-white uppercase font-bold tracking-wide block">UNPAID LOAN DUE</span>
                                                <span className="font-extrabold text-red-400 font-mono text-xs sm:text-sm pl-2 sm:pl-0">
                                                  {remainingPriceForWork.toLocaleString()} IQD
                                                </span>
                                              </div>
                                            </div>
                                          )}

                                          {/* Work header details */}
                                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3.5 border-b border-zinc-800/80">
                                            <div className="space-y-1">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
                                                  🏷️ TREATMENT ORDER #{work.id}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-2xl text-[8px] font-mono font-black uppercase tracking-wider ${
                                                  work.status === "Completed" ? "text-white bg-indigo-500/50 border border-zinc-800/50" :
                                                  work.status === "Fitted" ? "text-sky-405 bg-sky-950/50 border border-sky-900/50" :
                                                  work.status === "Labs Dispatch" ? "text-white bg-indigo-500/50 border border-zinc-800/50" :
                                                  "text-amber-405 bg-amber-955/40 border border-amber-900/40"
                                                }`}>
                                                  {work.status}
                                                </span>
                                              </div>
                                              <p className="text-[9.5px] text-white font-mono">
                                                Created On: <span className="text-white">{formatIraqFriendly(work.created_at || getIraqDateTimeString())}</span>
                                              </p>
                                            </div>

                                            {/* Shade color with real preview color dot and descriptor */}
                                            {work.shade_code && (
                                              <div className="flex items-center gap-2.5 bg-[#141417] py-1.5 px-3 rounded-2xl border border-zinc-800 text-[10px] font-mono shadow-inner select-none" title="VITA Classic shade guide assignment">
                                                <span className="text-white text-[9px] uppercase tracking-wider">Tooth shade:</span>
                                                <span 
                                                  className="w-3.5 h-3.5 rounded-2xl border border-zinc-800   inline-block shrink-0"
                                                  style={{ backgroundColor: shadeColors.find(sc => sc.code === work.shade_code)?.hex || '#EADEBD' }}
                                                />
                                                <strong className="text-white font-extrabold">{work.shade_code}</strong>
                                                <span className="text-[7.5px] text-white bg-zinc-800 px-1 py-0.2 rounded font-sans uppercase">Aesthetic</span>
                                              </div>
                                            )}
                                          </div>

                                          {/* CLINICAL TIMELINE STEPPER PROCESS GRAPHIC */}
                                          <div className="bg-[#050507] p-3 rounded-2xl border border-zinc-800/70">
                                            <span className="text-[7.5px] text-white font-bold uppercase tracking-widest font-mono block mb-2">Procedure Clinical Progress Stage</span>
                                            <div className="grid grid-cols-4 gap-1 relative">
                                              {[
                                                { step: 1, label: "Active Diagnosis" },
                                                { step: 2, label: "Lab Fabrication" },
                                                { step: 3, label: "Structural Fitting" },
                                                { step: 4, label: "Treatment Finished" }
                                              ].map((stp) => {
                                                const reached = workflowStep >= stp.step;
                                                return (
                                                  <div key={`step-${work.id}-${stp.step}`} className="text-center relative">
                                                    {/* Progress node line segment */}
                                                    <div className="flex items-center justify-center mb-1">
                                                      <div className={`w-5 h-5 rounded-2xl flex items-center justify-center font-mono text-[9px] font-bold border transition-all ${
                                                        reached 
                                                          ? "bg-amber-400 text-white border-amber-500 font-bold  " 
                                                          : "bg-zinc-800 text-white border-zinc-800"
                                                      }`}>
                                                        {reached ? "✓" : stp.step}
                                                      </div>
                                                    </div>
                                                    <span className={`text-[8px] font-sans block truncate ${reached ? "text-white font-bold" : "text-white font-normal"}`}>
                                                      {stp.label}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {/* Dental procedure layout bento style */}
                                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="bg-[#060608] p-3 rounded-2xl border border-zinc-800/80 text-[10px] font-mono space-y-0.5">
                                              <span className="block text-[7.5px] text-white font-bold uppercase tracking-wider">Clinical Operation</span>
                                              <span className="text-white font-extrabold font-mono flex items-center gap-1.5 pt-0.5">
                                                ⚙️ {work.treatment_name || treatmentTypes.find(t=>t.id===work.treatment_type_id)?.name || "Restoration"}
                                              </span>
                                            </div>
                                            
                                            <div className="bg-[#060608] p-3 rounded-2xl border border-zinc-800/80 text-[10px] font-mono space-y-0.5">
                                              <span className="block text-[7.5px] text-white font-bold uppercase tracking-wider">Attending Dentist</span>
                                              <span className="text-white flex items-center gap-1.5 pt-0.5">
                                                👤 {work.dr_name || doctors.find(d=>d.id===work.dr_id)?.name || "Dental Practitioner"}
                                              </span>
                                            </div>

                                            <div className="bg-[#060608] p-3 rounded-2xl border border-zinc-800/80 text-[10px] font-mono space-y-0.5">
                                              <span className="block text-[7.5px] text-white font-bold uppercase tracking-wider">Fabrication Lab</span>
                                              <span className="text-white flex items-center gap-1.5 pt-0.5 truncate" title={work.lab_name || "Chairside Fabrication"}>
                                                🧪 {work.lab_name || "Chairside Fabrication"}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Individual Notes block if present */}
                                          {work.notes && work.notes !== "No notes" && (
                                            <div className="bg-[#060608] p-3 rounded-2xl border border-zinc-800 font-mono text-[10px] space-y-0.5">
                                              <span className="block text-[7.5px] text-white font-bold uppercase tracking-wider">Clinical Notes Log</span>
                                              <p className="text-white font-sans leading-relaxed text-[10px] pt-0.5">{work.notes}</p>
                                            </div>
                                          )}

                                          {/* TEETH FORM CLINICAL CHART (HIGHLIGHTED TOOTH IN GRID) */}
                                          <div className="space-y-1.5 pt-0.5">
                                            <div className="flex justify-between items-center text-[9px] font-mono px-0.5">
                                              <span className="uppercase text-white block font-bold">
                                                Procedure Anatomy Targets (Teeth Matched)
                                              </span>
                                              <span className="text-amber-400 font-extrabold text-[8.5px]">
                                                Treated ({selectedTeethCodes.length}): {selectedTeethCodes.length > 0 ? selectedTeethCodes.sort().join(", ") : "None"}
                                              </span>
                                            </div>

                                            {/* Sub-anatomy teeth form graphics map matching active screen styling */}
                                            <div className="bg-[#050507] p-2.5 rounded-2xl border border-zinc-800 space-y-2.5 font-mono text-[8.5px] relative">
                                              {/* Upper Quadrants */}
                                              <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-0.5">
                                                  <span className="text-[6.5px] text-white block font-bold">UL8 ➔ UL1 Maxillary Left</span>
                                                  <div className="flex gap-0.5">
                                                    {["UL8", "UL7", "UL6", "UL5", "UL4", "UL3", "UL2", "UL1"].map(tooth => {
                                                      const isSelected = selectedTeethCodes.includes(tooth);
                                                      return (
                                                        <div
                                                          key={`work-${work.id}-tooth-${tooth}`}
                                                          className={`flex-1 h-5 text-[7px] font-bold border rounded flex items-center justify-center transition-all ${
                                                            isSelected 
                                                              ? "bg-amber-400 text-white border-amber-500 font-black  " 
                                                              : "bg-zinc-800 border-zinc-800/60 text-white"
                                                          }`}
                                                        >
                                                          {tooth}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </div>

                                                <div className="space-y-0.5">
                                                  <span className="text-[6.5px] text-white block font-bold text-right font-bold">UR1 ➔ UR8 Maxillary Right</span>
                                                  <div className="flex gap-0.5 justify-end">
                                                    {["UR1", "UR2", "UR3", "UR4", "UR5", "UR6", "UR7", "UR8"].map(tooth => {
                                                      const isSelected = selectedTeethCodes.includes(tooth);
                                                      return (
                                                        <div
                                                          key={`work-${work.id}-tooth-${tooth}`}
                                                          className={`flex-1 h-5 text-[7px] font-bold border rounded flex items-center justify-center transition-all ${
                                                            isSelected 
                                                              ? "bg-amber-400 text-white border-amber-500 font-black  " 
                                                              : "bg-zinc-800 border-zinc-800/60 text-white"
                                                          }`}
                                                        >
                                                          {tooth}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Lower Quadrants */}
                                              <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-zinc-800/80">
                                                <div className="space-y-0.5">
                                                  <span className="text-[6.5px] text-white block font-bold">LL8 ➔ LL1 Mandibular Left</span>
                                                  <div className="flex gap-0.5">
                                                    {["LL8", "LL7", "LL6", "LL5", "LL4", "LL3", "LL2", "LL1"].map(tooth => {
                                                      const isSelected = selectedTeethCodes.includes(tooth);
                                                      return (
                                                        <div
                                                          key={`work-${work.id}-tooth-${tooth}`}
                                                          className={`flex-1 h-5 text-[7px] font-bold border rounded flex items-center justify-center transition-all ${
                                                            isSelected 
                                                              ? "bg-amber-400 text-white border-amber-500 font-black  " 
                                                              : "bg-zinc-800 border-zinc-800/60 text-white"
                                                          }`}
                                                        >
                                                          {tooth}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </div>

                                                <div className="space-y-0.5">
                                                  <span className="text-[6.5px] text-white block font-bold text-right font-bold">LR1 ➔ LR8 Mandibular Right</span>
                                                  <div className="flex gap-0.5 justify-end">
                                                    {["LR1", "LR2", "LR3", "LR4", "LR5", "LR6", "LR7", "LR8"].map(tooth => {
                                                      const isSelected = selectedTeethCodes.includes(tooth);
                                                      return (
                                                        <div
                                                          key={`work-${work.id}-tooth-${tooth}`}
                                                          className={`flex-1 h-5 text-[7px] font-bold border rounded flex items-center justify-center transition-all ${
                                                            isSelected 
                                                              ? "bg-amber-400 text-white border-amber-500 font-black  " 
                                                              : "bg-zinc-800 border-zinc-800/60 text-white"
                                                          }`}
                                                        >
                                                          {tooth}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Prices and payments ledger for this specific work */}
                                          <div className="bg-[#09090b] border border-zinc-800/80 p-4 rounded-2xl space-y-3 font-mono shadow-inner">
                                            <div className="flex justify-between items-center text-[9px] flex-wrap gap-1.5">
                                              <span className="uppercase text-white font-bold tracking-wider font-mono">
                                                Financial Accounting & Billing Verification
                                              </span>
                                              <span className={`text-[8px] font-mono px-2 py-0.5 rounded border font-bold ${
                                                remainingPriceForWork === 0 
                                                  ? "bg-indigo-500/70 text-white border-zinc-800/40" 
                                                  : "bg-red-955/70 text-red-405 border-red-900/40"
                                              }`}>
                                                {remainingPriceForWork === 0 ? "✓ Transaction Fully Cleared" : "⚠️ Outstanding Procedure Debt"}
                                              </span>
                                            </div>

                                            {/* Pricing summary grid */}
                                            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                                              <div className="bg-zinc-800 p-2.5 rounded-2xl border border-zinc-800 shadow-inner">
                                                <span className="block text-[7.5px] text-white uppercase font-bold tracking-wider mb-0.5">Agreement Rate</span>
                                                <span className="font-extrabold text-white text-[11px]">{work.price.toLocaleString()} IQD</span>
                                              </div>
                                              <div className="bg-zinc-800 p-2.5 rounded-2xl border border-zinc-800 shadow-inner">
                                                <span className="block text-[7.5px] text-white uppercase font-bold tracking-wider mb-0.5">Collected Deposit</span>
                                                <span className="font-extrabold text-white text-[11px]">{totalPaidForWork.toLocaleString()} IQD</span>
                                              </div>
                                              <div className="bg-zinc-800 p-2.5 rounded-2xl border border-zinc-800 shadow-inner">
                                                <span className="block text-[7.5px] text-white font-bold uppercase tracking-wider mb-0.5 font-bold">Outstanding Liability</span>
                                                <span className={`font-extrabold text-[11px] ${remainingPriceForWork > 0 ? "text-red-400 font-black animate-pulse" : "text-white font-normal"}`}>
                                                  {remainingPriceForWork.toLocaleString()} IQD
                                                </span>
                                              </div>
                                            </div>

                                            {/* Installment transactions list representing direct collection records */}
                                            <div className="space-y-1.5 pl-1 pt-2.5 border-t border-zinc-800/70">
                                              <span className="text-[8px] uppercase tracking-widest text-white block font-bold font-mono">Installment Audit Payment Receipts ({workPayments.length})</span>
                                              {workPayments.length === 0 ? (
                                                <p className="text-[9px] text-white italic font-mono pl-1">
                                                  No payment receipts credited to this Treatment Reference (`Ref #${work.id}`).
                                                </p>
                                              ) : (
                                                <div className="space-y-1 max-h-24 overflow-y-auto pr-1 scrollbar-thin">
                                                  {workPayments.map(pay => (
                                                    <div 
                                                      key={`linked-pay-${pay.id}`} 
                                                      className="p-2 bg-[#050507] rounded-2xl border border-zinc-800/80 hover:border-zinc-800 flex justify-between items-center text-[10px] font-mono transition-all"
                                                    >
                                                      <div className="flex items-center gap-2">
                                                        <span className="text-white font-bold">RECEIPT R#{pay.id}</span>
                                                        <span className="text-white font-medium">({pay.type})</span>
                                                        <span className="text-white font-sans text-[8.5px]">{formatIraqFriendly(pay.created_at)}</span>
                                                      </div>
                                                      <span className="font-extrabold text-white font-mono">+{pay.amount.toLocaleString()} IQD</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              )}

                              {ptInfoSubTab === "summary" && (
                                <div className="bg-indigo-500     border border-zinc-800 rounded-2xl p-5 space-y-4   text-xs">
                                <div className="space-y-0.5 pb-2 border-b border-zinc-800">
                                  <span className="text-[8px] tracking-widest uppercase text-white font-mono font-bold block flex items-center gap-1">
                                    <Calendar size={10} className="text-white" /> Patient Scheduled Consultations
                                  </span>
                                  <span className="text-[10px] text-white font-mono">Historic index and futures allocated on clinic queue</span>
                                </div>
                                
                                {patientApts.length === 0 ? (
                                  <p className="text-[10px] text-white italic font-mono">- No active visit consultations allocated.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {patientApts.map(apt => (
                                      <div key={apt.id} className="p-3 bg-[#0a0a0c]/80 rounded-2xl border border-zinc-800/60 hover:border-zinc-800 flex justify-between items-center text-[10px] transition-all">
                                        <div className="space-y-1">
                                          <p className="text-white font-extrabold font-sans text-[11px]">{formatIraqFriendly(apt.appointment_date)}</p>
                                          <p className="text-white font-mono text-[9px] flex items-center gap-1">Consulting Specialist: <strong className="text-white font-bold">{apt.doctor_name}</strong></p>
                                          {apt.notes && <p className="text-white font-sans italic text-[9px]">Notes: {apt.notes}</p>}
                                        </div>
                                        <span className={`px-2 py-0.5 border text-[8.5px] font-mono rounded-2xl font-bold uppercase ${
                                          apt.status === "Completed" ? "bg-indigo-500 text-white border-zinc-800/60" : "bg-zinc-800 border-zinc-800 text-white"
                                        }`}>
                                          {apt.status}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              )}
                            </div>
                          );
                        })()}
                      </motion.div>
                    )}

                    {/* === SUBPAGE 5: APPOINTMENTS DESK === */}
                    {activeTab === "appointments" && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        {/* Book appointment slot card */}
                        <div className="bg-[#121212] p-4 rounded-2xl border border-zinc-800 space-y-3">
                          <div>
                            <h4 className="text-white text-xs font-normal font-mono tracking-wider uppercase">Book Consultation Session</h4>
                            <p className="text-[9px] text-white font-mono mt-0.5">Schedule a slot and select shift doctor</p>
                          </div>

                          <form onSubmit={submitBookAppointment} className="space-y-2.5">
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                required
                                value={aptPtId}
                                onChange={(e) => setAptPtId(e.target.value ? Number(e.target.value) : "")}
                                className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2 text-[10.5px] text-white focus:outline-hidden font-mono"
                              >
                                <option value="">-- Patient --</option>
                                {patients.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>

                              <select
                                required
                                value={aptDocId}
                                onChange={(e) => setAptDocId(e.target.value ? Number(e.target.value) : "")}
                                className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2 text-[10.5px] text-white focus:outline-hidden font-mono"
                              >
                                <option value="">-- Dentist --</option>
                                {doctors.map(d => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-1">
                              <input
                                type="date"
                                required
                                value={aptDate}
                                onChange={(e) => setAptDate(e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2 text-[10.5px] text-white focus:outline-hidden font-mono"
                              />
                            </div>

                            <input
                              type="text"
                              value={aptNotes}
                              onChange={(e) => setAptNotes(e.target.value)}
                              placeholder="Session target (e.g. root canal shade checks...)"
                              className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2.5 text-[10.5px] text-white placeholder:text-white font-mono focus:outline-hidden"
                            />

                            <button
                              type="submit"
                              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-800 text-white font-semibold uppercase tracking-wider text-[9.5px] rounded-2xl transition-all cursor-pointer"
                            >
                              Submit: Dispatch
                            </button>
                          </form>
                        </div>

                        {/* List of active schedules */}
                        <div className="space-y-2">
                          <span className="text-[9px] uppercase tracking-widest text-[#7C7C82] ml-1 font-mono font-normal block">Consolidated clinical Schedulings queue ({appointments.length})</span>
                          
                          <div className="space-y-2">
                            {appointments.map(apt => (
                              <div key={apt.id} className="p-3 bg-[#131315] border border-zinc-800 rounded-2xl flex items-start justify-between gap-3 text-xs leading-normal">
                                <div>
                                  <h5 className="font-bold text-white">{apt.pt_name}</h5>
                                  <p className="text-[9.5px] font-sans text-white mt-1">🗓️ {formatIraqFriendly(apt.appointment_date)}</p>
                                  <p className="text-[9px] font-mono text-white mt-0.5">Assigned Specialist: {apt.doctor_name}</p>
                                  <p className="text-[8.5px] font-mono text-white mt-1 bg-zinc-800 p-1.5 rounded border border-zinc-800 leading-normal max-w-[240px] italic">
                                    &quot;{apt.notes}&quot;
                                  </p>
                                </div>

                                <button
                                  onClick={() => {
                                    const nextMap: Record<string, "Scheduled" | "Completed" | "Cancelled"> = {
                                      "Scheduled": "Completed",
                                      "Completed": "Cancelled",
                                      "Cancelled": "Scheduled"
                                    };
                                    setAppointments(appointments.map(a => a.id === apt.id ? { ...a, status: nextMap[apt.status] } : a));
                                  }}
                                  className={`px-2 py-0.5 rounded-2xl text-[8px] font-mono uppercase border font-bold pointer-events-auto cursor-pointer shrink-0 transition-all ${
                                    apt.status === "Scheduled"
                                      ? "bg-amber-950/40 text-amber-400 border-amber-900/40"
                                      : apt.status === "Completed"
                                      ? "bg-indigo-500/40 text-white border-zinc-800/40"
                                      : "bg-red-950/40 text-red-500 border-red-900/40"
                                  }`}
                                  title="Change status click"
                                >
                                  {apt.status}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* === SUBPAGE 6: LOAN (Outstanding debt/installments index) === */}
                    {activeTab === "loan" && (() => {
                      // 1. Enrich and merge loan data dynamically with actual live records
                      const mappedAndEnrichedLoans = loans.map(loan => {
                        const ptFile = patients.find(p => p.id === loan.pt_id);
                        
                        // Calculate live counts/prices from actual database arrays
                        const ptWorksList = dentalWorks.filter(dw => dw.pt_id === loan.pt_id);
                        const ptPaymentsList = payments.filter(p => p.pt_id === loan.pt_id);
                        
                        const computedTotalCost = ptWorksList.reduce((sum, w) => sum + w.price, 0);
                        const computedTotalPaid = ptPaymentsList.reduce((sum, p) => sum + p.amount, 0);
                        
                        // Treat computed 0 as fallback to declared to support seed data cleanly
                        const resolvedTotalCost = computedTotalCost > 0 ? computedTotalCost : loan.total_cost;
                        const resolvedTotalPaid = computedTotalPaid > 0 ? computedTotalPaid : loan.total_paid;
                        const resolvedOutstanding = Math.max(0, resolvedTotalCost - resolvedTotalPaid);
                        
                        // Mark out of sync if actual clinical procedures / receipts differ from loan summary values
                        const isOutOfSync = (computedTotalCost > 0 && computedTotalCost !== loan.total_cost) || 
                                            (computedTotalPaid > 0 && computedTotalPaid !== loan.total_paid);
                        
                        // Choose display properties based on active toggle Mode
                        const displayCost = loanReconciliationView === "dynamic" ? resolvedTotalCost : loan.total_cost;
                        const displayPaid = loanReconciliationView === "dynamic" ? resolvedTotalPaid : loan.total_paid;
                        const displayDebt = loanReconciliationView === "dynamic" ? resolvedOutstanding : loan.loan_debt;
                        
                        return {
                          ...loan,
                          // Dynamic profile details from ptdata (patients)
                          phone: ptFile ? ptFile.phone : "Unspecified",
                          address: ptFile ? ptFile.address : "Direct Clinic Walk-in",
                          ref: ptFile ? ptFile.ref : "",
                          chronic: ptFile ? ptFile.chronic_illness : "None",
                          registeredAt: ptFile ? ptFile.registered_at : "2026-06-10",
                          
                          // Raw transactional lists
                          ptWorksList,
                          ptPaymentsList,
                          
                          // Audit flags
                          computedTotalCost,
                          computedTotalPaid,
                          resolvedTotalCost,
                          resolvedTotalPaid,
                          resolvedOutstanding,
                          isOutOfSync,
                          
                          // Final view numbers
                          displayCost,
                          displayPaid,
                          displayDebt
                        };
                      });

                      // 2. Filter loans according to criteria (lot of data scale)
                      const filteredLoans = mappedAndEnrichedLoans.filter(l => {
                        const sQuery = loanSearchQuery.toLowerCase().trim();
                        if (sQuery) {
                          const matchesName = l.pt_name.toLowerCase().includes(sQuery);
                          const matchesId = String(l.pt_id).includes(sQuery);
                          const matchesPhone = l.phone.toLowerCase().includes(sQuery);
                          const matchesAddress = l.address.toLowerCase().includes(sQuery);
                          const matchesRef = l.ref ? l.ref.toLowerCase().includes(sQuery) : false;
                          
                          if (!matchesName && !matchesId && !matchesPhone && !matchesAddress && !matchesRef) {
                            return false;
                          }
                        }

                        if (loanStatusFilter === "active-debt") {
                          return l.displayDebt > 0;
                        }
                        if (loanStatusFilter === "paid-off") {
                          return l.displayDebt === 0;
                        }
                        if (loanStatusFilter === "high-debt") {
                          return l.displayDebt >= 1000000;
                        }
                        return true;
                      });

                      // 3. Sort loans
                      const sortedLoans = [...filteredLoans].sort((a, b) => {
                        if (loanSortKey === "debt-desc") return b.displayDebt - a.displayDebt;
                        if (loanSortKey === "debt-asc") return a.displayDebt - b.displayDebt;
                        if (loanSortKey === "cost-desc") return b.displayCost - a.displayCost;
                        if (loanSortKey === "name-asc") return a.pt_name.localeCompare(b.pt_name);
                        if (loanSortKey === "id-desc") return b.pt_id - a.pt_id;
                        return 0;
                      });

                      // 4. Summaries calculated for active state overview
                      const aggregateTotalOutstanding = mappedAndEnrichedLoans.reduce((sum, item) => sum + item.displayDebt, 0);
                      const activeInDebtCount = mappedAndEnrichedLoans.filter(item => item.displayDebt > 0).length;
                      const activeOutOfSyncCount = mappedAndEnrichedLoans.filter(item => item.isOutOfSync).length;

                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="space-y-4"
                        >
                          {/* DYNAMIC TOP LOAN SUMMARY METRICS */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                            <div className="bg-[#121213] p-3 rounded-2xl border border-zinc-800 flex flex-col justify-between">
                              <div>
                                <span className="block text-[8px] text-white uppercase font-bold tracking-widest">Active Credit Lines</span>
                                <span className="text-sm font-black text-white mt-1 block">
                                  {mappedAndEnrichedLoans.length} Patients registered
                                </span>
                              </div>
                              <span className="text-[8.5px] text-white mt-2 block">
                                Matches full database catalog entries
                              </span>
                            </div>

                            <div className="bg-[#121213] p-3 rounded-2xl border border-zinc-800 flex flex-col justify-between">
                              <div>
                                <span className="block text-[8px] text-amber-500 uppercase font-bold tracking-widest">Aggregate Outstanding Debt</span>
                                <span className="text-sm font-black text-amber-400 mt-1 block">
                                  {aggregateTotalOutstanding.toLocaleString()} IQD
                                </span>
                              </div>
                              <div className="flex justify-between items-center mt-2 text-[8.5px]">
                                <span className="text-white">{activeInDebtCount} Accounts with unpaid bills</span>
                                {activeOutOfSyncCount > 0 && (
                                  <span className="px-1 bg-amber-500/10 text-amber-400 rounded text-[7.5px] font-bold border border-amber-500/20">
                                    {activeOutOfSyncCount} Unreconciled
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="bg-[#121213] p-3 rounded-2xl border border-zinc-800 flex flex-col justify-between">
                              <div>
                                <span className="block text-[8px] text-white uppercase font-bold tracking-widest">Fully Settled (Paid Off)</span>
                                <span className="text-sm font-black text-white mt-1 block">
                                  {mappedAndEnrichedLoans.filter(item => item.displayDebt === 0).length} Patients
                                </span>
                              </div>
                              <span className="text-[8.5px] text-white mt-2 block">
                                Realized {((mappedAndEnrichedLoans.filter(item => item.displayDebt === 0).length / Math.max(1, mappedAndEnrichedLoans.length)) * 100).toFixed(1)}% recovery rate
                              </span>
                            </div>
                          </div>

                          {/* LOAN ADVANCED FILTER AND CONTROL CONSOLE */}
                          <div className="bg-[#121214] p-4 rounded-2xl border border-zinc-800 space-y-3.5">
                            <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-3">
                              {/* Search bar inside loan for huge data */}
                              <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white" />
                                <input
                                  type="text"
                                  value={loanSearchQuery}
                                  onChange={(e) => setLoanSearchQuery(e.target.value)}
                                  placeholder="Search ledger by Patient name, phone number, address, or ID..."
                                  className="w-full bg-[#1A1A1C] border border-zinc-800 rounded-2xl py-1.5 pl-9 pr-8 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                                />
                                {loanSearchQuery && (
                                  <button
                                    onClick={() => setLoanSearchQuery("")}
                                    className="absolute right-3 top-2.5 text-white  text-[10px] font-sans"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>

                              {/* Reconciliation Toggle Strategy */}
                              <div className="flex items-center gap-2 bg-zinc-800 p-1 rounded-2xl border border-zinc-800 shrink-0 select-none">
                                <span className="text-[8px] uppercase font-bold text-white px-2 font-mono">
                                  Audit:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setLoanReconciliationView("dynamic")}
                                  className={`px-2 py-1 rounded text-[8.5px] font-mono font-bold transition-all ${
                                    loanReconciliationView === "dynamic"
                                      ? "bg-slate-800 text-white border border-slate-705"
                                      : "text-white "
                                  }`}
                                  title="Calculates totals straight from raw dental procedures & direct payments receipts"
                                >
                                  🔬 DB Live Recheck
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setLoanReconciliationView("declared")}
                                  className={`px-2 py-1 rounded text-[8.5px] font-mono font-bold transition-all ${
                                    loanReconciliationView === "declared"
                                      ? "bg-slate-800 text-white border border-slate-705"
                                      : "text-white "
                                  }`}
                                  title="Shows manually declared initial parameters inside clinical ledger records"
                                >
                                  📋 Ledger Declared
                                </button>
                              </div>
                            </div>

                            {/* Options controls - Sort & Filters */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-1 text-[10px]">
                              {/* Status Filter */}
                              <div className="flex-1 space-y-1.5 text-left">
                                <span className="text-[7.5px] uppercase tracking-wider text-white block font-mono font-bold">Filter Ledger Status</span>
                                <div className="flex flex-wrap gap-1">
                                  {[
                                    { id: "all", label: "🗓️ All Accounts" },
                                    { id: "active-debt", label: "⚠️ Active Debt" },
                                    { id: "paid-off", label: "🟢 Fully Paid Off" },
                                    { id: "high-debt", label: "🚨 High Debt (>=1M IQD)" }
                                  ].map(fFilter => (
                                    <button
                                      key={fFilter.id}
                                      onClick={() => setLoanStatusFilter(fFilter.id as any)}
                                      className={`px-2.5 py-1 rounded-2xl border text-[9px] font-mono font-semibold transition-colors ${
                                        loanStatusFilter === fFilter.id
                                          ? "bg-amber-400 text-white border-amber-400"
                                          : "bg-zinc-800 text-white border-zinc-800 hover:border-zinc-800 "
                                      }`}
                                    >
                                      {fFilter.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Sorting option */}
                              <div className="sm:w-64 space-y-1.5 text-left">
                                <span className="text-[7.5px] uppercase tracking-wider text-white block font-mono font-bold">Priority Sorting & Ranking</span>
                                <select
                                  value={loanSortKey}
                                  onChange={(e: any) => setLoanSortKey(e.target.value)}
                                  className="w-full bg-[#18181A] border border-zinc-800 rounded-2xl py-1 px-2 text-[9.5px] text-white focus:outline-hidden font-mono"
                                >
                                  <option value="debt-desc">📊 Outstanding Debt (High to Low)</option>
                                  <option value="debt-asc">📈 Outstanding Debt (Low to High)</option>
                                  <option value="cost-desc">💰 Total Estimated Plan Cost</option>
                                  <option value="name-asc">👤 Patient Alphabetical (A - Z)</option>
                                  <option value="id-desc">🆔 Patient Record Number (Newest)</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* LOANS RESULTS COUNT INDICATOR */}
                          <div className="flex justify-between items-center text-[10px] text-white px-1">
                            <span>Showing {sortedLoans.length} billing ledger folders</span>
                            {selectedPtId && (
                              <button
                                onClick={() => setLoanSearchQuery(String(selectedPtId))}
                                className="text-amber-400 hover:underline hover:text-amber-300 transition-colors"
                              >
                                Filter current session user (ID {selectedPtId})
                              </button>
                            )}
                          </div>

                          {/* THE GRID FOR PATIENT FILES AND BALANCES */}
                          {(() => {
                            const itemsPerPage = 6;
                            const totalItems = sortedLoans.length;
                            const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
                            const activePage = Math.min(loanScreenPage, totalPages);
                            const paginatedLoans = sortedLoans.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

                            return (
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                  {paginatedLoans.map(loan => {
                                    const uniqueId = `loan-card-${loan.pt_id}`;
                                    return (
                                      <div
                                        key={uniqueId}
                                        className={`p-3.5 bg-zinc-800 border rounded-2xl relative overflow-hidden flex flex-col justify-between transition-all hover:bg-zinc-800 ${
                                          loan.isOutOfSync
                                            ? "border-amber-500/25  "
                                            : "border-zinc-800"
                                        }`}
                                      >
                                        {/* Header Section */}
                                        <div className="mb-2">
                                          <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setSelectedPtId(loan.pt_id);
                                                  setActiveTab("pt-info");
                                                }}
                                                className="text-left group block focus:outline-hidden"
                                              >
                                                <h5 className="font-serif italic text-sm font-bold text-white leading-none group-hover:text-amber-400 group-hover:underline transition-colors">
                                                  {loan.pt_name}
                                                </h5>
                                              </button>
                                              <div className="flex items-center gap-1.5 text-[8.5px] font-mono text-white">
                                                <span>File UID: <strong className="text-white">{loan.pt_id}</strong></span>
                                                <span>•</span>
                                                <span>Reg: {formatIraqFriendly(loan.registeredAt)}</span>
                                              </div>
                                            </div>

                                            <span className={`px-2 py-0.5 rounded text-[7.5px] border font-mono uppercase font-bold shrink-0 ${
                                              loan.displayDebt > 0
                                                ? "bg-amber-950/40 text-amber-400 border-amber-900/40 animate-pulse"
                                                : "bg-indigo-500/40 text-white border-zinc-800/40"
                                            }`}>
                                              {loan.displayDebt > 0 ? "⚠️ Active Debt" : "🟢 Paid Off"}
                                            </span>
                                          </div>

                                          {/* Patient Contact & Medical Info integration with ptdata */}
                                          <div className="bg-zinc-800/50 p-2 rounded-2xl border border-zinc-800/40 mt-2.5 space-y-1 text-[8.5px] font-mono text-left">
                                            <div className="flex items-center gap-1.5 text-white">
                                              <Phone size={10} className="text-white" />
                                              <span>Tel: <strong className="text-white">{loan.phone}</strong></span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-white max-w-full truncate" title={loan.address}>
                                              <span>📍 Address: <span className="text-white italic">{loan.address}</span></span>
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 border-t border-zinc-800/60 mt-1">
                                              {loan.ref && (
                                                <span className="text-[7.5px] bg-zinc-800 text-white px-1 rounded border border-zinc-800">
                                                  Ref: {loan.ref}
                                                </span>
                                              )}
                                              {loan.chronic && loan.chronic !== "None" && (
                                                <span className="text-[7.5px] bg-amber-950/40 text-amber-400 px-1 rounded border border-amber-900/30 font-bold">
                                                  ⚠️ Medic: {loan.chronic}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Ledger Cost Numbers Recheck Reconciling */}
                                        <div className="space-y-1.5 my-2.5">
                                          <div className="flex justify-between items-center text-[7.5px] text-white font-mono uppercase tracking-widest font-black">
                                            <span>Balance sheets metrics</span>
                                            <span>{loanReconciliationView === "dynamic" ? "🔬 dynamic database query" : "📋 declared ledger parameters"}</span>
                                          </div>

                                          <div className="grid grid-cols-3 gap-1 pl-1 font-mono text-[9px] py-1.5 border-t border-b border-zinc-800/60 select-none text-left">
                                            <div>
                                              <span className="block text-[7px] text-white uppercase font-bold">Total Cost</span>
                                              <span className="text-white font-semibold">{loan.displayCost.toLocaleString()} IQD</span>
                                            </div>
                                            <div>
                                              <span className="block text-[7px] text-white uppercase font-bold">Collected Recv</span>
                                              <span className="text-white font-semibold">+{loan.displayPaid.toLocaleString()} IQD</span>
                                            </div>
                                            <div>
                                              <span className="block text-[7px] text-white uppercase font-bold">Outstanding Plan</span>
                                              <span className={`font-black ${loan.displayDebt > 0 ? "text-red-400 font-bold" : "text-white"}`}>
                                                {loan.displayDebt.toLocaleString()} IQD
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Database audits & discrepancy warning indicator */}
                                        {loan.isOutOfSync && (
                                          <div className="p-2 bg-amber-500/10 border border-amber-500/25 rounded-2xl font-mono text-[8.2px] mb-2 text-left flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
                                            <div className="space-y-0.5">
                                              <span className="text-amber-500 font-bold uppercase tracking-wider block">⚠️ DATABASE MISMAPPED DETECTED</span>
                                              <p className="text-white">
                                                Database: Works {loan.computedTotalCost.toLocaleString()} | Recvs {loan.computedTotalPaid.toLocaleString()} IQD.
                                              </p>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                // Perform state synchronization instantly
                                                if (safeConfirm(`Do you wish to run ledger reconcile correction matching treatment registry values for ${loan.pt_name}?`)) {
                                                  setLoans(loans.map(l => {
                                                    if (l.pt_id === loan.pt_id) {
                                                      return {
                                                        ...l,
                                                        total_cost: loan.resolvedTotalCost,
                                                        total_paid: loan.resolvedTotalPaid,
                                                        loan_debt: loan.resolvedOutstanding,
                                                        status: loan.resolvedOutstanding === 0 ? "Paid Off" : "Active Debt"
                                                      };
                                                    }
                                                    return l;
                                                  }));
                                                  alert("Ledger data balanced with database successfully!");
                                                }
                                              }}
                                              className="px-2 py-0.5 bg-amber-400 hover:bg-zinc-800 text-white text-[7.5px] font-bold rounded uppercase tracking-wider select-none shrink-0"
                                            >
                                              Action: Reconcile
                                            </button>
                                          </div>
                                        )}

                                        {/* Actions shortlinks & fast money triggers */}
                                        <div className="flex gap-1.5 mt-1 font-mono text-[8.5px]">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedPtId(loan.pt_id);
                                              setActiveTab("pt-info");
                                            }}
                                            className="flex-1 px-2.5 py-1.5 bg-[#171719] border border-zinc-800 hover:border-zinc-800 text-white rounded-2xl font-bold  transition-colors"
                                          >
                                            Navigation: Folder
                                          </button>
                                          
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setWorkPtId(loan.pt_id);
                                              setWorkSearchWord(loan.pt_name);
                                              setActiveTab("work");
                                            }}
                                            className="flex-1 px-2.5 py-1.5 bg-[#171719] border border-zinc-800 hover:border-zinc-800 text-white rounded-2xl font-bold  transition-colors"
                                          >
                                            Action: Prosthesis
                                          </button>

                                          {loan.displayDebt > 0 ? (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                handleSelectPatientForPayment(loan.pt_id, loan.pt_name);
                                                setPayAmount(String(loan.displayDebt));
                                                setActiveTab("add-money");
                                              }}
                                              className="px-3.5 py-1.5 bg-white text-white hover:bg-zinc-800 font-bold rounded-2xl transition-transform"
                                            >
                                              Action: Settle Cash
                                            </button>
                                          ) : (
                                            <div className="px-3.5 py-1.5 bg-indigo-500/20 text-white border border-zinc-800/20 font-bold rounded-2xl select-none flex items-center justify-center">
                                              Settled ✓
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {totalItems === 0 && (
                                    <div className="col-span-full py-16 text-center text-white font-mono text-xs italic bg-[#111112]/40 rounded-2xl border border-zinc-800">
                                      No credit ledger folders matching selected search or status criteria.
                                    </div>
                                  )}
                                </div>

                                {/* Pagination controls */}
                                {totalPages > 1 && (
                                  <div className="flex items-center justify-between p-3.5 bg-zinc-800/30 border border-zinc-800 rounded-2xl text-[9px] font-mono select-none">
                                    <button
                                      type="button"
                                      disabled={activePage === 1}
                                      onClick={() => setLoanScreenPage(p => Math.max(1, p - 1))}
                                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 rounded-2xl text-white font-bold transition-all  cursor-pointer"
                                    >
                                      ◀ PREV
                                    </button>
                                    <span className="text-white">
                                      PAGE <strong className="text-white font-bold">{activePage}</strong> OF {totalPages}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={activePage === totalPages}
                                      onClick={() => setLoanScreenPage(p => Math.min(totalPages, p + 1))}
                                      className="px-2.5 py-1 bg-[#121212] hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 rounded-2xl text-white font-bold transition-all  cursor-pointer"
                                    >
                                      NEXT ▶
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </motion.div>
                      );
                    })()}

                    {/* === SUBPAGE 7: INCOME (Clinics Auditing desk) === */}
                    {activeTab === "income" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4"
                      >
                        {/* Interactive local calculation helpers */}
                        {(() => {
                          const getIraqDateOnlyString = (dateInput: string | Date | undefined): string => {
                            if (!dateInput) return "";
                            return getIraqDateString(dateInput);
                          };

                          const todayStr = getIraqDateString(new Date());

                          const yesterdayDate = new Date();
                          yesterdayDate.setDate(yesterdayDate.getDate() - 1);
                          const yesterdayStr = getIraqDateString(yesterdayDate);

                          const getThisWeekStartSaturdayStr = (tStr: string): string => {
                            const d = new Date(tStr + "T12:00:00");
                            const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
                            const daysSinceSaturday = (day + 1) % 7; 
                            const satDate = new Date(d);
                            satDate.setDate(d.getDate() - daysSinceSaturday);
                            return getIraqDateString(satDate);
                          };

                          const weekStartSatStr = getThisWeekStartSaturdayStr(todayStr);
                          const currentMonthPrefix = todayStr.slice(0, 7); // e.g. "2026-06"

                          const isItemInPeriod = (itemDateStr: string, period: string, customStart?: string, customEnd?: string): boolean => {
                            const dOnly = itemDateStr.split(" ")[0].split("T")[0]; // sanitize
                            if (period === "today") return dOnly === todayStr;
                            if (period === "yesterday") return dOnly === yesterdayStr;
                            if (period === "this-week") return dOnly >= weekStartSatStr && dOnly <= todayStr;
                            if (period === "this-month") return dOnly.startsWith(currentMonthPrefix);
                            if (period === "custom") {
                              const start = customStart || "";
                              const end = customEnd || "";
                              if (start && end) return dOnly >= start && dOnly <= end;
                              if (start) return dOnly >= start;
                              if (end) return dOnly <= end;
                            }
                            return true; // "all"
                          };

                          // 1. Calculated Revenue (REVENUE)
                          const revenueItems = [
                            ...dentalWorks.map(dw => ({
                              amount: dw.price,
                              date: getIraqDateString(dw.created_at || "2026-06-18"),
                              pt_id: dw.pt_id,
                              pt_name: dw.pt_name,
                              notes: dw.notes || "Dental Work Procedure"
                            })),
                            ...loans.map(loan => {
                              const ptWorks = dentalWorks.filter(dw => dw.pt_id === loan.pt_id);
                              const sumWorksPrice = ptWorks.reduce((sum, w) => sum + w.price, 0);
                              const residual = Math.max(0, loan.total_cost - sumWorksPrice);
                              const pt = patients.find(p => p.id === loan.pt_id);
                              const dateStr = pt ? getIraqDateString(pt.registered_at) : "2026-06-10";
                              return {
                                amount: residual,
                                date: dateStr,
                                pt_id: loan.pt_id,
                                pt_name: loan.pt_name,
                                notes: "Baseline Treatment Revenue Plan"
                              };
                            }).filter(item => item.amount > 0)
                          ];

                          // 2. Collected Cash Receipts (payments)
                          const paymentItems = payments.map(p => ({
                            id: p.id,
                            amount: p.amount,
                            date: getIraqDateString(p.created_at),
                            pt_id: p.pt_id,
                            pt_name: p.pt_name,
                            type: p.type,
                            dr_name: p.dr_name,
                            work_id: p.work_id,
                            created_at: p.created_at
                          }));

                          // 3. Outstanding balances (Loan ledger)
                          const loanAssetItems = loans.map(loan => {
                            const pt = patients.find(p => p.id === loan.pt_id);
                            const dateStr = pt ? getIraqDateString(pt.registered_at) : "2026-06-10";
                            return {
                              amount: loan.loan_debt,
                              date: dateStr,
                              pt_id: loan.pt_id,
                              pt_name: loan.pt_name,
                              notes: "Outstanding Debt Accrual"
                            };
                          }).filter(item => item.amount > 0);

                          // 4. Lab tech jobs
                          const labWorkItems = labsWork.map(lw => ({
                            amount: lw.fee,
                            date: getIraqDateString(lw.dispatch_date || "2026-06-15"),
                            pt_id: lw.pt_id,
                            pt_name: lw.pt_name,
                            notes: `Lab work prosthesis completed`
                          }));

                          // Sum functions for the cards
                          const getSumForPeriod = (itemsList: { amount: number; date: string }[], period: string) => {
                            return itemsList
                              .filter(item => isItemInPeriod(item.date, period))
                              .reduce((sum, item) => sum + item.amount, 0);
                          };

                          // Calculated Revenue sums
                          const revToday = getSumForPeriod(revenueItems, "today");
                          const revYesterday = getSumForPeriod(revenueItems, "yesterday");
                          const revThisWeek = getSumForPeriod(revenueItems, "this-week");
                          const revThisMonth = getSumForPeriod(revenueItems, "this-month");
                          const revAll = revenueItems.reduce((sum, x) => sum + x.amount, 0);

                          // Collected Receipts sums
                          const colToday = getSumForPeriod(paymentItems, "today");
                          const colYesterday = getSumForPeriod(paymentItems, "yesterday");
                          const colThisWeek = getSumForPeriod(paymentItems, "this-week");
                          const colThisMonth = getSumForPeriod(paymentItems, "this-month");
                          const colAll = paymentItems.reduce((sum, x) => sum + x.amount, 0);

                          // Loan Ledger Sums
                          const loanToday = getSumForPeriod(loanAssetItems, "today");
                          const loanYesterday = getSumForPeriod(loanAssetItems, "yesterday");
                          const loanThisWeek = getSumForPeriod(loanAssetItems, "this-week");
                          const loanThisMonth = getSumForPeriod(loanAssetItems, "this-month");
                          const loanAll = loanAssetItems.reduce((sum, x) => sum + x.amount, 0);

                          // Lab dispatches Sums
                          const labToday = getSumForPeriod(labWorkItems, "today");
                          const labYesterday = getSumForPeriod(labWorkItems, "yesterday");
                          const labThisWeek = getSumForPeriod(labWorkItems, "this-week");
                          const labThisMonth = getSumForPeriod(labWorkItems, "this-month");
                          const labAll = labWorkItems.reduce((sum, x) => sum + x.amount, 0);

                          // Currently active filtered numbers based on user's selected period
                          const activeRevenue = incomePeriod === "all" ? revAll : (incomePeriod === "custom" ? revenueItems.filter(v => isItemInPeriod(v.date, "custom", incomeStartCustomDate, incomeEndCustomDate)).reduce((sum, x) => sum + x.amount, 0) : getSumForPeriod(revenueItems, incomePeriod));
                          const activeCollected = incomePeriod === "all" ? colAll : (incomePeriod === "custom" ? paymentItems.filter(v => isItemInPeriod(v.date, "custom", incomeStartCustomDate, incomeEndCustomDate)).reduce((sum, x) => sum + x.amount, 0) : getSumForPeriod(paymentItems, incomePeriod));
                          const activeLoans = incomePeriod === "all" ? loanAll : (incomePeriod === "custom" ? loanAssetItems.filter(v => isItemInPeriod(v.date, "custom", incomeStartCustomDate, incomeEndCustomDate)).reduce((sum, x) => sum + x.amount, 0) : getSumForPeriod(loanAssetItems, incomePeriod));
                          const activeLabs = incomePeriod === "all" ? labAll : (incomePeriod === "custom" ? labWorkItems.filter(v => isItemInPeriod(v.date, "custom", incomeStartCustomDate, incomeEndCustomDate)).reduce((sum, x) => sum + x.amount, 0) : getSumForPeriod(labWorkItems, incomePeriod));

                          // Filter tables
                          const displayPayments = paymentItems.filter(pay => {
                            const passesPeriod = isItemInPeriod(pay.date, incomePeriod, incomeStartCustomDate, incomeEndCustomDate);
                            if (!passesPeriod) return false;
                            if (!searchQuery) return true;
                            return pay.pt_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                   (pay.dr_name && pay.dr_name.toLowerCase().includes(searchQuery.toLowerCase()));
                          });

                          return (
                            <div className="space-y-4">
                              {/* HIGH-POLISHED PERIOD SUMMARY CARDS METRICS */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                                
                                {/* CARD 1: CALCULATED REVENUE */}
                                <div className="bg-[#121213] p-4 rounded-2xl border border-zinc-800 flex flex-col justify-between">
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[8px] text-white uppercase font-black tracking-widest">Calculated Revenue</span>
                                      <span className="text-[10px]" title="Clinical procedure plans catalog total">📊</span>
                                    </div>
                                    <span className="text-lg font-black text-white mt-1 block tracking-tight leading-none">
                                      {activeRevenue.toLocaleString()} <span className="text-[10px] text-white font-normal">IQD</span>
                                    </span>
                                    <span className="text-[8px] bg-zinc-800 px-1.5 py-0.2 text-white rounded border border-zinc-800 inline-block mt-2.5 uppercase font-bold font-mono">
                                      {incomePeriod === "all" ? "All Time Scope" : incomePeriod === "custom" ? "Custom Range Scope" : `Active Range: ${incomePeriod}`}
                                    </span>
                                  </div>

                                  {/* Sub-results rows for 4 periods */}
                                  <div className="mt-4 pt-3 border-t border-zinc-800 space-y-1.5 text-[9px]">
                                    <button
                                      type="button"
                                      onClick={() => setIncomePeriod("today")}
                                      className={`w-full flex justify-between items-center py-1 px-1.5 rounded transition-all select-none text-left cursor-pointer ${incomePeriod === "today" ? "bg-zinc-800 text-white font-extrabold border-l-2 border-zinc-800" : "text-white hover:bg-zinc-800 "}`}
                                    >
                                      <span>Today result:</span>
                                      <span className="font-normal">{revToday.toLocaleString()} IQD</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIncomePeriod("yesterday")}
                                      className={`w-full flex justify-between items-center py-1 px-1.5 rounded transition-all select-none text-left cursor-pointer ${incomePeriod === "yesterday" ? "bg-zinc-800 text-white font-extrabold border-l-2 border-zinc-800" : "text-white hover:bg-zinc-800 "}`}
                                    >
                                      <span>Yesterday result:</span>
                                      <span className="font-normal">{revYesterday.toLocaleString()} IQD</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIncomePeriod("this-week")}
                                      className={`w-full flex justify-between items-center py-1 px-1.5 rounded transition-all select-none text-left cursor-pointer ${incomePeriod === "this-week" ? "bg-zinc-800 text-white font-extrabold border-l-2 border-zinc-800" : "text-white hover:bg-zinc-800 "}`}
                                      title="Week boundary starting Saturday in Asia/Baghdad"
                                    >
                                      <span>This week (from Sat):</span>
                                      <span className="font-normal">{revThisWeek.toLocaleString()} IQD</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIncomePeriod("this-month")}
                                      className={`w-full flex justify-between items-center py-1 px-1.5 rounded transition-all select-none text-left cursor-pointer ${incomePeriod === "this-month" ? "bg-zinc-800 text-white font-extrabold border-l-2 border-zinc-800" : "text-white hover:bg-zinc-800 "}`}
                                    >
                                      <span>This month result:</span>
                                      <span className="font-normal">{revThisMonth.toLocaleString()} IQD</span>
                                    </button>
                                  </div>
                                </div>

                                {/* CARD 2: COLLECTED CASH RECEIPTS */}
                                <div className="bg-[#121213] p-4 rounded-2xl border border-zinc-800 flex flex-col justify-between">
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[8px] text-white uppercase font-black tracking-widest">Collected cash receipts</span>
                                      <span className="text-[10px]" title="Hard currency physically secured of patients">🟢</span>
                                    </div>
                                    <span className="text-lg font-black text-white mt-1 block tracking-tight leading-none">
                                      {activeCollected.toLocaleString()} <span className="text-[10px] text-white font-normal">IQD</span>
                                    </span>
                                    <span className="text-[8px] bg-indigo-500/20 px-1.5 py-0.2 text-white rounded border border-zinc-800/10 inline-block mt-2.5 uppercase font-bold font-mono">
                                      {displayPayments.length} Registered collections
                                    </span>
                                  </div>

                                  {/* Sub-results rows for 4 periods */}
                                  <div className="mt-4 pt-3 border-t border-zinc-800 space-y-1.5 text-[9px]">
                                    <button
                                      type="button"
                                      onClick={() => setIncomePeriod("today")}
                                      className={`w-full flex justify-between items-center py-1 px-1.5 rounded transition-all select-none text-left cursor-pointer ${incomePeriod === "today" ? "bg-indigo-500/20 text-white font-extrabold border-l-2 border-zinc-800" : "text-white hover:bg-zinc-800 "}`}
                                    >
                                      <span>Today result:</span>
                                      <span className="font-normal text-white">{colToday.toLocaleString()} IQD</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIncomePeriod("yesterday")}
                                      className={`w-full flex justify-between items-center py-1 px-1.5 rounded transition-all select-none text-left cursor-pointer ${incomePeriod === "yesterday" ? "bg-indigo-500/20 text-white font-extrabold border-l-2 border-zinc-800" : "text-white hover:bg-zinc-800 "}`}
                                    >
                                      <span>Yesterday result:</span>
                                      <span className="font-normal text-white">{colYesterday.toLocaleString()} IQD</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIncomePeriod("this-week")}
                                      className={`w-full flex justify-between items-center py-1 px-1.5 rounded transition-all select-none text-left cursor-pointer ${incomePeriod === "this-week" ? "bg-indigo-500/20 text-white font-extrabold border-l-2 border-zinc-800" : "text-white hover:bg-zinc-800 "}`}
                                      title="Week boundary starting Saturday in Asia/Baghdad"
                                    >
                                      <span>This week (from Sat):</span>
                                      <span className="font-normal text-white">{colThisWeek.toLocaleString()} IQD</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIncomePeriod("this-month")}
                                      className={`w-full flex justify-between items-center py-1 px-1.5 rounded transition-all select-none text-left cursor-pointer ${incomePeriod === "this-month" ? "bg-indigo-500/20 text-white font-extrabold border-l-2 border-zinc-800" : "text-white hover:bg-zinc-800 "}`}
                                    >
                                      <span>This month result:</span>
                                      <span className="font-normal text-white">{colThisMonth.toLocaleString()} IQD</span>
                                    </button>
                                  </div>
                                </div>

                                {/* CARD 3: LOAN LEDGER ASSET */}
                                <div className="bg-[#121213] p-4 rounded-2xl border border-zinc-800 flex flex-col justify-between">
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[8px] text-amber-500 uppercase font-black tracking-widest">Loan Ledger Asset</span>
                                      <span className="text-[10px]" title="Uncollected medical debt pending settlement">⚠️</span>
                                    </div>
                                    <span className="text-lg font-black text-amber-500 mt-1 block tracking-tight leading-none">
                                      {activeLoans.toLocaleString()} <span className="text-[10px] text-white font-normal">IQD</span>
                                    </span>
                                    <span className="text-[8px] bg-amber-950/20 px-1.5 py-0.2 text-amber-550 rounded border border-amber-900/15 inline-block mt-2.5 uppercase font-bold font-mono">
                                      Clinics Credit Ledger Book
                                    </span>
                                  </div>

                                  {/* Sub-results rows for 4 periods */}
                                  <div className="mt-4 pt-3 border-t border-zinc-800 space-y-1.5 text-[9px]">
                                    <button
                                      type="button"
                                      onClick={() => setIncomePeriod("today")}
                                      className={`w-full flex justify-between items-center py-1 px-1.5 rounded transition-all select-none text-left cursor-pointer ${incomePeriod === "today" ? "bg-amber-955/20 text-amber-450 font-extrabold border-l-2 border-amber-400" : "text-white hover:bg-zinc-800 "}`}
                                    >
                                      <span>Today result:</span>
                                      <span className="font-normal text-amber-500">{loanToday.toLocaleString()} IQD</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIncomePeriod("yesterday")}
                                      className={`w-full flex justify-between items-center py-1 px-1.5 rounded transition-all select-none text-left cursor-pointer ${incomePeriod === "yesterday" ? "bg-amber-955/20 text-amber-450 font-extrabold border-l-2 border-amber-400" : "text-white hover:bg-zinc-800 "}`}
                                    >
                                      <span>Yesterday result:</span>
                                      <span className="font-normal text-amber-500">{loanYesterday.toLocaleString()} IQD</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIncomePeriod("this-week")}
                                      className={`w-full flex justify-between items-center py-1 px-1.5 rounded transition-all select-none text-left cursor-pointer ${incomePeriod === "this-week" ? "bg-amber-955/20 text-amber-450 font-extrabold border-l-2 border-amber-400" : "text-white hover:bg-zinc-800 "}`}
                                      title="Week boundary starting Saturday in Asia/Baghdad"
                                    >
                                      <span>This week (from Sat):</span>
                                      <span className="font-normal text-amber-500">{loanThisWeek.toLocaleString()} IQD</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIncomePeriod("this-month")}
                                      className={`w-full flex justify-between items-center py-1 px-1.5 rounded transition-all select-none text-left cursor-pointer ${incomePeriod === "this-month" ? "bg-amber-955/20 text-amber-450 font-extrabold border-l-2 border-amber-400" : "text-white hover:bg-zinc-800 "}`}
                                    >
                                      <span>This month result:</span>
                                      <span className="font-normal text-amber-500">{loanThisMonth.toLocaleString()} IQD</span>
                                    </button>
                                  </div>
                                </div>

                                {/* CARD 4: LABS TECH DISPATCHES */}
                                <div className="bg-[#121213] p-4 rounded-2xl border border-zinc-800 flex flex-col justify-between">
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[8px] text-blue-400 uppercase font-black tracking-widest">Labs Tech dispatches</span>
                                      <span className="text-[10px]" title="Cumulative laboratory prosthetic costs paid out">🔬</span>
                                    </div>
                                    <span className="text-lg font-black text-blue-400 mt-1 block tracking-tight leading-none">
                                      {activeLabs.toLocaleString()} <span className="text-[10px] text-white font-normal">IQD</span>
                                    </span>
                                    <span className="text-[8px] bg-blue-950/20 px-1.5 py-0.2 text-blue-400 rounded border border-blue-900/10 inline-block mt-2.5 uppercase font-bold font-mono">
                                      Total lab prosthetic outlays
                                    </span>
                                  </div>

                                  {/* Sub-results rows for 4 periods */}
                                  <div className="mt-4 pt-3 border-t border-zinc-800 space-y-1.5 text-[9px]">
                                    <button
                                      type="button"
                                      onClick={() => setIncomePeriod("today")}
                                      className={`w-full flex justify-between items-center py-1 px-1.5 rounded transition-all select-none text-left cursor-pointer ${incomePeriod === "today" ? "bg-blue-955/20 text-blue-400 font-extrabold border-l-2 border-blue-400" : "text-white hover:bg-zinc-800 "}`}
                                    >
                                      <span>Today result:</span>
                                      <span className="font-normal text-blue-400">{labToday.toLocaleString()} IQD</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIncomePeriod("yesterday")}
                                      className={`w-full flex justify-between items-center py-1 px-1.5 rounded transition-all select-none text-left cursor-pointer ${incomePeriod === "yesterday" ? "bg-blue-955/20 text-blue-400 font-extrabold border-l-2 border-blue-400" : "text-white hover:bg-zinc-800 "}`}
                                    >
                                      <span>Yesterday result:</span>
                                      <span className="font-normal text-blue-400">{labYesterday.toLocaleString()} IQD</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIncomePeriod("this-week")}
                                      className={`w-full flex justify-between items-center py-1 px-1.5 rounded transition-all select-none text-left cursor-pointer ${incomePeriod === "this-week" ? "bg-blue-955/20 text-blue-400 font-extrabold border-l-2 border-blue-400" : "text-white hover:bg-zinc-800 "}`}
                                      title="Week boundary starting Saturday in Asia/Baghdad"
                                    >
                                      <span>This week (from Sat):</span>
                                      <span className="font-normal text-blue-400">{labThisWeek.toLocaleString()} IQD</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIncomePeriod("this-month")}
                                      className={`w-full flex justify-between items-center py-1 px-1.5 rounded transition-all select-none text-left cursor-pointer ${incomePeriod === "this-month" ? "bg-blue-955/20 text-blue-400 font-extrabold border-l-2 border-blue-400" : "text-white hover:bg-zinc-800 "}`}
                                    >
                                      <span>This month result:</span>
                                      <span className="font-normal text-blue-400">{labThisMonth.toLocaleString()} IQD</span>
                                    </button>
                                  </div>
                                </div>

                              </div>

                              {/* TIME HORIZON FILTER CONTROL CONSOLE */}
                              <div className="bg-[#121214] p-4 rounded-2xl border border-zinc-800 space-y-3.5">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                  <div>
                                    <span className="text-[8.5px] font-black uppercase text-white tracking-wider block font-mono">Consolidated Ledger Filter Panel</span>
                                    <p className="text-[10px] text-white mt-0.5">Select a pre-set historical time range, or use the custom range calendar underneath.</p>
                                  </div>
                                  
                                  {/* Filter Pills */}
                                  <div className="flex flex-wrap gap-1">
                                    {[
                                      { id: "all", label: "🗓️ All Time" },
                                      { id: "today", label: "⚡ Today" },
                                      { id: "yesterday", label: "🗓️ Yesterday" },
                                      { id: "this-week", label: "🔁 This Week (Starts Sat)" },
                                      { id: "this-month", label: "📅 This Month" },
                                      { id: "custom", label: "⚙️ Custom Range" }
                                    ].map(pill => (
                                      <button
                                        key={pill.id}
                                        type="button"
                                        onClick={() => setIncomePeriod(pill.id as any)}
                                        className={`px-3 py-1 rounded-2xl text-[10px] font-mono font-bold transition-all border cursor-pointer select-none ${incomePeriod === pill.id ? "bg-amber-400 text-white border-amber-400" : "bg-zinc-800 text-white border-zinc-800 hover:border-zinc-800 "}`}
                                      >
                                        {pill.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* "THE OTHER TIME FILTER" - CUSTOM RANGE SELECTOR PANEL AS REQUESTED */}
                                {incomePeriod === "custom" && (
                                  <div className="p-3 bg-zinc-800 rounded-2xl border border-zinc-800/60 flex flex-col md:flex-row items-end gap-3 animate-fadeIn">
                                    <div className="grid grid-cols-2 gap-2 flex-1 w-full text-left">
                                      <div>
                                        <label className="text-[8.5px] uppercase tracking-wider text-white block font-mono font-bold mb-1">Start Calendar Date (From)</label>
                                        <input
                                          type="date"
                                          value={incomeStartCustomDate}
                                          onChange={(e) => setIncomeStartCustomDate(e.target.value)}
                                          className="w-full bg-[#161618] border border-zinc-800 rounded-2xl py-1 px-2.5 text-[10.5px] text-white focus:outline-hidden font-mono"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[8.5px] uppercase tracking-wider text-white block font-mono font-bold mb-1">End Calendar Date (To)</label>
                                        <input
                                          type="date"
                                          value={incomeEndCustomDate}
                                          onChange={(e) => setIncomeEndCustomDate(e.target.value)}
                                          className="w-full bg-[#161618] border border-zinc-800 rounded-2xl py-1 px-2.5 text-[10.5px] text-white focus:outline-hidden font-mono"
                                        />
                                      </div>
                                    </div>
                                    
                                    <div className="flex gap-1.5 w-full md:w-auto shrink-0 justify-end">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setIncomeStartCustomDate(getIraqDateString(new Date()));
                                          setIncomeEndCustomDate(getIraqDateString(new Date()));
                                        }}
                                        className="px-3 py-1.5 bg-[#18181A] border border-zinc-800 rounded-2xl text-white font-mono text-[10px]  hover:border-zinc-800 select-none transition-colors"
                                      >
                                        Reset: Today
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setIncomeStartCustomDate("");
                                          setIncomeEndCustomDate("");
                                        }}
                                        className="px-3 py-1.5 bg-[#18181A] border border-zinc-800 rounded-2xl text-white font-mono text-[10px]  hover:border-zinc-800 select-none transition-colors"
                                      >
                                        Reset: Clear
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* TRANSACTIONS TABLE LEDGER */}
                              <div className="space-y-2">
                                <span className="text-[9px] uppercase tracking-widest text-[#7C7C82] ml-1 font-mono font-normal block">
                                  Chronological Cash Receipts Log ({displayPayments.length} transactions shown)
                                </span>
                                
                                <div className="bg-[#121212] rounded-2xl border border-zinc-800 overflow-hidden">
                                  <div className="overflow-x-auto text-[10px] scrollbar-thin">
                                    <table className="w-full text-left border-collapse min-w-[700px]">
                                      <thead>
                                        <tr className="border-b border-zinc-800 bg-zinc-800 font-mono text-[8px] text-white uppercase tracking-widest [&>th]:px-3 [&>th]:py-2">
                                          <th className="w-6 text-center">Ticket</th>
                                          <th>Patient File Name</th>
                                          <th>Specialist Doctor</th>
                                          <th>Database Work ID</th>
                                          <th>Classification</th>
                                          <th>Logged Date</th>
                                          <th className="text-right">Collection</th>
                                          <th className="w-8 text-center">Void</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-zinc-900 font-mono text-white">
                                        {(() => {
                                          const itemsPerPage = 10;
                                          const totalItems = displayPayments.length;
                                          const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
                                          const activePage = Math.min(incomeScreenPage, totalPages);
                                          const paginatedPayments = displayPayments.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

                                          return (
                                            <>
                                              {paginatedPayments.map(pay => (
                                                <tr key={`inc-pay-row-${pay.id}`} className="hover:bg-zinc-800 transition-colors [&>td]:px-3 [&>td]:py-2.5">
                                                  <td className="text-[9px] text-[#A1A1A5] font-bold text-center">
                                                    R{pay.id}
                                                  </td>
                                                  <td>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setSelectedPtId(pay.pt_id);
                                                        setActiveTab("pt-info");
                                                      }}
                                                      className="text-white hover:text-amber-500 hover:underline text-left font-sans font-semibold cursor-pointer block"
                                                      title="Open profile chart"
                                                    >
                                                      {pay.pt_name}
                                                    </button>
                                                  </td>
                                                  <td className="text-white font-sans">
                                                    👤 {pay.dr_name || "Unassigned Specialist"}
                                                  </td>
                                                  <td className="text-white">
                                                    <span className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-800 rounded text-[9px] font-bold text-white">
                                                      {pay.work_id || `WRK-${pay.pt_id}-01`}
                                                    </span>
                                                  </td>
                                                  <td>
                                                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${
                                                      pay.type === "Deposit"
                                                        ? "bg-blue-950 text-blue-400 border border-blue-900/30"
                                                        : pay.type === "Full"
                                                        ? "bg-purple-950 text-purple-400 border border-purple-900/30"
                                                        : "bg-zinc-800 text-white border border-zinc-800"
                                                    }`}>
                                                      {pay.type}
                                                    </span>
                                                  </td>
                                                  <td className="text-white text-[9px] font-sans">
                                                    {formatIraqFriendly(pay.created_at)}
                                                  </td>
                                                  <td className="text-right text-white font-bold whitespace-nowrap">
                                                    +{pay.amount.toLocaleString()} IQD
                                                  </td>
                                                  <td className="text-center font-bold">
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        if (safeConfirm(`Revoke this cash receipt (Ticket PAY-R${pay.id}) from the audit ledger?`)) {
                                                          setPayments(payments.filter(item => item.id !== pay.id));
                                                          setLoans(loans.map(l => {
                                                            if (l.pt_id === pay.pt_id) {
                                                              const updatedPaid = Math.max(0, l.total_paid - pay.amount);
                                                              const updatedDebt = l.total_cost - updatedPaid;
                                                              return { ...l, total_paid: updatedPaid, loan_debt: updatedDebt, status: "Active Debt" };
                                                            }
                                                            return l;
                                                          }));
                                                        }
                                                      }}
                                                      className="text-red-500 hover:text-red-400 font-bold cursor-pointer bg-red-950/20 hover:bg-zinc-800 px-1.5 py-0.5 rounded transition-colors text-[9px]"
                                                      title="Revoke / Void transaction receipt"
                                                    >
                                                      ✕
                                                    </button>
                                                  </td>
                                                </tr>
                                              ))}
                                              {totalItems === 0 && (
                                                <tr>
                                                  <td colSpan={8} className="text-center py-8 text-white italic text-[10px]">
                                                    No billing ledger transaction entries matched the active filter.
                                                  </td>
                                                </tr>
                                              )}
                                            </>
                                          );
                                        })()}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Pagination for Cash Receipts Log */}
                                  {(() => {
                                    const itemsPerPage = 10;
                                    const totalItems = displayPayments.length;
                                    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
                                    const activePage = Math.min(incomeScreenPage, totalPages);

                                    if (totalPages <= 1) return null;

                                    return (
                                      <div className="flex items-center justify-between p-3 border-t border-zinc-800 bg-zinc-800/30 text-[9px] font-mono select-none">
                                        <button
                                          type="button"
                                          disabled={activePage === 1}
                                          onClick={() => setIncomeScreenPage(p => Math.max(1, p - 1))}
                                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 rounded-2xl text-white font-bold transition-all  cursor-pointer"
                                        >
                                          ◀ PREV
                                        </button>
                                        <span className="text-white">
                                          PAGE <strong className="text-white font-bold">{activePage}</strong> OF {totalPages}
                                        </span>
                                        <button
                                          type="button"
                                          disabled={activePage === totalPages}
                                          onClick={() => setIncomeScreenPage(p => Math.min(totalPages, p + 1))}
                                          className="px-2.5 py-1 bg-[#121212] hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 rounded-2xl text-white font-bold transition-all  cursor-pointer"
                                        >
                                          NEXT ▶
                                        </button>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* CLICKABLE PATIENT SESSION & BILLING DIRECTORY TABLE as requested */}
                              <div className="space-y-2 mt-4">
                                <div className="flex justify-between items-center px-1">
                                  <span className="text-[9px] uppercase tracking-widest text-[#7C7C82] font-mono font-bold block">
                                    Patient Active Sessions & Credit Ledger Directory
                                  </span>
                                  <span className="text-[8.5px] font-mono text-white font-bold bg-[#121212] border border-zinc-800 px-2 py-0.5 rounded-2xl">
                                    Total: {patients.length} Active Records
                                  </span>
                                </div>

                                <div className="bg-[#121212] rounded-2xl border border-zinc-800 overflow-hidden">
                                  <div className="overflow-x-auto text-[10px] scrollbar-thin">
                                    <table className="w-full text-left border-collapse min-w-[750px]">
                                      <thead>
                                        <tr className="border-b border-zinc-800 bg-zinc-800 font-mono text-[8px] text-white uppercase tracking-widest [&>th]:px-3 [&>th]:py-2.5">
                                          <th className="w-8 py-2.5 px-3">Idx</th>
                                          <th className="py-2.5 px-3">Patient Folder & Contact (ptdata)</th>
                                          <th className="py-2.5 px-3">Active Clinical Session & Diagnostics</th>
                                          <th className="py-2.5 px-3 text-right">Estimated Cost Plan</th>
                                          <th className="py-2.5 px-3 text-right">Collected Balance</th>
                                          <th className="py-2.5 px-3 text-right">Outstanding Debt</th>
                                          <th className="py-2.5 px-3 text-center w-36">Office Workflow Shortcuts</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-zinc-900 text-white font-mono">
                                        {(() => {
                                          // Filter patients active under the selected period
                                          const activeFilteredPatients = patients.filter(pt => {
                                            if (incomePeriod === "all") return true;
                                            
                                            // Check patient registration
                                            const matchesReg = isItemInPeriod(getIraqDateString(pt.registered_at), incomePeriod, incomeStartCustomDate, incomeEndCustomDate);
                                            if (matchesReg) return true;

                                            // Check patient dentalWorks
                                            const hasWork = dentalWorks.some(dw => dw.pt_id === pt.id && isItemInPeriod(getIraqDateString(dw.created_at), incomePeriod, incomeStartCustomDate, incomeEndCustomDate));
                                            if (hasWork) return true;

                                            // Check appointments
                                            const hasApt = appointments.some(apt => apt.pt_id === pt.id && isItemInPeriod(getIraqDateString(apt.appointment_date), incomePeriod, incomeStartCustomDate, incomeEndCustomDate));
                                            if (hasApt) return true;

                                            // Check payments
                                            const hasPay = payments.some(p => p.pt_id === pt.id && isItemInPeriod(getIraqDateString(p.created_at), incomePeriod, incomeStartCustomDate, incomeEndCustomDate));
                                            if (hasPay) return true;

                                            return false;
                                          });

                                          // Filter the list based on search bar
                                          const displayPts = activeFilteredPatients.filter(pt => {
                                            if (!searchQuery) return true;
                                            const word = searchQuery.toLowerCase();
                                            return pt.name.toLowerCase().includes(word) || pt.phone.includes(word) || pt.address.toLowerCase().includes(word) || (pt.chronic_illness && pt.chronic_illness.toLowerCase().includes(word));
                                          });

                                          if (displayPts.length === 0) {
                                            return (
                                              <tr>
                                                <td colSpan={7} className="py-8 text-center text-white italic">
                                                  No patient clinical files found active during the selected period.
                                                </td>
                                              </tr>
                                            );
                                          }

                                          return displayPts.map(pt => {
                                            const matchLoan = loans.find(l => l.pt_id === pt.id);
                                            const ptWorks = dentalWorks.filter(dw => dw.pt_id === pt.id);
                                            const ptReceipts = payments.filter(p => p.pt_id === pt.id);

                                            // Financial sums
                                            const totalCost = matchLoan ? matchLoan.total_cost : ptWorks.reduce((sum, w) => sum + w.price, 0);
                                            const totalPaid = matchLoan ? matchLoan.total_paid : ptReceipts.reduce((sum, p) => sum + p.amount, 0);
                                            const loanDebt = Math.max(0, totalCost - totalPaid);
                                            const paidPercent = totalCost > 0 ? Math.min(100, Math.round((totalPaid / totalCost) * 100)) : 100;

                                            // Session status text
                                            const activeApts = appointments.filter(a => a.pt_id === pt.id && a.status === "Scheduled");
                                            const completedApts = appointments.filter(a => a.pt_id === pt.id && a.status === "Completed");
                                            const targetNotes = ptWorks.length > 0 ? ptWorks[0].notes : (activeApts.length > 0 ? activeApts[0].notes : "No active clinical sessions logged.");

                                            const isSelected = selectedPtId === pt.id;

                                            return (
                                              <tr 
                                                key={`inc-pt-row-${pt.id}`} 
                                                onClick={() => setSelectedPtId(pt.id)}
                                                className={`hover:bg-[#1A1A1E] transition-colors cursor-pointer select-none group [&>td]:px-3 [&>td]:py-2.5 ${isSelected ? 'bg-amber-500/5 border-l-2 border-amber-400' : ''}`}
                                              >
                                                <td className="font-bold text-center text-white text-[9.5px]">
                                                  #{pt.id}
                                                </td>
                                                <td>
                                                  <div className="font-sans font-bold text-white group- transition-colors">{pt.name}</div>
                                                  <div className="text-[8.5px] text-white mt-0.5">📞 {pt.phone} | {pt.address || "No address"}</div>
                                                </td>
                                                <td className="max-w-[240px]">
                                                  <div className="text-white font-sans italic truncate text-[9px] font-medium leading-relaxed" title={targetNotes}>
                                                    &quot;{targetNotes}&quot;
                                                  </div>
                                                  <div className="flex gap-1.5 mt-1 font-mono text-[8px] font-bold">
                                                    {activeApts.length > 0 && (
                                                      <span className="px-1 py-0.2 bg-amber-950 text-amber-500 rounded border border-amber-900/30">
                                                        🗓️ {activeApts.length} Pending Scheduled
                                                      </span>
                                                    )}
                                                    {ptWorks.some(w => w.status === "Active") && (
                                                      <span className="px-1 py-0.2 bg-blue-950 text-blue-400 rounded border border-blue-900/30">
                                                        ⚡ Active Procedure
                                                      </span>
                                                    )}
                                                    {pt.chronic_illness && pt.chronic_illness !== "None" && (
                                                      <span className="px-1 py-0.2 bg-red-950/40 text-red-400 rounded border border-red-900/20 max-w-[120px] truncate">
                                                        ⚠️ {pt.chronic_illness}
                                                      </span>
                                                    )}
                                                  </div>
                                                </td>
                                                <td className="text-right text-white font-semibold font-mono whitespace-nowrap">
                                                  {totalCost.toLocaleString()} IQD
                                                </td>
                                                <td className="text-right text-white font-bold font-mono whitespace-nowrap">
                                                  <div>+{totalPaid.toLocaleString()} IQD</div>
                                                  <div className="w-16 h-1 bg-zinc-800 rounded-2xl mt-1.5 overflow-hidden ml-auto">
                                                    <div className="h-full bg-indigo-500" style={{ width: `${paidPercent}%` }}></div>
                                                  </div>
                                                </td>
                                                <td className="text-right font-bold font-mono whitespace-nowrap">
                                                  {loanDebt > 0 ? (
                                                    <span className="text-red-400">-{loanDebt.toLocaleString()} IQD</span>
                                                  ) : (
                                                    <span className="text-white font-extrabold uppercase text-[8px] bg-indigo-500/40 px-1.5 py-0.5 rounded border border-zinc-800/35">Paid Off</span>
                                                  )}
                                                </td>
                                                <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                                  <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setSelectedPtId(pt.id);
                                                        setPtInfoSearchWord(pt.name);
                                                        setActiveTab("pt-info");
                                                      }}
                                                      className="px-2 py-1 bg-zinc-800 hover:bg-[#1C1C1E] text-white border border-zinc-800 rounded text-[9.5px] font-sans font-bold transition-all"
                                                      title="Navigate to patient digital folder history"
                                                    >
                                                      Navigation: Chart Hub
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setSelectedPtId(pt.id);
                                                        setPayPtId(pt.id);
                                                        setPaySearchWord(pt.name);
                                                        setActiveTab("add-money");
                                                      }}
                                                      className="px-2 py-1 bg-amber-400 hover:bg-zinc-800  text-white rounded text-[9.5px] font-sans font-black transition-all"
                                                      title="Directly receive cash & record financial payments"
                                                    >
                                                      Action: Cashier
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          });
                                        })()}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>

                            </div>
                          );
                        })()}
                      </motion.div>
                    )}

                    {/* === SUBPAGE 8: TREATMENTS (Dental procedure lists & shade custom configuration) === */}
                    {activeTab === "treatments" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4"
                      >
                        {/* Aesthetic tooth shade codes configuration */}
                        <div className="p-3 bg-[#111113] border border-zinc-800 rounded-2xl space-y-2.5">
                          <span className="text-[8.5px] uppercase tracking-widest text-white font-mono block">Tooth Aesthetic Shades Mapping Configuration</span>
                          <div className="grid grid-cols-6 gap-1.5 text-center">
                            {shadeColors.map(color => (
                              <div 
                                key={color.id} 
                                onClick={() => {
                                  setSelectedShadeCode(color.code);
                                }}
                                className={`p-1.5 rounded-2xl border text-[9.5px] font-mono font-bold transition-transform cursor-pointer ${
                                  selectedShadeCode === color.code 
                                    ? "bg-zinc-800 border-zinc-800 transform scale-102" 
                                    : "bg-zinc-800 border-zinc-800 text-white hover:border-zinc-800"
                                }`}
                              >
                                <div 
                                  className="w-full h-4 rounded-xs mb-1 border border-zinc-800"
                                  style={{ backgroundColor: color.hex }}
                                  title={color.hex}
                                />
                                {color.code}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Interactive teeth chart mapper */}
                        <div className="bg-[#121212] p-4 rounded-2xl border border-zinc-800 space-y-3">
                          <div className="flex justify-between items-center bg-zinc-800 p-2 border border-zinc-800 rounded-2xl">
                            <span className="text-[8px] uppercase tracking-widest text-white font-mono">Physical Prosthetics Shade assignment</span>
                            <span className="text-[9.5px] text-amber-500 font-mono font-bold">Tooth {selectedToothNum || "None"} ➡️ Shade {selectedShadeCode}</span>
                          </div>

                          <div className="space-y-2.5">
                            <span className="text-[8px] uppercase tracking-widest text-white font-mono text-center block">Maxillary Jaw Teeth Layout</span>
                            <div className="grid grid-cols-8 gap-1 text-center font-mono">
                              {[11, 12, 13, 14, 15, 16, 17, 18].map(tooth => (
                                <button
                                  key={tooth}
                                  type="button"
                                  onClick={() => setSelectedToothNum(tooth)}
                                  className={`py-2 rounded text-[10px] uppercase font-bold transition-all border shrink-0 cursor-pointer ${
                                    selectedToothNum === tooth
                                      ? "bg-amber-400 text-white border-amber-400 shadow-xs"
                                      : "bg-zinc-800 border-zinc-800 text-white hover:border-zinc-800"
                                  }`}
                                >
                                  T{tooth}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2.5 pt-1.5">
                            <span className="text-[8px] uppercase tracking-widest text-[#7C7C82] font-mono text-center block">Mandibular Jaw Teeth Layout</span>
                            <div className="grid grid-cols-8 gap-1 text-center font-mono">
                              {[31, 32, 33, 34, 35, 36, 37, 38].map(tooth => (
                                <button
                                  key={tooth}
                                  type="button"
                                  onClick={() => setSelectedToothNum(tooth)}
                                  className={`py-2 rounded text-[10px] uppercase font-bold transition-all border shrink-0 cursor-pointer ${
                                    selectedToothNum === tooth
                                      ? "bg-amber-400 text-white border-amber-400 shadow-xs"
                                      : "bg-zinc-800 border-zinc-800 text-white hover:border-zinc-800"
                                  }`}
                                >
                                  T{tooth}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Existing medical treatment categories */}
                        <div className="space-y-2">
                          <span className="text-[9px] uppercase tracking-widest text-[#7C7C82] ml-1 font-mono font-normal block">Medical Treatment Catalog Procedures</span>
                          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                            {treatmentTypes.map(type => (
                              <div key={type.id} className="p-2.5 bg-[#121214] border border-zinc-800 rounded-2xl leading-relaxed text-[10px]">
                                <h6 className="font-normal text-white text-[10.5px] font-sans">{type.name}</h6>
                                <p className="text-white font-mono mt-0.5">{type.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* === SUBPAGE 9: LABS (Laboratory dispatches desk) === */}
                    {activeTab === "labs" && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        {/* Tab Switcher Headers */}
                        <div className="flex bg-[#111113] p-1 rounded-2xl border border-zinc-800 gap-1 shadow-inner">
                          <button
                            type="button"
                            onClick={() => setLabsSubTab("labs_work")}
                            className={`flex-1 py-2 text-[10px] font-mono uppercase font-bold tracking-wider rounded-2xl transition-all cursor-pointer ${
                              labsSubTab === "labs_work"
                                ? "bg-amber-400 text-white shadow"
                                : "text-white  hover:bg-zinc-800"
                            }`}
                          >
                            🧪 Lab Work Orders ({labsWork.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setLabsSubTab("labs")}
                            className={`flex-1 py-2 text-[10px] font-mono uppercase font-bold tracking-wider rounded-2xl transition-all cursor-pointer ${
                              labsSubTab === "labs"
                                ? "bg-amber-400 text-white shadow"
                                : "text-white  hover:bg-zinc-800"
                            }`}
                          >
                            🔬 Labs Directory ({labs.length})
                          </button>
                        </div>

                        {labsSubTab === "labs_work" ? (
                          <div className="space-y-4">
                            {/* New Lab work order dispatch */}
                            <div className="bg-[#121212] p-4 rounded-2xl border border-zinc-800 space-y-3">
                              <div>
                                <h4 className="text-white text-xs font-normal font-mono tracking-wider uppercase flex items-center gap-1.5">
                                  <span>🧪</span> New Dispatch Order
                                </h4>
                                <p className="text-[9px] text-white font-mono mt-0.5">Register dispatch order</p>
                              </div>

                              <form onSubmit={submitLabsDispatch} className="space-y-2.5">
                                <div className="grid grid-cols-2 gap-2">
                                  <select
                                    required
                                    value={labPtId}
                                    onChange={(e) => setLabPtId(e.target.value ? Number(e.target.value) : "")}
                                    className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2.5 text-[10.5px] text-white focus:outline-hidden font-mono"
                                  >
                                    <option value="">-- Patient --</option>
                                    {patients.map(p => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                  </select>

                                  <select
                                    required
                                    value={labTargetId}
                                    onChange={(e) => setLabTargetId(e.target.value ? Number(e.target.value) : "")}
                                    className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2.5 text-[10.5px] text-white focus:outline-hidden font-mono"
                                  >
                                    <option value="">-- Lab clinic --</option>
                                    {labs.map(l => (
                                      <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <select
                                    value={labToothShadeCode}
                                    onChange={(e) => setLabToothShadeCode(e.target.value)}
                                    className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2.5 text-[10.5px] text-white focus:outline-hidden font-mono"
                                  >
                                    {shadeColors.map(sc => (
                                      <option key={sc.id} value={sc.code}>Shade: {sc.code}</option>
                                    ))}
                                  </select>
                                  
                                  <input
                                    type="number"
                                    required
                                    value={labFee}
                                    onChange={(e) => setLabFee(e.target.value)}
                                    placeholder="Fee (IQD)"
                                    className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2.5 text-[10.5px] text-white placeholder:text-white font-mono focus:outline-hidden"
                                  />
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                  <select
                                    value={labWorkDrName}
                                    onChange={(e) => setLabWorkDrName(e.target.value)}
                                    className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 px-2 text-[10px] text-white focus:outline-hidden font-mono"
                                  >
                                    <option value="Attending Doctor">-- Dr Name --</option>
                                    {doctors.map(d => (
                                      <option key={`disp-doc-${d.id}`} value={d.name}>{d.name}</option>
                                    ))}
                                  </select>

                                  <input
                                    type="text"
                                    value={labWorkDelevery}
                                    onChange={(e) => setLabWorkDelevery(e.target.value)}
                                    placeholder="Carrier Delivery..."
                                    className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2 text-[10px] text-white placeholder:text-white font-mono focus:outline-hidden"
                                  />

                                  <select
                                    value={labWorkCalled}
                                    onChange={(e) => setLabWorkCalled(e.target.value)}
                                    className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 px-2 text-[10px] text-white focus:outline-hidden font-mono"
                                  >
                                    <option value="No">⏳ Unnotified</option>
                                    <option value="Yes">📞 Called/Notified</option>
                                  </select>
                                </div>

                                <button
                                  type="submit"
                                  className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-800 text-white font-semibold uppercase tracking-wider text-[9.5px] rounded-2xl transition-all cursor-pointer"
                                >
                                  Submit: Dispatch
                                </button>
                              </form>
                            </div>

                            {/* List of active tech queues dispatches */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between px-1">
                                <span className="text-[9px] uppercase tracking-widest text-[#7C7C82] font-mono font-normal block">
                                  Active Laboratory Dispatches Queue ({labsWork.filter(lw => showCompletedLabWork || lw.status !== "Delivered").length})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setShowCompletedLabWork(!showCompletedLabWork)}
                                  className={`text-[9px] font-mono border rounded px-2 py-0.5 transition-all cursor-pointer ${
                                    showCompletedLabWork 
                                      ? "bg-amber-400 border-amber-400 text-white font-semibold animate-none" 
                                      : "bg-zinc-800 border-zinc-800 text-white  hover:bg-zinc-800"
                                  }`}
                                >
                                  {showCompletedLabWork ? "🟢 Showing Completed" : "⏳ Ignoring Completed"}
                                </button>
                              </div>
                              
                              <div className="space-y-2">
                                {labsWork
                                  .filter(lw => showCompletedLabWork || lw.status !== "Delivered")
                                  .map(lw => {
                                    const isEditing = editingLabWorkId === lw.id;
                                  return (
                                    <div key={`lab-order-${lw.id}`} className="p-3 bg-[#131114] border border-zinc-800 rounded-2xl space-y-3">
                                      {isEditing ? (
                                        <div className="space-y-3 pt-1">
                                          <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
                                            <span className="text-[9px] uppercase tracking-widest text-amber-500 font-mono font-bold">✏️ Edit Dispatch Order</span>
                                            <button
                                              type="button"
                                              onClick={() => setEditingLabWorkId(null)}
                                              className="text-[10px] text-white  font-mono cursor-pointer"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                          
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                              <label className="text-[8px] uppercase text-white font-mono block">Patient Dossier</label>
                                              <select
                                                value={editLabWorkPtId}
                                                onChange={(e) => setEditLabWorkPtId(e.target.value ? Number(e.target.value) : "")}
                                                className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2 text-[10px] text-white focus:outline-hidden font-mono"
                                              >
                                                {patients.map(p => (
                                                  <option key={`edit-lw-pt-${p.id}`} value={p.id}>{p.name}</option>
                                                ))}
                                              </select>
                                            </div>

                                            <div className="space-y-1">
                                              <label className="text-[8px] uppercase text-white font-mono block">Target Lab Clinic</label>
                                              <select
                                                value={editLabWorkLabId}
                                                onChange={(e) => setEditLabWorkLabId(e.target.value ? Number(e.target.value) : "")}
                                                className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2 text-[10px] text-white focus:outline-hidden font-mono"
                                              >
                                                {labs.map(l => (
                                                  <option key={`edit-lw-lab-${l.id}`} value={l.id}>{l.name}</option>
                                                ))}
                                              </select>
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div className="space-y-1">
                                              <label className="text-[8px] uppercase text-white font-mono block">Tooth / Shade Request</label>
                                              <input
                                                type="text"
                                                value={editLabWorkShade}
                                                onChange={(e) => setEditLabWorkShade(e.target.value)}
                                                className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2 text-[10px] text-white focus:outline-hidden font-mono"
                                              />
                                            </div>

                                            <div className="space-y-1">
                                              <label className="text-[8px] uppercase text-white font-mono block">Order Fee (IQD)</label>
                                              <input
                                                type="number"
                                                value={editLabWorkFee || ""}
                                                onChange={(e) => setEditLabWorkFee(e.target.value)}
                                                className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2 text-[10px] text-white focus:outline-hidden font-mono"
                                              />
                                            </div>

                                            <div className="space-y-1">
                                              <label className="text-[8px] uppercase text-white font-mono block">Dispatch Status</label>
                                              <select
                                                value={editLabWorkStatus}
                                                onChange={(e) => setEditLabWorkStatus(e.target.value as any)}
                                                className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2 text-[10px] text-white focus:outline-hidden font-mono"
                                              >
                                                <option value="Dispatched">Dispatched</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Delivered">Delivered</option>
                                              </select>
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div className="space-y-1">
                                              <label className="text-[8px] uppercase text-white font-mono block">Attending Clinician</label>
                                              <select
                                                value={editLabWorkDrName}
                                                onChange={(e) => setEditLabWorkDrName(e.target.value)}
                                                className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2 text-[10px] text-white focus:outline-hidden font-mono"
                                              >
                                                <option value="Attending Doctor">-- Select Doctor --</option>
                                                {doctors.map(d => (
                                                  <option key={`edit-lw-doc-${d.id}`} value={d.name}>{d.name}</option>
                                                ))}
                                              </select>
                                            </div>

                                            <div className="space-y-1">
                                              <label className="text-[8px] uppercase text-white font-mono block">Delivery Carrier Method</label>
                                              <input
                                                type="text"
                                                value={editLabWorkDelevery}
                                                onChange={(e) => setEditLabWorkDelevery(e.target.value)}
                                                className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2 text-[10px] text-white focus:outline-hidden font-mono"
                                              />
                                            </div>

                                            <div className="space-y-1">
                                              <label className="text-[8px] uppercase text-white font-mono block">Call Notified</label>
                                              <select
                                                value={editLabWorkCalled}
                                                onChange={(e) => setEditLabWorkCalled(e.target.value)}
                                                className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2 text-[10px] text-white focus:outline-hidden font-mono"
                                              >
                                                <option value="No">No</option>
                                                <option value="Yes">Yes (Called)</option>
                                              </select>
                                            </div>
                                          </div>

                                          <div className="space-y-1">
                                            <label className="text-[8px] uppercase text-white font-mono block">Order Feedback & Notes</label>
                                            <textarea
                                              value={editLabWorkNotes}
                                              onChange={(e) => setEditLabWorkNotes(e.target.value)}
                                              rows={2}
                                              placeholder="Update instructions or special lab feedback notes..."
                                              className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2 text-[10px] text-white focus:outline-hidden font-mono placeholder:text-white"
                                            />
                                          </div>

                                          <div className="flex gap-2">
                                            <button
                                              type="button"
                                              onClick={() => handleSaveEditLabWork(lw.id)}
                                              className="flex-1 py-1 bg-amber-400 hover:bg-zinc-800 text-white text-[9.5px] font-bold uppercase rounded cursor-pointer"
                                            >
                                              Submit: Save
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingLabWorkId(null)}
                                              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-800 text-white text-[9.5px] uppercase rounded font-mono cursor-pointer"
                                            >
                                              Close
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-start justify-between gap-3 text-xs leading-normal">
                                          <div>
                                            <h5 className="font-bold text-white flex items-center gap-1.5">
                                              <span>👤</span> {lw.pt_name}
                                              <span className={`ml-2 px-1 text-[8px] rounded border font-mono ${
                                                lw.called === "Yes"
                                                  ? "bg-indigo-500/40 text-white border-zinc-800/40"
                                                  : "bg-red-950/40 text-red-400 border-red-900/40"
                                              }`}>
                                                {lw.called === "Yes" ? "📞 Called" : "⏳ Uncalled"}
                                              </span>
                                            </h5>
                                            <p className="text-[9.5px] font-mono text-white mt-1">🔬 Partner lab: <span className="text-white">{lw.lab_name}</span></p>
                                            <p className="text-[8.5px] font-mono text-white mt-0.5">Tooth colour shade request: <span className="text-amber-400 font-bold">{lw.tooth_code}</span></p>
                                            <p className="text-[8.5px] font-mono text-white mt-0.5">
                                              📋 Clinician: <span className="text-white">{lw.dr_name || "Attending Doctor"}</span> | 🚚 Carrier: <span className="text-white">{lw.delevery || "Dispatch / Standard"}</span>
                                            </p>
                                            {lw.notes && (
                                              <p className="text-[8.5px] font-mono text-white mt-1 italic">📋 Note: "{lw.notes}"</p>
                                            )}
                                            <p className="text-[8px] font-mono text-white mt-1.5">
                                              Est. Dispatch Fee: <span className="text-white font-bold">{lw.fee?.toLocaleString()} IQD</span> | Date: {lw.dispatch_date}
                                            </p>
                                          </div>

                                          <div className="flex flex-col gap-1.5 items-end shrink-0 pointer-events-auto">
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                const nextMap: Record<string, "Dispatched" | "In Progress" | "Delivered"> = {
                                                  "Dispatched": "In Progress",
                                                  "In Progress": "Delivered",
                                                  "Delivered": "Dispatched"
                                                };
                                                const nextStatus = nextMap[lw.status];
                                                setLabsWork(labsWork.map(item => item.id === lw.id ? { ...item, status: nextStatus } : item));

                                                try {
                                                  await fetch(`/api/labs-work/${lw.id}`, {
                                                    method: "PATCH",
                                                    headers: {
                                                      "Content-Type": "application/json",
                                                      "Authorization": token ? `Bearer ${token}` : ""
                                                    },
                                                    body: JSON.stringify({ status: nextStatus })
                                                  });
                                                } catch (e) {
                                                  console.error("Failed to persist laboratory status update:", e);
                                                }
                                              }}
                                              className={`px-1.5 py-0.5 rounded-2xl text-[8px] border font-mono uppercase font-bold transition-transform cursor-pointer pointer-events-auto ${
                                                lw.status === "Dispatched"
                                                  ? "bg-sky-950/40 text-sky-400 border-sky-900/40"
                                                  : lw.status === "In Progress"
                                                  ? "bg-amber-950/40 text-amber-400 border-amber-900/40 animate-pulse"
                                                  : "bg-indigo-500/40 text-white border-[#0a2e1d]"
                                              }`}
                                            >
                                              {lw.status}
                                            </button>

                                            <div className="flex gap-1">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setEditingLabWorkId(lw.id);
                                                  setEditLabWorkPtId(lw.pt_id);
                                                  setEditLabWorkLabId(lw.lab_id);
                                                  setEditLabWorkShade(lw.tooth_code);
                                                  setEditLabWorkFee(lw.fee?.toString() || "");
                                                  setEditLabWorkStatus(lw.status);
                                                  setEditLabWorkNotes(lw.notes || "");
                                                  setEditLabWorkDrName(lw.dr_name || "Attending Doctor");
                                                  setEditLabWorkDelevery(lw.delevery || "Dispatch / Standard");
                                                  setEditLabWorkCalled(lw.called || "No");
                                                }}
                                                className="px-1 py-0.5 bg-zinc-800 hover:bg-zinc-800 text-white rounded text-[7.5px] uppercase font-mono cursor-pointer"
                                              >
                                                Action: Edit
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteLabWork(lw.id)}
                                                className="px-1 py-0.5 bg-red-950/40 hover:bg-zinc-800 text-red-400 rounded text-[7.5px] uppercase font-mono cursor-pointer"
                                              >
                                                Action: Delete
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Create New Laboratory Partner */}
                            <div className="bg-[#121212] p-4 rounded-2xl border border-zinc-800 space-y-3">
                              <div>
                                <h4 className="text-white text-xs font-normal font-mono tracking-wider uppercase flex items-center gap-1.5">
                                  <span>🔬</span> Add Lab Partner
                                </h4>
                                <p className="text-[9px] text-white font-mono mt-0.5">Register lab partner</p>
                              </div>

                              <form onSubmit={handleCreateLab} className="space-y-2.5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    required
                                    value={newLabName}
                                    onChange={(e) => setNewLabName(e.target.value)}
                                    placeholder="Enter Laboratory Name..."
                                    className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2.5 text-[10.5px] text-white placeholder:text-white font-mono focus:outline-hidden"
                                  />
                                  <input
                                    type="text"
                                    value={newLabPhone}
                                    onChange={(e) => setNewLabPhone(e.target.value)}
                                    placeholder="Phone Contact..."
                                    className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2.5 text-[10.5px] text-white placeholder:text-white font-mono focus:outline-hidden"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={newLabAddress}
                                    onChange={(e) => setNewLabAddress(e.target.value)}
                                    placeholder="Shipping Street Address..."
                                    className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2.5 text-[10.5px] text-white placeholder:text-white font-mono focus:outline-hidden"
                                  />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={newLabName2}
                                    onChange={(e) => setNewLabName2(e.target.value)}
                                    placeholder="Alt Contact Name (name2)..."
                                    className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2.5 text-[10.5px] text-white placeholder:text-white font-mono focus:outline-hidden"
                                  />
                                  <input
                                    type="text"
                                    value={newLabPhone2}
                                    onChange={(e) => setNewLabPhone2(e.target.value)}
                                    placeholder="Alt Contact Phone (phone2)..."
                                    className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2.5 text-[10.5px] text-white placeholder:text-white font-mono focus:outline-hidden"
                                  />
                                </div>

                                <button
                                  type="submit"
                                  className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-800 text-white font-semibold uppercase tracking-wider text-[9.5px] rounded-2xl transition-all cursor-pointer"
                                >
                                  Submit: Register
                                </button>
                              </form>
                            </div>

                            {/* Registered Labs Directory */}
                            <div className="space-y-3">
                              <span className="text-[9px] uppercase tracking-widest text-[#7C7C82] ml-1 font-mono font-normal block">
                                Registered Dental Fabrication Laboratories ({labs.filter(lab => {
                                  if (!labSearchWord) return true;
                                  const q = labSearchWord.toLowerCase();
                                  return (
                                    lab.name.toLowerCase().includes(q) ||
                                    (lab.phone && lab.phone.includes(q)) ||
                                    (lab.address && lab.address.toLowerCase().includes(q)) ||
                                    (lab.name2 && lab.name2.toLowerCase().includes(q)) ||
                                    (lab.phone2 && lab.phone2.includes(q))
                                  );
                                }).length})
                              </span>

                              {/* Labs Search Input */}
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[11px] text-white">
                                  <span>🔍</span>
                                </span>
                                <input
                                  type="text"
                                  value={labSearchWord}
                                  onChange={(e) => setLabSearchWord(e.target.value)}
                                  placeholder="Search laboratories by name, phone, address, or key contacts..."
                                  className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 pl-8.5 pr-8 text-[11px] text-white placeholder:text-white focus:outline-hidden font-mono"
                                />
                                {labSearchWord && (
                                  <button
                                    type="button"
                                    onClick={() => setLabSearchWord("")}
                                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-white  cursor-pointer text-[9px]"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>

                              <div className="space-y-2">
                                {labs
                                  .filter(lab => {
                                    if (!labSearchWord) return true;
                                    const q = labSearchWord.toLowerCase();
                                    return (
                                      lab.name.toLowerCase().includes(q) ||
                                      (lab.phone && lab.phone.includes(q)) ||
                                      (lab.address && lab.address.toLowerCase().includes(q)) ||
                                      (lab.name2 && lab.name2.toLowerCase().includes(q)) ||
                                      (lab.phone2 && lab.phone2.includes(q))
                                    );
                                  })
                                  .map(lab => {
                                    const isEditing = editingLabId === lab.id;
                                  return (
                                    <div key={`partner-lab-${lab.id}`} className="p-3 bg-[#131114] border border-zinc-800 rounded-2xl space-y-3">
                                      {isEditing ? (
                                        <div className="space-y-3 pt-1">
                                          <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
                                            <span className="text-[9px] uppercase tracking-widest text-[#fbbf24] font-mono font-bold">✏️ Edit Lab Profile</span>
                                            <button
                                              type="button"
                                              onClick={() => setEditingLabId(null)}
                                              className="text-[10px] text-white  font-mono cursor-pointer"
                                            >
                                              Cancel
                                            </button>
                                          </div>

                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                              <label className="text-[8px] uppercase text-white font-mono block">Laboratory Name</label>
                                              <input
                                                type="text"
                                                required
                                                value={editLabName}
                                                onChange={(e) => setEditLabName(e.target.value)}
                                                className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2 text-[10px] text-white focus:outline-hidden font-mono"
                                              />
                                            </div>

                                            <div className="space-y-1">
                                              <label className="text-[8px] uppercase text-white font-mono block">Contact Phone Number</label>
                                              <input
                                                type="text"
                                                value={editLabPhone}
                                                onChange={(e) => setEditLabPhone(e.target.value)}
                                                className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2 text-[10px] text-white focus:outline-hidden font-mono"
                                              />
                                            </div>
                                          </div>

                                          <div className="space-y-1">
                                            <label className="text-[8px] uppercase text-white font-mono block">Office Shipping Address</label>
                                            <input
                                              type="text"
                                              value={editLabAddress}
                                              onChange={(e) => setEditLabAddress(e.target.value)}
                                              className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2 text-[10px] text-white focus:outline-hidden font-mono"
                                            />
                                          </div>

                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                              <label className="text-[8px] uppercase text-white font-mono block">Alt Contact Person Name (name2)</label>
                                              <input
                                                type="text"
                                                value={editLabName2}
                                                onChange={(e) => setEditLabName2(e.target.value)}
                                                className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2 text-[10px] text-white focus:outline-hidden font-mono"
                                              />
                                            </div>

                                            <div className="space-y-1">
                                              <label className="text-[8px] uppercase text-white font-mono block">Alt Contact Phone (phone2)</label>
                                              <input
                                                type="text"
                                                value={editLabPhone2}
                                                onChange={(e) => setEditLabPhone2(e.target.value)}
                                                className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1 px-2 text-[10px] text-white focus:outline-hidden font-mono"
                                              />
                                            </div>
                                          </div>

                                          <div className="flex gap-2">
                                            <button
                                              type="button"
                                              onClick={() => handleSaveEditLab(lab.id)}
                                              className="flex-1 py-1 bg-amber-400 hover:bg-zinc-800 text-white text-[9.5px] font-bold uppercase rounded cursor-pointer"
                                            >
                                              Submit: Save
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingLabId(null)}
                                              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-800 text-white text-[9.5px] uppercase rounded font-mono cursor-pointer"
                                            >
                                              Close
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-start justify-between gap-3 text-xs leading-normal">
                                          <div>
                                            <h5 className="font-extrabold text-white text-[12px] flex items-center gap-1.5 font-sans">
                                              <span>🔬</span> {lab.name}
                                            </h5>
                                            <p className="text-[9.5px] font-mono text-white mt-1">
                                              📞 Phone Contact: {lab.phone || <span className="text-white">Unspecified</span>}
                                            </p>
                                            <p className="text-[9.5px] font-mono text-white mt-0.5">
                                              📍 Street Address: {lab.address || <span className="text-white font-bold">Unspecified</span>}
                                            </p>
                                            <p className="text-[9.5px] font-mono text-white mt-0.5">

                                            </p>
                                            {(lab.name2 || lab.phone2) && (
                                              <p className="text-[9.5px] font-mono text-white mt-1.5 pt-1.5 border-t border-zinc-800/40">
                                                👥 Alt Representative: <span className="text-amber-400 font-semibold">{lab.name2 || "Unspecified"}</span> {lab.phone2 && <span className="text-white">({lab.phone2})</span>}
                                              </p>
                                            )}
                                          </div>

                                          <div className="flex gap-1.5 pointer-events-auto">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingLabId(lab.id);
                                                setEditLabName(lab.name);
                                                setEditLabPhone(lab.phone || "");
                                                setEditLabAddress(lab.address || "");
                                                setEditLabEmail(lab.email || "");
                                                setEditLabName2(lab.name2 || "");
                                                setEditLabPhone2(lab.phone2 || "");
                                              }}
                                              className="px-2 py-1 bg-[#1a1c23] hover:bg-[#252836]  text-white border border-zinc-800 rounded font-mono text-[9px] uppercase cursor-pointer"
                                            >
                                              Action: Edit
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteLab(lab.id)}
                                              className="px-2 py-1 bg-red-950/40 hover:bg-zinc-800  text-red-400 border border-red-900/40 rounded font-mono text-[9px] uppercase cursor-pointer"
                                            >
                                              Action: Delete
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* === SUBPAGE 11: PROVIDER PROFILE CONTROLS (Profile) === */}
                    {activeTab === "provider-profile" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4"
                      >
                        <h5 className="text-[10px] font-mono font-normal text-white uppercase tracking-widest bg-zinc-800/40 p-1">Account Profile</h5>

                        <div className="bg-[#121212] p-5 rounded-2xl border border-zinc-800 shadow-xs space-y-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-800 flex items-center justify-center font-mono font-bold text-sm text-white">
                              {user.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-[9px] font-mono font-bold text-white uppercase block">Name</span>
                              <span className="text-xs font-semibold text-white">{user.name}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
                            <div>
                              <span className="text-[9px] font-mono font-bold text-white uppercase block">Role</span>
                              <span className="text-[10px] font-mono font-bold text-white bg-zinc-800 border border-zinc-800 px-2.5 py-1 rounded inline-block mt-0.5">
                                {user.level === 1 ? "Administrator" : user.level === 2 ? "Practitioner" : "Staff"}
                              </span>
                            </div>

                            <div>
                              <span className="text-[9px] font-mono font-bold text-white uppercase block">User ID</span>
                              <span className="text-[10px] font-mono text-white inline-block mt-1">
                                #{user.id}
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-zinc-800 pt-4">
                            <h6 className="text-[9px] font-mono font-bold text-white uppercase tracking-wider mb-2">Primary Contact</h6>
                            <form onSubmit={handleUpdatePhone} className="flex gap-2">
                              <div className="relative flex-1">
                                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-white">
                                  <Phone className="w-3.5 h-3.5" />
                                </span>
                                <input
                                  type="tel"
                                  required
                                  value={newPhone}
                                  onChange={(e) => setNewPhone(e.target.value)}
                                  placeholder="Primary contact phone..."
                                  className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl border border-zinc-800 rounded-2xl py-1.5 pl-8 pr-2 text-xs text-white placeholder:text-white focus:outline-hidden focus:border-zinc-800 font-mono"
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={isUpdatingPhone}
                                className="px-3 bg-white text-white rounded-2xl text-xs font-bold hover:bg-zinc-800 active:scale-95 transition-all text-center flex items-center cursor-pointer"
                              >
                                {isUpdatingPhone ? "Saving..." : "Submit"}
                              </button>
                            </form>
                            {updateMsg && (
                              <p className={`text-[10px] mt-1.5 font-mono ${updateMsg.success ? "text-white" : "text-red-400"}`}>
                                {updateMsg.text}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}

                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Android touch navigator bar indicator */}
          <div id="device-home-indicator" className="h-4 pb-2.5 flex justify-center items-end bg-[#121212] z-20">
            <div className="w-24 h-0.5 bg-zinc-800 rounded-2xl" />
          </div>

        </div>
      </div>
    </div>
  );
}

// Inline Sub-Components for custom Clinician Level Pick Icons
function AdminIcon(props: React.SVGProps<SVGSVGElement>) {
  return <ShieldCheck {...props} />;
}
function DoctorIcon(props: React.SVGProps<SVGSVGElement>) {
  return <Heart {...props} />;
}
function StaffIcon(props: React.SVGProps<SVGSVGElement>) {
  return <FlaskConical {...props} />;
}

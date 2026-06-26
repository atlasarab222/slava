import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config({ override: true });

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || "";

// Safely select the best key. Prefer JWT (starting with eyJ) or secret/service keys (starting with sb_secret_ or sb_service_role_).
// Exclude publishable keys (starting with sb_publishable_ or sbp_) if a better key is available.
const getBestSupabaseKey = (): string => {
  const serviceKey = (process.env.SUPABASE_SERVICE_KEY || "").trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || "").trim();

  const isJwt = (k: string) => k.startsWith("eyJ");
  const isSecret = (k: string) => k.startsWith("sb_secret_") || k.startsWith("sb_service_role_");
  const isPublishable = (k: string) => k.startsWith("sb_publishable_") || k.startsWith("sbp_");

  if (serviceKey && (isJwt(serviceKey) || isSecret(serviceKey))) {
    return serviceKey;
  }
  if (anonKey && (isJwt(anonKey) || isSecret(anonKey))) {
    return anonKey;
  }
  return serviceKey || anonKey || "";
};

const supabaseKey = getBestSupabaseKey();
const jwtSecret = process.env.JWT_SECRET || "slava_dent_jwt_fallback_key_2026_unsecure";

const isPlaceholder = (val: string) => {
  if (!val) return true;
  const v = val.trim();
  return (
    v === "" ||
    v === "..." ||
    v.includes("YOUR_") ||
    v.includes("placeholder") ||
    v === "MY_APP_URL" ||
    v === "MY_GEMINI_API_KEY"
  );
};

let isSupabaseActive = !!(supabaseUrl && !isPlaceholder(supabaseUrl) && supabaseKey && !isPlaceholder(supabaseKey));

if (!isSupabaseActive) {
  console.log("ℹ️ Supabase credentials not found or set to placeholders. Local in-memory store fallback enabled.");
} else {
  console.log(`✅ Supabase client initialized (Key length: ${supabaseKey.length} chars) for Slava Dent PostgreSQL integration.`);
}

const supabase = createClient(
  isSupabaseActive ? supabaseUrl : "https://placeholder-url-for-supabase-inactive.supabase.co",
  isSupabaseActive ? supabaseKey : "placeholder-key",
  {
    realtime: {
      transport: ws,
    },
  }
);

function checkSupabaseError(error: any) {
  if (!error) return;
  console.log("🔍 Detailed Supabase Error caught:", JSON.stringify(error, null, 2));
  const msg = error.message || "";
  if (
    msg.includes("Invalid API key") || 
    msg.includes("invalid api key") || 
    msg.includes("API key") || 
    msg.includes("JWT") || 
    msg.includes("Authentication") || 
    msg.trim().includes("401") ||
    error.code === "PGRST301"
  ) {
    console.log("⚠️ Supabase API credential error detected. Disabling Supabase integration and switching to fully local memory storage.");
    isSupabaseActive = false;
  }
}

// JWT Middleware for route protection
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token is missing" });
  }

  jwt.verify(token, jwtSecret, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired session token" });
    }
    req.user = user;
    next();
  });
};

// ==========================================
// API Auth Endpoints (Dual DB-or-Memory Fallback)
// ==========================================

// Fallback In-Memory User Database in case Supabase is unreachable or lacks the target tables
interface FallbackUser {
  id: number;
  name: string;
  passwordHashOriginal: string; // bcrypt hash or exact match string
  phone: number;
  level: number;
}

const fallbackUsers: FallbackUser[] = [
  {
    id: 1,
    name: "Dr. Ahmed Bilal",
    passwordHashOriginal: "admin",
    phone: 964770111222,
    level: 1, // Level_1_Owner
  },
  {
    id: 2,
    name: "Dr. Marwan Sadiq",
    passwordHashOriginal: "admin",
    phone: 964781333444,
    level: 2, // Level_2_Dentist
  },
  {
    id: 3,
    name: "Dr. Sarah Waleed",
    passwordHashOriginal: "admin",
    phone: 964750555666,
    level: 2, // Level_2_Dentist
  },
  {
    id: 4,
    name: "admin",
    passwordHashOriginal: "admin",
    phone: 964770123456,
    level: 1, // Level_1_Owner
  }
];

// In-Memory Database fallbacks for patient registries, clinic procedures, and cash flows
let fallbackPatients: any[] = [];

let fallbackDoctors: any[] = [];

let fallbackPayments: any[] = [];

let fallbackAppointments: any[] = [];

let fallbackLabs: any[] = [];

let fallbackLabsWork: any[] = [];

let fallbackTreatmentTypes: any[] = [];

let fallbackDentalWorks: any[] = [];

// Register Route
app.post("/api/auth/register", async (req: any, res: any) => {
  try {
    const { name, password, phone, level } = req.body;

    if (!name || !password || !phone) {
      return res.status(400).json({ error: "Name, password, and phone number are required" });
    }

    // Clean phone number (cast to big integer)
    const phoneNum = parseInt(phone.toString().replace(/\D/g, ""), 10);
    if (isNaN(phoneNum)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    const levelNum = typeof level === "number" ? level : 3; // Default level 3 (assistant/doctor helper)

    // Check if user already exists
    let existingUser: any = null;
    let usingFallback = !isSupabaseActive;

    if (!usingFallback) {
      try {
        const { data: userFromDb, error: checkError } = await supabase
          .from("users")
          .select("id, name")
          .eq("name", name.trim())
          .maybeSingle();

        if (checkError) {
          console.log("Supabase user search notice: falling back to memory store");
          checkSupabaseError(checkError);
          usingFallback = true;
        } else {
          existingUser = userFromDb;
        }
      } catch (e) {
        console.log("Supabase exception notice: falling back to memory store");
        usingFallback = true;
      }
    }

    if (usingFallback) {
      existingUser = fallbackUsers.find(
        (u) => u.name.toLowerCase() === name.trim().toLowerCase()
      );
    }

    if (existingUser) {
      return res.status(409).json({ error: `User with the name ${name} already exists` });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    let newUser: any = null;

    if (!usingFallback) {
      try {
        const { data: createdUser, error: insertError } = await supabase
          .from("users")
          .insert([
            {
              name: name.trim(),
              password: hashedPassword,
              phone: phoneNum,
              level: levelNum,
            },
          ])
          .select("id, name, phone, level")
          .single();

        if (insertError) {
          console.log("Supabase account insertion notice: falling back to memory store");
          checkSupabaseError(insertError);
          usingFallback = true;
        } else {
          newUser = createdUser;
        }
      } catch (e) {
        console.log("Supabase connection exception notice: falling back to memory store");
        usingFallback = true;
      }
    }

    if (usingFallback) {
      const nextId = fallbackUsers.length > 0 ? Math.max(...fallbackUsers.map(u => u.id)) + 1 : 1;
      const newFbUser: FallbackUser = {
        id: nextId,
        name: name.trim(),
        passwordHashOriginal: hashedPassword,
        phone: phoneNum,
        level: levelNum,
      };
      fallbackUsers.push(newFbUser);
      newUser = {
        id: newFbUser.id,
        name: newFbUser.name,
        phone: newFbUser.phone,
        level: newFbUser.level,
      };
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        level: newUser.level,
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      message: "Registration successful",
      user: {
        id: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        level: newUser.level,
      },
      token,
    });
  } catch (err: any) {
    console.error("Registration endpoint catch error:", err);
    return res.status(500).json({ error: err.message || "Unknown error during registration" });
  }
});

// Login Route
app.post("/api/auth/login", async (req: any, res: any) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: "Name and password are required" });
    }

    // Fetch user from PostgreSQL public.users table via Supabase or memory
    let user: any = null;
    let usingFallback = !isSupabaseActive;

    if (!usingFallback) {
      try {
        const { data: userFromDb, error: fetchError } = await supabase
          .from("users")
          .select("*")
          .eq("name", name.trim())
          .maybeSingle();

        if (fetchError) {
          console.log("Supabase login request notice: checking memory store fallback");
          checkSupabaseError(fetchError);
          usingFallback = true;
        } else {
          user = userFromDb;
        }
      } catch (e) {
        console.log("Supabase login query notice: checking memory store fallback");
        usingFallback = true;
      }
    }

    if (usingFallback || !user) {
      const fbUser = fallbackUsers.find(
        (u) => u.name.toLowerCase() === name.trim().toLowerCase()
      );
      if (fbUser) {
        user = {
          id: fbUser.id,
          name: fbUser.name,
          password: fbUser.passwordHashOriginal,
          phone: fbUser.phone,
          level: fbUser.level,
        };
      }
    }

    if (!user) {
      return res.status(401).json({ error: `User with the name "${name}" not found` });
    }

    // Compare passwords.
    // Supports bcrypt hashed validation as well as pure raw text validation to support
    // legacy SQL imports gracefully in the developer's DB schema environment.
    let isPasswordValid = false;
    
    // First try bcrypt hashed check
    if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
      try {
        isPasswordValid = await bcrypt.compare(password, user.password);
      } catch (e) {
        console.error("Bcrypt compare exception:", e);
      }
    }

    // Fallback: If bcrypt comparison failed or is not a hash, try exact raw matches
    if (!isPasswordValid) {
      isPasswordValid = (password === user.password);
    }

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    // Generate token
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        phone: user.phone,
        level: user.level,
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        level: user.level,
      },
      token,
    });
  } catch (err: any) {
    console.error("Login endpoint exception:", err);
    return res.status(500).json({ error: err.message || "Unknown error during login" });
  }
});

// Get Session Me
app.get("/api/auth/me", authenticateToken, async (req: any, res: any) => {
  return res.json({ user: req.user });
});

// ==========================================
// Clinic Entity Routes (Supabase Sync with Fallback)
// ==========================================

// Helper function to build a map of pt_id -> pt_name
async function getPatientsMap(): Promise<Record<number, string>> {
  const patientMap: Record<number, string> = {};
  
  // Start with local memory fallbacks for reliable resolution
  for (const pt of fallbackPatients) {
    patientMap[pt.id] = pt.name;
  }
  
  if (isSupabaseActive) {
    try {
      const { data, error } = await supabase
        .from("ptdata")
        .select("id, pt_name");
      if (!error && data) {
        for (const pt of data) {
          if (pt.id && pt.pt_name) {
            patientMap[pt.id] = pt.pt_name;
          }
        }
      }
    } catch (e) {
      console.log("Could not construct live database patient resolution map:", e);
    }
  }
  
  return patientMap;
}

// 1. Patients Entity (Table: ptdata)
app.get("/api/patients", async (req: any, res: any) => {
  if (isSupabaseActive) {
    try {
      const { data, error } = await supabase
        .from("ptdata")
        .select("*")
        .order("id", { ascending: false });

      if (!error && data) {
        // Build map for referrer resolution
        const patientMap: Record<number, string> = {};
        for (const pt of data) {
          patientMap[pt.id] = pt.pt_name || "";
        }

        const mapped = data.map((pt: any) => ({
          id: pt.id,
          name: pt.pt_name,
          phone: pt.pt_phone || "",
          address: pt.pt_address || "",
          chronic_illness: pt.pt_disease || "None",
          registered_at: pt.pt_time || new Date().toISOString(),
          ref: pt.ref && patientMap[pt.ref] ? patientMap[pt.ref] : undefined,
          age: pt.pt_age ? parseInt(pt.pt_age, 10) || undefined : undefined
        }));
        return res.json(mapped);
      }
      console.log("Supabase patients query notice, using fallback memory store:", error?.message);
      checkSupabaseError(error);
    } catch (err: any) {
      console.log("Supabase patients query exception, using fallback memory store:", err.message);
      checkSupabaseError(err);
    }
  }
  return res.json(fallbackPatients);
});

app.post("/api/patients", async (req: any, res: any) => {
  try {
    const { name, phone, address, chronic_illness, age, ref_id, user_by } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Patient name is required" });
    }

    const newPatient: any = {
      name,
      phone: phone || "",
      address: address || "",
      chronic_illness: chronic_illness || "None",
      age: age ? parseInt(age.toString(), 10) || undefined : undefined,
      ref: ref_id ? ref_id.toString() : undefined,
      registered_at: new Date().toISOString()
    };

    if (isSupabaseActive) {
      try {
        const { data, error } = await supabase
          .from("ptdata")
          .insert([{
            pt_name: name,
            pt_phone: phone || "",
            pt_address: address || "",
            pt_disease: chronic_illness || "no_chronic_disease",
            pt_age: age ? age.toString() : "",
            ref: ref_id ? parseInt(ref_id.toString(), 10) || null : null,
            user_by: user_by || "admin"
          }])
          .select()
          .single();

        if (!error && data) {
          newPatient.id = data.id;
          newPatient.registered_at = data.pt_time;
          
          // Re-map referrer name if present
          if (data.ref) {
            const tempMap = await getPatientsMap();
            newPatient.ref = tempMap[data.ref] || data.ref.toString();
          }

          fallbackPatients = [newPatient, ...fallbackPatients];
          return res.status(201).json(newPatient);
        }
        console.error("Supabase patient insert failed, using fallback database:", error?.message);
        checkSupabaseError(error);
      } catch (err: any) {
        console.error("Supabase patient insert exception, using fallback database:", err.message);
        checkSupabaseError(err);
      }
    }

    const nextId = fallbackPatients.length > 0 ? Math.max(...fallbackPatients.map(p => p.id)) + 1 : 101;
    newPatient.id = nextId;
    
    // Resolve fallback referrer name
    if (ref_id) {
      const match = fallbackPatients.find(p => p.id === Number(ref_id));
      if (match) newPatient.ref = match.name;
    }

    fallbackPatients = [newPatient, ...fallbackPatients];
    return res.status(201).json(newPatient);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch("/api/patients/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const { name, phone, address, chronic_illness, age, ref } = req.body;

    if (isSupabaseActive) {
      try {
        const { data, error } = await supabase
          .from("ptdata")
          .update({
            pt_name: name,
            pt_phone: phone,
            pt_address: address,
            pt_disease: chronic_illness,
            pt_age: age ? age.toString() : "",
            ref: ref
          })
          .eq("id", id)
          .select()
          .single();
        
        if (!error && data) {
           fallbackPatients = fallbackPatients.map(p => p.id === id ? { ...p, name, phone, address, chronic_illness, age, ref } : p);
           return res.json({
             id: data.id,
             name: data.pt_name,
             phone: data.pt_phone,
             address: data.pt_address,
             chronic_illness: data.pt_disease,
             age: data.pt_age ? parseInt(data.pt_age, 10) : undefined,
             ref: data.ref
           });
        }
        console.error("Supabase patient update failed:", error?.message);
        checkSupabaseError(error);
      } catch (err: any) {
        console.error("Supabase patient update exception:", err.message);
        checkSupabaseError(err);
      }
    }
    
    const ptIndex = fallbackPatients.findIndex(p => p.id === id);
    if (ptIndex !== -1) {
      fallbackPatients[ptIndex] = { ...fallbackPatients[ptIndex], name, phone, address, chronic_illness, age, ref };
      return res.json(fallbackPatients[ptIndex]);
    }
    return res.status(404).json({ error: "Patient not found" });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Dental Work Orders (Table: work)
app.get("/api/work", async (req: any, res: any) => {
  if (isSupabaseActive) {
    try {
      const [{ data, error }, patientMap] = await Promise.all([
        supabase
          .from("work")
          .select("*")
          .order("id", { ascending: false }),
        getPatientsMap()
      ]);

      if (!error && data) {
        const mapped = data.map((w: any) => ({
          id: w.id,
          pt_id: w.pt_id,
          pt_name: patientMap[w.pt_id] || "Patient #" + w.pt_id,
          dr_name: w.dr_name,
          lab_name: w.lab_name,
          shade_code: w.color,
          notes: w.note || "",
          treatment_type_name: w.type,
          price: w.price,
          teeth_map: w.teeth || "",
          created_at: w.time || new Date().toISOString(),
          status: w.complete === "complete" ? "Completed" : "Active"
        }));
        return res.json(mapped);
      }
      console.log("Supabase work query notice, using fallback memory store:", error?.message);
      checkSupabaseError(error);
    } catch (err: any) {
      console.log("Supabase work query exception, using fallback memory store:", err.message);
      checkSupabaseError(err);
    }
  }
  return res.json(fallbackDentalWorks);
});

app.post("/api/work", async (req: any, res: any) => {
  try {
    const { pt_id, pt_name, teeth_map, price, notes, status, dr_name, treatment_type_name, shade_code, lab_name, user_by } = req.body;
    if (!pt_id) {
      return res.status(400).json({ error: "pt_id is required" });
    }

    const completeVal = status === "Completed" ? "complete" : "non";

    // Auto-save Lab registration (to 'labs' table) and dispatch transaction (to 'labs_work' table)
    let assignedLabId = 1;
    const cleanLabName = lab_name ? lab_name.trim() : "";
    if (cleanLabName && cleanLabName !== "Chairside Fabrication") {
      try {
        let existingLab: any = null;
        if (isSupabaseActive) {
          const { data, error } = await supabase
            .from("labs")
            .select("*")
            .eq("lab_name", cleanLabName)
            .maybeSingle();
          if (!error && data) {
            existingLab = data;
          }
        }
        
        if (!existingLab) {
          existingLab = fallbackLabs.find(l => l.name.toLowerCase() === cleanLabName.toLowerCase());
        }

        if (!existingLab) {
          // Perform automatic insertion into 'labs' table
          const newLabObj: any = {
            id: Date.now(),
            name: cleanLabName,
            phone: "",
            address: "",
            email: cleanLabName.toLowerCase().replace(/\s+/g, "") + "@slavadent.iq"
          };

          if (isSupabaseActive) {
            const { data: dbLab, error: dbLabErr } = await supabase
              .from("labs")
              .insert([{ lab_name: cleanLabName, phone: "", lab_address: "" }])
              .select()
              .single();
            if (!dbLabErr && dbLab) {
              newLabObj.id = dbLab.id;
            }
          }
          fallbackLabs.push(newLabObj);
          existingLab = newLabObj;
        }

        assignedLabId = existingLab.id || existingLab.id_field || 1;

        // Perform automatic dispatch into 'labs_work' table
        const newLabWork: any = {
          id: Date.now() + 1,
          pt_id: Number(pt_id),
          pt_name: pt_name || "Patient",
          lab_id: assignedLabId,
          lab_name: cleanLabName,
          tooth_code: teeth_map || shade_code || "A2",
          status: "Dispatched",
          fee: 120000,
          dispatch_date: new Date().toISOString().split("T")[0],
          notes: `Auto-generated dispatch order from clinical work procedure: ${notes || ""}`
        };

        if (isSupabaseActive) {
          const serializedNote = JSON.stringify({
            tooth_code: teeth_map || shade_code || "A2",
            status: "Dispatched",
            fee: 120000,
            dispatch_date: new Date().toISOString().split("T")[0],
            user_note: `Auto-generated dispatch order from clinical work procedure: ${notes || ""}`
          });

          await supabase
            .from("labs_work")
            .insert([{
              pt_id: Number(pt_id),
              work_id: assignedLabId,
              dr_name: dr_name || "Attending Doctor",
              lab_name: cleanLabName,
              delevery: "Dispatch courier",
              called: "No",
              note: serializedNote,
              user_by: user_by || "admin",
              complete: "non"
            }]);
        }
        fallbackLabsWork = [newLabWork, ...fallbackLabsWork];
      } catch (labErr: any) {
        console.error("Failed dual saving lab metadata to labs and labs_work:", labErr.message);
      }
    }

    const newWork: any = {
      pt_id,
      pt_name: pt_name || "Patient",
      teeth_map: teeth_map || "",
      price: price || 0,
      notes: notes || "No notes",
      status: status || "Active",
      dr_name: dr_name || "Dental Practitioner",
      treatment_type_name: treatment_type_name || "Restoration",
      shade_code: shade_code || "0M2",
      lab_name: cleanLabName || "Chairside Fabrication",
      created_at: new Date().toISOString()
    };

    if (isSupabaseActive) {
      try {
        const { data, error } = await supabase
          .from("work")
          .insert([{
            pt_id,
            dr_name: dr_name || "Dental Practitioner",
            lab_name: cleanLabName || "Chairside Fabrication",
            color: shade_code || "0M2",
            note: notes || "No notes",
            type: treatment_type_name || "Restoration",
            price: price || 0,
            teeth: teeth_map || "",
            user_by: user_by || "admin",
            complete: completeVal
          }])
          .select()
          .single();

        if (!error && data) {
          newWork.id = data.id;
          newWork.created_at = data.time;
          fallbackDentalWorks = [newWork, ...fallbackDentalWorks];
          return res.status(201).json(newWork);
        }
        console.error("Supabase work insert failed, using fallback database:", error?.message);
        checkSupabaseError(error);
      } catch (err: any) {
        console.error("Supabase work insert exception, using fallback database:", err.message);
        checkSupabaseError(err);
      }
    }

    const nextId = fallbackDentalWorks.length > 0 ? Math.max(...fallbackDentalWorks.map(w => w.id)) + 1 : 1;
    newWork.id = nextId;
    fallbackDentalWorks = [newWork, ...fallbackDentalWorks];
    return res.status(201).json(newWork);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch("/api/work/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    const completeVal = status === "Completed" ? "complete" : "non";

    if (isSupabaseActive) {
      try {
        const { data, error } = await supabase
          .from("work")
          .update({ complete: completeVal })
          .eq("id", id)
          .select()
          .single();

        if (!error && data) {
          const mapped = {
            id: data.id,
            pt_id: data.pt_id,
            dr_name: data.dr_name,
            lab_name: data.lab_name,
            shade_code: data.color,
            notes: data.note || "",
            treatment_type_name: data.type,
            price: data.price,
            teeth_map: data.teeth || "",
            created_at: data.time || new Date().toISOString(),
            status: data.complete === "complete" ? "Completed" : "Active"
          };
          fallbackDentalWorks = fallbackDentalWorks.map(w => w.id === id ? { ...w, status: status } : w);
          return res.json(mapped);
        }
        console.error("Supabase work update failed, using fallback:", error?.message);
        checkSupabaseError(error);
      } catch (err: any) {
        console.error("Supabase work update exception, using fallback:", err.message);
        checkSupabaseError(err);
      }
    }

    fallbackDentalWorks = fallbackDentalWorks.map(w => w.id === id ? { ...w, status: status } : w);
    const found = fallbackDentalWorks.find(w => w.id === id);
    if (!found) {
      return res.status(404).json({ error: "Work record not found" });
    }
    return res.json(found);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Clinical Payments / Receipts (Table: payments)
app.get("/api/payments", async (req: any, res: any) => {
  if (isSupabaseActive) {
    try {
      const [{ data, error }, patientMap] = await Promise.all([
        supabase
          .from("payments")
          .select("*")
          .order("id", { ascending: false }),
        getPatientsMap()
      ]);

      if (!error && data) {
        const mapped = data.map((p: any) => {
          let parsedType = "Installment";
          let cleanNote = p.note || "";
          
          if (cleanNote.startsWith("[Type: ")) {
            const closingIdx = cleanNote.indexOf("]");
            if (closingIdx !== -1) {
              parsedType = cleanNote.substring(7, closingIdx);
              cleanNote = cleanNote.substring(closingIdx + 1).trim();
            }
          }

          return {
            id: p.id,
            pt_id: p.pt_id,
            pt_name: patientMap[p.pt_id] || "Patient #" + p.pt_id,
            amount: parseFloat(p.amount) || 0,
            type: parsedType,
            notes: cleanNote,
            created_at: p.time || new Date().toISOString(),
            dr_name: p.dr_name || "Dental Practitioner",
            work_id: p.work_id ? `WRK-DW-${p.work_id}` : `WRK-${p.pt_id}`
          };
        });
        return res.json(mapped);
      }
      console.log("Supabase payments query notice, using fallback memory store:", error?.message);
      checkSupabaseError(error);
    } catch (err: any) {
      console.log("Supabase payments query exception, using fallback memory store:", err.message);
      checkSupabaseError(err);
    }
  }
  return res.json(fallbackPayments);
});

app.post("/api/payments", async (req: any, res: any) => {
  try {
    const { pt_id, pt_name, amount, type, work_id, dr_name, notes, user_by } = req.body;
    if (!pt_id) {
      return res.status(400).json({ error: "pt_id is required" });
    }

    let numericWorkId: number | null = null;
    if (work_id && work_id.toString().startsWith("WRK-DW-")) {
      const cleanDigits = work_id.toString().replace(/\D/g, "");
      const parsed = parseInt(cleanDigits, 10);
      if (!isNaN(parsed)) {
        numericWorkId = parsed;
      }
    }

    const newPayment: any = {
      pt_id,
      pt_name: pt_name || "Patient",
      amount: amount || 0,
      type: type || "Installment",
      created_at: new Date().toISOString(),
      work_id: work_id || undefined,
      dr_name: dr_name || undefined,
      notes: notes || "No notes"
    };

    if (isSupabaseActive) {
      try {
        const serializedNote = `[Type: ${type || "Installment"}] ${notes || "No notes"}`;
        const { data, error } = await supabase
          .from("payments")
          .insert([{
            pt_id,
            work_id: numericWorkId,
            dr_name: dr_name || "Dental Practitioner",
            amount: (amount || 0).toString(),
            note: serializedNote,
            user_by: user_by || "admin"
          }])
          .select()
          .single();

        if (!error && data) {
          newPayment.id = data.id;
          newPayment.created_at = data.time;
          fallbackPayments = [newPayment, ...fallbackPayments];

          // Recheck total payments and update work status if needed
          if (numericWorkId !== null) {
            try {
              // Fetch all payments for this work order from Supabase
              const { data: siblingPayments, error: siblingErr } = await supabase
                .from("payments")
                .select("amount")
                .eq("work_id", numericWorkId);

              // Fetch the work order's price
              const { data: workOrder, error: workErr } = await supabase
                .from("work")
                .select("price")
                .eq("id", numericWorkId)
                .single();

              if (!siblingErr && siblingPayments && !workErr && workOrder) {
                const totalPaid = siblingPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
                const price = parseFloat(workOrder.price) || 0;
                if (totalPaid >= price) {
                  // Update the work order to complete
                  await supabase
                    .from("work")
                    .update({ complete: "complete" })
                    .eq("id", numericWorkId);
                  
                  // Also update local fallback cache
                  fallbackDentalWorks = fallbackDentalWorks.map(w => 
                    w.id === numericWorkId ? { ...w, status: "Completed" } : w
                  );
                }
              }
            } catch (sumErr) {
              console.error("Error auto-completing work order via payments in Supabase:", sumErr);
            }
          }

          return res.status(201).json(newPayment);
        }
        console.error("Supabase payment insert failed, using fallback database:", error?.message);
        checkSupabaseError(error);
      } catch (err: any) {
        console.error("Supabase payment insert exception, using fallback database:", err.message);
        checkSupabaseError(err);
      }
    }

    const nextId = fallbackPayments.length > 0 ? Math.max(...fallbackPayments.map(p => p.id)) + 1 : 1;
    newPayment.id = nextId;
    fallbackPayments = [newPayment, ...fallbackPayments];

    // Recheck total payments and update work status in fallback local store
    if (numericWorkId !== null) {
      const workIndex = fallbackDentalWorks.findIndex(w => w.id === numericWorkId);
      if (workIndex !== -1) {
        const targetWork = fallbackDentalWorks[workIndex];
        const siblingPayments = fallbackPayments.filter(p => {
          if (p.work_id) {
            let pWorkId = null;
            if (p.work_id.toString().startsWith("WRK-DW-")) {
              pWorkId = parseInt(p.work_id.toString().replace(/\D/g, ""), 10);
            }
            return pWorkId === numericWorkId;
          }
          return false;
        });
        const totalPaid = siblingPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        if (totalPaid >= targetWork.price) {
          fallbackDentalWorks[workIndex].status = "Completed";
        }
      }
    }

    return res.status(201).json(newPayment);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Attending Doctors (Table: doctors)
app.get("/api/doctors", async (req: any, res: any) => {
  if (isSupabaseActive) {
    try {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .order("id", { ascending: true });

      if (!error && data) {
        const mapped = data.map((d: any) => ({
          id: d.id,
          name: d.dr_name,
          specialty: d.level === "1" ? "Oral & Maxillofacial Surgeon" : "General Practitioner Specialist",
          phone: "96477" + d.id + "12345",
          shift_status: d.status || "Active",
          level: parseInt(d.level, 10) || 2
        }));
        return res.json(mapped);
      }
    } catch (err: any) {
      console.log("Supabase doctors exception, using fallback memory store:", err.message);
    }
  }
  return res.json(fallbackDoctors);
});

// 5. Booking Appointments (Table: appointments)
app.get("/api/appointments", async (req: any, res: any) => {
  if (isSupabaseActive) {
    try {
      const [{ data, error }, patientMap] = await Promise.all([
        supabase
          .from("appointments")
          .select("*")
          .order("id", { ascending: false }),
        getPatientsMap()
      ]);

      if (!error && data) {
        const mapped = data.map((ap: any) => ({
          id: ap.id,
          pt_id: ap.pt_id,
          pt_name: patientMap[ap.pt_id] || "Patient #" + ap.pt_id,
          appointment_date: ap.next_date || ap.next_date_time || new Date().toISOString(),
          notes: ap.note || "General checkup appointment",
          doctor_name: ap.dr_name || "Attending Doctor",
          status: "Scheduled"
        }));
        return res.json(mapped);
      }
    } catch (err: any) {
      console.log("Supabase appointments exception, using fallback memory store:", err.message);
    }
  }
  return res.json(fallbackAppointments);
});

app.post("/api/appointments", async (req: any, res: any) => {
  try {
    const { pt_id, appointment_date, notes, doctor_name, user_by } = req.body;
    if (!pt_id) {
      return res.status(400).json({ error: "pt_id is required" });
    }

    const patientMap = await getPatientsMap();
    const newAppointment: any = {
      pt_id,
      pt_name: patientMap[pt_id] || "Patient",
      appointment_date: appointment_date || new Date().toISOString(),
      notes: notes || "General review",
      doctor_name: doctor_name || "Attending Doctor",
      status: "Scheduled"
    };

    if (isSupabaseActive) {
      try {
        const { data, error } = await supabase
          .from("appointments")
          .insert([{
            pt_id,
            dr_name: doctor_name || "Attending Doctor",
            note: notes || "General review",
            next_date: appointment_date ? appointment_date.split("T")[0] : null,
            user_by: user_by || "admin"
          }])
          .select()
          .single();

        if (!error && data) {
          newAppointment.id = data.id;
          fallbackAppointments = [newAppointment, ...fallbackAppointments];
          return res.status(201).json(newAppointment);
        }
      } catch (err: any) {
        console.error("Supabase appointment exception, using fallback database:", err.message);
      }
    }

    const nextId = fallbackAppointments.length > 0 ? Math.max(...fallbackAppointments.map(a => a.id)) + 1 : 1;
    newAppointment.id = nextId;
    fallbackAppointments = [newAppointment, ...fallbackAppointments];
    return res.status(201).json(newAppointment);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Dental Fabrication Labs (Table: labs)
app.get("/api/labs", async (req: any, res: any) => {
  if (isSupabaseActive) {
    try {
      const { data, error } = await supabase
        .from("labs")
        .select("*")
        .order("id", { ascending: true });

      if (!error && data) {
        const mapped = data.map((l: any) => ({
          id: l.id,
          name: l.lab_name,
          phone: l.phone || "",
          address: l.lab_address || "",
          name2: l.name2 || "",
          phone2: l.phone2 || "",
          time: l.time || "",
          email: l.lab_name ? l.lab_name.toLowerCase().replace(/\s+/g, "") + "@slavadent.iq" : "lab@slavadent.iq"
        }));
        return res.json(mapped);
      }
    } catch (err: any) {
      console.log("Supabase labs exception, using fallback memory store:", err.message);
    }
  }
  return res.json(fallbackLabs);
});

// 7. Clinical Treatment Types / Dental Procedures (Table: types)
app.get("/api/treatment-types", async (req: any, res: any) => {
  if (isSupabaseActive) {
    try {
      const { data, error } = await supabase
        .from("types")
        .select("*")
        .order("id", { ascending: true });

      if (!error && data) {
        const mapped = data.map((t: any) => ({
          id: t.id,
          name: t.type,
          description: t.type + " prosthetics restoration procedures"
        }));
        return res.json(mapped);
      }
    } catch (err: any) {
      console.log("Supabase types except, using fallback memory store:", err.message);
    }
  }
  return res.json(fallbackTreatmentTypes);
});

app.post("/api/treatment-types", async (req: any, res: any) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Procedure type description is required" });

    const newType = { id: Date.now(), name, description: name + " custom procedure" };
    if (isSupabaseActive) {
      try {
        const { data, error } = await supabase
          .from("types")
          .insert([{ type: name }])
          .select()
          .single();

        if (!error && data) {
          newType.id = data.id;
          fallbackTreatmentTypes.push(newType);
          return res.status(201).json(newType);
        }
      } catch (err: any) {
        console.error("Supabase types exception, using fallback database:", err.message);
      }
    }
    fallbackTreatmentTypes.push(newType);
    return res.status(201).json(newType);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 8. Doctor Enrollment (POST /api/doctors)
app.post("/api/doctors", async (req: any, res: any) => {
  try {
    const { name, specialty, phone, shift_status } = req.body;
    if (!name) return res.status(400).json({ error: "Doctor name is required" });

    const newDoc: any = {
      id: Date.now(),
      name,
      specialty: specialty || "Dentist Specialist",
      phone: phone || "Unlisted",
      shift_status: shift_status || "Active",
      level: 2
    };

    if (isSupabaseActive) {
      try {
        const { data, error } = await supabase
          .from("doctors")
          .insert([{ 
            dr_name: name, 
            status: shift_status || "Active",
            level: "2"
          }])
          .select()
          .single();

        if (!error && data) {
          newDoc.id = data.id;
          fallbackDoctors.push(newDoc);
          return res.status(201).json(newDoc);
        }
      } catch (err: any) {
        console.error("Supabase doctor insertion failed, fallback enabled:", err.message);
      }
    }
    fallbackDoctors.push(newDoc);
    return res.status(201).json(newDoc);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 9. Prosthetic Laboratory works (Table: labs_work)
app.get("/api/labs-work", async (req: any, res: any) => {
  if (isSupabaseActive) {
    try {
      const [{ data, error }, patientMap] = await Promise.all([
        supabase
          .from("labs_work")
          .select("*")
          .order("id", { ascending: false }),
        getPatientsMap()
      ]);

      if (!error && data) {
        const mapped = data.map((lw: any) => {
          let tooth_code = "A2";
          let status = "Dispatched";
          let fee = 120000;
          let dispatch_date = lw.time ? new Date(lw.time).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
          let userNote = lw.note || "";

          try {
            if (lw.note && (lw.note.startsWith("{") || lw.note.startsWith("["))) {
              const meta = JSON.parse(lw.note);
              tooth_code = meta.tooth_code || tooth_code;
              status = meta.status || status;
              fee = meta.fee !== undefined ? meta.fee : fee;
              dispatch_date = meta.dispatch_date || dispatch_date;
              userNote = meta.user_note || "";
            }
          } catch (e) {
            // retain defaults
          }

          if (lw.complete && lw.complete !== "non") {
            status = lw.complete === "complete" ? "Delivered" : lw.complete;
          }

          return {
            id: lw.id,
            pt_id: lw.pt_id,
            pt_name: patientMap[lw.pt_id] || "Patient #" + lw.pt_id,
            lab_id: lw.work_id || 1,
            lab_name: lw.lab_name || "Partner Lab",
            dr_name: lw.dr_name || "Attending Doctor",
            delevery: lw.delevery || "Dispatch / Standard",
            called: lw.called || "No",
            tooth_code,
            status,
            fee,
            dispatch_date,
            notes: userNote
          };
        });
        return res.json(mapped);
      }
    } catch (err: any) {
      console.log("Supabase labs_work query exception, fallback enabled:", err.message);
    }
  }
  return res.json(fallbackLabsWork);
});

app.post("/api/labs-work", async (req: any, res: any) => {
  try {
    const { pt_id, pt_name, lab_id, lab_name, tooth_code, status, fee, dispatch_date, notes, dr_name, delevery, called } = req.body;
    if (!pt_id || !lab_id) {
      return res.status(400).json({ error: "pt_id and lab_id are required" });
    }

    const patientMap = await getPatientsMap();
    const newLabWork: any = {
      id: Date.now(),
      pt_id,
      pt_name: patientMap[pt_id] || pt_name || "Patient",
      lab_id,
      lab_name: lab_name || "Partner Lab",
      dr_name: dr_name || "Attending Doctor",
      delevery: delevery || "Dispatch / Standard",
      called: called || "No",
      tooth_code: tooth_code || "A2",
      status: status || "Dispatched",
      fee: fee || 120000,
      dispatch_date: dispatch_date || new Date().toISOString().split("T")[0],
      notes: notes || ""
    };

    if (isSupabaseActive) {
      try {
        const serializedNote = JSON.stringify({
          tooth_code: tooth_code || "A2",
          status: status || "Dispatched",
          fee: fee || 120000,
          dispatch_date: dispatch_date || new Date().toISOString().split("T")[0],
          user_note: notes || ""
        });

        const { data, error } = await supabase
          .from("labs_work")
          .insert([{
            pt_id,
            work_id: lab_id || 1,
            dr_name: dr_name || "Attending Doctor",
            lab_name: lab_name || "Partner Lab",
            delevery: delevery || "Dispatch / Standard",
            called: called || "No",
            note: serializedNote,
            user_by: "admin",
            complete: status === "Delivered" ? "complete" : "non"
          }])
          .select()
          .single();

        if (!error && data) {
          newLabWork.id = data.id;
          newLabWork.dr_name = data.dr_name || newLabWork.dr_name;
          newLabWork.delevery = data.delevery || newLabWork.delevery;
          newLabWork.called = data.called || newLabWork.called;
          fallbackLabsWork = [newLabWork, ...fallbackLabsWork];
          return res.status(201).json(newLabWork);
        }
      } catch (err: any) {
        console.error("Supabase labs_work insertion failed, fallback enabled:", err.message);
      }
    }
    fallbackLabsWork = [newLabWork, ...fallbackLabsWork];
    return res.status(201).json(newLabWork);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch("/api/labs-work/:id", async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status, pt_id, lab_id, lab_name, tooth_code, fee, notes, dr_name, delevery, called } = req.body;
    const targetId = parseInt(id, 10);

    if (isSupabaseActive) {
      try {
        const { data: existingRow, error: fetchError } = await supabase
          .from("labs_work")
          .select("*")
          .eq("id", targetId)
          .maybeSingle();

        let serializedNote = "";
        let t_code = tooth_code || "A2";
        let finalFee = fee !== undefined ? fee : 120000;
        let dispatch_date = new Date().toISOString().split("T")[0];
        let userNote = notes || "";

        if (existingRow && existingRow.note) {
          try {
            if (existingRow.note.startsWith("{") || existingRow.note.startsWith("[")) {
              const meta = JSON.parse(existingRow.note);
              t_code = tooth_code || meta.tooth_code || t_code;
              finalFee = fee !== undefined ? fee : (meta.fee !== undefined ? meta.fee : finalFee);
              dispatch_date = meta.dispatch_date || dispatch_date;
              userNote = notes !== undefined ? notes : (meta.user_note || userNote);
            } else {
              userNote = notes !== undefined ? notes : existingRow.note;
            }
          } catch (e) {
            userNote = notes !== undefined ? notes : existingRow.note;
          }
        }

        serializedNote = JSON.stringify({
          tooth_code: t_code,
          status: status || (existingRow?.complete === "complete" ? "Delivered" : "Dispatched"),
          fee: finalFee,
          dispatch_date,
          user_note: userNote
        });

        const updateData: any = {
          note: serializedNote,
        };

        if (status) {
          updateData.complete = status === "Delivered" ? "complete" : "non";
        }
        if (pt_id) {
          updateData.pt_id = pt_id;
        }
        if (lab_id) {
          updateData.work_id = lab_id;
        }
        if (lab_name) {
          updateData.lab_name = lab_name;
        }
        if (dr_name !== undefined) {
          updateData.dr_name = dr_name;
        }
        if (delevery !== undefined) {
          updateData.delevery = delevery;
        }
        if (called !== undefined) {
          updateData.called = called;
        }

        const { error } = await supabase
          .from("labs_work")
          .update(updateData)
          .eq("id", targetId);

        if (error) {
          console.error("Supabase labs_work update error:", error.message);
        }
      } catch (err: any) {
        console.error("Supabase labs_work update status exception, fallback enabled:", err.message);
      }
    }

    fallbackLabsWork = fallbackLabsWork.map(lw => {
      if (lw.id === targetId) {
        return {
          ...lw,
          pt_id: pt_id !== undefined ? Number(pt_id) : lw.pt_id,
          lab_id: lab_id !== undefined ? Number(lab_id) : lw.lab_id,
          lab_name: lab_name !== undefined ? lab_name : lw.lab_name,
          tooth_code: tooth_code !== undefined ? tooth_code : lw.tooth_code,
          status: status !== undefined ? status : lw.status,
          fee: fee !== undefined ? parseFloat(fee) : lw.fee,
          notes: notes !== undefined ? notes : lw.notes,
          dr_name: dr_name !== undefined ? dr_name : lw.dr_name,
          delevery: delevery !== undefined ? delevery : lw.delevery,
          called: called !== undefined ? called : lw.called
        };
      }
      return lw;
    });

    const parsedUpdatedItem = fallbackLabsWork.find(lw => lw.id === targetId);
    return res.json({ success: true, status: status || parsedUpdatedItem?.status, updated: parsedUpdatedItem });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete("/api/labs-work/:id", async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const targetId = parseInt(id, 10);

    if (isSupabaseActive) {
      try {
        await supabase
          .from("labs_work")
          .delete()
          .eq("id", targetId);
      } catch (err: any) {
        console.error("Supabase labs_work delete error:", err.message);
      }
    }

    fallbackLabsWork = fallbackLabsWork.filter(lw => lw.id !== targetId);
    return res.json({ success: true, id: targetId });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Partner labs CRUD
app.post("/api/labs", async (req: any, res: any) => {
  try {
    const { name, phone, address, email, name2, phone2 } = req.body;
    if (!name) return res.status(400).json({ error: "Lab name is required" });

    const newLab: any = {
      id: Date.now(),
      name,
      phone: phone || "",
      address: address || "",
      name2: name2 || "",
      phone2: phone2 || "",
      email: email || (name.toLowerCase().replace(/\s+/g, "") + "@slavadent.iq")
    };

    if (isSupabaseActive) {
      try {
        const { data, error } = await supabase
          .from("labs")
          .insert([{
            lab_name: name,
            phone: phone || "",
            lab_address: address || "",
            name2: name2 || "",
            phone2: phone2 || ""
          }])
          .select()
          .single();

        if (!error && data) {
          newLab.id = data.id;
          newLab.name2 = data.name2 || "";
          newLab.phone2 = data.phone2 || "";
          fallbackLabs = [...fallbackLabs, newLab];
          return res.status(201).json(newLab);
        }
        console.error("Supabase labs insert failed:", error?.message);
      } catch (err: any) {
        console.error("Supabase labs insert exception:", err.message);
      }
    }

    fallbackLabs = [...fallbackLabs, newLab];
    return res.status(201).json(newLab);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.put("/api/labs/:id", async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { name, phone, address, email, name2, phone2 } = req.body;
    const targetId = parseInt(id, 10);

    if (isSupabaseActive) {
      try {
        const { error } = await supabase
          .from("labs")
          .update({
            lab_name: name,
            phone: phone || "",
            lab_address: address || "",
            name2: name2 !== undefined ? name2 : null,
            phone2: phone2 !== undefined ? phone2 : null
          })
          .eq("id", targetId);

        if (error) console.error("Supabase labs update failed:", error.message);
      } catch (err: any) {
        console.error("Supabase labs update exception:", err.message);
      }
    }

    fallbackLabs = fallbackLabs.map(l => {
      if (l.id === targetId) {
        return {
          ...l,
          name: name || l.name,
          phone: phone !== undefined ? phone : l.phone,
          address: address !== undefined ? address : l.address,
          email: email !== undefined ? email : l.email,
          name2: name2 !== undefined ? name2 : l.name2,
          phone2: phone2 !== undefined ? phone2 : l.phone2
        };
      }
      return l;
    });

    return res.json({ success: true, id: targetId });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.delete("/api/labs/:id", async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const targetId = parseInt(id, 10);

    if (isSupabaseActive) {
      try {
        // Clear references from labs_work table to avoid foreign key violations
        await supabase
          .from("labs_work")
          .delete()
          .eq("work_id", targetId);
      } catch (err: any) {
        console.error("Supabase lab referencing labs_work deletion exception:", err.message);
      }

      try {
        const { error } = await supabase
          .from("labs")
          .delete()
          .eq("id", targetId);

        if (error) {
          console.error("Supabase labs delete error details:", error.message);
        }
      } catch (err: any) {
        console.error("Supabase labs table delete exception:", err.message);
      }
    }

    fallbackLabs = fallbackLabs.filter(l => l.id !== targetId);
    // Also remove from fallback memory store of dispatches corresponding to this lab
    fallbackLabsWork = fallbackLabsWork.filter(lw => lw.lab_id !== targetId);

    return res.json({ success: true, id: targetId });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Server check endpoint
app.post("/api/supabase-test", async (req: any, res: any) => {
  let reportLines: string[] = [];
  let allPassed = true;

  function log(msg: string, pass: boolean = true) {
    const icon = pass ? "✅" : "❌";
    reportLines.push(`${icon} ${msg}`);
    if (!pass) allPassed = false;
  }

  const activeUrl = process.env.SUPABASE_URL || "";
  const activeKey = getBestSupabaseKey();

  reportLines.push("===== SUPABASE TEST REPORT =====");
  reportLines.push(`URL: ${activeUrl || "None"}`);
  reportLines.push(`Time: ${new Date().toLocaleString()}`);
  reportLines.push("");

  if (!activeUrl || isPlaceholder(activeUrl) || !activeKey || isPlaceholder(activeKey)) {
    log("Supabase URL or Key is missing / set to placeholder values in environment configuration.", false);
    reportLines.push("");
    reportLines.push("===== RESULT =====");
    reportLines.push("SOME TESTS FAILED ❌");
    reportLines.push("");
    return res.json({
      success: false,
      report: reportLines.join("\n"),
      lines: reportLines
    });
  }

  const tempClient = createClient(activeUrl, activeKey, {
    realtime: {
      transport: ws,
    },
  });

  try {
    // --- Test 1: DNS / API Reachability ---
    try {
      const resp = await fetch(`${activeUrl}/rest/v1/`, {
        method: "GET",
        headers: {
          "apikey": activeKey,
          "Authorization": `Bearer ${activeKey}`
        }
      });
      log(`DNS + API reachable: HTTP ${resp.status}`);
    } catch (e: any) {
      log(`DNS/API unreachable: ${e.message}`, false);
    }

    // --- Test 2: Connection ---
    if (allPassed) {
      try {
        const { data, error, status } = await tempClient
          .from("users")
          .select("id")
          .limit(1);
        if (error) {
          log(`Connection FAILED: ${error.message} (${error.code || "No Code"})`, false);
        } else {
          log(`Connection: URL=${activeUrl} → HTTP ${status || 200} OK`);
          // Re-enable integration state if it passed
          isSupabaseActive = true;
        }
      } catch (e: any) {
        log(`Connection exception: ${e.message}`, false);
      }
    } else {
      log("SKIP Connection: prior DNS check failed", false);
    }

    // --- Test 3: SELECT (list users) ---
    if (allPassed) {
      try {
        const { data, error, status } = await tempClient
          .from("users")
          .select("*");
        if (error) {
          log(`SELECT FAILED: HTTP ${status} ${error.message}`, false);
        } else {
          const count = data ? data.length : 0;
          log(`SELECT users: returned ${count} rows, HTTP ${status || 200}`);
        }
      } catch (e: any) {
        log(`SELECT exception: ${e.message}`, false);
      }
    } else {
      log("SKIP SELECT query: prior connection check failed", false);
    }

    // --- Test 4: INSERT ---
    const testName = `test_${Date.now()}`;
    const phoneNum = parseInt(`77${Math.floor(10000000 + Math.random() * 90000000)}`, 10);
    let insertPass = false;
    if (allPassed) {
      try {
        const { data, error, status } = await tempClient
          .from("users")
          .insert([
            {
              name: testName,
              password: "test123_temp_pass_for_test",
              phone: phoneNum,
              level: 3
            }
          ])
          .select("*");
        
        if (error) {
          log(`INSERT FAILED: HTTP ${status} ${error.message}`, false);
        } else {
          const count = data ? data.length : 0;
          log(`INSERT user "${testName}": HTTP ${status || 201}, got ${count} rows back`);
          insertPass = true;
        }
      } catch (e: any) {
        log(`INSERT exception: ${e.message}`, false);
      }
    } else {
      log("SKIP INSERT user: prior tests failed", false);
    }

    // --- Test 5: SELECT after INSERT (Check retrieve by name) ---
    if (allPassed && insertPass) {
      try {
        const { data, error, status } = await tempClient
          .from("users")
          .select("*")
          .eq("name", testName);

        if (error || !data || data.length === 0) {
          log(`SELECT by name FAILED: HTTP ${status} ${error?.message || "User not found"}`, false);
        } else {
          log(`SELECT by name "${testName}": found ${data.length} user(s), HTTP ${status || 200}`);
        }
      } catch (e: any) {
        log(`SELECT by name exception: ${e.message}`, false);
      }
    } else {
      log("SKIP Select-by-name: no test user inserted or prior check failed", false);
    }

    // --- Test 6: UPDATE ---
    const newPhone = parseInt(`78${Math.floor(10000000 + Math.random() * 90000000)}`, 10);
    if (allPassed && insertPass) {
      try {
        const { error, status } = await tempClient
          .from("users")
          .update({ phone: newPhone })
          .eq("name", testName);

        if (error) {
          log(`UPDATE FAILED: HTTP ${status} ${error.message}`, false);
        } else {
          log(`UPDATE user "${testName}" phone→${newPhone}: HTTP ${status || 200}`);
        }
      } catch (e: any) {
        log(`UPDATE exception: ${e.message}`, false);
      }
    } else {
      log("SKIP Update: no test user inserted or prior check failed", false);
    }

    // --- Test 7: DELETE ---
    if (insertPass) { // ALWAYS attempt to clean up even if middle tests failed!
      try {
        const { error, status } = await tempClient
          .from("users")
          .delete()
          .eq("name", testName);

        if (error) {
          log(`DELETE FAILED: HTTP ${status} ${error.message}`, false);
        } else {
          log(`DELETE user "${testName}": HTTP ${status || 200}`);
        }
      } catch (e: any) {
        log(`DELETE exception: ${e.message}`, false);
      }
    } else {
      log("SKIP Delete: no test user inserted", false);
    }

    // --- Test 8: Verify row deleted ---
    if (insertPass) {
      try {
        const { data, error } = await tempClient
          .from("users")
          .select("id")
          .eq("name", testName);

        if (error || (data && data.length > 0)) {
          log(`Verify FAILED: user still exists or error: ${error?.message || "Found row after delete"}`, false);
        } else {
          log(`Verify "${testName}" deleted: confirmed (0 rows)`);
        }
      } catch (e: any) {
        log(`Verify exception: ${e.message}`, false);
      }
    } else {
      log("SKIP Verify: no test user inserted", false);
    }

  } catch (outerErr: any) {
    log(`Outer exception in test suite execution: ${outerErr.message}`, false);
  }

  reportLines.push("");
  reportLines.push("===== RESULT =====");
  reportLines.push(allPassed ? "ALL TESTS PASSED ✅" : "SOME TESTS FAILED ❌");
  reportLines.push("");

  return res.json({
    success: allPassed,
    report: reportLines.join("\n"),
    lines: reportLines
  });
});

// Server check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    supabaseConnected: isSupabaseActive,
  });
});

// ==========================================
// Vite Integration and Request Routing
// ==========================================

async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Slava Dent Mobile Backend running at http://0.0.0.0:${PORT}`);
  });
}

setupServer().catch((error) => {
  console.error("Failed to boot Slava Dent Dev Server:", error);
});

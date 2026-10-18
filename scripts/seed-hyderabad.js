/**
 * scripts/seed-hyderabad.js
 *
 * Seeds real-world Hyderabad, Pakistan municipal departments and the
 * pre-configured officer account into Supabase.
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local manually
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey);

const HYDERABAD_DEPARTMENTS = [
  {
    name: "Hyderabad Municipal Corporation (HMC)",
    slug: "hmc-hyderabad",
    description: "Solid waste management, municipal sanitation, streetlights, local public parks, and neighborhood infrastructure.",
    is_active: true,
  },
  {
    name: "Hyderabad Water & Sewerage Corporation (HWASA)",
    slug: "hwasa-hyderabad",
    description: "Potable water supply networks, main pipelines, sewer overflow containment, and blocked drainage clearing.",
    is_active: true,
  },
  {
    name: "Hyderabad Electric Supply Company (HESCO)",
    slug: "hesco-hyderabad",
    description: "Grid electricity distribution, pole transformers, exposed live high-voltage wiring, and power safety hazards.",
    is_active: true,
  },
  {
    name: "Provincial Works & Services Department",
    slug: "works-services-sindh",
    description: "Provincial highways, main arterial boulevards, major flyovers, bridges, and primary civic transport corridors.",
    is_active: true,
  },
  {
    name: "Town Municipal Corporation (Latifabad/Qasimabad)",
    slug: "tmc-zonal",
    description: "Zonal sweeping, neighborhood drain desilting, local encroachment monitoring, and union committee civic works.",
    is_active: true,
  },
];

async function seed() {
  console.log("=== SEEDING REAL-WORLD HYDERABAD MUNICIPAL DEPARTMENTS ===");

  const seededDepts = [];
  for (const dept of HYDERABAD_DEPARTMENTS) {
    const { data, error } = await admin
      .from("departments")
      .upsert(dept, { onConflict: "slug" })
      .select()
      .single();

    if (error) {
      console.error(`Failed to upsert department ${dept.name}:`, error.message);
    } else {
      console.log(`✓ Department: ${data.name} (${data.slug}) -> ID: ${data.id}`);
      seededDepts.push(data);
    }
  }

  console.log("\n=== SEEDING OFFICIAL HYDERABAD OFFICER CREDENTIALS ===");
  const officerEmail = "officer.hyderabad@civicpulse.test";
  const officerPassword = "Officer@12345";
  const officerName = "Hyderabad Zonal Operations Officer";

  // Check or create auth user
  let officerId = null;
  const { data: userList } = await admin.auth.admin.listUsers();
  const existingUser = userList?.users?.find(
    (u) => u.email?.toLowerCase() === officerEmail.toLowerCase()
  );

  if (existingUser) {
    officerId = existingUser.id;
    console.log(`Officer auth user already exists: ${officerId}`);
    // Update password to ensure it matches requirement
    await admin.auth.admin.updateUserById(officerId, {
      password: officerPassword,
      user_metadata: {
        display_name: officerName,
        full_name: officerName,
        role: "officer",
      },
    });
  } else {
    const { data: newAuth, error: createErr } = await admin.auth.admin.createUser({
      email: officerEmail,
      password: officerPassword,
      email_confirm: true,
      user_metadata: {
        display_name: officerName,
        full_name: officerName,
        role: "officer",
      },
    });

    if (createErr) {
      console.error("Failed to create officer auth user:", createErr.message);
    } else {
      officerId = newAuth.user.id;
      console.log(`✓ Created new officer auth user: ${officerId}`);
    }
  }

  if (officerId) {
    // Upsert Profile
    const { error: profileErr } = await admin.from("profiles").upsert({
      id: officerId,
      display_name: officerName,
      role: "officer",
      phone: "+92-22-9200000",
      updated_at: new Date().toISOString(),
    });

    if (profileErr) {
      console.error("Profile upsert error:", profileErr.message);
    } else {
      console.log("✓ Profile upserted with role = 'officer'");
    }

    // Assign to all Hyderabad departments
    for (const d of seededDepts) {
      await admin.from("department_members").upsert(
        {
          department_id: d.id,
          user_id: officerId,
          membership_role: "officer",
          is_active: true,
        },
        { onConflict: "department_id,user_id" }
      );
    }
    console.log(`✓ Officer assigned to all ${seededDepts.length} Hyderabad departments.`);
  }

  console.log("\nHyderabad Municipal Integration Seeding Complete!");
}

seed().catch((err) => {
  console.error("Seed execution failed:", err);
  process.exit(1);
});

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const vocationalSkills = [
  { name: "Electrical Wiring & Conduit Installation", category: "Electrical", slug: "electrical-wiring-conduit", isVerified: true },
  { name: "Circuit Breaker Panel Upgrades", category: "Electrical", slug: "circuit-breaker-panel-upgrades", isVerified: true },
  { name: "Backup Generator Servicing", category: "Electrical", slug: "backup-generator-servicing", isVerified: true },
  { name: "Solar PV Inverter Installation", category: "Electrical", slug: "solar-pv-inverter-installation", isVerified: true },
  { name: "Pipe Fitting & Leak Repair", category: "Plumbing", slug: "pipe-fitting-leak-repair", isVerified: true },
  { name: "Water Heater Installation & Repair", category: "Plumbing", slug: "water-heater-installation-repair", isVerified: true },
  { name: "Drain Snaking & Hydro-Jetting", category: "Plumbing", slug: "drain-snaking-hydro-jetting", isVerified: true },
  { name: "HVAC Refrigerant Leak Diagnostics", category: "HVAC", slug: "hvac-refrigerant-leak-diagnostics", isVerified: true },
  { name: "Split-Unit AC Servicing", category: "HVAC", slug: "split-unit-ac-servicing", isVerified: true },
  { name: "Ductwork Fabrication & Balancing", category: "HVAC", slug: "ductwork-fabrication-balancing", isVerified: true },
  { name: "Custom Cabinetry & Joinery", category: "Carpentry", slug: "custom-cabinetry-joinery", isVerified: true },
  { name: "Roof Truss Construction", category: "Carpentry", slug: "roof-truss-construction", isVerified: true },
  { name: "Drywall Hanging & Taping", category: "Carpentry", slug: "drywall-hanging-taping", isVerified: true },
  { name: "TIG & MIG Structural Welding", category: "Welding", slug: "tig-mig-structural-welding", isVerified: true },
  { name: "Wrought Iron Gate Fabrication", category: "Welding", slug: "wrought-iron-gate-fabrication", isVerified: true },
  { name: "Porcelain & Ceramic Tile Setting", category: "Finishing", slug: "porcelain-ceramic-tile-setting", isVerified: true },
  { name: "Epoxy Flooring Application", category: "Finishing", slug: "epoxy-flooring-application", isVerified: true },
  { name: "Airless Spray Painting", category: "Finishing", slug: "airless-spray-painting", isVerified: true },
  { name: "Brick & Block Masonry", category: "Masonry", slug: "brick-block-masonry", isVerified: true },
  { name: "CCTV & Security System Wiring", category: "Security", slug: "cctv-security-system-wiring", isVerified: true }
];

async function main() {
  console.log("Seeding vocational skills taxonomy...");
  for (const s of vocationalSkills) {
    await prisma.skill.upsert({
      where: { slug: s.slug },
      update: { name: s.name, category: s.category, isVerified: s.isVerified },
      create: s
    });
  }

  // Seed sample hashtags
  const hashtags = ["skilledtrades", "electricians", "plumbinglife", "hvacservice", "weldingart", "craftsmanship", "vocationaltraining"];
  for (const tag of hashtags) {
    await prisma.hashtag.upsert({
      where: { tag },
      update: {},
      create: { tag, postCount: Math.floor(Math.random() * 20) + 5 }
    });
  }

  console.log("Successfully seeded LinkedIn parity taxonomy fixtures!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

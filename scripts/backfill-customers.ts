import "dotenv/config";
import { backfillCustomersFromAppointments } from "../src/lib/customers";
import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.setting.upsert({
    where: { key: "slotInterval" },
    update: { value: "5" },
    create: { key: "slotInterval", value: "5" },
  });

  const result = await backfillCustomersFromAppointments();
  console.log(`Backfill complete: ${result.linked} appointments linked`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit();
  });

import "dotenv/config";
import { backfillCustomersFromAppointments } from "../src/lib/customers";
import { prisma } from "../src/lib/prisma";

async function main() {
  const result = await backfillCustomersFromAppointments();
  console.log(`Backfill complete: ${result.linked} appointments linked`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit();
  });

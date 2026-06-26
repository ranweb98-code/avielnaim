import dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import {
  isEnglishName,
  pickPreferredName,
  transliterateNameToHebrew,
} from "../src/lib/name-transliteration";
import { normalizePhone, storeFullName } from "../src/lib/customers";
import { prisma } from "../src/lib/prisma";

type RawRow = {
  fullName: string;
  phone: string;
};

function normalizeIsraeliPhone(phone: string | number): string {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("972")) {
    return `0${digits.slice(3)}`;
  }
  if (digits.startsWith("0")) return digits;
  if (digits.length === 9) return `0${digits}`;
  return digits;
}

function readXlsxRows(filePath: string): RawRow[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet);

  return rows
    .map((row) => {
      const fullName = String(
        row["שם לקוח"] ?? row["fullName"] ?? row["name"] ?? ""
      ).trim();
      const phone = normalizeIsraeliPhone(
        row["מספר טלפון"] ?? row["phone"] ?? row["tel"] ?? ""
      );
      return { fullName, phone };
    })
    .filter((row) => row.fullName && row.phone.length >= 9);
}

function dedupeRows(rows: RawRow[]): RawRow[] {
  const byPhone = new Map<string, RawRow>();

  for (const row of rows) {
    const phone = normalizeIsraeliPhone(row.phone);
    const fullName = isEnglishName(row.fullName)
      ? transliterateNameToHebrew(row.fullName)
      : row.fullName.trim();

    const existing = byPhone.get(phone);
    if (!existing) {
      byPhone.set(phone, { fullName, phone });
      continue;
    }

    byPhone.set(phone, {
      fullName: pickPreferredName(existing.fullName, fullName),
      phone,
    });
  }

  return [...byPhone.values()];
}

async function main() {
  const fileArg = process.argv[2];
  const filePath = fileArg
    ? path.resolve(fileArg)
    : path.resolve("c:/Users/ranga/Downloads/customers_list.xlsx");

  const rawRows = readXlsxRows(filePath);
  const rows = dedupeRows(rawRows);

  console.log(`Read ${rawRows.length} rows, ${rows.length} unique customers`);

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const fullName = transliterateNameToHebrew(row.fullName);
    const { firstName, lastName } = storeFullName(fullName);
    const phone = row.phone.trim();
    const normalized = normalizePhone(phone);

    const existing = await prisma.customer.findFirst({
      where: {
        OR: [{ phone }, { phone: normalized }],
      },
    });

    if (existing) {
      await prisma.customer.update({
        where: { id: existing.id },
        data: { firstName, lastName, phone },
      });
      updated++;
      continue;
    }

    await prisma.customer.create({
      data: {
        firstName,
        lastName,
        phone,
        email: "",
      },
    });
    imported++;
  }

  console.log(`Import complete: ${imported} new, ${updated} updated, ${skipped} skipped`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// prisma/seed.ts

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json" with { type: "json" };

const prisma = new PrismaClient();

countries.registerLocale(en as any);
const names = countries.getNames("en") as Record<string, string>;
const data = Object.entries(names)
  .map(([code, name]) => ({ code, name }))
  .filter(({ code }) => /^[A-Z]{2}$/.test(code));

await prisma.country.createMany({ data, skipDuplicates: true });
await prisma.$disconnect();

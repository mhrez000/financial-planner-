/**
 * Guards against drift between the SQLite dev schema and the Postgres
 * production schema: they must be identical apart from the datasource
 * provider line and the Postgres file's variant header. Run in CI.
 */
import { readFileSync } from "node:fs";

const strip = (text, { dropHeader }) => {
  let lines = text.split("\n");
  if (dropHeader) {
    // Drop the variant-note header (everything before the first blank-comment break)
    const start = lines.findIndex((l) => l.startsWith("// Sage data model."));
    lines = lines.slice(start);
  }
  return lines
    .map((l) => l.trim())
    .filter((l) => l !== "" && !l.startsWith('provider = "'))
    .join("\n");
};

const sqlite = strip(readFileSync("prisma/schema.prisma", "utf8"), { dropHeader: false });
const postgres = strip(readFileSync("prisma/schema.postgres.prisma", "utf8"), { dropHeader: true });

if (sqlite !== postgres) {
  console.error(
    "prisma/schema.prisma and prisma/schema.postgres.prisma have drifted.\n" +
      "Apply your model change to both files (only the datasource provider may differ),\n" +
      "then regenerate the Postgres migration: npm run db:migration:postgres",
  );
  process.exit(1);
}
console.log("Schemas in sync ✔");

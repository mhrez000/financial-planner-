import { execSync } from "node:child_process";

/** Reset + reseed the database before the suite (runs before the web server). */
export default function globalSetup() {
  execSync("npm run db:reset", { stdio: "inherit" });
}

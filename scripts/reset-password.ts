import { createInterface } from "node:readline";
import { listAdmins, passwordProblem, setAdminPassword } from "../src/lib/auth.ts";

/**
 * Bagong password para sa admin na nakalimutan ang dati:
 *   npm run reset-password
 * Hindi lumalabas sa screen ang tina-type na password.
 * Kapag may TURSO_DATABASE_URL sa .env.local, ang account sa Turso ang
 * napapalitan (iyon ang ginagamit ng dashboard sa Vercel); kung wala, ang
 * lokal na data/admin.sqlite.
 */

function ask(question: string, { hidden = false } = {}): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      /* Hindi ipinapakita ang tina-type — ang tanong lang. */
      (rl as unknown as { _writeToOutput: (text: string) => void })._writeToOutput = (text) => {
        if (text.startsWith(question)) process.stdout.write(question);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const admins = await listAdmins();
if (!admins.length) {
  console.log("\n  Wala pang admin. Patakbuhin ang `npm run dev` at gumawa sa browser.\n");
  process.exit(0);
}

console.log("\n  Mga admin:");
for (const a of admins) console.log(`    • ${a.username}  (${a.name})`);
console.log("");

const username = admins.length === 1 ? admins[0].username : (await ask("  Username: ")).trim().toLowerCase();
if (admins.length === 1) console.log(`  Username: ${username}`);

const password = await ask("  Bagong password: ", { hidden: true });
const problem = passwordProblem(password);
if (problem) {
  console.log(`\n  ${problem} Walang binago.\n`);
  process.exit(1);
}
if ((await ask("  Ulitin ang password: ", { hidden: true })) !== password) {
  console.log("\n  Hindi magkapareho. Walang binago.\n");
  process.exit(1);
}

if (!(await setAdminPassword(username, password))) {
  console.log(`\n  Walang admin na "${username}". Walang binago.\n`);
  process.exit(1);
}
console.log(`\n  Napalitan na ang password ni ${username}. Mag-login ulit sa dashboard.\n`);
/* Isinasara ang koneksyon sa Turso para makalabas agad. */
process.exit(0);

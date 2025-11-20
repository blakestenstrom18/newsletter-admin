import { config } from 'dotenv';
import readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { exit } from 'node:process';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as schema from '../src/db/schema';
import {
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  isPasswordStrong,
  sanitizeRole,
} from '../src/lib/auth/validation';

config({ path: '.env.local' });
config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set. Please configure it in your environment.');
  process.exit(1);
}

const rl = readline.createInterface({ input, output });

function ask(question: string, { hidden = false } = {}): Promise<string> {
  if (!hidden) {
    return new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));
  }

  return new Promise((resolve) => {
    const onData = (char: Buffer) => {
      const value = char.toString();
      if (value === '\n' || value === '\r' || value === '\u0004') {
        output.write('\n');
        input.off('data', onData);
      } else if (value === '\u0003') {
        input.off('data', onData);
        rl.close();
        exit(0);
      } else {
        output.write('*');
      }
    };

    input.on('data', onData);
    rl.question(question, (answer) => {
      input.off('data', onData);
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('Create or update a user account\n');

  const emailFromEnv = process.env.NEW_USER_EMAIL;
  const passwordFromEnv = process.env.NEW_USER_PASSWORD;
  const roleFromEnv = process.env.NEW_USER_ROLE;

  const emailInput =
    emailFromEnv ??
    (await ask('Email: '));

  const email = normalizeEmail(emailInput);

  if (!email || !email.includes('@')) {
    throw new Error('A valid email address is required.');
  }

  const username = await ask('Display name (optional): ');

  const passwordInput =
    passwordFromEnv ??
    (await ask('Password (input hidden): ', { hidden: true }));

  if (!isPasswordStrong(passwordInput)) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }

  const password = passwordInput;

  const role = sanitizeRole(
    roleFromEnv ??
    (await ask('Role (admin/user) [user]: '))
  );

  const isActiveInput = await ask('Active user? (Y/n): ');
  const isActive = isActiveInput.trim().toLowerCase() !== 'n';

  const rounds = Number(process.env.AUTH_BCRYPT_ROUNDS ?? 10);
  const passwordHash = await bcrypt.hash(password, rounds);

  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  const existing = await db.query.userAccount.findFirst({
    where: eq(schema.userAccount.email, email),
  });

  if (existing) {
    await db
      .update(schema.userAccount)
      .set({
        username: username || existing.username,
        passwordHash,
        role,
        isActive,
        failedLoginAttempts: 0,
        lockedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.userAccount.id, existing.id));

    console.log(`Updated password and settings for ${email}.`);
  } else {
    await db.insert(schema.userAccount).values({
      email,
      username: username || null,
      passwordHash,
      role,
      isActive,
    });

    console.log(`Created ${role} account for ${email}.`);
  }
}

main()
  .catch((error) => {
    console.error('Failed to create or update user:', error);
    process.exitCode = 1;
  })
  .finally(() => rl.close());


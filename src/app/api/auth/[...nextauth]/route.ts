import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { NextAuthOptions } from 'next-auth';
import { compare } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { userAccount } from '@/db/schema';
import { env } from '@/lib/env';
import { normalizeEmail } from '@/lib/auth/validation';

type UserAccount = typeof userAccount.$inferSelect;

const MAX_FAILED_ATTEMPTS = env.AUTH_MAX_FAILED_ATTEMPTS;

async function findUserByEmail(email: string) {
  return db.query.userAccount.findFirst({
    where: eq(userAccount.email, email),
  });
}

async function incrementFailedAttempts(user: UserAccount) {
  const nextAttempts = user.failedLoginAttempts + 1;
  const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS;

  await db
    .update(userAccount)
    .set({
      failedLoginAttempts: nextAttempts,
      lockedAt: shouldLock ? new Date() : user.lockedAt,
      updatedAt: new Date(),
    })
    .where(eq(userAccount.id, user.id));
}

async function resetFailedAttempts(user: UserAccount) {
  if (user.failedLoginAttempts === 0 && !user.lockedAt) {
    return;
  }

  await db
    .update(userAccount)
    .set({
      failedLoginAttempts: 0,
      lockedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(userAccount.id, user.id));
}

function buildProfile(user: UserAccount) {
  return {
    id: user.id,
    email: user.email,
    name: user.username ?? user.email.split('@')[0],
    role: user.role,
  };
}

function isUserRole(value: unknown): value is UserAccount['role'] {
  return value === 'admin' || value === 'user';
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Email & Password',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'your@email.com',
        },
        password: {
          label: 'Password',
          type: 'password',
          placeholder: '••••••••',
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required.');
        }

        const email = normalizeEmail(credentials.email);
        const user = await findUserByEmail(email);

        if (!user) {
          throw new Error('Invalid email or password.');
        }

        if (!user.isActive) {
          throw new Error('Your account has been disabled. Contact an admin.');
        }

        if (user.lockedAt) {
          throw new Error('Your account is locked. Contact an admin to unlock.');
        }

        const passwordIsValid = await compare(
          credentials.password,
          user.passwordHash,
        );

        if (!passwordIsValid) {
          await incrementFailedAttempts(user);
          throw new Error('Invalid email or password.');
        }

        await resetFailedAttempts(user);
        return buildProfile(user);
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        if (token.email) {
          session.user.email = token.email as string;
        }
        if (isUserRole(token.role)) {
          session.user.role = token.role;
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email.toLowerCase();
      }
      if (
        user &&
        'role' in user &&
        isUserRole((user as { role?: unknown }).role)
      ) {
        token.role = (user as { role?: UserAccount['role'] }).role;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET!,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };


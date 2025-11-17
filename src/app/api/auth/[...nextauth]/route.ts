import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { NextAuthOptions } from 'next-auth';
import { parseAllowlist } from '@/lib/utils';

const { emails, domain } = parseAllowlist();

// Validate that at least one authentication method is configured
if (!emails.length && !domain) {
  console.warn(
    'WARNING: Neither ALLOWED_EMAILS nor ALLOWED_DOMAIN is set. ' +
    'Authentication will fail for all users. Please set at least one.'
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'your@email.com' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        const email = credentials.email.toLowerCase().trim();
        
        // Check if email is in allowlist
        if (emails.length && emails.includes(email)) {
          return {
            id: email,
            email: email,
            name: email.split('@')[0],
          };
        }

        // Check if email domain matches allowed domain
        if (domain && email.endsWith(`@${domain}`)) {
          return {
            id: email,
            email: email,
            name: email.split('@')[0],
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email.toLowerCase();
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


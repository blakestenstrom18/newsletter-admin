import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { NextAuthOptions } from 'next-auth';
import { parseAllowlist } from '@/lib/utils';

const { emails, domain } = parseAllowlist();

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = (user?.email || '').toLowerCase();
      if (!email) return false;

      if (emails.length && emails.includes(email)) return true;
      if (domain && email.endsWith(`@${domain}`)) return true;
      return false;
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email as string;
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      if (profile?.email) token.email = (profile.email as string).toLowerCase();
      return token;
    },
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET!,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };


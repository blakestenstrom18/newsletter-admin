import { DefaultSession } from 'next-auth';

type UserRole = 'admin' | 'user';

declare module 'next-auth' {
  interface User {
    role?: UserRole;
  }

  interface Session {
    user: DefaultSession['user'] & {
      role?: UserRole;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: UserRole;
  }
}


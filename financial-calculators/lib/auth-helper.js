import { getServerSession } from 'next-auth/next';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { userOps } from './db-operations.js';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = userOps.getByEmail(credentials.email);
          
          if (!user || !bcrypt.compareSync(credentials.password, user.password_hash)) {
            return null;
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async session({ token, session }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token }) {
      return token;
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getAuthenticatedUser() {
  try {
    const session = await getServerSession(authOptions);
    return session?.user || null;
  } catch (error) {
    console.error('Auth session error:', error);
    return null;
  }
}
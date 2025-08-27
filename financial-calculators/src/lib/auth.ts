import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getUserByEmail, createUser } from '@/lib/database';

// Dynamic NEXTAUTH_URL configuration
// In development, NextAuth can auto-detect the URL, but we can also provide fallbacks
// This ensures compatibility across different port configurations

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        action: { label: 'Action', type: 'hidden' } // 'signin' or 'signup'
      },
      async authorize(credentials) {
        try {
          console.log('Auth attempt with credentials:', { email: credentials?.email, action: credentials?.action });
          
          if (!credentials?.email || !credentials?.password) {
            console.log('Missing email or password');
            return null;
          }

          const { email, password, action } = credentials;

          if (action === 'signup') {
            // Check if user already exists
            const existingUser = getUserByEmail(email);
            if (existingUser) {
              console.log('User already exists:', email);
              throw new Error('User already exists');
            }

            // Create new user
            const hashedPassword = await bcrypt.hash(password, 12);
            const user = createUser({
              email,
              hashedPassword,
              name: email.split('@')[0] // Use email prefix as default name
            });

            console.log('User created successfully:', user.email);
            return {
              id: user.id.toString(),
              email: user.email,
              name: user.name
            };
          } else {
            // Sign in
            const user = getUserByEmail(email);
            if (!user) {
              console.log('User not found:', email);
              return null;
            }

            const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
            if (!isValidPassword) {
              console.log('Invalid password for user:', email);
              return null;
            }

            console.log('User authenticated successfully:', user.email);
            return {
              id: user.id.toString(),
              email: user.email,
              name: user.name
            };
          }
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
      }
      return session;
    }
  }
};
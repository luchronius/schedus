import NavigationHeader from '@/components/NavigationHeader';
import SignInForm from '@/components/auth/SignInForm';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      <main className="py-12">
        <SignInForm />
      </main>
    </div>
  );
}

export const metadata = {
  title: 'Sign In | Financial Calculators',
  description: 'Sign in to your account to save and manage your financial data.',
};
import NavigationHeader from '@/components/NavigationHeader';
import RegisterForm from '@/components/auth/RegisterForm';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      <main className="py-12">
        <RegisterForm />
      </main>
    </div>
  );
}

export const metadata = {
  title: 'Create Account | Financial Calculators',
  description: 'Create an account to save and manage your financial data across all calculators.',
};
export default function Header() {
  return (
    <header className="bg-primary-dark text-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-bold">Financial Calculators</div>
            <nav className="hidden md:flex space-x-6">
              <a href="#" className="hover:text-primary-green transition-colors">RESP Calculator</a>
              <a href="#" className="hover:text-primary-green transition-colors">Loan Calculator</a>
              <a href="#" className="hover:text-primary-green transition-colors">Investment Tools</a>
              <a href="#" className="hover:text-primary-green transition-colors">Planning</a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <button className="bg-primary-green text-white px-4 py-2 rounded hover:bg-green-600 transition-colors">
              Get Started
            </button>
            <button className="text-white hover:text-primary-green transition-colors">
              About
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
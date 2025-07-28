export default function Header() {
  return (
    <header className="bg-td-dark-blue text-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-bold">TD</div>
            <nav className="hidden md:flex space-x-6">
              <a href="#" className="hover:text-td-green transition-colors">Personal Banking</a>
              <a href="#" className="hover:text-td-green transition-colors">Investing</a>
              <a href="#" className="hover:text-td-green transition-colors">Insurance</a>
              <a href="#" className="hover:text-td-green transition-colors">Business</a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <button className="bg-td-green text-white px-4 py-2 rounded hover:bg-green-600 transition-colors">
              Book an Appointment
            </button>
            <button className="text-white hover:text-td-green transition-colors">
              Sign In
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
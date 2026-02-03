import searchicon from '../../assets/search.svg'

const Topbar = ({ onMenuClick }) => {
  const handleClick = () => {
    console.log("Hamburger clicked!");
    onMenuClick();
  };

  return (
    <div className="fixed top-0 left-0 lg:left-[280px] z-20 h-16 w-full lg:w-[calc(100%-280px)] border-b border-gray-300 flex items-center justify-between lg:justify-end px-4 lg:pr-16 bg-white">
      {/* Hamburger button */}
      <button
        onClick={handleClick}
        className="lg:hidden p-3 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Toggle sidebar"
        type="button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </svg>
      </button>

      {/* Search bar */}
      <div className="w-full max-w-md lg:w-[50%] relative flex items-center">
        <img
          src={searchicon}
          alt="search"
          className="absolute left-3 w-5 h-5 pointer-events-none"
        />
        <input
          type="search"
          placeholder="Search by name and email"
          className="w-full pl-12 pr-4 text-sm outline-none border border-[#E3E4E7] py-3 rounded-lg focus:border-[#0081FF] focus:ring-2 focus:ring-[#0081FF]/20 transition-all"
        />
      </div>
    </div>
  )
}

export default Topbar 
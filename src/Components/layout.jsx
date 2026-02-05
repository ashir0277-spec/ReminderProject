import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Topbar from "./Admin/Topbar";
import AdminSidebar from "./Admin/Sidebar";
import CTOSidebar from "./CTO/SidebarOther";
import HRSidebar from "./HR/HrSidebar"; 
import CEOSidebar from "./CEO/CEOSidebar";    

const Layout = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();

  // 1️⃣ Public routes jahan sidebar/topbar nahi chahiye
  const publicRoutes = ["/login", "/forgot-password", "/unauthorized"];
  const isPublicPage = publicRoutes.some(path => location.pathname.startsWith(path));

  // 2️⃣ Mobile sidebar close effect
  React.useEffect(() => {
    if (window.innerWidth < 1024) setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  const handleToggleSidebar = () => setIsMobileSidebarOpen(prev => !prev);
  const handleCloseSidebar = () => setIsMobileSidebarOpen(false);

  // 3️⃣ Sidebar select karo based on role & route
  let SidebarComponent = null;
  if (!isPublicPage) {
    if (location.pathname.startsWith("/admin")) SidebarComponent = AdminSidebar;
    else if (location.pathname.startsWith("/ceo")) SidebarComponent = CEOSidebar;
    else if (location.pathname.startsWith("/cto")) SidebarComponent = CTOSidebar;
    else if (location.pathname.startsWith("/hr")) SidebarComponent = HRSidebar;
  }

  return (
    <div className="flex-1  bg-gray-100">
      {/* Sidebar */}
      {SidebarComponent && <SidebarComponent isOpen={isMobileSidebarOpen} onClose={handleCloseSidebar} />}

      {/* Main Content */}
      <div className={` h-auto flex flex-col  ${!isPublicPage ? "lg:ml-[280px]" : ""}`}>
        {/* Topbar only for authorized pages */}
        {!isPublicPage && <Topbar onMenuClick={handleToggleSidebar} />}

        {/* Page Content */}
        <main className={` pt-6    px-2 lg:px-6 ${isPublicPage ? "mt-0" : "mt-16"}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

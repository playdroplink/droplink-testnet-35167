import React from "react";
import { Outlet } from "react-router-dom";

const PageLayout: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-sky-400 text-slate-900 overflow-x-hidden pb-24">
      <Outlet />
    </div>
  );
};

export default PageLayout;

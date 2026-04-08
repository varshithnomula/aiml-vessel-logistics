'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { removeToken, isLoggedIn } from "../utils/auth";

export default function Navbar() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLoggedIn(isLoggedIn());
  }, []);

  const handleLogout = () => {
    removeToken();
    setLoggedIn(false);
    router.push("/");
  };

  return (
    <nav className="w-full py-4 px-6 bg-white shadow-lg border-b border-gray-200 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
          <span className="text-white font-bold text-lg">AI</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Logistics Optimizer</h1>
          <p className="text-xs text-gray-500">Steel Supply Chain Management</p>
        </div>
      </div>
      <div className="flex items-center space-x-6">
        {mounted && loggedIn && (
          <>
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Connected</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
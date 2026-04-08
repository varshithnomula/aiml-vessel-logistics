'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";


export default function Sidebar() {
  const pathname = usePathname() || "/";

  const menu = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "AI Predictions", href: "/dashboard/predict" },
    { name: "Scenario Simulation", href: "/dashboard/optimizer" },
    { name: "Upload Data", href: "/dashboard/uploads" },
    { name: "Vessels", href: "/dashboard/vessels" },
    { name: "Ports", href: "/dashboard/ports" },
    { name: "Plants", href: "/dashboard/plants" },
  ];

  return (
    <div className="h-screen w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col shadow-2xl">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold mb-1 bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
          Logistics Optimizer
        </h1>
        <p className="text-xs text-gray-400">AI-Powered System</p>
      </div>

      <nav className="flex flex-col gap-2 p-4 flex-1">
        {menu.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-3 rounded-xl transition-all duration-200 flex items-center space-x-3 ${
                isActive 
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg transform scale-105" 
                  : "hover:bg-gray-700 hover:transform hover:scale-105"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="text-lg">
                {item.name === "Dashboard" && "📊"}
                {item.name === "AI Predictions" && "🤖"}
                {item.name === "Scenario Simulation" && "🔮"}
                {item.name === "Upload Data" && "📤"}
                {item.name === "Vessels" && "🚢"}
                {item.name === "Ports" && "⚓"}
                {item.name === "Plants" && "🏭"}
              </span>
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="bg-gray-800 rounded-lg p-3 text-xs">
          <div className="text-gray-400 mb-1">Data Status</div>
          <div className="text-green-400 font-medium">● System Ready</div>
        </div>
      </div>
    </div>
  );
}
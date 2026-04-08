'use client';

import { useEffect, useState } from "react";
import { apiGet } from "../../../utils/api";
import { isLoggedIn } from "../../../utils/auth";
import { useRouter } from "next/navigation";

export default function PortsPage() {
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/");
      return;
    }

    async function load() {
      try {
        // Get ports from admin dashboard
        const data = await apiGet("/dashboard/admin");
        if (data.ports) {
          setPorts(data.ports);
        } else {
          // Fallback to mock data
          setPorts([
            { name: "Kolkata", capacity_tons: 200000, current_stock: 45000 },
            { name: "Haldia", capacity_tons: 150000, current_stock: 32000 },
            { name: "Paradip", capacity_tons: 180000, current_stock: 28000 }
          ]);
        }
      } catch (error) {
        console.error("Error loading ports:", error);
        // Mock data for demo
        setPorts([
          { name: "Kolkata", capacity_tons: 200000, current_stock: 45000 },
          { name: "Haldia", capacity_tons: 150000, current_stock: 32000 },
          { name: "Paradip", capacity_tons: 180000, current_stock: 28000 },
          { name: "Visakhapatnam", capacity_tons: 160000, current_stock: 25000 },
          { name: "Chennai", capacity_tons: 140000, current_stock: 18000 }
        ]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="text-lg">Loading ports...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ports Overview</h1>
          <p className="text-gray-600">Monitor capacity, stock levels, and congestion across all ports</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ports.map((port, i) => {
            const utilization = (port.current_stock / port.capacity_tons) * 100;
            const congestion = port.current_stock / port.capacity_tons;
            
            return (
              <div
                key={i}
                className="bg-white shadow-lg rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">{port.name}</h2>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    utilization > 80 ? "bg-red-100" : utilization > 60 ? "bg-yellow-100" : "bg-green-100"
                  }`}>
                    <span className={`font-bold text-lg ${
                      utilization > 80 ? "text-red-600" : utilization > 60 ? "text-yellow-600" : "text-green-600"
                    }`}>
                      {Math.round(utilization)}%
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Capacity Utilization</span>
                      <span className="font-medium">{utilization.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          utilization > 80 ? "bg-red-500" : utilization > 60 ? "bg-yellow-500" : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Current Stock</div>
                      <div className="text-lg font-bold text-blue-600">
                        {port.current_stock?.toLocaleString() || 0} tons
                      </div>
                    </div>
                    
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Total Capacity</div>
                      <div className="text-lg font-bold text-purple-600">
                        {port.capacity_tons?.toLocaleString() || 0} tons
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Congestion Index</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        congestion > 0.7 ? "bg-red-100 text-red-800" :
                        congestion > 0.4 ? "bg-yellow-100 text-yellow-800" :
                        "bg-green-100 text-green-800"
                      }`}>
                        {(congestion * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="pt-3">
                    <div className="text-xs text-gray-500">
                      Available: {(port.capacity_tons - port.current_stock)?.toLocaleString() || 0} tons
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from "react";
import { apiGet } from "../../../utils/api";
import { isLoggedIn } from "../../../utils/auth";
import { useRouter } from "next/navigation";

export default function PlantsPage() {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/");
      return;
    }

    async function load() {
      try {
        // Get plant requests from backend
        const requests = await apiGet("/plant/requests");
        const grouped = {};
        
        requests.forEach(req => {
          if (!grouped[req.plant_location]) {
            grouped[req.plant_location] = {
              name: req.plant_location,
              requests: [],
              totalQuantity: 0,
              pending: 0,
              fulfilled: 0
            };
          }
          grouped[req.plant_location].requests.push(req);
          grouped[req.plant_location].totalQuantity += req.quantity_tons;
          if (req.status === "pending") grouped[req.plant_location].pending++;
          if (req.status === "fulfilled") grouped[req.plant_location].fulfilled++;
        });
        
        setPlants(Object.values(grouped));
      } catch (error) {
        console.error("Error loading plants:", error);
        // Set mock data for demo
        setPlants([
          { name: "Durgapur", totalQuantity: 50000, pending: 3, fulfilled: 5 },
          { name: "Bokaro", totalQuantity: 35000, pending: 2, fulfilled: 4 },
          { name: "Bhilai", totalQuantity: 42000, pending: 1, fulfilled: 6 },
          { name: "Rourkela", totalQuantity: 38000, pending: 2, fulfilled: 3 }
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
        <div className="text-lg">Loading plants...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Plant Inventory Overview</h1>
          <p className="text-gray-600">Monitor stock levels and dispatch requirements across all plants</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plants.length > 0 ? (
            plants.map((plant, i) => (
              <div
                key={i}
                className="bg-white shadow-lg rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">{plant.name}</h2>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-lg">P</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">Total Quantity</span>
                    <span className="text-lg font-bold text-gray-900">
                      {plant.totalQuantity?.toLocaleString() || 0} tons
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Pending</div>
                      <div className="text-2xl font-bold text-yellow-600">{plant.pending || 0}</div>
                    </div>
                    
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Fulfilled</div>
                      <div className="text-2xl font-bold text-green-600">{plant.fulfilled || 0}</div>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Status</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        (plant.pending || 0) > 0 
                          ? "bg-yellow-100 text-yellow-800" 
                          : "bg-green-100 text-green-800"
                      }`}>
                        {(plant.pending || 0) > 0 ? "Active" : "Stable"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 text-lg">No plant data available</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

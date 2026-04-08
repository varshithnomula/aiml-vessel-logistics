'use client';

import { useEffect, useState } from "react";
import { apiGet } from "../../../utils/api";
import { isLoggedIn } from "../../../utils/auth";
import { useRouter } from "next/navigation";

export default function VesselsPage() {
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/");
      return;
    }

    async function fetchVessels() {
      try {
        // Use the new /api/vessels endpoint that's accessible to all authenticated users
        const vesselsData = await apiGet("/api/vessels");
        if (vesselsData && vesselsData.length > 0) {
          setVessels(vesselsData.map(v => ({
            name: v.vessel_name || "TBD",
            load_port: v.load_port || "Unknown",
            discharge_ports: Array.isArray(v.discharge_ports) ? v.discharge_ports.join(", ") : (v.discharge_ports || "Unknown"),
            cargo: v.cargo_type || v.cargo || "Unknown",
            quantity: v.cargo_volume_tons || v.quantity || 0,
            status: v.status || "unknown",
            updated: v.updated_at || v.eta || new Date().toISOString()
          })));
        } else {
          // Mock data for demo
          setVessels([
            {
              name: "MV Ocean Star",
              load_port: "Kolkata",
              discharge_ports: "Paradip, Haldia",
              cargo: "Iron Ore",
              quantity: 15000,
              status: "in_transit",
              updated: new Date().toISOString()
            },
            {
              name: "MV Cargo Express",
              load_port: "Paradip",
              discharge_ports: "Kolkata",
              cargo: "Coal",
              quantity: 20000,
              status: "scheduled",
              updated: new Date().toISOString()
            },
            {
              name: "MV Bulk Carrier",
              load_port: "Visakhapatnam",
              discharge_ports: "Haldia, Paradip",
              cargo: "Coke",
              quantity: 18000,
              status: "arrived",
              updated: new Date().toISOString()
            }
          ]);
        }
      } catch (error) {
        console.error("Error fetching vessels:", error);
        // Mock data for demo
        setVessels([
          {
            name: "MV Ocean Star",
            load_port: "Kolkata",
            discharge_ports: "Paradip, Haldia",
            cargo: "Iron Ore",
            quantity: 15000,
            status: "in_transit",
            updated: new Date().toISOString()
          }
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchVessels();
  }, [router]);

  const getStatusColor = (status) => {
    switch (status) {
      case "arrived":
      case "unloaded":
        return "bg-green-100 text-green-800";
      case "in_transit":
        return "bg-blue-100 text-blue-800";
      case "scheduled":
        return "bg-yellow-100 text-yellow-800";
      case "vessel_assigned":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="text-lg">Loading vessels...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vessel List & Scheduling</h1>
          <p className="text-gray-600">Monitor vessel assignments, routes, and cargo details</p>
        </div>

        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Vessel Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Load Port</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Discharge Ports</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Cargo</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Quantity (tons)</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vessels.length > 0 ? (
                  vessels.map((v, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-blue-600 font-bold">V</span>
                          </div>
                          <span className="font-medium text-gray-900">{v.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">{v.load_port}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">{v.discharge_ports}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                          {v.cargo}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700 font-medium">
                        {v.quantity?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(v.status)}`}>
                          {v.status?.replace(/_/g, " ").toUpperCase() || "UNKNOWN"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {v.updated ? new Date(v.updated).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No vessels found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {vessels.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Vessels</div>
              <div className="text-2xl font-bold text-gray-900">{vessels.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">In Transit</div>
              <div className="text-2xl font-bold text-blue-600">
                {vessels.filter(v => v.status === "in_transit").length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Arrived</div>
              <div className="text-2xl font-bold text-green-600">
                {vessels.filter(v => v.status === "arrived" || v.status === "unloaded").length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Cargo</div>
              <div className="text-2xl font-bold text-purple-600">
                {vessels.reduce((sum, v) => sum + (v.quantity || 0), 0).toLocaleString()} tons
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

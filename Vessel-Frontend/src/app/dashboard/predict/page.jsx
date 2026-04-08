'use client';

import { useState } from "react";
import { apiPost } from "../../../utils/api";
import { isLoggedIn } from "../../../utils/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PredictPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const foreignPorts = [
    "Australia (Port Hedland)", "Australia (Newcastle)", "Australia (Dampier)",
    "China (Qingdao)", "China (Tianjin)", "China (Shanghai)",
    "Japan (Tokyo)", "Japan (Osaka)", "Japan (Yokohama)",
    "Russia (Novorossiysk)", "Russia (Vostochny)", "Russia (Murmansk)",
    "USA (New Orleans)", "USA (Baltimore)", "USA (Houston)",
    "UAE (Dubai)", "UAE (Fujairah)", "UAE (Abu Dhabi)",
    "Brazil (Tubarão)", "Brazil (Sepetiba)", "South Africa (Saldanha Bay)"
  ];

  const indianPorts = [
    "Haldia", "Kolkata", "Paradip", "Visakhapatnam", 
    "Chennai", "Ennore", "Mumbai", "Kandla", "Mormugao"
  ];

  const [formData, setFormData] = useState({
    vessel_name: "",
    vessel_type: "Bulk",
    load_port: "Australia (Port Hedland)",
    discharge_port: "Kolkata",
    cargo_type: "Iron Ore",
    cargo_volume_tons: 15000,
    eta: new Date().toISOString().split('T')[0],
    port_congestion_index: null,
    weather_wind_speed: 15.0,
    weather_visibility: 10.0,
    weather_wave_height: 1.0
  });
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/");
    }
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "cargo_volume_tons" || name.includes("weather") || name === "port_congestion_index"
        ? (value === "" ? null : parseFloat(value))
        : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const requestData = {
        ...formData,
        eta: new Date(formData.eta).toISOString()
      };
      const response = await apiPost("/api/predict", requestData);
      setResult(response);
    } catch (error) {
      console.error("Prediction failed", error);
      alert("Failed to get prediction: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">AI Delay Prediction & Optimization</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow-md rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Vessel & Route Details</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Vessel Name</label>
              <input
                type="text"
                name="vessel_name"
                value={formData.vessel_name}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2"
                placeholder="MV Example"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Vessel Type</label>
                <select
                  name="vessel_type"
                  value={formData.vessel_type}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-4 py-2"
                >
                  <option value="Bulk">Bulk</option>
                  <option value="Container">Container</option>
                  <option value="Tanker">Tanker</option>
                  <option value="RORO">RORO</option>
                  <option value="General Cargo">General Cargo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Cargo Type</label>
                <input
                  type="text"
                  name="cargo_type"
                  value={formData.cargo_type}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Load Port (Foreign)</label>
                <select
                  name="load_port"
                  value={formData.load_port}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-4 py-2"
                >
                  {foreignPorts.map(port => (
                    <option key={port} value={port}>{port}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Discharge Port (Indian)</label>
                <select
                  name="discharge_port"
                  value={formData.discharge_port}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-4 py-2"
                >
                  {indianPorts.map(port => (
                    <option key={port} value={port}>{port}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cargo Volume (tons)</label>
              <input
                type="number"
                name="cargo_volume_tons"
                value={formData.cargo_volume_tons}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">ETA</label>
              <input
                type="date"
                name="eta"
                value={formData.eta}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Weather Conditions (Optional)</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Wind Speed (knots)</label>
                  <input
                    type="number"
                    name="weather_wind_speed"
                    value={formData.weather_wind_speed || ""}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Visibility (km)</label>
                  <input
                    type="number"
                    name="weather_visibility"
                    value={formData.weather_visibility || ""}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Wave Height (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="weather_wave_height"
                    value={formData.weather_wave_height || ""}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Predicting..." : "Predict Delay & Optimize"}
            </button>
          </form>
        </div>

        <div className="bg-white shadow-md rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Prediction Results</h2>
          
          {result ? (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Predicted Delay</div>
                <div className="text-3xl font-bold text-blue-600">
                  {result.predicted_delay_hours?.toFixed(2)} hours
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Cost Breakdown</h3>
                <div className="space-y-2">
                  {Object.entries(result.cost_breakdown || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="capitalize">{key.replace(/_/g, " ")}:</span>
                      <span className="font-medium">${typeof value === 'number' ? value.toFixed(2) : value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Optimized Schedule</h3>
                <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2">
                  <div><strong>Vessel:</strong> {result.optimized_schedule?.vessel_name || "N/A"}</div>
                  <div><strong>Load Port:</strong> {result.optimized_schedule?.load_port || "N/A"}</div>
                  <div><strong>Discharge Port:</strong> {result.optimized_schedule?.discharge_port || "N/A"}</div>
                  <div><strong>Original ETA:</strong> {result.optimized_schedule?.eta ? new Date(result.optimized_schedule.eta).toLocaleString() : "N/A"}</div>
                  <div><strong>Adjusted ETA:</strong> {result.optimized_schedule?.eta_adjusted ? new Date(result.optimized_schedule.eta_adjusted).toLocaleString() : "N/A"}</div>
                  <div><strong>Rake Available:</strong> {result.optimized_schedule?.rake_available ? "Yes" : "No"}</div>
                  <div><strong>Port Utilization:</strong> {(result.optimized_schedule?.port_capacity_utilization * 100)?.toFixed(1)}%</div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Estimated Demurrage Cost</div>
                <div className="text-2xl font-bold text-yellow-600">
                  ${result.demurrage_cost?.toFixed(2)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-center py-12">
              Enter vessel details and click "Predict Delay & Optimize" to see results
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


'use client';

import { useState } from "react";
import { apiPost } from "../../../utils/api";
import { isLoggedIn } from "../../../utils/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OptimizerPage() {
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

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [scenario, setScenario] = useState({
    scenario_name: "Scenario 1",
    vessels: [
      {
        vessel_name: "MV Test Vessel",
        vessel_type: "Bulk",
        load_port: "Australia (Port Hedland)",
        discharge_port: "Kolkata",
        cargo_type: "Iron Ore",
        cargo_volume_tons: 15000,
        eta: new Date().toISOString().split('T')[0],
        weather_wind_speed: 15.0,
        weather_visibility: 10.0,
        weather_wave_height: 1.0
      }
    ]
  });
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/");
    }
  }, [router]);

  const addVessel = () => {
    setScenario({
      ...scenario,
      vessels: [
        ...scenario.vessels,
        {
          vessel_name: `MV Vessel ${scenario.vessels.length + 1}`,
          vessel_type: "Bulk",
          load_port: "Australia (Port Hedland)",
          discharge_port: "Kolkata",
          cargo_type: "Iron Ore",
          cargo_volume_tons: 10000,
          eta: new Date().toISOString().split('T')[0],
          weather_wind_speed: 15.0,
          weather_visibility: 10.0,
          weather_wave_height: 1.0
        }
      ]
    });
  };

  const updateVessel = (index, field, value) => {
    const updated = { ...scenario };
    updated.vessels[index][field] = value;
    setScenario(updated);
  };

  const removeVessel = (index) => {
    const updated = { ...scenario };
    updated.vessels = updated.vessels.filter((_, i) => i !== index);
    setScenario(updated);
  };

  async function runWhatIfAnalysis() {
    setLoading(true);
    setResult(null);
    try {
      const response = await apiPost("/api/whatif", scenario);
      setResult(response);
    } catch (err) {
      console.error("What-if analysis failed", err);
      alert("Failed to run analysis: " + err.message);
    }
    setLoading(false);
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Scenario Simulation & What-If Analysis</h1>

      <div className="bg-white shadow-md rounded-xl p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Scenario Configuration</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Scenario Name</label>
          <input
            type="text"
            value={scenario.scenario_name}
            onChange={(e) => setScenario({ ...scenario, scenario_name: e.target.value })}
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">Vessels</label>
            <button
              onClick={addVessel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm"
            >
              + Add Vessel
            </button>
          </div>

          {scenario.vessels.map((vessel, index) => (
            <div key={index} className="border rounded-lg p-4 mb-4">
              <div className="flex justify-between mb-2">
                <h3 className="font-semibold">Vessel {index + 1}</h3>
                <button
                  onClick={() => removeVessel(index)}
                  className="text-red-600 text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Vessel Name</label>
                  <input
                    type="text"
                    value={vessel.vessel_name}
                    onChange={(e) => updateVessel(index, "vessel_name", e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Load Port (Foreign)</label>
                  <select
                    value={vessel.load_port}
                    onChange={(e) => updateVessel(index, "load_port", e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  >
                    {foreignPorts.map(port => (
                      <option key={port} value={port}>{port}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Discharge Port (Indian)</label>
                  <select
                    value={vessel.discharge_port}
                    onChange={(e) => updateVessel(index, "discharge_port", e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  >
                    {indianPorts.map(port => (
                      <option key={port} value={port}>{port}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Cargo Volume (tons)</label>
                  <input
                    type="number"
                    value={vessel.cargo_volume_tons}
                    onChange={(e) => updateVessel(index, "cargo_volume_tons", parseFloat(e.target.value))}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">ETA</label>
                  <input
                    type="date"
                    value={vessel.eta}
                    onChange={(e) => updateVessel(index, "eta", e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={runWhatIfAnalysis}
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Running Analysis..." : "Run What-If Analysis"}
        </button>
      </div>

      {result && (
        <div className="bg-white shadow-md rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Total Cost</div>
              <div className="text-2xl font-bold">${result.total_cost?.toFixed(2)}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Total Delay Hours</div>
              <div className="text-2xl font-bold">{result.total_delay_hours?.toFixed(2)} hrs</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Vessels Optimized</div>
              <div className="text-2xl font-bold">{result.optimized_schedules?.length || 0}</div>
            </div>
          </div>

          {result.recommendations && result.recommendations.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Recommendations</h3>
              <ul className="list-disc list-inside space-y-1">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-gray-700">{rec}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-semibold mb-2">Port Utilization</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(result.port_utilization || {}).map(([port, util]) => (
                <div key={port} className="bg-gray-50 p-3 rounded">
                  <div className="text-sm font-medium">{port}</div>
                  <div className="text-lg">{(util * 100).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Optimized Schedules</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Vessel</th>
                    <th className="px-4 py-2 text-left">Discharge Port</th>
                    <th className="px-4 py-2 text-left">Cargo (tons)</th>
                    <th className="px-4 py-2 text-left">Delay (hrs)</th>
                    <th className="px-4 py-2 text-left">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {result.optimized_schedules?.map((schedule, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-2">{schedule.vessel_name}</td>
                      <td className="px-4 py-2">{schedule.discharge_port}</td>
                      <td className="px-4 py-2">{schedule.cargo_volume_tons?.toLocaleString()}</td>
                      <td className="px-4 py-2">{schedule.predicted_delay_hours?.toFixed(2)}</td>
                      <td className="px-4 py-2">${schedule.cost_breakdown?.total?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import SummaryCard from "../../components/SummaryCard";
import ChartCard from "../../components/ChartCard";
import { apiGet } from "../../utils/api";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "../../utils/auth";

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/");
      return;
    }

    const fetchOverview = async () => {
      try {
        const data = await apiGet("/api/overview");
        setOverview(data);
      } catch (error) {
        console.error("Failed to fetch overview:", error);
        // If 401, redirect to login
        if (error.message.includes("401")) {
          router.push("/");
          return;
        }
        // Set fallback data for demo
        setOverview({
          total_vessels: 0,
          avg_delay_hours: 0,
          active_ports: 0,
          total_cargo_tons: 0,
          port_congestion: {},
          delay_by_port: {}
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [router]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
              <p className="text-gray-600">Real-time logistics optimization and vessel scheduling insights</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <div className="text-xs text-blue-600 font-medium">Data Source</div>
              <div className="text-sm text-gray-700">
                {overview?.total_vessels > 0 ? "📊 Live Data" : "📋 No Data (Upload CSV)"}
              </div>
            </div>
          </div>
          
          {overview?.total_vessels === 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-800">No data available</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Upload <code className="bg-yellow-100 px-1 rounded">vessel_history.csv</code> from the Upload Data page to see real statistics.
                    Currently showing empty/default values.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Total Vessels</p>
                <p className="text-3xl font-bold">{overview?.total_vessels || 0}</p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl">🚢</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium mb-1">Avg Delay</p>
                <p className="text-3xl font-bold">{overview?.avg_delay_hours?.toFixed(2) || "0.00"} hrs</p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl">⏱️</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">Active Ports</p>
                <p className="text-3xl font-bold">{overview?.active_ports || 0}</p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚓</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium mb-1">Total Cargo</p>
                <p className="text-3xl font-bold">{overview?.total_cargo_tons?.toLocaleString() || "0"} tons</p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartCard 
            title="Port Congestion Trend" 
            chartId="congestionChart"
            data={overview?.port_congestion || {}}
            type="bar"
          />
          <ChartCard 
            title="Delay Hours by Port" 
            chartId="delayChart"
            data={overview?.delay_by_port || {}}
            type="bar"
          />
        </div>

        {/* Additional Info Cards */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Port Status</h3>
              <div className="space-y-3">
                {Object.entries(overview.port_congestion || {}).map(([port, congestion]) => (
                  <div key={port} className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">{port}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            congestion > 0.7 ? "bg-red-500" : congestion > 0.4 ? "bg-yellow-500" : "bg-green-500"
                          }`}
                          style={{ width: `${congestion * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">
                        {(congestion * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Delay Analysis</h3>
              <div className="space-y-3">
                {Object.entries(overview.delay_by_port || {}).map(([port, delay]) => (
                  <div key={port} className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">{port}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        delay > 10 ? "bg-red-100 text-red-800" :
                        delay > 5 ? "bg-yellow-100 text-yellow-800" :
                        "bg-green-100 text-green-800"
                      }`}>
                        {delay?.toFixed(2) || "0.00"} hrs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

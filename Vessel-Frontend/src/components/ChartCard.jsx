'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function ChartCard({ title, chartId, data, type = "bar" }) {
  if (!data) {
    return (
      <div className="bg-white shadow-md border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <div className="h-64 w-full bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  // Convert data object to array format for Recharts
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value: typeof value === 'number' ? value : 0
  }));

  return (
    <div className="bg-white shadow-md border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <ResponsiveContainer width="100%" height={300}>
        {type === "bar" ? (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
        ) : (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

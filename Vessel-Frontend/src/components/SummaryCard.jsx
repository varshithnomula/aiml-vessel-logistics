export default function SummaryCard({ title, value, icon, gradient }) {
  const gradients = {
    blue: "from-blue-500 to-blue-600",
    orange: "from-orange-500 to-orange-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600"
  };

  const gradientClass = gradient ? gradients[gradient] : "from-gray-500 to-gray-600";

  return (
    <div className={`bg-gradient-to-br ${gradientClass} rounded-xl shadow-lg p-6 text-white`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-opacity-80 text-sm font-medium mb-1">{title}</h2>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        {icon && (
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <span className="text-2xl">{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VesselCard({ vessel }) {
return (
<div className="p-4 bg-white shadow-md rounded-xl border">
<h3 className="text-xl font-bold text-blue-700">{vessel.name}</h3>
<p className="text-gray-600">Type: {vessel.type}</p>
<p className="text-gray-600">Status: {vessel.status}</p>
<p className="text-gray-600">Arrival: {vessel.eta}</p>
</div>
);
}


// 5. VesselTable.jsx
export default function VesselTable({ vessels }) {
return (
<table className="w-full border-collapse border mt-6 bg-white">
<thead className="bg-blue-600 text-white">
<tr>
<th className="border p-2">Name</th>
<th className="border p-2">Type</th>
<th className="border p-2">ETA</th>
<th className="border p-2">Status</th>
</tr>
</thead>
<tbody>
{vessels.map((v, idx) => (
<tr key={idx} className="text-center">
<td className="border p-2">{v.name}</td>
<td className="border p-2">{v.type}</td>
<td className="border p-2">{v.eta}</td>
<td className="border p-2">{v.status}</td>
</tr>
))}
</tbody>
</table>
);
}
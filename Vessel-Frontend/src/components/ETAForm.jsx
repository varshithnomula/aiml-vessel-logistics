'use client';

import React, { useState } from 'react';

export default function ETAForm() {
  const [formData, setFormData] = useState({
	// Add your form fields here, e.g.:
	vessel_name: '',
	arrival_port: '',
	departure_time: '',
	// Add more fields as needed
  });
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
	setFormData({
	  ...formData,
	  [e.target.name]: e.target.value,
	});
  };

  const handleSubmit = async (e) => {
	e.preventDefault();
	const response = await fetch("http://localhost:8000/predict_eta", {
	  method: "POST",
	  headers: { "Content-Type": "application/json" },
	  body: JSON.stringify(formData),
	});

	const data = await response.json();
	setResult(data);
  };

  return (
	<div className="p-6 max-w-xl mx-auto bg-white shadow-lg rounded-xl">
	  <h2 className="text-2xl font-bold mb-4">Predict ETA Delay</h2>
	  <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit}>
		{Object.keys(formData).map((key) => (
		  <input
			key={key}
			name={key}
			placeholder={key.replace(/_/g, " ")}
			className="border p-2 rounded-lg"
			value={formData[key]}
			onChange={handleChange}
		  />
		))}

		<button className="col-span-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
		  Predict
		</button>
	  </form>

	  {result && (
		<div className="mt-4 p-4 bg-green-100 rounded-lg text-green-700">
		  <p><strong>Predicted ETA Delay:</strong> {result.delay} hours</p>
		</div>
	  )}
	</div>
  );
}
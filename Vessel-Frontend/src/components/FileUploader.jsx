'use client';
import { useState } from "react";
import { apiUploadCSV } from "../utils/api";

export default function FileUploader({ onUpload }) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage("Please select a file");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await apiUploadCSV("/api/upload", formData);
      setMessage(result.message || "Upload complete");
      if (onUpload) onUpload(result);
    } catch (error) {
      setMessage("Error uploading file: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border p-6 rounded-xl shadow-md bg-white max-w-lg mx-auto">
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => setFile(e.target.files[0])}
          className="mb-4 w-full"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!file || loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 w-full"
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
      </form>
      {message && (
        <p className={`mt-3 ${message.includes("Error") ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
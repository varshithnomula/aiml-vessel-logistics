'use client';

import { useState } from "react";
import { apiUploadCSV } from "../../../utils/api";
import { isLoggedIn } from "../../../utils/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function UploadsPage() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/");
    }
  }, [router]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
    setUploadResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage("Please select a file");
      return;
    }

    setLoading(true);
    setMessage("");
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      console.log("Uploading file:", file.name);
      const result = await apiUploadCSV("/api/upload", formData);
      console.log("Upload result:", result);
      
      setUploadResult(result);
      setMessage(result.message || "Upload successful!");
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      setFile(null);
      
      // Show success message
      setTimeout(() => {
        setMessage("");
      }, 5000);
    } catch (error) {
      console.error("Upload error:", error);
      setMessage("Error uploading file: " + (error.message || "Unknown error. Please check if backend is running."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Upload Dataset Files</h1>
          <p className="text-lg text-gray-600">
            Upload Excel (.xlsx, .xls) or CSV files containing vessel history, port data, or plant requirements.
            The system will automatically process and use this data for optimization and predictions.
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-200 mb-6">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">File Upload</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select File
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-blue-400 transition-colors">
                <div className="space-y-2 text-center w-full">
                  {file ? (
                    <div className="flex items-center justify-center space-x-3">
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="mt-4 flex text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                          <span>Choose a file</span>
                          <input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFileChange}
                            className="sr-only"
                            disabled={loading}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">CSV, Excel (.xlsx, .xls) up to 10MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!file || loading}
              className={`w-full px-6 py-4 rounded-xl font-semibold text-white transition-all transform ${
                !file || loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading to server...
                </span>
              ) : (
                "Upload File"
              )}
            </button>
          </form>

          {message && (
            <div className={`mt-6 p-4 rounded-xl border-2 ${
              message.includes("Error") 
                ? "bg-red-50 border-red-200 text-red-800" 
                : "bg-green-50 border-green-200 text-green-800"
            }`}>
              <div className="flex items-center">
                {message.includes("Error") ? (
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="font-medium">{message}</span>
              </div>
            </div>
          )}

          {uploadResult && (
            <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Upload Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Status</div>
                  <div className="text-lg font-bold text-green-600 capitalize">{uploadResult.status}</div>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Records Processed</div>
                  <div className="text-lg font-bold text-blue-600">{uploadResult.records?.toLocaleString() || 0}</div>
                </div>
                {uploadResult.columns && (
                  <div className="md:col-span-2 bg-white p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">Columns Detected</div>
                    <div className="flex flex-wrap gap-2">
                      {uploadResult.columns.slice(0, 10).map((col, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {col}
                        </span>
                      ))}
                      {uploadResult.columns.length > 10 && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          +{uploadResult.columns.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Guidelines Card */}
        <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
            <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            File Format Guidelines
          </h2>
          <div className="space-y-6">
            <div className="p-5 bg-blue-50 rounded-xl border-l-4 border-blue-500">
              <h3 className="font-bold text-gray-900 mb-2">📊 Vessel History</h3>
              <p className="text-sm text-gray-700 mb-2">
                Should include columns like: <code className="bg-white px-2 py-1 rounded text-xs">vessel_name</code>, 
                <code className="bg-white px-2 py-1 rounded text-xs">delay_hours</code>, 
                <code className="bg-white px-2 py-1 rounded text-xs">port_congestion_index</code>, 
                <code className="bg-white px-2 py-1 rounded text-xs">weather_wind_speed</code>, 
                <code className="bg-white px-2 py-1 rounded text-xs">cargo_volume_tons</code>, etc.
              </p>
              <p className="text-xs text-gray-600 mt-2">
                💡 The ML model will be automatically retrained with this data for better predictions.
              </p>
            </div>
            
            <div className="p-5 bg-green-50 rounded-xl border-l-4 border-green-500">
              <h3 className="font-bold text-gray-900 mb-2">⚓ Port Data</h3>
              <p className="text-sm text-gray-700 mb-2">
                Should include columns like: <code className="bg-white px-2 py-1 rounded text-xs">port</code> or 
                <code className="bg-white px-2 py-1 rounded text-xs">name</code>, 
                <code className="bg-white px-2 py-1 rounded text-xs">capacity</code> or 
                <code className="bg-white px-2 py-1 rounded text-xs">capacity_tons</code>, 
                <code className="bg-white px-2 py-1 rounded text-xs">stock</code> or 
                <code className="bg-white px-2 py-1 rounded text-xs">current_stock</code>.
              </p>
            </div>
            
            <div className="p-5 bg-yellow-50 rounded-xl border-l-4 border-yellow-500">
              <h3 className="font-bold text-gray-900 mb-2">ℹ️ Note</h3>
              <p className="text-sm text-gray-700">
                The system will automatically detect the file type based on column names. 
                Uploaded data replaces existing data in memory and is used immediately for optimization and predictions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

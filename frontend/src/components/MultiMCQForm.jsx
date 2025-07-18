// components/MultiMCQForm.jsx
import React, { useState } from "react";
import { generateMultiVideoMCQs } from "../utils/api";

const MultiMCQForm = () => {
  const [videoUrls, setVideoUrls] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  const handleChange = (index, value) => {
    const updated = [...videoUrls];
    updated[index] = value;
    setVideoUrls(updated);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const data = await generateMultiVideoMCQs(videoUrls);
      setResults(data);
    } catch (err) {
      setError("Could not generate MCQs. Please check your video URLs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-2">Enter 4 YouTube Video URLs</h2>
      {videoUrls.map((url, i) => (
        <input
          key={i}
          className="w-full mb-2 p-2 border rounded"
          placeholder={`Video URL ${i + 1}`}
          value={url}
          onChange={(e) => handleChange(i, e.target.value)}
        />
      ))}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? "Generating..." : "Generate MCQs"}
      </button>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {results && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Generated MCQs ({results.total_questions})</h3>
          <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-96">{JSON.stringify(results.questions, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default MultiMCQForm;

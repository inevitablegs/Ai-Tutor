// src/utils/contentScan.js   (or wherever you keep API helpers)
import axios from "axios";
import { getCsrfToken } from "./api";      // keep if you use CSRF
import { getFirebaseIdToken } from "./firebase"; // keep if you use Firebase auth

const API_BASE = import.meta.env.VITE_API_BASE;

/* ---------- PDF ---------- */
export async function uploadPdf(file) {
  if (!file) throw new Error("No PDF file provided");
  const fd = new FormData();
  fd.append("pdf", file);

  const csrf = await getCsrfToken();
  const idToken = await getFirebaseIdToken();       // drop if not needed
  const res = await axios.post(`${API_BASE}/process-pdf/`, fd, {
    headers: {
      "Content-Type": "multipart/form-data",
      "X-CSRFToken": csrf,  
      Authorization: `Bearer ${idToken}`,               // drop if not needed
    },
    withCredentials: true,
  });
  console.log("PDF upload response:", res.data);
  
  return res.data;                         // { status: true, … }
}

/* ---------- YouTube ---------- */
export async function analyzeYoutube(url) {
  if (!url) throw new Error("No YouTube URL provided");

  const csrf = await getCsrfToken();       // drop if not needed
  const idToken = await getFirebaseIdToken(); // drop if not needed
  const res = await axios.post(
    `${API_BASE}/process-youtube/`,
    { video_url: url },
    {
      headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrf,  
      Authorization: `Bearer ${idToken}`,               // drop if not needed
    },    // drop if not needed
      withCredentials: true,
    }
  );

  return res.data;                         // { ok: true, … }
}


export async function askPdfQuestion(pdfId, question) {
  if (!pdfId || !question?.trim()) {
    throw new Error("pdfId and question are required");
  }
  const csrf = await getCsrfToken();
  const idToken = await getFirebaseIdToken();

  /* 2️⃣  POST to /api/question-answer/ */
  const res = await axios.post(
    `${API_BASE}/answer-question/`,          // adjust path if needed
    {
      pdf_id: pdfId,
      question: question.trim(),
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrf,
        Authorization: `Bearer ${idToken}`,  // 👉 Django uses this
      },
    }
  );


  return res.data;                          
}



export async function fetchUserPDFList() {
  try {
    const idToken = await getFirebaseIdToken(); // Ensure you have a valid Firebase ID token
    const csrf = await getCsrfToken();
    if (!idToken) throw new Error("User not authenticated");


    const response = await fetch(`${API_BASE}/user/pdfs/`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${idToken}`,
        "X-CSRFToken": csrf,  // Optional if using CSRF protection
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      throw new Error(data.error || "Failed to fetch PDF list.");
    }

    return data.data; // Array of PDFs
  } catch (err) {
    console.error("Error fetching user PDFs:", err);
    throw err;
  }
}



export async function deletePdf(pdfId) {
  try {
    const idToken = await getFirebaseIdToken();
    const csrf = await getCsrfToken();
    if (!idToken) throw new Error("User not authenticated");

    const response = await axios.delete(`${API_BASE}/user/pdfs/${pdfId}/`, {
      headers: {
        "X-CSRFToken": csrf,  // Optional if using CSRF protection
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
    });

    return {
      success: true,
      message: response.data.message,
    };
  } catch (error) {
    console.error("Delete PDF error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Something went wrong",
      error: error.response?.data?.error || null,
    };
  }
}

export async function askYoutubeQuestion(videoId, question) {
  const token = await getFirebaseIdToken();
  const csrf = await getCsrfToken();
  if (!token) throw new Error("User not authenticated");
  const res = await axios.post(
    `${import.meta.env.VITE_API_BASE}/ask-youtube-question/`,
    { video_id: videoId, question },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-CSRFToken": csrf,  // Optional if using CSRF protection
        "Content-Type": "application/json",
      },
    }
  );
  return res.data;
}



export async function fetchYouTubeHistory() {
  const token = await getFirebaseIdToken();
  const csrf = await getCsrfToken();
  if (!token) throw new Error("User not authenticated");
  const res = await fetch(`${API_BASE}/user/youtube-videos/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-CSRFToken": csrf,  
      "Content-Type": "application/json",
    },
  });
  const json = await res.json();
  if (!json.status) throw new Error("Failed to fetch YouTube history");
  return json.data;
}


export async function deleteYoutubeVideo(videoId) {
  const token = await getFirebaseIdToken();
  const csrf = await getCsrfToken();
  if (!token) throw new Error("User not authenticated");
  const res = await fetch(`${API_BASE}/user/youtube-videos/${videoId}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-CSRFToken": csrf, 
      "Content-Type": "application/json",
    },
  });

  const json = await res.json();
  if (!json.status) throw new Error(json.error || "Failed to delete video");
  return json;
}


export async function fetchChapterGenerationHistory() {
   // if CSRF is enabled
  const idToken = await getFirebaseIdToken();
  const csrfToken = await getCsrfToken();
  if (!idToken) throw new Error("User not authenticated");
  const res = await axios.get(`${API_BASE}/chapters/history/`, {
    withCredentials: true,
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken, 
    },
  });

  return res.data.data;
}


export async function deleteChapterGeneration(generationId) {
  const firebaseIdToken = await getFirebaseIdToken();
  const csrfToken = await getCsrfToken();

  const res = await fetch(`${API_BASE}/chapters/${generationId}/`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${firebaseIdToken}`,
      "X-CSRFToken": csrfToken,
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to delete generation");
  }

  return await res.json();
}


export async function fetchChapterResources(generationId) {
  try {
    const idToken = await getFirebaseIdToken();
    const csrfToken = await getCsrfToken(); 
    if (!idToken) throw new Error("User not authenticated");

    const response = await axios.get(`${API_BASE}/chapters/${generationId}/resources/`, {
      headers: {
        Authorization: `Bearer ${idToken}`,
        "X-CSRFToken": csrfToken,
        "Content-Type": "application/json",
      },
    });

    return response.data.data; 
  } catch (error) {
    console.error("Error fetching chapter resources:", error);
    throw error;
  }
}



export async function generateMultiVideoMCQs(videoUrls) {
  if (!Array.isArray(videoUrls) || videoUrls.length !== 4) {
    throw new Error("You must provide exactly 4 video URLs.");
  }
  const idToken = await getFirebaseIdToken();
  const csrfToken = await getCsrfToken();
  if (!idToken) throw new Error("User not authenticated");

  try {
    const response = await axios.post(`${API_BASE}/generate-multi-mcqs/`, {
      video_urls: videoUrls,
      headers: {
        Authorization: `Bearer ${idToken}`,
        "X-CSRFToken": csrfToken,
        "Content-Type": "application/json",
      },
    });

    return response.data; // Contains { status, total_questions, questions, saved_to }
  } catch (error) {
    console.error("Failed to generate MCQs:", error.response?.data || error.message);
    throw error;
  }
}


export async function fetchPDFConversationHistory(pdfId) {
  try {
    const token = await getFirebaseIdToken();
    const csrf = await getCsrfToken();
    if (!token) throw new Error("User not authenticated");
    const response = await axios.get(`${API_BASE}/user/pdfs/${pdfId}/conversations/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-CSRFToken": csrf,  // Optional if using CSRF protection
        "Content-Type": "application/json",
      },
    });

    if (response.data.status) {
      return response.data.data; // returns array of conversation objects
    } else {
      throw new Error(response.data.error || "Unknown error");
    }
  } catch (err) {
    console.error("Error fetching PDF conversation history:", err);
    throw err;
  }
}
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function handleResponse(response: Response, defaultError: string) {
  if (!response.ok) {
    let errorDetail = defaultError;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.message || errorJson.detail || defaultError;
    } catch {
      errorDetail = `${defaultError} (${response.status})`;
    }
    throw new Error(errorDetail);
  }
  return response.json();
}

export const api = {
  getPapers: async () => {
    const response = await fetch(`${API_URL}/papers`);
    return handleResponse(response, "Failed to fetch research papers");
  },
  
  deletePaper: async (id: string) => {
    const response = await fetch(`${API_URL}/papers/${id}`, {
      method: 'DELETE'
    });
    return handleResponse(response, "Failed to delete research paper");
  },
  
  getUploadUrl: () => {
    return `${API_URL}/papers/upload`;
  },
  
  queryChat: async (query: string, paperIds?: string[]) => {
    const response = await fetch(`${API_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        paper_ids: paperIds || [],
        mode: 'chat'
      }),
    });
    return handleResponse(response, "Intelligence query failed");
  },
  
  getSummary: async (paperId: string) => {
    const response = await fetch(`${API_URL}/papers/${paperId}/summary`);
    return handleResponse(response, "Failed to generate paper summary");
  },
  
  comparePapers: async (paperIds: string[]) => {
    const response = await fetch(`${API_URL}/papers/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paper_ids: paperIds }),
    });
    return handleResponse(response, "Failed to compare selected papers");
  },

  analyzeGaps: async (paperIds: string[]) => {
    const response = await fetch(`${API_URL}/papers/gap-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paper_ids: paperIds }),
    });
    return handleResponse(response, "Failed to synthesize research gap intelligence");
  },

  validateIdea: async (payload: {
    paper_ids: string[];
    research_idea: string;
    domain?: string;
    target_problem?: string;
    proposed_method?: string;
    constraints?: string[];
  }) => {
    const response = await fetch(`${API_URL}/papers/validate-idea`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(response, "Failed to validate research idea");
  },

  generateLiteratureReview: async (paperIds: string[]) => {
    const response = await fetch(`${API_URL}/papers/literature-review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paper_ids: paperIds }),
    });
    return handleResponse(response, "Failed to generate academic literature review");
  },

  exportReport: async (payload: { type: 'pdf' | 'docx'; content: unknown }) => {
    const response = await fetch(`${API_URL}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Export generation failed (${response.status})`);
    }
    return response.blob();
  }
};

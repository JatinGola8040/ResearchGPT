const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = {
  getPapers: async () => {
    const response = await fetch(`${API_URL}/papers`);
    if (!response.ok) throw new Error(`Failed to fetch papers: ${response.status}`);
    return response.json();
  },
  
  deletePaper: async (id: string) => {
    const response = await fetch(`${API_URL}/papers/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error(`Failed to delete paper: ${response.status}`);
    return response;
  },
  
  getUploadUrl: () => {
    return `${API_URL}/papers/upload`;
  },
  
  queryChat: async (query: string) => {
    const response = await fetch(`${API_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },
  
  getSummary: async (paperId: string) => {
    const response = await fetch(`${API_URL}/papers/${paperId}/summary`);
    if (!response.ok) throw new Error(`Failed to fetch summary: ${response.status}`);
    return response.json();
  },
  
  comparePapers: async (paperIds: string[]) => {
    const response = await fetch(`${API_URL}/papers/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paper_ids: paperIds }),
    });
    if (!response.ok) throw new Error(`Failed to compare papers: ${response.status}`);
    return response.json();
  },

  analyzeGaps: async (paperIds: string[]) => {
    const response = await fetch(`${API_URL}/papers/gap-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paper_ids: paperIds }),
    });
    if (!response.ok) throw new Error(`Failed to perform gap analysis: ${response.status}`);
    return response.json();
  },

  generateLiteratureReview: async (paperIds: string[]) => {
    const response = await fetch(`${API_URL}/papers/literature-review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paper_ids: paperIds }),
    });
    if (!response.ok) throw new Error(`Failed to generate literature review: ${response.status}`);
    return response.json();
  }
};



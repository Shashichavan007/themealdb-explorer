const API_BASE = '/api';

async function request(path) {
  const response = await fetch(`${API_BASE}${path}`);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error || 'Request failed.';
    throw new Error(message);
  }

  return data;
}

const api = {
  getCategories: () => request('/categories'),
  getMealsByCategory: (name) => request(`/categories/${encodeURIComponent(name)}`),
  searchMeals: (query) => request(`/meals/search?q=${encodeURIComponent(query)}`),
  getRandomMeal: () => request('/meals/random'),
  getMealById: (id) => request(`/meals/${encodeURIComponent(id)}`)
};

export default api;

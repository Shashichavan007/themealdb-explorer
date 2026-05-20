const API_BASE = '/api/admin';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error || 'Request failed.';
    throw new Error(message);
  }

  return data;
}

const adminApi = {
  getCategories: () => request('/categories'),
  createCategory: (category) => request('/categories', {
    method: 'POST',
    body: JSON.stringify(category)
  }),
  deleteCategory: (id) => request(`/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  }),
  getMeals: () => request('/meals'),
  createMeal: (meal) => request('/meals', {
    method: 'POST',
    body: JSON.stringify(meal)
  }),
  deleteMeal: (id) => request(`/meals/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
};

export default adminApi;

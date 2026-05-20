import { useEffect, useState } from 'react';
import adminApi from '../services/adminApi';

const emptyCategory = {
  name: '',
  thumb: '',
  description: ''
};

const emptyMeal = {
  name: '',
  category: '',
  area: '',
  thumbnail: '',
  youtube: '',
  source: '',
  tags: '',
  ingredients: [{ ingredient: '', measure: '' }]
};

function AdminPage() {
  const [categories, setCategories] = useState([]);
  const [meals, setMeals] = useState([]);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [mealForm, setMealForm] = useState(emptyMeal);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadCategories();
    loadMeals();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await adminApi.getCategories();
      setCategories(data.categories || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadMeals = async () => {
    try {
      const data = await adminApi.getMeals();
      setMeals(data.meals || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCategoryChange = (field, value) => {
    setCategoryForm((current) => ({ ...current, [field]: value }));
  };

  const handleMealChange = (field, value) => {
    setMealForm((current) => ({ ...current, [field]: value }));
  };

  const handleIngredientChange = (index, field, value) => {
    setMealForm((current) => {
      const ingredients = [...current.ingredients];
      ingredients[index] = { ...ingredients[index], [field]: value };
      return { ...current, ingredients };
    });
  };

  const addIngredient = () => {
    setMealForm((current) => ({
      ...current,
      ingredients: [...current.ingredients, { ingredient: '', measure: '' }]
    }));
  };

  const removeIngredient = (index) => {
    setMealForm((current) => ({
      ...current,
      ingredients: current.ingredients.filter((_, i) => i !== index)
    }));
  };

  const submitCategory = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await adminApi.createCategory(categoryForm);
      setCategoryForm(emptyCategory);
      setMessage('Category created.');
      await loadCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitMeal = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await adminApi.createMeal(mealForm);
      setMealForm(emptyMeal);
      setMessage('Meal created.');
      await loadMeals();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteCategory = async (id) => {
    setError('');
    setMessage('');
    try {
      await adminApi.deleteCategory(id);
      setMessage('Category deleted.');
      await loadCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteMeal = async (id) => {
    setError('');
    setMessage('');
    try {
      await adminApi.deleteMeal(id);
      setMessage('Meal deleted.');
      await loadMeals();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Admin Panel</p>
          <h1>Manage categories and local meals</h1>
          <p className="muted">Use this panel to add, view, and remove admin-created data stored in SQLite.</p>
        </div>
      </section>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error-text">{error}</div>}

      <div className="grid">
        <section className="section-card">
          <h2>Create Category</h2>
          <form onSubmit={submitCategory}>
            <label>
              Name
              <input
                value={categoryForm.name}
                onChange={(e) => handleCategoryChange('name', e.target.value)}
                required
              />
            </label>
            <label>
              Thumbnail URL
              <input
                value={categoryForm.thumb}
                onChange={(e) => handleCategoryChange('thumb', e.target.value)}
              />
            </label>
            <label>
              Description
              <textarea
                value={categoryForm.description}
                onChange={(e) => handleCategoryChange('description', e.target.value)}
              />
            </label>
            <button className="button primary" type="submit">Save category</button>
          </form>

          <div className="section-card" style={{ marginTop: '1rem' }}>
            <h3>Local Categories</h3>
            <ul className="list-reset">
              {categories.map((category) => (
                <li key={category.id} className="list-item">
                  <strong>{category.name}</strong>
                  <button
                    type="button"
                    className="button small secondary"
                    onClick={() => deleteCategory(category.id)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section-card">
          <h2>Create Local Meal</h2>
          <form onSubmit={submitMeal}>
            <label>
              Name
              <input
                value={mealForm.name}
                onChange={(e) => handleMealChange('name', e.target.value)}
                required
              />
            </label>
            <label>
              Category
              <input
                value={mealForm.category}
                onChange={(e) => handleMealChange('category', e.target.value)}
                required
              />
            </label>
            <label>
              Area
              <input
                value={mealForm.area}
                onChange={(e) => handleMealChange('area', e.target.value)}
              />
            </label>
            <label>
              Thumbnail URL
              <input
                value={mealForm.thumbnail}
                onChange={(e) => handleMealChange('thumbnail', e.target.value)}
              />
            </label>
            <label>
              YouTube URL
              <input
                value={mealForm.youtube}
                onChange={(e) => handleMealChange('youtube', e.target.value)}
              />
            </label>
            <label>
              Source URL
              <input
                value={mealForm.source}
                onChange={(e) => handleMealChange('source', e.target.value)}
              />
            </label>
            <label>
              Tags (comma separated)
              <input
                value={mealForm.tags}
                onChange={(e) => handleMealChange('tags', e.target.value)}
              />
            </label>
            <label>
              Instructions
              <textarea
                value={mealForm.instructions}
                onChange={(e) => handleMealChange('instructions', e.target.value)}
              />
            </label>

            <div>
              <p className="eyebrow">Ingredients</p>
              {mealForm.ingredients.map((ingredient, index) => (
                <div key={index} className="grid" style={{ gap: '0.75rem', marginBottom: '.75rem' }}>
                  <input
                    placeholder="Ingredient"
                    value={ingredient.ingredient}
                    onChange={(e) => handleIngredientChange(index, 'ingredient', e.target.value)}
                  />
                  <input
                    placeholder="Measure"
                    value={ingredient.measure}
                    onChange={(e) => handleIngredientChange(index, 'measure', e.target.value)}
                  />
                  <button
                    type="button"
                    className="button small secondary"
                    onClick={() => removeIngredient(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="button secondary" onClick={addIngredient}>
                Add ingredient
              </button>
            </div>

            <button className="button primary" type="submit">Save meal</button>
          </form>

          <div className="section-card" style={{ marginTop: '1rem' }}>
            <h3>Local Meals</h3>
            <ul className="list-reset">
              {meals.map((meal) => (
                <li key={meal.id} className="list-item">
                  <span>{meal.name} ({meal.category})</span>
                  <button
                    type="button"
                    className="button small secondary"
                    onClick={() => deleteMeal(meal.id)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AdminPage;

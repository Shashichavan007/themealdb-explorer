import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import SearchBar from '../components/SearchBar';
import CategoryTabs from '../components/CategoryTabs';
import MealCard from '../components/MealCard';
import { formatCategoryName } from '../utils/formatCategoryName';

function HomePage() {
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [meals, setMeals] = useState([]);
  const [randomMeal, setRandomMeal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Search for a meal or choose a category.');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await api.getCategories();
        setCategories(data.categories || []);
        const defaultCategory =
          data.categories?.find((cat) => cat.name === 'Chicken')?.name ||
          data.categories?.[0]?.name ||
          '';
        setSelectedCategory(defaultCategory);
      } catch (err) {
        setError('Unable to load categories.');
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;

    const loadMeals = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.getMealsByCategory(selectedCategory);
        setMeals(data.meals || []);
        setMessage(`Showing ${formatCategoryName(selectedCategory)} recipes.`);
      } catch (err) {
        setError('Unable to load meals for this category.');
      } finally {
        setLoading(false);
      }
    };

    loadMeals();
  }, [selectedCategory]);

  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');
    setRandomMeal(null);
    try {
      const data = await api.searchMeals(trimmed);
      setMeals(data.meals || []);
      setMessage(data.meals?.length ? `Results for "${trimmed}"` : `No meals found for "${trimmed}"`);
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRandom = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getRandomMeal();
      setRandomMeal(data.meal);
      setMessage('A random meal is ready.');
    } catch (err) {
      setError('Could not fetch a random meal.');
    } finally {
      setLoading(false);
    }
  };

  const visibleMeals = useMemo(() => meals, [meals]);

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">TheMealDB Explorer</p>
          <h1>Find your next recipe in seconds.</h1>
          <p className="muted">Search by meal name, browse categories, or let the app pick something random.</p>
        </div>

        <div className="hero-actions">
          <button className="button secondary" onClick={handleRandom} disabled={loading}>
            I&apos;m Feeling Hungry
          </button>
        </div>
      </section>

      <SearchBar value={query} onChange={setQuery} onSubmit={handleSearch} />

      <CategoryTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <section className="status-row">
        <p>{message}</p>
        {loading && <span className="badge">Loading...</span>}
      </section>

      {error && <div className="alert">{error}</div>}

      {randomMeal && (
        <section className="featured-card">
          <div className="featured-image-wrap">
            <img src={randomMeal.thumbnail} alt={randomMeal.name} className="featured-image" />
          </div>
          <div className="featured-content">
            <p className="eyebrow">Random pick</p>
            <h2>{randomMeal.name}</h2>
            <p className="muted">{randomMeal.category} • {randomMeal.area}</p>
            <Link to={`/meal/${randomMeal.id}`} className="button primary">View recipe</Link>
          </div>
        </section>
      )}

      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Meals</p>
            <h2>Meals</h2>
          </div>
          <p className="muted">Tap any card to open the recipe details.</p>
        </div>
        <div className="grid">
          {visibleMeals.map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomePage;

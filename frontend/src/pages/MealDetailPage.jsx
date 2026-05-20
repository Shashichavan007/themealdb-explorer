import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import { formatCategoryName } from '../utils/formatCategoryName';

function MealDetailPage() {
  const { id } = useParams();
  const [meal, setMeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadMeal = async () => {
      try {
        setLoading(true);
        const data = await api.getMealById(id);
        setMeal(data.meal);
      } catch (err) {
        setError(err.message || 'Could not load meal details.');
      } finally {
        setLoading(false);
      }
    };

    loadMeal();
  }, [id]);

  if (loading) {
    return <div className="section-card"><p>Loading meal details...</p></div>;
  }

  if (error) {
    return (
      <div className="section-card">
        <p className="error-text">{error}</p>
        <Link className="button primary" to="/">Go back</Link>
      </div>
    );
  }

  if (!meal) return null;

  return (
    <div className="page-stack">
      <section className="detail-hero">
        <img src={meal.thumbnail} alt={meal.name} className="detail-image" />
        <div className="detail-content">
          <p className="eyebrow">Recipe details</p>
          <h1>{meal.name}</h1>
          <p className="muted">{formatCategoryName(meal.category)} • {meal.area}</p>
          <Link to="/" className="button secondary">Back to home</Link>
        </div>
      </section>

      <section className="detail-grid">
        <div className="section-card">
          <h2>Ingredients</h2>
          <ul className="ingredients-list">
            {meal.ingredients.map((item) => (
              <li key={`${item.ingredient}-${item.measure}`}>
                <span>{item.ingredient}</span>
                <span>{item.measure}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="section-card">
          <h2>Instructions</h2>
          <p className="instructions">{meal.instructions}</p>
        </div>
      </section>

      {meal.youtube && (
        <section className="section-card">
          <h2>YouTube Video</h2>
          <div className="video-wrap">
            <iframe
              src={meal.youtube.replace('watch?v=', 'embed/')}
              title={`${meal.name} video`}
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </section>
      )}

      {meal.source && (
        <section className="section-card">
          <a href={meal.source} target="_blank" rel="noreferrer" className="button primary">
            Open source recipe
          </a>
        </section>
      )}
    </div>
  );
}

export default MealDetailPage;

import { Link } from 'react-router-dom';
import { formatCategoryName } from '../utils/formatCategoryName';

function MealCard({ meal }) {
  return (
    <Link to={`/meal/${meal.id}`} className="meal-card" id="discover">
      <img src={meal.thumbnail} alt={meal.name} className="meal-image" />
      <div className="meal-card-body">
        <h3>{meal.name}</h3>
        <p className="muted">
          {formatCategoryName(meal.category) || 'Recipe'}{meal.area ? ` • ${meal.area}` : ''}
        </p>
      </div>
    </Link>
  );
}

export default MealCard;

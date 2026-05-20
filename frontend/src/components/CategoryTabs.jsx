import { formatCategoryName } from '../utils/formatCategoryName';

function CategoryTabs({ categories, selectedCategory, onSelect }) {
  return (
    <section className="section-card" id="browse">
      <div className="section-header">
        <div>
          <p className="eyebrow">Browse</p>
          <h2>Categories</h2>
        </div>
        <p className="muted">Pick a category to see meals.</p>
      </div>

      <div className="tabs-scroll">
        {categories.map((category) => (
          <button
            key={category.id}
            className={`tab ${selectedCategory === category.name ? 'active' : ''}`}
            onClick={() => onSelect(category.name)}
            type="button"
          >
            {formatCategoryName(category.name)}
          </button>
        ))}
      </div>
    </section>
  );
}

export default CategoryTabs;

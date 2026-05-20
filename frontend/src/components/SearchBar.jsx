function SearchBar({ value, onChange, onSubmit }) {
  return (
    <form className="search-bar" onSubmit={onSubmit} id="search">
      <input
        type="text"
        placeholder="Search meals by name..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search meals by name"
      />
      <button type="submit">Search</button>
    </form>
  );
}

export default SearchBar;

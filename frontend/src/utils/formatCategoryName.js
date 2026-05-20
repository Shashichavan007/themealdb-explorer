export function formatCategoryName(name) {
  if (!name) return name;
  return name === 'Beef' ? 'Mutton' : name;
}

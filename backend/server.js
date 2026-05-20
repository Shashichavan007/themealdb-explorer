import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';
const DB_DIR = path.resolve('./data');
const DB_FILE = path.join(DB_DIR, 'app.sqlite');
const LOCAL_PREFIX = 'local-';

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('Failed to open SQLite database:', err);
    process.exit(1);
  }
});

db.run('PRAGMA foreign_keys = ON');

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

async function initDb() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      thumb TEXT,
      description TEXT
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      area TEXT DEFAULT '',
      instructions TEXT DEFAULT '',
      thumbnail TEXT DEFAULT '',
      youtube TEXT DEFAULT '',
      source TEXT DEFAULT '',
      tags TEXT DEFAULT ''
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_id INTEGER NOT NULL,
      ingredient TEXT NOT NULL,
      measure TEXT DEFAULT '',
      FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE
    )
  `);
}

initDb().catch((err) => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});

app.use(cors());
app.use(express.json());

class SimpleCache {
  constructor({ ttlMs = 5 * 60 * 1000, maxKeys = 100 } = {}) {
    this.ttlMs = ttlMs;
    this.maxKeys = maxKeys;
    this.store = new Map();
  }

  _now() {
    return Date.now();
  }

  _isExpired(entry) {
    return entry.expiresAt <= this._now();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (this._isExpired(entry)) {
      this.store.delete(key);
      return undefined;
    }
    entry.lastAccess = this._now();
    return entry.value;
  }

  set(key, value) {
    const now = this._now();
    this.store.set(key, {
      value,
      expiresAt: now + this.ttlMs,
      lastAccess: now
    });

    this.evictExpired();
    this.evictOverflow();
  }

  evictExpired() {
    for (const [key, entry] of this.store.entries()) {
      if (this._isExpired(entry)) {
        this.store.delete(key);
      }
    }
  }

  evictOverflow() {
    if (this.store.size <= this.maxKeys) return;

    const entries = [...this.store.entries()]
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    while (this.store.size > this.maxKeys) {
      const oldest = entries.shift();
      if (!oldest) break;
      this.store.delete(oldest[0]);
    }
  }
}

const cache = new SimpleCache({
  ttlMs: 10 * 60 * 1000,
  maxKeys: 200
});

function cacheKeyFrom(url) {
  return `meals:${url}`;
}

async function fetchJson(url) {
  const cacheKey = cacheKeyFrom(url);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TheMealDB request failed with status ${response.status}`);
  }

  const data = await response.json();
  cache.set(cacheKey, data);
  return data;
}

function normalizeMealList(meals = []) {
  return meals.map((meal) => ({
    id: meal.idMeal,
    name: meal.strMeal,
    thumbnail: meal.strMealThumb,
    category: meal.strCategory || '',
    area: meal.strArea || ''
  }));
}

function buildIngredients(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i += 1) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      ingredients.push({
        ingredient: ingredient.trim(),
        measure: measure ? measure.trim() : ''
      });
    }
  }
  return ingredients;
}

function normalizeMealDetail(meal) {
  return {
    id: meal.idMeal,
    name: meal.strMeal,
    category: meal.strCategory || '',
    area: meal.strArea || '',
    instructions: meal.strInstructions || '',
    thumbnail: meal.strMealThumb || '',
    tags: meal.strTags ? meal.strTags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
    youtube: meal.strYoutube || '',
    source: meal.strSource || '',
    ingredients: buildIngredients(meal)
  };
}

function formatLocalId(type, id) {
  return `${LOCAL_PREFIX}${type}-${id}`;
}

function parseLocalId(value) {
  if (typeof value !== 'string' || !value.startsWith(LOCAL_PREFIX)) return null;
  const suffix = value.slice(LOCAL_PREFIX.length);
  const [type, idString] = suffix.split('-', 2);
  const id = parseInt(idString, 10);
  if (!type || Number.isNaN(id)) return null;
  return { type, id };
}

async function getLocalCategories() {
  return dbAll('SELECT id, name, thumb, description FROM categories ORDER BY name');
}

async function getLocalMealsByCategory(name) {
  return dbAll(
    'SELECT id, name, category, area, thumbnail FROM meals WHERE category = ? ORDER BY name',
    [name]
  );
}

async function getLocalMealById(id) {
  const row = await dbGet('SELECT id, name, category, area, instructions, thumbnail, youtube, source, tags FROM meals WHERE id = ?', [id]);
  if (!row) return null;
  const ingredients = await dbAll(
    'SELECT ingredient, measure FROM ingredients WHERE meal_id = ? ORDER BY id',
    [id]
  );
  return {
    id: formatLocalId('meal', row.id),
    name: row.name,
    category: row.category,
    area: row.area,
    instructions: row.instructions,
    thumbnail: row.thumbnail,
    tags: row.tags ? row.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
    youtube: row.youtube,
    source: row.source,
    ingredients
  };
}

async function searchLocalMeals(query) {
  const like = `%${query.toLowerCase()}%`;
  return dbAll(
    `SELECT id, name, category, area, thumbnail FROM meals
     WHERE lower(name) LIKE ? OR lower(category) LIKE ? OR lower(area) LIKE ?
     ORDER BY name`,
    [like, like, like]
  );
}

function mapLocalCategory(category) {
  return {
    id: formatLocalId('category', category.id),
    name: category.name,
    thumb: category.thumb,
    description: category.description
  };
}

function combineCategories(remoteCategories, localCategories) {
  const categories = [];
  const seen = new Set();

  for (const category of remoteCategories) {
    categories.push(category);
    seen.add(category.name);
  }

  for (const category of localCategories) {
    if (!seen.has(category.name)) {
      categories.push(mapLocalCategory(category));
      seen.add(category.name);
    }
  }

  return categories;
}

function combineMeals(remoteMeals, localMeals) {
  const meals = [...remoteMeals];
  const seen = new Set(remoteMeals.map((meal) => meal.id));

  for (const meal of localMeals) {
    const localId = formatLocalId('meal', meal.id);
    if (!seen.has(localId)) {
      meals.push({ ...meal, id: localId });
      seen.add(localId);
    }
  }

  return meals;
}

async function getCategories() {
  const data = await fetchJson(`${BASE_URL}/categories.php`);
  const remoteCategories = (data.categories || []).map((category) => ({
    id: category.idCategory,
    name: category.strCategory,
    thumb: category.strCategoryThumb,
    description: category.strCategoryDescription
  }));

  const localCategories = await getLocalCategories();
  return combineCategories(remoteCategories, localCategories);
}

async function getMealsByCategory(name) {
  const data = await fetchJson(`${BASE_URL}/filter.php?c=${encodeURIComponent(name)}`);
  const remoteMeals = normalizeMealList(data.meals || []);
  const localMeals = await getLocalMealsByCategory(name);
  return combineMeals(remoteMeals, localMeals);
}

async function searchMeals(query) {
  const data = await fetchJson(`${BASE_URL}/search.php?s=${encodeURIComponent(query)}`);
  const remoteMeals = normalizeMealList(data.meals || []);
  const localMeals = await searchLocalMeals(query);
  return combineMeals(remoteMeals, localMeals);
}

async function getRandomMeal() {
  const data = await fetchJson(`${BASE_URL}/random.php`);
  const meal = data.meals?.[0];
  return meal ? normalizeMealDetail(meal) : null;
}

async function getMealById(id) {
  const localInfo = parseLocalId(id);
  if (localInfo?.type === 'meal') {
    return getLocalMealById(localInfo.id);
  }

  const data = await fetchJson(`${BASE_URL}/lookup.php?i=${encodeURIComponent(id)}`);
  const meal = data.meals?.[0];
  return meal ? normalizeMealDetail(meal) : null;
}

app.get('/api/admin/categories', async (req, res) => {
  try {
    const categories = await getLocalCategories();
    res.json({ categories: categories.map(mapLocalCategory) });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load local categories.' });
  }
});

app.post('/api/admin/categories', async (req, res) => {
  try {
    const { name, thumb, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    const result = await dbRun(
      'INSERT INTO categories (name, thumb, description) VALUES (?, ?, ?)',
      [name.trim(), thumb || '', description || '']
    );

    const category = await dbGet('SELECT id, name, thumb, description FROM categories WHERE id = ?', [result.id]);
    res.status(201).json({ category: mapLocalCategory(category) });
  } catch (error) {
    res.status(500).json({ error: 'Unable to create category.' });
  }
});

app.delete('/api/admin/categories/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let numericId = parseInt(id, 10);
    if (Number.isNaN(numericId)) {
      const localInfo = parseLocalId(id);
      if (!localInfo || localInfo.type !== 'category') {
        return res.status(400).json({ error: 'Invalid category ID.' });
      }
      numericId = localInfo.id;
    }

    await dbRun('DELETE FROM categories WHERE id = ?', [numericId]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Unable to delete category.' });
  }
});

app.get('/api/admin/meals', async (req, res) => {
  try {
    const meals = await dbAll(
      'SELECT id, name, category, area, thumbnail FROM meals ORDER BY name'
    );
    res.json({ meals: meals.map((meal) => ({ ...meal, id: formatLocalId('meal', meal.id) })) });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load local meals.' });
  }
});

app.get('/api/admin/meals/:id', async (req, res) => {
  try {
    const localId = parseLocalId(req.params.id);
    if (!localId) {
      return res.status(400).json({ error: 'Invalid local meal ID.' });
    }

    const meal = await getLocalMealById(localId);
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found.' });
    }

    res.json({ meal });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load local meal.' });
  }
});

app.post('/api/admin/meals', async (req, res) => {
  try {
    const {
      name,
      category,
      area,
      instructions,
      thumbnail,
      youtube,
      source,
      tags,
      ingredients
    } = req.body;

    if (!name || !name.trim() || !category || !category.trim()) {
      return res.status(400).json({ error: 'Meal name and category are required.' });
    }

    const result = await dbRun(
      'INSERT INTO meals (name, category, area, instructions, thumbnail, youtube, source, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name.trim(),
        category.trim(),
        area || '',
        instructions || '',
        thumbnail || '',
        youtube || '',
        source || '',
        Array.isArray(tags) ? tags.filter(Boolean).join(',') : (tags || '')
      ]
    );

    const mealId = result.id;
    const ingredientRows = Array.isArray(ingredients) ? ingredients : [];

    await Promise.all(
      ingredientRows
        .filter((item) => item.ingredient && item.ingredient.trim())
        .map((item) => dbRun(
          'INSERT INTO ingredients (meal_id, ingredient, measure) VALUES (?, ?, ?)',
          [mealId, item.ingredient.trim(), item.measure || '']
        ))
    );

    const meal = await getLocalMealById(mealId);
    res.status(201).json({ meal });
  } catch (error) {
    res.status(500).json({ error: 'Unable to create local meal.' });
  }
});

app.delete('/api/admin/meals/:id', async (req, res) => {
  try {
    const localId = parseLocalId(req.params.id);
    if (!localId) {
      return res.status(400).json({ error: 'Invalid local meal ID.' });
    }

    await dbRun('DELETE FROM meals WHERE id = ?', [localId]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Unable to delete local meal.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await getCategories();
    res.json({ categories });
  } catch (error) {
    res.status(502).json({ error: 'Unable to load categories.' });
  }
});

app.get('/api/categories/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const meals = await getMealsByCategory(name);
    res.json({ meals });
  } catch (error) {
    res.status(502).json({ error: 'Unable to load meals for this category.' });
  }
});

app.get('/api/meals/search', async (req, res) => {
  try {
    const query = (req.query.q || '').toString().trim();
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required.' });
    }
    const meals = await searchMeals(query);
    res.json({ meals });
  } catch (error) {
    res.status(502).json({ error: 'Search failed.' });
  }
});

app.get('/api/meals/random', async (req, res) => {
  try {
    const meal = await getRandomMeal();
    res.json({ meal });
  } catch (error) {
    res.status(502).json({ error: 'Could not fetch a random meal.' });
  }
});

app.get('/api/meals/:id', async (req, res) => {
  try {
    const meal = await getMealById(req.params.id);
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found.' });
    }
    res.json({ meal });
  } catch (error) {
    res.status(502).json({ error: 'Could not fetch meal details.' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

import { useEffect, useState, useCallback } from 'react';
import { Plus, Heart, Clock, Users, ChefHat, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const CATEGORIES = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Chai & Drinks', 'Dessert'];

export default function RecipesPage() {
  const { user } = useAuth();
  const { lastUpdateTick } = useSocket();
  const [recipes, setRecipes] = useState([]);
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    title: '',
    category: 'Dinner',
    prepTime: 10,
    cookTime: 20,
    servings: 2,
    difficulty: 'Easy',
    ingredients: [{ name: '', qty: '' }],
    steps: [''],
    tips: '',
  });

  const loadRecipes = useCallback(async () => {
    try {
      const { data } = await api.get(`/recipes?category=${encodeURIComponent(category)}`);
      setRecipes(data.recipes || []);
    } catch {
      toast.error('Failed to load recipes');
    }
  }, [category]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes, lastUpdateTick]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/recipes', form);
      toast.success('Recipe added to Room Kitchen!');
      setModalOpen(false);
      setForm({
        title: '',
        category: 'Dinner',
        prepTime: 10,
        cookTime: 20,
        servings: 2,
        difficulty: 'Easy',
        ingredients: [{ name: '', qty: '' }],
        steps: [''],
        tips: '',
      });
      loadRecipes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save recipe');
    }
  };

  const handleLike = async (id, e) => {
    e.stopPropagation();
    try {
      await api.post(`/recipes/${id}/like`);
      loadRecipes();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this recipe?')) return;
    try {
      await api.delete(`/recipes/${id}`);
      if (selected?._id === id) setSelected(null);
      loadRecipes();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Room Kitchen Recipes</h2>
          <p className="text-sm text-slate-500">Apni special room recipes save aur share karo</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Recipe
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              category === c
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Recipe Grid */}
      {recipes.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-sm">
          No recipes yet. Add your famous Paneer Bhurji, Maggi, or Dal Tadka!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recipes.map((r) => {
            const liked = r.likes?.includes(user?._id);
            return (
              <div
                key={r._id}
                onClick={() => setSelected(r)}
                className="card p-5 hover:shadow-md hover:border-indigo-200 transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      {r.category}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">{r.difficulty}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{r.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {r.prepTime + r.cookTime} min
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {r.servings} servings
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                    <ChefHat className="w-3.5 h-3.5 text-indigo-500" /> {r.createdBy?.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleLike(r._id, e)}
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
                        liked ? 'text-rose-600 bg-rose-50' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-rose-600' : ''}`} />
                      {r.likes?.length || 0}
                    </button>
                    <button
                      onClick={(e) => handleDelete(r._id, e)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recipe Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-indigo-600">{selected.category}</span>
                <h3 className="text-xl font-extrabold text-slate-900">{selected.title}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Chef: {selected.createdBy?.name} • Prep {selected.prepTime}m + Cook {selected.cookTime}m • {selected.servings} servings
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h4 className="font-bold text-sm text-slate-900 mb-2">Ingredients</h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {selected.ingredients.map((ing, i) => (
                  <li key={i} className="text-sm text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg">
                    <b>{ing.name}</b> {ing.qty ? `— ${ing.qty}` : ''}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-sm text-slate-900 mb-2">Cooking Steps</h4>
              <ol className="space-y-2 list-decimal list-inside text-sm text-slate-700">
                {selected.steps.map((st, i) => (
                  <li key={i} className="leading-relaxed">{st}</li>
                ))}
              </ol>
            </div>

            {selected.tips && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <b>Chef's Tip:</b> {selected.tips}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Recipe Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add New Room Recipe</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Recipe Title</label>
                <input
                  required
                  className="input-field"
                  placeholder="e.g. Hostel Style Masala Maggi"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    className="input-field"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prep (min)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.prepTime}
                    onChange={(e) => setForm({ ...form, prepTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cook (min)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.cookTime}
                    onChange={(e) => setForm({ ...form, cookTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Servings</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={form.servings}
                    onChange={(e) => setForm({ ...form, servings: e.target.value })}
                  />
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">Ingredients</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, ingredients: [...form.ingredients, { name: '', qty: '' }] })}
                    className="text-xs font-semibold text-indigo-600"
                  >
                    + Add Ingredient
                  </button>
                </div>
                <div className="space-y-2">
                  {form.ingredients.map((ing, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-2">
                      <input
                        placeholder="Ingredient (e.g. Onion)"
                        className="input-field col-span-3 py-2"
                        value={ing.name}
                        onChange={(e) => {
                          const next = [...form.ingredients];
                          next[idx].name = e.target.value;
                          setForm({ ...form, ingredients: next });
                        }}
                      />
                      <input
                        placeholder="Qty (2 medium)"
                        className="input-field col-span-2 py-2"
                        value={ing.qty}
                        onChange={(e) => {
                          const next = [...form.ingredients];
                          next[idx].qty = e.target.value;
                          setForm({ ...form, ingredients: next });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">Steps</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, steps: [...form.steps, ''] })}
                    className="text-xs font-semibold text-indigo-600"
                  >
                    + Add Step
                  </button>
                </div>
                <div className="space-y-2">
                  {form.steps.map((st, idx) => (
                    <input
                      key={idx}
                      placeholder={`Step ${idx + 1}...`}
                      className="input-field py-2"
                      value={st}
                      onChange={(e) => {
                        const next = [...form.steps];
                        next[idx] = e.target.value;
                        setForm({ ...form, steps: next });
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chef Tips (Optional)</label>
                <input
                  className="input-field"
                  placeholder="Secret masala tip..."
                  value={form.tips}
                  onChange={(e) => setForm({ ...form, tips: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Recipe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

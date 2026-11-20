const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    qty: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const recipeSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    category: {
      type: String,
      enum: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Chai & Drinks', 'Dessert'],
      default: 'Dinner',
    },
    prepTime: { type: Number, default: 10, min: 0 },
    cookTime: { type: Number, default: 20, min: 0 },
    servings: { type: Number, default: 2, min: 1 },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
    ingredients: { type: [ingredientSchema], default: [] },
    steps: { type: [String], default: [] },
    tips: { type: String, trim: true, maxlength: 400, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recipe', recipeSchema);

const express = require('express');
const Recipe = require('../models/Recipe');
const { protect, requireRoom } = require('../middleware/auth');
const { sendRoomNotification } = require('../utils/notify');

const router = express.Router();

// GET /api/recipes
router.get('/', protect, requireRoom, async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { room: req.user.room };
    if (category && category !== 'All') filter.category = category;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const recipes = await Recipe.find(filter)
      .populate('createdBy', 'name avatarColor')
      .sort({ createdAt: -1 });

    res.json({ recipes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/recipes
router.post('/', protect, requireRoom, async (req, res) => {
  try {
    const { title, category, prepTime, cookTime, servings, difficulty, ingredients, steps, tips } = req.body;
    if (!title) return res.status(400).json({ message: 'Recipe title is required' });

    const recipe = await Recipe.create({
      room: req.user.room,
      title: title.trim(),
      category: category || 'Dinner',
      prepTime: Number(prepTime) || 10,
      cookTime: Number(cookTime) || 20,
      servings: Number(servings) || 2,
      difficulty: difficulty || 'Easy',
      ingredients: Array.isArray(ingredients) ? ingredients.filter((i) => i.name?.trim()) : [],
      steps: Array.isArray(steps) ? steps.filter((s) => s?.trim()) : [],
      tips: tips || '',
      createdBy: req.user._id,
    });

    const populated = await Recipe.findById(recipe._id).populate('createdBy', 'name avatarColor');

    await sendRoomNotification(req, {
      roomId: req.user.room,
      actorId: req.user._id,
      type: 'recipe',
      title: `New Recipe: ${populated.title}`,
      message: `${req.user.name} shared a ${populated.category} recipe "${populated.title}".`,
      meta: { recipeId: recipe._id },
    });

    res.status(201).json({ recipe: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/recipes/:id/like
router.post('/:id/like', protect, requireRoom, async (req, res) => {
  try {
    const recipe = await Recipe.findOne({ _id: req.params.id, room: req.user.room });
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });

    const uid = req.user._id.toString();
    const alreadyLiked = recipe.likes.some((id) => id.toString() === uid);
    if (alreadyLiked) {
      recipe.likes = recipe.likes.filter((id) => id.toString() !== uid);
    } else {
      recipe.likes.push(req.user._id);
    }
    await recipe.save();

    const populated = await Recipe.findById(recipe._id).populate('createdBy', 'name avatarColor');
    res.json({ recipe: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/recipes/:id
router.delete('/:id', protect, requireRoom, async (req, res) => {
  try {
    const recipe = await Recipe.findOneAndDelete({ _id: req.params.id, room: req.user.room });
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });
    res.json({ message: 'Recipe deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

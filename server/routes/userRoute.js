// routes/usersRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getSystemKeys,
} = require('../controllers/userController');

// Every route in this file is CEO-only.
router.use(authMiddleware);
router.use(requireRole('ceo'));

// Keys route MUST be before /:id
router.get('/keys', getSystemKeys);

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(deleteUser);

module.exports = router;
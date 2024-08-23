const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('DB Connected!'))
  .catch(err => console.log('DB Connection Error: ', err));

// User schema and model
const exerciseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: false }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  exercises: [exerciseSchema]
});

const User = mongoose.model('User', userSchema);

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = new User({ username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    res.json({ error: 'Failed to create user' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.json({ error: 'Failed to get users' });
  }
});

// Add exercise to a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;
    const exerciseDate = date ? new Date(date) : new Date();

    const user = await User.findById(_id);
    if (!user) return res.json({ error: 'User not found' });

    const newExercise = {
      description,
      duration: parseInt(duration),
      date: exerciseDate
    };

    user.exercises.push(newExercise);
    await user.save();

    res.json({
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString(),
      _id: user._id
    });
  } catch (err) {
    res.json({ error: 'Failed to add exercise' });
  }
});

// Get user logs
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    const user = await User.findById(_id);
    if (!user) return res.json({ error: 'User not found' });

    let logs = user.exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    }));

    if (from) {
      const fromDate = new Date(from);
      logs = logs.filter(log => new Date(log.date) >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      logs = logs.filter(log => new Date(log.date) <= toDate);
    }

    if (limit) {
      logs = logs.slice(0, parseInt(limit));
    }

    res.json({
      username: user.username,
      count: logs.length,
      _id: user._id,
      log: logs
    });
  } catch (err) {
    res.json({ error: 'Failed to get logs' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});

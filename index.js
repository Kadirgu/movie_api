const express = require("express");
const res = require("express/lib/response");
morgan = require('morgan');

const path = require("path")
const app = express();
const PORT = 5000;
const uuid = require('uuid');
const bodyParser = require('body-parser');

const mongoose = require('mongoose');
const Models = require('./models.js');
const { check, validationResult } = require('express-validator');

const Movies = Models.Movie;
const Users = Models.User;
const bcrypt = require('bcrypt');

mongoose.connect('mongodb://localhost:27017/myFlixDB', { useUnifiedTopology: true });


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let auth = require('./auth')(app);
const passport = require('passport');
require('./passport');

const cors = require('cors');
app.use(cors());

let allowedOrigins = ['http://localhost:3000', 'http://testsite.com'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) { // If a specific origin isn’t found on the list of allowed origins
      let message = 'The CORS policy for this application doesn’t allow access from origin ' + origin;
      return callback(new Error(message), false);
    }
    return callback(null, true);
  }
}));

/* rest of code goes here*/

// READ to return all movies to user
app.get('/movies', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.find()
    .then((movies) => {
      res.status(200).json(movies);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//For returning data about a single movie
app.get('/movies/:title', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.findOne({ Title: req.params.title })
    .then((movie) => {
      if (movie) {
        res.status(200).json(movie);
      }
      else {
        res.status(404).send('Movie is not in the database!');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//For returning data about a genre
app.get('/movies/genres/:genrename', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.findOne({ 'Genre.Name': new RegExp(`^${req.params.genrename}$`, 'i') })
    .then((movie) => {
      if (movie) {
        res.status(200).json(movie.Genre);
      }
      else {
        res.status(404).send('Genre is not in the database!');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//For returning data about a director by name
app.get('/movies/directors/:name', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.findOne({ 'Director.Name': req.params.name })
    .then((movie) => {
      if (movie) {
        res.status(200).json(movie.Director)
      }
      else {
        res.status(404).send('Director is not in the database!')
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//CREATE For allowing new users to register
app.post("/users", (req, res) => {
  let hashedPassword = Users.hashPassword(req.body.Password);
  Users.findOne({ Username: req.body.Username })
    .then((user) => {
      console.log(user);
      if (user) {
        return res.status(400).send(req.body.Username + "already exists");
      } else {
        Users.create({
          Username: req.body.Username,
          Password: hashedPassword,
          Email: req.body.Email,
          Birthday: req.body.Birthday,
        })
          .then((user) => {
            res.status(201).json(user);
          })
          .catch((error) => {
            console.error(error);
            res.status(500).send("Error: " + error);
          });
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("Error: " + error);
    });
});

//For allowing users to UPDATE their user info
app.put('/users/update/:id', (req, res) => {
  let userId = users.findIndex((u) => u.id == req.params.id);
  users.slice(userId, 1, { ...req.body });
  res.send('Changes saved successfully!');
  res.send(users);
});

//For allowing users to add a movie to their list of favorite movies
app.post('/favourite/add/:id', (req, res) => {
  const user = users.find((u) => u.id == req.params.id);
  user.favMovies.push(req.body);
  res.send('Request was successful')
});


//For allowing users to remove a movie from their list of favorites movies-text
app.delete('/users/:username/:movietitle', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.findOne({ Title: req.params.movietitle })
    .then((movie) => {
      if (movie) {
        Users.findOneAndUpdate({ Username: req.params.username }, {
          $pull: { FavoriteMovies: movie.id }
        },
          { new: true })
          .then((updatedUser) => {
            if (updatedUser) {
              res.status(200).json(updatedUser);
            }
            else {
              res.status(404).send('User is not in the database!');
            }
          })
          .catch((err) => {
            res.status(500).send('Error: ' + err);
          });
      }
      else {
        return res.status(400).send(req.params.movietitle + ' does not exist in the database!');
      }
    })
    .catch((err) => {
      res.status(500).send('Error: ' + err);
    });
});

//For allowing existing users to deregister-text
app.delete('/users/:username', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndRemove({ Username: req.params.username })
    .then((user) => {
      if (!user) {
        res.status(400).send(req.params.username + ' was not found');
      }
      else {
        res.status(200).send(req.params.username + ' was deleted');
      }
    })
    .catch((err) => {
      res.status(500).send('Error: ' + err);
    });
});

//GET request for returning the personal message
app.get("/", (req, res) => {
  res.send("welcome to my flix")
})

app.get("/documentation", (req, res) => {
  res.sendFile(path.join(__dirname, '/public/documentation.html'));
})

//GET request for returning the JSON movie data
app.get('/movies', (req, res) => {
  res.json(movies);
});

//GET request for returning default response
app.get('/', (req, res) => {
  res.send('Welcome to the Top 10 Movies List!');
});

//Using the Morgan middleware library to log all requests
app.use(morgan('common'));
app.use(express.json());

//Using express.static to serve the documentation.html file
app.use(express.static('public'));

//Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Oops!Something Went Wrong!');
});

//Listen for request

//app.listen(PORT, ()=>console.log("App is running"));

const port = 3000;
app.listen(port, '0.0.0.0', () => {
  console.log('Listening on Port ' + port);
});
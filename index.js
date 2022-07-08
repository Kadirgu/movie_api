const express = require("express");
const dotenv = require("dotenv");
morgan = require("morgan");
const bodyParser = require("body-parser");

const path = require("path");
const app = express();

const mongoose = require("mongoose");
require("dotenv").config();
const Models = require("./models.js");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//importing CORS
const cors = require("cors");
app.use(cors());
app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.header("Access-Control-Allow-Credentials", true);
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PATCH, DELETE, OPTIONS');
  next();
});

const Movies = Models.Movie;
const Users = Models.User;

dotenv.config();

mongoose.connect(process.env.CONNECTION_URI, { useUnifiedTopology: true });

let auth = require("./auth")(app);
const passport = require("passport");
require("./passport");


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
      console.info(user);
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

// Get all users
app.get('/users', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.find()
    .then((users) => {
      res.status(201).json(users);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// Get a user by username
app.get('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOne({ Username: req.params.Username })
    .then((user) => {
      res.json(user);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// Update a user's info, by username

app.put('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, {
    $set:
    {
      Username: req.body.Username,
      Password: req.body.Password,
      Email: req.body.Email,
      Birthday: req.body.Birthday
    }
  },
    { new: true }, // This line makes sure that the updated document is returned
    (err, updatedUser) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error: ' + err);
      } else {
        res.json(updatedUser);
      }
    });
});

// Add a movie to a user's list of favorites
app.post('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, {
    $push: { FavoriteMovies: req.params.MovieID }
  },
    { new: true }, // This line makes sure that the updated document is returned
    (err, updatedUser) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error: ' + err);
      } else {
        res.json(updatedUser);
      }
    });
});

// Allows user to delete movie from favorites
app.delete(
  "/users/:Username/movies/:MovieID", passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Movies.findOne({ _id: req.params.MovieID })
      .then((movie) => {
        if (movie) {
          Users.findOneAndUpdate(
            { Username: req.params.Username },
            {
              $pull: { FavoriteMovies: movie._id },
            },
            { new: true }
          )
            .then((updatedUser) => {
              if (updatedUser) {
                res.status(200).json(updatedUser);
              } else {
                res.status(404).send("User is not in the database!");
              }
            })
            .catch((err) => {
              res.status(500).send("Error: " + err);
            });
        } else {
          return res.status(400).send("Movie does not exist in the database!");
        }
      })
      .catch((err) => {
        res.status(500).send("Error: " + err);
      });
  }
);

// Delete a user by username
app.delete('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndRemove({ Username: req.params.Username })
    .then((user) => {
      if (!user) {
        res.status(400).send(req.params.Username + ' was not found');
      } else {
        res.status(200).send(req.params.Username + ' was deleted.');
      }
    })
    .catch((err) => {
      console.error(err);
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

const port = process.env.PORT || 2222;
app.listen(port, '0.0.0.0', () => {
  console.info('Listening on Port ' + port);
});
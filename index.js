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

mongoose.connect('mongodb://localhost:8080/myFlixDB', {userNewUrlParser: true, useUnifiedTopology: true });
// Note: was localhost:27017 and I changed it to 8080. Is this a problem)

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const cors = require('cors');
app.use(cors());

/* rest of code goes here*/

let userSchema = mongoose.Schema({
  Username: {type: String, required: true},
  Password: {type: String, required: true},
  Email: {type: String, required: true},
  Birthday: Date,
  FavoriteMovies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }]
});

userSchema.statics.hashPassword = (password) => {
  return bcrypt.hashSync(password, 10);
};

userSchema.methods.validatePassword = function(password) {
  return bcrypt.compareSync(password, this.Password);
};

let auth = require('./auth')(app);
const passport = require('passport');
require('./passport');


// READ to return all movies to user
app.get('/movies', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.find()
  .then((movies) => {
    res.status(201).json(movies);
  })
  .catch((err)) => {
    console.error(err); 
    res.status(500).send('Error:  ' + err);
});

//For returning data about a single movie
app.get('/movies/title/:title', (req, res) => {
  const movie = movies.find((m)=> m.title == req.params.title);
  res.send('Request was successful');
});

//For returning data about a genre
app.get('/movies/genre/:genre', (req, res) => {
  const movies_ = movies.filter((m)=> m.genre == req.params.genre);
  res.send('Request was successful');
});

//For returning data about a director by name
app.get('/movies/director/:director', (req, res) => {
  const director = movies.filter((m)=> m.director == req.params.director);
  res.send('Request was successful');
});

//CREATE For allowing new users to register
app.post('/users/register', (req, res) => {
  users.push(req.body);
  res.send('Registration Successful!');
});
app.get('/users', (req, res) => {
  res.send(users);
});

//For allowing users to UPDATE their user info
app.put('/users/update/:id', (req, res) => {
  let userId =  users.findIndex((u)=>u.id==req.params.id);
  users.slice(userId,1, {...req.body});
  res.send('Changes saved successfully!');
  res.send(users);
});

//For allowing users to add a movie to their list of favorite movies
app.post('/favourite/add/:id', (req, res) => {
  const user = users.find((u) => u.id ==req.params.id);
  user.favMovies.push(req.body);
  res.send('Request was successful')
});

app.post('/users', (req, res) => {
  let hashedPassword = Users.hashPassword(req.body.Password);
  Users.findOne({ Username: req.body.Username }) // Search to see if a user with the requested username already exists
    .then((user) => {
      if (user) {
      //If the user is found, send a response that it already exists
        return res.status(400).send(req.body.Username + ' already exists');
      } else {
        Users
          .create({
            Username: req.body.Username,
            Password: hashedPassword,
            Email: req.body.Email,
            Birthday: req.body.Birthday
          })
          .then((user) => { res.status(201).json(user) })
          .catch((error) => {
            console.error(error);
            res.status(500).send('Error: ' + error);
          });
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error: ' + error);
    });
});

//For allowing users to remove a movie from their list of favorites movies-text
app.delete('/favourite/delete/:id/:title', (req, res) => {
  const user = users.find((u) => u.id ==req.params.id);
  const favs = user.favMovies.filter((m)=>m.title != req.params.title)
  user.favMovies = [...favs];
  res.send('Favorite has been removed')
});

//For allowing existing users to deregister-text
app.delete('/users/deregister/:id', (req, res) => {
  users.filter((m) => m.id !=req.params.id);
  res.send('User details successfully removed!')
});

//GET request for returning the personal message
app.get("/", (req, res)=>{
    res.send("welcome to my flix")
})

app.get("/documentation", (req, res)=>{
    res.sendFile(path.join(__dirname,'/public/documentation.html'));
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

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0',() => {
 console.log('Listening on Port ' + port);
});

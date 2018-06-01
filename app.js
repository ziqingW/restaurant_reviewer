const express = require('express');
const pgp = require('pg-promise')({});
const db = pgp(process.env.DATABASE_URL);
const nunjucks = require('nunjucks');
const app = express();
const body_parser = require('body-parser');
const session = require('express-session');
const morgan = require('morgan');
const pbkdf2 = require('pbkdf2');
const crypto = require('crypto');

app.use(morgan('dev'));
nunjucks.configure('views', {
    autoescape: true,
    express: app,
    noCache: true
});
//get port
app.set('port', (process.env.PORT || 8000));
app.use(express.static('public'));
app.use(body_parser.urlencoded({extended: false}));
app.use(session({
  secret: process.env.SECRET_KEY || 'dev',
  resave: true,
  saveUninitialized: false,
  cookie: {maxAge: 6000000}
}));
//main page
app.get("/", function(req,resp){
    resp.render('home.html', {user: req.session.user});
});
//login page
app.get('/login', function (request, response) {
  response.render('login.html', {user: request.session.user});
});

app.post('/login', function (request, response, next) {
  let username = request.body.username;
  let password = request.body.password;
  let q = "SELECT * FROM reviewer WHERE name = ${username}";
  var message; 
  db.query(q, {username: username})
    .then( results => {
        if(results.length > 0) {
            let passParts = results[0].password.split('$');
            let key = pbkdf2.pbkdf2Sync(password, passParts[2], parseInt(passParts[1]), 256, 'sha256');
            let hash = key.toString('hex');
            if (hash === passParts[3]) {
                request.session.user = username;
                request.session.reviewerId = results[0].id;
                response.redirect('/');
                } else {
                message = "Incorrect password";
                response.render('login.html', {user: request.session.user, message: message});
                }
        } else {
            message = "User nonexisted";
            response.render('login.html', {user: request.session.user, message: message});
        }    
    })
    .catch(next);
});
//log off page
app.get('/logoff', function(req, resp){
   req.session.user = "";
   req.session.id = 0;
   resp.redirect('/');
});
//signup page
app.get('/signup', function(req, resp) {
    resp.render('signup.html');
});
app.post('/signup', function(req, resp, next) {
    let name = req.body.username;
    let password = req.body.password;
    let rePassword = req.body.repassword;
    let q = "SELECT * FROM reviewer WHERE name = ${username}";
    var message;
    db.query(q, {username: name})
        .then( results => {
            if (results.length === 0) {
                if (password == rePassword) {
                    let salt = crypto.randomBytes(20).toString('hex');
                    let key = pbkdf2.pbkdf2Sync(password, salt, 36000, 256, 'sha256');
                    let hash = key.toString('hex');
                    let stored_pass = `pbkdf2_sha256$36000$${salt}$${hash}`;
                db.query('INSERT INTO reviewer (id, name, password) VALUES (DEFAULT, ${username}, ${password}) RETURNING reviewer.id', {username: name, password: stored_pass})
                    .then( val => {
                        req.session.reviewerId = val[0].id;
                        req.session.user = name;
                        resp.redirect('/');
                    });
                } else {
                    message = "Password not consistent";
                    resp.render('signup.html', {message: message});
                }
            } else {
                message = "User existed, choose other username";
                resp.render('signup.html', {message: message});
            }
        })
        .catch(next);
});
//search result page by name
app.get("/search", function(req, resp, next){
    let searchTerm = req.query.searchTerm;
    let term = `%${searchTerm}%`;
    let q = "SELECT * FROM restaurant WHERE name ilike $1 ORDER BY name";
    db.query(q, term)
        .then( results => {
            resp.render('search_results.html', {user: req.session.user, results: results, searchTerm: searchTerm});
        })
        .catch(next);
});
//individual restaurant page
app.get("/restaurant/:id", function(req, resp, next){
    console.log(req.session.reviewerId, req.session.user);
    let id = parseInt(req.params.id, 10);
    let q_info = "SELECT * FROM restaurant WHERE id=$1";
    let q_review = `SELECT reviewer.name AS reviewer_name, review.id AS review_id, review.stars AS review_star, title, review \
FROM restaurant INNER JOIN review ON restaurant.id=review.restaurant_id JOIN reviewer ON review.reviewer_id=reviewer.id WHERE restaurant.id=$1`;
    var restaurant_info, review_result;
    db.query(q_info, id)
        .then( result => {
            restaurant_info = result[0];
            return db.query(q_review, id);
        })
        .then( result => {
            review_result = result;
            resp.render("restaurant.html", {user: req.session.user, info: restaurant_info, reviews: review_result});
        })
        .catch(next);
});
//user submit review
app.post("/submit", function(req, resp, next){
  if (!req.session.user) {
    resp.redirect('/login');
  } else{
  let title = req.body.title;
  let review = req.body.review;
  let id = req.body.restaurant;
  let reviewstars = req.body.reviewstar;
  let reviewerId = req.session.reviewerId;
  let q = "INSERT INTO review VALUES (DEFAULT, ${reviewerid}, ${reviewstar}, ${title}, ${review}, ${id})";
  db.query(q, {reviewerid: reviewerId, reviewstar: reviewstars, title: title, review: review, id: id})
    .then(() => {
        resp.redirect(`/restaurant/${id}`);      
    })
    .catch(next);
  }
});
//add new restaurant
app.get('/new_restaurant', function(req, resp, next) {
    resp.render('new_restaurant.html', {user: req.session.user});
});
//user added new restaurant
app.post('/new_restaurant/submit', function(req, resp, next) {
      if (!req.session.user) {
    resp.redirect('/login');
    } else{
    let name = req.body.new_name;
    let address = req.body.address;
    let category = req.body.category;
    let stars = req.body.stars;
    let favorite = req.body.dish;
    let q ="INSERT INTO restaurant (id, name, stars, favourite_dish, category, address) VALUES (DEFAULT, ${name}, ${stars}, ${dish}, ${category}, ${address}) RETURNING id";
    db.query(q, {name: name, stars: stars, dish: favorite, category: category, address: address})
        .then(result => {
            resp.redirect(`/restaurant/${result[0].id}`);
        })
        .catch(next);
    }
});

app.listen(app.get('port'), function(){
    console.log("Server starting on port...", app.get('port'));
});
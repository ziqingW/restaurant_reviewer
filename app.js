const express = require('express');
const pgp = require('pg-promise')({});
const db = pgp({
    database: 'restaurant',
    user: "postgres",
    host: "localhost"
});
const nunjucks = require('nunjucks');
const app = express();
const body_parser = require('body-parser');
nunjucks.configure('views', {
    autoescape: true,
    express: app,
    noCache: true
});

app.use(express.static('public'));
app.use(body_parser.urlencoded({extended: false}));
//main page
app.get("/", function(req,resp){
    resp.render('home.html');
});
//search result page by name
app.get("/search", function(req, resp, next){
    let searchTerm = req.query.searchTerm;
    let term = `%${searchTerm}%`;
    let q = "SELECT * FROM restaurant WHERE name ilike $1 ORDER BY name";
    db.query(q, term)
        .then( results => {
            resp.render('search_results.html', {results: results, searchTerm: searchTerm});
        })
        .catch(next);
});
//individual restaurant page
app.get("/restaurant/:id", function(req, resp, next){
    let id = parseInt(req.params.id, 10);
    let q_info = "SELECT * FROM restaurant WHERE id=$1";
    let q_review = `SELECT review.id AS review_id, review.stars AS review_star, title, review \
FROM restaurant INNER JOIN review ON restaurant.id=review.restaurant_id WHERE restaurant.id=$1`;
    var restaurant_info, review_result;
    db.query(q_info, id)
        .then( result => {
            restaurant_info = result[0];
            return db.query(q_review, id);
        })
        .then( result => {
            review_result = result;
            resp.render("restaurant.html", {info: restaurant_info, reviews: review_result});
        })
        .catch(next);
});
//user submit review
app.post("/submit", function(req, resp, next){
  let title = req.body.title;
  let review = req.body.review;
  let id = req.body.restaurant;
  let q = "INSERT INTO review VALUES (DEFAULT, null, 3, ${title}, ${review}, ${id})";
  db.query(q, {title: title, review: review, id: id})
    .then(() => {
        resp.redirect(`/restaurant/${id}`);      
    })
    .catch(next);
});
//add new restaurant
app.get('/new_restaurant', function(req, resp, next) {
    resp.render('new_restaurant.html');
});
//user added new restaurant
app.post('/new_restaurant/submit', function(req, resp, next) {
    let name = req.body.new_name;
    let address = req.body.address;
    let category = req.body.category;
    let q ="INSERT INTO restaurant (id, name, category, address) VALUES (DEFAULT, ${name}, ${category}, ${address}) RETURNING id";
    db.query(q, {name: name, category: category, address: address})
        .then(result => {
            resp.redirect(`/restaurant/${result[0].id}`);
        })
        .catch(next);
});


app.listen(8000, function(){
    console.log("Server starting on port 8000...");
});
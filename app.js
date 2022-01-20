//jshint esversion:6

//Dependencies
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const app = express();

//Google OAuth
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

//Initialize authentication
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

//Setting up the view engine
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended: true
}));


//Initialize session
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

//Initialize passport
app.use(passport.initialize());
app.use(passport.session());

//Connect to the database
//mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });
mongoose.connect(process.env.DATABSEURL, { useNewUrlParser: true });

//Create a schema for the user
const userSchema = new mongoose.Schema( {
    email: String,
    password: String,
    googleId: String,
    secret: String
});

//Implementing passport
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//Creating a model for the user
const User = new mongoose.model("User", userSchema);

//Serialize and deserialize the user
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

//Set up passport to use oauth from google

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


//Route for the start page
app.get("/", function(req, res) {
    res.render("home");
});

//Route for Google OAuth
app.get("/auth/google", passport.authenticate("google", {
    scope: ["profile"] })


);

//Route for Google OAuth callback
app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

//Route for the login page
app.get("/login", function(req, res) {
    res.render("login");
});

//Route for the register page
app.get("/register", function(req, res) {
    res.render("register");
});

//Route for the secrets page
app.get("/secrets", function(req, res) {
   User.find({"secret": {$ne: null}}, function(err, foundUsers) {
    if (err){
        console.log(err);
    } else {
        if (foundUsers) {
            res.render("secrets", {usersWithSecrets: foundUsers})
        }
    }
   });
});

//Route for the submit page
app.get("/submit", function(req, res) {
    if (req.isAuthenticated()) {
    res.render("submit");
    } else {
        res.redirect("/login");
    }

});

//Route for the logout page
app.get("/logout", function(req, res) {
    req.logout();
    res.redirect("/");
});

//Route for the register page
app.post("/register", function(req, res) {
    const username=req.body.username;
    const password=req.body.password;

    User.register({username: username}, password, function(err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
            } else {
                passport.authenticate("local")(req, res, function(){
                    res.redirect("/secrets")
                });
    }});
});


//Route for the login page
app.post("/login", function(req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err) {
        if (err) {
            console.log(err)
        }else{
                passport.authenticate("local")(req, res, function(){
                    res.redirect("/secrets")
        });
            }
        }
    );
});

app.post("/submit", function(req, res) {
    const submittedSecret=req.body.secret;

    //console.log(req.user.secret);

    User.findById(req.user.id, function(err, foundUser) {
        if(err){
            console.log(err);
        }else{
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
            }
        }
    })
});

//Listen for requests
app.listen(3000, function() {
    console.log("Server started on port 3000");
})
//jshint esversion:6

require('dotenv').config();
const express = require('express');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcrypt");
const saltRounds = 10;
const app = express();

app.use(express.static("public"));
app.set("view engine", 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));



mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });


const userSchema = new Schema( {
    email: String,
    password: String
});

const User = new mongoose.model("User", userSchema);

app.get("/", function(req, res) {
    res.render("home");
});

app.get("/login", function(req, res) {
    res.render("login");
});

app.get("/register", function(req, res) {
    res.render("register");
});



app.post("/register", function(req, res) {
    const myPlaintextPassword = req.body.password;

    bcrypt.hash(myPlaintextPassword, saltRounds, function(err, hash) {
        // Store hash in your password DB.
    
        const newUser = new User({
            email: req.body.username,
            password: hash
        });
    
        newUser.save(function(err) {
            if (err) {
                console.log(err);
            } else {
                res.render("secrets");
            }
        })
    });
});

app.post("/login", function(req, res) {
    const myPlaintextPassword = req.body.password;
    const username = req.body.username;

    User.findOne({ email: username },
        function(err, foundUser) {
            if (err) {
                console.log(err);
            } else {
                if (foundUser) {
                    const hash = foundUser.password;

                    bcrypt.compare(myPlaintextPassword, hash, function(err, result) {
                        // result == true
                        if (result) {
                            res.render("secrets");
                        }
                    });
                }
            }
        }
    )
});

app.listen(3000, function() {
    console.log("Server started on port 3000");
})
const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const bcrypt = require("bcrypt");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", `${__dirname}/views`);

//use session of module: express-session
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

//use passport of module: passport
app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    require: true,
  },
  password: {
    type: String,
    require: true,
  },
});

//use module: passport-local-mongoose to hash password (use with mongoose)
userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

//use module: passport-local-mongoose to serialized and deserialize
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

mongoose
  .connect("mongodb://localhost:27017/secretsDB")
  .then(() => console.log("MongoDB connected."))
  .catch((error) => console.error(error));

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.post("/register", (req, res) => {
  const { username, password } = req.body;
  User.register({ username }, password, (err, user) => {
    if (err) {
      console.log(err);
      res.redirect("/register");
    }

    passport.authenticate("local")(req, res, () => {
      res.redirect("/secrets");
    });
  });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = new User({
    username,
    password,
  });
  req.login(user, (err) => {
    if (err) {
      console.log(err);
      res.redirect("/login");
    }

    passport.authenticate("local")(req, res, () => {
      res.redirect("/secrets");
    });
  });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

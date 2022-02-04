const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const bcrypt = require("bcrypt");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const e = require("express");

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
  googleId: String,
  secret: String,
});

//use module: passport-local-mongoose to hash password (use with mongoose)
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

//serialized and deserialize with passport
passport.use(User.createStrategy());
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

mongoose
  .connect("mongodb://localhost:27017/secretsDB")
  .then(() => console.log("MongoDB connected."))
  .catch((error) => console.error(error));

app.get("/", (req, res) => {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/secrets", (req, res) => {
  User.find({ secret: { $ne: null } }, (err, foundUsers) => {
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", { usersWithSecrets: foundUsers });
      }
    }
  });
});

app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("submit");
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
      console.log(req.user);
    });
  });
});

app.post("/submit", (req, res) => {
  const submittedSecret = req.body.secret;
  User.findById(req.user.id, (err, foundUser) => {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(() => {
          res.redirect("/secrets");
        });
      }
    }
  });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

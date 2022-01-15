const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", `${__dirname}/views`);

const Schema = mongoose.Schema;
const userSchema = new Schema({
  email: {
    type: String,
    require: true,
  },
  password: {
    type: String,
    require: true,
  },
});

const User = mongoose.model("User", userSchema);
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

app.post("/register", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.send({ success: false, message: "Missing email and/or password." });
  }

  User.findOne({ email }).then((foundUser) => {
    if (foundUser) {
      res.send({ success: false, message: "This email already taken." });
    }
  });

  const newUser = new User({ email, password });
  newUser
    .save()
    .then(() => res.render("secrets"))
    .catch((error) => console.error(error));
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.send({ success: false, message: "Missing email and/or password." });
  }
  User.findOne({ email, password })
    .then((foundUser) => {
      if (!foundUser) {
        res.send({
          success: false,
          message: "Incorrect username and/or password.",
        });
      }
      res.render("secrets");
    })
    .catch((error) => console.error(error));
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

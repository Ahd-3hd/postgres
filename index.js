require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db");
const passport = require("passport");
const passportJWT = require("passport-jwt");
const JwtStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;
const parser = require("body-parser");
const knex = require("knex");
const knexDb = knex({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: "jwt_test",
  },
});
const bookshelf = require("bookshelf");
const securePassword = require("bookshelf-secure-password");
const jwt = require("jsonwebtoken");
const db = bookshelf(knexDb);
db.plugin(securePassword);
const opts = {
  jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.SECRET_OR_KEY,
};

const User = db.Model.extend({
  tableName: "login_user",
  hasSecurePassword: true,
});
const strategy = new JwtStrategy(opts, (payload, next) => {
  //get user from db
  User.forge({ id: payload.id })
    .fetch()
    .then((res) => {
      next(null, res);
    });
});

passport.use(strategy);
app.use(passport.initialize());
app.use(
  parser.urlencoded({
    extended: false,
  })
);
app.use(parser.json());
// middleware

app.use(cors());
app.use(express.json());

//user shit

app.post("/seedUser", (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(401).send("no fields");
  }
  const user = new User({
    email: req.body.email,
    password: req.body.password,
  });
  user.save().then(() => {
    res.send("ok");
  });
});

// create a todo

app.post("/todos", async (req, res) => {
  try {
    console.log(req.body);
    const { description } = req.body;
    const newTodo = await pool.query(
      "INSERT INTO todo (description) VALUES($1) RETURNING *",
      [description]
    );
    res.json(newTodo.rows[0]);
  } catch (error) {
    console.error(error.message);
  }
});

//get the token yo
app.post("/getToken", (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).send("Bad Credentials");
  }

  User.forge({ email: req.body.email })
    .fetch()
    .then((result) => {
      if (!result) {
        return res.status(400).send("user not found bro");
      }
      result
        .authenticate(req.body.password)
        .then((user) => {
          const payload = { id: user.id };
          const token = jwt.sign(payload, process.env.SECRET_OR_KEY);
          res.json(token);
        })
        .catch((err) => res.status(401).send({ err: err }));
    });
});

//get all todos
app.get(
  "/todos",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const allTodos = await pool.query("SELECT * FROM todo");
      res.json(allTodos.rows);
    } catch (error) {
      console.error(error.message);
    }
  }
);
// get a todo

app.get("/todos/:id", async (req, res) => {
  try {
    console.log(req.params);
    const { id } = req.params;
    const todo = await pool.query("SELECT * FROM todo WHERE todo_id = $1", [
      id,
    ]);
    res.json(todo.rows[0]);
  } catch (error) {
    console.error(error.message);
  }
});

//update a todo

app.put("/todos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;
    const updateTodo = await pool.query(
      "UPDATE todo SET description = $1 WHERE todo_id = $2",
      [description, id]
    );
    console.log(updateTodo);
    res.json("todo was updated");
  } catch (error) {
    console.error(error.message);
  }
});

//delete a todo

app.delete("/todos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleteTodo = await pool.query("DELETE FROM todo WHERE todo_id = $1", [
      id,
    ]);
    res.json("todo was deleted bro");
  } catch (error) {
    console.error(error.message);
  }
});

app.listen(5000, () => console.log("server started on 5000"));

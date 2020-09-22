require("dotenv").config();

// Update with your config settings.

module.exports = {
  development: {
    client: "pg",
    connection: {
      host: "127.0.0.1",
      user: process.env.USER,
      password: process.env.PASSWORD,
      database: "jwt_test",
    },
  },
};

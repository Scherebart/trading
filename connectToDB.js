const { knex: knexConfig } = require("./config");
const knex = require("knex");

/**
 * Returns Knex functions for communicating with the Sqlite DB
 */
module.exports = async () => {
  const connection = await knex(knexConfig);
  let transaction = null;

  const query = () => (transaction ?? connection)("candles");
  const selectQuery = () =>
    query()
      .select("timestamp", "O", "H", "L", "C")
      .orderBy("timestamp", "desc");

  return {
    query,
    selectQuery,
    async startTransaction() {
      transaction = await connection.transaction();
    },
    async commitTransaction() {
      await transaction.commit();
      transaction = null;
    },
    async rollbackTransaction() {
      await transaction.rollback();
      transaction = null;
    },
    async destroy() {
      return connection.destroy();
    },
  };
};

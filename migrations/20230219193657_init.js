/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  const query = knex.schema.createTable("candles", function (table) {
    table.timestamp("timestamp").unique();
    table.decimal("O", 8, 2);
    table.decimal("H", 8, 2);
    table.decimal("L", 8, 2);
    table.decimal("C", 8, 2);
  });

  return query
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("candles");
};

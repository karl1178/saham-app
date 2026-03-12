const db = require("../config/db");

const getFinancialByCode = (kodeSaham, callback) => {
  const query = `
        SELECT *
        FROM financial_reports
        WHERE kode_saham = ?
        ORDER BY tahun DESC
    `;

  db.query(query, [kodeSaham], callback);
};

module.exports = {
  getFinancialByCode,
};

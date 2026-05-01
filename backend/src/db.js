const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

async function waitForDB(retries = 15) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ Banco de dados conectado');
      return;
    } catch (e) {
      console.log(`⏳ Aguardando banco de dados... (${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error('Não foi possível conectar ao banco de dados');
}

module.exports = { query: (text, params) => pool.query(text, params), pool, waitForDB };

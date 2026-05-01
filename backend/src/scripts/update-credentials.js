/**
 * Script: update-credentials.js
 * Atualiza credenciais de acesso:
 *  - Admin: diogomanaus@gmail.com / admin@admin
 *  - Militares com acesso: email cadastrado / RG (ou identidade)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const db = require('../db');

async function run() {
  try {
    // 1. Hash da senha do admin
    const adminHash = await bcrypt.hash('admin@admin', 10);

    // 2. Remover registro antigo admin@pmam.am.gov.br
    await db.query(`DELETE FROM usuarios WHERE email = 'admin@pmam.am.gov.br'`);

    // 3. Inserir/atualizar admin com novo email
    await db.query(`
      INSERT INTO usuarios (nome, email, senha, perfil, ativo)
      VALUES ('Administrador DINATIV', 'diogomanaus@gmail.com', $1, 'admin', true)
      ON CONFLICT (email) DO UPDATE SET senha = EXCLUDED.senha, perfil = 'admin', ativo = true
    `, [adminHash]);
    console.log('✅ Admin atualizado: diogomanaus@gmail.com / admin@admin');

    // 4. Buscar militares com acesso que têm RG cadastrado
    const { rows: militares } = await db.query(`
      SELECT u.id, u.email, m.rg, m.nome
      FROM usuarios u
      JOIN militares m ON m.id = u.militar_id
      WHERE u.perfil = 'militar' AND u.ativo = true AND m.rg IS NOT NULL AND m.rg != ''
    `);

    if (militares.length === 0) {
      console.log('ℹ️  Nenhum militar com acesso e RG cadastrado encontrado.');
    }

    // 5. Atualizar senha de cada militar para o seu RG
    for (const mil of militares) {
      const rgLimpo = mil.rg.replace(/[^a-zA-Z0-9]/g, ''); // remove traços, pontos, espaços
      const hash = await bcrypt.hash(rgLimpo, 10);
      await db.query(`UPDATE usuarios SET senha = $1 WHERE id = $2`, [hash, mil.id]);
      console.log(`✅ Militar ${mil.nome} — email: ${mil.email} — senha: ${rgLimpo}`);
    }

    console.log('\n🎉 Credenciais atualizadas com sucesso!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    process.exit(0);
  }
}

run();

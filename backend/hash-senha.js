// Salve como backend/hash-senha.js
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

// Pega a senha do terminal
const senhaLimpa = process.argv[2];

if (!senhaLimpa) {
  console.error('Erro: Você precisa passar uma senha.');
  console.log('Uso: node hash-senha.js <senha_desejada>');
  process.exit(1);
}

// Gera o hash
bcrypt.hash(senhaLimpa, SALT_ROUNDS, (err, hash) => {
  if (err) {
    console.error('Erro ao gerar hash:', err);
    return;
  }

  console.log('--- Hash Gerado com Sucesso ---');
  console.log(`Senha Limpa: ${senhaLimpa}`);
  console.log(`Hash (Criptografado): ${hash}`);
  console.log('\n--- Copie e rode o SQL abaixo no seu XAMPP ---');
  console.log(
    `UPDATE usuario SET senha = '${hash}' WHERE nome_usuario = 'admin';`
  );
});
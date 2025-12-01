/*
* Este é um backend Node.js/Express 100% COMPLETO.
*
* CORREÇÃO: Rotas de Dashboard e Relatórios (Atend. Semana, No-Show)
* agora usam consultas SQL reais ao invés de dados simulados.
*/

// --- Dependências ---
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// --- Configuração ---
const app = express();
const port = 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'seu-segredo-super-secreto-aqui'; 
const saltRounds = 10;

app.use(cors());
app.use(express.json());

// --- Configuração do Banco de Dados ---
const DB_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 4000,
  ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};
const db = mysql.createPool(DB_CONFIG);
// --- Helpers ---
const sendError = (res, err, message = 'Erro interno do servidor') => {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, error: 'Violação de entrada duplicada (ex: CPF ou usuário já existe)' });
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
         return res.status(400).json({ success: false, error: 'Erro de chave estrangeira (ID de vínculo não encontrado)' });
    }
    if (err.message && (err.message.includes('inválido') || err.message.includes('obrigatório'))) {
         return res.status(400).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: message, details: err.message });
};

function validarCPF(cpf) {
    if (typeof cpf !== 'string') return false;
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    const digitos = cpf.split('').map(Number);
    const calcDigit = (sliceEnd) => {
        let soma = 0;
        for (let i = 0, j = sliceEnd + 1; i < sliceEnd; i++, j--) {
            soma += digitos[i] * j;
        }
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };
    const dv1 = calcDigit(9);
    if (dv1 !== digitos[9]) return false;
    const dv2 = calcDigit(10);
    if (dv2 !== digitos[10]) return false;
    return true;
}

// --- Middlewares ---
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401); 

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Erro de verificação de token:', err.message);
            return res.status(403).json({ success: false, error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.papel)) {
            return res.status(403).json({ success: false, error: 'Acesso não autorizado para este papel' });
        }
        next();
    };
};

// --- Rota de Autenticação ---
app.post('/api/login', async (req, res) => {
    try {
        const { nome_usuario, senha } = req.body;
        if (!nome_usuario || !senha) {
            return res.status(400).json({ success: false, error: 'Nome de usuário e senha são obrigatórios' });
        }
        const [rows] = await db.query('SELECT * FROM usuario WHERE nome_usuario = ?', [nome_usuario]);
        const user = rows[0];
        if (!user) {
            return res.status(401).json({ success: false, error: 'Usuário não encontrado' });
        }
        const match = await bcrypt.compare(senha, user.senha);
        if (!match) {
            await db.query('INSERT INTO log_acesso (id_usuario, acao, ip_origem) VALUES (?, ?, ?)', [user.id_usuario, 'Tentativa de Login Falhou', req.ip]);
            return res.status(401).json({ success: false, error: 'Senha incorreta' });
        }
        
        try {
            await db.query('INSERT INTO log_acesso (id_usuario, acao, ip_origem) VALUES (?, ?, ?)', [user.id_usuario, 'Login com Sucesso', req.ip]);
            await db.query('UPDATE usuario SET ultimo_acesso = CURRENT_TIMESTAMP WHERE id_usuario = ?', [user.id_usuario]);
        } catch (logErr) {
            console.error("Erro ao registrar log de login:", logErr);
        }

        const tokenPayload = { id_usuario: user.id_usuario, nome_usuario: user.nome_usuario, papel: user.papel };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });
        delete user.senha;
        res.json({ success: true, token, user });
    } catch (err) {
        sendError(res, err, 'Erro ao tentar fazer login');
    }
});

// --- Rotas de Pacientes ---
app.post('/api/pacientes', authMiddleware, authorizeRoles('Administrador', 'Recepcionista'), async (req, res) => {
    try {
        const { nome_completo, cpf, data_nascimento, sexo, telefone, email, convenio, status } = req.body;
        if (!nome_completo || !cpf) throw new Error('Nome completo e CPF são obrigatórios.');
        if (!validarCPF(cpf)) throw new Error('O CPF fornecido é inválido.');
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('O formato do e-mail fornecido é inválido.');

        const [result] = await db.query(
            'INSERT INTO paciente (nome_completo, cpf, data_nascimento, sexo, telefone, email, convenio, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [nome_completo, cpf, data_nascimento || null, sexo || null, telefone || null, email || null, convenio || null, status || 'Ativo']
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, error: 'Este CPF já está cadastrado no sistema.' });
        }
        sendError(res, err);
    }
});

app.get('/api/pacientes', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM paciente ORDER BY nome_completo');
        res.json({ success: true, data: rows });
    } catch (err) { sendError(res, err); }
});

app.put('/api/pacientes/:id', authMiddleware, authorizeRoles('Administrador', 'Recepcionista', 'Profissional'), async (req, res) => {
    try {
        const id = req.params.id;
        const { nome_completo, data_nascimento, sexo, telefone, email, convenio, status } = req.body; 
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('O formato do e-mail fornecido é inválido.');

        await db.query(
            'UPDATE paciente SET nome_completo=?, data_nascimento=?, sexo=?, telefone=?, email=?, convenio=?, status=? WHERE id_paciente=?',
            [nome_completo, data_nascimento || null, sexo || null, telefone || null, email || null, convenio || null, status || 'Ativo', id]
        );
        res.json({ success: true, message: 'Paciente atualizado' });
    } catch (err) { sendError(res, err); }
});

app.delete('/api/pacientes/:id', authMiddleware, authorizeRoles('Administrador'), async (req, res) => {
    try {
        const id = req.params.id;
        await db.query('DELETE FROM paciente WHERE id_paciente=?', [id]);
        res.json({ success: true, message: 'Paciente excluído' });
    } catch (err) { sendError(res, err); }
});

// --- ROTA DA FICHA MÉDICA (NOVA) ---
app.get('/api/pacientes/:id/ficha-completa', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const [pacienteRows] = await db.query('SELECT * FROM paciente WHERE id_paciente = ?', [id]);
        if (pacienteRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Paciente não encontrado' });
        }
        
        const [atendimentosRows] = await db.query(
            `SELECT a.*, p.nome_completo as nome_profissional 
             FROM atendimento a
             LEFT JOIN profissional p ON a.id_profissional = p.id_profissional
             WHERE a.id_paciente = ? 
             ORDER BY a.data_atendimento DESC`, [id]
        );
        
        const [evolucoesRows] = await db.query(
            `SELECT e.*, p.nome_completo as nome_profissional 
             FROM evolucao_medica e
             LEFT JOIN profissional p ON e.id_profissional = p.id_profissional
             WHERE e.id_paciente = ? 
             ORDER BY e.data_registro DESC`, [id]
        );
        
        const [atestadosRows] = await db.query(
            `SELECT at.*, p.nome_completo as nome_profissional
             FROM atestados at
             LEFT JOIN profissional p ON at.id_profissional = p.id_profissional
             WHERE at.id_paciente = ?
             ORDER BY at.data_emissao DESC`, [id]
        );

        res.json({
            success: true,
            data: {
                paciente: pacienteRows[0],
                atendimentos: atendimentosRows,
                evolucoes: evolucoesRows,
                atestados: atestadosRows
            }
        });

    } catch (err) {
        sendError(res, err, 'Erro ao buscar ficha completa do paciente');
    }
});

// --- Rotas de Profissionais ---
app.post('/api/profissionais', authMiddleware, authorizeRoles('Administrador'), async (req, res) => {
    try {
        const { nome_completo, cpf, especialidade, email, telefone, status } = req.body;
        if (!nome_completo || !cpf || !especialidade) throw new Error('Nome, CPF e Especialidade são obrigatórios.');
        if (!validarCPF(cpf)) throw new Error('O CPF fornecido é inválido.');
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('O formato do e-mail fornecido é inválido.');

        const [result] = await db.query(
            'INSERT INTO profissional (nome_completo, cpf, especialidade, email, telefone, status) VALUES (?, ?, ?, ?, ?, ?)',
            [nome_completo, cpf, especialidade, email || null, telefone || null, status || 'Ativo']
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, error: 'Este CPF já está cadastrado no sistema.' });
        }
        sendError(res, err);
    }
});

app.get('/api/profissionais', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM profissional ORDER BY nome_completo');
        res.json({ success: true, data: rows });
    } catch (err) { sendError(res, err); }
});

app.put('/api/profissionais/:id', authMiddleware, authorizeRoles('Administrador'), async (req, res) => {
    try {
        const id = req.params.id;
        const { nome_completo, especialidade, email, telefone, status } = req.body; // CPF removido
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('O formato do e-mail fornecido é inválido.');

        await db.query(
            'UPDATE profissional SET nome_completo=?, especialidade=?, email=?, telefone=?, status=? WHERE id_profissional=?',
            [nome_completo, especialidade, email || null, telefone || null, status || 'Ativo', id]
        );
        res.json({ success: true, message: 'Profissional atualizado' });
    } catch (err) { sendError(res, err); }
});

app.delete('/api/profissionais/:id', authMiddleware, authorizeRoles('Administrador'), async (req, res) => {
    try {
        const id = req.params.id;
        await db.query('DELETE FROM profissional WHERE id_profissional=?', [id]);
        res.json({ success: true, message: 'Profissional excluído' });
    } catch (err) { sendError(res, err); }
});

// --- Rotas de Usuários ---
app.post('/api/usuarios', authMiddleware, authorizeRoles('Administrador'), async (req, res) => {
    try {
        const { nome_usuario, senha, papel, id_profissional } = req.body;
        if (!nome_usuario || !senha || !papel) throw new Error('Nome de usuário, senha e papel são obrigatórios.');

        const hashedPassword = await bcrypt.hash(senha, saltRounds);
        const [result] = await db.query(
            'INSERT INTO usuario (nome_usuario, senha, papel, id_profissional) VALUES (?, ?, ?, ?)',
            [nome_usuario, hashedPassword, papel, id_profissional || null]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, error: 'Este nome de usuário já está em uso.' });
        }
        sendError(res, err);
    }
});

app.get('/api/usuarios', authMiddleware, authorizeRoles('Administrador'), async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id_usuario, nome_usuario, papel, id_profissional, ultimo_acesso FROM usuario ORDER BY nome_usuario');
        res.json({ success: true, data: rows });
    } catch (err) { sendError(res, err); }
});

app.put('/api/usuarios/:id', authMiddleware, authorizeRoles('Administrador'), async (req, res) => {
    try {
        const id = req.params.id;
        const { nome_usuario, senha, papel, id_profissional } = req.body;

        if (senha && senha.trim() !== '') {
            const hashedPassword = await bcrypt.hash(senha, saltRounds);
            await db.query(
                'UPDATE usuario SET nome_usuario=?, senha=?, papel=?, id_profissional=? WHERE id_usuario=?',
                [nome_usuario, hashedPassword, papel, id_profissional || null, id]
            );
        } else {
            await db.query(
                'UPDATE usuario SET nome_usuario=?, papel=?, id_profissional=? WHERE id_usuario=?',
                [nome_usuario, papel, id_profissional || null, id]
            );
        }
        res.json({ success: true, message: 'Usuário atualizado' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, error: 'Este nome de usuário já está em uso.' });
        }
        sendError(res, err);
    }
});

app.delete('/api/usuarios/:id', authMiddleware, authorizeRoles('Administrador'), async (req, res) => {
    try {
        const id = req.params.id;
        await db.query('DELETE FROM usuario WHERE id_usuario=?', [id]);
        res.json({ success: true, message: 'Usuário excluído' });
    } catch (err) { sendError(res, err); }
});

// --- Rotas de Agendamentos ---
app.post('/api/agendamentos', authMiddleware, authorizeRoles('Administrador', 'Recepcionista'), async (req, res) => {
    try {
        const { id_paciente, id_profissional, data_hora, status } = req.body;
        const [result] = await db.query(
            'INSERT INTO agendamento (id_paciente, id_profissional, data_hora, status) VALUES (?, ?, ?, ?)',
            [id_paciente, id_profissional, data_hora, status || 'Pendente']
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) { sendError(res, err); }
});

app.get('/api/agendamentos', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT a.*, p.nome_completo as nome_paciente, p.cpf as cpf_paciente, pr.nome_completo as nome_profissional
             FROM agendamento a
             JOIN paciente p ON a.id_paciente = p.id_paciente
             JOIN profissional pr ON a.id_profissional = pr.id_profissional
             ORDER BY a.data_hora DESC`
        );
        res.json({ success: true, data: rows });
    } catch (err) { sendError(res, err); }
});

app.put('/api/agendamentos/:id', authMiddleware, authorizeRoles('Administrador', 'Recepcionista'), async (req, res) => {
    try {
        const id = req.params.id;
        const { id_paciente, id_profissional, data_hora, status } = req.body;
        await db.query(
            'UPDATE agendamento SET id_paciente=?, id_profissional=?, data_hora=?, status=? WHERE id_agendamento=?',
            [id_paciente, id_profissional, data_hora, status, id]
        );
        res.json({ success: true, message: 'Agendamento atualizado' });
    } catch (err) { sendError(res, err); }
});

app.delete('/api/agendamentos/:id', authMiddleware, authorizeRoles('Administrador'), async (req, res) => {
    try {
        const id = req.params.id;
        await db.query('DELETE FROM agendamento WHERE id_agendamento=?', [id]);
        res.json({ success: true, message: 'Agendamento excluído' });
    } catch (err) { sendError(res, err); }
});

// --- Rotas de Atendimentos ---
app.post('/api/atendimentos', authMiddleware, authorizeRoles('Administrador', 'Profissional'), async (req, res) => {
    try {
        const { id_paciente, id_profissional, tipo_atendimento, data_atendimento, status, observacoes } = req.body;
        const [result] = await db.query(
            'INSERT INTO atendimento (id_paciente, id_profissional, tipo_atendimento, data_atendimento, status, observacoes) VALUES (?, ?, ?, ?, ?, ?)',
            [id_paciente, id_profissional, tipo_atendimento, data_atendimento, status, observacoes]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) { sendError(res, err); }
});

app.get('/api/atendimentos', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT a.*, p.nome_completo as nome_paciente, p.cpf as cpf_paciente, pr.nome_completo as nome_profissional
             FROM atendimento a
             JOIN paciente p ON a.id_paciente = p.id_paciente
             JOIN profissional pr ON a.id_profissional = pr.id_profissional
             ORDER BY a.data_atendimento DESC`
        );
        res.json({ success: true, data: rows });
    } catch (err) { sendError(res, err); }
});

app.put('/api/atendimentos/:id', authMiddleware, authorizeRoles('Administrador', 'Profissional'), async (req, res) => {
    try {
        const id = req.params.id;
        const { id_paciente, id_profissional, tipo_atendimento, data_atendimento, status, observacoes } = req.body;
        await db.query(
            'UPDATE atendimento SET id_paciente=?, id_profissional=?, tipo_atendimento=?, data_atendimento=?, status=?, observacoes=? WHERE id_atendimento=?',
            [id_paciente, id_profissional, tipo_atendimento, data_atendimento, status, observacoes, id]
        );
        res.json({ success: true, message: 'Atendimento atualizado' });
    } catch (err) { sendError(res, err); }
});

app.delete('/api/atendimentos/:id', authMiddleware, authorizeRoles('Administrador'), async (req, res) => {
    try {
        const id = req.params.id;
        await db.query('DELETE FROM atendimento WHERE id_atendimento=?', [id]);
        res.json({ success: true, message: 'Atendimento excluído' });
    } catch (err) { sendError(res, err); }
});

// --- Rotas de Evolução Médica ---
app.post('/api/evolucao_medica', authMiddleware, authorizeRoles('Administrador', 'Profissional'), async (req, res) => {
    try {
        const { id_paciente, id_profissional, id_atendimento, observacoes } = req.body;
        const [result] = await db.query(
            'INSERT INTO evolucao_medica (id_paciente, id_profissional, id_atendimento, observacoes) VALUES (?, ?, ?, ?)',
            [id_paciente, id_profissional, id_atendimento, observacoes]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) { sendError(res, err); }
});

app.get('/api/evolucao_medica', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT e.*, p.nome_completo as nome_paciente, p.cpf as cpf_paciente, pr.nome_completo as nome_profissional
             FROM evolucao_medica e
             JOIN paciente p ON e.id_paciente = p.id_paciente
             JOIN profissional pr ON e.id_profissional = pr.id_profissional
             ORDER BY e.data_registro DESC`
        );
        res.json({ success: true, data: rows });
    } catch (err) { sendError(res, err); }
});

app.put('/api/evolucao_medica/:id', authMiddleware, authorizeRoles('Administrador', 'Profissional'), async (req, res) => {
    try {
        const id = req.params.id;
        const { id_paciente, id_profissional, id_atendimento, observacoes } = req.body;
        await db.query(
            'UPDATE evolucao_medica SET id_paciente=?, id_profissional=?, id_atendimento=?, observacoes=? WHERE id_evolucao=?',
            [id_paciente, id_profissional, id_atendimento, observacoes, id]
        );
        res.json({ success: true, message: 'Evolução atualizada' });
    } catch (err) { sendError(res, err); }
});

app.delete('/api/evolucao_medica/:id', authMiddleware, authorizeRoles('Administrador'), async (req, res) => {
    try {
        const id = req.params.id;
        await db.query('DELETE FROM evolucao_medica WHERE id_evolucao=?', [id]);
        res.json({ success: true, message: 'Evolução excluída' });
    } catch (err) { sendError(res, err); }
});

// --- Rotas de Fila de Espera ---
app.post('/api/fila_espera', authMiddleware, authorizeRoles('Administrador', 'Recepcionista'), async (req, res) => {
    try {
        const { id_paciente, id_profissional, prioridade, canal_notificacao } = req.body;
        const [result] = await db.query(
            'INSERT INTO fila_espera (id_paciente, id_profissional, prioridade, canal_notificacao, status) VALUES (?, ?, ?, ?, ?)',
            [id_paciente, id_profissional, prioridade, canal_notificacao, 'Aguardando']
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) { sendError(res, err); }
});

app.get('/api/fila_espera', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(
             `SELECT f.*, p.nome_completo as nome_paciente, p.cpf as cpf_paciente, pr.nome_completo as nome_profissional
              FROM fila_espera f
              JOIN paciente p ON f.id_paciente = p.id_paciente
              JOIN profissional pr ON f.id_profissional = pr.id_profissional
              ORDER BY f.prioridade, f.data_entrada`
        );
        res.json({ success: true, data: rows });
    } catch (err) { sendError(res, err); }
});

app.put('/api/fila_espera/:id', authMiddleware, authorizeRoles('Administrador', 'Recepcionista'), async (req, res) => {
    try {
        const id = req.params.id;
        const { status } = req.body;
        await db.query('UPDATE fila_espera SET status=? WHERE id_fila=?', [status, id]);
        res.json({ success: true, message: 'Status da fila atualizado' });
    } catch (err) { sendError(res, err); }
});

app.delete('/api/fila_espera/:id', authMiddleware, authorizeRoles('Administrador', 'Recepcionista'), async (req, res) => {
    try {
        const id = req.params.id;
        await db.query('DELETE FROM fila_espera WHERE id_fila=?', [id]);
        res.json({ success: true, message: 'Paciente atendido e removido da fila' });
    } catch (err) { sendError(res, err); }
});

// --- Rotas de Preferência de Horário ---
app.post('/api/preferencia_horario', authMiddleware, authorizeRoles('Administrador', 'Recepcionista'), async (req, res) => {
    try {
        const { id_paciente, data_hora_preferida } = req.body;
        const [result] = await db.query(
            'INSERT INTO preferencia_horario (id_paciente, data_hora_preferida) VALUES (?, ?)',
            [id_paciente, data_hora_preferida]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) { sendError(res, err); }
});

app.get('/api/preferencia_horario', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT ph.*, p.nome_completo as nome_paciente, p.cpf as cpf_paciente
             FROM preferencia_horario ph
             JOIN paciente p ON ph.id_paciente = p.id_paciente
             ORDER BY ph.data_hora_preferida DESC`
        );
        res.json({ success: true, data: rows });
    } catch (err) { sendError(res, err); }
});

app.put('/api/preferencia_horario/:id', authMiddleware, authorizeRoles('Administrador', 'Recepcionista'), async (req, res) => {
    try {
        const id = req.params.id;
        const { id_paciente, data_hora_preferida } = req.body;
        await db.query(
            'UPDATE preferencia_horario SET id_paciente=?, data_hora_preferida=? WHERE id_preferencia=?',
            [id_paciente, data_hora_preferida, id]
        );
        res.json({ success: true, message: 'Preferência atualizada' });
    } catch (err) { sendError(res, err); }
});

app.delete('/api/preferencia_horario/:id', authMiddleware, authorizeRoles('Administrador', 'Recepcionista'), async (req, res) => {
    try {
        const id = req.params.id;
        await db.query('DELETE FROM preferencia_horario WHERE id_preferencia=?', [id]);
        res.json({ success: true, message: 'Preferência excluída' });
    } catch (err) { sendError(res, err); }
});

// --- Rotas de Instruções Pós-Atendimento ---
app.post('/api/instrucoes_pos', authMiddleware, authorizeRoles('Administrador', 'Profissional'), async (req, res) => {
    try {
        const { id_paciente, id_profissional, id_atendimento, texto_instrucao, canal_envio } = req.body;
        const [result] = await db.query(
            'INSERT INTO instrucao_pos_atendimento (id_paciente, id_profissional, id_atendimento, texto_instrucao, canal_envio) VALUES (?, ?, ?, ?, ?)',
            [id_paciente, id_profissional, id_atendimento, texto_instrucao, canal_envio]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) { sendError(res, err); }
});

app.get('/api/instrucoes_pos', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT i.*, p.nome_completo as nome_paciente, p.cpf as cpf_paciente, pr.nome_completo as nome_profissional
             FROM instrucao_pos_atendimento i
             JOIN paciente p ON i.id_paciente = p.id_paciente
             JOIN profissional pr ON i.id_profissional = pr.id_profissional
             ORDER BY i.data_envio DESC`
        );
        res.json({ success: true, data: rows });
    } catch (err) { sendError(res, err); }
});

app.delete('/api/instrucoes_pos/:id', authMiddleware, authorizeRoles('Administrador'), async (req, res) => {
    try {
        const id = req.params.id;
        await db.query('DELETE FROM instrucao_pos_atendimento WHERE id_instrucao=?', [id]);
        res.json({ success: true, message: 'Instrução excluída' });
    } catch (err) { sendError(res, err); }
});

// --- ROTAS DE ATESTADOS MÉDICOS (NOVAS) ---
app.post('/api/atestados', authMiddleware, authorizeRoles('Administrador', 'Profissional'), async (req, res) => {
    try {
        const { id_paciente, id_profissional, id_atendimento, dias_afastamento, cid, texto_atestado } = req.body;
        if (!id_paciente || !id_profissional || !dias_afastamento || !texto_atestado) {
            throw new Error('Paciente, Profissional, Dias de Afastamento e Texto são obrigatórios.');
        }

        const [result] = await db.query(
            'INSERT INTO atestados (id_paciente, id_profissional, id_atendimento, dias_afastamento, cid, texto_atestado) VALUES (?, ?, ?, ?, ?, ?)',
            [id_paciente, id_profissional, id_atendimento || null, dias_afastamento, cid || null, texto_atestado]
        );
        res.status(201).json({ success: true, id_atestado: result.insertId, message: 'Atestado salvo com sucesso.' }); 
    } catch (err) {
        sendError(res, err, 'Erro ao salvar atestado');
    }
});

app.get('/api/atestados/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            `SELECT a.*, 
                    p.nome_completo as nome_paciente, 
                    p.cpf as cpf_paciente, 
                    pr.nome_completo as nome_profissional,
                    pr.especialidade as especialidade_profissional 
             FROM atestados a
             JOIN paciente p ON a.id_paciente = p.id_paciente
             JOIN profissional pr ON a.id_profissional = pr.id_profissional
             WHERE a.id_atestado = ?`, [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Atestado não encontrado' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        sendError(res, err, 'Erro ao buscar atestado');
    }
});


// --- ROTAS DAS OUTRAS TELAS (UNIDADES, MATERIAIS, LOGS) ---
app.get('/api/unidades_saude', authMiddleware, authorizeRoles('Administrador'), async (req, res) => {
    try {
        const [unidades] = await db.query('SELECT * FROM unidade_saude');
        for (let unidade of unidades) {
            const [profissionais] = await db.query(
                `SELECT p.id_profissional, p.nome_completo as nome 
                 FROM profissional p
                 JOIN profissional_unidade pu ON p.id_profissional = pu.id_profissional
                 WHERE pu.id_unidade = ?`, [unidade.id_unidade]
            );
            unidade.profissionaisVinculados = profissionais;
        }
        res.json({ success: true, data: unidades });
    } catch (err) { sendError(res, err); }
});

app.post('/api/unidades_saude', authMiddleware, authorizeRoles('Administrador'), async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { nome_unidade, endereco, telefone, email, profissionaisIds } = req.body;
        if (!nome_unidade) {
            await connection.rollback();
            return res.status(400).json({ success: false, error: 'Nome da Unidade é obrigatório' });
        }
        const [resultUnidade] = await connection.query(
            'INSERT INTO unidade_saude (nome_unidade, endereco, telefone, email) VALUES (?, ?, ?, ?)',
            [nome_unidade, endereco || null, telefone || null, email || null]
        );
        const newUnitId = resultUnidade.insertId;
        if (profissionaisIds && Array.isArray(profissionaisIds) && profissionaisIds.length > 0) {
            const vinculosValues = profissionaisIds.map(profId => [newUnitId, parseInt(profId, 10)]);
            await connection.query(
                'INSERT INTO profissional_unidade (id_unidade, id_profissional) VALUES ?',
                [vinculosValues]
            );
        }
        await connection.commit();
        res.status(201).json({ success: true, id: newUnitId });
    } catch (err) {
        await connection.rollback();
        sendError(res, err);
    } finally {
        connection.release();
    }
});

app.put('/api/unidades_saude/:id', authMiddleware, authorizeRoles('Administrador'), async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const unidadeId = req.params.id;
        const { nome_unidade, endereco, telefone, email, profissionaisIds } = req.body;
        if (!nome_unidade) {
            await connection.rollback();
            return res.status(400).json({ success: false, error: 'Nome da Unidade é obrigatório' });
        }
        const [resultUpdate] = await connection.query(
            'UPDATE unidade_saude SET nome_unidade=?, endereco=?, telefone=?, email=? WHERE id_unidade=?',
            [nome_unidade, endereco || null, telefone || null, email || null, unidadeId]
        );
        if (resultUpdate.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
        }
        await connection.query('DELETE FROM profissional_unidade WHERE id_unidade = ?', [unidadeId]);
        if (profissionaisIds && Array.isArray(profissionaisIds) && profissionaisIds.length > 0) {
            const vinculosValues = profissionaisIds.map(profId => [unidadeId, parseInt(profId, 10)]);
            await connection.query(
                'INSERT INTO profissional_unidade (id_unidade, id_profissional) VALUES ?',
                [vinculosValues]
            );
        }
        await connection.commit();
        res.json({ success: true, message: 'Unidade e vínculos atualizados com sucesso' });
    } catch (err) {
        await connection.rollback();
        sendError(res, err);
    } finally {
        connection.release();
    }
});

app.delete('/api/unidades_saude/:id', authMiddleware, authorizeRoles('Administrador'), async (req, res) => {
    try {
        const id = req.params.id;
        // Tenta deletar. Se falhar por FK, o catch trata.
        await db.query('DELETE FROM unidade_saude WHERE id_unidade = ?', [id]);
        res.json({ success: true, message: 'Unidade excluída' });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
             return sendError(res, new Error('Não é possível excluir. A unidade está vinculada a outros registros (como acessos interunidades).'), 409);
        }
        sendError(res, err);
    }
});

app.get('/api/materiais_treinamento', authMiddleware, async (req, res) => {
    try {
        // CORREÇÃO ERRO 500: Corrigido o nome da coluna de 'id_acesso' para 'id_acesso_material'
        const [rows] = await db.query(`
            SELECT 
                m.id_material, m.titulo, m.categoria, m.url_arquivo, m.data_upload, 
                COUNT(ma.id_acesso_material) as acessos
            FROM material_treinamento m
            LEFT JOIN material_treinamento_acesso ma ON m.id_material = ma.id_material
            GROUP BY m.id_material, m.titulo, m.categoria, m.url_arquivo, m.data_upload
            ORDER BY m.data_upload DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) { sendError(res, err); }
});

app.post('/api/materiais_treinamento', authMiddleware, authorizeRoles('Administrador'), async (req, res) => {
    try {
        const { titulo, categoria, url_arquivo } = req.body;
        const [result] = await db.query(
            'INSERT INTO material_treinamento (titulo, categoria, url_arquivo) VALUES (?, ?, ?)',
            [titulo, categoria, url_arquivo]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) { sendError(res, err); }
});

app.delete('/api/materiais_treinamento/:id', authMiddleware, authorizeRoles('Administrador'), async (req, res) => {
    try {
        const id = req.params.id;
        await db.query('DELETE FROM material_treinamento_acesso WHERE id_material = ?', [id]);
        await db.query('DELETE FROM material_treinamento WHERE id_material = ?', [id]);
        res.json({ success: true, message: 'Material excluído' });
    } catch (err) { sendError(res, err); }
});

app.post('/api/materiais_treinamento/acesso', authMiddleware, async (req, res) => {
    try {
        const { id_material } = req.body;
        const id_usuario = req.user.id_usuario;
        const [result] = await db.query(
            'INSERT INTO material_treinamento_acesso (id_material, id_usuario) VALUES (?, ?)',
            [id_material, id_usuario]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) { sendError(res, err); }
});

app.get('/api/logs', authMiddleware, authorizeRoles('Administrador'), async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT l.id_log, l.acao, l.data_acao, l.ip_origem, u.nome_usuario 
             FROM log_acesso l
             LEFT JOIN usuario u ON l.id_usuario = u.id_usuario
             ORDER BY l.data_acao DESC
             LIMIT 100`
        );
        res.json({ success: true, data: rows });
    } catch (err) { sendError(res, err); }
});

app.get('/api/acessos-interunidades', authMiddleware, authorizeRoles('Administrador'), async (req, res) => {
     try {
        const [rows] = await db.query(
            `SELECT 
                ai.id_acesso, ai.data_acesso,
                p.nome_completo as nome_paciente,
                pr.nome_completo as nome_profissional,
                uo.nome_unidade as nome_unidade_origem,
                ud.nome_unidade as nome_unidade_destino
             FROM acesso_interunidades ai
             LEFT JOIN paciente p ON ai.id_paciente = p.id_paciente
             LEFT JOIN profissional pr ON ai.id_profissional = pr.id_profissional
             LEFT JOIN unidade_saude uo ON ai.id_unidade_origem = uo.id_unidade
             LEFT JOIN unidade_saude ud ON ai.id_unidade_destino = ud.id_unidade
             ORDER BY ai.data_acesso DESC
             LIMIT 100`
        );
        res.json({ success: true, data: rows });
    } catch (err) { sendError(res, err); }
});


// --- ROTAS DO DASHBOARD (AGORA COM DADOS REAIS) ---
app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const [pacientesRes] = await db.query("SELECT COUNT(*) as total FROM paciente WHERE status = 'Ativo'");
    const [agendamentosRes] = await db.query("SELECT COUNT(*) as total FROM agendamento WHERE DATE(data_hora) = CURDATE()");
    const [atendimentosRes] = await db.query("SELECT COUNT(*) as total FROM atendimento WHERE DATE(data_atendimento) = CURDATE()");
    
    // ATENÇÃO: Esta consulta de "Taxa de Presença" é simplificada.
    const [presencaResult] = await db.query(`
      SELECT COALESCE(
        (SUM(CASE WHEN status = 'Realizado' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) * 100,
        0
      ) AS taxaPresenca
      FROM agendamento
      WHERE DATE(data_hora) < CURDATE() AND (status = 'Realizado' OR status = 'Não Compareceu')
    `);
    
    const [proximos] = await db.query(
        `SELECT a.id_agendamento, a.data_hora, p.nome_completo as nome_paciente, pr.nome_completo as nome_profissional
         FROM agendamento a
         JOIN paciente p ON a.id_paciente = p.id_paciente
         JOIN profissional pr ON a.id_profissional = pr.id_profissional
         WHERE a.data_hora >= NOW() AND a.status = 'Confirmado'
         ORDER BY a.data_hora ASC
         LIMIT 5`
    );

    const taxaPresencaValor = parseFloat(presencaResult[0]?.taxaPresenca || 0);

    res.json({
        success: true,
        pacientesAtivos: pacientesRes[0].total || 0,
        agendamentosHoje: agendamentosRes[0].total || 0,
        atendimentosHoje: atendimentosRes[0].total || 0,
        taxaPresenca: parseFloat(taxaPresencaValor.toFixed(1)),
        proximosAgendamentos: proximos
    });
  } catch (err) { sendError(res, err); }
});

// ROTA REAL (Substitui simulação)
app.get('/api/dashboard/atendimentos-semana', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
        SELECT
            d.dia_semana AS dia,
            COALESCE(at.realizados, 0) AS atendimentos
        FROM
            (SELECT 
                DATE_FORMAT(CURDATE() - INTERVAL n.num DAY, '%Y-%m-%d') AS dia_completo,
                DATE_FORMAT(CURDATE() - INTERVAL n.num DAY, '%a') AS dia_semana,
                DAYOFWEEK(CURDATE() - INTERVAL n.num DAY) as dia_ordem
             FROM 
                (SELECT 0 AS num UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) AS n
            ) AS d
        LEFT JOIN 
            (SELECT DATE(data_atendimento) AS dia, COUNT(id_atendimento) AS realizados 
             FROM atendimento 
             WHERE data_atendimento >= CURDATE() - INTERVAL 6 DAY
             GROUP BY DATE(data_atendimento)
            ) AS at ON d.dia_completo = at.dia
        ORDER BY d.dia_ordem ASC;
    `);
    const diasPt = { 'Sun': 'Dom', 'Mon': 'Seg', 'Tue': 'Ter', 'Wed': 'Qua', 'Thu': 'Qui', 'Fri': 'Sex', 'Sat': 'Sáb' };
    const dataPt = rows.map(row => ({ ...row, dia: diasPt[row.dia] || row.dia, atendimentos: parseInt(row.atendimentos) }));
    res.json({ success: true, data: dataPt });
  } catch (err) { sendError(res, err); }
});


// ROTA REAL (Substitui simulação)
app.get('/api/dashboard/no-show', authMiddleware, async (req, res) => {
  try {
    // ATENÇÃO: Confirme se o status é 'Não Compareceu'
    const [rows] = await db.query(`
      SELECT 
        DATE_FORMAT(mes.data_mes, '%Y-%m') AS mes_ano,
        COALESCE(
            (SUM(CASE WHEN a.status = 'Não Compareceu' THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id_agendamento), 0)) * 100, 
        0) AS taxa
      FROM 
        (SELECT DISTINCT LAST_DAY(CURDATE() - INTERVAL n MONTH) as data_mes
         FROM (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) numbers
        ) mes
      LEFT JOIN agendamento a ON DATE_FORMAT(a.data_hora, '%Y-%m') = DATE_FORMAT(mes.data_mes, '%Y-%m')
           AND a.status <> 'Cancelado'
      GROUP BY mes.data_mes
      ORDER BY mes.data_mes ASC;
    `);

    const mesesPt = { 'Jan':'Jan', 'Feb':'Fev', 'Mar':'Mar', 'Apr':'Abr', 'May':'Mai', 'Jun':'Jun', 'Jul':'Jul', 'Aug':'Ago', 'Sep':'Set', 'Oct':'Out', 'Nov':'Nov', 'Dec':'Dez' };
    const dataFormatada = rows.map(row => {
        const [year, month] = row.mes_ano.split('-');
        const mesAbrev = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' });
        const taxaNumerica = parseFloat(row.taxa || 0);

        return {
            mes: mesesPt[mesAbrev] || mesAbrev,
            taxa: parseFloat(taxaNumerica.toFixed(1))
        };
    });
    res.json({ success: true, data: dataFormatada });
  } catch (err) { sendError(res, err); }
});


// ROTA REAL (Substitui simulação)
app.get('/api/dashboard/notificacoes', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id_notificacao AS id,
        tipo,
        mensagem,
        CASE
          WHEN TIMESTAMPDIFF(MINUTE, data_criacao, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, data_criacao, NOW()), ' min atrás')
          WHEN TIMESTAMPDIFF(HOUR, data_criacao, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, data_criacao, NOW()), ' h atrás')
          ELSE DATE_FORMAT(data_criacao, '%d/%m %H:%i')
        END AS tempo
      FROM notificacoes
      ORDER BY data_criacao DESC
      LIMIT 5
    `);
    res.json({ success: true, data: rows });
  } catch (err) { 
      if (err.code === 'ER_NO_SUCH_TABLE') {
           console.warn("Tabela 'notificacoes' não encontrada. Rota /api/dashboard/notificacoes retornará vazio.");
           return res.json({ success: true, data: [] });
      }
      sendError(res, err); 
  }
});

// --- Rotas de Relatórios ---
// (Estas rotas já usam dados reais, mas as duas primeiras são duplicadas pelas do dashboard)

app.get('/api/relatorios/atendimentos-por-profissional', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT pr.nome_completo as name, COUNT(a.id_atendimento) as value
            FROM atendimento a
            JOIN profissional pr ON a.id_profissional = pr.id_profissional
            GROUP BY pr.id_profissional, pr.nome_completo
            ORDER BY value DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) { sendError(res, err); }
});

app.get('/api/relatorios/distribuicao-tipo', authMiddleware, async (req, res) => {
     try {
        const [rows] = await db.query(`
            SELECT tipo_atendimento as name, COUNT(id_atendimento) as value
            FROM atendimento
            GROUP BY tipo_atendimento
            ORDER BY value DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) { sendError(res, err); }
});

// ROTA REAL (Substitui simulação)
app.get('/api/relatorios/atendimentos-semana', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                d.dia_semana AS dia,
                COALESCE(ag.agendados, 0) AS agendados,
                COALESCE(at.realizados, 0) AS realizados
            FROM
                (SELECT 
                    DATE_FORMAT(CURDATE() - INTERVAL n.num DAY, '%Y-%m-%d') AS dia_completo,
                    DATE_FORMAT(CURDATE() - INTERVAL n.num DAY, '%a') AS dia_semana,
                    DAYOFWEEK(CURDATE() - INTERVAL n.num DAY) as dia_ordem
                 FROM 
                    (SELECT 0 AS num UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) AS n
                ) AS d
            LEFT JOIN 
                (SELECT DATE(data_hora) AS dia, COUNT(id_agendamento) AS agendados 
                 FROM agendamento 
                 WHERE data_hora >= CURDATE() - INTERVAL 6 DAY AND status <> 'Cancelado'
                 GROUP BY DATE(data_hora)
                ) AS ag ON d.dia_completo = ag.dia
            LEFT JOIN 
                (SELECT DATE(data_atendimento) AS dia, COUNT(id_atendimento) AS realizados 
                 FROM atendimento 
                 WHERE data_atendimento >= CURDATE() - INTERVAL 6 DAY
                 GROUP BY DATE(data_atendimento)
                ) AS at ON d.dia_completo = at.dia
            ORDER BY d.dia_ordem ASC;
        `);
        const diasPt = { 'Sun': 'Dom', 'Mon': 'Seg', 'Tue': 'Ter', 'Wed': 'Qua', 'Thu': 'Qui', 'Fri': 'Sex', 'Sat': 'Sáb' };
        const dataPt = rows.map(row => ({ 
            dia: diasPt[row.dia] || row.dia, 
            agendados: parseInt(row.agendados), 
            realizados: parseInt(row.realizados) 
        }));
        res.json({ success: true, data: dataPt });
    } catch (err) { sendError(res, err); }
});

// ROTA REAL (Substitui simulação)
app.get('/api/relatorios/evolucao-noshow', authMiddleware, async (req, res) => {
     try {
        const [rows] = await db.query(`
          SELECT 
            DATE_FORMAT(mes.data_mes, '%Y-%m') AS mes_ano,
            COALESCE(
                (SUM(CASE WHEN a.status = 'Não Compareceu' THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id_agendamento), 0)) * 100, 
            0) AS taxa
          FROM 
            (SELECT DISTINCT LAST_DAY(CURDATE() - INTERVAL n MONTH) as data_mes
             FROM (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) numbers
            ) mes
          LEFT JOIN agendamento a ON DATE_FORMAT(a.data_hora, '%Y-%m') = DATE_FORMAT(mes.data_mes, '%Y-%m')
               AND a.status <> 'Cancelado'
          GROUP BY mes.data_mes
          ORDER BY mes.data_mes ASC;
        `);
        
        const mesesPt = { 'Jan':'Jan', 'Feb':'Fev', 'Mar':'Mar', 'Apr':'Abr', 'May':'Mai', 'Jun':'Jun', 'Jul':'Jul', 'Aug':'Ago', 'Sep':'Set', 'Oct':'Out', 'Nov':'Nov', 'Dec':'Dez' };
        const dataFormatada = rows.map(row => {
            const [year, month] = row.mes_ano.split('-');
            const mesAbrev = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' });
            const taxaNumerica = parseFloat(row.taxa || 0);

            return {
                mes: mesesPt[mesAbrev] || mesAbrev,
                taxa: parseFloat(taxaNumerica.toFixed(1))
            };
        });
        res.json({ success: true, data: dataFormatada });
    } catch (err) { sendError(res, err); }
});
// Rota de Emergência para Resetar Senha
app.get('/api/reset-senha-adm', async (req, res) => {
  try {
    // Gera um hash novo e válido usando o próprio servidor
    const novaSenhaHash = await bcrypt.hash('senha123', 10);
    
    // Atualiza o usuário admin
    const [result] = await db.query(
      'UPDATE usuario SET senha = ? WHERE nome_usuario = ?', 
      [novaSenhaHash, 'adm']
    );

    if (result.affectedRows > 0) {
      res.send('<h1>Sucesso!</h1><p>A senha do usuário <b>adm</b> foi resetada para: <b>senha123</b></p>');
    } else {
      res.send('<h1>Erro!</h1><p>Usuário adm não encontrado no banco.</p>');
    }
  } catch (err) {
    res.status(500).send('Erro ao resetar: ' + err.message);
  }
});

// --- Iniciar Servidor ---
const PORT = process.env.PORT || 4000; // Render define a porta automaticamente
app.listen(PORT, () => console.log(`✅ Backend rodando na porta ${PORT}`));
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3000; // Usa a porta definida pelo Vercel

// Middleware para interpretar JSON
app.use(express.json());

// Configuração do CORS
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : [];
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"],
    credentials: true,
  })
);

// Permitir requisições OPTIONS
app.options("*", cors());

// Teste para verificar se o servidor está funcionando
app.get("/teste", (req, res) => {
  res.send("Bem-vindo ao servidor de API");
});

// Endpoint para registro de usuário
app.post("/api/register", async (req, res) => {
  console.log("Dados recebidos:", req.body);

  const apiUrl = "http://217.196.61.218:8080/v1/user/save-user";

  try {
    const requiredFields = [
      "nome",
      "email",
      "senha",
      "cep",
      "pais",
      "cidade",
      "rua",
      "numeroRua",
      "telefone",
      "celular",
      "graduacao",
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `Campo ${field} é obrigatório.` });
      }
    }

    const payload = {
      usuarioId: req.body.usuarioId || 0,
      nome: req.body.nome,
      email: req.body.email,
      senha: req.body.senha,
      cep: req.body.cep,
      pais: req.body.pais,
      cidade: req.body.cidade,
      rua: req.body.rua,
      numeroRua: req.body.numeroRua,
      telefone: req.body.telefone,
      celular: req.body.celular,
      profissionalDaSaude: Boolean(req.body.profissionalDaSaude),
      graduacao: req.body.graduacao || "",
      receberEmail: Boolean(req.body.receberEmail),
    };

    console.log(
      "Payload enviado para a API:",
      JSON.stringify(payload, null, 2)
    );

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.status === 204) {
      return res.sendStatus(204);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error("Erro ao parsear a resposta JSON:", jsonError);
      data = { message: "Erro ao processar a resposta da API" };
    }

    console.log("Response status:", response.status);
    console.log("Response body:", await response.text());
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Erro ao fazer requisição para a API:", error);
    res.status(500).json({ error: "Erro ao fazer requisição para a API" });
  }
});

// Endpoint para login de usuário
app.get("/api/login", async (req, res) => {
  const { email, senha } = req.query;

  if (!email || !senha) {
    return res.status(400).json({ error: "Email e senha são obrigatórios." });
  }

  const apiUrl = `${process.env.API_URL}/login?email=${encodeURIComponent(
    email
  )}&senha=${encodeURIComponent(senha)}`;

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (response.status === 200) {
      const data = await response.json();
      console.log("Login bem-sucedido:", data);
      return res.status(200).json(data);
    }

    const errorMessage = await response.text();
    console.error("Erro no login:", response.status, errorMessage);
    return res.status(response.status).json({ error: errorMessage });
  } catch (error) {
    console.error("Erro ao fazer requisição para a API:", error);
    return res
      .status(500)
      .json({ error: "Erro ao fazer requisição para a API" });
  }
});

// Exportar a aplicação para Vercel
export default app;

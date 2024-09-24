import express from "express";
import fetch from "node-fetch"; // Import ESM
import cors from "cors";

const app = express();
const port = process.env.PORT || 10000;

// Middleware para interpretar JSON
app.use(express.json());

// Configuração do CORS
app.use(
  cors({
    origin: ["http://localhost:5173", "https://raizesfront.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"],
    credentials: true,
  })
);

// Permitir requisições OPTIONS
app.options("*", cors()); // Adicione esta linha

app.get("/teste", (req, res) => {
  res.send("Bem-vindo ao servidor de API");
});

// Função para fazer o ping
const pingServer = () => {
  const pingUrl = "https://testserver-2p40.onrender.com/teste"; // URL correto para o ping

  fetch(pingUrl)
    .then((res) => {
      if (res.ok) {
        console.log("Ping bem-sucedido ao servidor.");
      } else {
        console.log("Erro no ping ao servidor:", res.status);
      }
    })
    .catch((error) => {
      console.error("Erro ao fazer o ping:", error);
    });
};

// Iniciar o ping a cada 30 minutos (1800000 ms)
setInterval(pingServer, 1800000);

// Fazer um ping inicial ao iniciar o servidor
pingServer();

// Endpoint para registro de usuário
app.post("/api/register", async (req, res) => {
  console.log("Dados recebidos:", req.body);

  const apiUrl = "http://217.196.61.218:8080/v1/user/save-user";

  try {
    // Validação simples dos campos obrigatórios
    const requiredFields = [
      "nome",
      "email",
      "senha",
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `Campo ${field} é obrigatório.` });
      }
    }

    // Preparando o payload a ser enviado à API
    const payload = {
      usuarioId: req.body.usuarioId || 0, // Supondo que 0 seja o padrão
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
      profissionalDaSaude: Boolean(req.body.profissionalDaSaude), // Garantir que seja booleano
      graduacao: req.body.graduacao || "", // Evitar null
      receberEmail: Boolean(req.body.receberEmail), // Garantir que seja booleano
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
      return res.sendStatus(204); // Sucesso sem conteúdo
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
  const { email, senha } = req.query; // Obtemos os dados via query

  if (!email || !senha) {
    return res.status(400).json({ error: "Email e senha são obrigatórios." });
  }

  const apiUrl = `http://217.196.61.218:8080/v1/user/login?email=${encodeURIComponent(email)}&senha=${encodeURIComponent(senha)}`;

  try {
    const response = await fetch(apiUrl, {
      method: "GET", // Continua usando o método GET
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (response.status === 200 && data.result === true) {
      console.log("Login bem-sucedido:", data);
      return res.status(200).json({
        success: true,
        message: "Login realizado com sucesso",
        idUser: data.idUser,
        nome: data.nome,
      });
    }

    console.error("Erro no login: result é falso.");
    return res.status(401).json({
      success: false,
      message: "Email ou senha incorretos",
    });
  } catch (error) {
    console.error("Erro ao fazer requisição para a API:", error);
    return res.status(500).json({ error: "Erro ao fazer requisição para a API" });
  }
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

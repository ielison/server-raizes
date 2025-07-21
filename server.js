import express from "express"
import fetch from "node-fetch"
import cors from "cors"
import { generatePDF } from "./pdfGenerator.js"
import winston from "winston"

const app = express()
const port = process.env.PORT || 3000

// Configuração do Winston otimizada para Render
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`

      // Adiciona metadados se existirem
      if (Object.keys(meta).length > 0) {
        logMessage += ` | ${JSON.stringify(meta)}`
      }

      return logMessage
    }),
  ),
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
})

// Middleware para interpretar JSON
app.use(express.json())

// Configuração do CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://raizesfront.vercel.app",
      "https://raizeshistoriafamiliar.vercel.app",
      "https://raizesteste.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"],
    credentials: true,
  }),
)

// Middleware de logging customizado para Render
app.use((req, res, next) => {
  const start = Date.now()

  // Log da requisição recebida
  logger.info("Requisição recebida", {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  })

  // Intercepta a resposta para logar quando terminar
  const originalSend = res.send
  res.send = function (data) {
    const duration = Date.now() - start

    logger.info("Resposta enviada", {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })

    return originalSend.call(this, data)
  }

  next()
})

// Permitir requisições OPTIONS
app.options("*", cors())

app.get("/teste", (req, res) => {
  logger.info("Endpoint /teste acessado")
  res.send("Bem-vindo ao servidor de API")
})

// Health check endpoint específico para Render
app.get("/health", (req, res) => {
  logger.info("Health check realizado")
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  })
})

// Função para fazer o ping (ajustada para Render)
const pingServer = () => {
  const pingUrl = process.env.RENDER_EXTERNAL_URL
    ? `${process.env.RENDER_EXTERNAL_URL}/health`
    : "https://testserver-2p40.onrender.com/teste"

  fetch(pingUrl)
    .then((res) => {
      if (res.ok) {
        logger.info("Ping bem-sucedido", { url: pingUrl, status: res.status })
      } else {
        logger.warn("Ping com status não-OK", { url: pingUrl, status: res.status })
      }
    })
    .catch((error) => {
      logger.error("Erro no ping", { url: pingUrl, error: error.message })
    })
}

// Iniciar o ping a cada 15 minutos (900000 ms)
setInterval(pingServer, 900000)

// Fazer um ping inicial ao iniciar o servidor
pingServer()

// Endpoint para registro de usuário
app.post("/api/register", async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  logger.info("Iniciando registro de usuário", {
    requestId,
    email: req.body.email,
    nome: req.body.nome,
  })

  const apiUrl = process.env.API_BASE_URL
    ? `${process.env.API_BASE_URL}/user/save-user`
    : "http://217.196.61.218:8080/v1/user/save-user"

  try {
    // Validação simples dos campos obrigatórios
    const requiredFields = ["nome", "email", "senha"]

    for (const field of requiredFields) {
      if (!req.body[field]) {
        logger.warn("Campo obrigatório ausente", { requestId, field })
        return res.status(400).json({ error: `Campo ${field} é obrigatório.` })
      }
    }

    // Preparando o payload a ser enviado à API
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
    }

    logger.info("Enviando dados para API externa", {
      requestId,
      apiUrl,
      email: payload.email,
    })

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (response.status === 204) {
      logger.info("Usuário registrado com sucesso", { requestId, status: 204 })
      return res.sendStatus(204)
    }

    let data
    try {
      data = await response.json()
    } catch (jsonError) {
      logger.error("Erro ao parsear resposta JSON", {
        requestId,
        error: jsonError.message,
      })
      data = { message: "Erro ao processar a resposta da API" }
    }

    logger.info("Resposta da API externa recebida", {
      requestId,
      status: response.status,
    })

    res.status(response.status).json(data)
  } catch (error) {
    logger.error("Erro no registro de usuário", {
      requestId,
      error: error.message,
      stack: error.stack,
    })
    res.status(500).json({ error: "Erro ao fazer requisição para a API" })
  }
})

// Endpoint para login de usuário
app.get("/api/login", async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const { email, senha } = req.query

  logger.info("Tentativa de login", { requestId, email })

  if (!email || !senha) {
    logger.warn("Credenciais ausentes no login", { requestId })
    return res.status(400).json({ error: "Email e senha são obrigatórios." })
  }

  const apiUrl = process.env.API_BASE_URL
    ? `${process.env.API_BASE_URL}/user/login?email=${encodeURIComponent(email)}&senha=${encodeURIComponent(senha)}`
    : `http://217.196.61.218:8080/v1/user/login?email=${encodeURIComponent(email)}&senha=${encodeURIComponent(senha)}`

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })

    const data = await response.json()

    if (response.status === 200 && data.result === true) {
      logger.info("Login bem-sucedido", {
        requestId,
        email,
        userId: data.idUser,
      })
      return res.status(200).json({
        success: true,
        message: "Login realizado com sucesso",
        idUser: data.idUser,
        nome: data.nome,
      })
    }

    logger.warn("Login falhou", { requestId, email })
    return res.status(401).json({
      success: false,
      message: "Email ou senha incorretos",
    })
  } catch (error) {
    logger.error("Erro no processo de login", {
      requestId,
      email,
      error: error.message,
    })
    return res.status(500).json({ error: "Erro ao fazer requisição para a API" })
  }
})

// Endpoint para enviar dados do quiz
app.post("/api/quiz", async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  logger.info("Criando novo quiz", {
    requestId,
    idUser: req.body.idUser,
    idQuiz: req.body.idQuiz,
  })

  const apiUrl = process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/quiz` : "http://217.196.61.218:8080/v1/quiz"

  try {
    const requiredFields = ["idUser", "idQuiz", "usuariPrincipal"]
    for (const field of requiredFields) {
      if (!req.body[field]) {
        logger.warn("Campo obrigatório ausente no quiz", { requestId, field })
        return res.status(400).json({ error: `Campo ${field} é obrigatório.` })
      }
    }

    const payload = {
      idUser: req.body.idUser,
      idQuiz: req.body.idQuiz,
      usuariPrincipal: req.body.usuariPrincipal,
      mae: req.body.mae,
      pai: req.body.pai,
      filhosList: req.body.filhosList,
      netosList: req.body.netosList,
      irmaosList: req.body.irmaosList,
      sobrinhosList: req.body.sobrinhosList,
      tiosList: req.body.tiosList,
      avosList: req.body.avosList,
      primosList: req.body.primosList,
      outroFamiliarList: req.body.outroFamiliarList,
    }

    logger.info("Enviando quiz para API externa", { requestId, apiUrl })

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (response.status === 200 || response.status === 201) {
      const responseBody = await response.json()
      logger.info("Quiz criado com sucesso", {
        requestId,
        status: response.status,
        message: responseBody.message,
      })

      if (responseBody.message === "CRIADO COM SUCESSO") {
        return res.status(200).json({ message: responseBody.message })
      }

      return res.status(200).json(responseBody)
    }

    const errorData = await response.text()
    logger.error("Erro na criação do quiz", {
      requestId,
      status: response.status,
      error: errorData,
    })
    return res.status(response.status).json({ error: errorData })
  } catch (error) {
    logger.error("Erro no processo de criação do quiz", {
      requestId,
      error: error.message,
      stack: error.stack,
    })
    res.status(500).json({ error: "Erro ao fazer requisição para a API" })
  }
})

// Endpoint para ATUALIZAR dados do quiz (PUT)
app.put("/api/quiz", async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  logger.info("Atualizando quiz", {
    requestId,
    idUser: req.body.idUser,
    idQuiz: req.body.idQuiz,
  })

  const apiUrl = process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/quiz` : "http://217.196.61.218:8080/v1/quiz"

  try {
    if (!req.body.idQuiz) {
      logger.warn("idQuiz ausente na atualização", { requestId })
      return res.status(400).json({ error: "Campo idQuiz é obrigatório para atualização." })
    }

    const payload = {
      idUser: req.body.idUser,
      idQuiz: req.body.idQuiz,
      usuariPrincipal: req.body.usuariPrincipal,
      mae: req.body.mae,
      pai: req.body.pai,
      filhosList: req.body.filhosList,
      netosList: req.body.netosList,
      irmaosList: req.body.irmaosList,
      sobrinhosList: req.body.sobrinhosList,
      tiosList: req.body.tiosList,
      avosList: req.body.avosList,
      primosList: req.body.primosList,
      outroFamiliarList: req.body.outroFamiliarList,
    }

    logger.info("Enviando atualização para API externa", { requestId, apiUrl })

    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      try {
        const responseBody = await response.json()
        logger.info("Quiz atualizado com sucesso", {
          requestId,
          status: response.status,
        })
        return res.status(response.status).json(responseBody)
      } catch (e) {
        logger.info("Quiz atualizado (sem conteúdo na resposta)", {
          requestId,
          status: response.status,
        })
        return res.sendStatus(response.status)
      }
    } else {
      const errorData = await response.text()
      logger.error("Erro na atualização do quiz", {
        requestId,
        status: response.status,
        error: errorData,
      })
      return res.status(response.status).json({ error: errorData })
    }
  } catch (error) {
    logger.error("Erro no processo de atualização do quiz", {
      requestId,
      error: error.message,
      stack: error.stack,
    })
    res.status(500).json({ error: "Erro ao fazer requisição para a API" })
  }
})

// GET para /api/quiz
app.get("/api/quiz", async (req, res) => {
  const apiUrl = process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/quiz` : "http://217.196.61.218:8080/v1/quiz"

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })

    if (response.status === 200) {
      return res.status(200).json(true)
    } else {
      res.status(response.status).json(false)
    }
  } catch (error) {
    logger.error("Erro na verificação do quiz", { error: error.message })
    res.status(500).json({ error: "Erro ao fazer requisição para a API" })
  }
})

// GET para buscar pacientes por idUser
app.get("/api/quiz/getPacientes/:idUser", async (req, res) => {
  const { idUser } = req.params
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  logger.info("Buscando pacientes", { requestId, idUser })

  const apiUrl = process.env.API_BASE_URL
    ? `${process.env.API_BASE_URL}/quiz/getPacientes/${idUser}`
    : `http://217.196.61.218:8080/v1/quiz/getPacientes/${idUser}`

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })

    if (response.status === 200) {
      const pacientes = await response.json()
      logger.info("Pacientes encontrados", {
        requestId,
        idUser,
        count: pacientes.length,
      })
      return res.status(200).json(pacientes)
    } else {
      logger.warn("Erro ao buscar pacientes", {
        requestId,
        idUser,
        status: response.status,
      })
      res.status(response.status).json({
        error: `Erro ao buscar pacientes: ${response.statusText}`,
      })
    }
  } catch (error) {
    logger.error("Erro na busca de pacientes", {
      requestId,
      idUser,
      error: error.message,
    })
    res.status(500).json({ error: "Erro ao fazer requisição para a API" })
  }
})

// Endpoint para obter os dados do quiz pelo idQuiz
app.get("/api/quiz/:idQuiz", async (req, res) => {
  const { idQuiz } = req.params
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  logger.info("Buscando dados do quiz", { requestId, idQuiz })

  const apiUrl = process.env.API_BASE_URL
    ? `${process.env.API_BASE_URL}/quiz/getQuiz/${idQuiz}`
    : `http://217.196.61.218:8080/v1/quiz/getQuiz/${idQuiz}`

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })

    if (response.status === 200) {
      const data = await response.json()
      logger.info("Dados do quiz encontrados", { requestId, idQuiz })
      return res.status(200).json(data)
    } else {
      logger.warn("Quiz não encontrado", { requestId, idQuiz, status: response.status })
      res.status(response.status).json({ error: "Quiz não encontrado" })
    }
  } catch (error) {
    logger.error("Erro na busca do quiz", {
      requestId,
      idQuiz,
      error: error.message,
    })
    res.status(500).json({ error: "Erro ao fazer requisição para a API" })
  }
})

// Endpoint para obter o resultado do quiz pelo idQuiz e idUser
app.get("/api/quiz/resultado/:idQuiz/:idUser", async (req, res) => {
  const { idQuiz, idUser } = req.params
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  logger.info("Buscando resultado do quiz", { requestId, idQuiz, idUser })

  const apiUrl = process.env.API_BASE_URL
    ? `${process.env.API_BASE_URL}/quiz/resultado/${idQuiz}/${idUser}`
    : `http://217.196.61.218:8080/v1/quiz/resultado/${idQuiz}/${idUser}`

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })

    if (response.status === 200) {
      const result = await response.json()
      logger.info("Resultado do quiz encontrado", { requestId, idQuiz, idUser })
      return res.status(200).json(result)
    } else {
      logger.warn("Resultado do quiz não encontrado", {
        requestId,
        idQuiz,
        idUser,
        status: response.status,
      })
      res.status(response.status).json({
        error: `Erro ao buscar resultado do quiz: ${response.statusText}`,
      })
    }
  } catch (error) {
    logger.error("Erro na busca do resultado", {
      requestId,
      idQuiz,
      idUser,
      error: error.message,
    })
    res.status(500).json({ error: "Erro ao fazer requisição para a API" })
  }
})

// Endpoint para geração de PDF
app.post("/generatepdf", (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const { nome, idade, historicoPessoal, familiares, precisaPesquisaOncogenetica } = req.body

  logger.info("Gerando PDF", { requestId, nome, idade })

  if (!nome || !idade || !historicoPessoal || !familiares) {
    logger.warn("Dados incompletos para PDF", { requestId })
    return res.status(400).json({ error: "Dados incompletos." })
  }

  try {
    generatePDF(req.body, res)
    logger.info("PDF gerado com sucesso", { requestId, nome })
  } catch (error) {
    logger.error("Erro na geração do PDF", {
      requestId,
      nome,
      error: error.message,
    })
    res.status(500).json({ error: "Erro ao gerar PDF" })
  }
})

// Middleware de tratamento de erros global
app.use((error, req, res, next) => {
  logger.error("Erro não tratado", {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  })

  res.status(500).json({ error: "Erro interno do servidor" })
})

// Iniciar o servidor
app.listen(port, () => {
  logger.info(`Servidor iniciado com sucesso`, {
    port,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  })
})

// Tratamento de sinais para shutdown graceful
process.on("SIGTERM", () => {
  logger.info("Recebido SIGTERM, encerrando servidor graciosamente")
  process.exit(0)
})

process.on("SIGINT", () => {
  logger.info("Recebido SIGINT, encerrando servidor graciosamente")
  process.exit(0)
})

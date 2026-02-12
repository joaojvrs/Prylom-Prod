import "dotenv/config";
import express from "express";
import { askGemini } from "./api/gemini.ts";
import cors from "cors";

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
  ],
}));

app.use(express.json());

app.post("/api/gemini", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt não informado" });
    }

    const text = await askGemini(prompt);
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: "Erro ao acessar IA" });
  }
});

app.listen(3333, () => {
  console.log("🧠 API Gemini rodando em http://localhost:3333");
});


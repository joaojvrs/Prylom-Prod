import "dotenv/config";
import express from "express";
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

app.listen(3333, () => {
  console.log("🚀 API rodando em http://localhost:3333");
});

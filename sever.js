const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const serverless = require("serverless-http"); // 🆕

const app = express();
const GEMINI_API_KEY = "AIzaSyDGn0h1_hQl1tegCY9nzyn4FTxuip7hc4s";

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Route trả dữ liệu JSONL
app.get("/localdata", (req, res) => {
  const filePath = path.join(__dirname, "data.jsonl");

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Lỗi đọc file data.json:", err);
      return res.status(500).json({ error: "Lỗi khi đọc dữ liệu." });
    }

    try {
      const lines = data.split("\n").filter(line => line.trim() !== "");
      const jsonObjects = lines.map(line => JSON.parse(line));
      res.json(jsonObjects);
    } catch (parseErr) {
      console.error("Lỗi parse JSONL:", parseErr);
      res.status(500).json({ error: "Lỗi parse dữ liệu JSONL." });
    }
  });
});

// Route chat
app.post("/chat", async (req, res) => {
  const conversation = req.body.conversation;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      { contents: conversation },
      { headers: { "Content-Type": "application/json" } }
    );

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    res.json({ reply: reply || "Không có phản hồi." });
  } catch (error) {
    console.error("Lỗi gọi Gemini API:", error);
    res.status(500).json({ reply: "Lỗi gọi API Gemini." });
  }
});

// ❌ KHÔNG DÙNG: app.listen(PORT, ...);

// ✅ THAY THẾ BẰNG:
module.exports = app;
module.exports.handler = serverless(app);

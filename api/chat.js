const express = require("express");
const { json } = require("body-parser");
const cors = require("cors");
const axios = require("axios");

const GEMINI_API_KEY = "YAIzaSyDGn0h1_hQl1tegCY9nzyn4FTxuip7hc4s";

const app = express();
app.use(cors());
app.use(json());

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

module.exports = app;

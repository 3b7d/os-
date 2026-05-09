import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Database Connection
  const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "delivery_db",
    port: parseInt(process.env.DB_PORT || "3306"),
  };

  let pool: mysql.Pool | null = null;
  try {
    pool = mysql.createPool(dbConfig);
    console.log("MySQL Pool created.");
  } catch (err) {
    console.error("Failed to create MySQL pool:", err);
  }

  // API Routes
  app.get("/api/orders", async (req, res) => {
    try {
      if (!pool) throw new Error("لم يتم تهيئة قاعدة البيانات");
      
      const [rows] = await pool.query("SELECT * FROM delivery_orders");
      res.json(rows);
    } catch (error) {
      console.log("MySQL connection not available or query failed. Returning mock data for demonstration.");
      // Sending semi-realistic mock data if DB fails
      res.json([
        {
          Creation_DateTime: '2024-05-01T10:00:00',
          Task_Status: 'Successful',
          Agent_Name: 'أحمد محمد (MySQL)',
          Team_Name: 'مستودع الرياض',
          'Distance(KM)': 12.5,
          'Total_Time_Taken(min)': 45,
          عدد_الطبالي: 3,
          Customer_Address: 'الرياض، حي النرجس'
        },
        {
          Creation_DateTime: '2024-05-01T11:30:00',
          Task_Status: 'Successful',
          Agent_Name: 'خالد العتيبي (MySQL)',
          Team_Name: 'مستودع الرياض',
          'Distance(KM)': 8.2,
          'Total_Time_Taken(min)': 30,
          عدد_الطبالي: 1,
          Customer_Address: 'الرياض، حي الملقا',
          isDemo: true
        }
      ]);
    }
  });

  // Gemini AI Summary Route
  app.post("/api/analyze", async (req, res) => {
    const { stats } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.length < 10) {
      return res.status(200).json({ summary: "الرجاء ضبط مفتاح Gemini API في الإعدادات بشكل صحيح لاستخدام الملخص الذكي." });
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `أنت خبير تحليل بيانات لوجستية. بناءً على المؤشرات التالية لمنصة توصيل، قدم ملخصاً ذكياً وتحليلياً قصيراً (فقرة واحدة) باللغة العربية بلهجة احترافية ومحفزة:
      - إجمالي الطلبات: ${stats.totalOrders}
      - معدل النجاح: ${stats.successRate.toFixed(1)}%
      - متوسط وقت التوصيل: ${stats.avgDeliveryTime.toFixed(1)} دقيقة
      - إجمالي المسافات: ${stats.totalDistance.toFixed(1)} كم
      
      ركز على نقاط القوة (مثل معدل النجاح العالي) ونبه على جوانب التحسين (مثل الوقت إذا كان مرتفعاً).`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      res.json({ summary: response.text() });
    } catch (error: any) {
      console.error("Gemini AI Error:", error);
      const errorMessage = error?.message?.includes("API_KEY_INVALID") 
        ? "مفتاح API غير صالح. يرجى التأكد من ضبط الإعدادات بشكل صحيح."
        : "فشل في إنشاء الملخص الذكي. يرجى المحاولة لاحقاً.";
      res.status(200).json({ summary: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mock API for listings
  app.get("/api/listings", (req, res) => {
    const listings = [
      {
        id: 1,
        name: "شاليه واجهة بحرية فاخر",
        location: "مارينا 5",
        village: "مارينا",
        type: "شاليه",
        rooms: 3,
        price: 4200,
        features: ["Pool", "بحر", "A/C"],
        badge: "nego",
        office: "مكتب الساحل",
        isOwner: false,
        emoji: "🏖️",
        gradient: "from-blue-500 to-cyan-400",
        available: true,
        complianceScore: 95
      },
      {
        id: 2,
        name: "فيلا صف أول هاسيندا",
        location: "هاسيندا وايت",
        village: "هاسيندا",
        type: "فيلا",
        rooms: 5,
        price: 15000,
        features: ["Pool", "بحر", "Garden", "A/C"],
        badge: "verified",
        office: null,
        isOwner: true,
        emoji: "🏡",
        gradient: "from-orange-500 to-red-400",
        available: true,
        complianceScore: 98
      }
    ];
    res.json(listings);
  });

  // WhatsApp Notification API
  app.post("/api/notify/whatsapp", async (req, res) => {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ error: "Phone number and message are required" });
    }

    try {
      // In a real implementation, you would use Twilio, Meta Business API, or another provider.
      // Example with Twilio:
      // const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      // await client.messages.create({
      //   from: 'whatsapp:+14155238886',
      //   body: message,
      //   to: `whatsapp:${phoneNumber}`
      // });

      console.log(`[WhatsApp Notification] Sending to ${phoneNumber}: ${message}`);
      
      // For demo purposes, we'll simulate a successful send.
      res.json({ success: true, message: "WhatsApp notification sent (simulated)" });
    } catch (error) {
      console.error("WhatsApp notification error:", error);
      res.status(500).json({ error: "Failed to send WhatsApp notification" });
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

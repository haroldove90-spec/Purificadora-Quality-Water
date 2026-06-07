import express from "express";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = 'https://zzsbqrwmppvpvtajkuva.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6c2JxcndtcHB2cHZ0YWprdXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTQ2NjQsImV4cCI6MjA5NDczMDY2NH0.VQyx8HLHn8kjVX9rgY2xoPejBKGffWTQaTolXiToAjE';

const supabaseUrl = process.env.VITE_SUPABASE_URL || SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const app = express();
app.use(express.json());

// API Route: Webhook Simulado para WhatsApp
app.post("/api/webhook-whatsapp", async (req, res) => {
  const { from, body, customer_name, address, lat, lng } = req.body;

  console.log(`[WhatsApp Webhook] Mensaje de: ${from}. Contenido: ${body}`);

  try {
    const { data, error } = await supabase
      .from("orders")
      .insert([
        {
          customer_name: customer_name || `Usuario WA (${from})`,
          address: address || "Ubicación pendiente",
          items: body || "Pedido por definir",
          status: "pending",
          total_price: 0, // El administrador asignará el precio real
          whatsapp_number: from,
          metadata: { 
            lat: lat || null, 
            lng: lng || null,
            raw_message: body 
          }
        },
      ])
      .select();

    if (error) throw error;
    
    console.log("Pedido de WhatsApp guardado:", data);

    res.status(200).json({ 
      status: "success", 
      order: data[0]
    });
  } catch (err) {
    console.error("Error en Webhook:", err);
    res.status(500).json({ error: "No se pudo procesar el webhook" });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", supabase_configured: !!supabaseUrl });
});

export default app;

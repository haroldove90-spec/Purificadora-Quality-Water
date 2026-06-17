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

  // Construct initial payload
  let payload: any = {
    customer_name: customer_name || `Usuario WA`,
    address: address || "Ubicación pendiente",
    items: body || "Pedido por definir",
    status: "pending",
    total_price: 0,
    whatsapp_number: from,
    metadata: { 
      lat: lat || null, 
      lng: lng || null,
      raw_message: body 
    }
  };

  try {
    let attempts = 0;
    let dataToReturn: any = null;
    let finalError: any = null;

    while (attempts < 5) {
      const { data, error } = await supabase
        .from("orders")
        .insert([payload])
        .select();

      if (!error) {
        dataToReturn = data;
        finalError = null;
        break;
      }

      finalError = error;
      const errMsg = error.message || '';
      let modified = false;

      // Handle missing whatsapp_number
      if (errMsg.toLowerCase().includes('whatsapp_number') && 'whatsapp_number' in payload) {
        const wa = payload.whatsapp_number;
        delete payload.whatsapp_number;
        payload.customer_name = `${payload.customer_name} (WA: ${wa})`;
        modified = true;
      }

      // Handle missing metadata
      if (errMsg.toLowerCase().includes('metadata') && 'metadata' in payload) {
        delete payload.metadata;
        modified = true;
      }

      if (!modified) {
        break;
      }

      attempts++;
    }

    if (finalError) throw finalError;
    
    console.log("Pedido de WhatsApp guardado:", dataToReturn);

    res.status(200).json({ 
      status: "success", 
      order: dataToReturn ? dataToReturn[0] : null
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

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, CheckCheck, Smartphone, Bot, User } from 'lucide-react';
import { Message } from '../types';

export default function WhatsAppChat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hola, AquaControl. Quisiera pedir garrafones.', sender: 'client', timestamp: new Date() },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const simulateProcess = async () => {
    setIsProcessing(true);
    
    // Simulate user sending the quantity
    setTimeout(() => {
      const msg: Message = { id: Date.now().toString(), text: 'Necesito 3 garrafones en Polanco.', sender: 'client', timestamp: new Date() };
      setMessages(prev => [...prev, msg]);
      
      // System auto-response
      setTimeout(() => {
        const reply: Message = { 
          id: (Date.now() + 1).toString(), 
          text: '✅ Pedido confirmado. 3 garrafones en camino a Polanco. Total: $135 MXN.', 
          sender: 'system', 
          timestamp: new Date() 
        };
        setMessages(prev => [...prev, reply]);
        setIsProcessing(false);
      }, 1500);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-[#E5DDD5] rounded overflow-hidden border border-slate-200 w-full max-w-[320px] mx-auto shadow-sm">
      {/* Header */}
      <div className="bg-[#075E54] px-4 py-3 text-white flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-sky-600" />
        <div>
          <h3 className="font-semibold text-sm">Juan Pérez</h3>
          <p className="text-[11px] opacity-80">En línea</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar flex flex-col">
        <div className="wa-msg bg-white self-start p-2 px-3 rounded-lg text-[13px] leading-relaxed shadow-sm max-w-[85%]">
          Hola AquaControl, necesito 3 garrafones para mi domicilio en Polanco por favor.
        </div>
        
        <div className="self-center bg-[#fff3cd] text-[#856404] text-[10px] px-2 py-1 rounded font-bold uppercase my-2">
          Bot AquaControl detectado
        </div>

        <div className="bg-[#dcf8c6] self-end p-2 px-3 rounded-lg text-[13px] leading-relaxed shadow-sm max-w-[85%]">
          ¡Hola Juan! He procesado tu pedido de <b>3 unidades</b>.<br /><br />
          Confirmado para: <b>Horacio 123, Int 402</b>.<br />
          Total: <b>$135.00 MXN</b>.
        </div>
        
        <div className="bg-[#dcf8c6] self-end p-2 px-3 rounded-lg text-[13px] leading-relaxed shadow-sm max-w-[85%]">
          Repartidor asignado: <b>Carlos R.</b><br />
          Tiempo estimado: <b>35 mins</b>.
        </div>

        <div className="wa-msg bg-white self-start p-2 px-3 rounded-lg text-[13px] leading-relaxed shadow-sm max-w-[85%]">
          Excelente, gracias.
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="bg-[#f0f0f0] p-2.5 flex gap-2 items-center">
        <div className="flex-1 bg-white rounded-full px-4 py-1.5 text-[13px] text-slate-400">
          Escribe un mensaje...
        </div>
        <div className="text-[#075e54] text-xl px-2">➤</div>
      </div>
    </div>
  );
}

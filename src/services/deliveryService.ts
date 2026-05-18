
import { supabase } from '../lib/supabaseClient';
import { Order } from '../lib/types.supabase';

/**
 * handleCompleteDelivery
 * Actualiza el estado del pedido y genera el mensaje para el ticket de WhatsApp.
 */
export async function handleCompleteDelivery(orderId: string) {
  try {
    // 1. Actualizar estado en Supabase
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        status: 'delivered',
        delivered_at: new Date().toISOString() 
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    const order = data as Order;

    // 2. Generar texto para el Ticket Digital de WhatsApp
    const ticketText = `
*✅ TICKET DIGITAL - QUALITY WATER*
----------------------------------
*Folio:* ${order.id.slice(0, 8)}
*Fecha:* ${new Date().toLocaleDateString()}
*Cliente:* ${order.customer_name}
*Producto:* ${order.items}
*Total:* $${order.total_price.toFixed(2)}
----------------------------------
*¡Gracias por su preferencia!*
Purificadora Quality Water
    `.trim();

    return {
      success: true,
      ticketText,
      order
    };
  } catch (error: any) {
    console.error('Error al completar pedido:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * openWhatsAppTicket
 * Abre WhatsApp con el mensaje pre-llenado para el cliente
 */
export function openWhatsAppTicket(phone: string | undefined, message: string) {
  if (!phone) return;
  const cleanPhone = phone.replace(/\D/g, '');
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

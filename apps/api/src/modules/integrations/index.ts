import { prisma } from '../../database/client';

/**
 * Phase 2 Integration Seams:
 * Standard interfaces and mock/manual Phase 1 implementations for Telephony, Messaging, and Outbox Event Publishing.
 */

// ---------------------------------------------------------------------------
// 1. Telephony Provider
// ---------------------------------------------------------------------------

export interface TelephonyCallParams {
  fromNumber: string;
  toNumber: string;
  leadId?: number;
  caseId?: number;
  userId: number;
}

export interface TelephonyCallResult {
  sessionId: string;
  callUrl: string;
  status: 'initiated' | 'failed';
}

export interface TelephonyWebhookPayload {
  sessionId: string;
  event: 'inbound' | 'missed' | 'answered' | 'ended';
  from: string;
  to: string;
  durationSeconds?: number;
  recordingUrl?: string;
  timestamp: string;
}

export interface TelephonyProvider {
  name: string;
  initiateCall(params: TelephonyCallParams): Promise<TelephonyCallResult>;
  handleWebhook(payload: TelephonyWebhookPayload): Promise<{ acknowledged: boolean }>;
  getRecordingUrl(sessionId: string): Promise<string | null>;
}

export class ManualTelephonyProvider implements TelephonyProvider {
  name = 'manual_phone_link';

  async initiateCall(params: TelephonyCallParams): Promise<TelephonyCallResult> {
    const cleanNumber = params.toNumber.replace(/[^0-9+]/g, '');
    const sessionId = `manual_call_${Date.now()}_${params.userId}`;
    return {
      sessionId,
      callUrl: `tel:${cleanNumber}`,
      status: 'initiated',
    };
  }

  async handleWebhook(payload: TelephonyWebhookPayload): Promise<{ acknowledged: boolean }> {
    // In Phase 1, call logging is recorded manually by telecallers
    return { acknowledged: true };
  }

  async getRecordingUrl(sessionId: string): Promise<string | null> {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 2. Messaging Provider (WhatsApp / SMS)
// ---------------------------------------------------------------------------

export interface SendTemplateParams {
  to: string;
  templateName: string;
  language: 'en' | 'ml';
  parameters?: Record<string, string>;
  leadId?: number;
  caseId?: number;
}

export interface SendCustomMessageParams {
  to: string;
  text: string;
  leadId?: number;
  caseId?: number;
}

export interface MessageResult {
  messageId: string;
  status: 'queued' | 'sent' | 'failed';
  linkUrl?: string; // Click-to-chat URL in Phase 1
}

export interface MessagingProvider {
  name: string;
  sendTemplate(params: SendTemplateParams): Promise<MessageResult>;
  sendCustomMessage(params: SendCustomMessageParams): Promise<MessageResult>;
  handleDeliveryReceipt(payload: { messageId: string; status: 'delivered' | 'read' | 'failed' }): Promise<void>;
}

export class ManualWhatsAppProvider implements MessagingProvider {
  name = 'manual_whatsapp_link';

  async sendTemplate(params: SendTemplateParams): Promise<MessageResult> {
    const cleanNumber = params.to.replace(/[^0-9]/g, '');
    let text = `Hello from Hospital CRM.`;
    if (params.templateName === 'appointment_reminder') {
      text = `Greetings. This is a reminder for your upcoming hospital appointment.`;
    }
    const encoded = encodeURIComponent(text);
    return {
      messageId: `wa_${Date.now()}`,
      status: 'sent',
      linkUrl: `https://wa.me/${cleanNumber}?text=${encoded}`,
    };
  }

  async sendCustomMessage(params: SendCustomMessageParams): Promise<MessageResult> {
    const cleanNumber = params.to.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(params.text);
    return {
      messageId: `wa_msg_${Date.now()}`,
      status: 'sent',
      linkUrl: `https://wa.me/${cleanNumber}?text=${encoded}`,
    };
  }

  async handleDeliveryReceipt(payload: { messageId: string; status: 'delivered' | 'read' | 'failed' }): Promise<void> {
    // Handled in Phase 2 webhooks
  }
}

// ---------------------------------------------------------------------------
// 3. Event Publisher (Outbox Pattern)
// ---------------------------------------------------------------------------

export type CrmEventType =
  | 'lead.created'
  | 'lead.status_changed'
  | 'lead.converted'
  | 'appointment.booked'
  | 'appointment.cancelled'
  | 'emergency.redirected'
  | 'task.created'
  | 'task.overdue'
  | 'task.completed'
  | 'escalation.raised'
  | 'escalation.decided'
  | 'case.stage_changed'
  | 'case.treatment_completed'
  | 'case.closed';

export interface EventPublisher {
  publish(eventType: CrmEventType, payload: Record<string, any>, correlationId?: string): Promise<{ eventId: number }>;
}

export class PrismaOutboxEventPublisher implements EventPublisher {
  async publish(
    eventType: CrmEventType,
    payload: Record<string, any>,
    correlationId?: string
  ): Promise<{ eventId: number }> {
    const event = await prisma.outboxEvent.create({
      data: {
        eventType,
        payload: {
          ...payload,
          correlationId: correlationId || `corr_${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return { eventId: event.id };
  }
}

// Default Singletons for Phase 1
export const defaultTelephonyProvider: TelephonyProvider = new ManualTelephonyProvider();
export const defaultMessagingProvider: MessagingProvider = new ManualWhatsAppProvider();
export const defaultEventPublisher: EventPublisher = new PrismaOutboxEventPublisher();

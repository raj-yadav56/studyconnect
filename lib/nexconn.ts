"use client";
// All Nexconn SDK calls live here. If an SDK signature differs, fix it in this file only.
let sdk: any = null;
const ctl = { typing: "__sc_typing__", read: "__sc_read__" };

export async function connect(token: string, onMsg: (m: any) => void) {
  sdk = await import("@nexconn/chat");
  const { NCEngine, MessageHandler, ConnectionStatusHandler } = sdk;
  if (!(window as any).__ncInit) {
    NCEngine.initialize({ appKey: process.env.NEXT_PUBLIC_NEXCONN_APP_KEY });
    (window as any).__ncInit = true;
  }
  NCEngine.addMessageHandler("sc", new MessageHandler({
    onMessageReceived: (m: any) => onMsg(normalize(m)),
  }));
  try { NCEngine.addConnectionStatusHandler("sc", new ConnectionStatusHandler({})); } catch {}
  const res = await NCEngine.connect({ token });
  if (res && res.isOk === false) throw new Error("Nexconn connect failed (code " + (res.code ?? "?") + ")");
}

function normalize(m: any) {
  const group = String(m.channelType ?? "").toLowerCase().includes("group");
  return {
    id: String(m.messageId ?? m.uid ?? Math.random()),
    from: m.senderUserId ?? m.senderId,
    channel: m.channelId ?? m.targetId,
    group,
    text: m.text ?? m.content?.text ?? "",
    time: m.sentTime ?? Date.now(),
  };
}

// VERIFY: channel construction against the SDK docs (DirectChannel / GroupChannel).
function channelFor(group: boolean, id: string) {
  const { DirectChannel, DirectChannelIdentifier, GroupChannel } = sdk;
  if (group) return new GroupChannel(id);
  return new DirectChannel(new DirectChannelIdentifier(id));
}

export async function ensureGroup(id: string, name: string) {
  const { GroupChannel } = sdk;
  try { await GroupChannel.createGroup({ groupId: id, name }); } catch {}
  try { await channelFor(true, id).join(); } catch {}
}

async function send(group: boolean, id: string, text: string) {
  const { SendTextMessageParams } = sdk;
  return channelFor(group, id).sendMessage(new SendTextMessageParams({ text }));
}
export const sendText = (g: boolean, id: string, t: string) => send(g, id, t);
export const sendTyping = (g: boolean, id: string) => send(g, id, ctl.typing).catch(() => {});
export const sendRead = (g: boolean, id: string) => send(g, id, ctl.read).catch(() => {});
export const isTyping = (t: string) => t === ctl.typing;
export const isRead = (t: string) => t === ctl.read;
export async function disconnect() { try { await sdk?.NCEngine.disconnect(); } catch {} }

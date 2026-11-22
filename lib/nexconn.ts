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
    onMessageReceived: (m: any) => { console.log("[SC] received", m); onMsg(normalize(m)); },
  }));
  try { NCEngine.addConnectionStatusHandler("sc", new ConnectionStatusHandler({})); } catch {}
  const res = await NCEngine.connect({ token });
  console.log("[SC] connect", res);
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

function channelFor(group: boolean, id: string) {
  const { DirectChannel, DirectChannelIdentifier, GroupChannel } = sdk;
  if (group) return new GroupChannel(id);
  return new DirectChannel(new DirectChannelIdentifier(id));
}

export async function ensureGroup(id: string, name: string) {
  const { GroupChannel } = sdk;
  try { console.log("[SC] createGroup", id, await GroupChannel.createGroup({ groupId: id, name })); } catch (e) { console.log("[SC] createGroup error", e); }
  try { console.log("[SC] join", id, await channelFor(true, id).join()); } catch (e) { console.log("[SC] join error", e); }
}

async function send(group: boolean, id: string, text: string) {
  const { SendTextMessageParams } = sdk;
  const res = await channelFor(group, id).sendMessage(new SendTextMessageParams({ text }));
  console.log("[SC] send", group ? "group" : "direct", id, text, res);
  if (res && res.isOk === false) throw new Error("Send failed, code " + (res.code ?? "?"));
  return res;
}
export const sendText = (g: boolean, id: string, t: string) => send(g, id, t);
export const sendTyping = (g: boolean, id: string) => send(g, id, ctl.typing).catch(() => {});
export const sendRead = (g: boolean, id: string) => send(g, id, ctl.read).catch(() => {});
export const isTyping = (t: string) => t === ctl.typing;
export const isRead = (t: string) => t === ctl.read;
export async function disconnect() { try { await sdk?.NCEngine.disconnect(); } catch {} }
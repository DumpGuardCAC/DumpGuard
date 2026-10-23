import webpush from 'web-push';

export function makeSender(env = process.env) {
  const { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: subject } = env;
  if (!pub || !priv || !subject) return null;
  webpush.setVapidDetails(subject, pub, priv);
  return (sub, payload) =>
    webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 6 * 3600, urgency: 'normal' });
}

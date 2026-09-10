import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

function extractImageUrl(payload) {
  if (!payload || typeof payload !== 'object') return '';
  if (typeof payload.imageUrl === 'string' && payload.imageUrl) return payload.imageUrl;
  if (typeof payload.url === 'string' && payload.url) return payload.url;
  if (typeof payload.output === 'string' && payload.output) return payload.output;
  if (payload.data && typeof payload.data === 'object') {
    if (typeof payload.data.imageUrl === 'string' && payload.data.imageUrl) return payload.data.imageUrl;
    if (typeof payload.data.url === 'string' && payload.data.url) return payload.data.url;
  }
  if (Array.isArray(payload.data) && payload.data.length > 0) {
    const first = payload.data[0];
    if (typeof first === 'string' && first) return first;
    if (first && typeof first === 'object') {
      if (typeof first.url === 'string' && first.url) return first.url;
      if (typeof first.imageUrl === 'string' && first.imageUrl) return first.imageUrl;
    }
  }
  if (Array.isArray(payload.images) && payload.images.length > 0) {
    const first = payload.images[0];
    if (typeof first === 'string' && first) return first;
    if (first && typeof first === 'object') {
      if (typeof first.url === 'string' && first.url) return first.url;
      if (typeof first.imageUrl === 'string' && first.imageUrl) return first.imageUrl;
    }
  }
  if (payload.output && typeof payload.output === 'object') {
    const media = payload.output.media_url;
    if (Array.isArray(media) && media.length > 0 && typeof media[0] === 'string') return media[0];
  }
  return '';
}

export async function generateFluxImage(prompt) {
  const apiKey = process.env.FLUXImage || process.env.FLUXIMAGE_API_KEY || '';
  const endpointList = String(
    process.env.FLUXIMAGE_API_URLS ||
    process.env.FLUXIMAGE_API_URL ||
    'https://gateway.pixazo.ai/flux-1-schnell/v1/getData'
  )
    .split(',')
    .map((endpoint) => endpoint.trim())
    .filter((endpoint) => /flux-1-schnell\/v1\/getData/i.test(endpoint));
  const modelList = String(process.env.FLUXIMAGE_FREE_MODELS || 'flux-schnell,flux-dev,flux')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  if (!apiKey) {
    return { imageUrl: '', error: 'FLUXImage API key is missing.' };
  }

  const buildPayload = (model) => ({
    prompt,
    model,
    num_steps: Number(process.env.FLUXIMAGE_NUM_STEPS || 6),
    width: 1024,
    height: 1024,
  });

  let lastError = 'Unknown FLUXImage error';
  const safeEndpointList = endpointList.length ? endpointList : ['https://gateway.pixazo.ai/flux-1-schnell/v1/getData'];

  for (const endpoint of safeEndpointList) {
    for (const model of modelList) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Ocp-Apim-Subscription-Key': apiKey,
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(buildPayload(model)),
        });

        if (!res.ok) {
          const errText = await res.text();
          lastError = `FLUXImage API error (${res.status}) on ${endpoint} model ${model || 'default'}: ${errText}`;
          continue;
        }

        const payload = await res.json();
        const imageUrl = extractImageUrl(payload);
        if (imageUrl) {
          return { imageUrl, error: '' };
        }

        const pollingUrl = typeof payload.polling_url === 'string' ? payload.polling_url : '';
        const requestId = typeof payload.request_id === 'string' ? payload.request_id : '';
        if (pollingUrl || requestId) {
          const statusUrl = pollingUrl || `https://gateway.pixazo.ai/v2/requests/status/${requestId}`;
          const maxPolls = Number(process.env.FLUXIMAGE_POLL_MAX || 6);
          const pollDelay = Number(process.env.FLUXIMAGE_POLL_DELAY_MS || 2500);

          for (let i = 0; i < maxPolls; i++) {
            await new Promise((resolve) => setTimeout(resolve, pollDelay));
            const statusRes = await fetch(statusUrl, {
              headers: {
                'Ocp-Apim-Subscription-Key': apiKey,
                Authorization: `Bearer ${apiKey}`,
              },
            });

            if (!statusRes.ok) {
              const statusErr = await statusRes.text();
              lastError = `FLUXImage polling failed (${statusRes.status}) on ${endpoint}: ${statusErr}`;
              break;
            }

            const statusPayload = await statusRes.json();
            const statusImage = extractImageUrl(statusPayload);
            if (statusImage) {
              return { imageUrl: statusImage, error: '' };
            }

            const status = String(statusPayload.status || '').toUpperCase();
            if (status === 'FAILED' || status === 'ERROR') {
              lastError = `FLUXImage status ${status} on ${endpoint}: ${statusPayload.error || 'Unknown error'}`;
              break;
            }
          }
        }

        lastError = `FLUXImage API returned no image URL on ${endpoint} model ${model || 'default'}`;
      } catch (err) {
        lastError = `FLUXImage request failed on ${endpoint} model ${model || 'default'}: ${err.message}`;
      }
    }
  }

  return { imageUrl: '', error: lastError };
}

export async function toDataUrlIfPossible(imageUrl) {
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) return '';
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return '';
    const contentType = res.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > 8 * 1024 * 1024) return '';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return '';
  }
}

export async function cacheImageLocally(imageUrl) {
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) return '';
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return '';

    const contentType = res.headers.get('content-type') || 'image/png';
    const ext = contentType.includes('jpeg') || contentType.includes('jpg')
      ? 'jpg'
      : contentType.includes('webp')
        ? 'webp'
        : 'png';

    const bytes = Buffer.from(await res.arrayBuffer());
    if (!bytes.length) return '';

    const uploadsDir = path.resolve(process.cwd(), 'uploads', 'generated');
    await fs.mkdir(uploadsDir, { recursive: true });

    const fileName = `flux-${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    await fs.writeFile(filePath, bytes);

    const backendPublicUrl = process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000';
    return `${backendPublicUrl}/uploads/generated/${fileName}`;
  } catch {
    return '';
  }
}

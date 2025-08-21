
export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (request.method === 'POST') {
      const contentType = request.headers.get('content-type') || '';
      if (!contentType.includes('multipart/form-data')) {
        return new Response(JSON.stringify({ error: 'Invalid content type' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      const formData = await request.formData();
      const image = formData.get('image');
      if (!image) {
        return new Response(JSON.stringify({ error: 'No image provided' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      const cloudName = env.CLOUDINARY_CLOUD_NAME;
      const apiKey = env.CLOUDINARY_API_KEY;
      const apiSecret = env.CLOUDINARY_API_SECRET;
      const timestamp = Math.floor(Date.now() / 1000);
      const paramsToSign = `timestamp=${timestamp}${apiSecret}`;
      const signature = await sha1(paramsToSign);
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const uploadForm = new FormData();
      uploadForm.append('file', image);
      uploadForm.append('api_key', apiKey);
      uploadForm.append('timestamp', timestamp);
      uploadForm.append('signature', signature);
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        body: uploadForm,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        return new Response(JSON.stringify({ error: uploadData.error?.message || 'Cloudinary upload failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      return new Response(JSON.stringify({ imageUrl: uploadData.secure_url, public_id: uploadData.public_id }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (request.method === 'DELETE') {
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      const { public_id } = body;
      if (!public_id) {
        return new Response(JSON.stringify({ error: 'No public_id provided' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      const cloudName = env.CLOUDINARY_CLOUD_NAME;
      const apiKey = env.CLOUDINARY_API_KEY;
      const apiSecret = env.CLOUDINARY_API_SECRET;
      const timestamp = Math.floor(Date.now() / 1000);
      const paramsToSign = `public_id=${public_id}&timestamp=${timestamp}${apiSecret}`;
      const signature = await sha1(paramsToSign);
      const deleteUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;
      const deleteForm = new FormData();
      deleteForm.append('public_id', public_id);
      deleteForm.append('api_key', apiKey);
      deleteForm.append('timestamp', timestamp);
      deleteForm.append('signature', signature);
      const deleteRes = await fetch(deleteUrl, {
        method: 'POST',
        body: deleteForm,
      });
      const deleteData = await deleteRes.json();
      if (!deleteRes.ok || deleteData.result !== 'ok') {
        return new Response(JSON.stringify({ error: deleteData.error?.message || 'Cloudinary delete failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      return new Response(JSON.stringify({ result: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function sha1(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

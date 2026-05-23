exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const now = new Date();
    const dateStr = (now.getMonth()+1) + '/' + now.getDate() + '/' + now.getFullYear();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Chicago' });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1a3a5c;color:#fff;padding:20px;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;font-size:22px;">NEW COMMERCIAL MAINTENANCE LEAD</h1>
        </div>
        <div style="background:#f8f9fa;padding:20px;border:1px solid #ddd;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px;font-weight:bold;color:#555;width:160px;">Building Type</td><td style="padding:8px;">${data.buildingType || ''}</td></tr>
            <tr style="background:#fff;"><td style="padding:8px;font-weight:bold;color:#555;">Roof Age</td><td style="padding:8px;">${data.roofAge || ''}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#555;">Current Maintenance</td><td style="padding:8px;">${data.maintenance || ''}</td></tr>
            <tr style="background:#fff;"><td style="padding:8px;font-weight:bold;color:#555;">Biggest Concern</td><td style="padding:8px;">${data.painPoint || ''}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#555;">Building Size</td><td style="padding:8px;">${data.buildingSize || ''} sq ft</td></tr>
          </table>
        </div>
        <div style="background:#fff;padding:20px;border:1px solid #ddd;border-top:none;">
          <h3 style="margin:0 0 10px;color:#1a3a5c;">Contact Info</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px;font-weight:bold;color:#555;width:160px;">Name</td><td style="padding:6px;">${data.name || ''}</td></tr>
            <tr><td style="padding:6px;font-weight:bold;color:#555;">Phone</td><td style="padding:6px;">${data.phone || ''}</td></tr>
            <tr><td style="padding:6px;font-weight:bold;color:#555;">Email</td><td style="padding:6px;">${data.email || ''}</td></tr>
            <tr><td style="padding:6px;font-weight:bold;color:#555;">Building Address</td><td style="padding:6px;">${data.address || ''}</td></tr>
            <tr><td style="padding:6px;font-weight:bold;color:#555;">Best Time to Call</td><td style="padding:6px;">${data.bestTime || ''}</td></tr>
          </table>
        </div>
        <div style="padding:12px 20px;background:#f0f0f0;border:1px solid #ddd;border-top:none;border-radius:0 0 8px 8px;font-size:12px;color:#888;">
          Submitted: ${dateStr} at ${timeStr} CST — Complete Contractor Group Chatbot
        </div>
      </div>
    `;

    // Extract city from address for subject
    const addressParts = (data.address || '').split(',');
    const city = addressParts.length > 1 ? addressParts[addressParts.length - 2].trim() : 'Texas';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer re_EMEfU4tC_LMH1j7Dt2N7pira4dsULRV4g',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'CCG Chatbot <noreply@ammoheisenberg.com>',
        to: ['Office@completecontractorgroup.com'],
        subject: `New Maintenance Lead: ${data.buildingType || 'Commercial'} in ${city}`,
        html: html
      })
    });

    const result = await response.json();

    return {
      statusCode: response.ok ? 200 : 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: response.ok, id: result.id })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};

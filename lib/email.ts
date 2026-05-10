
const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_placeholder';

async function resendFetch(endpoint: string, options: any) {
  const response = await fetch(`https://api.resend.com${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  const data = await response.json();
  if (!response.ok) {
    return { data: null, error: data };
  }
  return { data, error: null };
}

export async function sendOrderConfirmationEmail(order: any) {
  try {
    const email = order.profile?.email || order.guestEmail;
    if (!email) return;

    const { data, error } = await resendFetch('/emails', {
      from: 'Divyafal <orders@divyafal.com>',
      to: [email],
      subject: `Order Confirmation - #${order.id.substring(0, 8)}`,
      html: `
        <h1>Thank you for your order!</h1>
        <p>Your order #${order.id} has been placed successfully.</p>
        <p>Total Amount: ₹${order.totalAmount}</p>
        <p>We will notify you once your order is shipped.</p>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
    }
    return data;
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

export async function sendShippingUpdateEmail(order: any) {
  try {
    const email = order.profile?.email || order.guestEmail;
    if (!email) return;

    const { data, error } = await resendFetch('/emails', {
      from: 'Divyafal <orders@divyafal.com>',
      to: [email],
      subject: `Shipping Update - #${order.id.substring(0, 8)}`,
      html: `
        <h1>Your order has been shipped!</h1>
        <p>Tracking ID: ${order.trackingId}</p>
        ${order.trackingUrl ? `<p>Track here: <a href="${order.trackingUrl}">${order.trackingUrl}</a></p>` : ''}
      `,
    });

    if (error) {
      console.error('Resend error:', error);
    }
    return data;
  } catch (error) {
    console.error('Failed to send shipping email:', error);
  }
}

export async function sendAdminRFQNotification(order: any) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'owner@divyafal.com';
    const customerEmail = order.profile?.email || order.guestEmail;
    const customerName = order.profile?.fullName || order.guestName;
    const customerPhone = order.profile?.phone || order.guestPhone || order.shippingAddress?.phone;

    const { data, error } = await resendFetch('/emails', {
      from: 'Divyafal RFQ <orders@divyafal.com>',
      to: [adminEmail],
      subject: `New Quote Request - #${order.id.substring(0, 8)}`,
      html: `
        <h1>New Request for Quote</h1>
        <p>A customer has requested a quote for a customized order.</p>
        
        <h3>Customer Details:</h3>
        <ul>
          <li><strong>Name:</strong> ${customerName}</li>
          <li><strong>Email:</strong> ${customerEmail}</li>
          <li><strong>Phone:</strong> ${customerPhone}</li>
        </ul>

        <h3>Order Items:</h3>
        <ul>
          ${order.items.map((item: any) => `
            <li>
              <strong>${item.product?.name}</strong> (Size: ${item.variant?.size || 'N/A'})
              ${item.customMeasurements ? `<br/>Custom Measurements: ${JSON.stringify(item.customMeasurements)}` : ''}
            </li>
          `).join('')}
        </ul>

        <p>Total Estimate: ₹${order.totalAmount}</p>
        
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/orders/${order.id}">View Order in Dashboard</a></p>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
    }
    return data;
  } catch (error) {
    console.error('Failed to send admin RFQ notification:', error);
  }
}

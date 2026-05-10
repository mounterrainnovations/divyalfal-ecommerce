import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { paymentsService } from '@/lib/payments';
import { sendAdminRFQNotification } from '@/lib/email';


export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const profileId = user?.id;

    const body = await req.json();
    const { address, items, totalAmount, isGuest, type = 'STANDARD' } = body;


    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (!profileId && !isGuest) {
      return NextResponse.json(
        { error: 'Authentication or Guest status required for checkout' },
        { status: 401 }
      );
    }

    // Resolve missing variant IDs and Check Stock
    const resolvedItems = await Promise.all(items.map(async (item: { 
      productId: string; 
      size: string; 
      quantity: number; 
      price: number; 
      variantId?: string; 
      customMeasurements?: { bust: string; waist: string; hips: string } | null;
    }) => {
      const variantId = item.variantId;
      
      const variant = await prisma.productVariant.findFirst({
        where: variantId ? { id: variantId } : {
          productId: item.productId,
          size: item.size
        },
        include: { product: true }
      });
      
      if (!variant) {
        throw new Error(`Variant not found for Product: ${item.productId}, Size: ${item.size}`);
      }

      if (variant.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${variant.product.name} (${variant.size}). Available: ${variant.stock}`);
      }

      const dbPrice = variant.product.sale && variant.product.salePrice 
        ? variant.product.salePrice 
        : variant.product.price;

      return {
        productId: item.productId,
        productVariantId: variant.id,
        quantity: item.quantity,
        price: dbPrice,
        customMeasurements: item.customMeasurements,
      };
    }));

    // Server-side calculation of total amount
    const serverTotalAmount = resolvedItems.reduce((total, item) => {
      return total + (Number(item.price) * item.quantity);
    }, 0);

    // Begin Database Transaction to create Order, decrement stock, and create payment
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Order
      const newOrder = await tx.order.create({
        data: {
          profileId: profileId || null,
          isGuest: !!isGuest,
          guestEmail: isGuest ? address.email : null,
          guestPhone: isGuest ? address.phone : null,
          guestName: isGuest ? address.fullName : null,
          totalAmount: serverTotalAmount,
          shippingAddress: address as any, 
          type: type as any,
          status: type === 'RFQ' ? 'QUOTE_REQUESTED' : 'PENDING',
          paymentStatus: 'PENDING',
          items: {
            create: resolvedItems
          }
        },
        include: {
          items: {
            include: {
              product: true,
              variant: true
            }
          }
        }
      });


      // 2. Deduct stock for each variant
      for (const item of resolvedItems) {
        await tx.productVariant.update({
          where: { id: item.productVariantId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      // 3. Conditional Razorpay Order Creation
      let rzpOrderId = null;
      if (type === 'STANDARD') {
        const rzpOrder = await paymentsService.createOrder({
          amount: Math.round(Number(serverTotalAmount) * 100), // in paise
          currency: 'INR',
          receipt: newOrder.id,
          notes: {
            orderId: newOrder.id,
            profileId: profileId || 'GUEST',
            customerName: address.fullName
          }
        });

        rzpOrderId = rzpOrder.id;

        // 4. Update Order with Razorpay Order ID
        await tx.order.update({
          where: { id: newOrder.id },
          data: { razorpayOrderId: rzpOrderId }
        });

        // 5. Create Payment record
        await tx.payment.create({
          data: {
            id: crypto.randomUUID(),
            orderId: newOrder.id,
            profileId: profileId || null,
            providerOrderId: rzpOrderId,
            amount: Math.round(Number(serverTotalAmount) * 100),
            status: 'created',
          }
        });
      } else if (type === 'RFQ') {
        // For RFQ, trigger admin notification
        await sendAdminRFQNotification(newOrder);
      }

      return { ...newOrder, razorpayOrderId: rzpOrderId };
    });


    return NextResponse.json({ data: result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to place order';
    console.error('Checkout API Error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes('Insufficient stock') || errorMessage.includes('Variant not found') ? 400 : 500 }
    );
  }
}

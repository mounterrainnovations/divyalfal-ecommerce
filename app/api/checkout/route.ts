import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const profileId = user?.id;

    if (!profileId) {
      return NextResponse.json(
        { error: 'Authentication required for checkout' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { address, items, totalAmount } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
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

      return {
        productId: item.productId,
        productVariantId: variant.id,
        quantity: item.quantity,
        price: item.price,
        customMeasurements: item.customMeasurements,
      };
    }));

    // Begin Database Transaction to create Order and decrement stock
    const order = await prisma.$transaction(async (tx) => {
      // 1. Create the Order
      const newOrder = await tx.order.create({
        data: {
          profileId: profileId!,
          totalAmount,
          shippingAddress: address as any, // Cast to any to handle Prisma's complex JSON types
          status: 'PENDING',
          paymentStatus: 'PENDING',
          items: {
            create: resolvedItems
          }
        },
        include: {
          items: true
        }
      });

      // 2. Deduct stock for each variant
      for (const item of resolvedItems) {
        await tx.productVariant.update({
          where: { id: item.productVariantId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      return newOrder;
    });

    return NextResponse.json({ data: order });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to place order';
    console.error('Checkout API Error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes('Insufficient stock') || errorMessage.includes('Variant not found') ? 400 : 500 }
    );
  }
}

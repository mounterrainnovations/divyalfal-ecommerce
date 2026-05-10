import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { sendShippingUpdateEmail } from '@/lib/email'


export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is ADMIN
    const profile = await prisma.profile.findUnique({
      where: { id: user.id }
    })

    if (profile?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { status, paymentStatus, trackingId, trackingUrl } = body

    const oldOrder = await prisma.order.findUnique({ where: { id } })

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
        trackingId: trackingId !== undefined ? trackingId : undefined,
        trackingUrl: trackingUrl !== undefined ? trackingUrl : undefined,
      },
      include: { profile: true }
    })

    // If tracking ID was added or changed, send shipping update email
    if (trackingId && trackingId !== oldOrder?.trackingId) {
      await sendShippingUpdateEmail(updatedOrder)
    }

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('API Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await prisma.profile.findUnique({
      where: { id: user.id }
    })

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        profile: true,
        items: {
          include: {
            product: true,
            variant: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if user is ADMIN or the owner of the order
    if (profile?.role !== 'ADMIN' && order.profileId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('API Error fetching order:', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

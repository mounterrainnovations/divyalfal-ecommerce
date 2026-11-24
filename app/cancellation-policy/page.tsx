import Footer from '@/components/layout/footer';

export const metadata = {
  title: 'Cancellation Policy | Divyafal',
  description: 'Learn about our order cancellation policy for boutique clothing and accessories.',
};

export default function CancellationPolicyPage() {
  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-16 sm:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold mb-4">Cancellation Policy</h1>
            <p className="text-gray-300 text-lg">Flexible options for order modifications</p>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="prose prose-lg max-w-none">
            {/* Introduction */}
            <section className="mb-12">
              <p className="text-gray-700 leading-relaxed mb-6">
                At Divyafal, we understand that plans can change. We strive to provide flexibility
                with our cancellation policy while ensuring efficient order processing and delivery.
              </p>
            </section>

            {/* Order Cancellation Window */}
            <section className="mb-12">
              <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">
                Order Cancellation Window
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may cancel your order within <strong>24 hours</strong> of placing it, provided
                the order has not been shipped. Once an order has been dispatched, it cannot be
                cancelled but may be eligible for return under our Refund Policy.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 my-6">
                <p className="text-blue-900 font-medium mb-2">💡 Quick Tip</p>
                <p className="text-blue-800">
                  To check your order status, log into your account or contact our customer service
                  team at{' '}
                  <a href="mailto:hello@divyafal.com" className="underline hover:text-blue-600">
                    hello@divyafal.com
                  </a>
                </p>
              </div>
            </section>

            {/* How to Cancel */}
            <section className="mb-12">
              <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">
                How to Cancel Your Order
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                To cancel an order, please follow these steps:
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                <ol className="list-decimal pl-6 text-gray-700 space-y-3">
                  <li>
                    <strong>Contact Us Immediately:</strong> Email us at{' '}
                    <a
                      href="mailto:hello@divyafal.com"
                      className="text-gray-900 underline hover:text-gray-700"
                    >
                      hello@divyafal.com
                    </a>{' '}
                    or call{' '}
                    <a
                      href="tel:+919876543210"
                      className="text-gray-900 underline hover:text-gray-700"
                    >
                      ‪+91 99770 57045‬
                    </a>
                  </li>
                  <li>
                    <strong>Provide Order Details:</strong> Include your order number and the email
                    address used for the purchase.
                  </li>
                  <li>
                    <strong>Confirmation:</strong> We will verify the order status and confirm the
                    cancellation via email within 2-4 hours.
                  </li>
                  <li>
                    <strong>Refund Processing:</strong> If the cancellation is successful, your
                    refund will be processed within 5-7 business days to your original payment
                    method.
                  </li>
                </ol>
              </div>
            </section>

            {/* Non-Cancellable Orders */}
            <section className="mb-12">
              <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">
                Non-Cancellable Orders
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                The following types of orders cannot be cancelled once placed:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Orders that have already been shipped</li>
                <li>Customized or personalized items (production begins immediately)</li>
                <li>Special occasion orders placed less than 7 days before the event date</li>
                <li>Items marked as &quot;Made to Order&quot;</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                For these orders, please refer to our{' '}
                <a href="/refund-policy" className="text-gray-900 underline hover:text-gray-700">
                  Refund Policy
                </a>{' '}
                for return options after delivery.
              </p>
            </section>

            {/* Modification of Orders */}
            <section className="mb-12">
              <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">
                Modification of Orders
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you need to modify your order (change size, color, shipping address, etc.),
                please contact us within <strong>12 hours</strong> of placing the order. We will do
                our best to accommodate your request, but modifications cannot be guaranteed once
                the order is being processed.
              </p>
              <div className="bg-amber-50 border-l-4 border-amber-500 p-6 my-6">
                <p className="text-amber-900 font-medium mb-2">⚠️ Important Note</p>
                <p className="text-amber-800">
                  Shipping address changes cannot be made once the order has been dispatched. Please
                  ensure your shipping information is correct before completing your purchase.
                </p>
              </div>
            </section>

            {/* Refund Timeline */}
            <section className="mb-12">
              <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">
                Refund Timeline
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Once your cancellation is confirmed:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>
                  <strong>Credit/Debit Cards:</strong> Refunds typically appear within 5-7 business
                  days
                </li>
                <li>
                  <strong>Net Banking:</strong> Refunds typically appear within 5-7 business days
                </li>
                <li>
                  <strong>UPI/Wallets:</strong> Refunds typically appear within 3-5 business days
                </li>
                <li>
                  <strong>Cash on Delivery:</strong> If you paid via COD and the order hasn&apos;t
                  shipped, no refund is necessary
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                Please note that the actual time for the refund to reflect in your account may vary
                depending on your bank or payment provider.
              </p>
            </section>

            {/* Seller-Initiated Cancellations */}
            <section className="mb-12">
              <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">
                Seller-Initiated Cancellations
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                In rare cases, we may need to cancel an order due to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Product unavailability or stock issues</li>
                <li>Pricing or product information errors</li>
                <li>Payment verification issues</li>
                <li>Inability to deliver to the specified address</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                If we cancel your order, you will be notified immediately via email and phone. A
                full refund will be processed automatically within 5-7 business days.
              </p>
            </section>

            {/* Contact Information */}
            <section className="mb-12">
              <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Need Help?</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about our cancellation policy or need assistance with an
                order, our customer service team is here to help:
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <p className="text-gray-700 mb-2">
                  <strong>Email:</strong>{' '}
                  <a
                    href="mailto:hello@divyafal.com"
                    className="text-gray-900 underline hover:text-gray-700"
                  >
                    hello@divyafal.com
                  </a>
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Phone:</strong>{' '}
                  <a
                    href="tel:+919876543210"
                    className="text-gray-900 underline hover:text-gray-700"
                  >
                    ‪+91 99770 57045‬
                  </a>
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Business Hours:</strong> Monday - Saturday, 10:00 AM - 7:00 PM IST
                </p>
                <p className="text-gray-700">
                  <strong>Address:</strong> A-41, Bawadiya Kalan, Pallavi Nagar, Bhopal, Madhya
                  Pradesh 462039
                </p>
              </div>
            </section>

            {/* Last Updated */}
            <section className="border-t border-gray-200 pt-8">
              <p className="text-sm text-gray-500 italic">Last updated: December 2025</p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

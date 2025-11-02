'use client';

import Link from 'next/link';
import Image from 'next/image';

const Footer = () => {
  return (
    <footer className="w-full border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 xl:px-32">
        <div className="flex flex-col md:flex-row justify-between gap-8 py-14 border-b border-gray-300/30">
          {/* Left: Brand + Description */}
          <div className="max-w-md">
            <Link href="/" className="inline-block">
              <Image
                src="/mocks/mock_footer_logo.png"
                alt="Company Logo"
                width={157}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </Link>

            <p className="mt-6 text-sm text-gray-500 leading-relaxed">
              Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum
              has been the industry`&apos;`s standard dummy text ever since the 1500s.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-4 mt-6">
              {[
                {
                  name: 'Twitter',
                  href: '#',
                  svg: (
                    <path
                      d="M19.167 2.5a9.1 9.1 0 0 1-2.617 1.275 3.733 3.733 0 0 0-6.55 2.5v.833a8.88 8.88 0 0 1-7.5-3.775s-3.333 7.5 4.167 10.833a9.7 9.7 0 0 1-5.834 1.667C8.333 20 17.5 15.833 17.5 6.25q0-.35-.067-.692A6.43 6.43 0 0 0 19.167 2.5"
                      stroke="#2563EB"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ),
                },
                {
                  name: 'GitHub',
                  href: '#',
                  svg: (
                    <path
                      d="M7.5 15.833c-4.167 1.25-4.167-2.084-5.833-2.5m11.666 5v-3.225a2.8 2.8 0 0 0-.783-2.175c2.616-.292 5.366-1.283 5.366-5.833a4.53 4.53 0 0 0-1.25-3.125 4.22 4.22 0 0 0-.075-3.142s-.983-.292-3.258 1.233a11.15 11.15 0 0 0-5.833 0C5.225.541 4.242.833 4.242.833a4.22 4.22 0 0 0-.075 3.142 4.53 4.53 0 0 0-1.25 3.15c0 4.516 2.75 5.508 5.366 5.833a2.8 2.8 0 0 0-.783 2.15v3.225"
                      stroke="#2563EB"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ),
                },
                {
                  name: 'LinkedIn',
                  href: '#',
                  svg: (
                    <path
                      d="M13.333 6.667a5 5 0 0 1 5 5V17.5H15v-5.833a1.667 1.667 0 0 0-3.334 0V17.5H8.333v-5.833a5 5 0 0 1 5-5M5 7.5H1.667v10H5zM3.333 5a1.667 1.667 0 1 0 0-3.333 1.667 1.667 0 0 0 0 3.333"
                      stroke="#2563EB"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ),
                },
              ].map((social, i) => (
                <Link
                  key={i}
                  href={social.href}
                  aria-label={social.name}
                  className="hover:opacity-80 transition-opacity"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-gray-700"
                  >
                    {social.svg}
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {/* Right: Links */}
          <div className="flex-1 flex flex-wrap justify-between gap-10">
            <div>
              <h2 className="font-semibold text-gray-900 mb-5">RESOURCES</h2>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>
                  <Link href="#">Catalogue</Link>
                </li>
                <li>
                  <Link href="#">About</Link>
                </li>
                <li>
                  <Link href="#">Contact</Link>
                </li>
                <li>
                  <Link href="#">Help</Link>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-5">COMPANY</h2>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>
                  <Link href="#">About</Link>
                </li>
                <li>
                  <Link href="#">Shipping</Link>
                </li>
                <li>
                  <Link href="#">Privacy</Link>
                </li>
                <li>
                  <Link href="#">Terms</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <p className="py-8 text-center text-xs md:text-sm text-gray-500">
          © {new Date().getFullYear()}{' '}
          <Link href="#" className="underline hover:text-gray-700">
            Divyafal
          </Link>
          . All Rights Reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;

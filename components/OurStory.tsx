'use client';

import Image from 'next/image';

const OurStory = () => {
  return (
    <section className="py-16 md:py-24 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left: Vertical Image */}
          <div className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden rounded-lg">
            <Image
              src="/photo.jpg"
              alt="Our Story"
              fill
              className="object-cover object-center"
              style={{ objectPosition: 'center top' }}
            />
          </div>

          {/* Right: Content */}
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif mb-8">
              Our Story
            </h2>
            <div className="space-y-4 text-base md:text-lg leading-relaxed text-muted-foreground">
              <p>
                In 2010, our founder embarked on an extraordinary journey with nothing but a dream
                and 16 carefully curated sarees. What started as a small venture has blossomed into
                a luxury fashion design studio that celebrates the art of personalized elegance.
              </p>
              <p>
                Today, Divyafal stands as a testament to the power of vision, creativity, and
                unwavering commitment to excellence. Our fashion show represents the culmination of
                years of artistic exploration and the celebration of individual style.
              </p>
              <p>
                This year's showcase promises to be our most spectacular yet, featuring
                cutting-edge designs, world-class models, and an unforgettable experience that
                defines luxury fashion.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OurStory;

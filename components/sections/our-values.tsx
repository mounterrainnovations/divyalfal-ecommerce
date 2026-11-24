'use client';

import { Sparkles, Heart, Users, Award, Palette, TrendingUp } from 'lucide-react';

const values = [
  {
    icon: Sparkles,
    title: 'Excellence',
    description:
      'We pursue perfection in every stitch, every design, and every customer interaction.',
  },
  {
    icon: Heart,
    title: 'Passion',
    description:
      'Our love for fashion drives us to create pieces that inspire and empower our clients.',
  },
  {
    icon: Users,
    title: 'Community',
    description:
      'Building lasting relationships with our customers and celebrating their unique stories.',
  },
  {
    icon: Award,
    title: 'Quality',
    description: 'Premium materials and craftsmanship that stand the test of time and trends.',
  },
  {
    icon: Palette,
    title: 'Creativity',
    description:
      'Pushing boundaries and embracing innovation while honoring traditional techniques.',
  },
  {
    icon: TrendingUp,
    title: 'Growth',
    description: 'Continuously evolving and adapting to meet the changing needs of modern fashion.',
  },
];

const OurValues = () => {
  return (
    <section className="py-14 md:py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Heading */}
        <h2 className="font-serif font-light text-3xl sm:text-4xl xl:text-5xl text-gray-900 tracking-tight text-center mb-8 md:mb-10">
          Our Values
        </h2>

        {/* Values Grid - 2x3 on mobile, 2x3 on tablet, 3x2 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-10 lg:gap-12">
          {values.map((value, index) => {
            const Icon = value.icon;
            return (
              <div
                key={index}
                className="flex flex-col items-center text-center space-y-2 md:space-y-4 p-3 md:p-6 rounded-lg hover:bg-background transition-colors"
              >
                <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center rounded-full bg-primary/10">
                  <Icon className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                </div>
                <h3 className="text-sm md:text-xl lg:text-2xl font-serif font-medium">
                  {value.title}
                </h3>
                <p className="text-xs md:text-base text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default OurValues;

import Button from '@/components/primitives/Button';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import Reveal from '@/components/primitives/Reveal';
import { siteCopy } from '@/lib/content/site-copy';

const { store } = siteCopy.contact;

/** Small uppercase label over a detail. An h3: the section heading above it is the h2. */
const DETAIL_HEADING = 'm-0 mb-2 font-ui text-eyebrow font-normal uppercase text-ink-soft';

const DETAIL_LINK =
  'inline-block py-1 text-ink underline decoration-gold underline-offset-4 transition-colors ' +
  'duration-300 hover:decoration-ink motion-reduce:transition-none break-words ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink';

const StoreLocationMap = () => {
  // Store location in Bhopal, Madhya Pradesh
  const address = store.address;
  const mapEmbedUrl = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3667.2!2d77.4126!3d23.2599!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x397c428f00000000%3A0x0!2zMjPCsDE1JzM1LjYiTiA3N8KwMjQnNDUuNCJF!5e0!3m2!1sen!2sin!4v1734451200000&q=${encodeURIComponent(address)}`;

  return (
    <section
      id="map-section"
      aria-labelledby="map-section-heading"
      className="section-rhythm bg-paper-deep"
    >
      <div className="grid-editorial gap-y-6">
        <Reveal className="col-span-12 md:col-span-7">
          <DisplayHeading level={2} size={2} className="text-balance">
            <span id="map-section-heading">{store.heading}</span>
          </DisplayHeading>
        </Reveal>
        <Reveal delay={60} className="col-span-12 self-end md:col-span-4 md:col-start-9">
          <p className="font-display text-body font-light text-ink">{store.body}</p>
        </Reveal>
      </div>

      <div className="grid-editorial mt-12 gap-y-10 md:mt-16">
        <div className="col-span-12 lg:col-span-8">
          <div className="h-[360px] w-full md:h-[520px]">
            <iframe
              src={mapEmbedUrl}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={store.mapTitle}
              className="h-full w-full border-0"
            />
          </div>
        </div>

        <div className="col-span-12 flex flex-col gap-10 font-ui text-body text-ink lg:col-span-4">
          <div>
            <h3 className={DETAIL_HEADING}>{store.addressHeading}</h3>
            <p className="m-0">{store.address}</p>
          </div>

          <div>
            <h3 className={DETAIL_HEADING}>{store.hoursHeading}</h3>
            <p className="m-0">
              {store.hours[0]}
              <br />
              {store.hours[1]}
            </p>
          </div>

          <div>
            <h3 className={DETAIL_HEADING}>{store.contactHeading}</h3>
            <p className="m-0 flex flex-col items-start">
              <a href={`tel:${store.phone}`} className={DETAIL_LINK}>
                {store.phone}
              </a>
              <a href={`mailto:${store.email}`} className={DETAIL_LINK}>
                {store.email}
              </a>
            </p>
          </div>

          <div>
            <Button
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
              newTab
            >
              {store.directionsCta}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StoreLocationMap;

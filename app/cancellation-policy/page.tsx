import Footer from '@/components/layout/footer';
import {
  Callout,
  ContactCard,
  PhoneLink,
  PolicyFooter,
  PolicyHeader,
  PolicyList,
  PolicySection,
  PolicySteps,
  RichText,
} from '@/components/features/policy/policy-prose';
import { siteCopy } from '@/lib/content/site-copy';

const copy = siteCopy.cancellationPolicy;

export const metadata = {
  title: copy.meta.title,
  description: copy.meta.description,
};

export default function CancellationPolicyPage() {
  const { help } = copy;

  return (
    <>
      <PolicyHeader heading={copy.hero.heading} subheading={copy.hero.subheading} />

      <PolicySection>
        <p>{copy.intro}</p>
      </PolicySection>

      <PolicySection heading={copy.window.heading}>
        <p>
          <RichText strong={['24 hours']}>{copy.window.body}</RichText>
        </p>
        <Callout emoji={copy.window.tip.emoji} heading={copy.window.tip.heading}>
          <RichText>{copy.window.tip.body}</RichText>
        </Callout>
      </PolicySection>

      <PolicySection heading={copy.howTo.heading}>
        <p>{copy.howTo.body}</p>
        <PolicySteps>
          {copy.howTo.steps.map((step) => (
            <li key={step.label}>
              <strong className="font-medium">{step.label}</strong> <RichText>{step.body}</RichText>
            </li>
          ))}
        </PolicySteps>
      </PolicySection>

      <PolicySection heading={copy.nonCancellable.heading}>
        <p>{copy.nonCancellable.body}</p>
        <PolicyList>
          {copy.nonCancellable.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </PolicyList>
        <p>
          <RichText links={{ 'Refund Policy': '/refund-policy' }}>
            {copy.nonCancellable.footnote}
          </RichText>
        </p>
      </PolicySection>

      <PolicySection heading={copy.modification.heading}>
        <p>
          <RichText strong={['12 hours']}>{copy.modification.body}</RichText>
        </p>
        <Callout emoji={copy.modification.note.emoji} heading={copy.modification.note.heading}>
          {copy.modification.note.body}
        </Callout>
      </PolicySection>

      <PolicySection heading={copy.timeline.heading}>
        <p>{copy.timeline.body}</p>
        <PolicyList>
          {copy.timeline.items.map((item) => (
            <li key={item.label}>
              <strong className="font-medium">{item.label}</strong> {item.body}
            </li>
          ))}
        </PolicyList>
        <p>{copy.timeline.footnote}</p>
      </PolicySection>

      <PolicySection heading={copy.sellerInitiated.heading}>
        <p>{copy.sellerInitiated.body}</p>
        <PolicyList>
          {copy.sellerInitiated.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </PolicyList>
        <p>{copy.sellerInitiated.footnote}</p>
      </PolicySection>

      <PolicySection heading={help.heading}>
        <p>{help.body}</p>
        <ContactCard
          rows={[
            { label: help.emailLabel, value: <RichText>{help.email}</RichText> },
            {
              label: help.phoneLabel,
              value: <PhoneLink dial={help.phone} display={help.phoneDisplay} />,
            },
            { label: help.hoursLabel, value: help.hours },
            { label: help.addressLabel, value: help.address },
          ]}
        />
      </PolicySection>

      <PolicyFooter>{copy.lastUpdated}</PolicyFooter>
      <Footer />
    </>
  );
}

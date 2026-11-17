import Footer from '@/components/layout/footer';
import {
  ContactCard,
  PolicyFooter,
  PolicyHeader,
  PhoneLink,
  PolicyList,
  PolicySection,
  PolicySteps,
  RichText,
} from '@/components/features/policy/policy-prose';
import { siteCopy } from '@/lib/content/site-copy';

const copy = siteCopy.refundPolicy;

export const metadata = {
  title: copy.meta.title,
  description: copy.meta.description,
};

export default function RefundPolicyPage() {
  const { questions } = copy;

  return (
    <>
      <PolicyHeader heading={copy.hero.heading} subheading={copy.hero.subheading} />

      <PolicySection>
        <p>{copy.intro}</p>
      </PolicySection>

      <PolicySection heading={copy.returnWindow.heading}>
        <p>
          <RichText strong={['7 days']}>{copy.returnWindow.body}</RichText>
        </p>
        <PolicyList>
          {copy.returnWindow.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </PolicyList>
      </PolicySection>

      <PolicySection heading={copy.nonReturnable.heading}>
        <p>{copy.nonReturnable.body}</p>
        <PolicyList>
          {copy.nonReturnable.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </PolicyList>
      </PolicySection>

      <PolicySection heading={copy.process.heading}>
        <PolicySteps>
          {copy.process.steps.map((step) => (
            <li key={step.label}>
              <strong className="font-medium">{step.label}</strong> <RichText>{step.body}</RichText>
            </li>
          ))}
        </PolicySteps>
      </PolicySection>

      <PolicySection heading={copy.exchanges.heading}>
        <p>
          <RichText>{copy.exchanges.body}</RichText>
        </p>
      </PolicySection>

      <PolicySection heading={copy.shippingCosts.heading}>
        <p>{copy.shippingCosts.body}</p>
      </PolicySection>

      <PolicySection heading={copy.damaged.heading}>
        <p>
          <RichText>{copy.damaged.body}</RichText>
        </p>
      </PolicySection>

      <PolicySection heading={questions.heading}>
        <p>{questions.body}</p>
        <ContactCard
          rows={[
            {
              label: questions.emailLabel,
              value: <RichText>{questions.email}</RichText>,
            },
            {
              label: questions.phoneLabel,
              value: (
                <PhoneLink dial={questions.phone} display={questions.phoneDisplay} />
              ),
            },
            { label: questions.addressLabel, value: questions.address },
          ]}
        />
      </PolicySection>

      <PolicyFooter>{copy.lastUpdated}</PolicyFooter>
      <Footer />
    </>
  );
}

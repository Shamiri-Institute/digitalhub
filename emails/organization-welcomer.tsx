import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Img,
  Text,
  Link,
  Tailwind,
  Preview,
} from "@react-email/components";
import * as React from "react";

import { SDH_HERO_IMAGE, SDH_LOGO_BANNER } from "../lib/constants";
import Footer from "./components/footer";

/**
 * - welcome organization
 * - include organization banner logo (if any)
 * - include inviter name
 * - include date
 * - include link to log into the dashboard
 */
export default function OrganizationWelcomer({
  email = "dmndetei@amhf.or.ke",
  name = "Africa Mental Health Training and Research Foundation",
}: {
  email: string;
  name: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to the Shamiri Digital Hub!</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-gray-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={SDH_LOGO_BANNER}
                width="200"
                height="25"
                alt="Shamiri Digital Hub"
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-sky-900">
              Welcome to the Shamiri Digital Hub!
            </Heading>
            <Section className="my-8">
              <Img src={SDH_HERO_IMAGE} alt="Dub" className="max-w-[500px]" />
            </Section>
            <Text className="text-sm leading-6 text-black">
              Let&apos;s get you started on the key operations platform that
              powers the{" "}
              <Link
                href="https://www.shamiri.institute/the-shamiri-intervention"
                className="font-medium text-sky-600 no-underline"
              >
                Shamiri Intervention
              </Link>
              .
            </Text>
            <Text className="text-sm leading-6 text-black">
              This email (<span className="font-medium">{email}</span>) is
              marked as the contact email for your organization,{" "}
              <span className="font-medium">{name}</span>.{" "}
              <Link
                href="https://shamiridigitalhub.vercel.app"
                className="font-medium text-sky-600 no-underline"
              >
                Log into
              </Link>{" "}
              the Shamiri Digital Hub to get started and further setup your
              organization.
            </Text>
            <Text className="text-sm font-light leading-6 text-gray-400">
              Shamiri Technology
            </Text>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

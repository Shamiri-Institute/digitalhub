import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { SDH_HERO_IMAGE, SDH_LOGO_BANNER } from "../lib/constants";
import Footer from "./components/footer";

export default function UserWelcomer({
  email = "dmndetei@amhf.or.ke",
  // userName = "Prof. David M. Ndetei",
  implementerName = "Africa Mental Health Training and Research Foundation",
  preview = "Welcome to the Shamiri Digital Hub, Prof. David M. Ndetei!",
}: {
  email: string;
  // userName: string;
  implementerName: string;
  preview: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
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
            <Text>
              {/* Hello <span className="font-medium">{userName}</span> 👋🏾, */}
              Hello 👋🏾,
            </Text>
            <Text className="text-sm leading-6 text-black">
              <span className="font-medium">{implementerName}</span> has invited you to get you
              started on the key operations platform that powers the{" "}
              <Link
                href="https://www.shamiri.institute/the-shamiri-intervention"
                className="font-medium text-sky-600 no-underline"
              >
                Shamiri Intervention
              </Link>
              .
            </Text>
            <Text className="text-sm leading-6 text-black">
              <Link
                href="https://shamiridigitalhub.vercel.app" // TODO: update this link to be env specific (local, preview, prod)
                className="font-medium text-sky-600 no-underline"
              >
                Log into
              </Link>{" "}
              the Shamiri Digital Hub to get started and continue setting up your account.
            </Text>
            <Text className="text-sm font-light leading-6 text-gray-400">Shamiri Technology</Text>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

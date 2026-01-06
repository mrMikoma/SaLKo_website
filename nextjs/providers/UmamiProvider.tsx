import Script from "next/script";

export const UmamiProvider = () => {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  if (!websiteId) {
    return <></>;
  }
  return (
    <>
      <Script
        async
        src="https://umami.savonlinnanlentokerho.fi/script.js"
        data-website-id={websiteId}
      />
    </>
  );
};

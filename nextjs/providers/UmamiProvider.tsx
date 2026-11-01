import Script from "next/script";

export const UmamiProvider = () => {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  if (!websiteId) {
    return <></>;
  }
  return (
    <>
      {/* Page addresses without their query: a password reset link carries
          its token there, and analytics must not store it */}
      <Script
        async
        src="/api/umami/script"
        data-website-id={websiteId}
        data-host-url="/api/umami"
        data-exclude-search="true"
      />
    </>
  );
};

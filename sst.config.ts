// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "standardsiteintegration",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    new sst.aws.Nextjs("StandardSite", {
      domain: {
        name: "ssh.rito.blue",
        dns: false,
        cert: "arn:aws:acm:us-east-1:036820509199:certificate/46a4fe24-83df-40cd-a3c7-6d8b87544378",
      },
      environment: {
        NEXT_PUBLIC_URL: "https://ssh.rito.blue",
      },
    });
  },
});

import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: {
      target: "./openapi.yaml",
    },
    output: {
      mode: "split",
      target: "../api-client-react/src/generated/api.ts",
      schemas: "../api-client-react/src/generated",
      client: "react-query",
      override: {
        mutator: {
          path: "../api-client-react/src/lib/fetcher.ts",
          name: "customFetch",
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
  apiZod: {
    input: {
      target: "./openapi.yaml",
    },
    output: {
      target: "../api-zod/src/generated/api.ts",
      client: "zod",
    },
  },
});

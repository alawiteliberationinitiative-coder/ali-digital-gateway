interface RequestConfig {
  url: string;
  method: string;
  headers?: Record<string, string>;
  data?: unknown;
  signal?: AbortSignal;
}

export async function customFetch<T>(
  config: RequestConfig,
  options?: { headers?: Record<string, string> },
): Promise<T> {
  const { url, method, headers: configHeaders, data, signal } = config;

  const baseUrl = "/api";

  const response = await fetch(`${baseUrl}${url}`, {
    method,
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(configHeaders ?? {}),
      ...(options?.headers ?? {}),
    },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const responseData = await response.json().catch(() => ({}));
    const err = Object.assign(
      new Error((responseData as { error?: string }).error ?? response.statusText),
      {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        headers: Object.fromEntries(response.headers),
      },
    );
    throw err;
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

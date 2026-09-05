import axios from "axios";

/** Axios instance for /api/* with JSON error normalization. */
export const http = axios.create({ baseURL: "/api" });

export function getErrorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { error?: string } | undefined;
    return data?.error ?? e.message;
  }
  return e instanceof Error ? e.message : "Something went wrong";
}

/** True when an API call failed with the OUT_OF_STOCK conflict. */
export function isOutOfStockError(e: unknown): boolean {
  return (
    axios.isAxiosError(e) &&
    e.response?.status === 409 &&
    /stock/i.test(
      ((e.response?.data as { error?: string } | undefined)?.error ?? "") +
        " out_of_stock",
    )
  );
}

import { API_BASE_URL, apiClient, getToken } from "./apiClient";
import type {
  DailyEntry,
  EntryPayload,
  YearlySummaryResponse,
} from "../types/entry";

const getPdfResponse = async (
  endpoint: string,
  fallbackErrorMessage: string,
): Promise<Blob> => {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type");

    let errorMessage = fallbackErrorMessage;

    if (contentType?.includes("application/json")) {
      const errorData = await response.json().catch(() => null);

      errorMessage = errorData?.message || fallbackErrorMessage;
    } else {
      const errorText = await response.text().catch(() => "");

      errorMessage = errorText || fallbackErrorMessage;
    }

    throw new Error(errorMessage);
  }

  return response.blob();
};

export const getEntries = async (month: number, year: number) => {
  const response = await apiClient<{ entries: DailyEntry[] }>(
    `/entries?month=${month}&year=${year}`,
  );

  return response.entries;
};

export const getYearlySummary = async (year: number) => {
  const response = await apiClient<YearlySummaryResponse>(
    `/entries/summary/yearly?year=${year}`,
  );

  return response;
};

export const createEntry = async (payload: EntryPayload) => {
  const response = await apiClient<{ entry: DailyEntry }>("/entries", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return response.entry;
};

export const updateEntry = async (id: string, payload: EntryPayload) => {
  const response = await apiClient<{ entry: DailyEntry }>(`/entries/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return response.entry;
};

export const deleteEntry = async (id: string) => {
  await apiClient<{ message: string }>(`/entries/${id}`, {
    method: "DELETE",
  });
};

/**
 * Monthly PDF report.
 *
 * Backend:
 * GET /entries/report/pdf?month=1&year=2026
 */
export const downloadEntriesPdfReport = async (
  month: number,
  year: number,
): Promise<Blob> => {
  return getPdfResponse(
    `/entries/report/pdf?month=${month}&year=${year}`,
    "Unable to download monthly PDF report",
  );
};

/**
 * Annual PDF report.
 *
 * Backend:
 * GET /entries/report/yearly?year=2026
 */
export const downloadYearlyEntriesPdfReport = async (
  year: number,
): Promise<Blob> => {
  return getPdfResponse(
    `/entries/report/yearly?year=${year}`,
    "Unable to download annual PDF report",
  );
};

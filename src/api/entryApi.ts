import { API_BASE_URL, apiClient, getToken } from "./apiClient";
import type { DailyEntry, EntryPayload } from "../types/entry";

export const getEntries = async (month: number, year: number) => {
  const response = await apiClient<{ entries: DailyEntry[] }>(
    `/entries?month=${month}&year=${year}`,
  );

  return response.entries;
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

export const downloadEntriesPdfReport = async (
  month: number,
  year: number,
): Promise<Blob> => {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/entries/report/pdf?month=${month}&year=${year}`,
    {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(errorData?.message || "Unable to download PDF report");
  }

  return response.blob();
};

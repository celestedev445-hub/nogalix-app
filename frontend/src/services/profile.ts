import { makeRequest } from "@/lib/makeRequest";

export async function getProfile() {
  return makeRequest("profile", "GET", null, true, false);
}

export async function updateProfile(payload: Record<string, unknown>) {
  return makeRequest("profile", "PUT", payload, true, false);
}

export async function updateAvatar(formData: FormData) {
  return makeRequest("profile/avatar", "POST", formData, true, false);
}

export async function changePassword(payload: {
  current_password: string;
  password: string;
  password_confirmation: string;
}) {
  return makeRequest("profile/password", "POST", payload, true, false);
}

export async function updatePreferences(payload: {
  notifyEmail?: boolean;
  notifyJobs?: boolean;
  notifyAnalysis?: boolean;
}) {
  return makeRequest("profile/preferences", "PUT", payload, true, false);
}

export async function deleteAccount(payload: { confirm: "SUPPRIMER"; password?: string }) {
  return makeRequest("profile", "DELETE", payload, true, false);
}

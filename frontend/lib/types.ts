export interface Store {
  id: string;
  name: string;
  status: "PROVISIONING" | "READY" | "FAILED";
  url?: string;
  admin_user?: string;
  admin_password?: string;
  created_at?: string;
}

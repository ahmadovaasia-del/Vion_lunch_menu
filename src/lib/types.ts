export type Role = "employee" | "admin";

export type Department = {
  id: string;
  name: string;
};

export type Employee = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department_id: string | null;
  role: Role;
  is_active: boolean;
  locale: "ru" | "ro";
};

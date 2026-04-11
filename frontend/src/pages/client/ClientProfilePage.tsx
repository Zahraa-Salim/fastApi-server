/**
 * Client profile page.
 * Fetches and displays the authenticated client user's profile information.
 * Allows users to edit their profile via modal form.
 */
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, ApiError } from "../../lib/api";
import { clearToken, setAuthUser } from "../../lib/auth";
import type { User } from "../../types/api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";

const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;

const editProfileSchema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  phone_number: z.string().regex(PHONE_PATTERN, "Invalid phone number"),
  city: z.string().min(1, "Required"),
  age: z.number().min(1, "Must be at least 1"),
});

type EditProfileValues = z.infer<typeof editProfileSchema>;

export function ClientProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
  });

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await api.users.me();
      setUser(response.data);
      setAuthUser(response.data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearToken();
        navigate("/login", { replace: true });
        return;
      }
      toast.error(error instanceof Error ? error.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, []);

  const handleLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  const openEdit = () => {
    if (!user) return;
    reset({
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      city: user.city,
      age: user.age,
    });
    setEditOpen(true);
  };

  const onSaveProfile = async (values: EditProfileValues) => {
    try {
      const response = await api.users.updateMe(values);
      setUser(response.data);
      setAuthUser(response.data);
      setEditOpen(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* Top Navbar */}
      <nav
        style={{
          backgroundColor: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          height: "56px",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <h1 style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem", color: "var(--text)" }}>Verdant Blog</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link to="/client/posts" style={{ color: "var(--text-muted)", fontSize: "0.9rem", textDecoration: "none" }}>
            ← Back to Posts
          </Link>
          <Button variant="secondary" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 16px", width: "100%" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
            <Spinner />
          </div>
        ) : user ? (
          <>
            {/* Profile Header Card */}
            <div
              className="card"
              style={{
                padding: "20px 24px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              {/* Avatar Circle */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  backgroundColor: "var(--secondary)",
                  color: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  flexShrink: 0,
                }}
              >
                {user.first_name[0]}
                {user.last_name[0]}
              </div>

              {/* User Info */}
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem", color: "var(--text)" }}>
                  {user.first_name} {user.last_name}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  {user.type === "admin" ? "Admin" : "Client"}
                </p>
              </div>

              {/* Edit Button */}
              <Button onClick={openEdit}>Edit Profile</Button>
            </div>

            {/* Profile Information Card */}
            <div className="card" style={{ padding: "0" }}>
              {[
                { label: "Email", value: user.email },
                { label: "Phone Number", value: user.phone_number },
                { label: "City", value: user.city },
                { label: "Age", value: String(user.age) },
                { label: "Account Type", value: user.type === "admin" ? "Admin" : "Client" },
                { label: "Member Since", value: new Date(user.created_at).toLocaleDateString() },
              ].map(({ label, value }, i, arr) => (
                <div
                  key={label}
                  style={{
                    padding: "14px 24px",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ fontSize: "0.95rem", color: "var(--text)" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Edit Profile Modal */}
            <Modal open={editOpen} title="Edit Profile" onClose={() => setEditOpen(false)}>
              <form className="form-stack" onSubmit={handleSubmit((v) => onSaveProfile(v as EditProfileValues))}>
                <div className="form-row">
                  <Input
                    label="First Name"
                    type="text"
                    error={errors.first_name?.message}
                    {...register("first_name")}
                  />
                  <Input
                    label="Last Name"
                    type="text"
                    error={errors.last_name?.message}
                    {...register("last_name")}
                  />
                </div>

                <div className="form-row">
                  <Input
                    label="Phone Number"
                    type="tel"
                    placeholder="+96170123456"
                    error={errors.phone_number?.message}
                    {...register("phone_number")}
                  />
                  <Input label="City" type="text" error={errors.city?.message} {...register("city")} />
                </div>

                <Input
                  label="Age"
                  type="number"
                  error={errors.age?.message}
                  {...register("age", { valueAsNumber: true })}
                />

                <div className="form-actions">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => {
                      setEditOpen(false);
                      reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Modal>
          </>
        ) : null}
      </div>
    </div>
  );
}

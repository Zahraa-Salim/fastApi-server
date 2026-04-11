/**
 * Admin login page.
 * Validates login input, authenticates user, stores token, and redirects to dashboard.
 */
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import { api } from "../../lib/api";
import { isAdmin, isAuthenticated, setAuthUser, setToken } from "../../lib/auth";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const response = await api.auth.login(values);
      setToken(response.token);
      setAuthUser(response.user);
      toast.success("Login successful");
      setTimeout(() => {
        if (response.user.type === "admin") {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/client", { replace: true });
        }
      }, 0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    }
  };

  return (
    <div className="page-auth">
      <div className="auth-card">
        <h1 className="auth-card__title">Verdant Blog — Admin</h1>
        <p className="auth-card__subtitle">Sign in to manage your content.</p>

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
          <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />

          <Button type="submit" loading={isSubmitting} fullWidth>
            Login
          </Button>
        </form>

        <p className="auth-footer">
          No account yet?{" "}
          <Link className="auth-link" to="/register">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

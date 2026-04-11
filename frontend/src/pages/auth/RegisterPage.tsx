/**
 * User registration page.
 * Validates registration input, creates user account, stores token, and redirects based on user type.
 */
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import { api } from "../../lib/api";
import { isAuthenticated, setAuthUser, setToken } from "../../lib/auth";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

const registerSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format"),
  phone_number: z
    .string()
    .regex(/^\+?[1-9]\d{7,14}$/, "Invalid phone number format"),
  city: z.string().min(1, "City is required"),
  age: z
    .number()
    .positive("Age must be greater than 0")
    .int("Age must be a whole number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      city: "",
      age: undefined,
      password: "",
    },
  });

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      const response = await api.auth.register(values);
      setToken(response.token);
      setAuthUser(response.user);
      toast.success("Registration successful");
      setTimeout(() => {
        if (response.user.type === "admin") {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/client", { replace: true });
        }
      }, 0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
    }
  };

  return (
    <div className="page-auth">
      <div className="auth-card">
        <h1 className="auth-card__title">Verdant Blog — Register</h1>
        <p className="auth-card__subtitle">Create your account to get started.</p>

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <Input
              label="First Name"
              type="text"
              autoComplete="given-name"
              error={errors.first_name?.message}
              {...register("first_name")}
            />
            <Input
              label="Last Name"
              type="text"
              autoComplete="family-name"
              error={errors.last_name?.message}
              {...register("last_name")}
            />
          </div>

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="+1234567890"
            autoComplete="tel"
            error={errors.phone_number?.message}
            {...register("phone_number")}
          />

          <Input
            label="City"
            type="text"
            autoComplete="address-level2"
            error={errors.city?.message}
            {...register("city")}
          />

          <Input
            label="Age"
            type="number"
            error={errors.age?.message}
            {...register("age", { valueAsNumber: true })}
          />

          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />

          <Button type="submit" loading={isSubmitting} fullWidth>
            Register
          </Button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link className="auth-link" to="/login">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

/**
 * Admins management page.
 * Displays admins with search/sort/pagination and supports deactivation actions.
 */
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, ApiError } from "../../lib/api";
import { clearToken, getAuthUser } from "../../lib/auth";
import { useDebounce } from "../../hooks/useDebounce";
import type { PaginatedResponse, User } from "../../types/api";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Table } from "../../components/ui/Table";
import { Pagination } from "../../components/ui/Pagination";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";

const createUserSchema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  phone_number: z.string().regex(/^\+?[1-9]\d{7,14}$/, "Invalid phone number"),
  city: z.string().min(1, "Required"),
  age: z.number().min(1, "Must be at least 1"),
  password: z.string().min(6, "Minimum 6 characters"),
  type: z.enum(["admin", "client"]),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 5h16v14H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 2v4M16 2v4M3 10h18" />
      <rect x="3" y="4" width="18" height="17" rx="2" />
    </svg>
  );
}

function SortIcon({ order }: { order: "asc" | "desc" }) {
  return order === "asc" ? (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 18V6" />
      <path d="m7 11 5-5 5 5" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 6v12" />
      <path d="m17 13-5 5-5-5" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v4h4" />
    </svg>
  );
}

export function UsersPage() {
  const navigate = useNavigate();
  const user = getAuthUser();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      city: "",
      age: undefined,
      password: "",
      type: "client",
    },
  });

  const debouncedQuery = useDebounce(query, 250);
  const isSuperAdmin = user?.type === "admin";
  const hasData = Boolean(data && data.data.length);

  const queryParams = useMemo(
    () => ({ page, limit, sort, order, q: debouncedQuery }),
    [page, limit, sort, order, debouncedQuery]
  );

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    const loadUsers = async () => {
      setLoading(true);
      try {
        const response = await api.users.list(queryParams);
        setData(response);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearToken();
          navigate("/login", { replace: true });
          return;
        }
        toast.error(error instanceof Error ? error.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    void loadUsers();
  }, [navigate, queryParams, isSuperAdmin]);

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard/authors" replace />;
  }

  const resetFilters = () => {
    setPage(1);
    setQuery("");
    setSort("created_at");
    setOrder("desc");
    setLimit(10);
  };

  const onDelete = async () => {
    if (!selectedUser) return;

    try {
      await api.users.delete(selectedUser.id);
      setSelectedUser(null);
      toast.success("User deleted");
      setData((prev) => {
        if (!prev) return prev;
        const nextData = prev.data.filter((u) => u.id !== selectedUser.id);
        const total = Math.max(prev.total - 1, 0);
        return {
          ...prev,
          data: nextData,
          total,
          results: nextData.length,
          totalPages: Math.max(Math.ceil(total / prev.limit), 1),
        };
      });
      if (data && data.page > 1 && data.data.length === 1) {
        setPage((prevPage) => Math.max(prevPage - 1, 1));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete user");
    }
  };

  const onCreateUser = async (values: CreateUserFormValues) => {
    try {
      await api.users.create(values);
      setShowCreateModal(false);
      toast.success("User created successfully");
      reset();
      setPage(1);
      // Refetch the users list
      const updatedData = await api.users.list({ page: 1, limit, sort, order, q: debouncedQuery });
      setData(updatedData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create user");
    }
  };

  return (
    <section className="page-section">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-header__title">Users</h1>
          <p className="page-header__subtitle">Manage active users and deactivate accounts.</p>
        </div>
        <Button className="btn--primary" onClick={() => setShowCreateModal(true)}>
          <span className="btn__icon">
            <PlusIcon />
          </span>
          <span>New User</span>
        </Button>
      </div>

      <div className="filters-mobile-trigger">
        <Button variant="secondary" onClick={() => setFiltersOpen(true)}>
          <span className="btn__icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 5h18" />
              <path d="M6 12h12" />
              <path d="M10 19h4" />
            </svg>
          </span>
          <span>Filter</span>
        </Button>
      </div>

      <div className="filters-desktop">
        <div className="card filters-grid filters-grid--5">
          <Input
            label="Search"
            placeholder="Search by name/email"
            className="field__control--icon-search"
            value={query}
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
          />

          <Select
            label="Sort by"
            value={sort}
            onChange={(event) => {
              setPage(1);
              setSort(event.target.value);
            }}
          >
            <option value="created_at">Created Date</option>
            <option value="first_name">First Name</option>
            <option value="email">Email</option>
            <option value="type">Type</option>
          </Select>

          <label className="field">
            <span className="field__label">Order</span>
            <button
              type="button"
              className="order-toggle-btn"
              onClick={() => {
                setPage(1);
                setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
              }}
            >
              <SortIcon order={order} />
              <span>{order === "asc" ? "Asc" : "Desc"}</span>
            </button>
          </label>

          <Select
            label="Per page"
            value={String(limit)}
            onChange={(event) => {
              setPage(1);
              setLimit(Number(event.target.value));
            }}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
          </Select>

          <label className="field">
            <span className="field__label">Actions</span>
            <Button variant="secondary" onClick={resetFilters}>
              <span className="btn__icon">
                <ResetIcon />
              </span>
              <span>Clear Filters</span>
            </Button>
          </label>
        </div>
      </div>

      <AnimatePresence>
        {filtersOpen ? (
          <motion.div
            className="sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFiltersOpen(false)}
          >
            <motion.div
              className="sheet-card"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sheet-header">
                <h3>Filters</h3>
                <button className="sheet-close" onClick={() => setFiltersOpen(false)} type="button">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6l-12 12" />
                  </svg>
                </button>
              </div>

              <div className="sheet-body">
                <div className="filters-grid filters-grid--5">
                  <Input
                    label="Search"
                    placeholder="Search by name/email"
                    className="field__control--icon-search"
                    value={query}
                    onChange={(event) => {
                      setPage(1);
                      setQuery(event.target.value);
                    }}
                  />

                  <Select
                    label="Sort by"
                    value={sort}
                    onChange={(event) => {
                      setPage(1);
                      setSort(event.target.value);
                    }}
                  >
                    <option value="created_at">Created Date</option>
                    <option value="first_name">First Name</option>
                    <option value="email">Email</option>
                    <option value="type">Type</option>
                  </Select>

                  <label className="field">
                    <span className="field__label">Order</span>
                    <button
                      type="button"
                      className="order-toggle-btn"
                      onClick={() => {
                        setPage(1);
                        setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                      }}
                    >
                      <SortIcon order={order} />
                      <span>{order === "asc" ? "Asc" : "Desc"}</span>
                    </button>
                  </label>

                  <Select
                    label="Per page"
                    value={String(limit)}
                    onChange={(event) => {
                      setPage(1);
                      setLimit(Number(event.target.value));
                    }}
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                  </Select>
                </div>
              </div>

              <div className="sheet-actions">
                <Button
                  variant="secondary"
                  onClick={() => {
                    resetFilters();
                  }}
                >
                  Reset
                </Button>
                <Button onClick={() => setFiltersOpen(false)}>Apply</Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="card list-card">
        {loading && hasData ? (
          <div className="list-loading">
            <span className="spinner__dot" />
            <span>Updating users...</span>
          </div>
        ) : null}
        <AnimatePresence mode="wait">
          {loading && !hasData ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Spinner label="Loading users..." />
            </motion.div>
          ) : data && data.data.length ? (
            <motion.div key={`users-${data.page}-${data.results}-${sort}-${order}-${debouncedQuery}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="desktop-only">
                <Table headers={["Name", "Email", "Type", "City", "Age", "Created", "Actions"]}>
                  {data.data.map((user) => (
                    <tr key={user.id}>
                      <td className="table-cell-strong">{user.first_name} {user.last_name}</td>
                      <td>{user.email}</td>
                      <td>{user.type === "admin" ? "Admin" : "Client"}</td>
                      <td>{user.city}</td>
                      <td>{user.age}</td>
                      <td>{formatDate(user.created_at)}</td>
                      <td>
                        <Button variant="danger" onClick={() => setSelectedUser(user)}>
                          Deactivate
                        </Button>
                      </td>
                    </tr>
                  ))}
                </Table>
              </div>

              <div className="mobile-only mobile-cards">
                {data.data.map((user) => (
                  <article key={user.id} className="mobile-profile-card">
                    <div className="mobile-profile-card__header">
                      <h3 className="mobile-profile-card__title">{user.first_name} {user.last_name}</h3>
                      <p className="mobile-profile-card__subtext">{user.type === "admin" ? "Admin" : "Client"}</p>
                    </div>

                    <div className="mobile-profile-card__meta">
                      <p className="mobile-profile-card__meta-item">
                        <span className="mobile-profile-card__meta-icon">
                          <MailIcon />
                        </span>
                        <span>{user.email}</span>
                      </p>
                      <p className="mobile-profile-card__meta-item">
                        <span className="mobile-profile-card__meta-icon">
                          <CalendarIcon />
                        </span>
                        <span>City: {user.city}</span>
                      </p>
                      <p className="mobile-profile-card__meta-item">
                        <span className="mobile-profile-card__meta-icon">
                          <CalendarIcon />
                        </span>
                        <span>Age: {user.age}</span>
                      </p>
                      <p className="mobile-profile-card__meta-item">
                        <span className="mobile-profile-card__meta-icon">
                          <CalendarIcon />
                        </span>
                        <span>Joined {formatDate(user.created_at)}</span>
                      </p>
                    </div>

                    <div className="mobile-profile-card__actions">
                      <Button variant="danger" fullWidth onClick={() => setSelectedUser(user)}>
                        Deactivate
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <EmptyState title="No users found" description="Try changing filters or search keywords." />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {data ? (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          onPageChange={(nextPage) => setPage(nextPage)}
          disabled={loading}
        />
      ) : null}

      <Modal
        open={Boolean(selectedUser)}
        title="Deactivate user"
        onClose={() => setSelectedUser(null)}
        showClose={false}
      >
        <div className="form-stack">
          <p className="info-text">
            Are you sure you want to deactivate <span className="text-strong">{selectedUser?.first_name} {selectedUser?.last_name}</span>?
          </p>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setSelectedUser(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onDelete}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showCreateModal}
        title="Create New User"
        onClose={() => {
          setShowCreateModal(false);
          reset();
        }}
      >
        <form className="form-stack" onSubmit={handleSubmit((values) => onCreateUser(values as CreateUserFormValues))}>
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
              label="Email"
              type="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Phone Number"
              type="tel"
              placeholder="+96170123456"
              error={errors.phone_number?.message}
              {...register("phone_number")}
            />
          </div>

          <div className="form-row">
            <Input
              label="City"
              type="text"
              error={errors.city?.message}
              {...register("city")}
            />
            <Input
              label="Age"
              type="number"
              error={errors.age?.message}
              {...register("age", { valueAsNumber: true, required: "Required" })}
            />
          </div>

          <div className="form-row">
            <Input
              label="Password"
              type="password"
              error={errors.password?.message}
              {...register("password")}
            />
            <div className="field">
              <label className="field__label">Type</label>
              <select
                className="field__control"
                {...register("type")}
              >
                <option value="client">Client</option>
                <option value="admin">Admin</option>
              </select>
              {errors.type?.message ? <span className="field__error">{errors.type.message}</span> : null}
            </div>
          </div>

          <div className="form-actions">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

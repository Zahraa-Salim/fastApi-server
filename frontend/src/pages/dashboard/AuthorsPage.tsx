/**
 * Authors management page.
 * Provides listing, filtering, create, edit, and soft-delete workflows for authors.
 */
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { api, ApiError } from "../../lib/api";
import { clearToken } from "../../lib/auth";
import { useDebounce } from "../../hooks/useDebounce";
import type { Author, PaginatedResponse } from "../../types/api";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Table } from "../../components/ui/Table";
import { Pagination } from "../../components/ui/Pagination";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";

const authorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  bio: z.string().optional(),
});

type AuthorFormValues = z.infer<typeof authorSchema>;
type ModalMode = "create" | "edit";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
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

function FileTextIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8M16 17H8" />
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

export function AuthorsPage() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [data, setData] = useState<PaginatedResponse<Author> | null>(null);
  const [loading, setLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);
  const [deletingAuthor, setDeletingAuthor] = useState<Author | null>(null);

  const debouncedQuery = useDebounce(query, 250);
  const hasData = Boolean(data && data.data.length);

  const queryParams = useMemo(
    () => ({ page, limit, sort, order, q: debouncedQuery }),
    [page, limit, sort, order, debouncedQuery]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AuthorFormValues>({
    resolver: zodResolver(authorSchema),
    defaultValues: {
      name: "",
      email: "",
      bio: "",
    },
  });

  const loadAuthors = async () => {
    setLoading(true);
    try {
      const response = await api.authors.list(queryParams);
      setData(response);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearToken();
        navigate("/login", { replace: true });
        return;
      }
      toast.error(error instanceof Error ? error.message : "Failed to load authors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAuthors();
  }, [queryParams]);

  const resetFilters = () => {
    setPage(1);
    setQuery("");
    setSort("created_at");
    setOrder("desc");
    setLimit(10);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingAuthor(null);
    reset({ name: "", email: "", bio: "" });
    setFormOpen(true);
  };

  const openEditModal = (author: Author) => {
    setModalMode("edit");
    setEditingAuthor(author);
    reset({ name: author.name, email: author.email, bio: author.bio || "" });
    setFormOpen(true);
  };

  const onSubmit = async (values: AuthorFormValues) => {
    try {
      if (modalMode === "edit" && editingAuthor) {
        const response = await api.authors.update(editingAuthor.id, values);
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            data: prev.data.map((author) => (author.id === editingAuthor.id ? response.data : author)),
          };
        });
        toast.success("Author updated");
      } else {
        const response = await api.authors.create(values);
        setData((prev) => {
          if (!prev || prev.page !== 1) return prev;
          const nextData = [response.data, ...prev.data].slice(0, prev.limit);
          const total = prev.total + 1;
          return {
            ...prev,
            data: nextData,
            total,
            results: nextData.length,
            totalPages: Math.max(Math.ceil(total / prev.limit), 1),
          };
        });
        toast.success("Author created");
      }

      setFormOpen(false);
      if (!data) {
        await loadAuthors();
      } else if (data.page !== 1) {
        await loadAuthors();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save author");
    }
  };

  const onDelete = async () => {
    if (!deletingAuthor) return;

    try {
      await api.authors.delete(deletingAuthor.id);
      toast.success("Author deleted");
      setDeletingAuthor(null);
      setData((prev) => {
        if (!prev) return prev;
        const nextData = prev.data.filter((author) => author.id !== deletingAuthor.id);
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
      const message = error instanceof Error ? error.message : "Failed to delete author";
      if (message.toLowerCase().includes("delete") && message.toLowerCase().includes("posts")) {
        toast.error(`Cannot delete author: ${message}`);
      } else {
        toast.error(message);
      }
    }
  };

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Authors</h1>
          <p className="page-header__subtitle">Create, edit, and soft-delete authors.</p>
        </div>
        <Button onClick={openCreateModal}>Create Author</Button>
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
            <option value="name">Name</option>
            <option value="email">Email</option>
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
                    <option value="name">Name</option>
                    <option value="email">Email</option>
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
            <span>Updating authors...</span>
          </div>
        ) : null}
        <AnimatePresence mode="wait">
          {loading && !hasData ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Spinner label="Loading authors..." />
            </motion.div>
          ) : data && data.data.length ? (
            <motion.div key={`authors-${data.page}-${data.results}-${sort}-${order}-${debouncedQuery}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="desktop-only">
                <Table headers={["Name", "Email", "Bio", "Actions"]}>
                  {data.data.map((author) => (
                    <tr key={author.id}>
                      <td className="table-cell-strong">{author.name}</td>
                      <td>{author.email}</td>
                      <td>{author.bio || "-"}</td>
                      <td>
                        <div className="table-actions">
                          <Button variant="secondary" onClick={() => openEditModal(author)}>
                            Edit
                          </Button>
                          <Button variant="danger" onClick={() => setDeletingAuthor(author)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </Table>
              </div>

              <div className="mobile-only mobile-cards">
                {data.data.map((author) => (
                  <article key={author.id} className="mobile-profile-card">
                    <div className="mobile-profile-card__header">
                      <h3 className="mobile-profile-card__title">{author.name}</h3>
                    </div>

                    <div className="mobile-profile-card__meta">
                      <p className="mobile-profile-card__meta-item">
                        <span className="mobile-profile-card__meta-icon">
                          <MailIcon />
                        </span>
                        <span>{author.email}</span>
                      </p>
                      {author.bio ? (
                        <p className="mobile-profile-card__meta-item">
                          <span className="mobile-profile-card__meta-icon">
                            <FileTextIcon />
                          </span>
                          <span>{author.bio}</span>
                        </p>
                      ) : null}
                      <p className="mobile-profile-card__meta-item">
                        <span className="mobile-profile-card__meta-icon">
                          <CalendarIcon />
                        </span>
                        <span>Joined {formatDate(author.created_at)}</span>
                      </p>
                    </div>

                    <div className="mobile-profile-card__actions mobile-profile-card__actions--split">
                      <Button variant="secondary" fullWidth onClick={() => openEditModal(author)}>
                        Edit
                      </Button>
                      <Button variant="danger" fullWidth onClick={() => setDeletingAuthor(author)}>
                        Delete
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <EmptyState title="No authors found" description="Add your first author to get started." />
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
        open={formOpen}
        title={modalMode === "edit" ? "Edit Author" : "Create Author"}
        onClose={() => setFormOpen(false)}
        showClose={false}
      >
        <form className="form-stack" onSubmit={handleSubmit(onSubmit)}>
          <Input label="Name" error={errors.name?.message} {...register("name")} />
          <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />

          <label className="field">
            <span className="field__label">Bio</span>
            <textarea
              className={["textarea-control", errors.bio ? "textarea-control--error" : ""].join(" ")}
              rows={4}
              {...register("bio")}
            />
            {errors.bio ? <span className="field__error">{errors.bio.message}</span> : null}
          </label>

          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {modalMode === "edit" ? "Save Changes" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deletingAuthor)}
        title="Delete author"
        onClose={() => setDeletingAuthor(null)}
        showClose={false}
      >
        <div className="form-stack">
          <p className="info-text">
            Are you sure you want to delete <span className="text-strong">{deletingAuthor?.name}</span>?
          </p>
          <p className="info-text info-text--small info-text--muted">
            If this author still has posts, backend will reject deletion and you will see a clear message.
          </p>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setDeletingAuthor(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onDelete}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
